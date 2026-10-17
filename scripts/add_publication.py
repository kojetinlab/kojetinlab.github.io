#!/usr/bin/env python3
"""Create publication Markdown from a PMID, bioRxiv DOI, other DOI, or BibTeX."""
import argparse
import datetime as dt
import hashlib
import html
import json
from pathlib import Path
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import yaml

ROOT = Path(__file__).resolve().parents[1]
UA = 'KojetinLabPublicationImporter/1.0 (https://kojetinlab.org/)'
_last_pubmed_request = 0.0

def fetch(url):
    global _last_pubmed_request
    if urllib.parse.urlparse(url).netloc == 'eutils.ncbi.nlm.nih.gov':
        time.sleep(max(0, 0.4-(time.monotonic()-_last_pubmed_request)))
        _last_pubmed_request = time.monotonic()
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30) as response:
            return response.read()
    except (urllib.error.URLError, TimeoutError) as exc:
        raise ValueError(f'Could not retrieve metadata from {urllib.parse.urlparse(url).netloc}: {exc}') from exc

def text(node, path):
    if node is None: return ''
    found = node.find(path)
    return ''.join(found.itertext()).strip() if found is not None else ''

def normalize_doi(value):
    value = re.sub(r'^(?:https?://(?:dx\.)?doi\.org/|doi:\s*)', '', str(value or '').strip(), flags=re.I)
    return value.lower()

def doi_key(value):
    """eLife version suffixes identify versions of the same journal work."""
    return re.sub(r'^(10\.7554/elife\.\d+)\.\d+$', r'\1', normalize_doi(value))

def title_key(value):
    value = plain_text(value).casefold()
    for letter, name in [('α','alpha'),('β','beta'),('γ','gamma')]:
        value = value.replace(letter, name)
    return re.sub(r'\W', '', unicodedata.normalize('NFKD', value))

def plain_text(value):
    value = re.sub(r'</?(?:jats:)?(?:p|sec|title)\b[^>]*>', '\n', str(value or ''), flags=re.I)
    return html.unescape(re.sub(r'<[^>]+>', '', value)).strip()

def pubmed_date(node):
    year = text(node, 'Year')
    if not year:
        match = re.search(r'\b(?:19|20)\d{2}\b', text(node, 'MedlineDate'))
        year = match.group() if match else ''
    parts = [int(year)] if year else []
    month = text(node, 'Month')
    if month and parts:
        try: parts.append(int(month) if month.isdigit() else dt.datetime.strptime(month[:3], '%b').month)
        except ValueError: pass
    day = text(node, 'Day')
    if day.isdigit() and len(parts) == 2: parts.append(int(day))
    return date_parts(parts)

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

