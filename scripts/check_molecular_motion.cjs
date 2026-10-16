/* Controller regression checks without a browser or WebGL dependency.
   Exercises the real controller with deterministic scroll, time, and image loading. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "assets/js/molecular-viewer.js"), "utf8");
// Read the current Jekyll settings, not the archived PyMOL frame settings.
const html = fs.readFileSync(path.join(root, "_site/index.html"), "utf8");
const config = id => JSON.parse(html.match(new RegExp(`<script[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`))[1]);
const { structures, palettes } = config("display-config");
const presentation = config("hero-config");
const colors = Object.fromEntries(Object.entries(palettes).map(([key, value]) => [key, value.molecule]));
const settle = () => new Promise(resolve => setImmediate(resolve));

async function fixture(renderer = "molstar", structure = "6onj", motion = true) {
  const listeners = new Map(), frames = new Map();
  let top = 0, heading3 = 2500, heading4 = 3200, now = 0, frameId = 0;
  let intersection;
  const requests = [], settingsHistory = [];
  function element() {
    return {
      style: { setProperty() {} }, dataset: {}, children: [], hidden: false, textContent: "",
      classList: { add() {}, remove() {}, toggle() {} },
      append(...children) { this.children.push(...children); }, remove() { this.removed = true; },
      setAttribute(name, value) { this[name] = value; },
      addEventListener(name, callback) { this[name] = callback; },
    };
  }
  const host = Object.assign(element(), { clientWidth: 640, clientHeight: 640 });
  const button = element(), note = element();
  const parts = new Map([[".molecule-renderer", host], [".motion-toggle", button], [".figure-note", note]]);
  const figure = Object.assign(element(), {
    dataset: { assets: "/assets/", version: "test" },
    querySelector(selector) { if (!parts.has(selector)) parts.set(selector, element()); return parts.get(selector); },
    querySelectorAll() { return []; },
  });
  const story = Object.assign(element(), {
    getBoundingClientRect: () => ({ top }),
    querySelector(selector) {
      if (selector === '[data-step="3"]') return { getBoundingClientRect: () => ({ bottom: top + 3000 }) };
      if (selector === '[data-step="3"] h2') return { getBoundingClientRect: () => ({ top: heading3 }) };
      if (selector === '[data-step="4"] h2') return { getBoundingClientRect: () => ({ top: heading4 }) };
      return element();
    },
  });
  const reduced = { matches: false, addEventListener(_, fn) { this.change = fn; } };
  const display = { state: { renderer, structure, palette: "vandy" }, structures,
    palettes: Object.fromEntries(Object.entries(colors).map(([k, v]) => [k, { molecule: v }])) };
  const mockAdapter = { render(state) { this.state = state; }, setSuspended(value) { this.suspended = value; }, async setPalette() {}, resize() {}, dispose() {} };
  const document = {
    hidden: false, documentElement: element(),
    getElementById(id) {
      return id === "molecule" ? figure : id === "molecular-story" ? story : id === "hero-config"
        ? { textContent: JSON.stringify({ ...presentation, enable_domain_motion: motion }) } : element();
    },
    querySelector: () => element(), createElement: element,
    head: { append(script) { requests.push(script.src); queueMicrotask(() => script.onload()); } },
    addEventListener(name, callback) { listeners.set(name, callback); },
  };
  const context = vm.createContext({ console, Math, Map, JSON, Promise, document, innerHeight: 1000, innerWidth: 1200,
    matchMedia: () => reduced,
    addEventListener(name, callback) { listeners.set(name, callback); },
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    ResizeObserver: class { observe() {} },
    IntersectionObserver: class { constructor(fn) { intersection = fn; } observe() {} },
    Image: class {
      constructor() { Object.assign(this, element()); }
      set src(value) { this.url = value; queueMicrotask(() => this.onload?.()); }
      get src() { return this.url; }
    },
    async fetch(url) {
      requests.push(url);
      return { ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(root, url.split("?")[0]))) };
    },
    window: { KojetinDisplay: display, KojetinRenderers: {
      molstar: async ({settings}) => { settingsHistory.push(settings); return mockAdapter; },
    } },
  });
  vm.runInContext(fs.readFileSync(path.join(root,"assets/js/molecular-view.js"),"utf8"), context);

  vm.runInContext(source, context);
  async function tick(count = 1) {
    for (let i = 0; i < count; i++) {
      await settle(); now += 40;
      const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now));
    }
    await settle();
  }
  async function scroll(p, third, fourth) {
    top = -p * 2000; heading3 = third; heading4 = fourth;
    listeners.get("scroll")(); await tick(2);
  }
  await tick(4);
  return { figure, host, button, reduced, display, document, frames, mockAdapter, tick, scroll, requests, settingsHistory,
    event: name => listeners.get(name)(),
    visibility: visible => intersection([{ isIntersecting: visible }]) };
}

(async () => {
  for (const renderer of ["molstar", "threejs", "pymol_rendered"]) {
    const f = await fixture(renderer);
    assert.equal(f.figure.dataset.renderer, "molstar");
    await f.scroll(0.8, 800, 1500);
    assert.equal(+f.figure.dataset.domainMotion, 0, "No rocking during the first two transitions");
    assert.equal(+f.figure.dataset.wiggleAmplitude, 0);
    await f.scroll(1, 200, 900);
    await f.tick(15);
    assert(+f.figure.dataset.domainMotion > 0.9);
    assert(Math.abs(+f.figure.dataset.domainAngle) > 0.005);
    assert(+f.figure.dataset.wiggleAmplitude > 1.8, "Internal wiggle is clearly enabled at the third section");
    assert.equal(+f.figure.dataset.peptideSeparation, 1);
    assert.equal(+f.figure.dataset.ligandSeparation, 1);
    f.button.click(); await f.tick(2);
    const frozen = f.figure.dataset.domainAngle;
    const frozenClock = f.mockAdapter.state.motionTime;
    const frozenWiggle = f.figure.dataset.wiggleAmplitude;
    await f.scroll(1.5, -500, 200); await f.tick(10);
    assert.equal(f.figure.dataset.domainAngle, frozen, "Pause freezes the rocking pose and scroll");
    assert.equal(f.mockAdapter.state.motionTime, frozenClock, "Pause freezes the shader clock");
    assert.equal(f.figure.dataset.wiggleAmplitude, frozenWiggle, "Pause preserves the flexed pose");
    assert.equal(f.frames.size, 0);
    f.button.click(); await f.tick(2);
    assert.equal(+f.figure.dataset.domainAngle, 0, "Fourth section settles to the final pose");
    assert.equal(+f.figure.dataset.wiggleAmplitude, 0);
    await f.scroll(1, 200, 900); await f.tick(8);
    f.visibility(false); await f.tick(2); assert.equal(f.frames.size, 0);
    assert.equal(f.mockAdapter.suspended, true);
    f.visibility(true); await f.tick(3); assert(f.frames.size > 0);
    assert.equal(f.mockAdapter.suspended, false);
    f.document.hidden = true; f.event("visibilitychange"); await f.tick(2); assert.equal(f.frames.size, 0);
    f.document.hidden = false; f.event("visibilitychange"); await f.tick(2);
    f.reduced.matches = true; f.reduced.change(); await f.tick(3);
    assert.equal(+f.figure.dataset.domainAngle, 0);
    assert.equal(+f.figure.dataset.wiggleAmplitude, 0);
    assert.equal(+f.figure.dataset.progress, 0);
    assert.equal(f.frames.size, 0);
    f.reduced.matches = false; f.reduced.change(); await f.tick(2);
    await f.scroll(0, 2500, 3200); assert.equal(+f.figure.dataset.domainAngle, 0);
    assert.equal(+f.figure.dataset.progress, 0);
    assert(!f.requests.some(url => /three|frames|data\.json/.test(url)));
    console.log("Prior choice " + renderer + ": Mol* only; motion, pause, reverse, visibility, and reduced-motion checks passed");
  }
  const covalent = await fixture("molstar", "6oni");
  await covalent.scroll(1, 200, 900); await covalent.tick(10);
  assert.equal(+covalent.figure.dataset.ligandSeparation, 0);
  assert.equal(covalent.settingsHistory[0].ligand_moves_with_domain, true);
  covalent.display.state.palette = "colorblind"; await covalent.event("displaychange"); await covalent.tick(3);
  assert.equal(covalent.figure.dataset.renderer, "molstar");
  const camera6oni = covalent.settingsHistory[0].orientation;
  covalent.display.state.structure = "6onj"; await covalent.event("displaychange"); await covalent.tick(5);
  assert.equal(covalent.figure.dataset.structure, "6onj");
  assert.notDeepEqual(covalent.settingsHistory.at(-1).orientation, camera6oni);
  assert.equal(covalent.settingsHistory.at(-1).ligand_moves_with_domain, false);
  covalent.display.state.structure = "6oni"; await covalent.event("displaychange"); await covalent.tick(5);
  assert.deepEqual(covalent.settingsHistory.at(-1).orientation, camera6oni);
  covalent.host.webglcontextlost({preventDefault(){}}); await covalent.tick(3);
  assert.equal(covalent.figure.dataset.renderer, "static");
  assert.equal(covalent.frames.size, 0);
  assert(!covalent.requests.some(url => /three|frames|data\.json/.test(url)));
  const disabled = await fixture("molstar", "6onj", false);
  await disabled.scroll(1, 200, 900); await disabled.tick(10);
  assert.equal(+disabled.figure.dataset.domainAngle, 0);
  assert.equal(+disabled.figure.dataset.wiggleAmplitude, 0);
  assert.equal(disabled.frames.size, 0);
  console.log("Independent PDB camera switching, covalent ligand, static fallback, and motion off-switch passed");
})().catch(error => { console.error(error); process.exitCode = 1; });
