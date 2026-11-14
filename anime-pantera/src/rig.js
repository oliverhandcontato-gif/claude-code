// Skeleton, forward kinematics, pose blending and projection.
// Units: centimetres in character space. +Y up, +Z toward the camera when yaw = 0,
// +X = the character's left side (screen right when he faces the camera).
//
// Pose format (all angles in degrees):
// { root:{pos:[x,y,z], yaw}, hips:[x,y,z], spine, chest, neck, head,
//   sh:{L,R}, arm:{L,R}, elbow:{L,R}  (number: bend, or [bend, twist]),
//   hand:{L,R}, leg:{L,R}, knee:{L,R} (number), foot:{L,R},
//   handShape:{L,R}, face:{...} }
// Arm/leg/hand/foot/sh values are written for the LEFT side convention;
// the right side is mirrored automatically (y and z negated), so the same numbers
// mean the same motion on either side. Arm z+ = raise outward, x- = swing forward.
// Leg x- = lift thigh forward. Knee + = bend. Spine/chest/neck/head x+ = lean forward.
(function (A) {
  const U = A.U;

  const SK = {
    hips: { parent: "root", off: [0, 100, 0] },
    spine: { parent: "hips", off: [0, 7, 0] },
    chest: { parent: "spine", off: [0, 22, 0] },
    neck: { parent: "chest", off: [0, 21, 0.5] },
    head: { parent: "neck", off: [0, 9, 1.4] },
    shL: { parent: "chest", off: [3, 14.2, -1], side: 1 },
    shR: { parent: "chest", off: [-3, 14.2, -1], side: -1 },
    armL: { parent: "shL", off: [17.5, 1, 0], side: 1 },
    armR: { parent: "shR", off: [-17.5, 1, 0], side: -1 },
    elbowL: { parent: "armL", off: [0, -31, 0], side: 1 },
    elbowR: { parent: "armR", off: [0, -31, 0], side: -1 },
    handL: { parent: "elbowL", off: [0, -27, 0], side: 1 },
    handR: { parent: "elbowR", off: [0, -27, 0], side: -1 },
    legL: { parent: "hips", off: [9.5, -5, 0], side: 1 },
    legR: { parent: "hips", off: [-9.5, -5, 0], side: -1 },
    kneeL: { parent: "legL", off: [0, -45, 0], side: 1 },
    kneeR: { parent: "legR", off: [0, -45, 0], side: -1 },
    footL: { parent: "kneeL", off: [0, -45, 0], side: 1 },
    footR: { parent: "kneeR", off: [0, -45, 0], side: -1 },
  };
  const ORDER = Object.keys(SK);

  // Rest pose: relaxed stand.
  const REST = {
    root: { pos: [0, 0, 0], yaw: 0 },
    hips: [0, 0, 0], spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0],
    sh: { L: [0, 0, 0], R: [0, 0, 0] },
    arm: { L: [0, 0, 5], R: [0, 0, 5] },
    elbow: { L: 12, R: 12 },
    hand: { L: [0, 0, 0], R: [0, 0, 0] },
    leg: { L: [0, 0, 4], R: [0, 0, 4] },
    knee: { L: 2, R: 2 },
    foot: { L: [0, 0, 0], R: [0, 0, 0] },
    handShape: { L: "relaxed", R: "relaxed" },
  };

  const mirror = (e, side) => (side < 0 ? [e[0], -(e[1] || 0), -(e[2] || 0)] : e);

  function localEuler(pose, j) {
    const side = SK[j].side;
    const s = side > 0 ? "L" : "R";
    if (j === "hips" || j === "spine" || j === "chest" || j === "neck" || j === "head") return pose[j] || [0, 0, 0];
    if (j.startsWith("sh")) return mirror((pose.sh && pose.sh[s]) || [0, 0, 0], side);
    if (j.startsWith("arm")) return mirror((pose.arm && pose.arm[s]) || [0, 0, 0], side);
    if (j.startsWith("elbow")) {
      const v = pose.elbow ? pose.elbow[s] : 0;
      const bend = Array.isArray(v) ? v[0] : v || 0, tw = Array.isArray(v) ? v[1] || 0 : 0;
      return mirror([-bend, tw, 0], side);
    }
    if (j.startsWith("hand")) return mirror((pose.hand && pose.hand[s]) || [0, 0, 0], side);
    if (j.startsWith("leg")) return mirror((pose.leg && pose.leg[s]) || [0, 0, 0], side);
    if (j.startsWith("knee")) return [(pose.knee && pose.knee[s]) || 0, 0, 0];
    if (j.startsWith("foot")) return mirror((pose.foot && pose.foot[s]) || [0, 0, 0], side);
    return [0, 0, 0];
  }

  // Forward kinematics -> { name: {p:[x,y,z], m:mat3} } in character-root space (yaw applied).
  function fk(pose, dims) {
    const J = {};
    const r = pose.root || REST.root;
    const rootM = U.mm(U.ry((r.yaw || 0) * U.D), U.euler(r.rot || [0, 0, 0]));
    J.root = { p: r.pos || [0, 0, 0], m: rootM };
    const sc = (dims && dims.scale) || 1;
    for (const j of ORDER) {
      const d = SK[j];
      const par = J[d.parent];
      const off = U.mul(d.off, sc);
      const p = U.add(par.p, U.mv(par.m, off));
      const m = U.mm(par.m, U.euler(localEuler(pose, j)));
      J[j] = { p, m };
    }
    return J;
  }

  // Deep blend of two poses (numbers/arrays lerped, strings switch at t>=0.5).
  function blend(a, b, t) {
    if (a == null) return b;
    if (b == null) return a;
    if (typeof a === "number" && typeof b === "number") return U.lerp(a, b, t);
    if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => blend(v, b[i] == null ? v : b[i], t));
    if (typeof a === "object" && typeof b === "object") {
      const o = {};
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const k of keys) o[k] = blend(a[k], b[k], t);
      return o;
    }
    return t < 0.5 ? a : b;
  }
  // Merge partial pose over a base pose (deep).
  function over(base, p) {
    if (p == null) return base;
    if (base == null || typeof p !== "object" || Array.isArray(p)) return p;
    const o = Object.assign({}, base);
    for (const k of Object.keys(p)) o[k] = over(base[k], p[k]);
    return o;
  }
  const full = (p) => over(REST, p);

  // ---- Projection ----
  // view: {x, y (screen px of root), scale (px/cm), yaw (deg), pitch (deg), roll (deg),
  //        persp (focal cm, 0 = orthographic), pivotY (cm)}
  function makeView(v) {
    if (v.cam) {
      // exact perspective through the scene camera: char-space point -> world -> camera
      const cam = v.cam, at = v.at || [0, 0, 0], sc = v.k || 1;
      const proj = (p) => {
        const q = cam.proj([at[0] + p[0] * sc, at[1] + p[1] * sc, at[2] + p[2] * sc]);
        return { x: q.x, y: q.y, z: -q.d, s: q.s * sc };
      };
      const Mc = U.mm(U.rx((cam.pitch || 0) * U.D), U.ry(-(cam.yaw || 0) * U.D));
      const rc = Math.cos((cam.roll || 0) * U.D), rs = Math.sin((cam.roll || 0) * U.D);
      const dir = (d) => {
        const q = U.mv(Mc, d);
        const x = q[0], y = -q[1];
        return { x: x * rc - y * rs, y: x * rs + y * rc, z: q[2] };
      };
      return { proj, dir, M: Mc, v };
    }
    const pv = v.pivotY == null ? 100 : v.pivotY;
    const M = U.mm(U.rx((v.pitch || 0) * U.D), U.ry((v.yaw || 0) * U.D));
    const rc = Math.cos((v.roll || 0) * U.D), rs = Math.sin((v.roll || 0) * U.D);
    const f = v.persp || 0;
    const proj = (p) => {
      const q = U.mv(M, [p[0], p[1] - pv, p[2]]);
      const s = f > 0 ? f / Math.max(f * 0.15, f - q[2]) : 1;
      let x = q[0] * v.scale * s, y = -(q[1]) * v.scale * s;
      const xr = x * rc - y * rs, yr = x * rs + y * rc;
      return { x: v.x + xr, y: v.y + yr, z: q[2], s: s * v.scale };
    };
    // direction projection (for normals): rotate only
    const dir = (d) => {
      const q = U.mv(M, d);
      const x = q[0], y = -q[1];
      return { x: x * rc - y * rs, y: x * rs + y * rc, z: q[2] };
    };
    return { proj, dir, M, v };
  }

  A.R = { SK, ORDER, REST, fk, blend, over, full, makeView };
})(window.A = window.A || {});
