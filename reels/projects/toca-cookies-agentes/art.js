/* TOCA DOS COOKIES — elementos gráficos desenhados por código:
 * D20 em 3D (icosaedro projetado com sombreamento), ficha de agente animada, selos ocultos,
 * carimbo, cookie mordido e botão "Seguir".
 */
(function () {
  'use strict';
  const R = window.Reel;
  const Art = (window.Art = {});

  // ---------------- D20 (icosaedro) ----------------
  const PHI = (1 + Math.sqrt(5)) / 2;
  const V = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) V.push([0, a, b * PHI], [a, b * PHI, 0], [b * PHI, 0, a]);
  const F = [];
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) for (let k = j + 1; k < 12; k++) {
    const d = (p, q) => Math.hypot(V[p][0] - V[q][0], V[p][1] - V[q][1], V[p][2] - V[q][2]);
    if (Math.abs(d(i, j) - 2) < 1e-6 && Math.abs(d(j, k) - 2) < 1e-6 && Math.abs(d(i, k) - 2) < 1e-6) F.push([i, j, k]);
  }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (a) => {
    const l = Math.hypot(...a);
    return [a[0] / l, a[1] / l, a[2] / l];
  };
  // normais para fora + numeração das faces (1..20)
  const FN = F.map((f) => {
    const c = [0, 1, 2].map((i) => (V[f[0]][i] + V[f[1]][i] + V[f[2]][i]) / 3);
    let n = norm(cross(sub(V[f[1]], V[f[0]]), sub(V[f[2]], V[f[0]])));
    if (dot(n, c) < 0) {
      n = n.map((x) => -x);
      f.reverse();
    }
    return { c, n };
  });
  const matMul = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
  const apply = (M, v) => [dot(M[0], v), dot(M[1], v), dot(M[2], v)];
  const axisAngle = (ax, a) => {
    const [x, y, z] = norm(ax), c = Math.cos(a), s = Math.sin(a), C = 1 - c;
    return [[c + x * x * C, x * y * C - z * s, x * z * C + y * s], [y * x * C + z * s, c + y * y * C, y * z * C - x * s], [z * x * C - y * s, z * y * C + x * s, c + z * z * C]];
  };
  /** Rotação que deixa a face `face` (1..20) virada para a câmera. */
  const faceUp = (face) => {
    const n = FN[(face - 1) % 20].n, z = [0, 0, 1];
    const ax = cross(n, z);
    if (Math.hypot(...ax) < 1e-6) return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    return axisAngle(ax, Math.acos(Math.max(-1, Math.min(1, dot(n, z)))));
  };

  /**
   * Dado rolando. p: 0 (lançado) -> 1 (parado mostrando `face`).
   * cor da face, borda e número personalizáveis.
   */
  Art.d20 = (ctx, x, y, r, p, face, o = {}) => {
    const { seed = 1, color = [150, 20, 30], edge = '#ffd9a8', crit = false } = o;
    const e = R.ease.outCubic(R.clamp(p));
    const spin = axisAngle([R.hash(seed, 1) - 0.5, R.hash(seed, 2) - 0.5, 0.4], (1 - e) * 9);
    const M = matMul(spin, faceUp(face));
    const bounce = Math.abs(Math.sin(e * Math.PI * 3)) * (1 - e) * r * 1.4;
    const light = norm([-0.4, -0.6, 1]);
    const faces = F.map((f, i) => {
      const pts = f.map((vi) => apply(M, V[vi]));
      const n = apply(M, FN[i].n);
      return { i, pts, n, z: (pts[0][2] + pts[1][2] + pts[2][2]) / 3 };
    }).filter((q) => q.n[2] > 0).sort((a, b) => a.z - b.z);
    const s = r / PHI / 1.05;
    ctx.save();
    ctx.translate(x, y - bounce);
    ctx.lineJoin = 'round';
    for (const q of faces) {
      const k = 0.35 + 0.65 * Math.max(0, dot(q.n, light));
      ctx.beginPath();
      q.pts.forEach((pt, j) => (j ? ctx.lineTo(pt[0] * s, pt[1] * s) : ctx.moveTo(pt[0] * s, pt[1] * s)));
      ctx.closePath();
      ctx.fillStyle = `rgb(${color.map((c) => Math.round(c * k + 40 * k * k)).join(',')})`;
      ctx.fill();
      ctx.strokeStyle = edge;
      ctx.lineWidth = r * 0.025;
      ctx.stroke();
      const cx = (q.pts[0][0] + q.pts[1][0] + q.pts[2][0]) / 3 * s, cy = (q.pts[0][1] + q.pts[1][1] + q.pts[2][1]) / 3 * s;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(Math.max(0.2, q.n[2]), Math.max(0.2, q.n[2]));
      ctx.font = `900 ${Math.round(r * 0.32)}px "Inter", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = q.i === face - 1 && crit && e > 0.98 ? '#fff' : edge;
      ctx.fillText(String(q.i + 1), 0, 0);
      ctx.restore();
    }
    ctx.restore();
  };

  // ---------------- selo oculto procedural ----------------
  Art.sigil = (ctx, x, y, r, t, seed = 1, color = 'rgba(220,40,40,0.55)') => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 0.25 * (seed % 2 ? 1 : -1));
    ctx.strokeStyle = color;
    ctx.lineWidth = r * 0.015;
    for (const k of [1, 0.92, 0.62]) {
      ctx.beginPath();
      ctx.arc(0, 0, r * k, 0, Math.PI * 2);
      ctx.stroke();
    }
    const n = 5 + (seed % 3);
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI * 2) / n;
      i ? ctx.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92) : ctx.moveTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92);
    }
    ctx.stroke();
    ctx.font = `${Math.round(r * 0.09)}px "VT323", monospace`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    const glyphs = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
    for (let i = 0; i < 24; i++) {
      ctx.save();
      ctx.rotate((i / 24) * Math.PI * 2);
      ctx.fillText(glyphs[Math.floor(R.hash(i, seed) * glyphs.length)], 0, -r * 0.955);
      ctx.restore();
    }
    ctx.restore();
  };

  // ---------------- carimbo ----------------
  let stampC = null;
  Art.stamp = (ctx, text, x, y, size, t0, t, color = '#e01b24', rot = -0.2) => {
    if (t < t0) return;
    stampC = stampC || R.canvas(1400, 900);
    const g = stampC.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, 1400, 900);
    g.translate(700, 450);
    g.rotate(rot);
    g.font = `900 ${size}px "Inter", sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const tw = g.measureText(text).width;
    g.strokeStyle = color;
    g.lineWidth = size * 0.1;
    g.strokeRect(-tw / 2 - size * 0.35, -size * 0.72, tw + size * 0.7, size * 1.44);
    g.fillStyle = color;
    g.fillText(text, 0, size * 0.05);
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 60; i++) {
      g.beginPath();
      g.arc((R.hash(i, 3) - 0.5) * (tw + size), (R.hash(i, 4) - 0.5) * size * 1.5, 2 + R.hash(i, 5) * size * 0.07, 0, Math.PI * 2);
      g.fill();
    }
    const p = R.spring(t - t0, 2.2, 7), sc = R.lerp(2.6, 1, Math.min(1, p));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    ctx.globalAlpha *= R.clamp((t - t0) * 14) * 0.95;
    ctx.drawImage(stampC, -700, -450);
    ctx.restore();
  };

  // ---------------- ficha de agente ----------------
  const ICONS = {
    eye(ctx, s) {
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.quadraticCurveTo(0, -s * 0.9, s, 0);
      ctx.quadraticCurveTo(0, s * 0.9, -s, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.32, 0, Math.PI * 2);
      ctx.fill();
    },
    blade(ctx, s) {
      for (const d of [-1, 1]) {
        ctx.save();
        ctx.rotate(d * 0.7);
        ctx.fillRect(-s * 0.07, -s, s * 0.14, s * 1.5);
        ctx.fillRect(-s * 0.3, s * 0.35, s * 0.6, s * 0.1);
        ctx.restore();
      }
    },
    lens(ctx, s) {
      ctx.lineWidth = s * 0.16;
      ctx.beginPath();
      ctx.arc(-s * 0.15, -s * 0.15, s * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.25, s * 0.25);
      ctx.lineTo(s * 0.85, s * 0.85);
      ctx.stroke();
    },
    scroll(ctx, s) {
      for (let k = 0; k < 4; k++) {
        ctx.save();
        ctx.translate(k * s * 0.12 - s * 0.2, -k * s * 0.1);
        ctx.strokeRect(-s * 0.45, -s * 0.6, s * 0.9, s * 1.2);
        ctx.restore();
      }
      for (let k = 0; k < 5; k++) ctx.fillRect(-s * 0.1, -s * 0.6 + k * s * 0.22, s * 0.55, s * 0.05);
    },
    hand(ctx, s) {
      ctx.beginPath();
      ctx.ellipse(0, s * 0.25, s * 0.42, s * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.roundRect(-s * 0.42 + k * s * 0.23, -s * 0.85 + Math.abs(k - 1.5) * s * 0.12, s * 0.17, s * 0.9, s * 0.08);
        ctx.fill();
      }
      ctx.save();
      ctx.rotate(-0.7);
      ctx.beginPath();
      ctx.roundRect(-s * 0.85, -s * 0.05, s * 0.5, s * 0.17, s * 0.08);
      ctx.fill();
      ctx.restore();
    },
  };

  /**
   * Ficha de agente. d = { n, title, cls, icon, stats: [{label, value, bar, t, warn}], accent }
   * t0 = entrada; exit = saída. Os atributos aparecem nos tempos `t` de cada linha.
   */
  Art.card = (ctx, t, d, t0, exit, x = 540, y = 820) => {
    if (t < t0 || t > exit + 0.3) return;
    const pin = R.spring(t - t0, 1.7, 6), out = R.ease.inCubic(R.clamp((t - exit) / 0.25));
    const w = 820, h = 860, acc = d.accent || '#e01b24';
    ctx.save();
    ctx.translate(x + out * 1400, y + (1 - Math.min(1, pin)) * 900 + Math.sin(t * 1.6) * 6);
    ctx.rotate((1 - pin) * 0.5 - 0.035 + out * 0.4 + Math.sin(t * 1.3) * 0.008);
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 18, -h / 2 + 24, w, h, 26);
    ctx.fill();
    // corpo
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#1c171d');
    g.addColorStop(1, '#0e0b10');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 26);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = acc;
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,220,180,0.35)';
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 16, -h / 2 + 16, w - 32, h - 32, 18);
    ctx.stroke();
    // brilho holográfico passando
    const sh = ((t - t0) * 0.8) % 2.4 - 0.6;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 26);
    ctx.clip();
    const hg = ctx.createLinearGradient(-w / 2 + sh * w, -h / 2, -w / 2 + sh * w + 220, h / 2);
    hg.addColorStop(0, 'rgba(255,255,255,0)');
    hg.addColorStop(0.5, 'rgba(255,230,210,0.12)');
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
    // cabeçalho
    ctx.fillStyle = acc;
    ctx.fillRect(-w / 2 + 16, -h / 2 + 16, w - 32, 74);
    ctx.font = '50px "VT323", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0e0b10';
    ctx.fillText('FICHA DE AGENTE', -w / 2 + 44, -h / 2 + 55);
    ctx.textAlign = 'right';
    ctx.fillText(`#0${d.n}`, w / 2 - 44, -h / 2 + 55);
    ctx.textAlign = 'left';
    // ícone com selo
    Art.sigil(ctx, -w / 2 + 150, -h / 2 + 230, 105, t, d.n, 'rgba(255,90,80,0.5)');
    ctx.save();
    ctx.translate(-w / 2 + 150, -h / 2 + 230);
    ctx.fillStyle = ctx.strokeStyle = '#f2e6d8';
    ctx.lineWidth = 10;
    ICONS[d.icon](ctx, 52);
    ctx.restore();
    // nome
    ctx.font = '900 76px "Inter", sans-serif';
    ctx.fillStyle = '#f7efe6';
    const words = d.title.split('|');
    words.forEach((s, i) => ctx.fillText(s, -w / 2 + 280, -h / 2 + 190 + i * 78));
    ctx.font = '44px "VT323", monospace';
    ctx.fillStyle = acc;
    ctx.fillText(d.cls, -w / 2 + 284, -h / 2 + 190 + words.length * 78 - 6);
    // atributos
    let yy = -h / 2 + 400;
    for (const s of d.stats) {
      const a = R.clamp((t - s.t) * 6);
      if (a <= 0) {
        yy += 108;
        continue;
      }
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate((1 - a) * 60, 0);
      ctx.font = '44px "VT323", monospace';
      ctx.fillStyle = 'rgba(242,230,216,0.75)';
      ctx.fillText(s.label, -w / 2 + 56, yy);
      const val = typeof s.value === 'function' ? s.value(t) : s.value;
      ctx.font = '900 52px "Inter", sans-serif';
      ctx.textAlign = 'right';
      const warn = s.warn !== undefined && t >= s.warn;
      ctx.fillStyle = warn ? '#ff3b3b' : '#f7efe6';
      ctx.fillText(val, w / 2 - 56, yy);
      ctx.textAlign = 'left';
      if (s.bar !== undefined) {
        const bv = typeof s.bar === 'function' ? s.bar(t) : s.bar;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(-w / 2 + 56, yy + 30, w - 112, 16);
        ctx.fillStyle = warn ? '#ff3b3b' : acc;
        ctx.fillRect(-w / 2 + 56, yy + 30, (w - 112) * R.clamp(bv) * R.ease.outCubic(R.clamp((t - s.t) * 3)), 16);
      }
      ctx.restore();
      yy += 108;
    }
    ctx.font = '40px "VT323", monospace';
    ctx.fillStyle = 'rgba(242,230,216,0.45)';
    ctx.fillText('ORDEM DOS COOKIES  ·  NEX 5%', -w / 2 + 56, h / 2 - 44);
    if (d.stamp) Art.stamp(ctx, d.stamp.text, 60, 120, d.stamp.size || 130, d.stamp.t, t, d.stamp.color || '#e01b24', d.stamp.rot ?? -0.22);
    ctx.restore();
  };

  // ---------------- marca: Toca dos Cookies ----------------
  let cookieC = null;
  Art.cookie = (ctx0, x, y, r, rot = 0) => {
    cookieC = cookieC || R.canvas(Math.ceil(r * 2.4), Math.ceil(r * 2.4));
    const ctx = cookieC.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, cookieC.width, cookieC.height);
    ctx.save();
    ctx.translate(cookieC.width / 2, cookieC.height / 2);
    ctx.rotate(rot);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#e9b874');
    g.addColorStop(1, '#b97a3e');
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2, rr = r * (1 + 0.03 * Math.sin(i * 2.7));
      i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(rr, 0);
    }
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = r * 0.05;
    ctx.strokeStyle = '#6e4220';
    ctx.stroke();
    ctx.fillStyle = '#3b2010';
    for (let i = 0; i < 9; i++) {
      const a = R.hash(i, 8) * Math.PI * 2, d = Math.sqrt(R.hash(i, 9)) * r * 0.7;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d, r * 0.1, r * 0.08, a, 0, Math.PI * 2);
      ctx.fill();
    }
    // mordida
    ctx.globalCompositeOperation = 'destination-out';
    for (const [dx, dy, rr] of [[0.85, -0.55, 0.28], [0.62, -0.8, 0.25], [0.98, -0.25, 0.22]]) {
      ctx.beginPath();
      ctx.arc(dx * r, dy * r, rr * r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx0.drawImage(cookieC, x - cookieC.width / 2, y - cookieC.height / 2);
  };

  /** Cartela final: cookie + nome + botão Seguir sendo tocado. */
  /** Logo da página recortado em círculo (estilo avatar), com aro e brilho. */
  Art.logo = (ctx, img, x, y, r, t) => {
    // recorte centrado no cookie de chapéu (coordenadas do arquivo 1600x1600)
    const cx = 935, cy = 760, cr = 700;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 1.5) * 0.06);
    ctx.shadowColor = 'rgba(255,170,90,0.6)';
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.arc(0, 0, r + 10, 0, Math.PI * 2);
    ctx.fillStyle = '#fff3e0';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, cx - cr, cy - cr, cr * 2, cr * 2, -r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#8a2be2';
    ctx.beginPath();
    ctx.arc(0, 0, r + 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  /**
   * Marca d'água anti-roubo: logo pequeno + nome, semi-transparente, mudando de lugar
   * suavemente a cada `period` segundos (fica fora das legendas e da interface do TikTok).
   */
  const WM_SPOTS = [[300, 300], [760, 560], [290, 1180], [770, 330], [300, 760]];
  Art.watermark = (ctx, t, logo, o = {}) => {
    const { alpha = 0.3, period = 7, name = 'Toca dos Cookies' } = o;
    const k = Math.floor(t / period), ph = (t % period) / period;
    const [x0, y0] = WM_SPOTS[k % WM_SPOTS.length], [x1, y1] = WM_SPOTS[(k + 1) % WM_SPOTS.length];
    const m = R.ease.inOutCubic(R.clamp((ph - 0.85) / 0.15));
    const x = R.lerp(x0, x1, m), y = R.lerp(y0, y1, m);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (logo) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(-150, 0, 34, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logo, 935 - 700, 760 - 700, 1400, 1400, -184, -34, 68, 68);
      ctx.restore();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-150, 0, 34, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.font = '40px "Shrikhand", "Inter", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeText(name, -104, 2);
    ctx.fillStyle = '#fff';
    ctx.fillText(name, -104, 2);
    ctx.restore();
  };

  Art.brand = (ctx, t, t0, tap, logo) => {
    if (t < t0) return;
    const p = R.spring(t - t0, 1.6, 6);
    ctx.save();
    ctx.translate(540, 760);
    ctx.scale(Math.max(0.01, p), Math.max(0.01, p));
    Art.sigil(ctx, 0, 0, 320, t, 3, 'rgba(190,120,255,0.45)');
    if (logo) Art.logo(ctx, logo, 0, 0, 220, t);
    else Art.cookie(ctx, 0, 0, 200, Math.sin(t * 1.5) * 0.12);
    ctx.restore();
    const tp = R.spring(t - t0 - 0.15, 1.6, 6);
    ctx.save();
    ctx.translate(540, 1110);
    ctx.scale(Math.max(0.01, tp), Math.max(0.01, tp));
    ctx.font = '96px "Shrikhand", "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText('Toca dos Cookies').width;
    window.Reel.kin.extrude(ctx, 'Toca dos Cookies', -tw / 2, 0, { size: 96, depth: 10, fill: '#ffe7c2', side: '#8a4a1f', edge: '#1a0f08' });
    ctx.restore();
    // botão seguir
    const bp = R.spring(t - t0 - 0.3, 1.8, 6);
    if (t < t0 + 0.3) return;
    const pressed = t >= tap, press = R.clamp(1 - Math.abs(t - tap) / 0.12);
    ctx.save();
    ctx.translate(540, 1300);
    ctx.scale(Math.max(0.01, bp) * (1 - press * 0.08), Math.max(0.01, bp) * (1 - press * 0.08));
    ctx.beginPath();
    ctx.roundRect(-230, -62, 460, 124, 62);
    ctx.fillStyle = pressed ? '#3a3a42' : '#fe2c55';
    ctx.fill();
    ctx.font = '900 58px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(pressed ? 'Seguindo ✓' : '+ Seguir', 0, 4);
    ctx.restore();
    // dedo tocando
    const fp = R.clamp((t - (tap - 0.45)) / 0.45);
    if (fp > 0 && t < tap + 0.6) {
      ctx.save();
      ctx.translate(R.lerp(820, 690, R.ease.outCubic(fp)), R.lerp(1580, 1360, R.ease.outCubic(fp)) + press * 12);
      ctx.globalAlpha = 1 - R.clamp((t - tap - 0.3) / 0.3);
      ctx.fillStyle = '#ffe0c4';
      ctx.strokeStyle = '#1a0f08';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(-26, -70, 52, 150, 26);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(-60, 20, 120, 150, 50);
      ctx.fill();
      ctx.stroke();
      if (press > 0) {
        ctx.strokeStyle = `rgba(255,255,255,${press})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, -70, 40 + (1 - press) * 40, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  };
})();
