// Core: math, easing, deterministic noise, inking & print helpers (halftone, paper).
(function (A) {
  const U = (A.U = {});
  U.TAU = Math.PI * 2;
  U.D = Math.PI / 180;
  U.clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.inv = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
  U.seg = (t, a, b) => U.clamp(U.inv(a, b, t));
  U.smooth = (t) => t * t * (3 - 2 * t);
  U.E = {
    lin: (t) => t, in: (t) => t * t, out: (t) => 1 - (1 - t) * (1 - t), io: (t) => t * t * (3 - 2 * t),
    in3: (t) => t * t * t, out3: (t) => 1 - Math.pow(1 - t, 3), io3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    back: (t) => { const c = 1.7, d = c + 1; return 1 + d * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    soft: (t) => { const c = 0.8, d = c + 1; return 1 + d * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  };
  U.ease = (n, t) => (U.E[n] || U.E.io)(U.clamp(t));
  U.step = (t, fps, n) => Math.floor(t * fps / n + 1e-6) * n / fps; // animate on n's
  U.hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  U.noise = (x) => { const i = Math.floor(x), f = x - i; return U.lerp(U.hash(i), U.hash(i + 1), U.smooth(f)) * 2 - 1; };
  U.rng = (seed) => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
  U.rot = (x, y, a) => { const c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; };
  U.mix = (h1, h2, t) => {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const a = p(h1), b = p(h2);
    return `rgb(${a.map((v, i) => Math.round(U.lerp(v, b[i], t))).join(",")})`;
  };

  // ---------- ink ----------
  const K = (A.K = {});
  K.INK = "#15110f";
  // smooth closed/open path through points (Catmull-Rom)
  K.path = (pts, closed = true, tension = 0.5) => {
    const p = new Path2D();
    const n = pts.length;
    if (n < 2) return p;
    const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    p.moveTo(pts[0][0], pts[0][1]);
    const segs = closed ? n : n - 1;
    const k = tension / 3;
    for (let i = 0; i < segs; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
    }
    if (closed) p.closePath();
    return p;
  };
  K.poly = (pts) => { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]))); p.closePath(); return p; };
  // tapered brush stroke (filled polygon), widths at start/middle/end
  K.brush = (ctx, pts, w0, w1, w2, color = K.INK) => {
    if (pts.length < 2) return;
    const s = [];
    const n = 16;
    const m = pts.length;
    for (let i = 0; i <= n; i++) {
      const u = (i / n) * (m - 1);
      const k = Math.min(m - 2, Math.floor(u)), t = u - k;
      const a = pts[Math.max(0, k - 1)], b = pts[k], c = pts[k + 1], d = pts[Math.min(m - 1, k + 2)];
      const f = (q) => 0.5 * (2 * b[q] + (-a[q] + c[q]) * t + (2 * a[q] - 5 * b[q] + 4 * c[q] - d[q]) * t * t + (-a[q] + 3 * b[q] - 3 * c[q] + d[q]) * t * t * t);
      s.push([f(0), f(1)]);
    }
    const L = [], R = [];
    s.forEach((p, i) => {
      const a = s[Math.max(0, i - 1)], b = s[Math.min(n, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const t = i / n;
      const w = (t < 0.5 ? U.lerp(w0, w1, t * 2) : U.lerp(w1, w2, (t - 0.5) * 2)) / 2;
      L.push([p[0] - dy * w, p[1] + dx * w]); R.push([p[0] + dy * w, p[1] - dx * w]);
    });
    ctx.fillStyle = color;
    ctx.fill(K.poly(L.concat(R.reverse())));
  };
  // Inked shape: thick contour, flat fill. Shadow drawn separately by the caller.
  K.lwk = 1; // global contour multiplier (set per shot to keep line weight stable across zooms)
  K.shape = (ctx, path, fill, lw = 4) => {
    ctx.lineJoin = "round";
    ctx.lineWidth = lw * K.lwk;
    ctx.strokeStyle = K.INK;
    ctx.fillStyle = fill;
    ctx.fill(path);
    ctx.stroke(path);
  };
  // Shadow mass clipped to a shape: flat colour + optional halftone dots anchored to `m` (DOMMatrix)
  K.shade = (ctx, clip, shadowPath, color, dots, m) => {
    ctx.save();
    ctx.clip(clip);
    ctx.fillStyle = color;
    ctx.fill(shadowPath);
    if (dots) {
      const pat = K.dots(dots.size || 7, dots.r || 1.6, dots.color || "rgba(20,15,15,0.55)");
      if (m) pat.setTransform(m);
      ctx.fillStyle = pat;
      ctx.fill(shadowPath);
    }
    ctx.restore();
  };
  const dotCache = {};
  K.dots = (size, r, color) => {
    const key = size + "_" + r + "_" + color;
    if (!dotCache[key]) {
      const c = document.createElement("canvas");
      c.width = c.height = size * 2;
      const x = c.getContext("2d");
      x.fillStyle = color;
      // 45° screen: dots on a staggered grid
      [[size / 2, size / 2], [size * 1.5, size * 1.5]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, r, 0, U.TAU); x.fill(); });
      dotCache[key] = { c, pats: new WeakMap() };
    }
    const ctx = document.getElementById("c").getContext("2d");
    return ctx.createPattern(dotCache[key].c, "repeat");
  };

  // Paper + print texture, generated once (stable across frames)
  let PAPER = null;
  K.paper = (W, H) => {
    if (PAPER) return PAPER;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const x = c.getContext("2d");
    const im = x.createImageData(W, H);
    const r = U.rng(42);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = 238 + r() * 17;
      im.data[i] = v; im.data[i + 1] = v - 4; im.data[i + 2] = v - 14; im.data[i + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    x.globalAlpha = 0.05;
    x.strokeStyle = "#8a7a60";
    for (let k = 0; k < 900; k++) {
      const px = r() * W, py = r() * H, a = r() * U.TAU, l = 6 + r() * 26;
      x.lineWidth = 0.6 + r();
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * l * 0.5 + r() * 6, py + Math.sin(a) * l * 0.5, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
    }
    PAPER = c;
    return c;
  };
})(window.A = window.A || {});
