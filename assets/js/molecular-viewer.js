/* Mol* scroll choreography. The adapter draws the current state.
   Separation, rocking, and procedural internal wiggle are illustrative. */
(() => {
  const figure = document.getElementById("molecule");
  if (!figure) return;
  const story = document.getElementById("molecular-story");
  const host = figure.querySelector(".molecule-renderer");
  const button = figure.querySelector(".motion-toggle");
  const status = figure.querySelector(".renderer-status");
  const options = JSON.parse(document.getElementById("hero-config").textContent);
  const cellOptions = JSON.parse(document.getElementById("cell-config")?.textContent || "{}");
  const cellScene = figure.querySelector(".cell-scene");
  const cellImage = figure.querySelector(".cell-illustration");
  const cellArtboard = figure.querySelector(".cell-artboard");
  const cellArt = figure.querySelector(".cell-art");
  const moleculeLayer = figure.querySelector(".molecule-layer");
  const display = window.KojetinDisplay;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const scripts = new Map();
  const jsonCache = new Map();
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
    cellProgress = 0;
  let domainStrength = 0,
    motionTime = 0,
    lastMotionTime = 0,
    lastDrawTime = 0;
  const thirdHeading = story.querySelector('[data-step="3"] h2');
  const fourthHeading = story.querySelector('[data-step="4"] h2');

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

  function updateCellMode() {
    document.documentElement.classList.toggle("cell-transition-enabled", cellEnabled());
  }

  function drawCellTransition() {
    const t = cellEnabled() ? cellProgress : 0;
    const size = Math.min(host.clientWidth, host.clientHeight);
    const anchor = cellOptions.nucleus_anchor || [0.19, 0.51];
    const x = (clamp(Number(anchor[0])) - 0.5) * size;
    const y = (clamp(Number(anchor[1])) - 0.5) * size;
    const zoom = clamp(Number(cellOptions.start_zoom) || 4.5, 1, 8);
    if (cellScene) {
      cellArtboard.style.width = cellArtboard.style.height = `${size}px`;
      cellArt.style.transformOrigin = `${clamp(Number(anchor[0])) * 100}% ${clamp(Number(anchor[1])) * 100}%`;
      // Keep the nucleus and molecular center registered throughout the pullback.
      cellArt.style.transform = `translate(${-x * (1 - t)}px, ${-y * (1 - t)}px) scale(${Math.pow(zoom, 1 - t)})`;
      cellScene.style.opacity = String(smooth(0, 0.3, t));
      cellScene.style.setProperty("--cell-label-opacity", String(smooth(0.7, 1, t)));
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
      t >= 0.6 ? cellOptions.caption : "MOLECULAR INTERACTIONS";
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
    figure.querySelector(".figure-note").textContent = config.note;
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
    const left = 50 + ((x * projection) / (2 * state.span * aspect)) * 100;
    const top = 50 - ((y * projection) / (2 * state.span)) * 100;
    element.style.left = `${clamp(left, 5, 78)}%`;
    element.style.top = `${clamp(top, 5, 88)}%`;
    element.style.right = element.style.bottom = "auto";
  }

  function render(now) {
    frame = 0;
    if (!adapter || !visible || document.hidden) {
      adapter?.setSuspended(true);
      lastMotionTime = 0;
      return;
    }
    // Limit continuous motion to 30 fps, including on high-refresh displays.
    if (now - lastDrawTime < 1000 / 30) {
      requestRender();
      return;
    }
    lastDrawTime = now;
    if (!paused && !reduced.matches) {
      const storyTop = story.getBoundingClientRect().top;
      // Complete the molecular separation during the first three concepts.
      // The cellular section has its own later, headline-driven transition.
      const third = story.querySelector('[data-step="3"]');
      const motionLength = third.getBoundingClientRect().bottom - storyTop - innerHeight;
      progress = clamp(-storyTop / Math.max(1, motionLength));
      const mobile = innerWidth <= 700;
      const timing = cellOptions[mobile ? "mobile" : "desktop"] || {};
      const start = clamp(
        Number.isFinite(Number(timing.start)) ? Number(timing.start) : mobile ? 0.95 : 0.85,
        0.01,
        1,
      );
      const end = clamp(
        Number.isFinite(Number(timing.end)) ? Number(timing.end) : mobile ? 0.6 : 0.4,
        0,
        start - 0.01,
      );
      cellProgress = cellEnabled()
        ? 1 - smooth(end, start, fourthHeading.getBoundingClientRect().top / innerHeight)
        : 0;
      // The first two transitions retain their original scroll timing. Rock only
      // after separation finishes, and ease back to rest before the fourth topic.
      domainStrength =
        options.enable_domain_motion && progress >= 1
          ? (1 -
              smooth(
                mobile ? 0.5 : 0.15,
                mobile ? 0.85 : 0.5,
                thirdHeading.getBoundingClientRect().top / innerHeight,
              )) *
            smooth(
              mobile ? 0.55 : 0.4,
              mobile ? 0.9 : 0.75,
              fourthHeading.getBoundingClientRect().top / innerHeight,
            )
          : 0;
      domainStrength *= 1 - cellProgress;
    }
    const moving = !paused && !reduced.matches && domainStrength > 0;
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
      // The finished cell is a still image; stop spending GPU time on hidden Mol*.
      adapter.setSuspended(cellT >= 0.92);
      if (cellT < 0.92) adapter.render(state);
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
      cellT >= 0.6
        ? cellOptions.note
        : preset().note +
          (domainStrength > 0 && !reduced.matches
            ? " Motion illustrates conformational flexibility; it is not an MD simulation."
            : "");
    const noteElement = figure.querySelector(".figure-note");
    if (noteElement.textContent !== note) noteElement.textContent = note;
    document.documentElement.style.setProperty(
      "--intro-opacity",
      String(1 - smooth(0.015, 0.2, state.progress)),
    );
    if (moving) requestRender();
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
      figure.dataset.renderer = "molstar";
      figure.classList.add("molecule-ready");
      document.documentElement.classList.toggle("motion-enabled", !reduced.matches);
      button.hidden = reduced.matches;
      status.textContent = "";
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
    figure.querySelector(".figure-note").textContent = preset().note;
    document.documentElement.classList.remove("motion-enabled");
    cellProgress = 0;
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
  new ResizeObserver(() => {
    adapter?.resize();
    requestRender();
  }).observe(host);
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
    updateCellMode();
    button.hidden = reduced.matches || !adapter;
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
  // Reduced motion uses the same Mol* view, held at its initial pose.
  loadStructure();
})();
