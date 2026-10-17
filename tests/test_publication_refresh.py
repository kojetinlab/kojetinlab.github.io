"""Protect citation accuracy, version reconciliation, and existing editorial content."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
import yaml
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from add_publication import all_from_pubmed, from_biorxiv, from_pubmed, new_record
from refresh_publications import matches_author, plan_updates, reconcile

FIX=Path(__file__).parent/'fixtures'
CONFIG={'author_family':'Kojetin','author_given':['Douglas','Doug','D']}

class PublicationRefreshTests(unittest.TestCase):
    def setUp(self):
        self.pubmed=all_from_pubmed((FIX/'pubmed-refresh.xml').read_bytes())
        self.bio=[from_biorxiv(row['response']) for row in json.loads((FIX/'biorxiv.json').read_text())]

    def test_pubmed_checks_all_publication_types(self):
        row=next(r for r in self.pubmed if r['pmid']=='42779649')
        self.assertEqual(row['publication_type'],'preprint')
        self.assertTrue(row['abstract'].startswith('Bile acids'))
        self.assertIn('Douglas Kojetin',row['authors'])

    def test_structured_abstract_retains_all_sections_and_inline_text(self):
        xml=b'''<PubmedArticleSet><PubmedArticle><MedlineCitation><PMID>1</PMID><Article><ArticleTitle>A study</ArticleTitle><Journal><Title>A journal</Title><JournalIssue><PubDate><Year>2026</Year></PubDate></JournalIssue></Journal><Abstract><AbstractText Label="BACKGROUND">Protein <i>alpha</i> binds.</AbstractText><AbstractText Label="RESULTS">Two states.</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle></PubmedArticleSet>'''
        self.assertEqual(from_pubmed(xml)['abstract'],'BACKGROUND: Protein alpha binds.\n\nRESULTS: Two states.')

    def test_latest_biorxiv_version_and_publication_link(self):
        row=next(r for r in self.bio if r['doi']=='10.1101/2025.03.04.640448')
        self.assertEqual(row['preprint_version'],4)
        self.assertEqual(row['date'],'2025-11-19')
        self.assertEqual(row['published_doi'],'10.7554/elife.106697')

    def test_published_preprints_are_linked_not_duplicated(self):
        rows=reconcile(self.pubmed,self.bio,CONFIG)
        self.assertEqual(len(rows),4)
        self.assertEqual(sum(r['publication_type']=='preprint' for r in rows),1)
        article=next(r for r in rows if r.get('pmid')=='42059885')
        self.assertEqual(article['preprint_doi'],'10.1101/2025.03.19.642122')
        article=next(r for r in rows if r.get('pmid')=='33289551')
        self.assertEqual(article['correction_urls'],['https://pubmed.ncbi.nlm.nih.gov/33844542/'])

    def test_author_variants_and_different_person(self):
        for name in ('Douglas J Kojetin','Douglas Kojetin','Doug Kojetin','D J Kojetin','D. J. Kojetin'):
            self.assertTrue(matches_author({'authors':[name]},CONFIG))
        self.assertFalse(matches_author({'authors':['Sarah Kojetin']},CONFIG))

    def test_refresh_preserves_editorial_fields_and_body(self):
        record=reconcile(self.pubmed,self.bio,CONFIG)[1]
        with tempfile.TemporaryDirectory() as name:
            directory=Path(name);path=directory/'custom-url.md'
            old={'id':'stable-id',**record,'title':'My old title','topics':['RXR'],'image':'/assets/my-figure.png','summary':'My summary','featured':True}
            body='\n\n## Custom explanation\n\nKeep this exact Markdown.\n'
            path.write_text('---\n'+yaml.safe_dump(old)+'---'+body)
            before=path.read_bytes()
            action,target,content=plan_updates([record],directory)[0]
            new=yaml.safe_load(content.split('---',2)[1])
            self.assertEqual(target,path)
            for key in ('id','topics','image','summary','featured'): self.assertEqual(new[key],old[key])
            self.assertEqual(new['title'],record['title'])
            self.assertEqual(content.split('---',2)[2],body)
            self.assertEqual(path.read_bytes(),before) # A preview never writes.

    def test_preprint_promotes_in_place_without_changing_url(self):
        record=next(r for r in reconcile(self.pubmed,self.bio,CONFIG) if r.get('pmid')=='42059885')
        bio=next(r for r in self.bio if r['doi']==record['preprint_doi'])
        with tempfile.TemporaryDirectory() as name:
            directory=Path(name);path=directory/'original-preprint-url.md'
            path.write_text('---\n'+yaml.safe_dump({'id':'original-preprint-url',**bio,'topics':['RXR']})+'---\n')
            action,target,content=plan_updates([record],directory)[0]
            result=yaml.safe_load(content.split('---',2)[1])
            self.assertEqual(target,path)
            self.assertEqual(result['publication_type'],'article')
            self.assertEqual(result['doi'],'10.7554/elife.106861')
            self.assertEqual(result['topics'],['RXR'])

    def test_ambiguous_local_duplicates_stop_before_writing(self):
        record=self.pubmed[0]
        with tempfile.TemporaryDirectory() as name:
            directory=Path(name)
            for i in range(2): (directory/f'copy-{i}.md').write_text('---\n'+yaml.safe_dump(record)+'---\n')
            with self.assertRaisesRegex(ValueError,'Multiple local files'): plan_updates([record],directory)

    def test_new_id_matches_filename_for_research_selection(self):
        filename,record=new_record(self.pubmed[0])
        self.assertEqual(filename,record['id']+'.md')

if __name__=='__main__': unittest.main()
