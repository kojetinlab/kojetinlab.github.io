# Updating the website

Routine changes only require Markdown, YAML, and images. Commit changes to `main`; the GitHub Actions workflow validates, builds, and publishes them. For review first, make a branch and pull request. Pull requests build and validate without publishing.

## GitHub's web editor

1. Open the repository, navigate to the file, and click the pencil icon.
2. Edit the text below the YAML metadata or the metadata fields themselves.
3. Preview Markdown where available, then commit to a branch or `main`.
4. Check the **Actions** tab. A failed content check will name the file and error.
5. For photos, open the image folder and choose **Add file → Upload files**; then reference that filename in the member or publication file.

Use spaces, not tabs, in YAML. Quote strings containing colons. Preserve the opening and closing `---`. File names should use lowercase letters, digits, and hyphens. Keep publication and person filenames stable so their URLs do not change.

## People and alumni settings

Edit `_data/people.yml`:

```yaml
sort_by: last_name
show_alumni_photos: false
alumni_compact: true
alumni_columns: 4
```

`alumni_compact: true` makes Alumni a quieter directory below the current lab members: 20 px names, 16 px role/year text, 15 px muted italic subsequent positions, a smaller section heading, and tighter spacing. `alumni_columns` controls the wide-screen column count (3–5, default 4). At widths of 601–1000 px the compact layout uses two columns; at 600 px or below it uses one column for readability. Set `alumni_compact: false` to restore the previous larger layout. The current-member cards and all profile pages keep their existing typography.

To adjust the compact font sizes, edit `--alumni-name-size`, `--alumni-detail-size`, and `--alumni-destination-size` near the compact-directory rules in `assets/css/people.css`. Save and let Jekyll rebuild, then refresh. Photo visibility and sorting work with either layout; enabled alumni portraits are capped at 120 px wide in the compact directory.

The same sort applies separately to Our People and Alumni. Douglas stays first in Our People because his member file has `principal_investigator: true`.

| `sort_by` value | Order |
| --- | --- |
| `last_name` (default) | Alphabetical by the explicit `last_name` field |
| `seniority` | Lowest `seniority` number first; alphabetical by surname within each rank |
| `joined` | Earliest `joined_year` first; alphabetical by surname within the same year; unknown years last |

Seniority means role rank, rather than time in the lab: 0 = principal investigator, 10 = research-track faculty, 20 = staff scientist, 30 = postdoc, 40 = graduate student, 50 = research technician, 60 = undergraduate (including summer interns), 70 = high school intern, 80 = visiting researcher. These are editable display ranks; change a person's number to fit your preferred ordering. Alumni use their last role in this lab, not their subsequent position elsewhere. Visitors are placed last because their roles span career stages; adjust their rank if desired.

`joined_year` means the earliest documented year with the lab, including earlier roles and the period before the move to Vanderbilt. The supplied roster provides years, so the site does not invent months or days. Paola starts at 2014, Min-Hsuan at 2021, and Liudmyla at 2023. Multiple appointments remain on one profile. `years` is separate display text and may describe gaps.

`show_alumni_photos: false` hides photos and initials on both the alumni list and alumni profile pages. Change it to `true` to show portraits, with initials when no photo exists. Current members always retain portraits or initials. Use the boolean words `true` and `false` without quotes.

These settings apply when Jekyll rebuilds; they are not visitor dropdown options. Save the file while running `bundle exec jekyll serve --livereload` for local preview, or commit and push for GitHub Pages. Changes to `_config.yml` require restarting Jekyll; `_data/people.yml` changes do not.

## Add or update a person

Create `_members/first-last.md`:

```yaml
---
name: First Last
last_name: Last
role: Graduate Student
category: Graduate Students
status: current
seniority: 40
joined_year: 2026
years: "2026–present"
photo: /assets/images/people/first-last.jpg
email: first.last@vanderbilt.edu
research_interests: A short, publicly shareable description.
website: ""
---

A biography goes here. Markdown paragraphs and links are supported.
```

This is a template, not a published roster entry. Set `photo: ""` if there is no photo. Leave `joined_year` out if unknown. The `last_name` field supports compound surnames such as `De Vera` and `Munoz-Tello`. `category` describes the role; sorting uses `seniority`. The former `order` field is no longer used for people. Optional `orcid`, `google_scholar`, `linkedin`, and `github` links are also supported.

Optional history and awards go above the closing `---`:

```yaml
lab_history:
  - role: Undergraduate Researcher
    years: "2023–2025"
    institution: Vanderbilt University
  - role: Graduate Student
    years: "2026–present"
    institution: Vanderbilt University
awards:
  - Fellowship name (2026)
```

To move someone to alumni, change `status: alumni`, update their final lab role and its `seniority`, and set `years` to the completed interval. Optionally add `current_position` and `current_institution`. Keep their filename to preserve their profile URL and keep `joined_year` as their original joining year. Confirm current positions before adding them. On the alumni listing, a defined `current_position` appears on a separate line prefixed with “Subsequently:”, in muted italic text (15 px in the compact directory; 90% of regular body size in the larger layout). No destination line appears when that field is blank. The last-reported-updates note remains in place. Adjust this styling in `assets/css/people.css` under `.alumni-destination`.

