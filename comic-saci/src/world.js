// Set and effects: night city, the burning building, fire, smoke, whirlwind, the girl.
(function (A) {
  const U = A.U, K = A.K;
  const Wd = (A.WORLD = {});
  const COL = {
    sky0: "#0e1430", sky1: "#26285a", sky2: "#5a3a6a", glow: "#e0703a",
    far: "#1c2246", farWin: "#e8c060", mid: "#2a3462", midS: "#1e2650",
    wall: "#5f7684", wallS: "#3e5260", wallH: "#7d95a0", trim: "#c9c0a8", trimS: "#8f8878",
    win: "#1a1e30", winLit: "#f2c25a", street: "#2a2c38", walk: "#4a4a58", lamp: "#232838",
  };
  Wd.COL = COL;
  // Building geometry (world units): x 0..520, ground y 0, floors of 110 upward (negative y)
  const B = { x0: 0, x1: 520, floors: 7, fh: 110, cols: 4 };
  Wd.B = B;
  Wd.window = (floor, col) => {
    const cw = (B.x1 - B.x0) / B.cols;
    return { x: B.x0 + cw * (col + 0.5), y: -B.fh * (floor + 0.5), w: cw * 0.52, h: B.fh * 0.56 };
  };
  Wd.ledge = (floor, col) => { const w = Wd.window(floor, col); return [w.x, w.y + w.h / 2 + 10]; };
  Wd.FIRE = [[4, 1], [4, 3], [5, 0], [5, 2], [5, 3], [6, 1], [6, 2]]; // burning windows (floor, col)
  Wd.GIRL = [5, 1];

  // ---------------- sky & far city (parallax layers draw in screen space with offsets) ----------------
  Wd.sky = (ctx, W, H, glow = 1) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, COL.sky0); g.addColorStop(0.55, COL.sky1); g.addColorStop(1, COL.sky2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (glow > 0) {
      const r = ctx.createRadialGradient(W * 0.55, H * 0.9, 0, W * 0.55, H * 0.9, H * 1.0);
      r.addColorStop(0, `rgba(240,120,60,${0.45 * glow})`); r.addColorStop(1, "rgba(240,120,60,0)");
      ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    }
  };
  Wd.moon = (ctx, x, y, r) => {
    const p = new Path2D(); p.arc(x, y, r, 0, U.TAU);
    K.shape(ctx, p, "#f4ecd0", 3);
    const sh = new Path2D(); sh.arc(x + r * 0.45, y - r * 0.2, r, 0, U.TAU);
    ctx.save(); ctx.clip(p); ctx.fillStyle = K.dots(9, 2.2, "rgba(160,150,120,0.5)"); ctx.fill(sh); ctx.restore();
  };
  Wd.stars = (ctx, W, H, ox, oy) => {
    const r = U.rng(9);
    ctx.fillStyle = "#e8e4d0";
    for (let i = 0; i < 70; i++) {
      const x = ((r() * W * 1.5 + ox) % (W * 1.5) + W * 1.5) % (W * 1.5) - W * 0.25, y = r() * H * 0.6 + oy;
      const s = r() < 0.15 ? 2.4 : 1.2;
      ctx.fillRect(x, y, s, s);
    }
  };
  // skyline band: deterministic buildings; `cam` = {x, y, z} world camera; k = parallax
  Wd.skyline = (ctx, cam, k, baseY, color, winCol, seed, hMin, hMax, W) => {
    const r = U.rng(seed);
    let x = -800;
    const off = -cam.x * k;
    ctx.fillStyle = color;
    const items = [];
    while (x < 4000) { const w = 70 + r() * 120, h = hMin + r() * (hMax - hMin); items.push([x, w, h, r()]); x += w + r() * 10; }
    items.forEach(([bx, bw, bh, q]) => {
      const sx = bx + off, sy = baseY - cam.y * k;
      if (sx > W + 50 || sx + bw < -50) return;
      ctx.fillStyle = color; ctx.fillRect(sx, sy - bh, bw, bh + 600);
      if (q > 0.6) { ctx.fillRect(sx + bw * 0.4, sy - bh - 30, 6, 30); }
      if (winCol) {
        ctx.fillStyle = winCol;
        const rr = U.rng(Math.floor(bx));
        for (let wy = sy - bh + 14; wy < sy; wy += 22)
          for (let wx = sx + 10; wx < sx + bw - 12; wx += 18)
            if (rr() > 0.78) ctx.fillRect(wx, wy, 7, 10);
      }
    });
  };

  // ---------------- the building (world space; caller sets the transform) ----------------
  Wd.building = (ctx, t, fire, opts = {}) => {
    const { x0, x1, floors, fh } = B;
    const top = -floors * fh;
    const body = new Path2D(); body.rect(x0, top, x1 - x0, -top);
    K.shape(ctx, body, COL.wall, 5);
    // shadow mass on the right side + under cornices
    const sh = new Path2D(); sh.rect(x1 - 70, top, 70, -top);
    K.shade(ctx, body, sh, COL.wallS, { size: 8, r: 2, color: "rgba(10,15,30,0.35)" });
    // fire light washing the upper facade
    if (fire > 0) {
      ctx.save(); ctx.clip(body);
      const g = ctx.createLinearGradient(0, -fh * 7, 0, -fh * 3.5);
      g.addColorStop(0, `rgba(255,140,60,${0.35 * fire})`); g.addColorStop(1, "rgba(255,140,60,0)");
      ctx.fillStyle = g; ctx.fillRect(x0, top, x1 - x0, -top);
      ctx.restore();
    }
    // brick texture lines (subtle)
    ctx.save(); ctx.clip(body);
    ctx.strokeStyle = "rgba(20,25,40,0.18)"; ctx.lineWidth = 1.2;
    for (let y = top + 12; y < 0; y += 14) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
    ctx.restore();
    // floor cornices
    for (let f = 1; f <= floors; f++) {
      const y = -f * fh;
      const c = new Path2D(); c.rect(x0 - 8, y - 4, x1 - x0 + 16, 10);
      K.shape(ctx, c, COL.trim, 3);
      K.shade(ctx, c, (() => { const p = new Path2D(); p.rect(x0 - 8, y + 2, x1 - x0 + 16, 4); return p; })(), COL.trimS);
    }
    // windows
    const burning = new Set(Wd.FIRE.map((q) => q.join(",")));
    for (let f = 1; f < floors; f++) for (let c = 0; c < B.cols; c++) {
      const w = Wd.window(f, c);
      const key = f + "," + c;
      const isGirl = key === Wd.GIRL.join(",");
      const burn = burning.has(key);
      const frame = new Path2D(); frame.rect(w.x - w.w / 2 - 6, w.y - w.h / 2 - 6, w.w + 12, w.h + 12);
      K.shape(ctx, frame, COL.trim, 3);
      const glass = new Path2D(); glass.rect(w.x - w.w / 2, w.y - w.h / 2, w.w, w.h);
      const lit = (U.hash(f * 7 + c) > 0.55 && !burn) || isGirl;
      const inner = burn ? (fire > 0.05 ? "#ffcf6a" : "#2a2422") : lit ? COL.winLit : COL.win;
      K.shape(ctx, glass, inner, 3);
      if (burn && fire > 0.05) {
        ctx.save(); ctx.clip(glass);
        const gg = ctx.createLinearGradient(0, w.y - w.h / 2, 0, w.y + w.h / 2);
        gg.addColorStop(0, "#ff7a2a"); gg.addColorStop(1, `rgba(255,220,120,${fire})`);
        ctx.fillStyle = gg; ctx.globalAlpha = fire; ctx.fillRect(w.x - w.w, w.y - w.h, w.w * 2, w.h * 2); ctx.restore();
      }
      if (burn && fire <= 0.05) {
        ctx.save(); ctx.clip(glass); ctx.fillStyle = K.dots(6, 1.6, "rgba(0,0,0,0.5)"); ctx.fill(glass); ctx.restore();
      }
      // mullion
      K.brush(ctx, [[w.x, w.y - w.h / 2], [w.x, w.y + w.h / 2]], 2, 2.6, 2);
      // little balcony ledge
      const l = new Path2D(); l.rect(w.x - w.w / 2 - 12, w.y + w.h / 2 + 6, w.w + 24, 8);
      K.shape(ctx, l, COL.trim, 3);
    }
    // ground floor door + roof parapet
    const door = new Path2D(); door.rect((x0 + x1) / 2 - 40, -fh * 0.8, 80, fh * 0.8);
    K.shape(ctx, door, "#3a2a26", 4);
    const par = new Path2D(); par.rect(x0 - 10, top - 26, x1 - x0 + 20, 26);
    K.shape(ctx, par, COL.wallH, 4);
    // water tank on the roof
    const tank = new Path2D(); tank.rect(x0 + 60, top - 96, 90, 70);
    K.shape(ctx, tank, COL.wallS, 4);
  };

  // ---------------- fire (comic flame, re-drawn on twos) ----------------
  Wd.flame = (ctx, x, y, w, h, t, lean = 0, seed = 0) => {
    if (h < 2) return;
    const tt = U.step(t, 24, 2);
    const layers = [["#d8341c", 1.0, 4], ["#f47a22", 0.72, 3], ["#ffd25a", 0.42, 0]];
    layers.forEach(([col, k, lw], li) => {
      const pts = [];
      const n = 5;
      pts.push([x - w * 0.5 * k, y]);
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const px = x - w * 0.5 * k + w * k * u;
        const tipH = h * k * (0.55 + 0.45 * Math.abs(U.noise(seed + i * 1.7 + tt * 6)) + (i % 2 ? 0.25 : 0));
        if (i % 2) pts.push([px + lean * tipH * 0.6, y - tipH]);
        else pts.push([px + lean * h * k * 0.2, y - h * k * 0.35]);
      }
      pts.push([x + w * 0.5 * k, y]);
      pts.push([x, y + h * 0.06]);
      const p = K.path(pts, true, 0.35);
      ctx.fillStyle = col; ctx.fill(p);
      if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = li === 0 ? K.INK : "#a8301a"; ctx.lineJoin = "round"; ctx.stroke(p); }
    });
  };
  // smoke puff cluster
  Wd.smoke = (ctx, x, y, r, t, seed = 0, dark = 0.5) => {
    const p = new Path2D();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * U.TAU + seed;
      p.arc(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.35, r * (0.55 + 0.2 * U.hash(seed + i)), 0, U.TAU);
      p.closePath();
    }
    const c = U.mix("#8a8a9a", "#3a3a4a", dark);
    // outline pass then fill (merged silhouette)
    ctx.lineWidth = 5; ctx.strokeStyle = K.INK; ctx.stroke(p);
    ctx.fillStyle = c; ctx.fill(p);
    const sh = new Path2D(); sh.rect(x - r * 2, y, r * 4, r * 2);
    ctx.save(); ctx.clip(p); ctx.fillStyle = K.dots(7, 1.8, "rgba(10,10,20,0.45)"); ctx.fill(sh); ctx.restore();
  };

  // ---------------- whirlwind (redemoinho) ----------------
  // base at (x, y), height h; spin phase from t; intensity 0..1; fire 0..1 mixes flames in
  Wd.vortex = (ctx, x, y, h, w, t, o = {}) => {
    const tt = U.step(t, 24, 1);
    const fireMix = o.fire || 0;
    const rings = 11;
    for (let i = rings; i >= 0; i--) {
      const u = i / rings;
      const cy = y - h * u;
      const rw = w * (0.18 + 0.82 * Math.pow(u, 1.25)) * (o.width == null ? 1 : o.width);
      const rh = rw * 0.22;
      const sway = Math.sin(tt * 3 + u * 4) * w * 0.12 * u;
      const ph = tt * 14 + u * 7;
      const back = new Path2D(); back.ellipse(x + sway, cy, rw, rh, 0, Math.PI, U.TAU);
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(20,15,15,0.6)"; ctx.stroke(back);
      // band (front half) with dash phase = rotation
      const band = new Path2D(); band.ellipse(x + sway, cy, rw, rh, 0, 0, Math.PI);
      const col = fireMix > 0 && (i % 2 === 0) ? U.mix("#dfe6ea", "#ff8a3a", fireMix) : "#dfe6ea";
      ctx.lineWidth = 7 + u * 6; ctx.strokeStyle = K.INK;
      ctx.setLineDash([rw * 0.5, rw * 0.35]); ctx.lineDashOffset = -ph * rw * 0.1;
      ctx.stroke(band);
      ctx.lineWidth = 3.5 + u * 4; ctx.strokeStyle = col; ctx.stroke(band);
      ctx.setLineDash([]);
    }
    // speed lines + debris orbiting
    for (let k = 0; k < (o.debris == null ? 10 : o.debris); k++) {
      const u = U.hash(k * 3.3);
      const a = tt * (5 + u * 4) + k;
      const rw = w * (0.2 + 0.8 * Math.pow(u, 1.25));
      const px = x + Math.cos(a) * rw, py = y - h * u + Math.sin(a) * rw * 0.22;
      if (Math.sin(a) < -0.2) continue;
      ctx.save(); ctx.translate(px, py); ctx.rotate(a * 2);
      const leaf = K.path([[-7, 0], [0, -4], [7, 0], [0, 4]], true, 0.6);
      K.shape(ctx, leaf, k % 3 === 0 ? "#f0d080" : k % 3 === 1 ? "#7a9a4a" : "#ff8a3a", 2);
      ctx.restore();
    }
  };

  // ---------------- the girl in the window (upper body) ----------------
  // P: x, y (window sill centre), s, expr ('scared'|'relief'|'smile'), wave (0..1), look (-1..1)
  Wd.girl = (ctx, P) => {
    const g = (k, d = 0) => (P[k] == null ? d : P[k]);
    ctx.save();
    ctx.translate(g("x"), g("y"));
    ctx.scale(g("s", 1), g("s", 1));
    const skin = "#7a4630", skinS = "#52301e", pj = "#b48ad8", pjS = "#7c5aa0", hair = "#1d1412";
    const LW = 3.2 / g("s", 1);
    const bob = g("bob");
    // torso
    const tor = K.path([[-22, 0], [-20, -34 + bob], [-8, -42 + bob], [8, -42 + bob], [20, -34 + bob], [22, 0]], true, 0.35);
    K.shape(ctx, tor, pj, LW);
    A.SACI.mass(ctx, tor, -5, -3, pjS, true);
    // arms: wave arm (right), other on sill
    const wv = g("wave");
    const sh = [16, -34 + bob];
    const a1 = -2.4 + Math.sin(g("t") * 14) * 0.45 * wv - (1 - wv) * -2.0;
    const el = [sh[0] + Math.sin(a1) * 18, sh[1] + Math.cos(a1) * 18];
    const a2 = a1 + (wv > 0.1 ? 0.5 : -0.4);
    const hd = [el[0] + Math.sin(a2) * 16, el[1] + Math.cos(a2) * 16];
    K.brush(ctx, [sh, el, hd], 9, 8, 7, K.INK);
    K.brush(ctx, [sh, el, hd], 6, 5.2, 4.6, skin);
    const hand = new Path2D(); hand.arc(hd[0], hd[1], 5, 0, U.TAU); K.shape(ctx, hand, skin, LW * 0.8);
    K.brush(ctx, [[-16, -32 + bob], [-24, -14], [-14, -2]], 9, 8, 7, K.INK);
    K.brush(ctx, [[-16, -32 + bob], [-24, -14], [-14, -2]], 6, 5.2, 4.6, skin);
    // head
    ctx.translate(0, -60 + bob);
    ctx.rotate(g("tilt"));
    const puffs = [[-20, -16], [20, -16]];
    puffs.forEach(([px, py]) => { const p = new Path2D(); p.arc(px, py, 11, 0, U.TAU); K.shape(ctx, p, hair, LW); });
    const hdp = new Path2D(); hdp.ellipse(0, 0, 17, 19, 0, 0, U.TAU);
    K.shape(ctx, hdp, skin, LW);
    A.SACI.mass(ctx, hdp, -4, -3, skinS);
    const fringe = K.path([[-17, -4], [-14, -16], [0, -20], [14, -16], [17, -4], [8, -12], [-6, -11]], true, 0.4);
    K.shape(ctx, fringe, hair, LW * 0.8);
    const expr = g("expr", "scared"), lk = g("look") * 3;
    [[-7, -1], [7, -1]].forEach(([ex, ey]) => {
      if (expr === "smile") { K.brush(ctx, [[ex - 4, ey + 1], [ex, ey - 2], [ex + 4, ey + 1]], 1, 2.6, 1); return; }
      const e = new Path2D(); e.ellipse(ex, ey, 3.6, expr === "scared" ? 4.6 : 4, 0, 0, U.TAU);
      ctx.fillStyle = "#fff"; ctx.fill(e); ctx.lineWidth = 1.6; ctx.strokeStyle = K.INK; ctx.stroke(e);
      ctx.fillStyle = K.INK; ctx.beginPath(); ctx.arc(ex + lk, ey + (expr === "scared" ? 0.5 : 0), 2, 0, U.TAU); ctx.fill();
    });
    const bw = expr === "scared" ? -0.3 : 0.1;
    K.brush(ctx, [[-11, -8 + bw * 4], [-4, -9 - bw * 3]], 1, 2.2, 1); K.brush(ctx, [[4, -9 - bw * 3], [11, -8 + bw * 4]], 1, 2.2, 1);
    if (expr === "scared") { const m = new Path2D(); m.ellipse(0, 9, 3.4, 4.2, 0, 0, U.TAU); K.shape(ctx, m, "#6a1a1a", 1.6); }
    else { const m = K.path([[-6, 7], [6, 7], [3, 12], [-3, 12]], true, 0.5); K.shape(ctx, m, "#6a1a1a", 1.6); }
    if (expr !== "scared") { ctx.fillStyle = "rgba(220,90,90,0.35)"; [[-11, 4], [11, 4]].forEach(([cx, cy]) => { ctx.beginPath(); ctx.ellipse(cx, cy, 4, 2.4, 0, 0, U.TAU); ctx.fill(); }); }
    ctx.restore();
  };
})(window.A);
