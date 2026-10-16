# Publication management

Each `_publications/*.md` file contains one citation and a stable `id`. The page URL comes from the filename; retain it after publication. Titles link to an individual publication page. The main list sorts by date, newest first, and supports year, topic, text, and featured filters without a visitor-time external API.

## Import metadata

```sh
python3 -m pip install -r requirements.txt
python3 scripts/add_publication.py --pmid ACTUAL_PMID
python3 scripts/add_publication.py --doi 10.1038/s41467-020-14750-x
python3 scripts/add_publication.py --bibtex publications.bib
# Equivalent BibTeX shortcut:
python3 scripts/import_bibtex.py publications.bib
```

The tools retrieve PubMed XML or Crossref JSON and write YAML with Unicode support. The DOI example is a real paper, but verify that a newly imported citation belongs in the lab bibliography before committing it. A DOI, PMID, or normalized-title match skips an existing record; imports never overwrite curated files. Invalid identifiers and missing core metadata produce errors. A complete BibTeX export can contain multiple entries; each becomes a file and duplicates are skipped. Check imported author names, BibTeX accents, and preprint status.

If an API provides only a year or month, the importer uses the first day of that period for sorting and records `date_precision: year` or `month`. This is not a claim that the paper was published on that day. Fully dated records use `date_precision: day`. Verify print versus online dates if precise ordering matters.

## Metadata fields

Required: `id`, `title`, `authors` (YAML list), `journal`, `year`, `date`.

Optional bibliographic fields: `volume`, `issue`, `pages`, `doi`, `pmid`, `pmcid`, `publication_type` (`article` or `preprint`). DOI values should be identifiers such as `10.1038/...`, not URLs. Quote PMIDs and other identifiers.

Optional presentation fields: `summary`, `image`, `image_alt`, `image_caption`, `topics` (list), `featured` (boolean).

Optional resource fields: `pdf`, `preprint`, `journal_url`, `github`, `zenodo`; list-valued fields `pdb`, `bmrb`, `emdb`, and `geo`; and `additional_links`, a list of `{label, url}` mappings. Leave an unused field empty or omit it entirely. Blank fields produce no links.

```yaml
image: /assets/images/publications/my-figure.png
image_alt: A concise description of the scientific figure.
image_caption: Figure description and source credit.
pdf: /assets/pdfs/author-manuscript.pdf
topics: [nuclear-receptor-pharmacology, pparg]
featured: true
pdb: [6ONJ]
bmrb: []
emdb: []
geo: []
additional_links:
  - label: Project website
    url: https://example.org/
```

Only add verified accession numbers. Use BMRB numeric IDs, EMDB IDs such as `EMD-1234`, and complete GEO accessions such as `GSE12345`. Examples in this guide illustrate syntax only.

## Figures, PDFs, and related research

Upload a graphical abstract or figure to `assets/images/publications/`; use `image_alt` to describe its content. The layout preserves aspect ratio instead of cropping scientific data. Without an image, the citation remains fully readable and uses a quiet year treatment.

Upload a PDF only if you have permission to distribute that version. Otherwise link to the DOI, PMC, or an authorized repository. Local resource URLs use the configured GitHub Pages base path. External URLs are preserved.

Set `featured: true` to make a publication eligible for the homepage; its three most recent featured entries appear automatically. Give publications and research pages matching topic tags, or add the publication's stable `id` to a research page's `publication_ids`. Citation text stays in one place.

## Checks

`validate_content.py` checks required fields, duplicate IDs/DOIs/PMIDs, image/PDF files, lists, dates, and research cross-references. The GitHub workflow runs it before each build. The offline tests exercise metadata parsing and duplicate preservation; live services may impose rate limits, and large imports should be performed respectfully.
