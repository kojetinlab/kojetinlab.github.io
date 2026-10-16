#!/usr/bin/env python3
"""Import PubMed, Crossref DOI, or BibTeX metadata. Never overwrite a record."""
import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import yaml

ROOT = Path(__file__).resolve().parents[1]
UA = 'KojetinLabPublicationImporter/1.0 (https://kojetinlab.org/)'

def fetch(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30) as response:
            return response.read()
    except (urllib.error.URLError, TimeoutError) as exc:
        raise ValueError(f'Could not retrieve metadata from {urllib.parse.urlparse(url).netloc}: {exc}') from exc

def text(node, path):
    found = node.find(path)
    return ''.join(found.itertext()).strip() if found is not None else ''

def normalize_doi(value):
    value = re.sub(r'^(?:https?://(?:dx\.)?doi\.org/|doi:\s*)', '', str(value or '').strip(), flags=re.I)
    return value.lower()

def date_parts(parts):
    if not parts or not str(parts[0]).isdigit():
        raise ValueError('Metadata has no usable publication year; please add this record manually.')
    nums = [int(p) for p in parts[:3]]
    precision = ['year', 'month', 'day'][len(nums)-1]
    while len(nums) < 3: nums.append(1)
    return dt.date(*nums).isoformat(), precision

def from_crossref(message):
    title = ' '.join(message.get('title', []))
    if not title: raise ValueError('Crossref returned no publication title.')
    dates = message.get('published') or message.get('published-print') or message.get('published-online') or message.get('issued', {})
    date, precision = date_parts(dates.get('date-parts', [[]])[0])
    authors = [' '.join(x for x in [a.get('given'), a.get('family')] if x) or a.get('name','') for a in message.get('author', [])]
    return {'title': title, 'authors': [a for a in authors if a], 'journal': ' '.join(message.get('container-title', [])), 'year': int(date[:4]), 'date': date, 'date_precision': precision, 'doi': normalize_doi(message.get('DOI')), 'volume': message.get('volume',''), 'issue': message.get('issue',''), 'pages': message.get('page','') or message.get('article-number',''), 'journal_url': message.get('URL',''), 'publication_type': 'preprint' if message.get('type') == 'posted-content' else 'article'}

def from_pubmed(xml):
    root = ET.fromstring(xml)
    record = root.find('.//PubmedArticle')
    if record is None: raise ValueError('PubMed returned no article for this PMID.')
    article = record.find('./MedlineCitation/Article')
    title = text(article, 'ArticleTitle')
    if not title: raise ValueError('PubMed returned no article title.')
    authors = []
    for a in article.findall('./AuthorList/Author'):
        authors.append(text(a, 'CollectiveName') or ' '.join(x for x in [text(a,'ForeName') or text(a,'Initials'), text(a,'LastName')] if x))
    pubdate = article.find('./Journal/JournalIssue/PubDate')
    year = text(pubdate, 'Year') if pubdate is not None else ''
    if not year:
        match = re.search(r'\b(19|20)\d{2}\b', text(pubdate, 'MedlineDate') if pubdate is not None else '')
        year = match.group() if match else ''
    if not year:
        year = text(article, './ArticleDate/Year')
    parts = [int(year)] if year else []
    month = text(pubdate, 'Month') if pubdate is not None else ''
    if month:
        try: monthnum = int(month) if month.isdigit() else dt.datetime.strptime(month[:3], '%b').month
        except ValueError: monthnum = None
        if monthnum: parts.append(monthnum)
    day = text(pubdate, 'Day') if pubdate is not None else ''
    if day.isdigit() and len(parts) == 2: parts.append(int(day))
    date, precision = date_parts(parts)
    ids = {i.attrib.get('IdType'): i.text for i in record.findall('./PubmedData/ArticleIdList/ArticleId')}
    return {'title': title, 'authors': [a for a in authors if a], 'journal': text(article,'Journal/Title'), 'year': int(year), 'date': date, 'date_precision': precision, 'doi': normalize_doi(ids.get('doi')), 'pmid': text(record,'MedlineCitation/PMID'), 'pmcid': ids.get('pmc',''), 'volume': text(article,'Journal/JournalIssue/Volume'), 'issue': text(article,'Journal/JournalIssue/Issue'), 'pages': text(article,'Pagination/StartPage') or text(article,'Pagination/MedlinePgn'), 'publication_type': 'preprint' if text(article,'PublicationTypeList/PublicationType').lower() == 'preprint' else 'article'}

