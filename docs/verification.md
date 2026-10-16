# Verification and launch status

Recorded 15 October 2026. This is a completed local implementation, not a claim that the new website has been deployed or visually approved.

## Completed

| Check | Result |
|---|---|
| Production Jekyll build | Passed with Jekyll 4.4.1 and Ruby 3.4.8. |
| Site-root and repository-subpath builds | Both passed; 126 HTML pages each. |
| Internal URLs, assets, fragment targets, one H1 per page | No errors in either build. |
| Content schema and duplicate/reference checks | 83 publications, 23 people, 3 research areas, 7 posts; no errors. |
| Publication importer | Four tests passed: PubMed/Crossref agreement on a real paper, BibTeX author/identifier mapping, duplicate preservation, and incomplete-input rejection without output. |
| Molecular asset regeneration | Passed offline from retained source files. 258 receptor residues, 14 peptide residues, 25 ligand atoms, 27 dictionary bonds. |
| Molecular identity and connectivity | Biological assembly, chains, peptide sequence, experimental coordinates, residue gaps, H12 region, and ligand connectivity documented and checked. |
| Static molecular poster | Rendered and visually inspected. |
| Publication figures | Two original eLife figures inspected, with CC BY 4.0 attribution retained. |
| Preview package | Self-contained HTML embeds all 126 pages, images, scripts, and molecular data; no local server required to open the packaged review copy. |

The Linux platform is included in `Gemfile.lock` for the GitHub Actions runner. Local build validation ran on macOS; an actual Actions run has not occurred.

## Browser review update — 15 October 2026

The self-contained preview subsequently opened successfully in Safari. The homepage molecular rendering and Research page were visually inspected. After typography revisions, the homepage and Research page were checked again: regular copy uses 23 px on desktop and 20 px on mobile; navigation and supporting text were enlarged; decorative research numbering was removed. The revised production build and internal-reference checks passed for all 126 pages. This is desktop visual verification, not a completed animation, responsive-layout, accessibility, or performance audit.

## Remaining verification and deployment

The environment denied binding a local HTTP preview server. Its browser tool also explicitly disallowed opening local `file:` URLs. A later Safari check of the self-contained preview succeeded as described above. Full scroll-animation interaction checks, responsive layout inspection, automated accessibility auditing, and browser performance measurements remain incomplete. The source includes mobile, reduced-motion, JavaScript-disabled, missing-data, and WebGL-failure behavior; those paths still need a real browser check.

There was no callable authenticated GitHub connection or working authenticated browser session for creating the preview repository. No remote repository, commit, successful Actions run, or GitHub Pages URL was created. The workflow and deployment instructions are included for the next step.

No existing website files, domain settings, DNS records, or live deployment were changed. There is no `CNAME` file in this project.

## Browser review before launch

1. At desktop and narrow mobile widths, check navigation, readable type, full-width figures, page spacing, and overflow.
2. Scroll the home story down and back up. Confirm the peptide separates first, the ligand second, the assembly restores, labels stay readable, and pause/resume holds the intended state.
3. Toggle reduced motion before and after loading. Disable JavaScript and WebGL separately; verify that the static structure and all scientific text remain accessible.
4. Exercise publication text/year/topic/featured filters, reset, and no-results behavior. Confirm keyboard navigation, visible focus, mobile menu state, and skip links.
5. Check representative publication resources, portraits, current roster, alumni positions, and the preferred visitor/mailing address. See `content-migration.md` for source limitations.
6. Deploy to the separate GitHub Pages preview, inspect the successful Actions run and exact preview URL, then obtain explicit approval before any existing-site or domain cutover.

## Review and rebuild files

Open the supplied `Kojetin-Lab-Preview.html` in a normal browser to review the packaged copy. It is a convenience viewer; the production implementation is ordinary Jekyll-generated pages.

To regenerate it from a site-root build:

```sh
bundle exec jekyll build --baseurl ''
python3 scripts/make_offline_preview.py _site ../Kojetin-Lab-Preview.html
```

