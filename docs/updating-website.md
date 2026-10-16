# Updating the website

Routine changes only require Markdown, YAML, and images. Commit changes to `main`; the GitHub Actions workflow validates, builds, and publishes them. For review first, make a branch and pull request. Pull requests build and validate without publishing.

## GitHub's web editor

1. Open the repository, navigate to the file, and click the pencil icon.
2. Edit the text below the YAML metadata or the metadata fields themselves.
3. Preview Markdown where available, then commit to a branch or `main`.
4. Check the **Actions** tab. A failed content check will name the file and error.
5. For photos, open the image folder and choose **Add file → Upload files**; then reference that filename in the member or publication file.

Use spaces, not tabs, in YAML. Quote strings containing colons. Preserve the opening and closing `---`. File names should use lowercase letters, digits, and hyphens. Keep publication and person filenames stable so their URLs do not change.

## Add or update a person

Create `_members/first-last.md`:

```yaml
---
name: First Last
role: Graduate Student
category: graduate
status: current
order: 20
photo: /assets/images/people/first-last.jpg
email: first.last@vanderbilt.edu
research_interests: A short, publicly shareable description.
website: ""
orcid: ""
google_scholar: ""
linkedin: ""
github: ""
---

A biography goes here. Markdown paragraphs and links are supported.
```

These are documentation examples, not a fictional published roster. Supported category values can include `pi`, `staff-scientist`, `postdoc`, `graduate`, `undergraduate`, `research-staff`, and `visitor`. Display order is the numeric `order` field. To replace a photo, upload a new version under the same name, or update `photo`. Use a portrait crop; the site accommodates missing photos with initials.

### Photo dimensions and cropping

Photos do not need identical pixel dimensions. Both the People cards and individual profiles use a **4:5 portrait frame** with `object-fit: cover`: the image scales proportionally to fill the frame, and any excess is cropped rather than stretched. Original image files are unchanged. Landscape photos lose more from their sides; very tall photos lose more from their top and bottom. Small originals may look soft when enlarged.

For predictable framing, prepare a 4:5 portrait such as 800 × 1000 pixels. Faces should have some room around them. Missing photos display initials.

The shared crop settings live in `assets/css/site.css`:

```css
.member-card img { object-position: 50% 20%; }
.profile-photo { object-position: 50% 15%; }
```

The first percentage centers the crop horizontally; the second favors the upper part of the photo. A smaller second value favors the top, while `50% 50%` centers the crop. These rules apply to every photo in that view; there is currently no per-person crop setting. Changing them does not change the original file. For individual adjustments, crop the source photo before uploading it.

To move someone to alumni, change `status: alumni`; optionally add `years: "2023–2027"`, `current_position`, and `current_institution`. The person moves automatically, and their profile URL remains intact. Confirm current positions before adding them.

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
