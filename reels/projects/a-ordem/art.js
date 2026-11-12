/* A ORDEM (Tio Arle) — biblioteca de símbolos e cenários ocultistas desenhados por código.
 * Olho que tudo vê, geometria sagrada (flor da vida, cubo de Metatron, árvore da vida),
 * anéis de glifos, sigilos, ouroboros, documentos censurados, mapas, moedas, prédios,
 * ondas sonoras, multidão, portal cósmico, relógio, comentários.
 * Glifos astrológicos/alquímicos e hebraicos usam a fonte do sistema (DejaVu Sans).
 */
(function () {
  'use strict';
  const R = window.Reel;
  const { W, H } = R;
  const Art = (window.Art = {});

  const P = (Art.P = {
    void: '#050307', ink: '#0c0710', blood: '#c4102a', ember: '#ff3a2e', gold: '#d9b45a', pale: '#f3e3b0',
    bone: '#e9e2d0', violet: '#2a0f3a', cyan: '#00e5ff', toxic: '#39ff88',
  });
  Art.GLYPHS = '☉☽☿♀♂♃♄♅♆♇△▽⊕⊗✶☥☤⚶⚷ΑΒΓΔΘΛΞΠΣΦΨΩאבגדהוזחטיכלמנסעפצקרשת';
  Art.SYMS = '☉☽☿♀♂♃♄♅♆♇△▽⊕⊗✶☥';
  const TAU = Math.PI * 2;
  const glyphFont = (s) => `${s}px "DejaVu Sans", "FreeSerif", serif`;
  Art.glyphFont = glyphFont;

  Art.glow = (ctx, x, y, r, color = '196,16,42', a = 0.5) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${color},${a})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  };
  const stroke = (ctx, color, w, glow = 0) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;
    }
  };
  /** Desenha só a fração p (0..1) de um caminho poligonal. */
  const partial = (ctx, pts, p, closed = false) => {
    const all = closed ? [...pts, pts[0]] : pts;
    let len = 0;
    const seg = [];
    for (let i = 1; i < all.length; i++) {
      const d = Math.hypot(all[i][0] - all[i - 1][0], all[i][1] - all[i - 1][1]);
      seg.push(d);
      len += d;
    }
    let left = len * R.clamp(p);
    ctx.beginPath();
    ctx.moveTo(all[0][0], all[0][1]);
    for (let i = 1; i < all.length && left > 0; i++) {
      const k = Math.min(1, left / seg[i - 1]);
      ctx.lineTo(R.lerp(all[i - 1][0], all[i][0], k), R.lerp(all[i - 1][1], all[i][1], k));
      left -= seg[i - 1];
    }
    ctx.stroke();
  };
  Art.partial = partial;

  // ---------- olho ----------
  /** Olho humano estilizado (amêndoa, íris em anéis, pupila). open 0..1, look [-1..1]. */
  Art.eye = (ctx, x, y, r, t, o = {}) => {
    const { open = 1, look = [0, 0], color = P.blood, pupil = 1, lashes = true, glow = 1 } = o;
    ctx.save();
    ctx.translate(x, y);
    const h = r * 0.55 * R.clamp(open);
    const almond = () => {
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.quadraticCurveTo(0, -h * 2, r, 0);
      ctx.quadraticCurveTo(0, h * 2, -r, 0);
      ctx.closePath();
    };
    if (open > 0.02) {
      almond();
      ctx.fillStyle = P.bone;
      ctx.fill();
      ctx.save();
      almond();
      ctx.clip();
      const ix = look[0] * r * 0.3, iy = look[1] * h * 0.4, ir = r * 0.42;
      const g = ctx.createRadialGradient(ix, iy, ir * 0.1, ix, iy, ir);
      g.addColorStop(0, color);
      g.addColorStop(0.7, '#3a0510');
      g.addColorStop(1, '#0a0204');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ix, iy, ir, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,200,150,0.35)';
      ctx.lineWidth = r * 0.012;
      for (let k = 0; k < 36; k++) {
        const a = (k / 36) * TAU + t * 0.2;
        ctx.beginPath();
        ctx.moveTo(ix + Math.cos(a) * ir * 0.3, iy + Math.sin(a) * ir * 0.3);
        ctx.lineTo(ix + Math.cos(a) * ir * 0.95, iy + Math.sin(a) * ir * 0.95);
        ctx.stroke();
      }
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(ix, iy, ir * 0.16 * pupil, ir * 0.5 * pupil, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(ix - ir * 0.3, iy - ir * 0.35, ir * 0.1, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    stroke(ctx, P.gold, r * 0.04, glow * 20);
    almond();
    ctx.stroke();
    if (lashes) {
      ctx.lineWidth = r * 0.025;
      for (let k = 1; k < 10; k++) {
        const u = k / 10, px = -r + u * 2 * r, py = -h * 2 * (1 - Math.pow(2 * u - 1, 2)) * 0.5;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px * 1.08, py - r * 0.18);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  /** Olho que tudo vê: triângulo + olho + raios. */
  Art.pyramidEye = (ctx, x, y, s, t, o = {}) => {
    const { p = 1, open = 1, rays = 1, look = [0, 0] } = o;
    ctx.save();
    ctx.translate(x, y);
    if (rays > 0) {
      ctx.save();
      ctx.globalAlpha = rays * 0.5;
      for (let k = 0; k < 36; k++) {
        const a = (k / 36) * TAU + t * 0.15, len = s * (1.6 + 0.4 * Math.sin(k * 7 + t * 3));
        ctx.strokeStyle = k % 2 ? 'rgba(217,180,90,0.5)' : 'rgba(196,16,42,0.4)';
        ctx.lineWidth = s * 0.012;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * s * 0.75, Math.sin(a) * s * 0.75);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        ctx.stroke();
      }
      ctx.restore();
    }
    const tri = [[0, -s * 0.9], [s * 0.85, s * 0.55], [-s * 0.85, s * 0.55]];
    stroke(ctx, P.gold, s * 0.035, 30);
    partial(ctx, tri, p, true);
    if (p > 0.6) Art.eye(ctx, 0, s * 0.08, s * 0.38, t, { open: open * R.clamp((p - 0.6) / 0.4), look, lashes: false });
    ctx.restore();
  };

  // ---------- geometria sagrada ----------
  Art.flowerOfLife = (ctx, x, y, r, p = 1, color = P.gold) => {
    ctx.save();
    ctx.translate(x, y);
    stroke(ctx, color, r * 0.012, 12);
    const centers = [[0, 0]];
    for (let ring = 1; ring <= 2; ring++) for (let k = 0; k < 6 * ring; k++) {
      const a = (Math.floor(k / ring) * TAU) / 6, b = ((Math.floor(k / ring) + 1) * TAU) / 6, f = (k % ring) / ring;
      centers.push([R.lerp(Math.cos(a), Math.cos(b), f) * r * 0.333 * ring, R.lerp(Math.sin(a), Math.sin(b), f) * r * 0.333 * ring]);
    }
    centers.forEach(([cx, cy], i) => {
      const q = R.clamp(p * centers.length - i);
      if (q <= 0) return;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.333, 0, TAU * q);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU * R.clamp(p));
    ctx.stroke();
    ctx.restore();
  };

  Art.metatron = (ctx, x, y, r, p = 1, rot = 0, color = P.bone) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const pts = [[0, 0]];
    for (const k of [0.5, 1]) for (let i = 0; i < 6; i++) pts.push([Math.cos((i * TAU) / 6 - Math.PI / 2) * r * k, Math.sin((i * TAU) / 6 - Math.PI / 2) * r * k]);
    stroke(ctx, color, r * 0.008, 8);
    ctx.globalAlpha = 0.85;
    let n = 0;
    const total = (pts.length * (pts.length - 1)) / 2;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      if (n++ > total * p) break;
      ctx.beginPath();
      ctx.moveTo(pts[i][0], pts[i][1]);
      ctx.lineTo(pts[j][0], pts[j][1]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    stroke(ctx, P.gold, r * 0.014, 12);
    for (const [px, py] of pts) {
      ctx.beginPath();
      ctx.arc(px, py, r * 0.16, 0, TAU * R.clamp(p * 1.5));
      ctx.stroke();
    }
    ctx.restore();
  };

  /** Árvore da vida (10 esferas). */
  Art.tree = (ctx, x, y, s, t, p = 1) => {
    const N = [[0, -1], [0.5, -0.75], [-0.5, -0.75], [0.5, -0.3], [-0.5, -0.3], [0, -0.1], [0.5, 0.25], [-0.5, 0.25], [0, 0.5], [0, 0.95]];
    const L = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [1, 5], [2, 5], [3, 4], [3, 5], [4, 5], [3, 6], [4, 7], [5, 6], [5, 7], [6, 7], [6, 8], [7, 8], [5, 8], [8, 9], [6, 9], [7, 9], [0, 5]];
    ctx.save();
    ctx.translate(x, y);
    stroke(ctx, P.gold, s * 0.01, 10);
    L.forEach(([a, b], i) => {
      const q = R.clamp(p * L.length - i);
      if (q <= 0) return;
      ctx.beginPath();
      ctx.moveTo(N[a][0] * s, N[a][1] * s);
      ctx.lineTo(R.lerp(N[a][0], N[b][0], q) * s, R.lerp(N[a][1], N[b][1], q) * s);
      ctx.stroke();
    });
    N.forEach(([nx, ny], i) => {
      const q = R.clamp(p * 12 - i);
      if (q <= 0) return;
      ctx.fillStyle = P.ink;
      ctx.beginPath();
      ctx.arc(nx * s, ny * s, s * 0.11 * q, 0, TAU);
      ctx.fill();
      stroke(ctx, i === 5 ? P.blood : P.gold, s * 0.012, 14);
      ctx.stroke();
      ctx.font = glyphFont(s * 0.1);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = P.pale;
      ctx.fillText(Art.SYMS[i % Art.SYMS.length], nx * s, ny * s + 2);
    });
    ctx.restore();
  };

  /** Anel de glifos girando (círculo mágico). */
  Art.ring = (ctx, x, y, r, t, o = {}) => {
    const { rot = t * 0.2, color = P.gold, size = r * 0.12, glyphs = Art.GLYPHS, seed = 1, lines = 2, alpha = 1 } = o;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    stroke(ctx, color, Math.max(1.5, r * 0.006), 10);
    for (let k = 0; k < lines; k++) {
      ctx.beginPath();
      ctx.arc(0, 0, r - k * size * 1.6, 0, TAU);
      ctx.stroke();
    }
    const n = Math.floor((TAU * (r - size * 0.8)) / (size * 1.25));
    ctx.shadowBlur = 0; // o brilho dos glifos vem do bloom da pós-produção (bem mais leve de renderizar)
    ctx.font = glyphFont(size);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU;
      ctx.save();
      ctx.rotate(a);
      ctx.translate(0, -(r - size * 0.8));
      ctx.fillText(glyphs[Math.floor(R.hash(k, seed) * glyphs.length)], 0, 0);
      ctx.restore();
    }
    ctx.restore();
  };

  /** Estrela de n pontas ligando de k em k vértices (heptagrama, octograma…). */
  Art.star = (ctx, x, y, r, n, k, rot, p = 1, color = P.blood) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const j = (i * k) % n, a = (j / n) * TAU + rot - Math.PI / 2;
      pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    ctx.save();
    stroke(ctx, color, Math.max(2, r * 0.015), 18);
    partial(ctx, pts, p, true);
    ctx.restore();
  };

  /** Sigilo procedural: traços entre pontos de um círculo, com terminais. */
  Art.sigil = (ctx, x, y, r, seed, p = 1, color = P.bone) => {
    const rnd = R.rng(seed * 97 + 3);
    const pts = [];
    for (let i = 0; i < 7; i++) {
      const a = rnd() * TAU, d = 0.25 + rnd() * 0.75;
      pts.push([x + Math.cos(a) * r * d, y + Math.sin(a) * r * d]);
    }
    ctx.save();
    stroke(ctx, color, Math.max(2, r * 0.03), 14);
    ctx.lineCap = 'round';
    partial(ctx, pts, p);
    if (p > 0.95) {
      ctx.beginPath();
      ctx.arc(pts[0][0], pts[0][1], r * 0.07, 0, TAU);
      ctx.stroke();
      const [ex, ey] = pts[pts.length - 1];
      ctx.beginPath();
      ctx.moveTo(ex - r * 0.08, ey);
      ctx.lineTo(ex + r * 0.08, ey);
      ctx.stroke();
    }
    ctx.restore();
  };

  /** Ouroboros: serpente em círculo mordendo a cauda. */
  Art.ouroboros = (ctx, x, y, r, t, p = 1) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 0.4);
    const a1 = TAU * 0.95 * R.clamp(p);
    for (let k = 0; k < 60; k++) {
      const u = k / 60, a = u * a1, w = r * (0.03 + 0.09 * Math.sin(Math.PI * Math.min(1, u * 1.2)));
      ctx.fillStyle = k % 2 ? '#7a0a18' : '#a8102a';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r, w, 0, TAU);
      ctx.fill();
    }
    if (p > 0.9) {
      const a = a1;
      ctx.save();
      ctx.translate(Math.cos(a) * r, Math.sin(a) * r);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = '#c4102a';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.14, r * 0.09, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = P.gold;
      ctx.beginPath();
      ctx.arc(r * 0.05, -r * 0.03, r * 0.02, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  // ---------- documentos, mapas, objetos ----------
  /** Documento confidencial com tarjas pretas (redact 0..1 = quantas linhas já censuradas). */
  Art.doc = (ctx, x, y, w, h, t, o = {}) => {
    const { redact = 1, seed = 1, rot = -0.05, stamp = 1, title = 'CLASSIFICADO' } = o;
    const rnd = R.rng(seed);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = '#d9cfb4';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = 'rgba(80,60,30,0.15)';
    for (let i = 0; i < 40; i++) ctx.fillRect(-w / 2 + rnd() * w, -h / 2 + rnd() * h, rnd() * 40, rnd() * 40);
    ctx.font = `700 ${w * 0.05}px "DejaVu Sans Mono", monospace`;
    ctx.fillStyle = '#2a2018';
    ctx.textAlign = 'left';
    ctx.fillText('ARQUIVO Nº ' + (1000 + seed * 37) + ' • NÍVEL Ω', -w / 2 + w * 0.06, -h / 2 + h * 0.08);
    const rows = Math.floor(h / (w * 0.05));
    for (let i = 2; i < rows - 1; i++) {
      const yy = -h / 2 + i * w * 0.05 + h * 0.06, lw = w * (0.5 + rnd() * 0.38);
      ctx.fillStyle = 'rgba(40,30,20,0.55)';
      ctx.fillRect(-w / 2 + w * 0.06, yy, lw, w * 0.012);
      if (rnd() < 0.55 && i / rows < redact) {
        const rx = -w / 2 + w * 0.06 + rnd() * lw * 0.5;
        ctx.fillStyle = '#050505';
        ctx.fillRect(rx, yy - w * 0.012, lw * (0.25 + rnd() * 0.4), w * 0.036);
      }
    }
    if (stamp > 0) {
      ctx.save();
      ctx.translate(w * 0.1, h * 0.15);
      ctx.rotate(-0.25);
      ctx.scale(1 + 0.5 * (1 - R.clamp(stamp * 3)), 1 + 0.5 * (1 - R.clamp(stamp * 3)));
      ctx.globalAlpha = R.clamp(stamp * 3) * 0.85;
      ctx.strokeStyle = P.blood;
      ctx.lineWidth = w * 0.015;
      ctx.font = `900 ${w * 0.1}px "DejaVu Sans", sans-serif`;
      const tw = ctx.measureText(title).width;
      ctx.strokeRect(-tw / 2 - w * 0.03, -w * 0.08, tw + w * 0.06, w * 0.14);
      ctx.fillStyle = P.blood;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  };

  /** Globo em wireframe girando, com pontos marcados. */
  Art.globe = (ctx, x, y, r, t, o = {}) => {
    const { color = 'rgba(0,229,255,0.55)', marks = [] } = o;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
    for (let k = -3; k <= 3; k++) {
      const yy = (k / 4) * r, rx = Math.sqrt(r * r - yy * yy);
      ctx.beginPath();
      ctx.ellipse(0, yy, rx, rx * 0.12, 0, 0, TAU);
      ctx.stroke();
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI + t * 0.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.abs(Math.cos(a)) * r, r, 0, 0, TAU);
      ctx.stroke();
    }
    for (const [lon, lat, c] of marks) {
      const a = lon + t * 0.5, px = Math.sin(a) * Math.cos(lat) * r, py = -Math.sin(lat) * r;
      if (Math.cos(a) < 0) continue;
      Art.glow(ctx, px, py, 40, c || '196,16,42', 0.9);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  /** Mapa antigo com pinos e fios vermelhos ligando os pontos. */
  Art.map = (ctx, x, y, w, h, t, o = {}) => {
    const { strings = 1, morph = 0, seed = 3 } = o;
    const rnd = R.rng(seed);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#c9b78e';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = 'rgba(70,50,25,0.6)';
    ctx.lineWidth = 3;
    for (let c = 0; c < 4; c++) {
      ctx.beginPath();
      const cx = (rnd() - 0.5) * w * 0.7, cy = (rnd() - 0.5) * h * 0.7, cr = 60 + rnd() * 140;
      for (let k = 0; k <= 40; k++) {
        const a = (k / 40) * TAU, rr = cr * (1 + 0.3 * R.noise1(k * 0.6 + c * 9 + morph * 4, seed) + morph * 0.4 * Math.sin(a * 3 + t * 4));
        k ? ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8) : ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(120,95,55,0.35)';
      ctx.fill();
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(70,50,25,0.25)';
    ctx.lineWidth = 1.5;
    for (let k = -4; k <= 4; k++) {
      ctx.beginPath();
      ctx.moveTo((k / 9) * w, -h / 2);
      ctx.lineTo((k / 9) * w, h / 2);
      ctx.moveTo(-w / 2, (k / 9) * h);
      ctx.lineTo(w / 2, (k / 9) * h);
      ctx.stroke();
    }
    const pins = [];
    for (let k = 0; k < 7; k++) pins.push([(rnd() - 0.5) * w * 0.8, (rnd() - 0.5) * h * 0.8]);
    ctx.strokeStyle = '#b30f22';
    ctx.lineWidth = 3;
    for (let k = 0; k < pins.length - 1; k++) {
      const q = R.clamp(strings * (pins.length - 1) - k);
      if (q <= 0) continue;
      ctx.beginPath();
      ctx.moveTo(pins[k][0], pins[k][1]);
      ctx.lineTo(R.lerp(pins[k][0], pins[k + 1][0], q), R.lerp(pins[k][1], pins[k + 1][1], q));
      ctx.stroke();
    }
    for (const [px, py] of pins) {
      ctx.fillStyle = '#e0142e';
      ctx.beginPath();
      ctx.arc(px, py, 12, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  /** Moeda girando com o olho no centro. */
  Art.coin = (ctx, x, y, r, t, spin = 1) => {
    const sx = Math.max(0.06, Math.abs(Math.cos(t * 2.4 * spin)));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, 1);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#fff1b8');
    g.addColorStop(0.6, '#c99a3a');
    g.addColorStop(1, '#6a4a12');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#5a3c0c';
    ctx.lineWidth = r * 0.05;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.88, 0, TAU);
    ctx.stroke();
    Art.ring(ctx, 0, 0, r * 0.84, t, { rot: 0, color: '#5a3c0c', size: r * 0.1, lines: 0, glow: 0 });
    ctx.shadowBlur = 0;
    const tri = [[0, -r * 0.5], [r * 0.45, r * 0.32], [-r * 0.45, r * 0.32]];
    ctx.strokeStyle = '#4a3008';
    ctx.lineWidth = r * 0.05;
    partial(ctx, tri, 1, true);
    ctx.fillStyle = '#4a3008';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.02, r * 0.14, r * 0.08, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  /** Prédios em silhueta com um topo piramidal brilhando. */
  Art.city = (ctx, y, t, o = {}) => {
    const { glowTop = 1 } = o;
    const rnd = R.rng(17);
    let x = -100;
    const tops = [];
    while (x < W + 100) {
      const w = 80 + rnd() * 140, h = 300 + rnd() * 700;
      ctx.fillStyle = '#07040b';
      ctx.fillRect(x, y - h, w, h + 400);
      ctx.fillStyle = 'rgba(217,180,90,0.18)';
      for (let wy = y - h + 30; wy < y; wy += 46) for (let wx = x + 14; wx < x + w - 20; wx += 34) if (R.hash(Math.floor(wx * 7 + wy), 5) < 0.3) ctx.fillRect(wx, wy, 14, 22);
      tops.push([x + w / 2, y - h, w]);
      x += w + 8;
    }
    // a torre central tem uma pirâmide
    const cx = W / 2, top = y - 1250;
    ctx.fillStyle = '#05030a';
    ctx.fillRect(cx - 130, top, 260, 1250 + 400);
    ctx.beginPath();
    ctx.moveTo(cx - 130, top);
    ctx.lineTo(cx, top - 260);
    ctx.lineTo(cx + 130, top);
    ctx.closePath();
    ctx.fill();
    if (glowTop > 0) {
      Art.glow(ctx, cx, top - 120, 320, '217,180,90', 0.5 * glowTop);
      Art.eye(ctx, cx, top - 100, 52, t, { lashes: false, open: glowTop });
    }
  };

  /** Onda sonora / vinil com um símbolo escondido nas frequências. */
  Art.wave = (ctx, y, t, o = {}) => {
    const { amp = 1, reveal = 0 } = o;
    ctx.save();
    ctx.strokeStyle = P.cyan;
    ctx.shadowColor = P.cyan;
    ctx.shadowBlur = 16;
    ctx.lineWidth = 4;
    for (let line = 0; line < 3; line++) {
      ctx.globalAlpha = 1 - line * 0.3;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 6) {
        const u = x / W;
        let v = Math.sin(u * 40 + t * 9 + line) * 60 * amp * Math.sin(u * Math.PI);
        v += R.noise1(u * 30 + t * 6, line) * 80 * amp;
        // o triângulo escondido aparece no meio da onda
        if (reveal > 0) {
          const d = Math.abs(u - 0.5);
          v = R.lerp(v, d < 0.25 ? -(0.25 - d) * 1600 : 0, reveal);
        }
        x ? ctx.lineTo(x, y + v + line * 26) : ctx.moveTo(x, y + v + line * 26);
      }
      ctx.stroke();
    }
    ctx.restore();
  };

  /** Fluxo de números e código caindo (11:11, 33, 23, binário). */
  Art.numberRain = (ctx, t, o = {}) => {
    const { alpha = 0.5, color = '57,255,136', words = ['33', '11:11', '23', '7', '1111', '0333'], speed = 260 } = o;
    ctx.save();
    ctx.font = '700 34px "DejaVu Sans Mono", monospace';
    ctx.textAlign = 'center';
    for (let c = 0; c < 18; c++) {
      const x = (c + 0.5) * (W / 18), off = R.hash(c, 9) * 2000, sp = speed * (0.6 + R.hash(c, 4));
      for (let r = 0; r < 26; r++) {
        const y = ((r * 84 + t * sp + off) % (H + 200)) - 100;
        const word = R.hash(c * 31 + r, Math.floor(t * 4 + c)) < 0.2 ? words[Math.floor(R.hash(c, r) * words.length)] : String(Math.floor(R.hash(r, c + Math.floor(t * 10)) * 2));
        ctx.fillStyle = `rgba(${color},${alpha * (0.3 + 0.7 * R.hash(r, c))})`;
        ctx.fillText(word, x, y);
      }
    }
    ctx.restore();
  };

  /** Multidão em silhueta olhando para cima, olhos acesos. */
  Art.crowd = (ctx, y, t, o = {}) => {
    const { eyes = 1, rows = 4 } = o;
    for (let r = rows - 1; r >= 0; r--) {
      const s = 1 - r * 0.18, yy = y - r * 150 * s, n = Math.floor(8 + r * 3);
      for (let i = 0; i < n; i++) {
        const x = ((i + 0.5 + (r % 2) * 0.5) / n) * W + R.noise1(i + r * 10, 3) * 20;
        const hs = 70 * s;
        ctx.fillStyle = r === 0 ? '#020103' : `rgba(10,6,14,${1 - r * 0.15})`;
        ctx.beginPath();
        ctx.arc(x, yy - hs * 2.4, hs * 0.55, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x - hs, yy + 400);
        ctx.quadraticCurveTo(x - hs * 1.1, yy - hs * 1.6, x, yy - hs * 1.7);
        ctx.quadraticCurveTo(x + hs * 1.1, yy - hs * 1.6, x + hs, yy + 400);
        ctx.fill();
        if (eyes > 0 && R.hash(i, r + 7) < 0.8) {
          const on = R.clamp(eyes * 3 - R.hash(i, r) * 2);
          for (const sd of [-1, 1]) {
            ctx.fillStyle = `rgba(255,50,40,${on})`;
            ctx.beginPath();
            ctx.arc(x + sd * hs * 0.2, yy - hs * 2.5, hs * 0.07, 0, TAU);
            ctx.fill();
          }
        }
      }
    }
  };

  /** Portal cósmico: túnel de anéis com glifos indo na direção da câmera. */
  Art.portal = (ctx, x, y, t, o = {}) => {
    const { speed = 0.6, count = 9 } = o;
    for (let k = count - 1; k >= 0; k--) {
      const z = ((k / count + t * speed * 0.15) % 1), r = 40 + Math.pow(z, 2.2) * 1700;
      Art.ring(ctx, x, y, r, t, { rot: t * (k % 2 ? 0.3 : -0.25) + k, size: Math.max(10, r * 0.07), seed: k + 2, alpha: Math.min(1, z * 3) * (1 - z * 0.3), color: k % 3 === 0 ? P.blood : P.gold, lines: 1 });
    }
    Art.glow(ctx, x, y, 260, '255,230,190', 0.6);
  };

  /** Barra de "revelação" carregando + relógio regressivo. */
  Art.loading = (ctx, x, y, w, p, t, label = 'REVELAÇÃO') => {
    ctx.save();
    ctx.translate(x, y);
    ctx.font = '700 46px "DejaVu Sans Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = P.bone;
    ctx.fillText(`${label} ${Math.floor(R.clamp(p) * 100)}%`, 0, -50);
    ctx.strokeStyle = P.bone;
    ctx.lineWidth = 4;
    ctx.strokeRect(-w / 2, -20, w, 44);
    ctx.fillStyle = P.blood;
    ctx.fillRect(-w / 2 + 6, -14, (w - 12) * R.clamp(p), 32);
    ctx.restore();
  };

  /** Bolha de comentário do TikTok com texto sendo digitado. */
  Art.comment = (ctx, x, y, w, text, p, o = {}) => {
    const { user = 'você', likes = 0, hl = false } = o;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = hl ? 'rgba(196,16,42,0.92)' : 'rgba(20,14,26,0.92)';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -60, w, 120, 28);
    ctx.fill();
    ctx.strokeStyle = hl ? P.gold : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(-w / 2 + 60, 0, 34, 0, TAU);
    ctx.fill();
    ctx.font = '600 28px "Inter", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(user, -w / 2 + 112, -18);
    ctx.font = '900 40px "Inter", "Arial Black", sans-serif';
    ctx.fillStyle = '#fff';
    const s = text.slice(0, Math.floor(text.length * R.clamp(p)));
    ctx.fillText(s, -w / 2 + 112, 26);
    if (likes) {
      ctx.textAlign = 'right';
      ctx.font = '700 28px "Inter", Arial, sans-serif';
      ctx.fillStyle = '#ff4a6a';
      ctx.fillText(`♥ ${likes}`, w / 2 - 24, 10);
    }
    ctx.restore();
  };
})();