Content-editing steps are in `updating-website.md`. Deployment and future domain cutover are in `deployment.md`.


## Download revision — 15 October 2026

The revised archive includes `Kojetin-Lab-Preview-Revised.html` alongside the Jekyll source. Its browser title identifies the revised typography. Both research listings and molecular-story labels omit decorative section numbers. The compiled preview payload was checked directly for the 23 px / 20 px body scale and absence of numbered labels.

## Version 3 — palettes and renderer options (2026-10-16)

- Formatted all authored HTML/Liquid templates and pages, CSS, and authored JavaScript. Retained 23 px desktop / 20 px mobile body text and unnumbered research sections.
- Content validation: 83 publications, 23 members, 3 research areas, 7 posts; zero content errors.
- Root and `/kojetinlab-website` subpath Jekyll builds: 126 HTML pages each; zero broken internal references or structural errors.
- Browser checked Mol* 5.13.1, Three.js, and PyMOL frames; all three loaded successfully in the self-contained HTML preview.
- Visually checked original, Vanderbilt, and color-vision-friendly palettes. Confirmed palette persistence across offline research/home navigation and reset to site defaults.
- Checked forward/reverse scroll, actual peptide/ligand separation, and pause/resume. Paused progress remained fixed during a scroll; resuming and returning to the top restored progress zero.
- Checked a 390 × 844 mobile viewport: no horizontal overflow, 20 px body text, usable dropdowns, sticky molecular panel and visible pause control. Also corrected caption/control fit in a short desktop viewport.
- Verified every frame named in the manifest exists: 81 transparent 640 × 640 WebP images for each of three palettes (243 total). First and final frames retain alpha transparency.
- Opened the actual `Kojetin-Lab-Preview-v3.html` file directly in Safari and confirmed Mol* rendered from the embedded assets without an HTTP server.
- Browser testing is representative, not a claim of full cross-browser accessibility certification. Reduced-motion and WebGL-error branches are implemented; OS preference switching and forced context-loss were not exercised in the browser during this pass.

## Version 4 — navigation and structure presets

- Display options now sits after Contact; desktop dropdown, mobile inline panel, outside-click closing, and Escape handling are implemented.
- Vanderbilt is the default, the former Original option is labeled Teal & slate, and the full wordmark is larger and bold.
- 6ONJ and 6ONI were prepared from deposited identity assemblies and CCD connectivity; checked atom counts and rigid-distance preservation after orientation.
- Browser-checked Mol* and Three.js for 6ONI, including a temporary `[20, -35, 10]` orientation fixture. Both adapters showed the same pose. The shipped preset angles remain `[0, 0, 0]` for independent editing.
- Checked the header at desktop size, 1000px tablet width, and 390px mobile width; no horizontal overflow at the tested sizes.
- Checked the final standalone preview in the browser: Mol* default; 6ONI PyMOL frames; color-vision-friendly palette switching; scroll progress 0.7917 with ligand separation remaining zero for the covalent ligand.
- Verified all 486 PyMOL WebP frames exist and are 640×640 RGBA images.
- Root and repository-subpath builds each passed the 126-page internal-reference check; content validation passed for all 83 publications, 23 members, three research pages, and seven posts.
- The standalone preview embeds all 126 pages and 516 shared assets. Screenshots are review evidence, not source assets.

## Version 5 — copied camera, Mol* appearance, and extended story

