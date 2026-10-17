#!/usr/bin/env python3
"""Refresh citations and abstracts from PubMed/bioRxiv. Preview unless --apply is given."""
import argparse
import datetime as dt
import json
from pathlib import Path
import re
import sys
import time
import urllib.parse
import xml.etree.ElementTree as ET
import yaml
from add_publication import (ROOT, all_from_pubmed, doi_key, existing_records, fetch,
                             fetch_biorxiv, from_biorxiv, new_record, normalize_doi, title_key)

METADATA_FIELDS = set('title authors journal year date date_precision online_date doi pmid pmcid '
    'volume issue pages publication_type abstract abstract_source metadata_source metadata_verified '
    'pubmed_relations preprint preprint_doi preprint_version first_posted published_doi correction_urls'.split())

def matches_author(record, config):
    family = config.get('author_family', 'Kojetin').casefold()
    given = {re.sub(r'[^a-z]', '', n.casefold()) for n in config.get('author_given', ['Douglas', 'Doug', 'D'])}
    for name in record['authors']:
        words = name.replace('.', ' ').replace(',', ' ').split()
        if words and words[-1].casefold() == family and words[0].casefold() in given:
            return True
    return False

def reconcile(pubmed, biorxiv, config):
    """Keep journal records, link preprint versions, and attach errata to originals."""
    pubmed = [r for r in pubmed if matches_author(r, config)]
    by_pmid = {r['pmid']: r for r in pubmed}
    articles = [dict(r) for r in pubmed if r['publication_type'] == 'article']
    articles_by_doi = {doi_key(r['doi']): r for r in articles if r.get('doi')}
    articles_by_pmid = {r['pmid']: r for r in articles}
    overrides = {doi_key(k): doi_key(v) for k,v in config.get('published_doi_overrides',{}).items()}
    preprints = []
    handled = set()
    for bio in biorxiv:
        if not matches_author(bio, config):
            raise ValueError('bioRxiv author does not match this laboratory: '+bio['doi'])
        doi = doi_key(bio['doi'])
        if doi in handled: raise ValueError('Duplicate bioRxiv DOI: '+doi)
        handled.add(doi)
        pm = next((r for r in pubmed if doi_key(r.get('doi')) == doi), {})
        published_doi = overrides.get(doi) or doi_key(bio.get('published_doi'))
        target = articles_by_doi.get(published_doi)
        for pmid in pm.get('pubmed_relations',{}).get('UpdateIn',[]):
            target = target or articles_by_pmid.get(pmid)
        if not target:
            for article in articles:
                if pm.get('pmid') in article.get('pubmed_relations',{}).get('UpdateOf',[]):
                    target = article
                    break
        if not target:
            exact = [r for r in articles if title_key(r['title']) == title_key(bio['title'])]
            if len(exact) == 1: target = exact[0]
        if target:
            target.update({'preprint': bio['preprint'], 'preprint_doi': bio['doi'],
                           'preprint_version': bio['preprint_version']})
        elif published_doi:
            raise ValueError('Journal version '+published_doi+' is not in the PubMed results. Add its PMID to extra_pmids in _data/publications.yml before refreshing.')
        else:
            preprints.append({**{k:pm[k] for k in ('pmid','pmcid') if pm.get(k)}, **bio})
    # Do not classify an unchecked bioRxiv entry as unpublished.
    missing = [r['doi'] for r in pubmed if r['publication_type']=='preprint' and doi_key(r['doi']) not in handled]
    if missing: raise ValueError('Missing bioRxiv metadata for: '+', '.join(missing))
    for correction in (r for r in pubmed if r['publication_type']=='correction'):
        for pmid in correction.get('pubmed_relations',{}).get('ErratumFor',[]):
            if pmid in articles_by_pmid:
                articles_by_pmid[pmid].setdefault('correction_urls',[]).append(correction['metadata_source'])
    records = preprints + articles
    for row in records:
        if not all(row.get(k) for k in ('title','authors','journal','date','doi')):
            raise ValueError('Incomplete source metadata: '+repr(row.get('title')))
    return sorted(records, key=lambda r:(r['publication_type']!='preprint', -int(r['date'].replace('-',''))))

def live_records(config, directory):
    query = config.get('pubmed_query', 'Kojetin[Author]')
    endpoint = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/'
    result = json.loads(fetch(endpoint+'esearch.fcgi?'+urllib.parse.urlencode(
        {'db':'pubmed','term':query,'retmode':'json','retmax':9999})))['esearchresult']
    ids = result['idlist']
    if int(result['count']) > len(ids): raise ValueError('PubMed query is too broad; narrow pubmed_query.')
    ids = sorted(set(ids) | {str(p) for p in config.get('extra_pmids',[])})
    if not ids: raise ValueError('PubMed returned no records. Check pubmed_query in _data/publications.yml.')
    pubmed = []
    for start in range(0,len(ids),150):
        time.sleep(0.4)
        pubmed.extend(all_from_pubmed(fetch(endpoint+'efetch.fcgi?db=pubmed&retmode=xml&id='+','.join(ids[start:start+150]))))
    dois = {normalize_doi(d) for d in config.get('biorxiv_dois',[])}
    dois.update(r['doi'] for r in pubmed if r['publication_type']=='preprint' and matches_author(r,config))
    for _, record in existing_records(directory):
        doi = record.get('preprint_doi') or record.get('preprint') or (record.get('doi') if record.get('publication_type')=='preprint' else '')
        if doi: dois.add(normalize_doi(doi))
    biorxiv=[]
    for doi in sorted(dois):
        print('Checking bioRxiv '+doi)
        biorxiv.append(fetch_biorxiv(doi))
    return reconcile(pubmed,biorxiv,config)

