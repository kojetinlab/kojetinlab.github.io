/* Convert an original-PDB Mol* camera into the shared prepared scene.
   Mol* Copy MVS JSON positions are field-of-view normalized, not raw cameras. */
window.KojetinMolecularView = (view, scene) => {
  const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const norm = (v) => {
    const length = Math.hypot(...v);
    if (length < 1e-8) throw new Error("Camera vectors must not be zero or parallel.");
    return v.map((n) => n / length);
  };
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const transpose = (m) => m[0].map((_, i) => m.map((row) => row[i]));
  const multiply = (a, b) => a.map((row) => transpose(b).map((column) => dot(row, column)));
  const [x, y, z] = (view.rotation_xyz || [0, 0, 0]).map((v) => (v * Math.PI) / 180);
  const [cx, cy, cz] = [x, y, z].map(Math.cos);
  const [sx, sy, sz] = [x, y, z].map(Math.sin);
  const euler = [
    [cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx],
    [sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx],
    [-sy, cy * sx, cy * cx],
  ];
  let orientation = euler,
    offset = [0, 0, 0],
    span = view.camera_span || 39;
  const camera = view.camera;
  const mode = camera?.mode || "orthographic";
  const fov = ((camera?.fov_degrees || 45) * Math.PI) / 180;
  if (camera) {
    const back = norm(sub(camera.position, camera.target));
    const right = norm(cross(camera.up, back));
    const up = cross(back, right);
    const basis = [right, up, back];
    orientation = multiply(euler, multiply(basis, transpose(scene.autoBasis)));
    const centeredTarget = sub(scene.coordinateOrigin, camera.target);
    const shift = basis.map((row) => dot(row, centeredTarget));
    offset = euler.map((row) => dot(row, shift));
    const distance = Math.hypot(...sub(camera.position, camera.target));
    const normalized = camera.position_type === "fov_normalized";
    const derivedSpan = normalized
      ? distance / 2 / (mode === "perspective" ? Math.cos(fov / 2) : 1)
      : distance * Math.tan(fov / 2);
    span = view.camera_span || derivedSpan;
  }
  return {
    orientation,
    offset,
    span,
    mode,
    fov,
    radius: camera?.radius || 100,
    zoom: view.scroll_zoom || { amount: 0.12, start: 0.25, end: 0.9 },
  };
};