- Applied the supplied 6ONJ FoV-normalized position, target, and up vectors, with the screenshot's radius of 36.32 Å. Perspective projection at 45° is inferred from its raw/normalized position ratio. The typed position takes priority over the slightly different position in the screenshot.
- Checked the coordinate conversion independently against the original PDB over 2,210 selected atoms; maximum difference was 0.000861 Å, consistent with rounded prepared coordinates. Browser and Python camera calculations match for both presets.
- Checked atom bounds at all 81 scroll poses. The camera retreats early to retain the separated peptide within the view; the maximum normalized atom extent was 0.990 for the receptor, 0.875 for the peptide, and 0.679 for the ligand (square-viewport edge = 1).
- Browser-checked the new pose in Mol*, Three.js, and regenerated PyMOL frames. Verified Mol* illustrative/SSGI both enabled, both disabled, and SSGI enabled independently of illustrative style. No molecular-renderer startup or shader errors were observed.
- Verified the arrow-only desktop menu, uppercase bold wordmark, five narrative concepts, and mobile menu at 390 × 844 with no horizontal overflow. Restored the normal viewport after testing.
- Regenerated all 243 6ONJ PyMOL images for the new perspective camera and scroll zoom. All 486 shipped images across both presets are 640 × 640 RGBA; both manifests match the current view settings.
- Checked the final standalone HTML in the in-app browser: Mol* default rendering, 6ONJ PyMOL scroll frames, 6ONI switching, and palette switching. It embeds 126 pages and 517 shared assets. A browser-injected MutationObserver error occurred in the iframe test environment; the tested molecular views continued rendering normally.
- Root and `/kojetinlab-website` subpath builds passed all 126-page internal-reference checks. Content validation passed with 83 publications, 23 members, three research pages, and seven posts.
- OPEN-FIRST-v5.txt includes live Jekyll rebuild/reload commands, source-editing paths, camera instructions, and the distinction between included WebP sequences and locally generated PNG intermediates. Jekyll 4.4.1's CLI confirms the documented LiveReload option.

This pass does not constitute a full cross-browser or accessibility audit. Unsupported-SSGI and reduced-motion behavior are implemented; device capability failure and OS preference switching were not forced in this pass.

## Version 5.1 — footer contact navigation

- Changed the shared Get in touch footer link from an email action to the internal Contact page, using Jekyll relative_url.
- Production build and 126-page internal-reference check passed. Checked every rendered Get in touch link for /contact/ without a new-tab target.
- Regenerated the standalone preview; its existing internal-navigation handler keeps the Contact route inside the preview. Native Safari interaction was not repeated for this markup-only change.

## Version 5.2 — Contact photograph and Vanderbilt footer

- Inspected the supplied 817 × 529 building JPEG and 2047 × 321 transparent logo PNG. Both website assets are byte-identical to the supplied originals.
- Added the complete photograph beside the contact details, with a single-column layout below 900 px. The footer now has a dark neutral background and the supplied Vanderbilt School of Medicine Basic Sciences logo on every page.
- Image alt text, intrinsic dimensions, page placement, and the internal Contact link were checked in all 126 generated pages. The official Basic Sciences destination was opened and verified.
- Root and repository-subpath production builds passed their 126-page internal-reference checks; content validation reported no errors.
- Updated the standalone preview to embed both images. Browser visual review of this layout change was not performed in this pass; earlier v5 browser checks remain recorded above.

## Version 5.3 — light footer and black-text SVG

- Inspected the supplied black-text logo PNG (2048 × 321, transparent) and SVG (viewBox 575.34 × 90). The SVG contains vector paths and gradients, with no scripts or external image references. Both packaged assets retain their supplied bytes.
- Switched the shared footer to the SVG and restored the selected palette's light background, text, border, hover, and focus colors. The matching black-text PNG remains an optional alternative.
- Root and repository-subpath production builds passed the 126-page internal-reference checks. Checked the SVG path, accessible description, and internal Contact footer link on every page in both builds. Content validation passed for all 83 publications, 23 members, three research pages, and seven posts.
- The standalone preview embeds all 126 pages and 520 shared assets, including both new logo formats.
- Documented the existing 4:5 photo frame, proportional scaling, cropping, upper-biased alignment, and resolution considerations in `docs/updating-website.md` and OPEN FIRST. Member photo behavior is unchanged.
- Browser visual review was not performed in this pass; the build and markup checks above do not substitute for visual review.

## Version 5.4 — illustrative receptor rocking

