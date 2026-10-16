/* Palette, structure, and Mol* appearance preferences. No tracking. */
(() => {
  const config = JSON.parse(document.getElementById("display-config").textContent);
  const palettes = config.palettes;
  const structures = config.structures;
  const defaults = config.defaults;
  const storageKey = "kojetin-display-v2";
  let saved = {};
  if (defaults.remember_choices) {
    try {
      saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch {}
    saved = { ...saved, ...(window.KojetinPreviewState || {}) };
  }

  const state = {
    illustrative:
      typeof saved.illustrative === "boolean"
        ? saved.illustrative
        : !!defaults.molstar_illustrative,
    ssgi: typeof saved.ssgi === "boolean" ? saved.ssgi : !!defaults.molstar_ssgi,
    structure: structures[saved.structure] ? saved.structure : defaults.molecular_structure,
    palette: palettes[saved.palette] ? saved.palette : defaults.site_palette,
    // Ignore renderer preferences saved by earlier versions of the website.
    renderer: "molstar",
  };
  if (!structures[state.structure]) state.structure = Object.keys(structures)[0];
  if (!palettes[state.palette]) state.palette = "default";

  function apply(remember = false) {
    document.documentElement.dataset.palette = state.palette;
    const palette = palettes[state.palette];
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", palette.css.paper);
    if (remember && defaults.remember_choices) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch {}
      if (window.KojetinPreviewState) Object.assign(window.KojetinPreviewState, state);
    }
    const paletteSelect = document.getElementById("palette-picker");
    const structureSelect = document.getElementById("structure-picker");
    if (structureSelect) structureSelect.value = state.structure;
    if (paletteSelect) paletteSelect.value = state.palette;
    const illustrative = document.getElementById("molstar-illustrative");
    const ssgi = document.getElementById("molstar-ssgi");
    if (illustrative) illustrative.checked = state.illustrative;
    if (ssgi) ssgi.checked = state.ssgi;
    document.dispatchEvent(new CustomEvent("displaychange", { detail: { ...state } }));
  }

  window.KojetinDisplay = { state, palettes, structures, defaults };
  apply();
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelector(".display-settings")?.removeAttribute("hidden");
    apply();
    document.getElementById("palette-picker")?.addEventListener("change", (event) => {
      if (palettes[event.target.value]) state.palette = event.target.value;
      apply(true);
    });
    document.getElementById("structure-picker")?.addEventListener("change", (event) => {
      if (structures[event.target.value]) state.structure = event.target.value;
      apply(true);
    });
    for (const [id, key] of [
      ["molstar-illustrative", "illustrative"],
      ["molstar-ssgi", "ssgi"],
    ]) {
      document.getElementById(id)?.addEventListener("change", (event) => {
        state[key] = event.target.checked;
        apply(true);
      });
    }
    document.querySelector(".display-reset")?.addEventListener("click", () => {
      state.illustrative = !!defaults.molstar_illustrative;
      state.ssgi = !!defaults.molstar_ssgi;
      state.structure = defaults.molecular_structure;
      state.palette = defaults.site_palette;
      apply(true);
    });
  });
})();
