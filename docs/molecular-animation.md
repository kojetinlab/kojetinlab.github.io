# Molecular structures, orientation, and animation

## Choose the starting structure

Edit `_data/display.yml` and rebuild Jekyll:

```yaml
site_palette: vandy
molecular_structure: 6onj   # 6onj | 6oni
```

The site uses Mol* exclusively. Visitors can change the palette and PDB under the **down-arrow button** after **Contact** (its accessible name is “Display options”). Set `show_structure_picker: false` to hide the PDB selector. Saved visitor choices override defaults; **Site defaults** restores your configuration. Set `remember_choices: false` to always start from your configured defaults.

| Preset | Complex | Author chains | Resolution |
|---|---|---|---|
| `6onj` | PPARγ, rosiglitazone (BRL), TRAP220/MED1 coactivator peptide | A + C | 2.30 Å |
| `6oni` | PPARγ, T0070907 (EEY), N-CoR corepressor peptide | B + D | 1.80 Å |

Both structures come from Shang et al., *Nature Communications* (2020), DOI [10.1038/s41467-020-14750-x](https://doi.org/10.1038/s41467-020-14750-x). Sources: [RCSB 6ONJ](https://www.rcsb.org/structure/6ONJ), [RCSB 6ONI](https://www.rcsb.org/structure/6ONI). The deposited coordinates and ligand dictionaries are retained in `molecular-source/`. See `molecular-science.md` for chain, bond, and missing-residue details.

6ONI's ligand is covalently attached to Cys285. Its preset therefore disables ligand separation. The receptor cartoon and ligand sticks do not explicitly draw the cross-component covalent bond. Peptide separation remains schematic. Neither animation is a dissociation simulation or a change in receptor conformation.

## Molecular labels

The 6ONJ display uses **MED1**, **Rosiglitazone / agonist**, and **PPARγ**. The 6ONI display uses **N-CoR**, **T0070907 / inverse agonist**, and **PPARγ**. MED1 is also known as TRAP220; this is a display-name change, not a different peptide selection or coordinate file.

Edit `peptide`, `peptide_role`, `ligand`, and `ligand_role` in each PDB entry in `_data/structures.yml`. The initial page and PDB switching both use these values.

Inside 6ONJ's existing `view:` block, `label_layout` gives each label separate positions before and after its component moves:

```yaml
    label_layout:
      ligand:
        initial: {offset: [6, -6], anchor: top-left}
        separated: {offset: [-2, -7], anchor: bottom-right}
      peptide:
        initial: {offset: [6, -2], anchor: bottom-left}
        separated: {offset: [2, 3], anchor: top-left}
```

`offset` is `[horizontal, vertical]` in percentages of panel width/height. Negative values move left/up; positive values move right/down. `anchor` selects the corner of the label placed at that offset from its molecular component. For example, `bottom-right` places the label's lower-right corner there, making the text extend to the left and upward. Supported corners are `top-left`, `top-right`, `bottom-left`, and `bottom-right`.

Offsets and anchors blend smoothly with **that component's own separation**. Rosiglitazone starts farther down/right than in v5.13.3, while MED1 starts up/right, leaving the labels apart and clearing the ligand/peptide. As rosiglitazone moves out, its caption shifts farther left with the lower-right anchor. MED1's final caption sits beside the separated peptide, clear of the floating menu in the tested phone layouts. Reverse scrolling restores the starting positions; pause holds the current positions.

The viewer keeps each complete moving label at least 12 pixels inside the panel, so an anchor may shift slightly near an edge. 6ONI retains its single fixed `label_offsets.ligand: [-38, -8]` setting; the older `label_offsets` form remains supported when no `label_layout` is supplied. Save, let Jekyll rebuild, and refresh. Static fallback views use `assets/css/molecular-labels.css`.

## Keep the figure caption visible

The animated desktop figure fits the available window height, including the space used by the full header before it scrolls away. The caption reserves enough height for the longest configured molecular, cell, or discovery note at the current window width. The visible wording still changes with the story, but the drawing area does not resize when the extra motion sentence appears. The pause/resume button keeps its natural height. The molecular image shrinks when the window gets shorter, retaining the short-window fix without a size jump at wiggle onset.

The layout lives in `assets/css/molecular-layout.css`. The controller in `assets/js/molecular-viewer.js` measures the stage's position during scroll and resize, leaving 12 px above the figure and 24 px below it. If you change these margins, update the matching insets in `fitFigure()` too. The caption reservation is generated in `_layouts/home.html` from your settings, so changes to PDB notes or cell/discovery notes are included on rebuild. Invisible measurement copies are excluded from screen readers and are not shown in static or mobile layouts. No manual per-window setting is needed. Text size, PDB orientations, and animation timing remain unchanged.

Phones keep their existing compact caption; the pause button now occupies its own space inside the sticky figure. Static and reduced-motion views use the ordinary document flow.

## Sharper molecular rendering on mobile

Version 5.13.2 fixes a double reduction in rendering resolution: Mol*'s automatic mobile mode and the site's pixel-density cap were both scaling the canvas down. The viewer now uses Mol*'s native resolution mode with the cap applied once. Existing antialiasing and high-quality molecular geometry are retained.

In `_data/hero_animation.yml`, inside the existing `presentation:` block:

```yaml
  max_pixel_ratio: 1.7
  mobile_max_pixel_ratio: 3.0
```

`mobile_max_pixel_ratio` applies to viewport widths of 700 CSS pixels or less. `max_pixel_ratio` applies to wider layouts, including a phone in a sufficiently wide landscape orientation. Values are drawing pixels per CSS pixel, limited to the device's own pixel density. A 3× phone uses up to three drawing pixels in each direction; a 2× device uses two. Supported caps are 1–3; missing or invalid settings use the defaults above.

Use **3.0** for the sharpest supported mobile rendering. Try **2.0** if animation feels sluggish on an older phone; this still fixes the unintended extra reduction. Lower values reduce GPU work. These settings affect the live protein, peptide, and ligand canvas; they do not change text size, the adipocyte artwork, camera presets, or scroll timing. The 30-fps drawing limit and pause/offscreen behavior remain in place.

Save and let Jekyll rebuild, then refresh. After importing this release, restart Jekyll once because `_config.yml` changes the asset cache version. On the public site, commit/push and wait for the Pages build before refreshing on the phone.

A browser test at a 390 × 844 viewport with a simulated mobile user agent and 3× pixel density reproduced a 198 × 186 canvas in a 350 × 329 CSS-pixel area. The corrected version rendered 1050 × 987 in that same area. Both PDBs rendered successfully, and resizing to the desktop layout restored the 1.7 cap. This checks actual WebGL rendering in the test browser; sustained frame rate and battery use on physical phones have not been measured.

## Set a different orientation for each PDB

Open `_data/structures.yml`. Each preset has an independent `view` section. The 6ONJ preset now uses your copied Mol* camera:

```yaml
view:
  rotation_xyz: [0, 0, 0]
  camera_span: null
  scroll_zoom: {amount: 0.32, start: 0.05, end: 0.5}
  camera:
    position_type: fov_normalized
    position: [-29.09, 204.96, -1.18]
    target: [21.12, 181.98, 13.68]
    up: [-0.47, -0.81, 0.34]
    mode: perspective
    fov_degrees: 45
    radius: 36.32
```

In Mol*, orient the **original PDB** as desired, open its Camera panel, and use **Copy MVS JSON**. Paste the three arrays into `position`, `target`, and `up`. Keep `position_type: fov_normalized` for this export. The camera is interpreted in original deposited PDB coordinates, then converted to the prepared component coordinates; do not copy a camera from an independently centered or aligned structure unless you also undo that transformation.

Your screenshot's **Radius 36.32** is retained. Its raw Position and FoV Norm. Pos. are two different camera representations. The typed position you supplied takes priority over the slightly different normalized position in the screenshot. Perspective projection with a 45° field of view is inferred from the ratio between those two screenshot positions. Do not also force the screenshot's distance: it corresponds to its slightly different position. The starting orientation and framing now derive from your typed camera values.

If copying the panel's raw **Position** instead, set `position_type: raw` and retain the appropriate `mode` and `fov_degrees`. For orthographic views, use `mode: orthographic`. `radius` is a Mol* camera/clipping setting; it does not replace the zoom value.

- `camera_span: null` derives the framing from the copied camera. A positive number overrides zoom: it is half the view's vertical extent at the target plane, in ångströms. Larger values make the molecule smaller. Mobile adds 3 Å of margin.
- `rotation_xyz` makes additional view-space adjustments in degrees, in X → Y → Z order (`Rz × Ry × Rx`). X points right, Y up, and Z toward the viewer; positive rotations follow the right-hand rule. Leave `[0, 0, 0]` to preserve the copied pose. With a copied camera, adjustments rotate around its target.
- `scroll_zoom` controls the camera retreat during separation. `amount` is the fractional reduction in apparent scale; `start` and `end` are normalized motion progress. The earlier 32% retreat for 6ONJ keeps its separated peptide visible in your tighter starting view.
- All components share the camera orientation and then undergo the same schematic separation and small animated Y rotation. Labels follow their projected positions.

For a new preset without a `camera` block, the automatic starting basis faces the ligand toward the viewer and places the peptide upward. Rotations then occur around the receptor Cα centroid:

```yaml
view:
  rotation_xyz: [20, -35, 10]
  camera_span: 39
```

This example tilts 20° about X, turns −35° about Y, then rolls 10° about Z. Both supplied presets use explicit camera blocks. Each PDB uses its own original coordinate frame and needs its own camera values.

Save and let Jekyll rebuild. Mol* reads the new settings directly from the generated HTML; view edits do not require a JavaScript bundle or coordinate regeneration. Use **Site defaults** if saved visitor selections obscure the default you are changing.

### Supplied 6ONI camera

The 6ONI entry uses the raw **Position** from your camera-panel screenshot:

```yaml
view:
  rotation_xyz: [0, 0, 0]
  camera_span: null
  camera:
    position_type: raw
    position: [-81.94, 23.19, -12.08]
    target: [2.61, 11.46, 11.65]
    up: [0.26, 0.83, -0.5]
    mode: perspective
    fov_degrees: 45
    radius: 40.17
```

These coordinates give a distance of approximately 88.6 Å, matching the screenshot. The 45° perspective field of view is inferred from the raw and FoV-normalized distances. If you instead copy **FoV Norm. Pos.** `[-62.1, 20.44, -6.51]`, set `position_type: fov_normalized`; do not mix the two position conventions. Both represent the same view to the screenshot's rounding precision. The existing 6ONJ camera remains unchanged.

## Mol* illustrative cartoon and SSGI

The arrow menu contains independent **Illustrative cartoon** and **SSGI lighting** switches. Both start enabled. Set their defaults in `_data/display.yml`:

```yaml
molstar_illustrative: true
molstar_ssgi: true
show_molstar_controls: true
```

The illustrative option adds black outlines and the unlit material used by Mol*'s illustrative style, while retaining the cartoon representation. Turning it off restores the standard shaded cartoon. SSGI is Mol*'s actual screen-space global illumination pass, separate from ambient occlusion. It can be enabled with either cartoon style. Turning it off leaves conventional ambient occlusion enabled for depth cues. See [Mol* illumination](https://molstar.org/illumination/).

SSGI progressively refines a stationary view and can be more demanding during scrolling. If the device lacks Mol*'s required support, the switch is disabled and the menu explains that SSGI is unavailable; the ordinary renderer remains usable. `show_molstar_controls: false` hides both switches while retaining the configured defaults.

## Add another PDB preset

The preparation scripts support a receptor chain, a peptide chain, and one ligand from an identity biological assembly. More complex assemblies need a corresponding preparation-script extension.

1. Copy a complete entry in `_data/structures.yml` to a new lowercase key.
2. Set the actual `pdb_id`, receptor/peptide author chain IDs, ligand chain/residue/CCD ID, deposited residue ranges, helix-highlight range, labels, and scientific text. Verify these against the deposition; they are not inferred from a PDB ID alone.
3. Save the official `<PDB_ID>.pdb` and `<CCD_ID>.cif` files in `molecular-source/`.
4. Run the commands below, replacing `6oni` with your new key.
5. Define that PDB's own camera, add still fallback images at `assets/molecular/<key>/posters/default.webp`, `vandy.webp`, and `colorblind.webp`, and rebuild Jekyll. Its key appears automatically in the selector. These are ordinary still images, not an animation sequence.

```sh
python3 -m pip install -r requirements.txt
python3 scripts/prepare_molecule.py --structure 6oni
python3 scripts/prepare_scene.py --structure 6oni
```

The first script checks the selected assembly, reads deposited polymer coordinates, checks CCD bonds against CONECT, and writes data/poster assets. The second exports consistently oriented PDB components for Mol*. Neither fits, minimizes, simulates, or reconstructs missing atoms. Assets live in `assets/molecular/<key>/`. Omitting `--structure` prepares all registered entries.

## Mol* rendering and scroll motion

The site uses locally hosted Mol* 5.13.1. There is no renderer selector. Saved Three.js or PyMOL choices from earlier versions are ignored. Palette, PDB, Illustrative cartoon, and SSGI controls remain available. See [Mol*](https://molstar.org/) and its [plugin documentation](https://molstar.org/docs/v5/plugin/instance/).

The peptide and ligand separate across the first two concepts, finishing by the arrival of the third headline. As the third heading approaches, the receptor rocks and all three molecular components visibly flex while **Beyond a single structure** is in view. As **From structure to cellular function** arrives, the protein shrinks toward the nucleus of an illustrated adipocyte and the view pulls back to reveal the complete cell. As **Mechanisms that guide discovery** arrives, the cell pulls back further and six black-marker chemical sketches sweep in from different directions, with staggered arrivals and faint contact rings. The final cell fades to 50% opacity and the compounds hold their positions while the contact rings gently twinkle. Scrolling backward retraces both transitions. **Pause motion** freezes the wiggle, rocking, zoom, chemical approaches, and ring twinkles.

### Slower scrolling and a longer molecular-motion section

Edit `_data/scroll_story.yml`. Desktop and mobile have independent settings:

```yaml
desktop:
  section_height_vh: 100
  motion_section_height_vh: 160
  transition_scroll_multiplier: 2.0
  action_lead_vh: 20
mobile:
  section_height_vh: 95
  motion_section_height_vh: 150
  transition_scroll_multiplier: 2.0
  action_lead_vh: 20
```

| Setting | What to change |
| --- | --- |
| `action_lead_vh` | Shifts all five actions earlier. Default 20 means one-fifth of a screen. Try 40 for more lead, or 0 for no extra shift. This preserves the transition length. |
| `section_height_vh` | Minimum height of each regular concept. 100 is one viewport height. Increase this for more scrolling space between concepts. |
| `motion_section_height_vh` | Minimum height of **Beyond a single structure**. Increase to 200 for a longer opportunity to watch the receptor, peptide, and ligand wiggle. |
| `transition_scroll_multiplier` | Scroll distance for both the protein-to-cell zoom and chemical arrivals. 2 uses twice the original distance; try 2.5 for slower transitions or 1 for their original window lengths. |

Save and let Jekyll rebuild. If LiveReload is enabled, the page refreshes automatically; otherwise refresh it yourself. After first importing this release, restart Jekyll once because `_config.yml` changes the asset cache version.

The multiplier stretches the cell/discovery transition windows backward from their base end positions in `_data/cell_scene.yml` / `_data/discovery_scene.yml`. Then `action_lead_vh` shifts **both** ends earlier. The formula is `effective_start = end + (start - end) × multiplier + lead / 100`, `effective_end = end + lead / 100`. For the desktop cell transition, the original 85%-to-40% window becomes 150%-to-60% with multiplier 2 and lead 20: it still takes 90% of a screen of scrolling. The fourth headline is below the screen when the transition begins, and the cell is revealed while that headline is still visible. Mobile cell scrolling spans 70% of a screen; chemical arrival spans 110% on desktop and 74% on mobile.

The peptide action follows **A meeting of molecules**, and ligand separation follows **Small molecules. Specific effects**. They use the same validated molecular pose/camera path, now scheduled from these two headings instead of the overall story distance. The covalent 6ONI ligand remains attached. The wiggle has its own entrance window and no longer waits on overall separation progress. With default lead 20, it fades in while the third heading moves from 125% to 100% of the viewport height: full motion is already established as the heading enters. Extra third-section space extends the viewing interval, and the motion fades with the cell pullback.

Increase `action_lead_vh` when you want the action earlier relative to its text; increase `transition_scroll_multiplier` when you want the cell/discovery transition to span more scrolling. If you increase either substantially, also increase section heights to leave room to enjoy each settled scene before the next begins. Mobile uses the same entrance logic so the action starts while the text arrives below the sticky illustration.

Supported ranges are 70–250 for regular section height, 100–300 for the motion section, 1–3 for the multiplier, and 0–60 for action lead; out-of-range numbers are limited to those ranges. Heights are minimums, so text can make sections taller. Mobile uses the stable viewport height to avoid shifting spacing as browser controls appear/disappear. These extra spaces only apply to the active animation; reduced motion, failed WebGL, and no-JavaScript layouts retain ordinary reading flow.

Scrolling remains directly controlled by the visitor, with no forced delays or scroll locking. A fast swipe can still move through a transition quickly. Pausing scrolling during the third concept lets the wiggle continue indefinitely, until **Pause motion** is selected or the view leaves the screen. To slow the wiggle itself, lower `domain_wiggle_speed` in `_data/hero_animation.yml`; that is separate from its viewing duration.

### Receptor, peptide, and ligand motion at “Beyond a single structure”

Edit the `presentation` block in `_data/hero_animation.yml`:

```yaml
  enable_domain_motion: true
  domain_motion_degrees: 3.5
  domain_motion_period_seconds: 3.2
  domain_wiggle_amplitude_angstroms: 2.0
  domain_wiggle_speed: 3.5
  domain_wiggle_frequency: 0.12
```

Set `enable_domain_motion: false` to turn off both rocking and internal wiggle. Set only `domain_wiggle_amplitude_angstroms: 0` for rocking alone. Set `domain_motion_degrees: 0` for internal wiggle alone. Rebuild Jekyll after changes.

| Setting | Effect |
| --- | --- |
| `domain_wiggle_amplitude_angstroms` | Size of the procedural deformation; 2.0 is the new, noticeable default. Try 1.0 for less or 2.5 for more. The adapter limits this parameter to 0–5. It is a shader amplitude, not a measured RMSF. |
| `domain_wiggle_speed` | How quickly the internal wiggle changes; 3.5 is the default. Lower is slower. |
| `domain_wiggle_frequency` | Spatial variation of the wiggle; 0.12 keeps neighboring regions correlated. Higher values make smaller regions move more independently. |
| `domain_motion_degrees` | Maximum whole-domain rocking scale; increased from 2.0 to 3.5 degrees. |
| `domain_motion_period_seconds` | Rocking cycle; shortened from 4.5 to 3.2 seconds. This does not set the internal wiggle speed. |

The internal effect uses Mol* 5.13.1's native, position-based procedural wiggle. It deforms the displayed cartoon smoothly instead of only rotating the entire receptor. Nearby positions receive correlated displacement, keeping the motion coherent. It does not change the stored atomic coordinates, calculate forces, preserve every bond length, or represent measured molecular dynamics. The figure labels it as illustrative motion.

The receptor, peptide, and ligand all use the same wiggle amplitude, speed, frequency, and clock. This includes the separated peptide and noncovalent 6ONJ ligand. For 6ONI, the covalent ligand shares the receptor's spatial displacement field, clock, and rocking transform. This keeps their visual motion coupled; it is not a constrained molecular simulation.

Motion fades in during the third topic and out as Functional regulation arrives. The controller and Mol* shader use one clock, so **Pause motion** freezes the flexed pose. Rendering is capped at 30 frames per second and suspends while offscreen or while the tab is hidden. A short sequence of stationary draws allows lighting and antialiasing to settle after an update. Reduced-motion preference disables both effects.

Mol* also supports real MD trajectory playback. To replace this illustration with MD, provide a matching topology/structure and a prepared, aligned trajectory; that would require a separate trajectory-loading and scroll-timing integration. The website currently includes no simulated trajectory.

Implementation references: [Mol* animation parameters](https://github.com/molstar/molstar/blob/v5.13.1/src/mol-geo/geometry/animation.ts) and [procedural animation shader](https://github.com/molstar/molstar/blob/v5.13.1/src/mol-gl/shader/chunks/common-animation.glsl.ts).

## From the molecule to an adipocyte

Version 5.8 adds a scroll-controlled change of scale between the third and fourth topics. The live Mol* image shrinks and fades into the nucleus while the adipocyte illustration pulls back. The finished cell shows a large lipid droplet, a peripheral nucleus, and cytoplasm containing smaller organelles. Labels appear near the end of the transition. This is a conceptual illustration, not a measured scale animation or an experimental cell image.

Edit `_data/cell_scene.yml` and rebuild Jekyll:

```yaml
enabled: true
image: /assets/images/science/adipocyte-cutaway.png
nucleus_anchor: [0.19, 0.51]
start_zoom: 4.5
desktop: { start: 0.85, end: 0.4 }
mobile: { start: 0.95, end: 0.6 }
```

- `enabled: false` removes both the transition and the still cell figure. The molecular story then holds its final structure through the later sections.
- `image` selects the artwork. The included transparent PNG is **1254 × 1254 pixels**. A replacement should be square; keep the nucleus position in sync with `nucleus_anchor` and update `alt` with a description of the new image.
- `nucleus_anchor` is the point where the molecular image lands: `[horizontal, vertical]`, measured from 0 to 1 across the image. `[0, 0]` is the upper-left corner and `[1, 1]` is the lower-right.
- `start_zoom` is the cell artwork's initial magnification. A larger value begins closer to the nucleus; the fourth-topic zoom ends at 1. The separate discovery scene controls the final, additional pullback. Values are limited to 1–8.
- `start` and `end` are base positions of the fourth headline as fractions of viewport height. The multiplier and action lead in `_data/scroll_story.yml` transform these into the actual window, as described above. Keep `start` greater than `end`; a wider interval produces a longer scroll transition. Mobile has separate base values.
- `caption`, `note`, and `alt` edit the cell's description. Visible labels live in `_includes/adipocyte.html`; their positions and typography are in `assets/css/site.css`.

Pause freezes the current transition; resume catches up to the current scroll position. Reverse scrolling returns to the protein, including its selected PDB and camera. Mol* rendering suspends once it is hidden behind the complete cell. The art has a fixed cream/gold/teal palette; the text and label backgrounds follow the selected website palette.

With reduced motion, without JavaScript, or when WebGL is unavailable, a still adipocyte appears directly in the fourth section. If the cell image cannot load, the animated molecular panel stays visible and the inline image retains its alternative description.

The illustration was created for this website with OpenAI image generation. White-adipocyte anatomy was checked against the University of Minnesota Histology Guide's [light-microscopy description](https://www.histologyguide.com/slideview/MHS-213-lymph-nodes/03-slide-1.html) and [electron micrograph](https://histologyguide.com/EM-view/EM-120-adipocyte/03-photo-1.html). The artwork is interpretive and was not copied from those images.

## Editable implementation

| File | Purpose |
|---|---|
| `_data/structures.yml` | Independent PDB cameras, scientific selections, and labels |
| `_data/display.yml` | Default structure, palette, and Mol* appearance |
| `_data/scroll_story.yml` | Section heights, molecular-motion viewing interval, and transition scroll distance |
| `_data/hero_animation.yml` | Separation switches, internal wiggle, rocking, and live pixel ratio |
| `_data/cell_scene.yml` | Cell transition, timing, artwork path, and nucleus landing point |
| `_includes/adipocyte.html` | Cell illustration and visible labels |
| `assets/images/science/adipocyte-cutaway.png` | Transparent illustrated cell used by the webpage |
| `_data/palettes.yml` | Website and molecular colors |
| `assets/js/molecular-view.js` | Convert original-PDB cameras to prepared coordinates |
| `assets/js/molecular-viewer.js` | Scroll, labels, structure switching, and motion controls |
| `assets/js/molstar-adapter.js` | Mol* representation and rendering |
| `assets/molecular/<key>/scene.json` | Prepared molecular coordinates |
| `assets/molecular/<key>/posters/<palette>.webp` | Still image while loading or if WebGL is unavailable |

Earlier Three.js/PyMOL source files and frame sequences remain in the source download as reference. They are excluded from Jekyll builds and the standalone preview by `_config.yml`. The website does not load or animate them. The original rendering scripts generated the ordinary still poster images; no PyMOL installation or frame sequence is needed to use the website.

## Accessibility and failure handling

Reduced-motion preference uses Mol* held at its initial pose, with separation, rocking, internal wiggle, and the zoom disabled. The still cell illustration remains in the fourth section. Without JavaScript or if Mol* cannot initialize WebGL, the still poster and complete scientific text remain visible. Changing the PDB also changes its fallback image. Each supplied poster matches that preset's initial camera; after a future camera edit, replace its still images if you want the fallback pose to match. The live Mol* camera updates immediately after rebuilding Jekyll.

Component identity is always labeled. Mobile uses a shorter sticky molecular panel above the text. Unsupported SSGI disables only that lighting option, leaving the ordinary cartoon usable.


## From cellular function to chemical discovery

Version 5.10 adds the fifth-topic transition. The adipocyte shrinks to 67% of its preceding displayed size while six distinct chemical sketches approach from different directions. Their timing is staggered, with a small positional overshoot. Version 5.11 fades the adipocyte to 50% opacity during the approach, keeping the black sketches prominent. The cell labels fade to make space. Once the compounds settle, the contact rings continue a gentle, staggered twinkle. Cell size, opacity, and compound positions follow scroll position in both directions. Only the ring glow and slight ring expansion continue with time; Pause freezes them, and hidden/offscreen views stop drawing. The hidden Mol* renderer remains suspended throughout this final scene.

Edit `_data/discovery_scene.yml` and rebuild:

```yaml
enabled: true
cell_scale: 0.67
cell_opacity: 0.50
compound_size: 0.32
entry_distance: 2.8
show_contact_rings: true
twinkle_contact_rings: true
contact_twinkle_period_seconds: 2.8
desktop: { start: 0.90, end: 0.35 }
mobile: { start: 0.95, end: 0.58 }
```

- `enabled: false` restores the previous behavior: the full-size adipocyte holds through the final topic. Both this setting and `cell_scene.enabled` must be true to show the new composition.
- `cell_scale` controls the final size relative to the preceding cell view. A smaller value zooms out further; 1 preserves the preceding size. Supported range: 0.4–1.
- `cell_opacity` sets the final adipocyte opacity: 0 is invisible, 0.5 is half opacity, and 1 is fully opaque. The preceding cellular-function view remains opaque. Reduced-motion and noninteractive discovery views use this opacity in their still composition.
- `compound_size` sets the square frame width as a fraction of the shorter viewport side. The drawings have transparent margins inside their frames. Default 0.32; supported range 0.1–0.5.
- `entry_distance` sets how far out each sketch starts relative to its final position. Larger values give a longer approach; supported range 1.2–5.
- `show_contact_rings: false` removes all rings while preserving the sketch movement.
- `twinkle_contact_rings: false` retains only the brief arrival rings; the settled view then stops animating.
- `contact_twinkle_period_seconds` sets a gentle cycle, default 2.8 seconds; larger values are slower. Supported range: 1.5–20 seconds. Reduced-motion and noninteractive views show static rings instead.
- `desktop` and `mobile` refer to the fifth headline's distance from the viewport top, as a fraction of viewport height. Start must be larger than end. The pullback begins first; structures arrive at their individual delays and settle before the overall transition finishes. Mobile applies at 700 px and below.
- Each entry under `compounds` has an editable final `target: [x, y]`, `rotation` in degrees, and `delay` from 0 to 0.5. Targets are fractions of the shorter viewport side, with the center at `[0, 0]`, negative x to the left, and negative y above. Keep targets within −0.5 to 0.5 and leave room for each sketch's width.
- `caption`, `note`, and `alt` describe the final scene. `alt` labels the accessible static composition.

### Artwork and specific lab compounds

`assets/images/science/discovery-compounds.png` is a transparent **1536 × 1024 PNG** with six drawings in a three-column, two-row sheet. The browser clips and moves each drawing separately while sharing the same image download. `sprite: [column, row]` uses zero-based indices. The original transparent image is used directly; no generated PNG intermediates or frame sequences are needed.

The sketches were created with OpenAI image generation for this website. They are **generic illustrative chemical motifs**, not verified structures or named compounds developed by the laboratory. Their approach and contact rings are a visual metaphor, not a claim that these compounds enter adipocytes, damage cells, or have measured activity.

To replace any sketch with a particular lab compound, export an SVG or transparent PNG from a chemical drawing application, save it under `assets/images/science/`, and add an `image` field to that compound entry:

```yaml
  - id: upper-left
    image: /assets/images/science/my-compound.svg
    target: [-0.30, -0.30]
    rotation: -14
    delay: 0.08
```

A per-compound `image` replaces that entry's sprite crop. Square canvases with transparent padding work best. With a specific chemical drawing, confirm atom labels, bond orders, and stereochemistry before publishing. The remaining entries can continue using the shared sheet.

### Fallbacks and performance

The existing Pause motion control freezes the entire sequence. Reduced-motion preferences, disabled JavaScript, and unavailable WebGL use an inline static cell-and-compound composition in the fifth section. Mol* remains suspended once the protein-to-cell transition finishes; the discovery scene uses ordinary image transforms. Ring twinkles run at up to 30 frames per second while visible and unpaused; hiding the tab or scrolling the figure offscreen stops them. When every chemical image fails to load, the extra animated pullback is disabled and the cell keeps its preceding size. Individual missing sketches are hidden.

The markup is in `_includes/discovery.html` and `_layouts/home.html`, the styling is in `assets/css/discovery.css`, and choreography is in `assets/js/molecular-viewer.js`. The new stylesheet also reserves space for Pause motion inside the mobile sticky panel, avoiding overlap with scrolling story text.


## Initial loading and fallback images

During startup, a light scientific sketch of a protein ribbon, peptide, and
ligand fills the reserved molecular panel. This conceptual illustration is not
an experimental PDB rendering. It drifts gently once over 4.5 seconds, then rests
if loading takes longer. Reduced-motion visitors see a still illustration.

The live model becomes visible immediately after its first draw with the selected
PDB camera, palette, and appearance. The sketch fades out over 180 milliseconds;
there is no minimum display time or artificial loading delay. Selecting another
PDB uses the same loading behavior. The former loading text is still available
to screen readers but is not displayed visually.

To customize the sketch, edit `_data/molecular_loading.yml`:

```yaml
image: /assets/images/science/molecular-loading.webp
animate: true
```

Set `animate: false` to keep the sketch still. To replace it, save a transparent
PNG, WebP, or SVG in `assets/images/science/` and change `image` to that path.
A square image with some empty margin works well. Rebuild Jekyll after editing.
The shipped 720 × 720 WebP is approximately 98 KB and loads with high priority.
Size, drift, and fade timing are in `assets/css/molecular-loading.css`.

The stored static poster and molecular labels remain hidden from the first HTML
paint. The hidden canvas stays measurable so Mol* can render at the correct size.
If the page opens at a later cell/discovery topic, Mol* completes its initial
draw before suspending its hidden renderer, avoiding a stuck loading state.

The poster remains available if Mol* or WebGL fails, with a visible explanatory
message. With JavaScript disabled, a `noscript` style shows the poster and hides
the sketch and loading status. The sketch never holds up a working live model.

Loading markup is in `_layouts/home.html`. `molstar-adapter.js` reports the
configured first frame, and `molecular-viewer.js` then reveals it. Coordinate,
camera, scroll, and molecular appearance settings are unchanged.