- Added configurable receptor-only rocking during “Beyond a single structure,” after separation finishes. The effect fades back to rest as Functional regulation arrives. Mol*, Three.js, and PyMOL use the same angle and timing; covalent 6ONI ligand motion stays coupled to the receptor.
- Ran `node scripts/check_molecular_motion.cjs`: checked the actual controller's section timing, pause/resume, reverse scrolling, hidden/offscreen suspension, reduced-motion preference, disabled configuration, PyMOL layer/palette switching, and continued zero ligand separation for 6ONI. These checks use simulated DOM and renderer interfaces, not a browser.
- Exercised the actual Mol* and Three.js adapter transforms with their matrix libraries and both coordinate sets at zero and ±2° rocking. Their transformed receptor, peptide, and ligand coordinates agreed within 0.000778 Å, consistent with prepared-PDB coordinate rounding. This does not test WebGL shader execution.
- Generated and inspected receptor-only endpoint renders. Packaged 12 transparent 640 × 640 WebP layers across two structures and three palettes. The separated receptor/partner layers have no overlapping opaque pixels at rest. The existing 486 numbered PyMOL frames and their 81-frame counts are retained.
- Root and repository-subpath builds passed all 126-page internal-reference checks; content validation passed for 83 publications, 23 members, three research pages, and seven posts. The updated standalone preview embeds 126 pages and 532 assets.
- Headless browser startup was unavailable in this environment. No new browser visual or live-WebGL performance review is claimed. The supplied preview is ready for interactive review; the checks above cover controller behavior, transform agreement, static builds, and ray-traced assets.

## Version 5.5 — Mol* only and 6ONI camera

- Removed the renderer selector and alternate-renderer loading/fallback paths. Kept the PDB selector, color palettes, and independent illustrative/SSGI switches. Reduced motion now holds Mol* at its initial pose; WebGL failure shows an ordinary still poster.
- Verified that saved Three.js and PyMOL preferences resolve to Mol* while retaining saved PDB, palette, and appearance values. Updated controller checks passed for structure switching, separate camera restoration, covalent-ligand behavior, motion/pause/reverse scrolling, visibility, reduced motion, and static failure handling. No alternate renderer or frame-sequence requests were observed in those mocked-controller checks.
- Transcribed the 6ONI screenshot's raw Position `[-81.94, 23.19, -12.08]`, Target `[2.61, 11.46, 11.65]`, Up `[0.26, 0.83, -0.5]`, and Radius `40.17`. A 45° perspective field of view is inferred from raw and normalized camera distances. Computed distance matches 88.6 Å within 0.01 Å; the converted normalized position matches the screenshot within 0.01 Å per coordinate.
- Confirmed the entire 6ONJ preset is unchanged from v5.4. Projected 6ONI atom centers across 81 scroll poses: maximum horizontal and vertical extents were 0.9532 and 0.9658 of the square viewport half-width/height. This checks coordinate framing, not a full cartoon-geometry or browser visual audit.
- Updated the three 6ONI still posters to its new initial camera and retained the matching 6ONJ posters. Excluded legacy Three.js bundles and PyMOL sequences from deployed builds and the standalone preview; retained their source/reference files.
- Root and repository-subpath builds each passed 126-page internal-reference checks. Content validation passed for 83 publications, 23 members, three research pages, and seven posts. Checked that the rendered homepage retains PDB/appearance controls and contains no renderer picker.
- No new browser visual review was performed in this pass. Updated OPEN FIRST and molecular/display guides document the Mol*-only workflow and independent cameras.

## Version 5.6 — GitHub setup, README, and source link

