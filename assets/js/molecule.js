/* Real 6ONJ coordinates; rigid component translations, never an MD trajectory. */
import * as THREE from "./vendor/three.module.js";

// This adapter is loaded only when Three.js is selected.
window.KojetinRenderers = window.KojetinRenderers || {};
window.KojetinRenderers.threejs = async function ({ host, data, settings: options }) {
  const settings = { ...options };
  const clamp = THREE.MathUtils.clamp;
  const vec = (a) => new THREE.Vector3(...a);
  let renderer, scene, camera, world, domain;
  let receptor, peptide, ligand;
  let baseQuaternion, ligandExit, peptideExit;
  const canvas = document.createElement("canvas");
  host.append(canvas);
  // Cartesian coordinates are retained in the data file. Interpolation is a
  // display convention for backbone cartoons; gaps are separate mesh segments.
  function ribbon(component, color, highlightH12 = false) {
    const group = new THREE.Group();
    const residues = component.residues;
    const colorBase = new THREE.Color(color);
    const colorH12 = new THREE.Color(settings.helix12_color || "#60598e");
    for (const segment of component.segments) {
      const rs = segment.map((i) => residues[i]);
      if (rs.length < 2) continue;
      const pts = rs.map((r) => vec(r.atoms?.CA || r.xyz));
      const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
      const steps = (rs.length - 1) * 6;
      const positions = [],
        colors = [],
        indexes = [];
      let previous;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps,
          ri = t * (rs.length - 1),
          j = Math.min(Math.floor(ri), rs.length - 2),
          f = ri - j;
        const r = rs[Math.round(ri)],
          center = curve.getPoint(t),
          tangent = curve.getTangent(t).normalize();
        const normalFor = (residue) =>
          residue.atoms?.O && residue.atoms?.C
            ? vec(residue.atoms.O).sub(vec(residue.atoms.C))
            : new THREE.Vector3(0, 1, 0);
        let na = normalFor(rs[j]),
          nb = normalFor(rs[j + 1]);
        if (na.dot(nb) < 0) nb.negate();
        let widthDirection = na.lerp(nb, f);
        widthDirection.addScaledVector(tangent, -widthDirection.dot(tangent)).normalize();
        if (widthDirection.lengthSq() < 0.1) {
          const axis =
            Math.abs(tangent.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
          widthDirection = axis.cross(tangent).normalize();
        }
        if (previous && previous.dot(widthDirection) < 0) widthDirection.negate();
        previous = widthDirection.clone();
        const normal = new THREE.Vector3().crossVectors(tangent, widthDirection).normalize();
        const secondary = r.ss || "C";
        const width = secondary === "H" ? 1.05 : secondary === "E" ? 1.35 : 0.23;
        const thickness = secondary === "C" ? 0.23 : 0.17;
        const c = highlightH12 && r.h12 ? colorH12 : colorBase;
        // Elliptical cross-section gives helices a ribbon and loops a round tube.
        for (let k = 0; k < 8; k++) {
          const a = (2 * Math.PI * k) / 8;
          const p = center
            .clone()
            .addScaledVector(widthDirection, Math.cos(a) * width)
            .addScaledVector(normal, Math.sin(a) * thickness);
          positions.push(p.x, p.y, p.z);
          colors.push(c.r, c.g, c.b);
          if (i < steps) {
            const n = i * 8 + k,
              q = i * 8 + ((k + 1) % 8);
            indexes.push(n, q, n + 8, q, q + 8, n + 8);
          }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      geometry.setIndex(indexes);
      geometry.computeVertexNormals();
      group.add(
        new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.38,
            metalness: 0.04,
            side: THREE.DoubleSide,
          }),
        ),
      );
    }
    return group;
  }

  function makeLigand(component) {
    const group = new THREE.Group();
    const palette = {
      C: settings.ligand_color || "#d48a30",
      N: "#466aab",
      O: "#c96354",
      S: "#d7ad43",
      F: "#6b9c6d",
      Cl: "#6b9c6d",
    };
    const atoms = component.atoms;
    const sphere = new THREE.SphereGeometry(0.43, 14, 10);
    for (const atom of atoms) {
      const mesh = new THREE.Mesh(
        sphere,
        new THREE.MeshStandardMaterial({
          color: palette[atom.element] || palette.C,
          roughness: 0.32,
        }),
      );
      mesh.position.copy(vec(atom.xyz));
      group.add(mesh);
    }
    const material = new THREE.MeshStandardMaterial({
      color: settings.ligand_color || "#d48a30",
      roughness: 0.4,
    });
    for (const bond of component.bonds) {
      const a = vec(atoms[bond.a].xyz),
        b = vec(atoms[bond.b].xyz),
        dir = b.clone().sub(a),
        length = dir.length();
      // Dictionary bond orders retained in JSON. Parallel cylinders show multiple bonds.
      const raw = String(bond.order).toUpperCase();
      const order = raw === "DOUB" || raw === "2" ? 2 : raw === "TRIP" || raw === "3" ? 3 : 1;
      const axis =
        Math.abs(dir.z / length) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
      const perpendicular = new THREE.Vector3().crossVectors(dir, axis).normalize();
      for (let j = 0; j < order; j++) {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, length, 8), material);
        mesh.position
          .copy(a)
          .add(b)
          .multiplyScalar(0.5)
          .addScaledVector(perpendicular, (j - (order - 1) / 2) * 0.34);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        group.add(mesh);
      }
    }
    return group;
  }

  function centroid(component) {
    const points = component.atoms
      ? component.atoms.map((a) => a.xyz)
      : component.residues.map((r) => r.xyz);
    return points
      .reduce((s, p) => s.add(vec(p)), new THREE.Vector3())
      .multiplyScalar(1 / points.length);
  }

  function disposeGroup(group) {
    group?.traverse((item) => {
      item.geometry?.dispose();
      item.material?.dispose();
    });
  }
  function setPalette(colors) {
    Object.assign(settings, colors);
    for (const group of [receptor, peptide, ligand]) {
      if (group) {
        group.removeFromParent();
        disposeGroup(group);
      }
    }
    receptor = ribbon(data.receptor, settings.receptor_color, true);
    peptide = ribbon(data.peptide, settings.peptide_color);
    ligand = makeLigand(data.ligand);
    domain.add(receptor);
    world.add(peptide);
    (settings.ligand_moves_with_domain ? domain : world).add(ligand);
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height, false);
  }
  function render(state) {
    const { width, height } = host.getBoundingClientRect();
    const aspect = width / height;
    if (camera.isPerspectiveCamera) {
      camera.aspect = aspect;
      camera.position.z = state.span / Math.tan(settings.fov / 2);
    } else {
      camera.left = -state.span * aspect;
      camera.right = state.span * aspect;
      camera.top = state.span;
      camera.bottom = -state.span;
    }
    camera.updateProjectionMatrix();
    peptide.position.copy(peptideExit).multiplyScalar(state.peptideT);
    ligand.position.copy(ligandExit).multiplyScalar(state.ligandT);
    world.quaternion
      .copy(baseQuaternion)
      .premultiply(
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), state.angle),
      );
    world.position
      .fromArray(settings.offset)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), state.angle);
    // Express the shared camera-plane rocking in the domain's local frame.
    // A covalently attached ligand belongs to this same rigid group.
    world.updateMatrix();
    domain.matrix
      .copy(world.matrix)
      .invert()
      .multiply(new THREE.Matrix4().makeRotationZ(state.domainAngle))
      .multiply(world.matrix);
    renderer.render(scene, camera);
  }
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, settings.max_pixel_ratio || 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0, 0);
    scene = new THREE.Scene();
    world = new THREE.Group();
    scene.add(world);
    domain = new THREE.Group();
    domain.matrixAutoUpdate = false;
    world.add(domain);
    camera =
      settings.mode === "perspective"
        ? new THREE.PerspectiveCamera((settings.fov * 180) / Math.PI, 1, 0.1, 500)
        : new THREE.OrthographicCamera(-39, 39, 39, -39, 0.1, 500);
    camera.position.set(0, 0, 140);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xa6b1b0, 2.25));
    const key = new THREE.DirectionalLight(0xffffff, 2.7);
    key.position.set(-30, 50, 70);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xdde7ff, 1);
    fill.position.set(30, -20, -40);
    scene.add(fill);
    setPalette(settings);
    const forward = centroid(data.ligand).normalize();
    const up = centroid(data.peptide)
      .addScaledVector(forward, -centroid(data.peptide).dot(forward))
      .normalize();
    const right = new THREE.Vector3().crossVectors(up, forward).normalize();
    baseQuaternion = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(right, up, forward).transpose(),
    );
    const o = settings.orientation;
    const viewRotation = new THREE.Matrix4().set(...o[0], 0, ...o[1], 0, ...o[2], 0, 0, 0, 0, 1);
    baseQuaternion.premultiply(new THREE.Quaternion().setFromRotationMatrix(viewRotation));
    const inverse = baseQuaternion.clone().invert();
    peptideExit = new THREE.Vector3(16, 17, 2).applyQuaternion(inverse);
    ligandExit = new THREE.Vector3(-23, -8, 12).applyQuaternion(inverse);
    resize();
    return {
      render,
      resize,
      setPalette,
      dispose() {
        for (const group of [receptor, peptide, ligand]) disposeGroup(group);
        renderer.dispose();
        canvas.remove();
      },
    };
  } catch (error) {
    renderer?.dispose();
    canvas.remove();
    throw error;
  }
};
