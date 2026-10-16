/* Mol* 5.13.1, including its native spatially correlated procedural wiggle.
   A shared clock keeps shader motion, scroll choreography, and Pause in sync. */
window.KojetinRenderers = window.KojetinRenderers || {};
window.KojetinRenderers.molstar = async function ({
  host,
  scene,
  settings,
  loadScript,
  onError,
  onFirstFrame,
}) {
  await loadScript("js/vendor/molstar/molstar.js");
  const { plugin: api, structure: structureApi, math } = window.molstar.lib;
  const { Mat4 } = math.LinearAlgebra;
  const spec = api.DefaultPluginSpec();
  spec.config = [
    [
      api.PluginConfig.General.PixelScale,
      Math.min(1, (settings.max_pixel_ratio || 1.7) / devicePixelRatio),
    ],
    [api.PluginConfig.General.AllowMajorPerformanceCaveat, true],
  ];
  const plugin = new api.PluginContext(spec);
  const canvas = document.createElement("canvas");
  host.append(canvas);
  const representations = {};
  const view = Mat4.identity();
  for (let row = 0; row < 3; row++)
    for (let column = 0; column < 3; column++)
      view[column * 4 + row] = settings.orientation[row][column];
  view[12] = settings.offset[0];
  view[13] = settings.offset[1];
  view[14] = settings.offset[2];
  let h12Loci;
  let currentAppearance = "";
  const lastTransforms = new Map();
  let lastCamera = "";
  const wiggleLoci = new Map();
  const lastWiggles = new Map();
  let motionTime = 0,
    drawFrame = 0,
    drawBudget = 0,
    lastDrawTime = -Infinity,
    hasRenderState = false,
    firstFrameDrawn = false,
    ready = false,
    suspended = false,
    disposed = false;
  const color = (value) => parseInt(value.replace("#", ""), 16);

  // Mol* normally advances its own clock. Drive its public canvas tick instead
  // so pausing freezes the actual deformed pose, rather than resetting it.
  function draw(now) {
    drawFrame = 0;
    if (!ready || disposed || suspended || document.hidden) return;
    if (now - lastDrawTime >= 1000 / 30) {
      lastDrawTime = now;
      try {
        plugin.canvas3d.tick(motionTime * 1000, { isSynchronous: true });
        if (hasRenderState && !firstFrameDrawn) {
          firstFrameDrawn = true;
          onFirstFrame?.();
        }
      } catch (error) {
        setSuspended(true);
        onError?.(error);
        return;
      }
      drawBudget--;
    }
    if (drawBudget > 0) drawFrame = requestAnimationFrame(draw);
  }

  function requestDraw() {
    plugin.canvas3d.requestDraw();
    // A short tail allows stationary SSGI and antialiasing to refine.
    drawBudget = 12;
    if (ready && !disposed && !suspended && !drawFrame) drawFrame = requestAnimationFrame(draw);
  }

  function setSuspended(value) {
    if (suspended === value) return;
    suspended = value;
    if (value) {
      cancelAnimationFrame(drawFrame);
      drawFrame = 0;
      drawBudget = 0;
    } else {
      requestDraw();
    }
  }

  function highlight(colors) {
    if (!h12Loci) return;
    representations.receptor.obj.data.repr.setState({
      overpaint: {
        kind: "element-loci",
        layers: [{ loci: h12Loci, color: color(colors.helix12_color), clear: false }],
      },
    });
  }

  async function setPalette(colors) {
    const update = plugin.build();
    for (const name of Object.keys(representations)) {
      update.to(representations[name]).update((old) => {
        old.colorTheme = {
          name: "uniform",
          params: { value: color(colors[`${name}_color`]) },
        };
      });
    }
    await update.commit();
    lastTransforms.clear();
    lastWiggles.clear();
    highlight(colors);
    plugin.canvas3d.update(representations.receptor.obj.data.repr);
    requestDraw();
  }

  async function setAppearance({ illustrative, ssgi }) {
    const supported = plugin.canvas3dContext.passes.illumination.supported;
    const enabled = !!ssgi && supported;
    const key = `${!!illustrative}/${enabled}`;
    const checkbox = document.getElementById("molstar-ssgi");
    if (checkbox) checkbox.disabled = !supported;
    const note = document.querySelector(".ssgi-support-note");
    if (note) note.hidden = supported;
    const figure = host.closest("figure");
    figure.dataset.illustrative = String(!!illustrative);
    figure.dataset.ssgi = String(enabled);
    if (key === currentAppearance) return;
    const update = plugin.build();
    for (const representation of Object.values(representations)) {
      update.to(representation).update((old) => {
        old.type.params.ignoreLight = !!illustrative;
      });
    }
    await update.commit();
    lastTransforms.clear();
    lastWiggles.clear();
    const pp = plugin.canvas3d.props.postprocessing;
    plugin.canvas3d.setProps({
      illumination: { enabled, ignoreOutline: !illustrative },
      postprocessing: {
        outline: illustrative
          ? {
              name: "on",
              params: { scale: 1, color: 0x000000, threshold: 0.33, includeTransparent: true },
            }
          : { name: "off", params: {} },
        occlusion: { name: "on", params: { ...pp.occlusion.params, radius: illustrative ? 5 : 4 } },
        shadow: { name: "off", params: {} },
      },
    });
    highlight(displayColors);
    for (const representation of Object.values(representations))
      plugin.canvas3d.update(representation.obj.data.repr);
    requestDraw();
    currentAppearance = key;
  }

  let displayColors = settings;

  function render(state) {
    motionTime = state.motionTime;
    for (const [name, representation] of Object.entries(representations)) {
      const repr = representation.obj.data.repr;
      const amplitude = wiggleLoci.has(name) ? state.wiggleAmplitude : 0;
      if (lastWiggles.get(name) !== amplitude) {
        repr.setState({
          wiggle: {
            kind: "element-loci",
            layers: amplitude > 0 ? [{ loci: wiggleLoci.get(name), value: 1 }] : [],
          },
          themeStrength: { ...repr.state.themeStrength, wiggle: amplitude },
        });
        plugin.canvas3d.update(repr);
        lastWiggles.set(name, amplitude);
      }
      const domainAngle =
        name === "receptor" || (name === "ligand" && settings.ligand_moves_with_domain)
          ? state.domainAngle
          : 0;
      const transformKey = [
        state.angle,
        name === "peptide" ? state.peptideT : name === "ligand" ? state.ligandT : 0,
        domainAngle,
      ].join("/");
      if (lastTransforms.get(name) === transformKey) continue;
      const translation =
        name === "peptide"
          ? [16, 17, 2].map((v) => v * state.peptideT)
          : name === "ligand"
            ? [-23, -8, 12].map((v) => v * state.ligandT)
            : [0, 0, 0];
      const rotation = Mat4.identity();
      Mat4.rotate(rotation, rotation, state.angle, [0, 1, 0]);
      const transform = Mat4.identity();
      Mat4.fromTranslation(transform, translation);
      Mat4.mul(transform, transform, view);
      Mat4.mul(transform, rotation, transform);
      if (domainAngle) {
        const rocking = Mat4.identity();
        Mat4.rotate(rocking, rocking, domainAngle, [0, 0, 1]);
        Mat4.mul(transform, rocking, transform);
      }
      representation.obj.data.repr.setState({ transform });
      plugin.canvas3d.update(representation.obj.data.repr);
      lastTransforms.set(name, transformKey);
    }
    // Mol* derives orthographic height from distance and field of view.
    const distance = state.span / Math.tan(settings.fov / 2);
    const cameraKey = `${state.span}/${state.progress}`;
    if (lastCamera !== cameraKey)
      plugin.canvas3d.camera.setState(
        {
          mode: settings.mode,
          position: [0, 0, distance],
          target: [0, 0, 0],
          up: [0, 1, 0],
          fov: settings.fov,
          radius: settings.radius + 45 * state.progress,
          radiusMax: 100,
          fog: 0,
          clipFar: false,
        },
        0,
      );
    lastCamera = cameraKey;
    hasRenderState = true;
    requestDraw();
  }

  try {
    await plugin.init();
    if (!(await plugin.initViewerAsync(canvas, host)))
      throw new Error("Mol* WebGL initialization failed");
    const props = plugin.canvas3d.props;
    plugin.canvas3d.setProps({
      transparentBackground: true,
      camera: { helper: { axes: { name: "off", params: {} } } },
      renderer: { ambientIntensity: 0.6 },
      postprocessing: {
        occlusion: {
          name: "on",
          params: {
            ...props.postprocessing.occlusion.params,
            samples: 32,
            radius: 4,
            bias: 0.8,
          },
        },
        antialiasing: props.postprocessing.antialiasing,
      },
    });
    for (const [name, pdb] of Object.entries(scene.components)) {
      const raw = await plugin.builders.data.rawData({
        data: pdb,
        label: `${scene.pdbId} ${name}`,
      });
      const trajectory = await plugin.builders.structure.parseTrajectory(raw, "pdb");
      const model = await plugin.builders.structure.createModel(trajectory);
      const structure = await plugin.builders.structure.createStructure(model);
      representations[name] = await plugin.builders.structure.representation.addRepresentation(
        structure,
        {
          type: name === "ligand" ? "ball-and-stick" : "cartoon",
          typeParams: {
            quality: "high",
            sizeFactor: name === "ligand" ? 0.23 : 0.22,
            metalness: 0,
            roughness: 0.35,
            animation: {
              wiggleMode: "position",
              wiggleAmplitude: 0,
              wiggleSpeed: Math.max(0, Math.min(10, Number(settings.domain_wiggle_speed) || 0)),
              wiggleFrequency: Math.max(
                0,
                Math.min(2, Number(settings.domain_wiggle_frequency) || 0),
              ),
              tumbleAmplitude: 0,
              tumbleSpeed: 1,
              tumbleFrequency: 0.2,
            },
          },
          color: "uniform",
          colorParams: { value: color(settings[`${name}_color`]) },
        },
      );
      // All three components share the same spatial field and shader clock.
      // Nearby atoms move coherently, including the 6ONI covalent attachment.
      wiggleLoci.set(name, structureApi.StructureElement.Loci.all(structure.obj.data));
      if (name === "receptor") {
        const query = structureApi.Queries.generators.atoms({
          residueTest: (ctx) => {
            const id = structureApi.StructureProperties.residue.auth_seq_id(ctx.element);
            return id >= settings.h12_range[0] && id <= settings.h12_range[1];
          },
        });
        const selection = structureApi.StructureQuery.run(query, structure.obj.data);
        h12Loci = structureApi.StructureSelection.toLociWithSourceUnits(selection);
      }
    }
    highlight(settings);
    await setAppearance(settings);
    // Resolve initial scene/camera bookkeeping before applying the PDB camera.
    plugin.canvas3d.commit(true);
    plugin.animationLoop.stop();
    plugin.canvas3d.resetTime(0);
    ready = true;
    return {
      render,
      setSuspended,
      async setPalette(colors) {
        displayColors = colors;
        await setPalette(colors);
      },
      setAppearance,
      resize: () => plugin.handleResize(),
      dispose() {
        disposed = true;
        cancelAnimationFrame(drawFrame);
        plugin.dispose();
        canvas.remove();
      },
    };
  } catch (error) {
    plugin.dispose();
    canvas.remove();
    throw error;
  }
};
