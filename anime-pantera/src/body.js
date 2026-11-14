// Character body drawing: limbs with muscle profiles, torso, jersey, shorts, hands, shoes,
// accessories. Every part is built from the projected skeleton so the figure stays
// consistent under turns, low angles and perspective.
(function (A) {
  const U = A.U, K = A.K, R = A.R;
  const B = {};

  // Radius profiles (cm). Each entry: [t, frontRadius, backRadius]
  const PROF = {
    upperArm: [[0, 5.9, 5.9], [0.18, 5.6, 5.9], [0.42, 5.2, 5.5], [0.75, 4.3, 4.6], [1, 3.9, 3.9]],
    foreArm: [[0, 4.0, 4.0], [0.22, 4.6, 4.3], [0.55, 3.8, 3.6], [0.85, 2.9, 2.8], [1, 2.7, 2.7]],
    thigh: [[0, 8.2, 8.2], [0.25, 7.9, 7.6], [0.6, 6.6, 6.3], [0.88, 5.2, 5.0], [1, 4.8, 4.8]],
    shin: [[0, 4.7, 4.7], [0.2, 4.4, 5.8], [0.45, 4.0, 5.2], [0.75, 3.3, 3.5], [1, 2.8, 2.8]],
    neck: [[0, 5.9, 5.9], [0.5, 5.3, 5.5], [1, 5.0, 5.2]],
  };
  const profAt = (prof, t) => {
    for (let i = 1; i < prof.length; i++) {
      if (t <= prof[i][0]) {
        const a = prof[i - 1], b = prof[i];
        const u = U.smooth(U.inv(a[0], b[0], t));
        return [U.lerp(a[1], b[1], u), U.lerp(a[2], b[2], u)];
      }
    }
    const l = prof[prof.length - 1];
    return [l[1], l[2]];
  };

  // Limb silhouette between projected points a,b. frontDir: screen-space vector of the limb's
  // front; widths are in cm and scaled by the projection scale at each end.
  B.limbPath = (a, b, prof, frontDir, mult = 1) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 0.001;
    const ux = dx / len, uy = dy / len;
    const nx = -uy, ny = ux;
    const fs = frontDir ? Math.sign(nx * frontDir.x + ny * frontDir.y) || 1 : 1;
    const N = 9;
    const P = [], Q = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const s = U.lerp(a.s, b.s, t) * mult;
      const w = profAt(prof, t);
      const wf = w[0] * s, wb = w[1] * s;
      const cx = U.lerp(a.x, b.x, t), cy = U.lerp(a.y, b.y, t);
      const wp = fs > 0 ? wf : wb, wn = fs > 0 ? wb : wf;
      P.push({ x: cx + nx * wp, y: cy + ny * wp });
      Q.push({ x: cx - nx * wn, y: cy - ny * wn });
    }
    // caps
    const r0 = profAt(prof, 0), r1 = profAt(prof, 1);
    const ra = ((r0[0] + r0[1]) / 2) * a.s * mult, rb = ((r1[0] + r1[1]) / 2) * b.s * mult;
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const ph = (i / 6) * Math.PI;
      pts.push({ x: a.x - nx * ra * Math.cos(ph) * -1 * 1 + 0 - ux * ra * Math.sin(ph), y: a.y - ny * ra * Math.cos(ph) * -1 - uy * ra * Math.sin(ph) });
    }
    // start cap goes from +n side around the back to -n side
    const cap0 = [];
    for (let i = 0; i <= 6; i++) {
      const ph = (i / 6) * Math.PI;
      cap0.push({ x: a.x + nx * ra * Math.cos(ph) - ux * ra * Math.sin(ph), y: a.y + ny * ra * Math.cos(ph) - uy * ra * Math.sin(ph) });
    }
    const cap1 = [];
    for (let i = 0; i <= 6; i++) {
      const ph = (i / 6) * Math.PI;
      cap1.push({ x: b.x - nx * rb * Math.cos(ph) + ux * rb * Math.sin(ph), y: b.y - ny * rb * Math.cos(ph) + uy * rb * Math.sin(ph) });
    }
    const out = [].concat(cap0.slice(1, 6), Q, cap1.slice(1, 6), P.reverse());
    return K.smoothPath(out, true, 0.35);
  };

  // ---- Torso sections ----
  // [frame, y(cm in frame), rx, rz, zShift]
  const TORSO = [
    ["hips", -9, 15.0, 10.5, 0],
    ["hips", -2, 16.4, 11.2, -0.5],
    ["spine", 3, 14.6, 10.2, 0.3],
    ["spine", 13, 15.4, 11.0, 0.8],
    ["chest", 3, 17.6, 12.2, 0.8],
    ["chest", 11, 19.4, 12.0, 0.2],
    ["chest", 15.5, 19.0, 9.8, -0.8],
    ["chest", 20.5, 9.5, 7.0, -0.8],
  ];
  const JERSEY = [
    ["hips", -12, 17.6, 12.0, 0],
    ["hips", -2, 17.8, 12.2, -0.2],
    ["spine", 4, 16.6, 11.6, 0.4],
    ["spine", 14, 17.0, 12.0, 0.9],
    ["chest", 4, 18.4, 12.9, 0.9],
    ["chest", 11, 18.6, 12.6, 0.3],
    ["chest", 16.5, 13.0, 10.2, -0.6],
    ["chest", 20.5, 9.2, 7.2, -0.6],
  ];

  function sectionPts(J, view, sec, n = 20) {
    const [fr, y, rx, rz, zs] = sec;
    const F = J[fr];
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * U.TAU;
      const local = [Math.cos(a) * rx, y, Math.sin(a) * rz + zs];
      pts.push(view.proj(U.add(F.p, U.mv(F.m, local))));
    }
    return pts;
  }

  // Silhouette from stacked ellipses. Keeps waist concavity (per-section extremes).
  B.tubeOutline = (J, view, secs, upFrom = "hips", upTo = "chest") => {
    const a = view.proj(J[upFrom].p), b = view.proj(U.add(J[upTo].p, U.mv(J[upTo].m, [0, 12, 0])));
    let ux = b.x - a.x, uy = b.y - a.y;
    const l = Math.hypot(ux, uy) || 1;
    ux /= l; uy /= l;
    const nx = -uy, ny = ux; // screen "side" axis
    const rings = secs.map((s) => sectionPts(J, view, s));
    const left = [], right = [];
    const ext = (ring) => {
      let iMin = 0, iMax = 0, vMin = 1e9, vMax = -1e9;
      ring.forEach((p, i) => {
        const v = p.x * nx + p.y * ny;
        if (v < vMin) { vMin = v; iMin = i; }
        if (v > vMax) { vMax = v; iMax = i; }
      });
      return [iMin, iMax];
    };
    const arc = (ring, i0, i1, wantUp) => {
      // two arcs between i0 and i1; choose the one with more extreme "up" coordinate
      const n = ring.length;
      const A1 = [], A2 = [];
      for (let i = i0; ; i = (i + 1) % n) { A1.push(ring[i]); if (i === i1) break; }
      for (let i = i0; ; i = (i - 1 + n) % n) { A2.push(ring[i]); if (i === i1) break; }
      const up = (arr) => arr.reduce((s, p) => s + (p.x * ux + p.y * uy), 0) / arr.length;
      return (wantUp ? up(A1) > up(A2) : up(A1) < up(A2)) ? A1 : A2;
    };
    rings.forEach((r) => {
      const [i0, i1] = ext(r);
      left.push(r[i0]);
      right.push(r[i1]);
    });
    const top = rings[rings.length - 1], bot = rings[0];
    const [t0, t1] = ext(top), [b0, b1] = ext(bot);
    const topArc = arc(top, t0, t1, true);
    const botArc = arc(bot, b1, b0, false);
    const pts = [].concat(left.slice(0, -1), topArc, right.slice(0, -1).reverse(), botArc);
    return { path: K.smoothPath(pts, true, 0.45), pts, side: { x: nx, y: ny }, up: { x: ux, y: uy } };
  };

  // Map a point on a torso surface (frame, height y, around-angle u in radians, 0 = front)
  B.surf = (J, view, fr, y, u, rx, rz, zs = 0, push = 0) => {
    const F = J[fr];
    const local = [Math.sin(u) * (rx + push), y, Math.cos(u) * (rz + push) + zs];
    return view.proj(U.add(F.p, U.mv(F.m, local)));
  };
  // Interpolated jersey radii at a given frame/height (for wrapping prints)
  const secAt = (secs, fr, y) => {
    const list = secs.filter((s) => s[0] === fr);
    for (let i = 1; i < list.length; i++) {
      if (y <= list[i][1]) {
        const a = list[i - 1], b = list[i], t = U.inv(a[1], b[1], y);
        return [U.lerp(a[2], b[2], t), U.lerp(a[3], b[3], t), U.lerp(a[4], b[4], t)];
      }
    }
    const l = list[list.length - 1];
    return [l[2], l[3], l[4]];
  };
  B.secAt = secAt;
  B.JERSEY = JERSEY;
  B.TORSO = TORSO;

  // Facing of a frame's front (+z) toward camera: >0 visible front.
  B.facing = (J, view, fr) => view.dir(U.col(J[fr].m, 2)).z;

  // ---- Hands ----
  // Local hand space: origin at wrist, -Y down the hand, +Z palm-forward (palm normal),
  // +X across (thumb side toward body midline for L hand mirrored by side).
  const HANDS = {
    relaxed: [[-4.2, 0, 0], [-4.8, -5, 0.6], [-4.6, -10, 1.2], [-3.8, -15, 2.6], [-2, -17.2, 3.4], [0.5, -17.5, 3.6], [2.8, -16.2, 3.3], [4.2, -13, 2.5], [4.6, -9, 1.4], [5.6, -6, 2.4], [6.2, -2.8, 2.6], [4.6, -0.6, 1.2]],
    fist: [[-4.4, 0, 0], [-5, -4, 0.5], [-4.8, -8.5, 1.8], [-3.6, -10.6, 3.6], [-0.5, -11.2, 4.2], [2.6, -10.6, 4.0], [4.6, -8.8, 3.0], [5.0, -5.5, 2.6], [5.2, -2.2, 2.4], [4.2, 0, 1]],
    open: [[-4.2, 0, 0], [-4.8, -6, 0], [-5.0, -10, 0], [-5.2, -16.5, 0.2], [-3.8, -17.5, 0.2], [-2.8, -11.5, 0], [-2.2, -18.6, 0.2], [-0.6, -18.9, 0.2], [-0.2, -11.6, 0], [0.6, -18.4, 0.2], [2.2, -17.9, 0.2], [2.4, -11.2, 0], [3.4, -16, 0.2], [4.6, -15, 0.2], [4.4, -9.5, 0], [6.6, -8.8, 0.8], [8.2, -6.4, 1.0], [6.8, -5, 0.6], [5.6, -2.8, 0.3], [4.4, 0, 0]],
    hold: [[-4.4, 0, 0], [-5.4, -6, 1.2], [-5.8, -11, 3.5], [-5.0, -16, 6.5], [-3.2, -17.6, 7.6], [-0.4, -18.4, 8], [2.4, -17.6, 7.6], [4.4, -15.4, 6.5], [5.0, -10.5, 4.2], [7.2, -8, 4.8], [8.2, -5, 4.0], [6.2, -2.4, 1.5], [4.6, 0, 0.4]],
    point: [[-4.4, 0, 0], [-5, -4, 0.5], [-4.8, -8.5, 1.8], [-3.6, -10.6, 3.6], [-1.4, -11.4, 3.6], [-0.6, -19, 0.6], [1.0, -19.2, 0.6], [1.6, -11.2, 3.6], [4.6, -8.8, 3.0], [5.0, -5.5, 2.6], [5.2, -2.2, 2.4], [4.2, 0, 1]],
  };
  const HAND_LINES = {
    relaxed: [[[-2.2, -10.5, 1.6], [-1.6, -15, 3.2]], [[0.6, -10.5, 1.6], [0.9, -15.6, 3.4]], [[2.8, -10, 1.5], [3.0, -14.4, 3.0]]],
    fist: [[[-2.2, -8.4, 3.6], [-2.0, -10.8, 4.1]], [[0.4, -8.6, 3.8], [0.5, -11.1, 4.2]], [[2.8, -8.2, 3.6], [2.9, -10.4, 4.0]], [[3.6, -3, 3.0], [1.0, -6.6, 4.2]]],
    open: [],
    hold: [[[-2.6, -11, 4.4], [-1.8, -16.6, 7.4]], [[0.5, -11.2, 4.4], [0.7, -17.4, 7.8]], [[3, -10.8, 4.2], [3.0, -16.2, 7.2]]],
    point: [[[1.6, -8.8, 3.8], [3.0, -10.6, 3.8]], [[3.6, -3, 3.0], [1.0, -6.6, 4.2]]],
  };

  B.drawHand = (ctx, J, view, side, shape, pal, lw) => {
    const s = side > 0 ? "L" : "R";
    const H = J["hand" + s];
    const pts3 = HANDS[shape] || HANDS.relaxed;
    const toW = (p) => U.add(H.p, U.mv(H.m, [p[0] * -side * 0.92, p[1] * 0.92, p[2] * 0.92]));
    const P = pts3.map((p) => view.proj(toW(p)));
    const path = K.smoothPath(P, true, shape === "open" ? 0.2 : 0.45);
    K.shape(ctx, path, { fill: pal.base, shade: pal.shade, shadeDepth: 2.2 * P[0].s, lw: lw * 0.85 });
    ctx.strokeStyle = A.CFG.lineColor;
    (HAND_LINES[shape] || []).forEach((ln) => {
      const a = view.proj(toW(ln[0])), b = view.proj(toW(ln[1]));
      K.stroke(ctx, [a, b], lw * 0.9, A.CFG.lineColor);
    });
  };

  // ---- Shoes ----
  // Shoe outline points in foot-local cm (origin ankle; +Z toes; -Y down).
  const SHOE = (() => {
    const side = [[0, 4, -5.5], [0, 2.5, 2], [0, 0.5, 8], [0, -1.8, 14.5], [0, -4.5, 18], [0, -7.6, 17.5], [0, -8.5, 12], [0, -8.5, 0], [0, -8.2, -5.5], [0, -5, -7], [0, 0, -6.6]];
    const out = [];
    for (const x of [-4.6, 4.6]) side.forEach((p) => out.push([x * (p[2] > 10 ? 0.85 : 1), p[1], p[2]]));
    out.push([0, 5.2, -5], [0, 3.2, 4]);
    return out;
  })();
  B.drawShoe = (ctx, J, view, side, pal, lw) => {
    const s = side > 0 ? "L" : "R";
    const F = J["foot" + s];
    const W = (p) => view.proj(U.add(F.p, U.mv(F.m, p)));
    const pts = SHOE.map(W);
    const hull = convexHull(pts);
    const path = K.smoothPath(hull, true, 0.35);
    K.shape(ctx, path, { fill: pal.base, shade: pal.shade, shadeDepth: 3 * pts[0].s, lw });
    // sole band
    const sole = [[-4.7, -6.3, -6.6], [-4.8, -6.2, 6], [-4.2, -5.0, 16.5], [0, -4.8, 18.2], [4.2, -5.0, 16.5], [4.8, -6.2, 6], [4.7, -6.3, -6.6]];
    const fr = view.dir(U.col(F.m, 0)).z * side; // which side faces camera
    const solePts = sole.map(W);
    const lower = [[-4.7, -8.6, -6], [-4.8, -8.6, 10], [0, -8.6, 17.5], [4.8, -8.6, 10], [4.7, -8.6, -6]].map(W);
    ctx.save();
    ctx.clip(path);
    const sp = new Path2D();
    sp.moveTo(solePts[0].x, solePts[0].y);
    solePts.forEach((p) => sp.lineTo(p.x, p.y));
    for (let i = lower.length - 1; i >= 0; i--) sp.lineTo(lower[i].x, lower[i].y);
    sp.closePath();
    ctx.fillStyle = pal.sole;
    ctx.fill(sp);
    // accent swoosh-free stripe (original design, maroon)
    const st = [[4.7 * 1.02, -2.5, -4], [4.9, -4.2, 6], [4.4, -3.2, 12]].map((p) => W([p[0] * (fr >= 0 ? 1 : -1), p[1], p[2]]));
    K.stroke(ctx, st, 2.4 * pts[0].s, pal.accent);
    // laces
    const lc = [[0, 3.6, 0.5], [0, 2.3, 4], [0, 0.8, 7.5], [0, -1, 11]].map(W);
    for (let i = 0; i < lc.length; i++) {
      const p = lc[i];
      K.stroke(ctx, [{ x: p.x - 2.2 * p.s, y: p.y }, { x: p.x + 2.2 * p.s, y: p.y + 0.4 * p.s }], 1.6, A.CFG.lineColor);
    }
    ctx.restore();
    ctx.strokeStyle = A.CFG.lineColor;
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.moveTo(solePts[0].x, solePts[0].y);
    solePts.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  };

  function convexHull(pts) {
    const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    const cr = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    up.pop(); lo.pop();
    return lo.concat(up);
  }
  B.convexHull = convexHull;

  A.B = B;
})(window.A = window.A || {});
