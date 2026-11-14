// Head: pseudo-3D skull with projected landmarks, structured hair locks, and facial
// features drawn on local surface planes (so they foreshorten correctly when the head turns).
// Expression parameters (face):
//   lid (0 closed .. 1 normal .. 1.3 wide), lidL/lidR overrides, gaze [x,y] (-1..1),
//   brow (raise -1..1), browAngle (anger + / worry -), mouth: 'neutral'|'smirk'|'grin'|'talk'|'shout'|'yawn',
//   open (0..1), round (0..1), smile (-1..1), zone (0..1 glowing eyes), blush, sweat
(function (A) {
  const U = A.U, K = A.K;
  const H = {};

  const SKULL_C = [0, 9.0, -0.8];
  const SKULL_R = 9.0;
  const FACE = {
    jawL: [6.5, -1.0, 2.2], jawMidL: [5.1, -3.5, 4.9], chinL: [2.3, -5.1, 6.7], chin: [0, -5.35, 7.1],
    cheekL: [6.9, 2.0, 5.1], cheekboneL: [7.3, 5.0, 5.4], templeL: [7.6, 9.4, 4.6], brow: [0, 8.6, 8.8],
    forehead: [0, 14, 7.9], noseTip: [0, 1.6, 10.1], noseBridge: [0, 6.4, 9.4],
    eyeL: [3.4, 5.7, 8.15], mouth: [0, -0.9, 8.6], earL: [8.7, 5.0, -0.2],
  };
  const mirrorX = (p) => [-p[0], p[1], p[2]];

  // Hair locks: [azimuth deg (0 front, +90 = his left), elevation deg, dir[x,y,z] local tangent-ish,
  //              length cm, width cm, bend]
  const LOCKS = (() => {
    const L = [];
    // fringe: irregular, layered spikes falling over the forehead (reference: KnB Aomine)
    const fr = [[-40, 44, 6.4, 3.4, [0.45, -1, 0.3]], [-27, 48, 8.2, 3.8, [0.3, -1, 0.42]], [-13, 50, 9.6, 3.9, [0.12, -1, 0.45]],
      [0, 51, 8.4, 3.8, [-0.02, -1, 0.45]], [13, 50, 9.8, 3.9, [-0.16, -1, 0.45]], [27, 48, 8.0, 3.7, [-0.32, -1, 0.42]], [40, 44, 6.6, 3.4, [-0.5, -1, 0.3]],
      [-20, 60, 8.4, 4.4, [0.25, -1, 0.65]], [6, 61, 8.8, 4.4, [-0.05, -1, 0.7]], [28, 59, 7.8, 4.2, [-0.35, -1, 0.6]]];
    fr.forEach(([az, el, len, w, d]) => L.push({ az, el, d, len, w, bend: 0.7, front: true }));
    // sides over temples and ears (both sides), pointing down and slightly out
    for (const s of [1, -1]) {
      [[54, 38, 6.8, 3.6, [0.3, -1, 0.1]], [70, 30, 6.2, 3.4, [0.35, -1, -0.05]], [86, 24, 5.6, 3.2, [0.3, -1, -0.2]],
        [104, 22, 5.6, 3.2, [0.25, -1, -0.35]], [60, 54, 7.2, 4.2, [0.6, -0.8, 0.2]], [84, 50, 7.0, 4.2, [0.7, -0.7, -0.15]],
        [112, 46, 6.6, 4.2, [0.55, -0.75, -0.5]]]
        .forEach(([az, el, len, w, d]) => L.push({ az: az * s, el, d: [d[0] * s, d[1], d[2]], len, w, bend: 0.6 }));
    }
    // top: short spikes, mostly sweeping back and out
    [[-45, 72, [-0.6, 0.15, -0.5]], [0, 78, [0, 0.25, -0.9]], [45, 72, [0.6, 0.15, -0.5]], [-90, 68, [-0.85, 0.05, -0.4]],
      [90, 68, [0.85, 0.05, -0.4]], [-22, 66, [-0.4, 0.2, -0.3]], [22, 66, [0.4, 0.2, -0.3]], [180, 72, [0, 0.05, -1]],
      [140, 70, [0.5, 0, -0.8]], [-140, 70, [-0.5, 0, -0.8]]]
      .forEach(([az, el, d], i) => L.push({ az, el, d, len: 5.6 + (i % 3) * 0.6, w: 4.6, bend: 0.5 }));
    // back of the head, nape spikes
    [[140, 40], [180, 44], [-140, 40], [120, 14], [160, 12], [200, 12], [-120, 14], [150, -8], [180, -12], [-150, -8]]
      .forEach(([az, el]) => {
        const a = az * U.D;
        L.push({ az, el, d: [Math.sin(a) * 0.45, -1, Math.cos(a) * 0.55], len: el < 0 ? 5.2 : 6.4, w: 4.4, bend: 0.5 });
      });
    return L;
  })();

  const sph = (az, el, r) => {
    const a = az * U.D, e = el * U.D;
    return [SKULL_C[0] + Math.sin(a) * Math.cos(e) * r, SKULL_C[1] + Math.sin(e) * r, SKULL_C[2] + Math.cos(a) * Math.cos(e) * r];
  };

  // local -> screen helpers
  const P = (Hd, view, p) => view.proj(U.add(Hd.p, U.mv(Hd.m, p)));

  // Affine transform for drawing on a small plane on the face.
  // c: local centre, tx: local tangent (x), ty: local up (y). Returns DOMMatrix mapping cm -> px (y up).
  function planeT(Hd, view, c, tx, ty) {
    const o = P(Hd, view, c), x = P(Hd, view, U.add(c, tx)), y = P(Hd, view, U.add(c, ty));
    return new DOMMatrix([x.x - o.x, x.y - o.y, y.x - o.x, y.y - o.y, o.x, o.y]);
  }

  function hull(pts) { return A.B.convexHull(pts); }

  // ----- face silhouette -----
  function facePath(Hd, view) {
    const pts = [];
    // skull circle samples (only lower/front half matters, hair covers the rest)
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * 360;
      for (const el of [40, 60]) pts.push(P(Hd, view, sph(a, el, SKULL_R)));
    }
    for (const k of ["jawL", "jawMidL", "chinL", "cheekL", "cheekboneL", "templeL"]) {
      pts.push(P(Hd, view, FACE[k]));
      pts.push(P(Hd, view, mirrorX(FACE[k])));
    }
    pts.push(P(Hd, view, FACE.chin), P(Hd, view, FACE.forehead), P(Hd, view, FACE.brow));
    const h = hull(pts);
    return K.smoothPath(h, true, 0.35);
  }

  // ----- hair geometry -----
  function lockGeom(Hd, view, L, lag) {
    const root = sph(L.az, L.el, SKULL_R + 1.2);
    const nrm = U.norm(U.sub(root, SKULL_C));
    const d = U.norm(L.d);
    const mid = U.add(U.add(root, U.mul(d, L.len * 0.5)), U.mul(nrm, L.len * 0.12 * L.bend + 0.8));
    let tip = U.add(U.add(root, U.mul(d, L.len)), U.mul(nrm, L.len * 0.08));
    // secondary motion: lag in local space (lag already in head-local cm)
    if (lag) {
      tip = U.add(tip, U.mul(lag, 1));
    }
    const midL = lag ? U.add(mid, U.mul(lag, 0.45)) : mid;
    const pts = [root, midL, tip].map((p) => P(Hd, view, p));
    const facing = view.dir(U.mv(Hd.m, nrm)).z;
    return { pts, facing, w: L.w, root };
  }
  function lockPath(g, s) {
    // base wide, sharp tip; slight S via resample
    return K.taperPath(g.pts, (t) => g.w * s * Math.pow(1 - t, 0.85) + 0.3, 12);
  }

  function capPath(Hd, view) {
    const pts = [];
    for (let az = -180; az < 180; az += 15) {
      const a = Math.abs(az);
      const hairline = a < 40 ? 46 : a < 100 ? U.lerp(46, 18, (a - 40) / 60) : U.lerp(18, -14, (a - 100) / 80);
      for (let el = hairline; el <= 90; el += 12) pts.push(P(Hd, view, sph(az, el, SKULL_R + 1.5)));
    }
    return K.smoothPath(hull(pts), true, 0.4);
  }

  // ----- eyes -----
  function drawEye(ctx, Hd, view, side, f, pal, lwPx) {
    const c = side > 0 ? FACE.eyeL : mirrorX(FACE.eyeL);
    const ang = 0.38 * side;
    const tx = [Math.cos(ang) * side, 0, -Math.sin(ang) * side];
    const ty = [0, 1, 0.1];
    const nrm = U.norm(U.cross(ty, tx));
    const facing = view.dir(U.mv(Hd.m, [Math.sin(ang), 0.05, Math.cos(ang)])).z;
    if (facing < 0.08) return;
    const T = planeT(Hd, view, c, U.mul(tx, 1.22), U.mul(ty, 1.22));
    const pxPerCm = Math.hypot(T.c, T.d) || 1;
    const lw = lwPx / pxPerCm;
    ctx.save();
    ctx.setTransform(ctx.getTransform().multiply(T));
    const lid = U.clamp(side > 0 ? (f.lidL != null ? f.lidL : f.lid) : (f.lidR != null ? f.lidR : f.lid), 0, 1.4);
    const anger = f.browAngle || 0;
    // upper lid curve (inner -> outer). Heavy-lidded, sharp.
    const top = (lid0) => {
      const h = 0.78 * lid0;
      return [{ x: -1.8, y: -0.05 }, { x: -0.95, y: 0.2 + h * 0.5 - anger * 0.12 }, { x: 0.3, y: 0.18 + h * 0.62 }, { x: 1.4, y: 0.16 + h * 0.48 }, { x: 2.25, y: 0.3 }];
    };
    const bot = [{ x: -1.7, y: -0.12 }, { x: -0.6, y: -0.5 }, { x: 0.8, y: -0.56 }, { x: 1.8, y: -0.22 }, { x: 2.25, y: 0.28 }];
    const ut = top(lid);
    const closed = lid < 0.12;
    if (!closed) {
      // white
      const wp = K.smoothPath(ut.concat(bot.slice().reverse().slice(1, -1)), true, 0.4);
      ctx.fillStyle = pal.eye.white;
      ctx.fill(wp);
      ctx.save();
      ctx.clip(wp);
      const g = f.gaze || [0, 0];
      const ix = 0.15 + g[0] * 0.75 * side, iy = -0.05 + g[1] * 0.3;
      // iris
      ctx.fillStyle = f.zone > 0.01 ? U.mixc(pal.eye.iris, "#7fc3ff", f.zone) : pal.eye.iris;
      ctx.beginPath(); ctx.ellipse(ix, iy, 0.8, 0.92, 0, 0, U.TAU); ctx.fill();
      ctx.fillStyle = pal.eye.irisDark;
      ctx.beginPath(); ctx.ellipse(ix, iy + 0.35, 0.86, 0.6, 0, Math.PI, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(ix, iy - 0.05, 0.34, 0.44, 0, 0, U.TAU); ctx.fill();
      ctx.fillStyle = pal.eye.irisHi;
      ctx.beginPath(); ctx.ellipse(ix, iy - 0.55, 0.55, 0.2, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.ellipse(ix + 0.32 * side, iy + 0.38, 0.17, 0.2, 0, 0, U.TAU); ctx.fill();
      // lid shadow on the eyeball
      ctx.fillStyle = "rgba(40,50,90,0.35)";
      ctx.fill(K.taperPath(ut.map((p) => ({ x: p.x, y: p.y - 0.18 })), () => 0.5, 10));
      ctx.restore();
    }
    // upper lid line: heavy, tapering at the inner corner, flicked at the outer corner
    const lidLine = closed
      ? [{ x: -1.7, y: 0 }, { x: -0.4, y: -0.3 }, { x: 1.0, y: -0.28 }, { x: 2.2, y: 0.05 }]
      : ut.concat([{ x: 2.45, y: -0.12 }]);
    ctx.fillStyle = pal.eye.lid;
    ctx.fill(K.taperPath(lidLine, (t) => (0.1 + 0.55 * Math.sin(Math.PI * Math.min(1, t * 1.08)) ** 0.4) * Math.max(0.6, lw * 2.2), 16));
    if (!closed) {
      // lower lid: thin, partial, outer half
      ctx.fill(K.taperPath(bot.slice(2), K.W.taper(0.16 * lw * 2.6 / 2.6 * 2), 8));
    }
    if (f.zone > 0.01) {
      // zone: electric glow at the outer corner
      ctx.globalCompositeOperation = "lighter";
      const gr = ctx.createRadialGradient(0.4, 0, 0, 0.4, 0, 3.5);
      gr.addColorStop(0, U.alpha("#bfe0ff", 0.65 * f.zone));
      gr.addColorStop(1, "rgba(60,120,255,0)");
      ctx.fillStyle = gr;
      ctx.fillRect(-4, -4, 8, 8);
    }
    ctx.restore();
  }

  function drawBrow(ctx, Hd, view, side, f, pal, lwPx) {
    const c = side > 0 ? [3.5, 7.75, 8.5] : [-3.5, 7.75, 8.5];
    const ang = 0.42 * side;
    const tx = [Math.cos(ang) * side, 0, -Math.sin(ang) * side];
    const facing = view.dir(U.mv(Hd.m, [Math.sin(ang), 0.1, Math.cos(ang)])).z;
    if (facing < 0.0) return;
    const T = planeT(Hd, view, c, tx, [0, 1, 0.05]);
    ctx.save();
    ctx.setTransform(ctx.getTransform().multiply(T));
    const r = (f.brow || 0) * 0.55, a = (f.browAngle || 0) * 0.5;
    const pts = [{ x: -2.1, y: -0.45 + r - a }, { x: -0.7, y: -0.05 + r - a * 0.45 }, { x: 1.1, y: 0.28 + r * 0.8 }, { x: 2.9, y: 0.22 + r * 0.5 + a * 0.12 }];
    ctx.fillStyle = pal.hair.shade;
    ctx.fill(K.taperPath(pts, (t) => (1.15 - t * 0.75) * (t < 0.08 ? t / 0.08 * 0.6 + 0.4 : 1), 14));
    ctx.fillStyle = pal.hair.base;
    ctx.fill(K.taperPath(pts.map((p) => ({ x: p.x, y: p.y + 0.12 })), (t) => (0.4 - t * 0.25), 10));
    ctx.restore();
  }

  function drawNose(ctx, Hd, view, f, pal, lwPx) {
    // side of the bridge facing away from light/camera gets the line
    const yawS = view.dir(U.mv(Hd.m, [1, 0, 0])).z; // >0 his left side faces camera
    const sgn = yawS > 0 ? -1 : 1;
    const a = P(Hd, view, [0.7 * sgn, 4.2, 9.6]);
    const b = P(Hd, view, [0.4 * sgn, 2.8, 10.0]);
    const tip = P(Hd, view, [0.1 * sgn, 1.6, 10.15]);
    const n1 = P(Hd, view, [0.9 * sgn, 1.05, 9.7]);
    const n2 = P(Hd, view, [-0.9 * sgn, 1.0, 9.6]);
    const s = tip.s;
    K.stroke(ctx, [a, b, tip], lwPx * 0.75, U.alpha(A.CFG.lineColor, 0.7));
    K.stroke(ctx, [{ x: tip.x, y: tip.y }, n1], lwPx * 0.7, A.CFG.lineColor);
    // nose shadow
    ctx.fillStyle = U.alpha(pal.skin.shade, 0.9);
    ctx.fill(K.taperPath([b, tip, n2], K.W.taper(0.55 * s)));
  }

  function drawMouth(ctx, Hd, view, f, pal, lwPx) {
    const c = FACE.mouth;
    const facing = view.dir(U.mv(Hd.m, [0, 0, 1])).z;
    if (facing < -0.2) return;
    const T = planeT(Hd, view, c, [1, 0, 0], [0, 1, 0.15]);
    const pxPerCm = Math.hypot(T.a, T.b) || 1;
    const lw = Math.max(0.12, lwPx / Math.max(pxPerCm, Math.hypot(T.c, T.d)));
    ctx.save();
    ctx.setTransform(ctx.getTransform().multiply(T));
    const type = f.mouth || "neutral";
    const open = U.clamp(f.open || 0, 0, 1);
    const rnd = U.clamp(f.round || 0, 0, 1);
    const sm = f.smile || 0;
    const ink = A.CFG.lineColor;
    if (open < 0.08 && type !== "grin" && type !== "shout") {
      let pts;
      if (type === "smirk") pts = [{ x: -1.7, y: 0.05 }, { x: -0.4, y: -0.12 }, { x: 0.9, y: 0.05 }, { x: 1.95, y: 0.55 }];
      else if (type === "frown") pts = [{ x: -1.3, y: -0.2 }, { x: 0, y: 0.05 }, { x: 1.3, y: -0.2 }];
      else pts = [{ x: -1.5, y: -0.05 + sm * 0.3 }, { x: 0, y: -0.12 - sm * 0.15 }, { x: 1.5, y: -0.05 + sm * 0.3 }];
      ctx.fillStyle = ink;
      ctx.fill(K.taperPath(pts, K.W.taper(lw * 1.25), 10));
      // lower lip hint
      ctx.fillStyle = U.alpha(pal.skin.shade, 0.9);
      ctx.fill(K.taperPath([{ x: -0.6, y: -0.85 }, { x: 0.1, y: -0.95 }, { x: 0.7, y: -0.85 }], K.W.taper(0.22), 6));
    } else {
      let w = 1.75 * (1 - 0.38 * rnd) + Math.max(0, sm) * 0.35;
      let h = 0.25 + open * 1.9;
      if (type === "grin") { w = 2.3; h = Math.max(h, 1.15); }
      if (type === "shout") { w = 2.0; h = Math.max(h, 2.2); }
      const up = 0.05 + sm * 0.35;
      const pts = [{ x: -w, y: up }, { x: -w * 0.5, y: 0.18 }, { x: 0, y: 0.12 }, { x: w * 0.5, y: 0.18 }, { x: w, y: up + (type === "grin" ? 0.25 : 0) },
        { x: w * 0.7, y: -h * 0.55 }, { x: 0, y: -h }, { x: -w * 0.7, y: -h * 0.55 }];
      const mp = K.smoothPath(pts, true, 0.45);
      ctx.fillStyle = pal.mouth.inside;
      ctx.fill(mp);
      ctx.save();
      ctx.clip(mp);
      ctx.fillStyle = pal.mouth.teeth;
      ctx.fillRect(-w, -0.42, w * 2, 0.7);
      if (type === "grin" || type === "shout") { ctx.fillRect(-w, -h - 0.1, w * 2, 0.45); }
      ctx.fillStyle = pal.mouth.tongue;
      ctx.beginPath(); ctx.ellipse(0, -h * 1.02, w * 0.6, h * 0.45, 0, 0, U.TAU); ctx.fill();
      ctx.restore();
      ctx.lineWidth = lw * 0.8;
      ctx.strokeStyle = ink;
      ctx.stroke(mp);
      ctx.fillStyle = ink;
      ctx.fill(K.taperPath(pts.slice(0, 5), K.W.taper(lw * 1.1), 10));
    }
    ctx.restore();
  }

  function drawEar(ctx, Hd, view, side, pal, lwPx) {
    const c = side > 0 ? FACE.earL : mirrorX(FACE.earL);
    const facing = view.dir(U.mv(Hd.m, [side, 0, 0])).z;
    if (facing < 0.05) return;
    const T = planeT(Hd, view, c, [0, 0, -1 * side * -1], [0, 1, 0]);
    const tb = [0, 0, 1];
    const T2 = planeT(Hd, view, c, tb, [0, 1, 0]);
    ctx.save();
    ctx.setTransform(ctx.getTransform().multiply(T2));
    const sx = side > 0 ? -1 : -1;
    const pts = [{ x: 0.2, y: 2.4 }, { x: -1.2, y: 2.6 }, { x: -2.2, y: 1.2 }, { x: -2.0, y: -1.2 }, { x: -1.0, y: -2.6 }, { x: 0.4, y: -2.2 }, { x: 0.6, y: 0 }].map((p) => ({ x: p.x * sx * -1 * (side > 0 ? -1 : 1) * -1, y: p.y }));
    const ep = K.smoothPath(pts, true, 0.5);
    const pxPerCm = Math.hypot(T2.c, T2.d) || 1;
    K.shape(ctx, ep, { fill: pal.skin.base, shade: pal.skin.shade, shadeDepth: 0.6, lw: lwPx / pxPerCm, lineBias: 0.3, light: [0, -1] });
    ctx.fillStyle = pal.skin.deep;
    const inner = pts.slice(1, 5).map((p) => ({ x: p.x * 0.55, y: p.y * 0.6 }));
    ctx.fill(K.taperPath(inner, K.W.taper(0.35), 8));
    ctx.restore();
  }

  // Offscreen layer used for union cel-shading of the hair mass.
  let OFF = null;
  function off(ctx) {
    const c = ctx.canvas;
    if (!OFF || OFF.width !== c.width || OFF.height !== c.height) {
      OFF = document.createElement("canvas");
      OFF.width = c.width; OFF.height = c.height;
    }
    const o = OFF.getContext("2d");
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.globalCompositeOperation = "source-over";
    o.clearRect(0, 0, OFF.width, OFF.height);
    o.setTransform(ctx.getTransform());
    return o;
  }
  // Paint a group of paths as one cel-shaded mass (shadow strip computed on the union).
  function unionPaint(ctx, paths, o, extra) {
    const L = o.light || A.CFG.light; const ln = Math.hypot(L[0], L[1]) || 1;
    const lx = L[0] / ln, ly = L[1] / ln;
    const g = off(ctx);
    g.fillStyle = o.shade;
    paths.forEach((p) => g.fill(p));
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = o.fill;
    paths.forEach((p) => g.fill(K.moved(p, lx * o.shadeDepth, ly * o.shadeDepth)));
    if (extra) extra(g);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(OFF, 0, 0);
    ctx.restore();
  }

  // Public: draw the whole head. Hd = head joint {p,m}; lag = hair lag vector (local cm).
  H.draw = (ctx, Hd, view, f, pal, opts = {}) => {
    const lw = opts.lw;
    const s = P(Hd, view, SKULL_C).s; // px per cm at head
    const lag = opts.hairLag || null;
    const locks = LOCKS.map((L) => ({ L, g: lockGeom(Hd, view, L, lag && U.mul(lag, L.len / 8)) }));
    locks.forEach((o) => (o.path = lockPath(o.g, s)));
    const back = locks.filter((o) => o.g.facing < -0.15 && !o.L.front);
    const front = locks.filter((o) => !(o.g.facing < -0.15 && !o.L.front));
    const hairO = { fill: pal.hair.base, shade: pal.hair.shade, shadeDepth: 2.2 * s, lw, light: opts.light };
    const cap = capPath(Hd, view);
    const yawS = view.dir(U.mv(Hd.m, [1, 0, 0])).z;
    const sh = yawS > 0 ? -1 : 1; // side of the face turned away from camera

    // back hair mass
    back.forEach((o) => K.outline(ctx, o.path, hairO));
    K.outline(ctx, cap, hairO);
    unionPaint(ctx, back.map((o) => o.path).concat([cap]), hairO);

    drawEar(ctx, Hd, view, 1, pal, lw);
    drawEar(ctx, Hd, view, -1, pal, lw);

    // face
    const fp = facePath(Hd, view);
    K.shape(ctx, fp, { fill: pal.skin.base, shade: pal.skin.shade, shadeDepth: 2.0 * s, lw, light: opts.light, rim: opts.rim, rimW: opts.rimW, rimDir: opts.rimDir });
    // cheekbone hatching on the shadow side (reference style)
    for (let k = 0; k < 3; k++) {
      const a = P(Hd, view, [6.6 * sh, 4.6 - k * 0.7, 6.0]), b = P(Hd, view, [5.6 * sh, 3.6 - k * 0.7, 6.9]);
      if (view.dir(U.mv(Hd.m, [sh * 0.7, 0, 0.7])).z > 0) K.stroke(ctx, [a, b], lw * 0.55, U.alpha(pal.skin.deep, 0.55));
    }
    drawBrow(ctx, Hd, view, 1, f, pal, lw);
    drawBrow(ctx, Hd, view, -1, f, pal, lw);
    drawEye(ctx, Hd, view, 1, f, pal, lw);
    drawEye(ctx, Hd, view, -1, f, pal, lw);
    drawNose(ctx, Hd, view, f, pal, lw);
    drawMouth(ctx, Hd, view, f, pal, lw);
    if (f.blush) {
      ctx.fillStyle = U.alpha(pal.skin.blush, 0.35 * f.blush);
      for (const sg of [1, -1]) { const c = P(Hd, view, [4.4 * sg, 3.2, 7.4]); ctx.beginPath(); ctx.ellipse(c.x, c.y, 1.6 * s, 0.7 * s, 0, 0, U.TAU); ctx.fill(); }
    }
    if (f.sweat) {
      const sp = P(Hd, view, [-5.5 * sh, 9.5, 7.2]);
      ctx.fillStyle = U.alpha("#e9f4ff", 0.85 * f.sweat);
      ctx.beginPath(); ctx.ellipse(sp.x, sp.y, 0.45 * s, 0.75 * s, 0.2, 0, U.TAU); ctx.fill();
    }

    // hair shadow cast on the forehead by the fringe
    ctx.save();
    ctx.clip(fp);
    ctx.fillStyle = U.alpha(pal.skin.shade, 0.95);
    front.filter((o) => o.L.front).forEach((o) => {
      const g = o.g;
      const pts = g.pts.map((p) => ({ x: p.x + 0.3 * s, y: p.y + 1.1 * s }));
      ctx.fill(K.taperPath(pts, (t) => g.w * s * 1.1 * Math.pow(1 - t, 0.7) + 0.4, 10));
    });
    ctx.restore();

    // front hair: merged outline, union cel-shading, then lock separation + highlights
    front.forEach((o) => K.outline(ctx, o.path, hairO));
    K.outline(ctx, cap, hairO);
    const lx = (opts.light || A.CFG.light)[0], ly = (opts.light || A.CFG.light)[1];
    unionPaint(ctx, [cap].concat(front.map((o) => o.path)), hairO, (g) => {
      // locks overlapping others: thin dark edge on the side away from light = separated mechas
      front.forEach((o, i) => {
        if (o.g.facing < 0.05) return;
        const [r, m, t] = o.g.pts;
        const dx = t.x - r.x, dy = t.y - r.y, l = Math.hypot(dx, dy) || 1;
        let nx = -dy / l, ny = dx / l;
        if (nx * lx + ny * ly > 0) { nx = -nx; ny = -ny; }
        const w = o.g.w * s * 0.42;
        const edge = [r, m, t].map((p, k) => ({ x: p.x + nx * w * (1 - k * 0.45), y: p.y + ny * w * (1 - k * 0.45) }));
        g.fillStyle = pal.hair.shade;
        g.fill(K.taperPath(edge, (u) => (1 - u) * 1.3 * s + 0.4, 10));
        g.fillStyle = U.alpha(pal.hair.deep, 0.9);
        g.fill(K.taperPath(edge, (u) => (1 - u) * 0.35 * s + 0.6, 10));
      });
      // a few glossy streaks
      g.fillStyle = U.alpha(pal.hair.hi, 0.9);
      front.forEach((o, i) => {
        if (o.g.facing < 0.25 || i % 3 !== 0) return;
        const [r, m, t] = o.g.pts;
        const hl = [U.lerp2(r, m, 0.55), U.lerp2(m, t, 0.05), U.lerp2(m, t, 0.4)].map((p) => ({ x: p.x + lx * 0.6 * s, y: p.y + ly * 0.6 * s }));
        g.fill(K.taperPath(hl, K.W.taper(0.6 * s), 8));
      });
    });
  };

  H.headTopY = () => SKULL_C[1] + SKULL_R + 3;
  H.FACE = FACE;
  A.H = H;
})(window.A = window.A || {});