def parse_pubmed_article(record):
    article = record.find('./MedlineCitation/Article')
    title = text(article, 'ArticleTitle')
    if not title: raise ValueError('PubMed returned no article title.')
    authors = []
    for a in article.findall('./AuthorList/Author'):
        authors.append(text(a, 'CollectiveName') or ' '.join(x for x in [text(a,'ForeName') or text(a,'Initials'), text(a,'LastName')] if x))
    electronic = article.find('./ArticleDate[@DateType="Electronic"]')
    try: date, precision = pubmed_date(article.find('./Journal/JournalIssue/PubDate'))
    except ValueError: date, precision = pubmed_date(electronic)
    online_date = ''
    if electronic is not None:
        online_date, online_precision = pubmed_date(electronic)
        # Add day precision only within the same citation year/month.
        prefix = 4 if precision == 'year' else 7 if precision == 'month' else 10
        if precision != 'day' and online_date[:prefix] == date[:prefix]:
            date, precision = online_date, online_precision
    ids = {i.attrib.get('IdType'): i.text for i in record.findall('./PubmedData/ArticleIdList/ArticleId')}
    types = [text(n, '.') for n in article.findall('./PublicationTypeList/PublicationType')]
    kind = 'preprint' if 'Preprint' in types or 'biorxiv' in text(article,'Journal/Title').lower() else 'correction' if 'Published Erratum' in types else 'article'
    sections = []
    for node in article.findall('./Abstract/AbstractText'):
        value = ''.join(node.itertext()).strip()
        label = node.get('Label', '')
        if value: sections.append((label + ': ' if label else '') + value)
    relations = {}
    for node in record.findall('./MedlineCitation/CommentsCorrectionsList/CommentsCorrections'):
        if text(node, 'PMID'): relations.setdefault(node.get('RefType'), []).append(text(node, 'PMID'))
    pmid = text(record,'MedlineCitation/PMID')
    pages = text(article,'Pagination/MedlinePgn')
    if not pages:
        pages = text(article,'Pagination/StartPage')
        end = text(article,'Pagination/EndPage')
        if end and end != pages: pages += '-' + end
    if not pages:
        pages = next((n.text for n in article.findall('./ELocationID') if n.get('EIdType') == 'pii'), '')
    return {'title': title.rstrip('.'), 'authors': [a for a in authors if a], 'journal': text(article,'Journal/Title'), 'year': int(date[:4]), 'date': date, 'date_precision': precision, 'online_date': online_date, 'doi': normalize_doi(ids.get('doi')), 'pmid': pmid, 'pmcid': ids.get('pmc',''), 'volume': text(article,'Journal/JournalIssue/Volume'), 'issue': text(article,'Journal/JournalIssue/Issue'), 'pages': pages, 'publication_type': kind, 'abstract': '\n\n'.join(sections), 'abstract_source': 'https://pubmed.ncbi.nlm.nih.gov/'+pmid+'/', 'metadata_source': 'https://pubmed.ncbi.nlm.nih.gov/'+pmid+'/', 'metadata_verified': dt.date.today().isoformat(), 'pubmed_relations': relations}

def all_from_pubmed(xml):
    root = ET.fromstring(xml)
    nodes = [root] if root.tag == 'PubmedArticle' else root.findall('./PubmedArticle')
    return [parse_pubmed_article(node) for node in nodes]

def from_pubmed(xml):
    records = all_from_pubmed(xml)
    if not records: raise ValueError('PubMed returned no article for this PMID.')
    return records[0]

def from_biorxiv(payload):
    versions = payload.get('collection', [])
    if not versions: raise ValueError('bioRxiv returned no manuscript for this DOI.')
    row = max(versions, key=lambda item: int(item.get('version', 0)))
    doi = normalize_doi(row['doi'])
    posted = min(item['date'] for item in versions)
    date = dt.date.fromisoformat(row['date']).isoformat()
    authors = []
    for author in row.get('authors','').split(';'):
        parts = [p.strip() for p in author.strip().split(',',1)]
        name = ' '.join(reversed(parts)) if len(parts) == 2 else parts[0]
        if name: authors.append(name)
    published = normalize_doi(row.get('published'))
    if not re.fullmatch(r'10\.\d{4,9}/\S+', published): published = ''
    return {'title': plain_text(row['title']), 'authors': authors, 'journal': 'bioRxiv', 'year': int(posted[:4]), 'date': date, 'date_precision': 'day', 'first_posted': posted, 'doi': doi, 'publication_type': 'preprint', 'preprint': 'https://doi.org/'+doi, 'preprint_doi': doi, 'preprint_version': int(row['version']), 'published_doi': published, 'abstract': plain_text(row.get('abstract')), 'abstract_source': 'https://doi.org/'+doi, 'metadata_source': 'https://api.biorxiv.org/details/biorxiv/'+doi, 'metadata_verified': dt.date.today().isoformat()}

def fetch_pubmed(pmid):
    return from_pubmed(fetch('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id='+str(pmid)))

def fetch_biorxiv(doi):
    return from_biorxiv(json.loads(fetch('https://api.biorxiv.org/details/biorxiv/'+normalize_doi(doi))))

