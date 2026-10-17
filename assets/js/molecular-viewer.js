/* Mol* scroll choreography. The adapter draws the current state.
   Separation, rocking, and procedural internal wiggle are illustrative. */
(() => {
  const figure = document.getElementById("molecule");
  if (!figure) return;
  const story = document.getElementById("molecular-story");
  const stage = story.querySelector(".story-stage");
  const host = figure.querySelector(".molecule-renderer");
  const button = figure.querySelector(".motion-toggle");
  const status = figure.querySelector(".renderer-status");
  const noteElement = figure.querySelector(".figure-note-text");
  const options = JSON.parse(document.getElementById("hero-config").textContent);
  const scrollOptions = JSON.parse(
    document.getElementById("scroll-story-config")?.textContent || "{}",
  );
  const cellOptions = JSON.parse(document.getElementById("cell-config")?.textContent || "{}");
  const discoveryOptions = JSON.parse(
    document.getElementById("discovery-config")?.textContent || "{}",
  );
  const discoveryScene = figure.querySelector(".discovery-scene");
  const discoveryArtboard = figure.querySelector(".discovery-artboard");
  const compounds = Array.from(figure.querySelectorAll(".compound-flight")).map(
    (element, index) => ({
      element,
      image: element.querySelector("img"),
      contact: figure.querySelector(`[data-contact="${index}"]`),
      settings: discoveryOptions.compounds?.[index] || {},
    }),
  );
  const cellScene = figure.querySelector(".cell-scene");
  const cellImage = figure.querySelector(".cell-illustration");
  const cellArtboard = figure.querySelector(".cell-artboard");
  const cellArt = figure.querySelector(".cell-art");
  const moleculeLayer = figure.querySelector(".molecule-layer");
  const display = window.KojetinDisplay;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const scripts = new Map();
  const jsonCache = new Map();
  const labelSizes = new Map();
  let adapter,
    scene,
    cameraView,
    progress = 0,
    paused = false,
    frame = 0;
  let desiredStructure,
    generation = 0,
    paletteGeneration = 0;
  let visible = true;
  let cellReady = false,
    cellProgress = 0,
    discoveryProgress = 0;
  let domainStrength = 0,
    motionTime = 0,
    lastMotionTime = 0,
    lastDrawTime = 0;
  let twinkleTime = 0,
    lastTwinkleTime = 0;
  let availableFigureHeight = null;
  const firstHeading = story.querySelector('[data-step="1"] h2');
  const secondHeading = story.querySelector('[data-step="2"] h2');
  const thirdHeading = story.querySelector('[data-step="3"] h2');
  const fourthHeading = story.querySelector('[data-step="4"] h2');
  const fifthHeading = story.querySelector('[data-step="5"] h2');

  const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
  const smooth = (a, b, t) => {
    const x = clamp((t - a) / (b - a));
    return x * x * (3 - 2 * x);
  };
  const assetPath = (path) => figure.dataset.assets + path;
  const embedded = (path) => window.KojetinPreviewAssets?.[assetPath(path)];
  const assetURL = (path) => `${assetPath(path)}?v=${figure.dataset.version}`;
  const imageURL = (path) => embedded(path) || assetURL(path);

  function cellEnabled() {
    return !!(cellOptions.enabled && cellReady && adapter && !reduced.matches);
  }

  function discoveryEnabled() {
    return !!(
      cellEnabled() &&
      discoveryOptions.enabled &&
      discoveryScene &&
      compounds.some(({ image }) => image?.naturalWidth > 0)
    );
  }

  function updateCellMode() {
    document.documentElement.classList.toggle("cell-transition-enabled", cellEnabled());
    document.documentElement.classList.toggle("discovery-transition-enabled", discoveryEnabled());
  }

  // A shared scroll clock drives both transitions: no timers or CSS animations.
  function headlineProgress(heading, config, mobile, stretch = true) {
    if (!heading) return 0;
    const timing = config[mobile ? "mobile" : "desktop"] || {};
    const start = clamp(
      Number.isFinite(Number(timing.start)) ? Number(timing.start) : 0.9,
      0.01,
      2,
    );
    const end = clamp(
      Number.isFinite(Number(timing.end)) ? Number(timing.end) : 0.4,
      0,
      start - 0.01,
    );
    const configuredMultiplier = Number(
      scrollOptions[mobile ? "mobile" : "desktop"]?.transition_scroll_multiplier ?? 2,
    );
    const multiplier = stretch
      ? clamp(Number.isFinite(configuredMultiplier) ? configuredMultiplier : 2, 1, 3)
      : 1;
    const configuredLead = Number(
      scrollOptions[mobile ? "mobile" : "desktop"]?.action_lead_vh ?? 20,
    );
    const lead = clamp(Number.isFinite(configuredLead) ? configuredLead : 20, 0, 60) / 100;
    // Stretch the window, then shift the whole window earlier. The separate
    // lead preserves its length while establishing the action as text arrives.
    const earlierStart = end + (start - end) * multiplier + lead;
    return 1 - smooth(end + lead, earlierStart, heading.getBoundingClientRect().top / innerHeight);
  }

  function drawDiscovery(size, cellT) {
    const d = discoveryEnabled() ? discoveryProgress * smooth(0.9, 1, cellT) : 0;
    const finalScale = clamp(Number(discoveryOptions.cell_scale) || 0.67, 0.4, 1);
    const cellScale = 1 - (1 - finalScale) * smooth(0, 0.55, d);
    const finalOpacity = clamp(Number(discoveryOptions.cell_opacity ?? 0.5));
    const cellOpacity = 1 - (1 - finalOpacity) * smooth(0.05, 0.65, d);
    if (cellImage) cellImage.style.opacity = String(cellOpacity);
    if (cellArtboard) cellArtboard.style.transform = `translate(-50%, -50%) scale(${cellScale})`;
    if (discoveryScene) {
      discoveryScene.style.opacity = String(d > 0 ? 1 : 0);
      discoveryArtboard.style.width = discoveryArtboard.style.height = `${size}px`;
      const distance = clamp(Number(discoveryOptions.entry_distance) || 2.8, 1.2, 5);
      for (const [index, compound] of compounds.entries()) {
        const settings = compound.settings;
        const delay = clamp(Number(settings.delay) || 0, 0, 0.5);
        const arrival = clamp((d - delay) / (0.84 + delay * 0.3 - delay));
        // A small overshoot gives the approach a quick marker-on-glass flourish.
        const u = arrival - 1;
        const ease = 1 + 1.65 * u * u * u + 0.65 * u * u;
        const radius = distance + (1 - distance) * ease;
        const target = settings.target || [0, 0];
        const x = clamp(Number(target[0]) || 0, -0.5, 0.5) * size;
        const y = clamp(Number(target[1]) || 0, -0.5, 0.5) * size;
        const rotation = (Number(settings.rotation) || 0) + (index % 2 ? 16 : -16) * (1 - ease);
        compound.element.style.left = compound.element.style.top = "50%";
        compound.element.style.transform = `translate(-50%, -50%) translate(${x * radius}px, ${y * radius}px) rotate(${rotation}deg) scale(${0.82 + 0.18 * ease})`;
        compound.element.style.opacity = String(smooth(0, 0.18, arrival));
        compound.element.style.visibility = compound.image?.naturalWidth > 0 ? "visible" : "hidden";
        compound.element.dataset.arrival = arrival.toFixed(4);
        if (compound.contact) {
          const pulse = clamp((arrival - 0.66) / 0.34);
          const period = clamp(
            Number(discoveryOptions.contact_twinkle_period_seconds) || 2.8,
            1.5,
            20,
          );
          const glow = (1 + Math.sin((twinkleTime * Math.PI * 2) / period + index * 1.7)) / 2;
          const blend = discoveryOptions.twinkle_contact_rings ? smooth(0.82, 1, arrival) : 0;
          const opacity =
            (1 - blend) * 0.32 * Math.sin(Math.PI * pulse) + blend * (0.12 + 0.23 * glow);
          const scale = (1 - blend) * (0.5 + 1.5 * pulse) + blend * (1.2 + 0.22 * glow);
          compound.contact.style.opacity = String(
            discoveryOptions.show_contact_rings && compound.image?.naturalWidth > 0 ? opacity : 0,
          );
          compound.contact.style.transform = `translate(-50%, -50%) translate(${x * 0.75}px, ${y * 0.75}px) scale(${scale})`;
        }
      }
    }
    figure.dataset.discoveryProgress = d.toFixed(4);
    figure.dataset.discoveryCellScale = cellScale.toFixed(4);
    figure.dataset.discoveryCellOpacity = cellOpacity.toFixed(4);
    return d;
  }

  function drawCellTransition() {
    const t = cellEnabled() ? cellProgress : 0;
    const size = Math.min(host.clientWidth, host.clientHeight);
    const anchor = cellOptions.nucleus_anchor || [0.19, 0.51];
    const x = (clamp(Number(anchor[0])) - 0.5) * size;
    const y = (clamp(Number(anchor[1])) - 0.5) * size;
    const zoom = clamp(Number(cellOptions.start_zoom) || 4.5, 1, 8);
    const discoveryT = drawDiscovery(size, t);
    if (cellScene) {
      cellArtboard.style.width = cellArtboard.style.height = `${size}px`;
      cellArt.style.transformOrigin = `${clamp(Number(anchor[0])) * 100}% ${clamp(Number(anchor[1])) * 100}%`;
      // Keep the nucleus and molecular center registered throughout the pullback.
      cellArt.style.transform = `translate(${-x * (1 - t)}px, ${-y * (1 - t)}px) scale(${Math.pow(zoom, 1 - t)})`;
      cellScene.style.opacity = String(smooth(0, 0.3, t));
      cellScene.style.setProperty(
        "--cell-label-opacity",
        String(smooth(0.7, 1, t) * (1 - smooth(0.02, 0.35, discoveryT))),
      );
      cellScene.setAttribute("aria-hidden", String(t < 0.6));
    }
    moleculeLayer.style.transform = `translate(${x * t}px, ${y * t}px) scale(${Math.pow(0.035, t)})`;
    moleculeLayer.style.opacity = String(1 - smooth(0.55, 0.92, t));
    moleculeLayer.setAttribute("aria-hidden", String(t >= 0.6));
    figure.style.setProperty("--molecule-label-opacity", String(1 - smooth(0, 0.18, t)));
    figure
      .querySelectorAll(".molecule-label")
      .forEach((element) => element.setAttribute("aria-hidden", String(t > 0.1)));
    figure.querySelector(".figure-index").textContent =
      discoveryT > 0.2
        ? discoveryOptions.caption
        : t >= 0.6
          ? cellOptions.caption
          : "MOLECULAR INTERACTIONS";
    figure.querySelector(".pdb-link").hidden = t >= 0.6;
    figure.dataset.cellProgress = t.toFixed(4);
    return t;
  }

  async function readJSON(path) {
    if (!jsonCache.has(path))
      jsonCache.set(
        path,
        (async () => {
          if (embedded(path)) return JSON.parse(embedded(path));
          const response = await fetch(assetURL(path));
          if (!response.ok) throw new Error(`Could not load ${path}`);
          return response.json();
        })(),
      );
    return jsonCache.get(path);
  }

  function loadScript(path) {
    if (!scripts.has(path))
      scripts.set(
        path,
        new Promise((resolve, reject) => {
          const script = document.createElement("script");
          if (embedded(path)) {
            script.textContent = embedded(path);
            document.head.append(script);
            resolve();
          } else {
            script.src = assetURL(path);
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Could not load ${path}`));
            document.head.append(script);
          }
        }),
      );
    return scripts.get(path);
  }

  const preset = () => display.structures[display.state.structure];
  const structurePath = (key, file) => `molecular/${key}/${file}`;
  function showIdentity(config, key) {
    for (const name of ["receptor", "peptide", "ligand"])
      figure.querySelector(`.label-${name} .component-name`).textContent = config[name];
    figure.querySelector(".label-peptide small").textContent = config.peptide_role;
    figure.querySelector(".label-ligand small").textContent = config.ligand_role || "ligand";
    labelSizes.clear();
    noteElement.textContent = config.note;
    const link = figure.querySelector(".pdb-link");
    link.href = `https://www.rcsb.org/structure/${config.pdb_id}`;
    link.textContent = `PDB ${config.pdb_id} ↗`;
    story.querySelector(".interaction-text").textContent = config.interaction_text;
    const poster = figure.querySelector(".molecule-poster");
    poster.src = imageURL(structurePath(key, `posters/${display.state.palette}.webp`));
    poster.alt = `${config.receptor} with ${config.ligand} and ${config.peptide}, PDB ${config.pdb_id}.`;
    figure.dataset.structure = key;
  }

  function stateAt(p) {
    const period = Math.max(1, Number(options.domain_motion_period_seconds) || 4.5);
    const phase = (motionTime * Math.PI * 2) / period;
    return {
      progress: p,
      motionTime,
      wiggleAmplitude:
        clamp(Number(options.domain_wiggle_amplitude_angstroms) || 0, 0, 5) *
        (reduced.matches ? 0 : domainStrength),
      domainAngle:
        ((((Number(options.domain_motion_degrees) || 0) * Math.PI) / 180) *
          (reduced.matches ? 0 : domainStrength) *
          (Math.sin(phase) + 0.2 * Math.sin(2 * phase))) /
        1.2,
      peptideT: options.enable_peptide_separation ? smooth(0.13, 0.48, p) : 0,
      ligandT:
        options.enable_ligand_separation && preset().allow_ligand_separation
          ? smooth(0.44, 0.78, p)
          : 0,
      angle: options.enable_rotation ? 0.28 * smooth(0, 1, p) : 0,
      span:
        (cameraView.span + (innerWidth <= 700 ? 3 : 0)) /
        (1 - cameraView.zoom.amount * smooth(cameraView.zoom.start, cameraView.zoom.end, p)),
    };
  }

  function label(name, state) {
    const element = figure.querySelector(`.label-${name}`);
    if (!element || !scene) return;
    const offset =
      name === "peptide"
        ? [16, 17, 2].map((v) => v * state.peptideT)
        : [-23, -8, 12].map((v) => v * state.ligandT);
    const point = cameraView.orientation.map(
      (row, i) =>
        row.reduce((total, v, j) => total + v * scene.centers[name][j], 0) +
        cameraView.offset[i] +
        offset[i],
    );
    let x = Math.cos(state.angle) * point[0] + Math.sin(state.angle) * point[2];
    let y = point[1];
    const z = -Math.sin(state.angle) * point[0] + Math.cos(state.angle) * point[2];
    if (name === "ligand" && !preset().allow_ligand_separation) {
      const c = Math.cos(state.domainAngle),
        s = Math.sin(state.domainAngle);
      [x, y] = [c * x - s * y, s * x + c * y];
    }
    const distance = state.span / Math.tan(cameraView.fov / 2);
    const projection = cameraView.mode === "perspective" ? distance / (distance - z) : 1;
    const aspect = host.clientWidth / host.clientHeight;
    const view = preset().view || {};
    const layout = view.label_layout?.[name] || {};
    const initial = layout.initial || {};
    const separated = layout.separated || initial;
    const initialOffset = initial.offset || view.label_offsets?.[name] || [0, 0];
    const separatedOffset = separated.offset || initialOffset;
    const anchors = {
      "top-left": [0, 0],
      "top-right": [1, 0],
      "bottom-left": [0, 1],
      "bottom-right": [1, 1],
    };
    const initialAnchor = anchors[initial.anchor] || anchors["top-left"];
    const separatedAnchor = anchors[separated.anchor] || initialAnchor;
    // Follow each component's own separation, including when the story reverses.
    const t = name === "peptide" ? state.peptideT : state.ligandT;
    const blend = (a, b) => a + (b - a) * t;
    const number = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);
    const shiftX = blend(number(initialOffset[0]), number(separatedOffset[0]));
    const shiftY = blend(number(initialOffset[1]), number(separatedOffset[1]));
    const left = 50 + ((x * projection) / (2 * state.span * aspect)) * 100 + shiftX;
    const top = 50 - ((y * projection) / (2 * state.span)) * 100 + shiftY;
    // Clamp the entire label, not just its anchor. Cache measurements so the
    // wiggle clock does not need a layout read on every frame.
    if (!labelSizes.has(name))
      labelSizes.set(name, { width: element.offsetWidth, height: element.offsetHeight });
    const size = labelSizes.get(name);
    const anchorX = blend(initialAnchor[0], separatedAnchor[0]);
    const anchorY = blend(initialAnchor[1], separatedAnchor[1]);
    const padding = 12;
    element.style.left = `${clamp(
      (left / 100) * host.clientWidth - anchorX * size.width,
      padding,
      Math.max(padding, host.clientWidth - size.width - padding),
    )}px`;
    element.style.top = `${clamp(
      (top / 100) * host.clientHeight - anchorY * size.height,
      padding,
      Math.max(padding, host.clientHeight - size.height - padding),
    )}px`;
    element.style.right = element.style.bottom = "auto";
  }

  function fitFigure() {
    if (!stage || reduced.matches || innerWidth <= 700) return;
    // Keep the full caption and controls visible both beneath the initial
    // header and after the stage sticks to the top. CSS shrinks only the art.
    // These insets match molecular-layout.css: 12px above, 24px below.
    const top = Math.max(15, stage.getBoundingClientRect().top);
    const height = Math.max(0, Math.floor(innerHeight - top - 36));
    if (height === availableFigureHeight) return;
    availableFigureHeight = height;
    figure.style.setProperty("--molecular-available-height", `${height}px`);
  }

  function render(now) {
    frame = 0;
    fitFigure();
    if (!adapter || !visible || document.hidden) {
      adapter?.setSuspended(true);
      lastMotionTime = 0;
      lastTwinkleTime = 0;
      return;
    }
    // Limit continuous motion to 30 fps, including on high-refresh displays.
    if (now - lastDrawTime < 1000 / 30) {
      requestRender();
      return;
    }
    lastDrawTime = now;
    if (!paused && !reduced.matches) {
      const mobile = innerWidth <= 700;
      const separationEntry = { start: 1.1, end: 0.4 };
      const separationTiming = { desktop: separationEntry, mobile: separationEntry };
      // Anchor the two molecular stages to their own headings. Keep the same
      // pose/camera path, with ligand separation starting only in stage two.
      progress =
        0.44 * headlineProgress(firstHeading, separationTiming, mobile, false) +
        0.56 * headlineProgress(secondHeading, separationTiming, mobile, false);
      cellProgress = cellEnabled() ? headlineProgress(fourthHeading, cellOptions, mobile) : 0;
      discoveryProgress = discoveryEnabled()
        ? headlineProgress(fifthHeading, discoveryOptions, mobile)
        : 0;
      // Hold the full wiggle throughout the longer third concept, then fade it
      // with the cell pullback instead of ending it through a second short gate.
      const motionFade = headlineProgress(fourthHeading, cellOptions, mobile);
      const motionEntry = { start: 1.05, end: 0.8 };
      domainStrength = options.enable_domain_motion
        ? headlineProgress(
            thirdHeading,
            { desktop: motionEntry, mobile: motionEntry },
            mobile,
            false,
          ) *
          (1 - motionFade)
        : 0;
    }
    const moving = !paused && !reduced.matches && domainStrength > 0;
    const twinkling =
      !paused &&
      discoveryEnabled() &&
      discoveryOptions.show_contact_rings &&
      discoveryOptions.twinkle_contact_rings &&
      cellProgress > 0.9 &&
      discoveryProgress > 0.5 &&
      compounds.some(({ contact, image }) => contact && image?.naturalWidth > 0);
    if (twinkling) {
      if (lastTwinkleTime) twinkleTime += Math.min((now - lastTwinkleTime) / 1000, 0.05);
      lastTwinkleTime = now;
    } else {
      lastTwinkleTime = 0;
    }
    if (moving) {
      if (lastMotionTime) motionTime += Math.min((now - lastMotionTime) / 1000, 0.05);
      lastMotionTime = now;
    } else {
      lastMotionTime = 0;
      if (!paused) motionTime = 0;
    }
    const state = stateAt(reduced.matches ? 0 : progress);
    const cellT = drawCellTransition();
    try {
      // Draw the configured first frame even if the page opens at a later topic.
      // After that, stop spending GPU time on Mol* while the cell covers it.
      const needsFirstFrame = !figure.classList.contains("molecule-ready");
      adapter.setSuspended(cellT >= 0.92 && !needsFirstFrame);
      if (cellT < 0.92 || needsFirstFrame) adapter.render(state);
    } catch (error) {
      console.warn("Molecular rendering stopped.", error);
      showStaticStructure();
      return;
    }
    label("peptide", state);
    label("ligand", state);
    figure.dataset.progress = state.progress.toFixed(4);
    figure.dataset.peptideSeparation = state.peptideT.toFixed(4);
    figure.dataset.ligandSeparation = state.ligandT.toFixed(4);
    figure.dataset.domainMotion = (reduced.matches ? 0 : domainStrength).toFixed(4);
    figure.dataset.domainAngle = state.domainAngle.toFixed(6);
    figure.dataset.wiggleAmplitude = state.wiggleAmplitude.toFixed(4);
    const note =
      discoveryEnabled() && discoveryProgress > 0.2 && cellT >= 0.9
        ? discoveryOptions.note
        : cellT >= 0.6
          ? cellOptions.note
          : preset().note +
            (domainStrength > 0 && !reduced.matches
              ? " Motion illustrates conformational flexibility; it is not an MD simulation."
              : "");
    if (noteElement.textContent !== note) noteElement.textContent = note;
    document.documentElement.style.setProperty(
      "--intro-opacity",
      String(1 - smooth(0.015, 0.2, state.progress)),
    );
    if (moving || twinkling) requestRender();
  }
  function requestRender() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  async function makeRenderer(config, selectedScene) {
    const token = generation;
    await loadScript("js/molstar-adapter.js");
    return window.KojetinRenderers.molstar({
      host,
      scene: selectedScene,
      loadScript,
      onFirstFrame() {
        if (token !== generation || !adapter) return;
        figure.dataset.renderer = "molstar";
        figure.classList.add("molecule-ready");
        figure.setAttribute("aria-busy", "false");
        button.hidden = reduced.matches;
        status.textContent = "";
        requestRender();
      },
      onError(error) {
        if (token !== generation) return;
        console.warn("Molecular rendering stopped.", error);
        showStaticStructure();
      },
      settings: {
        ...options,
        ...window.KojetinMolecularView(config.view, selectedScene),
        illustrative: display.state.illustrative,
        ssgi: display.state.ssgi,
        ligand_moves_with_domain: !config.allow_ligand_separation,
        h12_range: config.h12_range,
        ...display.palettes[display.state.palette].molecule,
      },
    });
  }

  async function loadStructure() {
    const token = ++generation;
    const key = display.state.structure;
    const config = display.structures[key];
    desiredStructure = key;
    showIdentity(config, key);
    adapter?.dispose();
    adapter = null;
    figure.dataset.renderer = "loading";
    figure.setAttribute("aria-busy", "true");
    // Reserve the live layout now, avoiding a late layout jump when Mol* arrives.
    document.documentElement.classList.toggle("motion-enabled", !reduced.matches);
    requestRender();
    figure.classList.remove("molecule-ready");
    button.hidden = true;
    status.textContent = "Loading molecular view…";
    let next;
    try {
      const selectedScene = await readJSON(structurePath(key, "scene.json"));
      if (token !== generation) return;
      scene = selectedScene;
      cameraView = window.KojetinMolecularView(config.view, selectedScene);
      next = await makeRenderer(config, selectedScene);
      if (token !== generation) {
        next.dispose();
        return;
      }
      await next.setPalette(
        display.palettes[display.state.palette].molecule,
        display.state.palette,
      );
      await next.setAppearance?.(display.state);
      if (token !== generation) {
        next.dispose();
        return;
      }
      adapter = next;
      updateCellMode();
      document.documentElement.classList.toggle("motion-enabled", !reduced.matches);
      adapter.resize();
      requestRender();
    } catch (error) {
      if (next && next !== adapter) next.dispose();
      if (token !== generation) return;
      console.warn("Mol* could not start.", error);
      showStaticStructure();
    }
  }

  function showStaticStructure() {
    generation++;
    adapter?.dispose();
    adapter = null;
    domainStrength = 0;
    lastMotionTime = 0;
    figure.classList.remove("molecule-ready");
    figure.dataset.renderer = "static";
    figure.setAttribute("aria-busy", "false");
    noteElement.textContent = preset().note;
    document.documentElement.classList.remove("motion-enabled");
    cellProgress = 0;
    discoveryProgress = 0;
    updateCellMode();
    drawCellTransition();
    button.hidden = true;
    status.textContent =
      "Showing a still structure because the interactive Mol* view is unavailable.";
  }

  document.addEventListener("displaychange", async () => {
    figure.querySelector(".molecule-poster").src = imageURL(
      structurePath(display.state.structure, `posters/${display.state.palette}.webp`),
    );
    if (display.state.structure !== desiredStructure) {
      loadStructure();
    } else if (adapter) {
      const token = ++paletteGeneration;
      try {
        await adapter.setPalette(
          display.palettes[display.state.palette].molecule,
          display.state.palette,
        );
        await adapter?.setAppearance?.(display.state);
        if (token === paletteGeneration) requestRender();
      } catch (error) {
        status.textContent = "The selected molecular colors could not load.";
      }
    }
  });
  button.addEventListener("click", () => {
    paused = !paused;
    button.textContent = paused ? "Resume motion" : "Pause motion";
    button.setAttribute("aria-pressed", String(paused));
    requestRender();
  });
  function resizeRenderer() {
    labelSizes.clear();
    adapter?.resize();
    requestRender();
  }
  new ResizeObserver(resizeRenderer).observe(host);
  addEventListener("resize", resizeRenderer, { passive: true });
  document.fonts?.ready.then(() => {
    labelSizes.clear();
    requestRender();
  });
  new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (visible) requestRender();
    },
    { rootMargin: "100px" },
  ).observe(story);
  host.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      showStaticStructure();
    },
    true,
  );
  addEventListener("scroll", requestRender, { passive: true });
  document.addEventListener("visibilitychange", requestRender);
  reduced.addEventListener("change", () => {
    document.documentElement.classList.toggle("motion-enabled", !!adapter && !reduced.matches);
    cellProgress = 0;
    discoveryProgress = 0;
    updateCellMode();
    button.hidden = reduced.matches || !figure.classList.contains("molecule-ready");
    requestRender();
  });
  if (!options.enable_labels)
    figure.querySelectorAll(".molecule-label").forEach((element) => (element.hidden = true));
  if (cellOptions.enabled && cellImage) {
    const imageReady = () => {
      cellReady = cellImage.naturalWidth > 0;
      updateCellMode();
      requestRender();
    };
    cellImage.addEventListener("load", imageReady);
    cellImage.addEventListener("error", () => {
      cellReady = false;
      cellProgress = 0;
      updateCellMode();
      requestRender();
    });
    if (cellImage.complete) imageReady();
  }
  for (const { image } of compounds) {
    if (!image) continue;
    const imageChanged = () => {
      updateCellMode();
      requestRender();
    };
    image.addEventListener("load", imageChanged);
    image.addEventListener("error", imageChanged);
  }
  // Reduced motion uses the same Mol* view, held at its initial pose.
  loadStructure();
})();
