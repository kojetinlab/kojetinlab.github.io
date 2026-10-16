"""Regression checks using real public metadata for the 6ONJ source paper."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
import yaml
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from add_publication import from_pubmed,from_crossref,from_bibtex,write_record,normalize_doi
FIX=Path(__file__).parent/'fixtures'

class PublicationImportTests(unittest.TestCase):
    def test_independent_services_resolve_same_paper(self):
        pm=from_pubmed((FIX/'pubmed.xml').read_bytes())
        cr=from_crossref(json.loads((FIX/'crossref.json').read_text()))
        self.assertEqual(pm['doi'],cr['doi'])
        self.assertEqual(pm['doi'],'10.1038/s41467-020-14750-x')
        self.assertEqual(pm['year'],2020)
        self.assertIn('Shang',' '.join(pm['authors']))
        self.assertIn('Kojetin',' '.join(cr['authors']))
    def test_import_preserves_curated_duplicate_byte_for_byte(self):
        pm=from_pubmed((FIX/'pubmed.xml').read_bytes())
        cr=from_crossref(json.loads((FIX/'crossref.json').read_text()))
        with tempfile.TemporaryDirectory() as name:
            directory=Path(name);p=write_record(pm,directory)
            curated=p.read_text().replace('summary: \'\'','summary: Curated by laboratory')
            p.write_text(curated);before=p.read_bytes()
            self.assertIsNone(write_record(cr,directory))
            self.assertEqual(p.read_bytes(),before)
            self.assertEqual(len(list(directory.glob('*.md'))),1)
            data=yaml.safe_load(p.read_text().split('---',2)[1]);self.assertTrue(data['id'])
    def test_bibtex_author_and_identifier_mapping(self):
        rows=list(from_bibtex(FIX/'publications.bib'))
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]['doi'],'10.1038/s41467-020-14750-x')
        self.assertIn('Kojetin',' '.join(rows[0]['authors']))
        self.assertEqual(rows[0]['date_precision'],'year')
    def test_missing_metadata_fails_without_creating_a_file(self):
        with tempfile.TemporaryDirectory() as name:
            with self.assertRaises(ValueError):write_record({'title':'Incomplete metadata'},Path(name))
            self.assertEqual(list(Path(name).iterdir()),[])
        with self.assertRaises(ValueError):from_pubmed(b'<PubmedArticleSet/>')
        self.assertEqual(normalize_doi('https://doi.org/10.1038/S41467-020-14750-X'),'10.1038/s41467-020-14750-x')

if __name__=='__main__':unittest.main()
