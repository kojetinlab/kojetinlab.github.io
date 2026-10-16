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

## Version 5.10 — chemical discovery around the adipocyte

- Added an additional scroll-controlled pullback for the fifth topic. The cell finishes at 67% of its preceding displayed size; six distinct black-marker chemical sketches approach from different directions with staggered timing, a small positional overshoot, and brief contact rings. The final composition holds still and reverse scrolling retraces the same poses.
- Added `_data/discovery_scene.yml` for the enable switch, zoom, sketch sizes, approach distance, contact rings, desktop/mobile timing, and each drawing's position/rotation/delay. Per-compound SVG/PNG overrides support replacing the generic illustrative motifs with specific structures. The original AI-generated transparent 1536 × 1024 sprite sheet is used directly as a shared image asset; artwork provenance is documented.
- The existing controller owns the entire scroll clock and Pause motion behavior. Mol* remains suspended after the first cell pullback. The new stage uses image transforms without a continuing animation loop. Inline static compositions support reduced motion, disabled JavaScript, and WebGL failure; late/failed sketch images have explicit handling.
- Extended the actual-controller tests for both 6ONJ and 6ONI on desktop and mobile shapes. Checks passed for extra zoom, six staggered entries, exact reverse poses, pause/resume, settled contact rings, offscreen suspension, disabled settings, image loading/errors, reduced-motion startup, and WebGL fallback. Existing molecular separation, wiggle, camera switching, and first cell-transition checks also passed. These controller tests use simulated browser interfaces.
- Browser visual review in the in-app browser at 1280 × 720 and 390 × 844 confirmed the live Mol* view, intermediate/final chemical compositions, reverse scrolling, six loaded sketches, and no horizontal overflow or captured console warnings/errors. Adjusted the mobile pause control to remain inside the opaque sticky panel; its final bounds were verified. The temporary browser tab and local server were closed after review.
- Production root and repository-subpath Jekyll builds each passed 148-page internal-reference checks. Content validation passed for 83 publications, 45 members, three research pages, and seven posts. The standalone preview embeds 148 pages and 36 shared assets.
- Shared typography, header/footer source, PDB cameras, and roster settings are unchanged. `_config.yml` increments the asset cache version from 12 to 13. No user GitHub clone files, GitHub settings, or live deployments were modified.


## Version 5.11 — complete molecular wiggle and discovery refinements

- The receptor, peptide, and ligand now share the native Mol* position-mode wiggle field and clock. The covalent 6ONI ligand retains its shared rocking transform. Adapter checks passed for all three components in both PDBs, frozen shader time, suspension, appearance changes, reset, and disposal; these lifecycle checks mock the canvas and do not execute WebGL shaders.
- The discovery transition fades only the adipocyte artwork to configurable 50% opacity. The fourth-topic cell remains opaque, and reverse scrolling restores its opacity. Contact rings gently cycle with staggered phases after arrival; their 2.8-second period and enable switch are configurable. Pause holds the actual phase, reduced motion uses a still composition, and offscreen/hidden views stop drawing. Hidden Mol* stays suspended.
- Controller checks passed for both PDBs and desktop/mobile shapes: fading, persistent ring variation, paused and hidden clocks, reduced motion, disabled rings/twinkles, reverse positions, missing/late images, and fallback behavior, along with the existing separation and cell-transition checks.
- Footer logo sizing is controlled by `_data/site.yml` → `footer_logo_scale_percent`, default 50. A separate shared include keeps customized footer wording and shared CSS intact. Defined alumni destinations receive a “Now:” prefix and muted italic type at 90% of body size; blank destinations remain omitted.
- Inspected the real in-app browser at 1280 × 720 and 390 × 844. Checked the faded discovery scene, visible rings, molecular poses, alumni layout, and desktop footer. Browser checks confirmed 0.5 cell opacity, frozen ring opacities during Pause, 280 px desktop/175 px mobile logo widths, 20.7 px desktop/18 px mobile destination text, and no horizontal overflow at 390 px. No browser warnings or errors were recorded during the home-page check.
- Root and repository-subpath production builds passed the 148-page internal-reference checks. Content validation passed: 83 publications, 45 members, three research pages, and seven posts.
- A read-only updater preview against the current v5.10 clone reported no conflicts and preserved customized header/footer text, shared CSS, and member edits. The clone was not changed. Asset cache version increases from 13 to 14.


## Version 5.11.1 — link hover and focus cues

- Added `assets/css/links.css`, loaded after the other stylesheets. Text links gain a 1 px underline at a 0.18 em offset alongside the existing palette hover color. Keyboard focus uses the same cue and preserves the existing outline. People cards and research rows underline only their linked name/title; the header wordmark and portrait links keep their previous styling.
- Real-browser checks on the People page confirmed a gold underlined navigation link on hover, an underlined keyboard-focused navigation link with its outline intact, and an underlined people-card name with the role text undecorated.
- Carried forward the current local “Subsequently:” label and 75% footer-logo setting. Shared CSS and header/footer markup were not edited.
- Confirmed that the underlines disappear when links are neither hovered nor keyboard-focused. Production build and all 148 internal-reference checks passed; the updater preview reported no conflicts and preserved the current local customizations.


