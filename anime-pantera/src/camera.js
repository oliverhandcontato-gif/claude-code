// Perspective camera for environments (world units: cm, floor at y = 0).
// yaw 0 looks toward -Z, pitch + looks down, roll in degrees, fov = vertical field of view.
// charView() gives the matching view for a character standing at a world position, so
// characters and sets share one camera.
(function (A) {
  const U = A.U;
  function make(o) {
    const W = A.CFG.width, Hh = A.CFG.height;
    const pos = o.pos || [0, 160, 600];
    const yaw = o.yaw || 0, pitch = o.pitch || 0, roll = o.roll || 0;
    const fov = o.fov || 40;
    const fpx = (Hh / 2) / Math.tan((fov * U.D) / 2);
    const M = U.mm(U.rx(pitch * U.D), U.ry(-yaw * U.D));
    const rc = Math.cos(roll * U.D), rs = Math.sin(roll * U.D);
    const cx = W / 2 + (o.shiftX || 0), cy = Hh / 2 + (o.shiftY || 0);
    const near = 5;
    const toCam = (P) => U.mv(M, [P[0] - pos[0], P[1] - pos[1], P[2] - pos[2]]);
    const screen = (q) => {
      const d = Math.max(-q[2], 6);
      const x = (fpx * q[0]) / d, y = -(fpx * q[1]) / d;
      return { x: cx + x * rc - y * rs, y: cy + x * rs + y * rc, d, s: fpx / d };
    };
    const proj = (P) => screen(toCam(P));
    // Clip a camera-space polyline/polygon against the near plane
    const clipPoly = (qs, closed) => {
      const out = [];
      const n = qs.length;
      const lim = closed ? n : n - 1;
      const inside = (q) => -q[2] > near;
      if (!closed) {
        // returns list of visible segments
        const segs = [];
        let cur = [];
        for (let i = 0; i < n - 1; i++) {
          let a = qs[i], b = qs[i + 1];
          const ia = inside(a), ib = inside(b);
          if (!ia && !ib) { if (cur.length) { segs.push(cur); cur = []; } continue; }
          if (!ia || !ib) {
            const t = (-near - a[2]) / (b[2] - a[2]);
            const m = U.mix3(a, b, t);
            if (!ia) a = m; else b = m;
          }
          if (!cur.length) cur.push(screen(a));
          cur.push(screen(b));
          if (!ib) { segs.push(cur); cur = []; }
        }
        if (cur.length) segs.push(cur);
        return segs;
      }
      for (let i = 0; i < lim; i++) {
        const a = qs[i], b = qs[(i + 1) % n];
        const ia = inside(a), ib = inside(b);
        if (ia) out.push(a);
        if (ia !== ib) {
          const t = (-near - a[2]) / (b[2] - a[2]);
          out.push(U.mix3(a, b, t));
        }
      }
      return out.map(screen);
    };
    const poly = (Ps) => clipPoly(Ps.map(toCam), true);
    const lines = (Ps) => clipPoly(Ps.map(toCam), false);
    const horizonY = () => cy - fpx * Math.tan(pitch * U.D) * -1 * -1; // y of horizon (no roll)
    const charView = (root, extra = {}) => {
      const p = proj(root);
      return Object.assign({ x: p.x, y: p.y, scale: p.s, cam: api, at: root, k: 1 }, extra);
    };
    const api = { pos, yaw, pitch, roll, fov, fpx, proj, poly, lines, toCam, charView, horizonY, W, H: Hh, cx, cy };
    return api;
  }
  // Interpolate camera params between keys [{t, pos, yaw, pitch, roll, fov, ease}]
  function track(keys, t) {
    if (t <= keys[0].t) return keys[0];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i].t) {
        const a = keys[i - 1], b = keys[i];
        const u = U.ease(b.ease || "inOut", U.inv(a.t, b.t, t));
        const o = {};
        for (const k of ["yaw", "pitch", "roll", "fov", "shiftX", "shiftY"]) o[k] = U.lerp(a[k] || 0, b[k] == null ? a[k] || 0 : b[k], u);
        if (!b.fov && !a.fov) o.fov = 40;
        o.pos = U.mix3(a.pos, b.pos || a.pos, u);
        return o;
      }
    }
    return keys[keys.length - 1];
  }
  A.CAM = { make, track };
})(window.A = window.A || {});