def published_from_doi(doi):
    terms = ' OR '.join('"'+d+'"[DOI]' for d in sorted({normalize_doi(doi),doi_key(doi)}))
    url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?'+urllib.parse.urlencode({'db':'pubmed','term':terms,'retmode':'json'})
    ids = json.loads(fetch(url))['esearchresult']['idlist']
    for pmid in ids:
        record = fetch_pubmed(pmid)
        if record['publication_type']=='article' and doi_key(record.get('doi'))==doi_key(doi):
            return record
    raise ValueError('The journal version '+doi+' was not found in PubMed. Add its verified PMID once indexed.')

def resolve_biorxiv_record(record):
    if not record.get('published_doi'): return record
    published = published_from_doi(record['published_doi'])
    published.update({k:record[k] for k in ('preprint','preprint_doi','preprint_version')})
    print('Using the published journal version: '+published['doi'])
    return published

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

def new_record(record):
    doi = normalize_doi(record.get('doi'))
    pmid = str(record.get('pmid','')).strip()
    identity = 'doi:'+doi if doi else 'pmid:'+pmid if pmid else title_key(record['title'])
    uid = hashlib.sha256(identity.encode()).hexdigest()[:12]
    slug = re.sub(r'[^a-z0-9]+','-',record['title'].lower()).strip('-')[:70]
    filename = f'{record["year"]}-{slug}-{uid[-6:]}'
    result = {'id':filename, 'topics':[], 'featured':False, 'image':'', 'image_alt':'', 'image_caption':'', 'summary':'', 'pdf':'', 'preprint':'', 'pdb':[], 'bmrb':[], 'emdb':[], 'geo':[], 'github':'', 'zenodo':'', 'additional_links':[], **record}
    return filename+'.md', result

def write_record(record, directory):
    if not record.get('title') or not record.get('authors') or not record.get('journal'):
        raise ValueError('Title, authors, or journal is missing. Review the metadata and add this record manually.')
    doi = normalize_doi(record.get('doi'))
    pmid = str(record.get('pmid','')).strip()
    normalized_title = title_key(record['title'])
    for path, old in existing_records(directory):
        if (doi and doi_key(doi) == doi_key(old.get('doi'))) or (pmid and pmid == str(old.get('pmid',''))) or normalized_title == title_key(old.get('title','')):
            print(f'Skipped duplicate; existing record preserved: {path.name}')
            return None
    filename, result = new_record(record)
    directory.mkdir(parents=True,exist_ok=True)
    path = directory / filename
    with path.open('x',encoding='utf-8') as handle:
        handle.write('---\n'+yaml.safe_dump(result,sort_keys=False,allow_unicode=True,width=100)+'---\n\n')
    print(f'Created {path}. Review metadata, topics, image rights, and publication status before committing.')
    return path

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--pmid'); group.add_argument('--doi'); group.add_argument('--biorxiv'); group.add_argument('--bibtex',type=Path)
    parser.add_argument('--out', type=Path, default=ROOT/'_publications')
    args=parser.parse_args()
    try:
        if args.pmid:
            if not re.fullmatch(r'\d+',args.pmid): raise ValueError('PMID must contain digits only.')
            record = fetch_pubmed(args.pmid)
            if record['publication_type'] == 'preprint' and record.get('pubmed_relations',{}).get('UpdateIn'):
                original = record
                record = fetch_pubmed(original['pubmed_relations']['UpdateIn'][0])
                record.update({'preprint':'https://doi.org/'+original['doi'],'preprint_doi':original['doi']})
            elif record['publication_type'] == 'preprint' and 'biorxiv' in record['journal'].lower():
                bio = fetch_biorxiv(record['doi'])
                if bio.get('published_doi'): record=resolve_biorxiv_record(bio)
                else: record.update(bio)
            records=[record]
        elif args.biorxiv:
            doi=normalize_doi(args.biorxiv)
            if not re.fullmatch(r'10\.\d{4,9}/\S+',doi): raise ValueError('Enter a bioRxiv DOI, such as 10.1101/2022.07.13.499031.')
            record=resolve_biorxiv_record(fetch_biorxiv(doi))
            records=[record]
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
