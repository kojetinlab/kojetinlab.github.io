/* Run after a Jekyll build: node scripts/check_molstar_wiggle.cjs
   Real adapter + bundled Mol* math/loci, mocked rendering lifecycle.
   Checks clock/representation contracts; does not exercise WebGL shaders. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "_site/index.html"), "utf8");
const config = id => JSON.parse(html.match(new RegExp(`<script[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`))[1]);
const presentation = config("hero-config");
const display = config("display-config");
const element = () => ({ style: {}, dataset: {}, getContext: () => null, addEventListener() {}, setAttribute() {}, remove() {} });
const vendor = { console, setTimeout, clearTimeout, performance, TextEncoder, TextDecoder, Buffer,
  window: {}, document: { createElement: element }, navigator: { userAgent: "node", platform: "node" } };
vendor.self = vendor;
vm.createContext(vendor);
vm.runInContext(fs.readFileSync(path.join(root, "assets/js/vendor/molstar/molstar.js"), "utf8"), vendor);
const native = vendor.molstar.lib;

async function fixture(key) {
  const reps = new Map(), frames = new Map(), ticks = [];
  let frameId = 0, now = 0, stopped = 0, disposed = false, failDraw = false, drawError, firstFrames = 0;
  const canvas = {
    props: { postprocessing: { occlusion: { params: {} }, antialiasing: {} } },
    setProps() {}, update() {}, requestDraw() {}, commit() {}, resetTime(t) { assert.equal(t, 0); },
    tick(t) { if (failDraw) throw new Error("Rendering failed"); ticks.push(t); }, camera: { setState() {} },
  };
  const plugin = {
    canvas3d: canvas, canvas3dContext: { passes: { illumination: { supported: true } } },
    animationLoop: { stop() { stopped++; } },
    async init() {}, async initViewerAsync() { return true; }, handleResize() {},
    dispose() { disposed = true; },
    builders: {
      data: { async rawData({ label }) { return { name: label.split(" ").at(-1) }; } },
      structure: {
        async parseTrajectory(raw) { return raw; }, async createModel(raw) { return raw; },
        async createStructure(raw) { return { obj: { data: { name: raw.name, units: [] } } }; },
        representation: { async addRepresentation(structure, params) {
          const name = structure.obj.data.name;
          const repr = { state: { themeStrength: { overpaint: 1, transparency: 1, emissive: 1, substance: 1, wiggle: 1 } },
            setState(update) { Object.assign(this.state, update); } };
          const cell = { obj: { data: { repr } }, params: { type: { params: params.typeParams } } };
          reps.set(name, cell);
          return cell;
        } },
      },
    },
    build() {
      const builder = { to(cell) { this.cell = cell; return this; },
        update(fn) { fn(this.cell.params); return this; }, async commit() {} };
      return builder;
    },
  };
  const api = {
    DefaultPluginSpec: () => ({}), PluginContext: function () { return plugin; },
    PluginConfig: { General: { PixelScale: "pixelScale", AllowMajorPerformanceCaveat: "caveat" } },
  };
  const structure = { ...native.structure,
    Queries: { generators: { atoms: () => ({}) } },
    StructureQuery: { run: () => ({}) },
    StructureSelection: { toLociWithSourceUnits: () => ({}) },
  };
  const context = {
    console, Math, Map, devicePixelRatio: 1,
    document: { hidden: false, createElement: element, getElementById: element, querySelector: element },
    requestAnimationFrame(fn) { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    window: { molstar: { lib: { plugin: api, structure, math: native.math } } },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "assets/js/molecular-view.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(root, "assets/js/molstar-adapter.js"), "utf8"), context);
  const preset = display.structures[key];
  const scene = JSON.parse(fs.readFileSync(path.join(root, `assets/molecular/${key}/scene.json`)));
  const settings = { ...presentation, ...context.window.KojetinMolecularView(preset.view, scene),
    ...display.palettes.vandy.molecule, illustrative: true, ssgi: true, h12_range: preset.h12_range,
    ligand_moves_with_domain: !preset.allow_ligand_separation };
  const host = { append() {}, closest: () => element() };
  const adapter = await context.window.KojetinRenderers.molstar({ host, scene, settings, loadScript: async () => {}, onError(error) { drawError = error; }, onFirstFrame() { firstFrames++; } });
  const state = { progress: 1, angle: 0.28, domainAngle: 0.03, peptideT: 1,
    ligandT: preset.allow_ligand_separation ? 1 : 0, span: settings.span, motionTime: 1.25, wiggleAmplitude: 2 };
  function tick(count = 1) {
    for (let i = 0; i < count; i++) {
      now += 40; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now));
    }
  }
  return { adapter, reps, frames, ticks, state, tick, settings, failDraw() { failDraw = true; }, get firstFrames() { return firstFrames; }, get drawError() { return drawError; }, get stopped() { return stopped; }, get disposed() { return disposed; } };
}

(async () => {
  for (const key of ["6onj", "6oni"]) {
    const f = await fixture(key);
    assert.equal(f.stopped, 1, "Native free-running clock is stopped");
    await f.adapter.setPalette(f.settings); f.tick(2);
    assert.equal(f.firstFrames, 0, "Initial setup draws do not reveal the unconfigured camera");
    f.ticks.length = 0;
    f.adapter.render(f.state); f.tick(16);
    assert.equal(f.firstFrames, 1, "Reveal exactly once, after the configured frame is drawn");
    assert(f.ticks.length > 0);
    assert(f.ticks.every(t => t === 1250), "Shader time stays fixed while the site clock is paused");
    assert.equal(f.frames.size, 0, "Refinement ends without an idle rendering loop");
    for (const [name, cell] of f.reps) {
      const animation = cell.params.type.params.animation;
      assert.equal(animation.wiggleMode, "position");
      assert.equal(animation.wiggleSpeed, presentation.domain_wiggle_speed);
      assert.equal(animation.wiggleFrequency, presentation.domain_wiggle_frequency);
      assert.equal(animation.tumbleAmplitude, 0);
      assert(Object.values(animation).every(value => value !== undefined));
      assert.equal(cell.obj.data.repr.state.wiggle.layers.length, 1, name + " participates in wiggle");
      assert.equal(cell.obj.data.repr.state.themeStrength.wiggle, 2);
    }
    f.adapter.setSuspended(true);
    f.adapter.render({ ...f.state, motionTime: 1.5 });
    const count = f.ticks.length;
    f.tick(8); assert.equal(f.ticks.length, count); assert.equal(f.frames.size, 0);
    f.adapter.setSuspended(false); f.tick(2); assert.equal(f.ticks.at(-1), 1500);
    await f.adapter.setPalette(f.settings);
    await f.adapter.setAppearance({ illustrative: false, ssgi: false });
    f.adapter.render(f.state);
    assert.equal(f.reps.get("receptor").obj.data.repr.state.themeStrength.wiggle, 2);
    f.adapter.render({ ...f.state, motionTime: 0, wiggleAmplitude: 0, domainAngle: 0 });
    f.tick(16);
    assert.equal(f.ticks.at(-1), 0);
    for (const cell of f.reps.values()) assert.equal(cell.obj.data.repr.state.wiggle.layers.length, 0);
    assert.equal(f.frames.size, 0);
    f.adapter.render(f.state); assert(f.frames.size > 0);
    f.failDraw(); f.tick(); assert.equal(f.drawError.message, "Rendering failed");
    assert.equal(f.frames.size, 0, "A rendering error suspends drawing and reports to the controller");
    f.adapter.dispose(); assert.equal(f.frames.size, 0); assert.equal(f.disposed, true);
    console.log(key + ": native wiggle parameters, component selection, frozen clock, suspension, appearance, reset, and disposal passed");
  }
  const failed = await fixture("6onj");
  failed.adapter.render(failed.state); failed.failDraw(); failed.tick(2);
  assert.equal(failed.firstFrames, 0, "A failed initial frame must never reveal the canvas");
  assert.equal(failed.drawError.message, "Rendering failed");
  failed.adapter.dispose();
})().catch(error => { console.error(error); process.exitCode = 1; });
