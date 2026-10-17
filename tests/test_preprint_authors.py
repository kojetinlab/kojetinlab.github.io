"""Use deposited full names without changing author membership or order."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import yaml
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from add_publication import fetch_biorxiv, from_biorxiv, authors_from_jats, prefer_full_authors
from refresh_publications import plan_updates
FIX=Path(__file__).parent/'fixtures'


class PreprintAuthorTests(unittest.TestCase):
    def setUp(self):
        self.sources=json.loads((FIX/'preprint-author-sources.json').read_text())
        self.xml=(FIX/'biorxiv-authors.xml').read_bytes()

    def test_latest_manuscript_xml_supplies_full_names_in_order(self):
        source=self.sources[1]
        with patch('add_publication.fetch',side_effect=[json.dumps(source['biorxiv']).encode(),self.xml]) as fetch:
            result=fetch_biorxiv(source['crossref']['message']['DOI'])
        self.assertEqual(fetch.call_count,2)
        self.assertEqual(len(result['authors']),15)
        self.assertEqual(result['authors'][0],'Sarah A. Mosure')
        self.assertEqual(result['authors'][8],'Jess Li')
        self.assertEqual(result['authors'][-1],'Douglas J. Kojetin')
        self.assertTrue(result['authors_source'].endswith('.source.xml'))

    def test_doi_deposit_supplies_full_names_when_xml_unavailable(self):
        source=self.sources[0]
        with patch('add_publication.fetch',side_effect=[json.dumps(source['biorxiv']).encode(),ValueError('429'),json.dumps(source['crossref']).encode()]):
            result=fetch_biorxiv(source['crossref']['message']['DOI'])
        self.assertEqual(len(result['authors']),27)
        self.assertEqual(result['authors'][0],'Zhiping Xiao')
        self.assertIn('George A. O’Toole',result['authors'])
        self.assertTrue(result['authors_source'].startswith('https://api.crossref.org/'))

    def test_mismatched_author_membership_order_or_identity_is_not_used(self):
        short=['S. A. Mosure','P. Munoz-Tello']
        for names in (['Sarah A. Mosure'],['Paola Munoz-Tello','Sarah A. Mosure'],
                      ['Sarah A. Mosure','Peter Smith'],['Brian Mosure','Paola Munoz-Tello']):
            self.assertEqual(prefer_full_authors(short,names),short)
        with self.assertRaises(ValueError): authors_from_jats(self.xml,'10.1101/wrong-doi')

    def test_wrong_doi_deposit_does_not_supply_names(self):
        source=copy.deepcopy(self.sources[0]);source['crossref']['message']['DOI']='10.1101/wrong-doi'
        with patch('add_publication.fetch',side_effect=[json.dumps(source['biorxiv']).encode(),ValueError('Unavailable'),json.dumps(source['crossref']).encode()]):
            result=fetch_biorxiv(source['biorxiv']['collection'][0]['doi'])
        self.assertEqual(result['authors'],from_biorxiv(source['biorxiv'])['authors'])

    def test_failed_enrichment_does_not_erase_existing_full_names(self):
        source=self.sources[1];record=from_biorxiv(source['biorxiv'])
        full=authors_from_jats(self.xml,record['doi'])
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/'stable-url.md'
            old={**record,'authors':full,'authors_source':'verified manuscript XML','id':'stable-url','topics':['PPARγ']}
            path.write_text('---\n'+yaml.safe_dump(old)+'---\nCustom content.\n')
            _,target,content=plan_updates([record],Path(temp))[0]
            new=yaml.safe_load(content.split('---',2)[1])
            self.assertEqual(new['authors'],full)
            self.assertEqual(new['authors_source'],old['authors_source'])
            self.assertEqual(target,path)
            self.assertEqual(new['topics'],old['topics'])
            self.assertTrue(content.endswith('Custom content.\n'))
            changed=copy.deepcopy(record);changed['authors']=changed['authors'][:-1]
            _,_,updated=plan_updates([changed],Path(temp))[0]
            self.assertEqual(yaml.safe_load(updated.split('---',2)[1])['authors'],changed['authors'])


if __name__=='__main__': unittest.main()
