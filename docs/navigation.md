# Navigation while scrolling

The normal header appears at the top of each page. Once it scrolls completely
out of view, a compact **Menu** button with three horizontal lines stays in the
upper-right corner. It opens Home, Research, People, Publications, News, Join us,
Contact, and the existing Display options. Scroll back to the top to restore
the normal header.

This is enabled by default on every page, on desktop, tablet, and mobile.
Edit `_data/navigation_settings.yml` to change it:

```yaml
persistent_menu: true
```

Set `persistent_menu: false` to restore the original header that scrolls away.
The ordinary mobile menu still works. This is a site setting, not a visitor
dropdown choice. Save and rebuild Jekyll, or commit and push to publish it.

## Using the menu

- Click Menu to open or close it. The three lines become a close icon when open.
- Click outside the panel, choose a page, or press Escape to close it.
- Tab moves through the links and controls. Escape first closes expanded Display
  options, then closes the main panel and returns focus to Menu.
- The panel scrolls internally when all its controls do not fit on the screen.
- The palette, PDB, and Mol* controls are the same controls used in the full
  header. PDB and Mol* controls appear on the homepage, as before.

The compact panel includes a Home link based on the wordmark's destination.
Other links continue to come from `_data/navigation.yml`. The original header
template and shared site stylesheet are retained so customized wordmark text
and typography can be kept by the release updater.

The floating button and menu do not change the page's layout or the molecular
story's scroll timing. They do not animate. With JavaScript disabled, the
ordinary header links remain available, but the floating enhancement is absent.

Styles are in `assets/css/navigation.css`; behavior is in `assets/js/site.js`.
`--navigation-edge` and `--navigation-top` set the distance from the window edges.

## Browser updates and troubleshooting

Version 5.12.1 checks the header position directly after scrolling and resizing,
instead of relying on an IntersectionObserver visibility notification. Scroll
checks are grouped into one read per animation frame; no continuous animation
loop is used. The layout changes only when the header crosses the screen edge
or the menu changes between its desktop and narrow layouts.

After importing this release into a local preview, stop Jekyll with Control-C
and restart it, because `_config.yml` changes the asset cache version to 19.
Then use Command–Shift–R in Chrome to reload the page. If testing the public
site, first commit and push and wait for the GitHub Pages build to finish.

Make sure Safari and Chrome are displaying the same address: your local
`http://127.0.0.1:4000/` preview and the public GitHub site update separately.
The setting `persistent_menu: false` still disables the floating enhancement.

A regression check is available with Node.js:

```sh
node scripts/check_navigation.cjs
```

This executes the actual navigation controller against simulated browser events,
including missing visibility notifications, fractional positions, scroll bursts,
resize, history restoration, keyboard focus, narrow layouts, and the off switch.
It does not replace a real-browser painting or layout check.