### Photo dimensions and cropping

Photos do not need identical pixel dimensions. People cards and individual profiles use a **4:5 portrait frame** with `object-fit: cover`: images scale proportionally, with excess cropped instead of stretched. Original files are unchanged. For predictable framing, prepare a portrait such as 800 × 1000 pixels with some room around the face. Small originals may look soft when enlarged.

Shared crop settings live in `assets/css/site.css`:

```css
.member-card img { object-position: 50% 20%; }
.profile-photo { object-position: 50% 15%; }
```

Alumni list portraits use `.alumni-portrait img` in `assets/css/people.css`, also at `50% 20%`. The first percentage centers horizontally; the second favors the upper part of the photo. A smaller second value favors the top; `50% 50%` centers the crop. For an individual adjustment, crop the source image before uploading it.

### October 2026 roster import

The supplied `people(2).docx` updates the site to 12 current members and 33 alumni, including Douglas's existing profile. Open-ended appointments are current; completed appointments, including summer 2026 internships, are alumni. People with multiple appointments appear once. Existing profile URLs and photographs are preserved. Earlier career destinations absent from the document are retained as last-reported information; this applies to Sarah Mosure, Juan Granados, William Gardner, and Yanan Long.

Two source details need editorial review:

- Hundaol Huluka appears as “Hunadol Huluka” in the undergraduate section. One profile uses “Hundaol” from the current technician entry and combines both appointments. Confirm that spelling in `_members/hundaol-huluka.md`.
- Kelly O’Rourke's awards include an isolated, unnamed “Award.” The named PhRMA fellowship, V-CBI training, and Dean's Award are included; no additional award was inferred. See `_members/kelly-orourke.md`.

The `editor_note` fields record these questions for maintainers and are not shown on public pages. New members without supplied photos display initials. The original Word document is not published with the website.

## Research

Add `_research/new-area.md`:

```yaml
---
title: Research area title
summary: A concise description for the overview page.
order: 4
topics: [nuclear-receptor-pharmacology]
publication_ids: []
---

Detailed scientific description.

<figure>
  <img src="{{ '/assets/images/research/figure.jpg' | relative_url }}"
       alt="Describe the scientific finding visible in the figure.">
  <figcaption>A scientific caption and credit.</figcaption>
</figure>
```

Use `relative_url` for local paths in Markdown bodies and HTML; this preserves GitHub Pages repository prefixes. Metadata image paths are processed automatically. Multiple figures, headings, lists, links, and optional embedded media are supported in the body. Prefer local video with captions and playback controls over tracking widgets. Research pages automatically collect publications sharing any topic or explicitly listed in `publication_ids`.

## News

Create `_posts/2026-10-15-announcement.md`:

```yaml
---
title: Your announcement title
date: 2026-10-15
summary: A brief, verified summary.
tags: [publication]
# image: /assets/images/general/announcement.jpg
# image_alt: Descriptive alternative text
---

The complete announcement with links and optional images.
```

Future-dated posts remain unpublished until their date and a subsequent rebuild. Do not add a story based on private or unannounced research without permission.

## Footer logo size

Edit `_data/site.yml` and rebuild Jekyll:

```yaml
footer_logo_scale_percent: 50
```

`50` gives half of the original displayed width and height; `100` restores full size. Values from 10 to 200 are supported, with the width capped to its container on small screens. The SVG stays sharp. The rule lives in `_includes/footer-brand-style.html`, separate from footer wording and shared CSS.

## Global text and contact information

Edit `_data/site.yml` for the name, email, address, institution, homepage headline, introductory text, and mission. The headline permits `<br>` line breaks and a `<span>` accent. Alternative headings considered for the first design were “Molecular interactions. Biological decisions.” and “Understanding nuclear receptor function.” The chosen “Structure. Dynamics. Function.” connects directly to the laboratory's methods and questions.

Edit `_data/navigation.yml` for navigation, and `_data/openings.yml` for verified open positions. Example opening fields are `title`, `description`, and an optional application `url`. An empty list advertises no available position.

## Before publishing

```sh
python3 scripts/validate_content.py
bundle exec jekyll build
python3 scripts/check_site.py _site
```

Review the affected pages on desktop and mobile. Check scientific accuracy, contact details, permission to share figures/PDFs, and alternative text. Consult the separate publication and molecular guides for their workflows.


## Reading sizes

The typography section at the end of `assets/css/site.css` defines shared size tokens. `--text-body` is 23 px on desktop and 20 px at widths up to 700 px, matching the homepage mission paragraph. Secondary metadata and controls use the adjacent tokens. Research links are unnumbered; their display order still comes from each research file's `order` value.


## Link hover and keyboard focus

Text links keep the selected palette's hover color and gain a 1 px underline.
Keyboard focus uses the same underline/color cue plus the existing focus outline.
People cards and research rows underline their name or title, leaving supporting
text clear. The header wordmark and portrait/image links retain their existing styling.

Edit `assets/css/links.css` to change the underline thickness or offset, or remove
the underline rule. The file is loaded by `_layouts/default.html` after the other
stylesheets, so shared `site.css` customizations can stay in place. The footer's
GitHub source link keeps its existing permanent underline.
