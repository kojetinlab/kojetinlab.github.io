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

The peptide and ligand separation retain their original timing. Once separation is complete, the receptor visibly flexes and rocks while **Beyond a single structure** is in view. As **From structure to cellular function** arrives, the protein shrinks toward the nucleus of an illustrated adipocyte and the view pulls back to reveal the complete cell. The cell remains visible through the final chemical-biology topic. Scrolling backward reverses the transition. **Pause motion** freezes the wiggle, rocking, and zoom.

### Receptor motion at “Beyond a single structure”

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

The separated peptide and noncovalent 6ONJ ligand stay still. For 6ONI, the covalent ligand shares the receptor's spatial displacement field, clock, and rocking transform. This keeps their visual motion coupled; it is not a constrained molecular simulation.

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
- `start_zoom` is the cell artwork's initial magnification. A larger value begins closer to the nucleus; the final zoom is always 1. Values are limited to 1–8.
- `start` and `end` are the fourth headline's position as a fraction of viewport height. On desktop, the transition begins when the headline is 85% down the window and finishes at 40%. Keep `start` greater than `end`; a wider interval produces a longer scroll transition. Mobile has separate values so the headline remains below the sticky illustration.
- `caption`, `note`, and `alt` edit the cell's description. Visible labels live in `_includes/adipocyte.html`; their positions and typography are in `assets/css/site.css`.

Pause freezes the current transition; resume catches up to the current scroll position. Reverse scrolling returns to the protein, including its selected PDB and camera. Mol* rendering suspends once it is hidden behind the complete cell. The art has a fixed cream/gold/teal palette; the text and label backgrounds follow the selected website palette.

With reduced motion, without JavaScript, or when WebGL is unavailable, a still adipocyte appears directly in the fourth section. If the cell image cannot load, the animated molecular panel stays visible and the inline image retains its alternative description.

The illustration was created for this website with OpenAI image generation. White-adipocyte anatomy was checked against the University of Minnesota Histology Guide's [light-microscopy description](https://www.histologyguide.com/slideview/MHS-213-lymph-nodes/03-slide-1.html) and [electron micrograph](https://histologyguide.com/EM-view/EM-120-adipocyte/03-photo-1.html). The artwork is interpretive and was not copied from those images.

## Editable implementation

| File | Purpose |
|---|---|
| `_data/structures.yml` | Independent PDB cameras, scientific selections, and labels |
| `_data/display.yml` | Default structure, palette, and Mol* appearance |
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
