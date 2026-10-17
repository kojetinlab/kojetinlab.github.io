/* Controller regression checks without a browser or WebGL dependency.
   Exercises the real controller with deterministic scroll, time, and image loading. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  process.argv[2] || path.join(root, "assets/js/molecular-viewer.js"),
  "utf8",
);
// Read the current Jekyll settings, not the archived PyMOL frame settings.
const html = fs.readFileSync(path.join(root, "_site/index.html"), "utf8");
const config = (id) =>
  JSON.parse(html.match(new RegExp(`<script[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`))[1]);
const { structures, palettes } = config("display-config");
const presentation = config("hero-config");
const cellPresentation = config("cell-config");
const discoveryPresentation = config("discovery-config");
const scrollPresentation = config("scroll-story-config");
function expandedTiming(
  config,
  mobile,
  multiplier = scrollPresentation[mobile ? "mobile" : "desktop"].transition_scroll_multiplier,
) {
  const { start, end } = config[mobile ? "mobile" : "desktop"];
  const lead = (scrollPresentation[mobile ? "mobile" : "desktop"].action_lead_vh ?? 20) / 100;
  return { start: end + (start - end) * multiplier + lead, end: end + lead };
}
const colors = Object.fromEntries(
  Object.entries(palettes).map(([key, value]) => [key, value.molecule]),
);
const settle = () => new Promise((resolve) => setImmediate(resolve));

async function fixture(renderer = "molstar", structure = "6onj", motion = true, cell = {}) {
  const listeners = new Map(),
    frames = new Map();
  let top = 0,
    heading1 = 1500,
    heading2 = 2500,
    heading3 = 3500,
    heading4 = 3200,
    heading5 = 4500,
    now = 0,
    frameId = 0;
  let intersection;
  const requests = [],
    settingsHistory = [],
    firstFrameCallbacks = [];
  function element() {
    const classes = new Set();
    return {
      style: {
        setProperty(name, value) {
          this[name] = value;
        },
      },
      dataset: {},
      children: [],
      hidden: false,
      offsetWidth: cell.mobile ? 150 : 190,
      offsetHeight: 42,
      textContent: "",
      classList: {
        add(name) {
          classes.add(name);
        },
        remove(name) {
          classes.delete(name);
        },
        toggle(name, value) {
          if (value) classes.add(name);
          else classes.delete(name);
        },
        contains(name) {
          return classes.has(name);
        },
      },
      append(...children) {
        this.children.push(...children);
      },
      remove() {
        this.removed = true;
      },
      setAttribute(name, value) {
        this[name] = value;
      },
      addEventListener(name, callback) {
        this[name] = callback;
      },
    };
  }
  const host = Object.assign(element(), {
    clientWidth: cell.mobile ? 350 : 640,
    clientHeight: cell.mobile ? 300 : 640,
  });
  const button = element(),
    note = element();
  const parts = new Map([
    [".molecule-renderer", host],
    [".motion-toggle", button],
    [".figure-note", note],
  ]);
  parts.set(
    ".cell-illustration",
    Object.assign(element(), { complete: true, naturalWidth: cell.failed ? 0 : 1280 }),
  );
  const compoundFrames = discoveryPresentation.compounds.map(() => {
    const image = Object.assign(element(), {
      complete: true,
      naturalWidth: cell.sketchFailed ? 0 : 1536,
    });
    return Object.assign(element(), { image, querySelector: () => image });
  });
  const figure = Object.assign(element(), {
    dataset: { assets: "/assets/", version: "test" },
    querySelector(selector) {
      if (!parts.has(selector)) parts.set(selector, element());
      return parts.get(selector);
    },
    querySelectorAll(selector) {
      return selector === ".compound-flight" ? compoundFrames : [];
    },
  });
  const story = Object.assign(element(), {
    getBoundingClientRect: () => ({ top }),
    querySelector(selector) {
      if (selector === '[data-step="1"] h2')
        return { getBoundingClientRect: () => ({ top: heading1 }) };
      if (selector === '[data-step="2"] h2')
        return { getBoundingClientRect: () => ({ top: heading2 }) };
      if (selector === '[data-step="3"]')
        return { getBoundingClientRect: () => ({ bottom: top + 3000 }) };
      if (selector === '[data-step="3"] h2')
        return { getBoundingClientRect: () => ({ top: heading3 }) };
      if (selector === '[data-step="4"] h2')
        return { getBoundingClientRect: () => ({ top: heading4 }) };
      if (selector === '[data-step="5"] h2')
        return { getBoundingClientRect: () => ({ top: heading5 }) };
      return element();
    },
  });
  const reduced = {
    matches: !!cell.reduced,
    addEventListener(_, fn) {
      this.change = fn;
    },
  };
  const display = {
    state: { renderer, structure, palette: "vandy" },
    structures,
    palettes: Object.fromEntries(Object.entries(colors).map(([k, v]) => [k, { molecule: v }])),
  };
  const mockAdapter = {
    render(state) {
      this.state = state;
      if (!cell.deferFirstFrame && this.firstFrame) {
        const callback = this.firstFrame;
        this.firstFrame = null;
        queueMicrotask(callback);
      }
    },
    setSuspended(value) {
      this.suspended = value;
    },
    async setPalette() {},
    resize() {},
    dispose() {},
  };
  const document = {
    hidden: false,
    documentElement: element(),
    getElementById(id) {
      return id === "molecule"
        ? figure
        : id === "molecular-story"
          ? story
          : id === "hero-config"
            ? { textContent: JSON.stringify({ ...presentation, enable_domain_motion: motion }) }
            : id === "scroll-story-config"
              ? { textContent: JSON.stringify(cell.pacing || scrollPresentation) }
              : id === "cell-config"
                ? {
                    textContent: JSON.stringify({
                      ...cellPresentation,
                      enabled: cell.enabled !== false,
                    }),
                  }
                : id === "discovery-config"
                  ? {
                      textContent: JSON.stringify({
                        ...discoveryPresentation,
                        enabled: cell.discoveryEnabled !== false,
                        twinkle_contact_rings: cell.twinkle !== false,
                        show_contact_rings: cell.rings !== false,
                      }),
                    }
                  : element();
    },
    querySelector: () => element(),
    createElement: element,
    head: {
      append(script) {
        requests.push(script.src);
        queueMicrotask(() => script.onload());
      },
    },
    addEventListener(name, callback) {
      listeners.set(name, callback);
    },
  };
  const context = vm.createContext({
    console,
    Math,
    Map,
    JSON,
    Promise,
    document,
    innerHeight: 1000,
    innerWidth: cell.mobile ? 390 : 1200,
    matchMedia: () => reduced,
    addEventListener(name, callback) {
      listeners.set(name, callback);
    },
    requestAnimationFrame(callback) {
      frames.set(++frameId, callback);
      return frameId;
    },
    ResizeObserver: class {
      observe() {}
    },
    IntersectionObserver: class {
      constructor(fn) {
        intersection = fn;
      }
      observe() {}
    },
    Image: class {
      constructor() {
        Object.assign(this, element());
      }
      set src(value) {
        this.url = value;
        queueMicrotask(() => this.onload?.());
      }
      get src() {
        return this.url;
      }
    },
    async fetch(url) {
      requests.push(url);
      return {
        ok: true,
        json: async () => JSON.parse(fs.readFileSync(path.join(root, url.split("?")[0]))),
      };
    },
    window: {
      KojetinDisplay: display,
      KojetinRenderers: {
        molstar: async ({ settings, onFirstFrame }) => {
          settingsHistory.push(settings);
          firstFrameCallbacks.push(onFirstFrame);
          mockAdapter.firstFrame = onFirstFrame;
          return mockAdapter;
        },
      },
    },
  });
  vm.runInContext(fs.readFileSync(path.join(root, "assets/js/molecular-view.js"), "utf8"), context);

  vm.runInContext(source, context);
  async function tick(count = 1) {
    for (let i = 0; i < count; i++) {
      await settle();
      now += 40;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((fn) => fn(now));
    }
    await settle();
  }
  async function scroll(p, third, fourth, fifth = 4500) {
    top = -p * 2000;
    heading1 = p === 0 ? 1500 : third - 2200;
    heading2 = p === 0 ? 2500 : third - 1100;
    heading3 = third;
    heading4 = fourth;
    heading5 = fifth;
    listeners.get("scroll")();
    await tick(2);
  }
  async function scrollStory(y) {
    top = -y;
    [heading1, heading2, heading3, heading4, heading5] = [1400, 2400, 3400, 5000, 6000].map(
      (h) => h - y,
    );
    listeners.get("scroll")();
    await tick(2);
  }
  await tick(4);
  return {
    figure,
    host,
    button,
    reduced,
    display,
    document,
    frames,
    mockAdapter,
    tick,
    scroll,
    scrollStory,
    requests,
    settingsHistory,
    parts,
    compoundFrames,
    firstFrameCallbacks,
    event: (name) => listeners.get(name)(),
    visibility: (visible) => intersection([{ isIntersecting: visible }]),
  };
}

(async () => {
  // Full label boxes stay inside the panel, including a short phone landscape view.
  for (const mobile of [false, true]) {
    for (const structure of ["6onj", "6oni"]) {
      const f = await fixture("molstar", structure, true, { mobile });
      assert.equal(
        f.parts.get(".label-ligand small").textContent,
        structure === "6onj" ? "agonist" : "inverse agonist",
      );
      assert.equal(
        f.parts.get(".label-peptide .component-name").textContent,
        structure === "6onj" ? "MED1" : "N-CoR",
      );
      for (const height of [f.host.clientHeight, 156]) {
        f.host.clientHeight = height;
        f.event("resize");
        for (const y of [0, 900, 1600, 2400, 3400]) {
          await f.scrollStory(y);
          for (const name of ["peptide", "ligand"]) {
            const el = f.parts.get(`.label-${name}`);
            const x = parseFloat(el.style.left),
              top = parseFloat(el.style.top);
            assert(x >= 12 && x + el.offsetWidth <= f.host.clientWidth - 12);
            assert(top >= 12 && top + el.offsetHeight <= f.host.clientHeight - 12);
          }
        }
      }
    }
  }
  // Labels must remain distinct before, during, and after ligand separation.
  for (const [width, height] of [
    [280, 260],
    [350, 329],
    [642, 640],
  ]) {
    const mobile = width < 400;
    const f = await fixture("molstar", "6onj", true, { mobile });
    f.host.clientWidth = width;
    f.host.clientHeight = height;
    const labelHeight = mobile ? 36.4 : 42;
    for (const [name, labelWidth] of [
      ["peptide", mobile ? 124 : 141],
      ["ligand", mobile ? 108 : 120],
    ]) {
      const el = f.parts.get(`.label-${name}`);
      el.offsetWidth = labelWidth;
      el.offsetHeight = labelHeight;
    }
    f.event("resize");
    const box = (name) => {
      const el = f.parts.get(`.label-${name}`);
      return {
        x: parseFloat(el.style.left),
        y: parseFloat(el.style.top),
        width: el.offsetWidth,
        height: el.offsetHeight,
      };
    };
    const separate = (a, b) =>
      a.x + a.width <= b.x ||
      b.x + b.width <= a.x ||
      a.y + a.height <= b.y ||
      b.y + b.height <= a.y;
    const receptorWidth = mobile ? 141 : 164;
    const receptor = {
      x: width * (mobile ? 1 : 0.92) - receptorWidth,
      y: height * 0.88 - labelHeight,
      width: receptorWidth,
      height: labelHeight,
    };
    await f.scrollStory(0);
    const initial = box("ligand");
    for (let y = 0; y <= 2400; y += 50) {
      await f.scrollStory(y);
      assert(
        separate(box("ligand"), box("peptide")),
        `Ligand/peptide overlap at ${width}px, scroll ${y}`,
      );
      assert(
        separate(box("ligand"), receptor),
        `Ligand/receptor overlap at ${width}px, scroll ${y}`,
      );
    }
    assert(box("ligand").x < initial.x - 30, "Separated ligand label shifts clearly left");
    await f.scrollStory(0);
    assert.deepEqual(
      box("ligand"),
      initial,
      "Reverse scrolling restores the initial label position",
    );
  }
  console.log(
    "Initial label spacing, separation sweep, leftward anchor, and reverse positions passed",
  );

  // Move the whole story together. Check actions as each heading ENTERS the
  // viewport, rather than only after it has reached the middle or left it.
  for (const mobile of [false, true]) {
    const f = await fixture("molstar", "6onj", true, { mobile });
    await f.scrollStory(0);
    assert.equal(+f.figure.dataset.progress, 0);
    await f.scrollStory(1400 - 950);
    assert(
      +f.figure.dataset.peptideSeparation > 0.1,
      "Peptide action begins as its own heading enters",
    );
    assert.equal(+f.figure.dataset.ligandSeparation, 0, "Ligand waits for its own concept");
    await f.scrollStory(2400 - 1100);
    assert(
      +f.figure.dataset.ligandSeparation > 0.1,
      "Ligand action is underway when approaching its heading",
    );
    assert.equal(+f.figure.dataset.domainMotion, 0);
    await f.scrollStory(3400 - 1050);
    assert(
      +f.figure.dataset.domainMotion > 0.8,
      "Wiggle is established BEFORE the third headline enters",
    );
    assert(+f.figure.dataset.wiggleAmplitude > 1.6);
    await f.scrollStory(3400 - 950);
    assert.equal(
      +f.figure.dataset.domainMotion,
      1,
      "Full-strength wiggle while the third heading enters view",
    );
    await f.scrollStory(5000 - 950);
    assert(
      +f.figure.dataset.cellProgress > 0.5,
      "Cell pullback is clearly visible on fourth-heading entry",
    );
    await f.scrollStory(6000 - 950);
    assert(+f.figure.dataset.discoveryProgress > 0.5, "Compounds arrive on fifth-heading entry");
    assert(
      f.compoundFrames.some((e) => +e.style.opacity > 0.5),
      "At least one chemical sketch is visible",
    );
    await f.scrollStory(3400 - 950);
    assert.equal(
      +f.figure.dataset.domainMotion,
      1,
      "Reverse scroll restores the action at its heading",
    );
    await f.scrollStory(0);
    assert.equal(+f.figure.dataset.progress, 0);
    assert.equal(+f.figure.dataset.domainMotion, 0);
    const early = await fixture("molstar", "6onj", true, {
      mobile,
      pacing: {
        desktop: { transition_scroll_multiplier: 2, action_lead_vh: 40 },
        mobile: { transition_scroll_multiplier: 2, action_lead_vh: 40 },
      },
    });
    await f.scrollStory(3400 - 1250);
    await early.scrollStory(3400 - 1250);
    assert.equal(+f.figure.dataset.domainMotion, 0);
    assert(
      +early.figure.dataset.domainMotion > 0.8,
      "Increasing action lead starts the motion earlier",
    );
  }
  console.log(
    "All five actions match approaching headings; action lead, full entry-strength wiggle, and reversal passed",
  );
  // Sweep actual heading positions, not a timer: longer viewing distance must
  // not delay the start of wiggle or weaken its full-strength plateau.
  for (const mobile of [false, true]) {
    const f = await fixture("molstar", "6onj", true, { mobile });
    const cellWindow = expandedTiming(cellPresentation, mobile);
    const oldWindow = cellPresentation[mobile ? "mobile" : "desktop"];
    assert(
      Math.abs((cellWindow.start - cellWindow.end) / (oldWindow.start - oldWindow.end) - 2) < 1e-9,
    );
    for (const thirdTop of [700, 400, 100, -200]) {
      await f.scroll(1.2, thirdTop, thirdTop + 1600);
      assert(
        +f.figure.dataset.domainMotion > 0.6,
        "Wiggle remains visible over a long scroll distance",
      );
      assert(
        +f.figure.dataset.cellProgress < 0.08,
        "Hold the molecule, with only a gentle fade at the end of the long viewing interval",
      );
    }
    await f.scroll(1.4, -500, oldWindow.start * 1000);
    assert(
      +f.figure.dataset.cellProgress > 0.4,
      "Pullback is well underway at the former start position",
    );
    assert(
      +f.figure.dataset.domainMotion > 0,
      "Wiggle fades with the pullback, without a separate early cutoff",
    );
    let previous = 0;
    const samples = [];
    for (
      let position = cellWindow.start * 1000;
      position >= cellWindow.end * 1000 - 1;
      position -= 50
    ) {
      await f.scroll(1.5, -700, position);
      const current = +f.figure.dataset.cellProgress;
      assert(current >= previous, "Forward scroll is monotonic");
      samples.push([position, current]);
      previous = current;
    }
    for (const [position, expected] of samples.reverse()) {
      await f.scroll(1.5, -700, position);
      assert.equal(
        +f.figure.dataset.cellProgress,
        expected,
        "Reverse scroll follows the same longer path",
      );
    }
    const original = await fixture("molstar", "6onj", true, {
      mobile,
      pacing: {
        desktop: { transition_scroll_multiplier: 1, action_lead_vh: 0 },
        mobile: { transition_scroll_multiplier: 1, action_lead_vh: 0 },
      },
    });
    await original.scroll(1.4, -500, oldWindow.start * 1000);
    assert.equal(
      +original.figure.dataset.cellProgress,
      0,
      "Multiplier 1 restores the original transition window",
    );
    await original.scroll(1.4, -500, (oldWindow.start + oldWindow.end) * 500);
    assert.equal(+original.figure.dataset.cellProgress, 0.5);
    const custom = await fixture("molstar", "6onj", true, {
      mobile,
      pacing: {
        desktop: { transition_scroll_multiplier: 2.5 },
        mobile: { transition_scroll_multiplier: 2.5 },
      },
    });
    const customWindow = expandedTiming(cellPresentation, mobile, 2.5);
    await custom.scroll(1.4, -500, (customWindow.start + customWindow.end) * 500);
    assert.equal(+custom.figure.dataset.cellProgress, 0.5, "Custom pacing takes effect");
  }
  console.log(
    "Longer wiggle window, earlier cell transition, custom pacing, monotonic scroll, and exact reversal passed",
  );
  const loading = await fixture("molstar", "6onj", true, { deferFirstFrame: true });
  assert.equal(
    loading.figure.dataset.renderer,
    "loading",
    "A created adapter is still hidden until it draws",
  );
  assert.equal(loading.figure.classList.contains("molecule-ready"), false);
  assert.equal(loading.figure["aria-busy"], "true");
  assert.equal(loading.button.hidden, true);
  assert(
    loading.mockAdapter.state,
    "The requested camera/pose is submitted before revealing the canvas",
  );
  loading.firstFrameCallbacks[0]();
  await loading.tick(2);
  assert.equal(loading.figure.dataset.renderer, "molstar");
  assert.equal(loading.figure["aria-busy"], "false");
  assert.equal(loading.parts.get(".renderer-status").textContent, "");
  loading.display.state.structure = "6oni";
  await loading.event("displaychange");
  await loading.tick(3);
  assert.equal(loading.figure.dataset.renderer, "loading", "PDB switching also hides the poster");
  loading.firstFrameCallbacks[0]();
  await loading.tick(2);
  assert.equal(
    loading.figure.dataset.renderer,
    "loading",
    "A superseded renderer cannot reveal the new view",
  );
  await loading.scroll(2.3, -1500, -900, 100);
  assert.equal(
    loading.mockAdapter.suspended,
    false,
    "Loading at the cell stage still permits the first Mol* draw",
  );
  loading.firstFrameCallbacks.at(-1)();
  await loading.tick(2);
  assert.equal(loading.figure.dataset.renderer, "molstar");
  assert.equal(
    loading.mockAdapter.suspended,
    true,
    "After the first frame, hidden Mol* can suspend normally",
  );
  loading.host.webglcontextlost({ preventDefault() {} });
  await loading.tick(2);
  assert.equal(loading.figure.dataset.renderer, "static");
  assert.equal(loading.figure["aria-busy"], "false");
  assert(loading.parts.get(".renderer-status").textContent.includes("still structure"));
  console.log(
    "Loading gate, configured first frame, stale callbacks, PDB switching, cell-stage startup, and fallback passed",
  );
  for (const renderer of ["molstar", "threejs", "pymol_rendered"]) {
    const f = await fixture(renderer);
    assert.equal(f.figure.dataset.renderer, "molstar");
    await f.scroll(0.8, 1600, 3000);
    assert.equal(+f.figure.dataset.domainMotion, 0, "No rocking during the first two transitions");
    assert.equal(+f.figure.dataset.wiggleAmplitude, 0);
    await f.scroll(1, 200, 1600);
    await f.tick(15);
    assert(+f.figure.dataset.domainMotion > 0.9);
    assert(Math.abs(+f.figure.dataset.domainAngle) > 0.005);
    assert(
      +f.figure.dataset.wiggleAmplitude > 1.8,
      "Internal wiggle is clearly enabled at the third section",
    );
    assert.equal(+f.figure.dataset.peptideSeparation, 1);
    assert.equal(+f.figure.dataset.ligandSeparation, 1);
    f.button.click();
    await f.tick(2);
    const frozen = f.figure.dataset.domainAngle;
    const frozenClock = f.mockAdapter.state.motionTime;
    const frozenWiggle = f.figure.dataset.wiggleAmplitude;
    await f.scroll(1.5, -500, 200);
    await f.tick(10);
    assert.equal(f.figure.dataset.domainAngle, frozen, "Pause freezes the rocking pose and scroll");
    assert.equal(f.mockAdapter.state.motionTime, frozenClock, "Pause freezes the shader clock");
    assert.equal(f.figure.dataset.wiggleAmplitude, frozenWiggle, "Pause preserves the flexed pose");
    assert.equal(f.frames.size, 0);
    f.button.click();
    await f.tick(2);
    assert.equal(+f.figure.dataset.domainAngle, 0, "Fourth section settles to the final pose");
    assert.equal(+f.figure.dataset.wiggleAmplitude, 0);
    await f.scroll(1, 200, 1600);
    await f.tick(8);
    f.visibility(false);
    await f.tick(2);
    assert.equal(f.frames.size, 0);
    assert.equal(f.mockAdapter.suspended, true);
    f.visibility(true);
    await f.tick(3);
    assert(f.frames.size > 0);
    assert.equal(f.mockAdapter.suspended, false);
    f.document.hidden = true;
    f.event("visibilitychange");
    await f.tick(2);
    assert.equal(f.frames.size, 0);
    f.document.hidden = false;
    f.event("visibilitychange");
    await f.tick(2);
    f.reduced.matches = true;
    f.reduced.change();
    await f.tick(3);
    assert.equal(+f.figure.dataset.domainAngle, 0);
    assert.equal(+f.figure.dataset.wiggleAmplitude, 0);
    assert.equal(+f.figure.dataset.progress, 0);
    assert.equal(f.frames.size, 0);
    f.reduced.matches = false;
    f.reduced.change();
    await f.tick(2);
    await f.scroll(0, 2500, 3200);
    assert.equal(+f.figure.dataset.domainAngle, 0);
    assert.equal(+f.figure.dataset.progress, 0);
    assert(!f.requests.some((url) => /three|frames|data\.json/.test(url)));
    console.log(
      "Prior choice " +
        renderer +
        ": Mol* only; motion, pause, reverse, visibility, and reduced-motion checks passed",
    );
  }
  const covalent = await fixture("molstar", "6oni");
  await covalent.scroll(1, 200, 1600);
  await covalent.tick(10);
  assert.equal(+covalent.figure.dataset.ligandSeparation, 0);
  assert.equal(covalent.settingsHistory[0].ligand_moves_with_domain, true);
  covalent.display.state.palette = "colorblind";
  await covalent.event("displaychange");
  await covalent.tick(3);
  assert.equal(covalent.figure.dataset.renderer, "molstar");
  const camera6oni = covalent.settingsHistory[0].orientation;
  covalent.display.state.structure = "6onj";
  await covalent.event("displaychange");
  await covalent.tick(5);
  assert.equal(covalent.figure.dataset.structure, "6onj");
  assert.equal(covalent.parts.get(".label-ligand small").textContent, "agonist");
  assert.equal(covalent.parts.get(".label-peptide .component-name").textContent, "MED1");
  assert.notDeepEqual(covalent.settingsHistory.at(-1).orientation, camera6oni);
  assert.equal(covalent.settingsHistory.at(-1).ligand_moves_with_domain, false);
  covalent.display.state.structure = "6oni";
  await covalent.event("displaychange");
  await covalent.tick(5);
  assert.deepEqual(covalent.settingsHistory.at(-1).orientation, camera6oni);
  assert.equal(covalent.parts.get(".label-ligand small").textContent, "inverse agonist");
  covalent.host.webglcontextlost({ preventDefault() {} });
  await covalent.tick(3);
  assert.equal(covalent.figure.dataset.renderer, "static");
  assert.equal(covalent.frames.size, 0);
  assert(!covalent.requests.some((url) => /three|frames|data\.json/.test(url)));
  const disabled = await fixture("molstar", "6onj", false);
  await disabled.scroll(1, 200, 1600);
  await disabled.tick(10);
  assert.equal(+disabled.figure.dataset.domainAngle, 0);
  assert.equal(+disabled.figure.dataset.wiggleAmplitude, 0);
  assert.equal(disabled.frames.size, 0);
  console.log(
    "Independent PDB camera switching, covalent ligand, static fallback, and motion off-switch passed",
  );
  for (const pdb of ["6onj", "6oni"]) {
    for (const mobile of [false, true]) {
      const f = await fixture("molstar", pdb, true, { mobile });
      const mode = () => f.document.documentElement.classList.contains("cell-transition-enabled");
      const timing = expandedTiming(cellPresentation, mobile);
      assert.equal(mode(), true);
      await f.scroll(1, 200, timing.start * 1000 + 100);
      assert.equal(+f.figure.dataset.cellProgress, 0, "Keep the third section molecular");
      await f.scroll(1.3, -200, (timing.start + timing.end) * 500);
      assert.equal(+f.figure.dataset.cellProgress, 0.5, "Halfway through the pullback");
      const layer = f.parts.get(".molecule-layer");
      assert(layer.style.transform.includes("scale(0.187"), "Protein shrinks during the pullback");
      f.button.click();
      await f.tick(2);
      const frozen = layer.style.transform;
      await f.scroll(1.6, -500, timing.end * 1000 - 100);
      assert.equal(layer.style.transform, frozen, "Pause freezes the zoom during scroll");
      f.button.click();
      await f.tick(2);
      assert.equal(+f.figure.dataset.cellProgress, 1);
      assert.equal(layer.style.opacity, "0");
      assert.equal(f.mockAdapter.suspended, true, "Suspend hidden Mol* after the pullback");
      assert.equal(f.parts.get(".pdb-link").hidden, true);
      assert.equal(f.parts.get(".cell-scene")["aria-hidden"], "false");
      assert.equal(f.parts.get(".figure-note").textContent, cellPresentation.note);
      assert.equal(
        f.frames.size,
        0,
        "The settled cell is still, with no continuing animation loop",
      );
      await f.scroll(2, -1000, -500);
      assert.equal(+f.figure.dataset.cellProgress, 1, "Hold the cell through the final topic");
      await f.scroll(1, 200, timing.start * 1000 + 100);
      assert.equal(+f.figure.dataset.cellProgress, 0, "Reverse scroll restores the molecule");
      assert.equal(f.mockAdapter.suspended, false);
      assert.equal(f.parts.get(".pdb-link").hidden, false);
      f.reduced.matches = true;
      f.reduced.change();
      await f.tick(3);
      assert.equal(mode(), false, "Reduced motion exposes the inline still figure");
      assert.equal(+f.figure.dataset.cellProgress, 0);
      f.reduced.matches = false;
      f.reduced.change();
      await f.tick(2);
      await f.scroll(1.6, -500, 100);
      f.host.webglcontextlost({ preventDefault() {} });
      await f.tick(3);
      assert.equal(mode(), false, "WebGL fallback exposes the inline still figure");
      assert.equal(layer.style.opacity, "1", "Fallback poster remains visible");
      console.log(
        pdb +
          (mobile ? " mobile" : " desktop") +
          ": cell zoom, hold, reverse, pause, GPU suspension, and still fallbacks passed",
      );
    }
  }
  for (const cell of [{ enabled: false }, { failed: true }, { reduced: true }]) {
    const f = await fixture("molstar", "6onj", true, cell);
    await f.scroll(1.5, -500, 100);
    assert.equal(+f.figure.dataset.cellProgress, 0);
    assert.equal(f.document.documentElement.classList.contains("cell-transition-enabled"), false);
    assert.equal(f.parts.get(".molecule-layer").style.opacity, "1");
  }
  const lateImage = await fixture("molstar", "6onj", true, { failed: true });
  await lateImage.scroll(1.6, -500, 100);
  lateImage.parts.get(".cell-illustration").naturalWidth = 1280;
  lateImage.parts.get(".cell-illustration").load();
  await lateImage.tick(2);
  assert.equal(
    +lateImage.figure.dataset.cellProgress,
    1,
    "A late-loading image joins the current scroll position",
  );
  lateImage.parts.get(".cell-illustration").error();
  await lateImage.tick(2);
  assert.equal(+lateImage.figure.dataset.cellProgress, 0);
  assert.equal(lateImage.parts.get(".molecule-layer").style.opacity, "1");
  console.log("Cell off-switch, image load/error, and initial reduced-motion checks passed");
  for (const pdb of ["6onj", "6oni"]) {
    for (const mobile of [false, true]) {
      const f = await fixture("molstar", pdb, true, { mobile });
      const timing = expandedTiming(discoveryPresentation, mobile);
      const mode = () =>
        f.document.documentElement.classList.contains("discovery-transition-enabled");
      assert.equal(mode(), true);
      await f.scroll(1.8, -900, -100, timing.start * 1000 + 100);
      assert.equal(+f.figure.dataset.cellProgress, 1);
      assert.equal(
        +f.figure.dataset.discoveryProgress,
        0,
        "The fourth topic retains the full cell",
      );
      assert.equal(+f.figure.dataset.discoveryCellScale, 1);
      assert(f.compoundFrames.every((e) => e.style.opacity === "0"));
      assert.equal(
        f.parts.get(".cell-illustration").style.opacity,
        "1",
        "The fourth-topic cell stays opaque",
      );
      await f.scroll(2, -1200, -600, (timing.start + timing.end) * 500);
      assert.equal(+f.figure.dataset.discoveryProgress, 0.5);
      assert(
        +f.figure.dataset.discoveryCellScale < 0.72,
        "Cell pulls back before the compounds settle",
      );
      assert(
        +f.figure.dataset.discoveryCellOpacity < 1 &&
          +f.figure.dataset.discoveryCellOpacity > discoveryPresentation.cell_opacity,
      );
      assert(
        new Set(f.compoundFrames.map((e) => e.dataset.arrival)).size > 1,
        "Compounds arrive with distinct timing",
      );
      assert.equal(f.parts.get(".figure-index").textContent, discoveryPresentation.caption);
      assert.equal(f.parts.get(".figure-note").textContent, discoveryPresentation.note);
      const snapshot = () =>
        JSON.stringify([
          f.figure.dataset.discoveryProgress,
          f.parts.get(".cell-artboard").style.transform,
          f.compoundFrames.map((e) => e.style.transform),
        ]);
      const halfway = snapshot();
      f.button.click();
      await f.tick(2);
      await f.scroll(2.3, -1500, -900, timing.end * 1000 - 100);
      assert.equal(snapshot(), halfway, "Pause freezes both the extra pullback and compounds");
      f.button.click();
      await f.tick(2);
      assert.equal(+f.figure.dataset.discoveryProgress, 1);
      assert.equal(+f.figure.dataset.discoveryCellScale, discoveryPresentation.cell_scale);
      assert(
        f.compoundFrames.every((e) => e.dataset.arrival === "1.0000" && e.style.opacity === "1"),
      );
      assert.equal(
        f.mockAdapter.suspended,
        true,
        "Mol* stays suspended throughout chemical discovery",
      );
      assert.equal(
        +f.parts.get(".cell-illustration").style.opacity,
        discoveryPresentation.cell_opacity,
      );
      assert(f.frames.size > 0, "Contact rings continue twinkling after arrival");
      const rings = () =>
        f.compoundFrames.map((_, i) => f.parts.get(`[data-contact="${i}"]`).style.opacity);
      const firstGlow = rings();
      await f.tick(20);
      assert.notDeepEqual(
        rings(),
        firstGlow,
        "Twinkle brightness changes while the composition is stationary",
      );
      for (let i = 0; i < f.compoundFrames.length; i++) {
        const opacity = +rings()[i];
        assert(opacity >= 0.12 && opacity <= 0.35, "Ring glow stays gentle and visible");
      }
      f.button.click();
      await f.tick(2);
      const frozenGlow = rings();
      await f.tick(20);
      assert.deepEqual(rings(), frozenGlow, "Pause freezes the actual twinkle phase");
      assert.equal(f.frames.size, 0);
      f.button.click();
      await f.tick(4);
      assert.notDeepEqual(rings(), frozenGlow);
      f.document.hidden = true;
      f.event("visibilitychange");
      await f.tick(3);
      const hiddenGlow = rings();
      await f.tick(20);
      assert.equal(f.frames.size, 0);
      assert.deepEqual(rings(), hiddenGlow);
      f.document.hidden = false;
      f.event("visibilitychange");
      await f.tick(4);
      assert.notDeepEqual(rings(), hiddenGlow);
      await f.scroll(2, -1200, -600, (timing.start + timing.end) * 500);
      assert.equal(snapshot(), halfway, "Reverse scrolling exactly retraces the same poses");
      f.visibility(false);
      await f.tick(2);
      await f.scroll(2.3, -1500, -900, 100);
      assert.equal(snapshot(), halfway, "Offscreen scroll does not draw");
      f.visibility(true);
      await f.tick(2);
      assert.equal(+f.figure.dataset.discoveryProgress, 1);
      await f.scroll(1.8, -900, -100, timing.start * 1000 + 100);
      assert.equal(+f.figure.dataset.discoveryProgress, 0);
      assert.equal(+f.figure.dataset.discoveryCellScale, 1);
      assert.equal(
        f.parts.get(".cell-illustration").style.opacity,
        "1",
        "Reverse scroll restores cell opacity",
      );
      await f.scroll(2.3, -1500, -900, 100);
      f.reduced.matches = true;
      f.reduced.change();
      await f.tick(2);
      assert.equal(mode(), false, "Reduced motion exposes the inline discovery still");
      assert.equal(+f.figure.dataset.discoveryProgress, 0);
      assert.equal(f.parts.get(".discovery-scene").style.opacity, "0");
      assert.equal(f.frames.size, 0, "Reduced motion stops the twinkle clock");
      f.reduced.matches = false;
      f.reduced.change();
      await f.tick(2);
      assert.equal(+f.figure.dataset.discoveryProgress, 1);
      f.host.webglcontextlost({ preventDefault() {} });
      await f.tick(2);
      assert.equal(mode(), false, "WebGL failure exposes the discovery still");
      assert.equal(+f.figure.dataset.discoveryProgress, 0);
      console.log(
        pdb +
          (mobile ? " mobile" : " desktop") +
          ": discovery pullback, six staggered approaches, exact reverse, pause, suspension, and static fallback passed",
      );
    }
  }
  for (const settings of [
    { discoveryEnabled: false },
    { enabled: false },
    { sketchFailed: true },
    { reduced: true },
  ]) {
    const f = await fixture("molstar", "6onj", true, settings);
    await f.scroll(2.3, -1500, -900, 100);
    assert.equal(+f.figure.dataset.discoveryProgress, 0);
    assert.equal(+f.figure.dataset.discoveryCellScale, 1);
    assert.equal(
      f.document.documentElement.classList.contains("discovery-transition-enabled"),
      false,
    );
  }
  for (const settings of [{ twinkle: false }, { rings: false }]) {
    const f = await fixture("molstar", "6onj", true, settings);
    await f.scroll(2.3, -1500, -900, 100);
    await f.tick(4);
    assert.equal(f.frames.size, 0, "Disabling rings or twinkling stops the idle loop");
    for (let i = 0; i < f.compoundFrames.length; i++)
      assert(+f.parts.get(`[data-contact="${i}"]`).style.opacity < 0.000001);
  }
  const sketches = await fixture("molstar", "6onj", true, { sketchFailed: true });
  await sketches.scroll(2.3, -1500, -900, 100);
  const firstImage = sketches.compoundFrames[0].image;
  firstImage.naturalWidth = 1536;
  firstImage.load();
  await sketches.tick(2);
  assert.equal(
    +sketches.figure.dataset.discoveryProgress,
    1,
    "A late sketch joins the current scroll position",
  );
  assert.equal(
    sketches.compoundFrames[1].style.visibility,
    "hidden",
    "Unavailable individual images stay hidden",
  );
  firstImage.naturalWidth = 0;
  firstImage.error();
  await sketches.tick(2);
  assert.equal(+sketches.figure.dataset.discoveryProgress, 0);
  assert.equal(+sketches.figure.dataset.discoveryCellScale, 1);
  console.log(
    "Discovery off-switches, late images, failed images, and reduced-motion startup passed",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