## Version 5.11.2 — reveal only the prepared live molecular view

- The homepage starts with `data-renderer="loading"` in its HTML. A dedicated stylesheet hides the poster, canvas layer, and molecular labels from the first paint while reserving the panel and displaying a loading message. The controller establishes the live scroll layout during loading to avoid a late layout jump.
- The adapter reports its first successful synchronous draw only after a requested camera/pose has been applied. Only that notification reveals the canvas, clears the loading status, and enables the Pause control. Setup-only draws and stale PDB callbacks cannot reveal a model prematurely.
- Native-adapter checks passed for both PDBs, including no reveal during setup draws, exactly one first-frame notification, and no reveal after a failed initial draw. Controller checks passed for deferred first-frame readiness, PDB switching, stale callbacks, cell-stage startup, fallback, and the existing molecular/cell/discovery motion behavior. These lifecycle tests use simulated browser and canvas interfaces.
- In the real in-app browser, delayed the Mol* script response by six seconds: the loading page kept the poster hidden, then the configured live 6ONJ view appeared with the poster at opacity zero and the loading message cleared. Switching to 6ONI also hid the poster during loading and completed with the selected live model. A deliberately failed Mol* script response produced the static fallback and explanatory error message. No warnings/errors occurred in the successful startup check.
- A `noscript` style restores the poster and removes the loading message when JavaScript is disabled. The no-JavaScript branch was inspected in generated HTML rather than by toggling browser settings.
- Production build, all 148 internal-reference checks, and content validation passed. Asset cache version increases from 15 to 16.
- Confirmed that the loading and ready states keep the same figure position (140.234375 px from the viewport top) and scroll position (0) in the desktop browser. The read-only updater preview found no conflicts and preserved local customizations.


## Version 5.11.3 — scientific loading illustration

- Replaced the visible loading message with a conceptual ribbon/peptide/ligand sketch, optimized as a transparent 720 × 720 WebP (approximately 98 KB). `_data/molecular_loading.yml` sets its image path and optional motion. The sketch drifts gently once over 4.5 seconds, then rests; reduced-motion CSS disables the drift and fade.
- The artwork fades out over 180 ms when the existing first-frame gate reveals Mol*. There is no minimum loading duration. Screen readers retain the loading status; the fallback error message remains visible. PDB-specific labels and the experimental-structure caption stay hidden while the conceptual sketch is displayed. No-JavaScript styles hide the sketch and restore the static PDB poster and caption.
- Real in-app browser review used a temporary server that deliberately delayed Mol* by 15 seconds. At 1280 × 720, the sketch loaded while the PDB poster remained hidden; the ready state showed the live model with the artwork hidden and its animation stopped. Figure position remained 140.234375 px in both states. No warnings or errors were captured during successful startup. At 390 × 844, the illustration fit its reserved panel with no horizontal overflow, then gave way to the live model. A deliberate Mol* script failure produced the static poster and visible fallback explanation.
- The production build and 148-page internal-reference check passed. Content validation passed for 83 publications, 45 people, three research pages, and seven posts. Existing first-frame, PDB-switching, fallback, molecular/cell/discovery controller tests and native-adapter lifecycle checks passed. Reduced-motion CSS and no-JavaScript markup were inspected in source/generated HTML; OS preferences were not changed for browser testing.
- A read-only update preview against the user's v5.11.1 clone found no conflicts and preserved customized header/footer text, shared CSS, and all edited member files. The ZIP includes the preceding v5.11.2 startup fix. Asset cache version increases to 17. No files in the user's GitHub clone were changed.


## Version 5.12.0 — persistent compact navigation

- Added `_data/navigation_settings.yml` with `persistent_menu: true`. When the header leaves the viewport, its existing Menu button becomes fixed in the upper-right corner and opens the original navigation and display controls. Home is included in the compact panel. Desktop navigation returns when the page scrolls to the top. No duplicate navigation or preference-control IDs are created.
- The header remains in normal document flow. The compact panel overlays the page and scrolls internally on shorter screens, preserving the molecular scene's scroll layout. New styles are isolated in `assets/css/navigation.css`; the existing header template and shared `site.css` are unchanged.
- In-app browser checks at 1280 × 720 and 390 × 844 confirmed the floating button, open panel, all seven page destinations, current-page highlight, keyboard Tab/Escape, outside-click closing, and restoration of desktop navigation. At the desktop scroll position, the button remained 16 px from the top and right edges. No horizontal overflow was found at mobile width.
- Palette and PDB changes worked inside the floating panel. The nested display controls remained within an internally scrollable panel; Escape closed them first, then the navigation. The actual People link navigated successfully from the scrolled homepage. Returning to the full desktop header preserved visible keyboard focus on Research.
- A local test response with `data-persistent-navigation="false"` confirmed that no persistent-navigation class or floating state was installed and the ordinary mobile button scrolled away with its header. With JavaScript disabled, the enhancement class is never installed; the original visible header links remain available.
- Production Jekyll build, 148-page internal-reference checks, content validation (83 publications, 45 people, three research pages, seven posts), and JavaScript syntax check passed. No warnings/errors were captured in the final browser check. Asset cache version increases from 17 to 18.
- The read-only updater preview against the current v5.11.3 GitHub clone found no conflicts: 13 files to copy, with customized header/footer, shared CSS, and member files preserved. No GitHub clone files were modified.


