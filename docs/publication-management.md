# Publication management

Each `_publications/*.md` file contains one citation. The page URL and research-page selection key come from the filename without `.md`; retain that filename after publication. The importer gives `id` the same value. Titles link to an individual page with the paper's abstract. The main list shows unpublished preprints first, followed by published papers, newest first within each group. Year, topic, text, and featured filters work across both groups. Metadata is stored locally, so visitors do not need an external API.

## Import metadata

```sh
python3 -m pip install -r requirements.txt
python3 scripts/add_publication.py --pmid ACTUAL_PMID
python3 scripts/add_publication.py --biorxiv 10.1101/2022.07.13.499031
python3 scripts/add_publication.py --doi 10.1038/s41467-020-14750-x
python3 scripts/add_publication.py --bibtex publications.bib
# Equivalent BibTeX shortcut:
python3 scripts/import_bibtex.py publications.bib
```

Run these commands from the website repository folder. Replace `ACTUAL_PMID` with the number at the end of the PubMed URL. For example, PMID `42059885` identifies the NR4A–RXR eLife paper already included in this release; trying it will safely report a duplicate.

`--pmid` retrieves the citation and complete available abstract directly from PubMed. `--biorxiv` retrieves the latest version and abstract directly from bioRxiv. Full preprint author names come from the latest manuscript XML, falling back to its Crossref DOI deposit. Author count, order, surnames and first initials must match the bioRxiv list before initials are expanded. Names are retained exactly as deposited, including middle initials; unprovided names are never guessed. A refresh retains matching existing full names if those sources are temporarily unavailable. `authors_source` records the author-name source. When a journal publication is linked by the source, the importer uses that published PubMed record. `--doi` retains the optional Crossref importer; use a PMID for the PubMed abstract. A DOI, PMID, or normalized-title match skips an existing file. Single-paper imports never overwrite curated files; use the refresh command below to update them. A BibTeX export can contain multiple entries. Review the generated file in GitHub Desktop, add topics/figures if desired, then commit and push.

## Refresh the collection

```sh
# Preview citation and abstract updates:
python3 scripts/refresh_publications.py

# Retrieve and save those updates:
python3 scripts/refresh_publications.py --apply
```

This searches PubMed using `_data/publications.yml`, verifies the author name, and checks bioRxiv publication links. It updates bibliographic fields and abstracts while preserving filenames, IDs, topic tags, figures, summaries, resource links, and the Markdown text below the front matter. It keeps unmatched local entries and stops if multiple local files match one source record. It does not push or publish changes.

The settings file supports:

| Setting | Purpose |
| --- | --- |
| `pubmed_query` | PubMed search used to discover records. |
| `author_family`, `author_given` | Confirm the author is Douglas/Doug/D. Kojetin, excluding other people with the surname. |
| `extra_pmids` | Additional PMIDs to retrieve if absent from the search; the author check still applies. |
| `biorxiv_dois` | Known bioRxiv DOIs, including manuscripts not indexed by PubMed. Add a new bioRxiv-only DOI here, or import it with `--biorxiv`; existing preprint links are also checked during refresh. |
| `published_doi_overrides` | Explicit preprint-to-journal mappings when bioRxiv has not recorded the relationship. |

Published bioRxiv versions become a Preprint link on the journal entry rather than a second listing. A preprint already on your site is updated in place when the journal version appears, retaining its URL and research links. PubMed correction notices are linked from the original paper rather than counted as separate manuscripts. The CAR/Nr1i3 preprint uses a documented override because the bioRxiv API does not expose its Nature publication link.

This release includes `scripts/publication-metadata.json`, a snapshot retrieved on October 17, 2026: 82 published papers and 2 unpublished preprints. To apply that snapshot to existing publication files without another download:

```sh
python3 scripts/refresh_publications.py --snapshot scripts/publication-metadata.json
python3 scripts/refresh_publications.py --snapshot scripts/publication-metadata.json --apply
```

Use the regular refresh command for later updates. New manuscripts absent from both the PubMed search and your bioRxiv DOI list must be added explicitly. There is no scheduled background job.

Published papers sort by their journal citation date. If that date supplies only a year or month, the importer uses the electronic publication date when it falls within the same period; otherwise the first day of that period is used with `date_precision: year` or `month`. This is not a claim of an exact publication day. `online_date` retains a separate electronic date when available. Preprints sort by the latest bioRxiv version date; `first_posted` and the displayed citation year retain the initial posting date.

## Metadata fields

Required: `id`, `title`, `authors` (YAML list), `journal`, `year`, `date`.

Optional bibliographic fields: `volume`, `issue`, `pages`, `doi`, `pmid`, `pmcid`, `publication_type` (`article` or `preprint`). DOI values should be identifiers such as `10.1038/...`, not URLs. Quote PMIDs and other identifiers.

Optional presentation fields: `summary`, `image`, `image_alt`, `image_caption`, `topics` (list), `featured` (boolean).

`abstract` contains the source abstract as plain text, including all available structured sections. It appears under **Abstract** on the individual publication page. Keep your own short description in `summary`; it is preserved during refresh. Source and retrieval information is recorded in `abstract_source`, `metadata_source`, and `metadata_verified`.

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

Set `featured: true` to make a publication eligible for the homepage; its three most recent featured entries appear automatically. Give publications and research pages matching topic tags, or add the publication filename without `.md` to a research page's `publication_ids`. Use `topics: []` on a research page to show only explicitly selected publications. Citation text stays in one place.

## Checks

`validate_content.py` checks required fields, duplicate IDs/DOIs/PMIDs, image/PDF files, lists, dates, and research cross-references. The GitHub workflow runs it before each build. The offline tests exercise metadata parsing and duplicate preservation; live services may impose rate limits, and large imports should be performed respectfully.

## Abstracts missing after an older release

Both parts are required: an `abstract` field in each `_publications/*.md` record and the Abstract section in `_layouts/publication.html`. The v5.16+ release includes both. If the release updater reports conflicts, it stops before copying; resolve those conflicts and apply the release first. Restart Jekyll after the config update.

To fill older records after the updated scripts/template are installed, use the bundled snapshot without another network download:

```sh
python3 scripts/refresh_publications.py --snapshot scripts/publication-metadata.json
python3 scripts/refresh_publications.py --snapshot scripts/publication-metadata.json --apply
```

This preserves your topics, figures and Markdown text. To fetch current data instead, omit `--snapshot scripts/publication-metadata.json`. `add_publication.py` skips existing papers, so rerunning that importer does not fill missing abstracts in existing files. Review, commit and push to rebuild the public site.

The Research topic filter displays each `topics` value exactly as written in publication YAML, preserving capitalization, Greek letters and hyphens (for example, `NMR`, `PPARγ`, `NR4A/Nurr1/Nur77` and `REV-ERB`). Use the same spelling on every paper that belongs to the same topic.
