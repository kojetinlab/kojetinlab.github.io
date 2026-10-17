# kojetinlab.github.io

The Kojetin Laboratory website at Vanderbilt University. We study the structural biology and molecular pharmacology of nuclear receptors.

**Website:** [kojetinlab.github.io](https://kojetinlab.github.io/)  
**Source:** [github.com/kojetinlab/kojetinlab.github.io](https://github.com/kojetinlab/kojetinlab.github.io)

## Technologies this website uses

```text
Jekyll 4.4.1
GitHub Pages and GitHub Actions
HTML, CSS, and JavaScript
Mol* for interactive molecular structures
Markdown and YAML for editable content and settings
```

The site builds into static files. People, publications, research, and news are editable collections; no database or CMS subscription is required.

## Publication update (v5.16.0)

The collection now contains 82 published papers from PubMed and 2 unpublished bioRxiv preprints, with source abstracts on all individual publication pages. Preprints appear first; published papers follow, newest first. Metadata was refreshed October 17, 2026.

To generate a new publication file from a PMID, run `python3 scripts/add_publication.py --pmid ACTUAL_PMID`. To refresh citations and abstracts while keeping your figures, topics, summaries, and page text, preview with `python3 scripts/refresh_publications.py`, then add `--apply`. Review, commit, and push the resulting changes in GitHub Desktop. See [Publication management](docs/publication-management.md) for bioRxiv imports and all settings.

## First-time GitHub setup

Follow [Publishing to GitHub Pages](docs/deployment.md) for a beginner walkthrough using GitHub Desktop on a Mac. It explains how to back up the old site, replace its files in the existing repository, and enable automatic rebuilding.

Put this folder's **contents** at the repository root, including `.github/workflows/pages.yml`. In **Settings → Pages**, select **GitHub Actions** as the publishing source. The included workflow builds and publishes the repository's default branch, whether it is called `main` or `master`. Pull requests are checked without publishing.

This source package is ready to upload; preparing it does not change the current public website.

## Preview changes on your computer

Install **Ruby 3.4.8** (the version in `.ruby-version`) and Bundler first. See [Local development on a Mac](docs/local-development.md) for installation steps. Use a separate Ruby installation; the older Ruby included with macOS is not suitable for this project.

Open Terminal in this repository's folder, then run:

```sh
gem install bundler --version 2.6.9
bundle install
bundle exec jekyll serve --baseurl "" --livereload
```

Open [http://127.0.0.1:4000/](http://127.0.0.1:4000/) and keep Terminal running. Save a source file to rebuild and refresh the local website. Stop with **Control-C**. After editing `_config.yml`, stop and restart Jekyll.

You only need to install dependencies once, or when they change. On later visits:

```sh
bundle exec jekyll serve --baseurl "" --livereload
```

The molecular viewer needs the local HTTP server. Opening a source HTML file directly is not a working local development preview. The downloadable standalone HTML preview is a separate snapshot and does not update when source files change.

## Explore the settings

Open the down arrow after **Contact** to try palettes, PDB structures, illustrative cartoons, and SSGI lighting. Mol* is the active molecular renderer. The homepage starts with the receptor alone, adds the ligand, recruits the coregulator peptide, then shows the bound complex wiggling before the adipocyte transition. For covalent 6ONI, the ligand appears directly in its bound pose. See [the molecular guide](docs/molecular-animation.md#homepage-assembly-sequence) for timing and configuration.

| What to change | File or folder |
| --- | --- |
| Loading mode (typewriter/blink/static), speed, and optional illustration | `_data/molecular_loading.yml` |
| Default palette, PDB, illustrative cartoon, SSGI, and visible controls | `_data/display.yml` |
| Page and molecular colors | `_data/palettes.yml` |
| Each PDB's camera, chain selections, label names/roles, and label offsets | `_data/structures.yml` |
| Homepage section spacing, longer motion viewing, and transition pace | `_data/scroll_story.yml` |
| Mobile rendering resolution, scroll movement, molecular wiggle, and rocking | `_data/hero_animation.yml` |
| Zoom from the protein to an illustrated adipocyte | `_data/cell_scene.yml` |
| Final cell pullback and incoming chemical sketches | `_data/discovery_scene.yml` |
| Adipocyte illustration | `assets/images/science/adipocyte-cutaway.png` |
| Lab text, footer logo size (`footer_logo_scale_percent`), links, and image paths | `_data/site.yml` |
| Navigation | `_data/navigation.yml` |
| People and alumni | `_members/` |
| People sorting, alumni layout, and headshots | `_data/people.yml` |
| Publications | `_publications/` |
| Research areas | `_research/` |
| News | `_posts/` |
| Open positions | `_data/openings.yml` |
| Homepage layout and five scroll-story concepts | `_layouts/home.html` |
| Link hover/focus underlines | `assets/css/links.css` |
| Shared header, footer, and menu markup | `_includes/` |
| Typography, spacing, and layout | `assets/css/site.css` |

For example, the defaults in `_data/display.yml` include:

```yaml
site_palette: vandy
molecular_structure: 6onj
molstar_illustrative: true
molstar_ssgi: true
remember_choices: true
```

Palette keys are `vandy`, `default`, and `colorblind`; prepared PDB keys are `6onj` and `6oni`. Each structure has an independent camera. Adding another PDB requires preparing its molecular assets as described in the molecular guide.

Saved visitor choices override defaults. Click **Site defaults** in the arrow menu after changing defaults, or temporarily set `remember_choices: false` while experimenting. Changing a dropdown affects that browser; changing a YAML file and publishing it changes the site's defaults.

### People display settings

In `_data/people.yml`, choose `sort_by: last_name` (default), `seniority`, or `joined`. Douglas appears first in every mode. Set `show_alumni_photos: true` to enable alumni portraits on the list and profiles; the default is `false`. The alumni directory defaults to a compact layout with four desktop columns; set `alumni_columns` to 3–5, or `alumni_compact: false` to restore the larger layout. Member files hold `last_name`, `seniority`, and `joined_year`. See [the people guide](docs/updating-website.md#people-and-alumni-settings) for ranks, examples, and roster notes.

## Publish an update

Edit → preview locally → review changes in GitHub Desktop → **Commit** → **Push origin**.

When you push to the default branch, GitHub Actions validates the content, runs the publication-import tests, builds Jekyll, checks internal links, and publishes the result. Watch **Actions → Build and publish GitHub Pages**. An unsuccessful build does not replace the last successful deployment. GitHub handles the build tools on its server; you do not need local Ruby just to publish through GitHub.

For a new source download, use the reusable updater from inside your GitHub clone:

```sh
bash update-site.sh "/path/to/new-download/kojetinlab-website"
bash update-site.sh "/path/to/new-download/kojetinlab-website" --apply
```

The first command previews; the second copies new/changed release files while preserving local-only edits and leaving other files in place. Conflicting edits stop the update before copying. Review, commit, and push afterward. For first installation from v5.7/v5.8, use the downloaded script's full path; see [Importing release updates](docs/release-updates.md).

## Optional developer checks

Python 3.10 or later is needed for these checks, but not for an ordinary local Jekyll preview:

```sh
python3 -m pip install -r requirements.txt
python3 scripts/validate_content.py
python3 -m unittest discover -s tests -v
JEKYLL_ENV=production bundle exec jekyll build --baseurl ""
python3 scripts/check_site.py _site
```

Node.js is optional for formatting. The required Mol* browser assets are included in `assets/js/vendor/`. Earlier Three.js/PyMOL files are retained as reference and excluded from the deployed website; no PyMOL rendering step is needed.

## Documentation

- [GitHub setup and deployment](docs/deployment.md)
- [Local development on a Mac](docs/local-development.md)
- [Importing release updates with rsync](docs/release-updates.md)
- [Palettes, Mol* settings, and editable HTML](docs/display-settings.md)
- [Molecular structures, cameras, and animation](docs/molecular-animation.md)
- [Updating people, text, and images](docs/updating-website.md)
- [Publication management](docs/publication-management.md)
- [Content migration](docs/content-migration.md) and [verification record](docs/verification.md)

## License

Original implementation code is available under the [MIT License](LICENSE). Laboratory text, photographs, Vanderbilt branding, publication figures, and scientific data retain their respective rights. The code license does not relicense those materials. See [Third-party notices](THIRD-PARTY-NOTICES.md).