## Version 5.12.1 — reliable floating-menu scroll detection

- Replaced IntersectionObserver-only detection with passive scroll and resize listeners, coalesced through requestAnimationFrame. The controller reads the header's current geometry at most once per scheduled frame and updates classes only when layout state changes. Initial loading and pageshow still refresh the state immediately.
- Added `scripts/check_navigation.cjs`, which executes the actual controller with simulated DOM and browser events. The v5.12.0 controller fails the missing-visibility-notification regression; the revised controller passes. Additional passing cases cover fractional boundary positions, event coalescing, idle behavior, restored scroll position, resize, Home/subpath links, opening/closing, nested settings/Escape, keyboard focus, narrow layouts, and the off switch.
- The reported Chrome failure was not reproduced in a live browser: the browser connection was unavailable during this session. These checks establish the corrected event behavior, not cross-browser visual certification or a confirmed diagnosis of the user's Chrome session. Cache/version differences may also require a reload.
- Asset cache version increases from 18 to 19. OPEN-FIRST and the navigation guide explain restarting a local Jekyll server and reloading Chrome after applying the update.
- The production Jekyll build and 148-page internal-reference check passed, with no content-validation errors. The formatted navigation controller passes the regression suite.
- A read-only updater preview against the current v5.12.0 clone found no conflicts: 11 files to copy, preserving customized header/footer, shared CSS, and member files. No GitHub clone files were changed.


## Version 5.13.0 — slower story pacing and longer molecular motion

- Added `_data/scroll_story.yml` with independent desktop/mobile section heights and a transition-distance multiplier. Defaults are 100%/160% of the viewport height for ordinary/motion sections on desktop, 95%/150% on mobile, and a multiplier of 2.
- Added a Jekyll-generated `scroll-story.css` scoped to active molecular animation. The third section puts its text toward the beginning so added space extends the viewing interval. Shared `site.css` and header/footer templates remain unchanged for compatibility with local customizations.
- Cell/discovery transitions begin earlier while preserving their configured end positions. Separation finishes by the third heading rather than its section bottom. Molecular motion fades with the cell transition, without the prior additional short fade-out gate.
- Expanded the real-controller regression checks to cover a longer wiggle interval, twice the base transition distance, earlier starts, a custom multiplier of 2.5, original windows at 1, monotonic forward scrolling, and exact reversal. Both PDBs pass existing desktop/mobile, pause/resume, hidden/offscreen suspension, reduced-motion, image-failure, startup-frame, covalent-ligand, and static-fallback checks.
- Production Jekyll build and all 148-page reference checks passed; content validation reports 83 publications, 45 people, 3 research areas, 7 posts, and zero errors. Inspected compiled pacing CSS and configuration output. Cache version increases from 19 to 20.
- Browser visual review was unavailable in this session. The automated checks validate choreography and settings, not live rendering or the subjective feel of the scrolling. The standalone preview is supplied for review.
- A read-only updater preview against the current v5.12.1 clone found 17 files to copy and no conflicts, preserving customized header/footer, shared CSS, and member records. No repository files were changed.


## Version 5.13.1 — actions accompany approaching headings

- The first and second molecular stages now follow their own headings, while retaining the original pose/camera path and covalent-ligand rule. The wiggle has an independent entrance window and no longer waits on overall separation progress.
- Added `action_lead_vh` to desktop/mobile pacing, default 20 (supported 0–60). This moves all action windows earlier without shortening them. At the defaults, wiggle fades in while its heading is at 125%–100% of viewport height and is fully established as the heading enters view. Cell/discovery windows retain their doubled lengths and shift 20% of a screen earlier.
- Added coherent story-position sweeps with all five heading positions moving together. Checks assert visible peptide/ligand action during heading approach, strong wiggle before third-heading entry, full wiggle on entry, visible cell/compound transitions during their heading entry, action-lead adjustment, and exact reverse behavior. The v5.13.0 controller fails the new first-heading entry check; the revised controller passes.
- Both PDBs pass existing desktop/mobile, pause/resume, reduced-motion, hidden/offscreen suspension, covalent-ligand, image-failure, startup-frame, and fallback checks. The longer molecular viewing interval and multiplier settings still pass.
- Live browser visual review was unavailable; these are controller tests with simulated geometry, not a claim of reproducing the user's exact browser state or verifying visual perception on their screen.
- The production Jekyll build and 148-page reference check passed; content validation reported zero errors. A read-only update preview against the current v5.13.0 clone found 13 files to copy and no conflicts, preserving local customizations. Asset cache version is 21. No clone files were modified.
