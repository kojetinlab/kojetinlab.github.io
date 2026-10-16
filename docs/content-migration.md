# Content migration and review notes

Imported on 15 October 2026 from public sources. This is an editable starting point, and source dates do not prove a roster or alumni position is current.

## Sources and scope

- [Current lab home](https://www.kojetinlab.org/): laboratory research focus and Vanderbilt affiliation.
- [Current lab people page](https://www.kojetinlab.org/people): **5 current profiles, 18 unique alumni, and 5 locally stored portrait images**. The original page listed Sarah Mosure twice, as an undergraduate researcher and a graduate student; those periods are combined in one alumni profile.
- [Current lab publication page](https://www.kojetinlab.org/publications-2): **83 publication records spanning 2001–2026**, including one separately labeled bioRxiv preprint. All entries on that page were migrated. The older `/publications/` and `/group` pages were not treated as the current source, because they are historical duplicates.
- [Vanderbilt Biochemistry faculty page](https://medschool.vanderbilt.edu/biochemistry/person/doug-kojetin/): current PI title, leadership roles, research focus, public email, and telephone.
- [Vanderbilt public faculty listing](https://wag.app.vanderbilt.edu/PublicPage/Faculty/Details/48848): educational background.
- [RCSB PDB 6ONJ](https://www.rcsb.org/structure/6ONJ): structure identity, primary publication DOI and PMID, and related PDB entries 6ONI/6ONJ/6PDZ.
- [Vanderbilt promotion announcement](https://medschool.vanderbilt.edu/vicb/2026/03/11/dr-douglas-kojetin-promoted-to-professor-of-biochemistry/): a verified 11 March 2026 news item.

The three research pages are new concise summaries grounded in the public lab description and its published work. Six publication milestone posts are new summaries dated from exact publication/online-publication dates printed in the bibliography or verified in NCBI PubMed XML. They are not represented as recovered historical news posts. The seventh news post summarizes the public Vanderbilt promotion announcement.

## Review before launch

1. **Roster:** The five names under current members exactly reflect the old public site: Douglas Kojetin, Paola Munoz-Tello, Xiaoyu (Lily) Yu, Christopher Williams, and Min-Hsuan Li. Confirm who should remain current and supply any new members. No names or biographical details were imported from private conversation history. Paola’s “Senior Staff Scientist” role is the remaining staff title in the visually positioned source page. No personal emails were inferred.
2. **Alumni:** Their positions are the last reported positions on the old site. They have not been independently verified. The `position_note` field records this limitation. Retain that caveat in the people page or update the positions before publication.
3. **2026 eLife records corrected:** The old page grouped Yu and Arifova under 2026 and linked eLife, but the displayed citations still described their 2025 bioRxiv versions. Final journal metadata is now verified using NCBI PubMed XML: Yu et al., 30 April 2026, eLife 14, DOI 10.7554/eLife.106861, PMID 42059885, PMCID PMC13132549; Arifova et al., 21 January 2026, eLife 14, DOI 10.7554/eLife.106697, PMID 41563829, PMCID PMC12823062. Source-linked preprints are retained as optional links.
4. **Publication completeness:** All 83 entries on the current public page are included; this is not an independent exhaustive PubMed/Crossref search. The site may itself omit papers. Thirty-three records were enriched against NCBI PubMed XML, with authoritative titles, author names, journal dates, DOIs, PMC IDs, volumes, and pages. Forty-eight records still have no DOI value because the remaining source entries lacked a DOI or linked a non-DOI publisher URL. Existing PubMed/publisher/preprint links were preserved. The journal publication year is authoritative for enriched records; an earlier online date is retained separately in `online_date`. No DOI, PDF, data accession, or image link was guessed.
5. **Dates:** Where only a year was supplied, `date` uses January 1 for deterministic sorting and `date_precision: year` marks that it is not an exact publication date. Display only the year for those records. These placeholder sort dates were never used for news posts.
6. **Source corrections:** A duplicated Chrisman paper title was deduplicated. The 2025 MacTavish “bioRxiv” link actually pointed to its Nature DOI; that redundant mislabeled link was omitted. The Solt initials in the 2020 6ONJ publication were corrected to LA using RCSB. Obvious whitespace artifacts were removed; records not enriched through PubMed retain older author spelling and incomplete volume/page fields as supplied and warrant bibliographic cleanup.
7. **Portraits:** Five photographs were reused from the user’s existing lab website, downloaded to `assets/images/people/`. No portraits or design assets were copied from the reference laboratory websites. Two publication figures were subsequently added from the 2026 eLife papers (Yu Figure 1 and Arifova Figure 8), under CC BY 4.0 with captions and source credit. Other publication image fields remain empty for the lab to populate.
8. **Address:** The current Biochemistry faculty page lists 756 Engineering and Science Building, 1212 25th Avenue S, Nashville, TN 37240. Other Vanderbilt directories still list the Robinson Research Building. Confirm the preferred visitor versus mailing address before launch. Public telephone: 615-343-2841. Public email: douglas.kojetin@vanderbilt.edu.
9. **Journal/preprint status:** The 2022 interdomain-communication manuscript was labeled under revision on the previous site and remains explicitly a preprint here. No unpublished private project details or grant plans were migrated.

## Editing structure

Each member, publication, and research topic has its own Markdown file and YAML front matter. Publications use stable `id` values so research-page links survive title changes. Optional fields remain empty when not supported by source material. The `source_url`, `source_citation`, `source_urls`, `migration_note`, and `date_precision` fields preserve provenance and review context without requiring it to appear in page copy.

The current `/people/` and historical `/publications/` paths remain useful. Legacy `/publications-2/` and `/group/` pages redirect to the new publication index and people page, respectively, with ordinary fallback links.