def plan_updates(records, directory):
    existing = list(existing_records(directory))
    plans=[]
    used=set()
    for record in records:
        keys={doi_key(record.get(k)) for k in ('doi','preprint_doi')} - {''}
        strong=[(p,d) for p,d in existing if doi_key(d.get('doi')) in keys or
                (record.get('pmid') and str(d.get('pmid',''))==str(record['pmid']))]
        matches=strong or [(p,d) for p,d in existing if title_key(d.get('title'))==title_key(record['title'])]
        if len(matches)>1: raise ValueError('Multiple local files match '+record['title']+': '+', '.join(p.name for p,_ in matches)+'. Merge these records before refreshing.')
        if matches:
            path, old = matches[0]
            if path in used: raise ValueError('Two source records would overwrite '+path.name)
            used.add(path)
            result=dict(old)
            result.update({k:v for k,v in record.items() if k in METADATA_FIELDS})
            if record['publication_type']=='article':
                for k in ('published_doi','first_posted'): result.pop(k,None)
            if 'kojetinlab.org' in str(result.get('source_url','')):
                result.pop('source_url',None)
                result.pop('source_citation',None)
            body=path.read_text(encoding='utf-8').split('---',2)[2]
            action='update'
        else:
            name,result=new_record(record)
            path=directory/name
            if path.exists(): raise ValueError('Filename collision: '+str(path))
            body='\n\n'
            action='create'
        content='---\n'+yaml.safe_dump(result,sort_keys=False,allow_unicode=True,width=100)+'---'+body
        if path.exists() and content==path.read_text(encoding='utf-8'): action='unchanged'
        plans.append((action,path,content))
    return plans

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config',type=Path,default=ROOT/'_data/publications.yml')
    parser.add_argument('--out',type=Path,default=ROOT/'_publications')
    parser.add_argument('--apply',action='store_true',help='write the previewed citation changes')
    parser.add_argument('--snapshot',type=Path,help='use a previously retrieved metadata JSON snapshot instead of the network')
    parser.add_argument('--save-snapshot',type=Path,help='save retrieved citation metadata for review or offline use')
    parser.add_argument('--pubmed-xml',type=Path,help=argparse.SUPPRESS)
    parser.add_argument('--biorxiv-json',type=Path,help=argparse.SUPPRESS)
    args=parser.parse_args()
    try:
        config=yaml.safe_load(args.config.read_text()) or {}
        if args.snapshot:
            records=json.loads(args.snapshot.read_text())['records']
        elif args.pubmed_xml and args.biorxiv_json:
            pubmed=all_from_pubmed(args.pubmed_xml.read_bytes())
            biorxiv=[from_biorxiv(x['response']) for x in json.loads(args.biorxiv_json.read_text())]
            records=reconcile(pubmed,biorxiv,config)
        elif args.pubmed_xml or args.biorxiv_json:
            raise ValueError('Both local source files are required.')
        else: records=live_records(config,args.out)
        plans=plan_updates(records,args.out)
        if args.save_snapshot:
            args.save_snapshot.parent.mkdir(parents=True,exist_ok=True)
            args.save_snapshot.write_text(json.dumps({'retrieved':dt.date.today().isoformat(),'records':records},ensure_ascii=False,indent=2)+'\n')
        counts={action:sum(p[0]==action for p in plans) for action in ('create','update','unchanged')}
        print(f"{len(records)} publications: {sum(r['publication_type']=='preprint' for r in records)} preprints; {sum(r['publication_type']=='article' for r in records)} published papers.")
        print(', '.join(f'{n} {action}' for action,n in counts.items()))
        for action,path,_ in plans:
            if action=='create': print('NEW '+path.name)
        matched={p for _,p,_ in plans}
        untouched=[p.name for p,_ in existing_records(args.out) if p not in matched]
        if untouched: print('Local records without a source match were kept: '+', '.join(untouched))
        if args.apply:
            args.out.mkdir(parents=True,exist_ok=True)
            for action,path,content in plans:
                if action=='unchanged': continue
                temp=path.with_suffix('.md.tmp')
                temp.write_text(content,encoding='utf-8')
                temp.replace(path)
            print('Saved. Review the changes, commit, and push to rebuild the site.')
        else: print('Preview only. Add --apply to write these changes. Figures, tags, summaries, IDs, filenames, and Markdown bodies are preserved.')
    except (ValueError,OSError,KeyError,TypeError,ET.ParseError) as exc:
        print('Refresh failed: '+str(exc),file=sys.stderr)
        return 1
    return 0

if __name__=='__main__': sys.exit(main())
