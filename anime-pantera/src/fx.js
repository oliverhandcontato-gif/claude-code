// Effects and props: basketball, focus/speed lines, zone lightning, impact frames,
// silhouettes/afterimages, grading, grain, titles.
(function (A) {
  const U = A.U, K = A.K;
  const F = {};
  const W = () => A.CFG.width, H = () => A.CFG.height;

  // ---------- Basketball ----------
  // seams: great circles on a unit sphere, rotated by spin (radians) around axis
  const SEAMS = (() => {
    const s = [];
    const ring = (f) => { const pts = []; for (let i = 0; i <= 48; i++) pts.push(f((i / 48) * U.TAU)); return pts; };
    s.push(ring((a) => [Math.cos(a), Math.sin(a), 0]));
    s.push(ring((a) => [0, Math.sin(a), Math.cos(a)]));
    s.push(ring((a) => { const x = Math.cos(a), z = Math.sin(a); return [x * 0.72, 0.69 * Math.sign(Math.sin(a * 2)) * Math.abs(Math.sin(a * 2)) ** 0.5 * 0.7, z * 0.72]; }));
    return s;
  })();
  F.ball = (ctx, x, y, r, spin = 0, o = {}) => {
    const pal = A.PAL.ball;
    const p = K.ellipse(x, y, r, r);
    K.shape(ctx, p, { fill: pal.base, shade: pal.shade, shadeDepth: r * 0.55, lw: Math.max(1.4, r * 0.07), light: o.light, rim: o.rim, rimW: r * 0.14, rimDir: o.rimDir });
    const M = U.mm(U.rx(spin * 0.7 + 0.4), U.mm(U.ry(spin), U.rz(0.5)));
    ctx.save();
    ctx.clip(p);
    ctx.strokeStyle = pal.seam;
    ctx.lineWidth = Math.max(1, r * 0.06);
    SEAMS.forEach((ring) => {
      ctx.beginPath();
      let pen = false;
      ring.forEach((v) => {
        const q = U.mv(M, U.norm(v));
        if (q[2] < -0.05) { pen = false; return; }
        const px = x + q[0] * r, py = y - q[1] * r;
        if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
      });
      ctx.stroke();
    });
    // specular
    ctx.fillStyle = U.alpha(pal.hi, 0.75);
    ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.13, -0.6, 0, U.TAU); ctx.fill();
    ctx.restore();
  };
  // Ball as a depth layer for character scenes: pos in character space (cm), uses that view.
  F.ballLayer = (view, pos, spin, o = {}) => {
    const p = view.proj(pos);
    return { z: p.z + (o.zBias || 0), draw: (ctx) => { if (o.trail) F.ballTrail(ctx, o.trail.map((q) => view.proj(q)), 12 * p.s); F.ball(ctx, p.x, p.y, 12 * p.s, spin, o); } };
  };
  F.ballTrail = (ctx, pts, r, color = "rgba(255,170,90,0.35)") => {
    if (pts.length < 2) return;
    ctx.fillStyle = color;
    ctx.fill(K.taperPath(pts, (t) => r * 1.8 * t + 0.5, 14));
  };
  // Floor shadow ellipse for a world/char position
  F.shadow = (ctx, x, y, rx, ry, a = 0.35) => {
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, U.TAU); ctx.fill();
  };

  // ---------- Focus lines (radial speed lines) ----------
  F.focusLines = (ctx, cx, cy, inner, t, o = {}) => {
    const n = o.n || 90;
    const seed = Math.floor(t * (o.rate || 12));
    ctx.save();
    ctx.fillStyle = o.color || "rgba(255,255,255,0.85)";
    const R = Math.hypot(W(), H());
    for (let i = 0; i < n; i++) {
      const a = (i / n) * U.TAU + U.hash2(i, seed) * 0.08;
      const w = (0.002 + U.hash2(i * 3, seed) * 0.006) * (o.width || 1);
      const r0 = inner * (0.8 + U.hash2(i * 5, seed) * 0.6);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a - w) * R, cy + Math.sin(a - w) * R);
      ctx.lineTo(cx + Math.cos(a + w) * R, cy + Math.sin(a + w) * R);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };
  // Parallel speed streaks along a direction (angle rad)
  F.speedLines = (ctx, ang, t, o = {}) => {
    const n = o.n || 60;
    const seed = Math.floor(t * (o.rate || 12));
    ctx.save();
    ctx.translate(W() / 2, H() / 2);
    ctx.rotate(ang);
    ctx.fillStyle = o.color || "rgba(255,255,255,0.6)";
    for (let i = 0; i < n; i++) {
      const y = (U.hash2(i, seed) - 0.5) * H() * 1.6;
      const x = (U.hash2(i * 7, seed) - 0.5) * W() * 1.4;
      const l = 200 + U.hash2(i * 3, seed) * 700;
      const w = 1 + U.hash2(i * 9, seed) * 4;
      ctx.fill(K.taperPath([{ x, y }, { x: x + l, y }], K.W.taper(w), 4));
    }
    ctx.restore();
  };

  // ---------- Zone lightning ----------
  F.lightning = (ctx, pts, t, o = {}) => {
    if (pts.length < 2) return;
    const seed = Math.floor(t * 24 / 2);
    const jag = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const steps = 4;
      for (let k = 0; k < steps; k++) {
        const u = k / steps;
        const m = U.lerp2(a, b, u);
        const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
        const off = (U.hash2(i * 13 + k, seed) - 0.5) * (o.jag || 18) * (i === 0 && k === 0 ? 0 : 1);
        jag.push({ x: m.x - dy / l * off, y: m.y + dx / l * off });
      }
    }
    jag.push(pts[pts.length - 1]);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const w = o.width || 14;
    ctx.fillStyle = `rgba(40,100,255,${0.25 * (o.alpha || 1)})`;
    ctx.fill(K.taperPath(jag, (u) => w * 3.2 * (1 - u) + 1, 40));
    ctx.fillStyle = `rgba(90,160,255,${0.6 * (o.alpha || 1)})`;
    ctx.fill(K.taperPath(jag, (u) => w * 1.4 * (1 - u) + 0.6, 40));
    ctx.fillStyle = `rgba(235,248,255,${0.95 * (o.alpha || 1)})`;
    ctx.fill(K.taperPath(jag, (u) => w * 0.45 * (1 - u) + 0.4, 40));
    ctx.restore();
  };
  F.glow = (ctx, x, y, r, color = "80,150,255", a = 0.6) => {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  };

  // ---------- Offscreen helpers ----------
  const pool = {};
  F.buffer = (name) => {
    let c = pool[name];
    if (!c) { c = document.createElement("canvas"); c.width = W(); c.height = H(); pool[name] = c; }
    const x = c.getContext("2d");
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = "source-over";
    x.globalAlpha = 1;
    x.filter = "none";
    x.clearRect(0, 0, c.width, c.height);
    return x;
  };
  // Draw something into a buffer, recolour as a silhouette, composite with rim offset
  F.silhouette = (ctx, drawFn, color, o = {}) => {
    const b = F.buffer("sil");
    drawFn(b);
    b.globalCompositeOperation = "source-in";
    b.fillStyle = color;
    b.fillRect(0, 0, W(), H());
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    if (o.rim) {
      const r = F.buffer("sil2");
      r.drawImage(b.canvas, 0, 0);
      r.globalCompositeOperation = "source-in";
      r.fillStyle = o.rim;
      r.fillRect(0, 0, W(), H());
      ctx.drawImage(r.canvas, -(o.rimOff || [3, -2])[0], -(o.rimOff || [3, -2])[1]);
    }
    ctx.drawImage(b.canvas, 0, 0);
    ctx.restore();
  };
  // Tinted ghost (afterimage)
  F.ghost = (ctx, drawFn, color, alpha) => {
    const b = F.buffer("ghost");
    drawFn(b);
    b.globalCompositeOperation = "source-atop";
    b.fillStyle = color;
    b.globalAlpha = 0.65;
    b.fillRect(0, 0, W(), H());
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(b.canvas, 0, 0);
    ctx.restore();
  };

  // Whole-frame post filters
  F.filterFrame = (ctx, filter, alpha = 1) => {
    const b = F.buffer("post");
    b.drawImage(ctx.canvas, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = filter;
    ctx.globalAlpha = alpha;
    ctx.drawImage(b.canvas, 0, 0);
    ctx.restore();
  };
  F.impact = (ctx, mode = 0) => {
    // high-contrast inverted impact frame
    F.filterFrame(ctx, mode ? "grayscale(1) contrast(9) brightness(1.2)" : "grayscale(1) contrast(9) invert(1)");
    if (!mode) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = "#9fc4ff"; ctx.fillRect(0, 0, W(), H());
      ctx.restore();
    }
  };
  F.flash = (ctx, a, color = "255,255,255") => {
    if (a <= 0) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(${color},${U.clamp(a)})`;
    ctx.fillRect(0, 0, W(), H());
    ctx.restore();
  };
  F.vignette = (ctx, a = 0.45, color = "0,0,0") => {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createRadialGradient(W() / 2, H() / 2, H() * 0.35, W() / 2, H() / 2, H() * 1.05);
    g.addColorStop(0, `rgba(${color},0)`); g.addColorStop(1, `rgba(${color},${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W(), H());
    ctx.restore();
  };
  F.grade = (ctx, color, a, mode = "soft-light") => {
    if (a <= 0) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = mode; ctx.globalAlpha = a;
    ctx.fillStyle = color; ctx.fillRect(0, 0, W(), H());
    ctx.restore();
  };
  let GRAIN = null;
  F.grain = (ctx, frame, a) => {
    if (!a) return;
    if (!GRAIN) {
      GRAIN = [];
      for (let k = 0; k < 4; k++) {
        const c = document.createElement("canvas"); c.width = 512; c.height = 512;
        const x = c.getContext("2d"); const im = x.createImageData(512, 512);
        const r = U.rng(100 + k);
        for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
        x.putImageData(im, 0, 0); GRAIN.push(c);
      }
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "overlay"; ctx.globalAlpha = a;
    const g = GRAIN[frame % 4];
    ctx.fillStyle = ctx.createPattern(g, "repeat");
    ctx.fillRect(0, 0, W(), H());
    ctx.restore();
  };
  F.letterbox = (ctx, amt) => {
    if (amt <= 0) return;
    const h = H() * 0.12 * amt;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W(), h); ctx.fillRect(0, H() - h, W(), h);
    ctx.restore();
  };

  // ---------- Typography ----------
  F.title = (ctx, text, sub, t, o = {}) => {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sh = o.shake ? (U.hash(Math.floor(t * 24)) - 0.5) * o.shake : 0;
    ctx.translate(W() / 2 + sh, H() / 2 + (o.dy || 0));
    ctx.transform(1, 0, -0.18, 1, 0, 0);
    const sc = o.scale || 1;
    ctx.scale(sc, sc);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `900 ${o.size || 230}px 'DejaVu Sans', sans-serif`;
    ctx.lineJoin = "round";
    if (o.glow !== false) {
      ctx.shadowColor = "rgba(70,140,255,0.9)"; ctx.shadowBlur = 50;
    }
    ctx.lineWidth = 22; ctx.strokeStyle = "#05070f"; ctx.strokeText(text, 0, 0);
    ctx.shadowBlur = 0;
    ctx.fillStyle = o.color || "#f4f6ff"; ctx.fillText(text, 0, 0);
    if (o.slash) {
      ctx.fillStyle = "rgba(60,120,255,0.95)";
      ctx.fillRect(-W(), 12, W() * 2 * o.slash - W(), 10);
    }
    if (sub) {
      ctx.font = `bold ${o.subSize || 46}px 'DejaVu Sans', sans-serif`;
      ctx.fillStyle = o.subColor || "#9fc0ff";
      ctx.fillText(sub, 0, (o.size || 230) * 0.62);
    }
    ctx.restore();
  };
  F.caption = (ctx, text, a = 1) => {
    if (!text || a <= 0) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = a;
    ctx.textAlign = "center"; ctx.font = "bold 40px 'DejaVu Sans'";
    ctx.lineWidth = 8; ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineJoin = "round";
    ctx.strokeText(text, W() / 2, H() - 70); ctx.fillStyle = "#fff"; ctx.fillText(text, W() / 2, H() - 70);
    ctx.restore();
  };

  A.F = F;
})(window.A = window.A || {});