- Added the requested open-source sentence and repository link to the shared footer. Verified the exact text, repository URL, and existing Contact link on all 126 built pages and the repository link in all 126 standalone-preview pages.
- Reworked README.md with the repository title, actual technologies, Bundler/Jekyll commands, settings map, publishing steps, and licensing scope. Added a beginner GitHub Desktop replacement guide and a Mac local-development guide; all their local Markdown links resolve.
- Set the site's canonical origin to https://kojetinlab.github.io with an empty baseurl. Updated the Pages workflow to publish the repository's default branch, allowing either main or master, and to check pull requests without deploying them. Build and deploy have separate Pages read/write permissions. Workflow YAML parses locally; GitHub-hosted execution has not been performed.
- Fixed the Git ignore rule so assets/js/vendor/ is included while root vendor/, node_modules/, preview/, and generated _site/ remain excluded. Verified these rules using Git in a temporary repository.
- Content validation passed for 83 publications, 23 members, three research pages, and seven posts. All four existing publication-import tests passed using the installed BibTeX dependency. A production root-path Jekyll build passed the 126-page internal-reference check.
- The updated standalone preview contains 126 pages and 32 shared assets, including Mol*. No new browser visual review was performed. No repository files, settings, custom domains, or live deployments were changed on GitHub.

## Version 5.7 — noticeable internal wiggle

- Enabled Mol* 5.13.1's native position-mode procedural wiggle during the third story section. Default shader amplitude is 2.0 Å, speed 3.5, and spatial frequency 0.12. Increased the separate rocking scale from 2.0° to 3.5° and shortened its period from 4.5 to 3.2 seconds. This is an illustrative deformation of displayed geometry, not an MD trajectory or experimentally inferred atomic motion.
- The receptor receives the wiggle; the separated peptide and noncovalent ligand do not. The 6ONI covalent ligand shares the receptor's noise field and clock. Both stored camera presets and molecular coordinate files are unchanged.
- The controller now passes one clock to Mol*'s public canvas tick API. The renderer stops Mol*'s independent animation loop, limits draws to 30 fps, suspends offscreen, and freezes the flexed pose when paused. Rendering errors go through the existing static-poster fallback. Stationary updates have a finite refinement tail instead of an endless draw loop.
- Updated `check_molecular_motion.cjs` to read the actual built Jekyll configuration rather than archived PyMOL settings. Controller checks passed for wiggle amplitude/timing, pause, reverse scrolling, reduced motion, disabled animation, offscreen/hidden suspension, camera switching, and fallback behavior.
- Added `check_molstar_wiggle.cjs`: executes the real adapter and the bundled Mol* math/loci with a mocked canvas/plugin lifecycle. Both PDBs passed parameter, component-selection, frozen-clock, suspension, appearance-change, rest-pose, draw-error, and disposal checks. These tests do not execute WebGL shaders.
- Production Jekyll build and 126-page link checks passed. The updated preview embeds 126 pages and 32 assets. No browser visual or live WebGL performance review was available; use the preview to assess the appearance and motion strength.


## Version 5.8 — molecular-to-cellular pullback

- Added an original transparent adipocyte cutaway (1254 × 1254 RGBA PNG) and a scroll-controlled transition during the move from the third topic to the fourth. The live molecular image shrinks toward the peripheral nucleus while the cell artwork pulls back; the completed cell remains through the fifth topic. HTML labels and caption distinguish cellular context from the PDB view.
- Added `_data/cell_scene.yml` for the enable switch, image description/path, nucleus anchor, initial zoom, and separate desktop/mobile timing. Documented replacement art and the exact update files in OPEN FIRST. Included artwork provenance and anatomy-reference links in the molecular guide.
- Extended the actual-controller checks for both PDBs and desktop/mobile viewport shapes: initial, halfway, completed and held states; reverse scroll; pause/resume; hidden-Mol* suspension; reduced motion; WebGL fallback; disabled transition; and late/failed image loading. Existing wiggle/controller and native-adapter lifecycle checks also passed. These execute with simulated DOM/WebGL interfaces, not a browser.
- Confirmed byte-for-byte preservation of both camera presets, both scene-coordinate files, the Mol* adapter, and the molecular-motion settings relative to v5.7.
- Root and repository-subpath builds passed all 126-page internal-reference checks. Both cell images use the correct baseurl, and the HTML contains the still fallback without requiring JavaScript. Content validation passed for 83 publications, 23 members, three research pages, and seven posts.
- The standalone preview embeds 126 pages and 33 assets, including the new cell PNG. The generated artwork was inspected; no browser visual or live-WebGL performance review was available in this pass. Review the zoom appearance in the supplied interactive preview.
- No files or settings were changed on GitHub, and no live deployment was performed.


