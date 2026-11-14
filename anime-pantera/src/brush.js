// Inking and cel-shading primitives built on Path2D.
// - smooth paths through points (Catmull-Rom -> cubic Bezier)
// - tapered strokes with variable width (hair strands, folds, contour accents)
// - cel-shaded shapes: contour thicker on the side away from light, shadow strip, rim light
(function (A) {
  const U = A.U;
  const K = {};

  K.T = (dx, dy) => new DOMMatrix([1, 0, 0, 1, dx, dy]);
  K.moved = (p, dx, dy) => { const q = new Path2D(); q.addPath(p, K.T(dx, dy)); return q; };

  // Smooth curve through points. pts: [{x,y}], closed: bool, tension 0..1
  K.smoothPath = (pts, closed = true, tension = 0.5, path = new Path2D()) => {
    const n = pts.length;
    if (n < 2) return path;
    const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    path.moveTo(pts[0].x, pts[0].y);
    const segs = closed ? n : n - 1;
    const k = tension / 3 * 2;
    for (let i = 0; i < segs; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const c1x = p1.x + (p2.x - p0.x) * k / 2, c1y = p1.y + (p2.y - p0.y) * k / 2;
      const c2x = p2.x - (p3.x - p1.x) * k / 2, c2y = p2.y - (p3.y - p1.y) * k / 2;
      path.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
    }
    if (closed) path.closePath();
    return path;
  };

  K.polyPath = (pts, closed = true) => {
    const p = new Path2D();
    pts.forEach((q, i) => (i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y)));
    if (closed) p.closePath();
    return p;
  };

  // Sample a polyline into evenly parametrised points (with smoothing) for strokes.
  K.resample = (pts, n) => {
    if (pts.length < 2) return pts.slice();
    const out = [];
    // Catmull-Rom sampling
    const m = pts.length;
    for (let i = 0; i <= n; i++) {
      const u = (i / n) * (m - 1);
      const s = Math.min(m - 2, Math.floor(u)), t = u - s;
      const p0 = pts[Math.max(0, s - 1)], p1 = pts[s], p2 = pts[s + 1], p3 = pts[Math.min(m - 1, s + 2)];
      const t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
    return out;
  };

  // Tapered stroke as a filled polygon. widthFn(t) returns the full width at t (0..1).
  K.taperPath = (pts, widthFn, n = 18) => {
    const s = K.resample(pts, n);
    const L = [], R = [];
    for (let i = 0; i < s.length; i++) {
      const a = s[Math.max(0, i - 1)], b = s[Math.min(s.length - 1, i + 1)];
      let dx = b.x - a.x, dy = b.y - a.y;
      const l = Math.hypot(dx, dy) || 1;
      dx /= l; dy /= l;
      const w = widthFn(i / (s.length - 1)) / 2;
      L.push({ x: s[i].x - dy * w, y: s[i].y + dx * w });
      R.push({ x: s[i].x + dy * w, y: s[i].y - dx * w });
    }
    const pts2 = L.concat(R.reverse());
    return K.polyPath(pts2, true);
  };
  // Common width profiles
  K.W = {
    taper: (w) => (t) => w * Math.sin(Math.PI * Math.min(1, Math.max(0, t))) ** 0.6 + 0.15,
    start: (w) => (t) => w * (1 - t) ** 0.8 + 0.1, // thick at start, sharp end (hair spikes)
    end: (w) => (t) => w * t ** 0.8 + 0.1,
    even: (w) => () => w,
  };
  K.stroke = (ctx, pts, w, color, profile = "taper") => {
    if (!pts || pts.length < 2) return;
    ctx.fillStyle = color;
    ctx.fill(K.taperPath(pts, K.W[profile](w)));
  };

  // Cel-shaded inked shape.
  // o: { fill, shade, line, lw, shadeDepth (px), light:[x,y], rim, rimW, rimDir, noLine, lineBias }
  K.shape = (ctx, p, o) => {
    const L = o.light || A.CFG.light;
    const ln = Math.hypot(L[0], L[1]) || 1;
    const lx = L[0] / ln, ly = L[1] / ln;
    const lw = o.lw == null ? A.CFG.lineWidth : o.lw;
    if (!o.noLine && lw > 0) {
      ctx.fillStyle = o.line || A.CFG.lineColor;
      const bias = (o.lineBias == null ? 0.9 : o.lineBias) * lw;
      ctx.fill(K.moved(p, -lx * bias, -ly * bias));
      ctx.lineWidth = lw * 2;
      ctx.lineJoin = "round";
      ctx.strokeStyle = o.line || A.CFG.lineColor;
      ctx.stroke(p);
    }
    K.paint(ctx, p, o, lx, ly);
  };
  // Fill + shading only (used for the second pass of merged silhouettes).
  K.paint = (ctx, p, o, lx, ly) => {
    if (lx == null) {
      const L = o.light || A.CFG.light; const ln = Math.hypot(L[0], L[1]) || 1;
      lx = L[0] / ln; ly = L[1] / ln;
    }
    if (o.shade && o.shadeDepth) {
      ctx.fillStyle = o.shade;
      ctx.fill(p);
      ctx.save();
      ctx.clip(p);
      ctx.fillStyle = o.fill;
      ctx.fill(K.moved(p, lx * o.shadeDepth, ly * o.shadeDepth));
      if (o.hi && o.hiDepth) {
        // narrow highlight strip on the light side
        const q = new Path2D();
        q.rect(-1e5, -1e5, 2e5, 2e5);
        q.addPath(p, K.T(-lx * o.hiDepth, -ly * o.hiDepth));
        ctx.fillStyle = o.hi;
        ctx.fill(q, "evenodd");
      }
      ctx.restore();
    } else {
      ctx.fillStyle = o.fill;
      ctx.fill(p);
    }
    if (o.rim) {
      const R = o.rimDir || [-lx, -ly];
      const rl = Math.hypot(R[0], R[1]) || 1;
      ctx.save();
      ctx.clip(p);
      const q = new Path2D();
      q.rect(-1e5, -1e5, 2e5, 2e5);
      q.addPath(p, K.T(-R[0] / rl * o.rimW, -R[1] / rl * o.rimW));
      ctx.fillStyle = o.rim;
      ctx.fill(q, "evenodd");
      ctx.restore();
    }
  };
  // Outline only (merged silhouettes: draw outlines of every piece, then paint each).
  K.outline = (ctx, p, o) => {
    const L = o.light || A.CFG.light;
    const ln = Math.hypot(L[0], L[1]) || 1;
    const lw = o.lw == null ? A.CFG.lineWidth : o.lw;
    ctx.fillStyle = o.line || A.CFG.lineColor;
    const bias = (o.lineBias == null ? 0.9 : o.lineBias) * lw;
    ctx.fill(K.moved(p, -L[0] / ln * bias, -L[1] / ln * bias));
    ctx.lineWidth = lw * 2;
    ctx.lineJoin = "round";
    ctx.strokeStyle = o.line || A.CFG.lineColor;
    ctx.stroke(p);
  };

  // Ellipse path helper
  K.ellipse = (x, y, rx, ry, rot = 0) => {
    const p = new Path2D();
    p.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, U.TAU);
    return p;
  };

  A.K = K;
})(window.A = window.A || {});