def from_bibtex(path):
    try:
        import bibtexparser
        from bibtexparser.customization import convert_to_unicode
    except ImportError as exc:
        raise ValueError('BibTeX support needs: python -m pip install -r requirements.txt') from exc
    with open(path, encoding='utf-8') as handle: entries = bibtexparser.load(handle).entries
    for raw in entries:
        entry = convert_to_unicode(raw)
        date, precision = date_parts([entry.get('year','')])
        authors=[]
        for name in entry.get('author','').split(' and '):
            chunks=[p.strip() for p in name.split(',')]
            authors.append(' '.join(reversed(chunks)) if len(chunks)==2 else name.strip())
        yield {'title': entry.get('title','').replace('{','').replace('}',''), 'authors': [a for a in authors if a], 'journal': entry.get('journal') or entry.get('booktitle',''), 'year': int(date[:4]), 'date': date, 'date_precision': precision, 'doi': normalize_doi(entry.get('doi')), 'pmid': entry.get('pmid',''), 'volume': entry.get('volume',''), 'issue': entry.get('number',''), 'pages': entry.get('pages','').replace('--','–'), 'journal_url': entry.get('url',''), 'publication_type': 'article'}

def existing_records(directory):
    for path in directory.glob('*.md'):
        parts = path.read_text(encoding='utf-8').split('---',2)
        if len(parts) == 3: yield path, yaml.safe_load(parts[1]) or {}

def write_record(record, directory):
    if not record.get('title') or not record.get('authors') or not record.get('journal'):
        raise ValueError('Title, authors, or journal is missing. Review the metadata and add this record manually.')
    doi = normalize_doi(record.get('doi'))
    pmid = str(record.get('pmid','')).strip()
    title_key = re.sub(r'\W','',record['title']).casefold()
    for path, old in existing_records(directory):
        if (doi and doi == normalize_doi(old.get('doi'))) or (pmid and pmid == str(old.get('pmid',''))) or title_key == re.sub(r'\W','',old.get('title','')).casefold():
            print(f'Skipped duplicate; existing record preserved: {path.name}')
            return None
    identity = 'doi:'+doi if doi else 'pmid:'+pmid if pmid else title_key
    uid = 'pub-' + hashlib.sha256(identity.encode()).hexdigest()[:12]
    slug = re.sub(r'[^a-z0-9]+','-',record['title'].lower()).strip('-')[:70]
    result = {'id':uid, **record, 'topics':[], 'featured':False, 'image':'', 'image_alt':'', 'image_caption':'', 'summary':'', 'pdf':'', 'preprint':'', 'pdb':[], 'bmrb':[], 'emdb':[], 'geo':[], 'github':'', 'zenodo':'', 'additional_links':[]}
    directory.mkdir(parents=True,exist_ok=True)
    path = directory / f'{record["year"]}-{slug}-{uid[-6:]}.md'
    with path.open('x',encoding='utf-8') as handle:
        handle.write('---\n'+yaml.safe_dump(result,sort_keys=False,allow_unicode=True,width=100)+'---\n\n')
    print(f'Created {path}. Review metadata, topics, image rights, and publication status before committing.')
    return path

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--pmid'); group.add_argument('--doi'); group.add_argument('--bibtex',type=Path)
    parser.add_argument('--out', type=Path, default=ROOT/'_publications')
    args=parser.parse_args()
    try:
        if args.pmid:
            if not re.fullmatch(r'\d+',args.pmid): raise ValueError('PMID must contain digits only.')
            url='https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id='+args.pmid
            records=[from_pubmed(fetch(url))]
        elif args.doi:
            doi=normalize_doi(args.doi)
            if not re.fullmatch(r'10\.\d{4,9}/\S+',doi): raise ValueError('Enter a DOI such as 10.1038/s41467-020-14750-x.')
            records=[from_crossref(json.loads(fetch('https://api.crossref.org/works/'+urllib.parse.quote(doi,safe='')))['message'])]
        else: records=from_bibtex(args.bibtex)
        for record in records: write_record(record,args.out)
    except (ValueError, OSError, ET.ParseError, KeyError) as exc:
        print(f'Import failed: {exc}',file=sys.stderr); return 1
    return 0
if __name__ == '__main__': sys.exit(main())
