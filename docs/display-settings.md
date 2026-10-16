# Palettes and Mol* settings

Visitors can use the **down-arrow button** at the end of the top navigation, after **Contact**. Choices take effect immediately and are remembered in that browser. **Site defaults** restores the values below. The offline preview remembers choices between its pages; a browser may restrict persistence after closing a local file.

## Set your preferred defaults

Edit `_data/display.yml` and rebuild Jekyll:

```yaml
site_palette: vandy          # default | vandy | colorblind
show_palette_picker: true
show_structure_picker: true
molecular_structure: 6onj      # 6onj | 6oni
molstar_illustrative: true
molstar_ssgi: true
show_molstar_controls: true
remember_choices: true
```

Set any picker to `false` to hide it. `show_molstar_controls` hides the two Mol* appearance switches. Illustrative cartoon and SSGI are independent, remembered settings; unsupported devices show SSGI as unavailable. To enforce your defaults for every visit, hide all pickers and set `remember_choices: false`; otherwise a returning visitor's saved preference takes precedence. The settings use YAML rather than JavaScript so you can change them without rebuilding a JavaScript bundle.

## Edit colors

`_data/palettes.yml` defines all page and molecular colors together. The generated `assets/css/palettes.css` exposes them as CSS variables. `assets/css/site.css` consumes those variables; its reading-size tokens are grouped near the end.

| Name | Appearance |
|---|---|
| `default` | Teal & slate: warm paper, teal links, slate receptor |
| `vandy` | Vanderbilt black, white, and gold; darker Oak for readable links |
| `colorblind` | Blue/orange page accents, distinct blue/orange/purple components |

The Vanderbilt colors follow [Vanderbilt's identity guide](https://brand.vanderbilt.edu/wp-content/uploads/sites/276/2022/09/Vanderbilt-University-Brand-Identity-and-Creative-Style-Guide.pdf). The color-vision-friendly option avoids red/green distinctions for the three molecular components. Labels identify each component in every palette; colors alone do not convey identity. This option is not a guarantee for every type or degree of color-vision deficiency.

Mol* is the only interactive renderer. Both page and molecular colors update immediately. Older saved Three.js or PyMOL selections are ignored; there is no renderer dropdown.

## Where to edit HTML

| File | Purpose |
|---|---|
| `_layouts/home.html` | Homepage sections and molecular story |
| `_layouts/default.html` | Shared HTML head, metadata, header/footer includes |
| `_layouts/*.html` | Person, research, publication, and news templates |
| `_includes/header.html` and `_includes/footer.html` | Shared navigation and footer |
| `_includes/display-controls.html` | Palette, PDB structure, and Mol* appearance controls |
| `research.html`, `people.html`, etc. | Listing pages |
| `_data/site.yml` and content `.md` files | Text shown by those templates |

The HTML uses Jekyll's Liquid syntax: `{{ ... }}` inserts a value, and `{% ... %}` performs a loop or condition. Keep these tags when editing surrounding HTML. Templates, CSS, and authored JavaScript are indented and split into readable blocks. Comments mark the major homepage sections.

Edit source files, then rebuild. `_site/`, the offline preview, and vendor libraries are generated or third-party files and should not be manually edited. `npm run format` restores source formatting. Routine edits require only a Jekyll rebuild.

After deploying new styles, scripts, or molecular assets, increment `asset_version` in `_config.yml` so returning browsers request the updated files.

## Structure and orientation

Edit `_data/structures.yml` for each preset’s `view.camera`, `view.rotation_xyz`, `view.camera_span`, and optional `view.scroll_zoom`. Both 6ONJ and 6ONI contain their own supplied Mol* cameras. Changing one does not change the other. See `docs/molecular-animation.md` for camera conventions and examples. Version 4 starts a fresh preference record so the Vanderbilt default is visible; subsequent explicit choices are remembered. **Site defaults** restores Vanderbilt, Mol*, the configured PDB preset, and the configured illustrative/SSGI settings.

## Contact photograph and footer logo

The Contact page displays the supplied building photograph beside the contact details, stacking above them on narrower screens. The image keeps its complete original proportions. The shared footer uses the selected palette's light page background and the supplied black-and-gold Vanderbilt School of Medicine Basic Sciences SVG logo. SVG is a vector format and stays sharp at any display size.

Edit these fields in `_data/site.yml` to replace the images, change their descriptions, or update the logo link:

```yaml
contact_photo: /assets/images/contact/vanderbilt-building-at-night.jpg
contact_photo_alt: Vanderbilt campus building at night, with an illuminated glass facade.
contact_photo_caption: Our home at Vanderbilt · Nashville, Tennessee
footer_logo: /assets/images/brand/vanderbilt-basic-sciences.svg
footer_logo_alt: Vanderbilt University School of Medicine Basic Sciences
basic_sciences_url: https://medschool.vanderbilt.edu/basic-sciences/
```

The building JPEG and logo SVG retain their original supplied bytes. The matching black-text PNG is also included at `assets/images/brand/vanderbilt-basic-sciences.png`; change `footer_logo` to that path if you prefer PNG. The webpage uses the SVG by default. Both logos are embedded in the standalone preview.

`contact.html` controls the photo layout; `_includes/footer.html` controls the logo placement. The corresponding rules in `assets/css/site.css` begin with `.contact-building`, `.contact-details`, `.site-footer`, `.footer-brand`, and `.footer-grid`. Keep a light background when using this black-text logo.