## Version 5.8.1 — reusable release updater

- Added root `update-site.sh`, a Python 3.9+ helper, `docs/release-updates.md`, and the exact v5.7 hash baseline. Preview is the default; `--apply` copies only new/changed release files using rsync. The tracked `.site-release.json` records the incoming release for later comparisons.
- File-level comparison preserves committed and uncommitted local-only edits and local-only deletions. Overlapping changes stop the entire update before copying. Explicit `--keep-local` supports manually resolved files. Files absent from the new release are retained; the updater never requests deletion, commits, pushes, or deploys.
- Five tests using real Git repositories and the installed rsync passed: dry-run no-op, changed-file transfer, unchanged-file timestamp preservation, repeat imports, customization preservation, conflict blocking/resolution, new-file collision, omitted-file retention, source-manifest checks, and symlink refusal. The complete existing Python suite passed all nine tests.
- A full integration run extracted the actual v5.7 ZIP into a disposable Git clone, made committed and uncommitted settings changes, then imported this release. Both customizations survived; the cell asset and updater were installed; a repeat using the installed script reported zero file copies. No user GitHub clone was edited.
- Production Jekyll build passed all 126-page reference checks. Confirmed the root updater and release manifest are excluded from the deployed site. Documentation links resolve. The v5.8 website visuals and standalone preview are retained.


## Version 5.8.2 — clearer updater instructions

- Successful previews now print the requested Up Arrow / append `--apply` / Return instructions and explain that this workflow applies to every update. Successful copies print the separate GitHub Desktop commit and Push origin steps.
- Exercised both output paths in a disposable Git repository using the existing transfer fixture. Preview and apply completed successfully. The file-selection and transfer logic is unchanged; no site visuals or deployment settings changed.

## Version 5.9 — people sorting, alumni portraits, and updated roster

- Reconciled the supplied `people(2).docx` into 45 unique profiles: 12 current members (including the existing PI profile) and 33 alumni. Preserved existing profile URLs and photos, combined multiple appointments, added lab histories and named awards, and updated provided career destinations. The Word file itself is not published. Editorial ambiguities and older retained destinations are documented in `docs/updating-website.md`.
- Added `_data/people.yml`: `sort_by` accepts `last_name`, `seniority`, or `joined`; the default is `last_name`. The PI stays first in all modes. `last_name` handles compound surnames, `seniority` is an editable numeric role rank, and `joined_year` is the earliest documented joining year across institutions and appointments. Unknown years appear last, with alphabetical tie-breaking.
- `show_alumni_photos` defaults to `false` and controls both alumni cards and profiles. Enabled portraits use 4:5 crops or initials when missing; disabled profiles use a single content column. Added a separate `assets/css/people.css`, preserving the prior release's shared CSS, header markup, and `_config.yml` to accommodate local edits.
- The real Jekyll/Liquid render check (`bundle exec ruby scripts/check_people.rb`) passed all six combinations of the three sorts and two photo settings. It checks complete ordered lists, PI pinning, missing joining years, alumni portraits/placeholders, all 45 profile layouts, updated career/award content, and repository-prefix stylesheet/image paths. It uses an in-memory missing-date fixture and does not edit member files.
- Production Jekyll build passed all 148-page internal-reference and structural checks. Content validation passed for 83 publications, 45 members, three research pages, and seven posts. Documentation file links resolve. The standalone preview embeds 148 pages and 34 shared assets.
- No new browser visual review was performed. Molecular code, camera presets, shared typography, and cell-transition behavior are unchanged. No files in the user's GitHub clone or on GitHub were modified.
