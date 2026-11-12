/* ECHO VALLEY (comercial anos 50) — biblioteca de ilustração procedural.
 * Nenhuma imagem: tudo é desenhado com caminhos, gradientes e ruído.
 */
(function () {
  'use strict';
  const R = window.Reel;
  const { W, H } = R;
  const Art = (window.Art = {});

  const P = (Art.P = {
    cream: '#f6ead0', paper: '#efe0bf', sky1: '#7fd0d6', sky2: '#e3f4ea', teal: '#2e8c88', turq: '#56bdb6',
    mint: '#a7dcc6', mustard: '#efb73e', orange: '#ec7a3c', coral: '#e5573f', red: '#c73a2e', pink: '#f4a9a0',
    navy: '#1d2638', brown: '#7a5236', grass: '#86b95e', grass2: '#679d4b', pine: '#2f6b4f', pine2: '#245540',
    mtn: '#79a9bd', mtn2: '#55869f', snow: '#fbf6ea', white: '#fff8ea',
    houses: ['#f2c6b4', '#a8dcd1', '#f6d77a', '#f4a9a0', '#bfe0f0', '#f6ead0'],
    roofs: ['#c73a2e', '#2e8c88', '#1d2638', '#7a5236', '#e5573f'],
  });

  // ---------- utilidades ----------
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  Art.mix = (a, b, k) => {
    const A = hex(a), B = hex(b);
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`;
  };
  Art.rr = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  };
  const ell = (ctx, x, y, rx, ry, rot = 0) => {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  };

  // ---------- fundos ----------
  Art.grad = (ctx, top, bottom, y0 = 0, y1 = H) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, W, y1 - y0);
  };
  /** Raios de sol alternados (fundo de pôster). */
  Art.rays = (ctx, cx, cy, n, rot, c1, c2, r = 3000) => {
    ctx.fillStyle = c1;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = c2;
    for (let i = 0; i < n; i++) {
      const a = rot + (i * Math.PI * 2) / n;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.lineTo(cx + Math.cos(a + Math.PI / n) * r, cy + Math.sin(a + Math.PI / n) * r);
      ctx.fill();
    }
  };
  Art.starburst = (ctx, x, y, r1, r2, n, rot, fill, stroke, lw = 6) => {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i * Math.PI) / n, r = i % 2 ? r2 : r1;
      i ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.lineWidth = lw;
      ctx.strokeStyle = stroke;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  };
  Art.cloud = (ctx, x, y, s, fill = P.white) => {
    ctx.fillStyle = fill;
    for (const [dx, dy, r] of [[-0.55, 0, 0.32], [-0.2, -0.22, 0.42], [0.22, -0.14, 0.38], [0.55, 0.02, 0.28]]) {
      ell(ctx, x + dx * s, y + dy * s, r * s, r * s);
      ctx.fill();
    }
    Art.rr(ctx, x - 0.8 * s, y - 0.02 * s, 1.6 * s, 0.3 * s, 0.15 * s);
    ctx.fill();
  };
  Art.mountains = (ctx, y, o = {}) => {
    const { seed = 1, count = 4, height = 500, color = P.mtn, snow = P.snow, x0 = -150, width = W + 300 } = o;
    const pk = [];
    ctx.beginPath();
    ctx.moveTo(x0, y);
    for (let i = 0; i <= count; i++) {
      const px = x0 + (width * (i + 0.5)) / (count + 1) + (R.hash(i, seed) - 0.5) * (width / count) * 0.4;
      const py = y - height * (0.6 + 0.4 * R.hash(i, seed + 3));
      ctx.lineTo(px, py);
      pk.push([px, py]);
      const vx = px + width / (count + 1) / 2;
      ctx.lineTo(vx, y - height * (0.15 + 0.25 * R.hash(i, seed + 5)));
    }
    ctx.lineTo(x0 + width, y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (snow) {
      ctx.fillStyle = snow;
      for (const [px, py] of pk) {
        const s = height * 0.16;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + s * 0.75, py + s * 1.1);
        ctx.lineTo(px + s * 0.3, py + s * 0.8);
        ctx.lineTo(px, py + s * 1.05);
        ctx.lineTo(px - s * 0.35, py + s * 0.75);
        ctx.lineTo(px - s * 0.75, py + s * 1.1);
        ctx.closePath();
        ctx.fill();
      }
    }
  };
  Art.hill = (ctx, cx, y, rx, ry, color) => {
    ctx.fillStyle = color;
    ell(ctx, cx, y, rx, ry);
    ctx.fill();
  };
  Art.pine = (ctx, x, y, h, fill = P.pine, trunk = '#5a3a26') => {
    const w = h * 0.42;
    ctx.fillStyle = trunk;
    ctx.fillRect(x - w * 0.07, y - h * 0.13, w * 0.14, h * 0.13);
    ctx.fillStyle = fill;
    for (let k = 0; k < 3; k++) {
      const ty = y - h * 0.1 - k * h * 0.25, tw = w * (1 - k * 0.24);
      ctx.beginPath();
      ctx.moveTo(x - tw / 2, ty);
      ctx.lineTo(x, ty - h * 0.44);
      ctx.lineTo(x + tw / 2, ty);
      ctx.closePath();
      ctx.fill();
    }
  };
  Art.forest = (ctx, y, o = {}) => {
    const { seed = 1, count = 14, h = 260, fill = P.pine, trunk, offset = 0, jitter = 0.35 } = o;
    const step = (W + 400) / count;
    for (let i = 0; i < count + 2; i++) {
      const x = ((i * step + offset) % (W + 400 + step)) - 200;
      Art.pine(ctx, x + (R.hash(i, seed) - 0.5) * step * 0.6, y + R.hash(i, seed + 1) * h * 0.1, h * (1 - jitter / 2 + jitter * R.hash(i, seed + 2)), fill, trunk || fill);
    }
  };
  Art.roundTree = (ctx, x, y, s, fill = P.grass2) => {
    ctx.fillStyle = '#6b4a35';
    ctx.fillRect(x - s * 0.06, y - s * 0.5, s * 0.12, s * 0.5);
    ctx.fillStyle = fill;
    for (const [dx, dy, r] of [[0, -0.75, 0.38], [-0.25, -0.55, 0.28], [0.25, -0.55, 0.28]]) {
      ell(ctx, x + dx * s, y + dy * s, r * s, r * s);
      ctx.fill();
    }
  };

  // ---------- cidade ----------
  /** Casa com os pés em (x, y). Devolve centros das janelas (para luz noturna). */
  Art.house = (ctx, x, y, w, h, o = {}) => {
    const { body = P.houses[0], roof = P.roofs[0], trim = P.white, door = P.teal, lit = false, chimney = true, edge = P.navy } = o;
    const left = x - w / 2, top = y - h, lw = Math.max(1, w * 0.018);
    ctx.lineJoin = 'round';
    ctx.lineWidth = lw;
    ctx.strokeStyle = edge;
    if (chimney) {
      ctx.fillStyle = '#a5483a';
      ctx.fillRect(x + w * 0.16, top - h * 0.52, w * 0.12, h * 0.45);
      ctx.strokeRect(x + w * 0.16, top - h * 0.52, w * 0.12, h * 0.45);
    }
    ctx.fillStyle = body;
    ctx.fillRect(left, top, w, h);
    ctx.strokeRect(left, top, w, h);
    ctx.beginPath();
    ctx.moveTo(left - w * 0.08, top + 2);
    ctx.lineTo(x, top - h * 0.62);
    ctx.lineTo(left + w * 1.08, top + 2);
    ctx.closePath();
    ctx.fillStyle = roof;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = door;
    ctx.fillRect(x - w * 0.09, y - h * 0.56, w * 0.18, h * 0.56);
    ctx.strokeRect(x - w * 0.09, y - h * 0.56, w * 0.18, h * 0.56);
    const wins = [];
    for (const wx of [left + w * 0.1, left + w * 0.66]) {
      const ww = w * 0.24, wh = h * 0.32, wy = top + h * 0.2;
      ctx.fillStyle = roof;
      ctx.fillRect(wx - ww * 0.18, wy, ww * 0.16, wh);
      ctx.fillRect(wx + ww * 1.02, wy, ww * 0.16, wh);
      ctx.fillStyle = lit ? '#ffd76a' : '#bfe6f0';
      ctx.fillRect(wx, wy, ww, wh);
      ctx.strokeRect(wx, wy, ww, wh);
      ctx.fillStyle = trim;
      ctx.fillRect(wx + ww / 2 - lw / 2, wy, lw, wh);
      ctx.fillRect(wx, wy + wh / 2 - lw / 2, ww, lw);
      wins.push([wx + ww / 2, wy + wh / 2, ww]);
    }
    ell(ctx, x, top - h * 0.22, w * 0.065, w * 0.065);
    ctx.fillStyle = lit ? '#ffd76a' : '#bfe6f0';
    ctx.fill();
    ctx.stroke();
    wins.push([x, top - h * 0.22, w * 0.13]);
    return wins;
  };
  Art.fence = (ctx, x0, x1, y, h, color = P.white, edge = P.navy) => {
    const sp = h * 0.34;
    ctx.fillStyle = color;
    ctx.strokeStyle = edge;
    ctx.lineWidth = Math.max(1, h * 0.03);
    ctx.fillRect(x0, y - h * 0.72, x1 - x0, h * 0.1);
    ctx.fillRect(x0, y - h * 0.36, x1 - x0, h * 0.1);
    for (let x = x0; x < x1; x += sp) {
      const pw = sp * 0.62;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - h * 0.85);
      ctx.lineTo(x + pw / 2, y - h);
      ctx.lineTo(x + pw, y - h * 0.85);
      ctx.lineTo(x + pw, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  };

  /** Cidade de cartão-postal usada na abertura, no final e dentro das letras. */
  Art.town = (ctx, t, o = {}) => {
    const { drift = 0, night = 0, sky = true, houseY = 1500 } = o;
    if (sky) Art.grad(ctx, Art.mix(P.sky1, '#0b1020', night), Art.mix(P.sky2, '#1a2238', night), 0, houseY);
    for (let i = 0; i < 3; i++) Art.cloud(ctx, ((i * 430 + t * 30 + drift * 0.3) % (W + 500)) - 250, 980 + i * 70 - (i % 2) * 120, 150 + i * 20, Art.mix(P.white, '#2a3048', night));
    Art.mountains(ctx, houseY - 240, { seed: 4, count: 4, height: 420, color: Art.mix(P.mtn, '#141a2c', night), snow: night > 0.5 ? null : P.snow, x0: -200 - drift * 0.2 });
    Art.hill(ctx, 200 - drift * 0.35, houseY - 60, 700, 260, Art.mix(P.grass, '#101a18', night));
    Art.hill(ctx, 980 - drift * 0.35, houseY - 40, 640, 240, Art.mix(P.grass2, '#0c1513', night));
    Art.forest(ctx, houseY - 170, { seed: 3, count: 12, h: 170, fill: Art.mix(P.pine, '#05080a', night), offset: -drift * 0.4 });
    ctx.fillStyle = Art.mix(P.grass, '#0e1714', night);
    ctx.fillRect(0, houseY - 10, W, H - houseY + 10);
    const wins = [];
    for (let i = 0; i < 7; i++) {
      const x = i * 330 - 120 - (drift % 330);
      const k = (i + Math.floor(drift / 330)) % 6;
      const w = 230 + (k % 3) * 25, h = 160 + (k % 2) * 30;
      wins.push(...Art.house(ctx, x, houseY + 30, w, h, { body: Art.mix(P.houses[k], '#1a2030', night * 0.8), roof: Art.mix(P.roofs[k % 5], '#0a0d16', night * 0.7), lit: night > 0.4, door: Art.mix(P.teal, '#0a0d16', night * 0.7) }));
      if (i % 2) Art.roundTree(ctx, x + 175, houseY + 40, 150, Art.mix(P.grass2, '#08100c', night));
    }
    Art.fence(ctx, -20, W + 20, houseY + 190, 120, Art.mix(P.white, '#2a3040', night));
    return wins;
  };

  // ---------- mascote: Sunny, o sol de Echo Valley ----------
  Art.sun = (ctx, x, y, r, t, o = {}) => {
    const { mood = 0, talk = 0, rayRot = t * 0.35, blink = 0, wink = 0, look = [0, 0] } = o;
    const m = R.clamp(mood);
    ctx.save();
    ctx.translate(x, y);
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = rayRot + (i * Math.PI * 2) / n, len = r * (1.5 + 0.08 * Math.sin(t * 4 + i) + m * 0.25 * R.hash(i, Math.floor(t * 12)));
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.13) * r * 0.9, Math.sin(a - 0.13) * r * 0.9);
      ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      ctx.lineTo(Math.cos(a + 0.13) * r * 0.9, Math.sin(a + 0.13) * r * 0.9);
      ctx.closePath();
      ctx.fillStyle = Art.mix(i % 2 ? P.mustard : P.orange, i % 2 ? '#2a0a0a' : '#5a0d0d', m);
      ctx.fill();
      ctx.lineWidth = r * 0.03;
      ctx.strokeStyle = P.navy;
      ctx.stroke();
    }
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, Art.mix('#ffe58a', '#d8d2c0', m));
    g.addColorStop(1, Art.mix('#f5a83a', '#6d6656', m));
    ell(ctx, 0, 0, r, r);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = r * 0.06;
    ctx.strokeStyle = P.navy;
    ctx.stroke();
    // bochechas
    ctx.globalAlpha = 0.55 * (1 - m);
    ctx.fillStyle = '#f37b6b';
    for (const s of [-1, 1]) {
      ell(ctx, s * r * 0.55, r * 0.18, r * 0.16, r * 0.1);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // olhos felizes
    const ey = -r * 0.18, ex = r * 0.33;
    if (m < 1) {
      ctx.globalAlpha = 1 - m;
      for (const s of [-1, 1]) {
        if (s === 1 && wink > 0.5) {
          ctx.beginPath();
          ctx.arc(s * ex, ey + r * 0.05, r * 0.11, Math.PI * 1.1, Math.PI * 1.9);
          ctx.lineWidth = r * 0.05;
          ctx.strokeStyle = P.navy;
          ctx.stroke();
          continue;
        }
        ell(ctx, s * ex + look[0] * r * 0.04, ey + look[1] * r * 0.04, r * 0.1, r * 0.16 * (1 - 0.9 * blink));
        ctx.fillStyle = P.navy;
        ctx.fill();
        ell(ctx, s * ex - r * 0.03 + look[0] * r * 0.04, ey - r * 0.06, r * 0.035, r * 0.05 * (1 - blink));
        ctx.fillStyle = '#fff';
        ctx.fill();
      }
    }
    // olhos de terror
    if (m > 0) {
      ctx.globalAlpha = m;
      for (const s of [-1, 1]) {
        ell(ctx, s * ex, ey, r * 0.19, r * 0.24, s * 0.25);
        ctx.fillStyle = '#050505';
        ctx.fill();
        const gl = ctx.createRadialGradient(s * ex, ey, 0, s * ex, ey, r * 0.12);
        gl.addColorStop(0, 'rgba(255,40,30,0.9)');
        gl.addColorStop(1, 'rgba(255,40,30,0)');
        ctx.fillStyle = gl;
        ctx.fillRect(s * ex - r * 0.12, ey - r * 0.12, r * 0.24, r * 0.24);
        ell(ctx, s * ex + look[0] * r * 0.05, ey + look[1] * r * 0.05, r * 0.03, r * 0.03);
        ctx.fillStyle = '#fff';
        ctx.fill();
      }
    }
    // boca feliz (abre com a voz)
    const open = R.clamp(talk);
    if (m < 1) {
      ctx.globalAlpha = 1 - m;
      ctx.beginPath();
      ctx.moveTo(-r * 0.42, r * 0.2);
      ctx.quadraticCurveTo(0, r * (0.32 + 0.06 * open), r * 0.42, r * 0.2);
      ctx.quadraticCurveTo(0, r * (0.62 + 0.38 * open), -r * 0.42, r * 0.2);
      ctx.closePath();
      ctx.fillStyle = '#7a1f22';
      ctx.fill();
      ctx.lineWidth = r * 0.045;
      ctx.strokeStyle = P.navy;
      ctx.stroke();
      ctx.save();
      ctx.clip();
      ell(ctx, 0, r * (0.62 + 0.3 * open), r * 0.24, r * 0.18);
      ctx.fillStyle = '#f0717a';
      ctx.fill();
      ctx.restore();
    }
    // sorriso de terror com dentes
    if (m > 0) {
      ctx.globalAlpha = m;
      const wdt = r * (0.62 + 0.25 * m), oy = r * 0.2;
      ctx.beginPath();
      ctx.moveTo(-wdt, oy - r * 0.2);
      ctx.quadraticCurveTo(0, oy + r * 0.12, wdt, oy - r * 0.2);
      ctx.quadraticCurveTo(0, oy + r * (0.55 + 0.2 * open), -wdt, oy - r * 0.2);
      ctx.closePath();
      ctx.fillStyle = '#080404';
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#efe6d2';
      for (let i = -7; i <= 7; i++) {
        const tx = (i / 7) * wdt, ty = oy - r * 0.2 + r * 0.32 * (1 - (i / 7) ** 2);
        ctx.beginPath();
        ctx.moveTo(tx - r * 0.06, ty - r * 0.12);
        ctx.lineTo(tx + r * 0.06, ty - r * 0.12);
        ctx.lineTo(tx, ty + r * 0.06);
        ctx.fill();
        const by = oy - r * 0.2 + r * (0.7 + 0.2 * open) * (1 - (i / 7) ** 2);
        ctx.beginPath();
        ctx.moveTo(tx - r * 0.06, by + r * 0.06);
        ctx.lineTo(tx + r * 0.06, by + r * 0.06);
        ctx.lineTo(tx, by - r * 0.1);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  };

  // ---------- sorveteria ----------
  Art.cone = (ctx, x, y, s, scoops, t) => {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = P.navy;
    ctx.lineWidth = s * 0.03;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.42, y - s);
    ctx.lineTo(x, y);
    ctx.lineTo(x + s * 0.42, y - s);
    ctx.closePath();
    ctx.fillStyle = '#e2a85c';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = '#b5783a';
    ctx.lineWidth = s * 0.02;
    for (let k = -8; k < 8; k++) {
      ctx.beginPath();
      ctx.moveTo(x + k * s * 0.12, y - s);
      ctx.lineTo(x + k * s * 0.12 + s * 0.6, y);
      ctx.moveTo(x + k * s * 0.12, y - s);
      ctx.lineTo(x + k * s * 0.12 - s * 0.6, y);
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.42, y - s);
    ctx.lineTo(x, y);
    ctx.lineTo(x + s * 0.42, y - s);
    ctx.closePath();
    ctx.stroke();
    scoops.forEach((sc, k) => {
      const p = R.spring(t - sc.t, 1.6, 5.5);
      if (t < sc.t) return;
      const sy = y - s * 1.1 - k * s * 0.4 - (1 - p) * 900;
      const sq = 1 + (1 - p) * 0.12;
      ctx.save();
      ctx.translate(x, sy);
      ctx.scale(1 / sq, sq);
      ctx.beginPath();
      ctx.arc(0, -s * 0.18, s * 0.4, Math.PI * 0.95, Math.PI * 2.05);
      for (let d = 0; d <= 8; d++) {
        const dx = s * 0.4 - (d / 8) * s * 0.8;
        ctx.lineTo(dx, s * 0.05 + (d % 2 ? s * 0.09 : 0) + (d === 3 ? s * 0.12 : 0));
      }
      ctx.closePath();
      ctx.fillStyle = sc.color;
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-s * 0.12, -s * 0.32, s * 0.12, Math.PI * 1.1, Math.PI * 1.6);
      ctx.lineWidth = s * 0.035;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();
  };
  Art.cherry = (ctx, x, y, s) => {
    ctx.strokeStyle = '#3f6b2a';
    ctx.lineWidth = s * 0.08;
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.6);
    ctx.quadraticCurveTo(x + s * 0.3, y - s * 1.3, x + s * 0.7, y - s * 1.4);
    ctx.stroke();
    ell(ctx, x, y - s * 0.3, s * 0.42, s * 0.4);
    ctx.fillStyle = '#d3202c';
    ctx.fill();
    ctx.lineWidth = s * 0.07;
    ctx.strokeStyle = P.navy;
    ctx.stroke();
    ell(ctx, x - s * 0.14, y - s * 0.45, s * 0.1, s * 0.07);
    ctx.fillStyle = '#fff';
    ctx.fill();
  };
  Art.balloon = (ctx, x, y, r, color, t, seed = 1) => {
    const sway = Math.sin(t * 1.6 + seed) * r * 0.25;
    ctx.strokeStyle = 'rgba(29,38,56,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + r * 1.2);
    ctx.bezierCurveTo(x + sway, y + r * 2, x - sway, y + r * 3, x + sway * 0.5, y + r * 4.2);
    ctx.stroke();
    ell(ctx, x, y, r, r * 1.18);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = r * 0.06;
    ctx.strokeStyle = P.navy;
    ctx.stroke();
    ell(ctx, x - r * 0.35, y - r * 0.45, r * 0.18, r * 0.3, -0.5);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - r * 0.12, y + r * 1.3);
    ctx.lineTo(x + r * 0.12, y + r * 1.3);
    ctx.lineTo(x, y + r * 1.15);
    ctx.fillStyle = color;
    ctx.fill();
  };
  Art.heart = (ctx, x, y, s, color = P.coral) => {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x - s * 1.1, y - s * 0.3, x - s * 0.5, y - s * 1.0, x, y - s * 0.45);
    ctx.bezierCurveTo(x + s * 0.5, y - s * 1.0, x + s * 1.1, y - s * 0.3, x, y + s * 0.35);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = s * 0.06;
    ctx.strokeStyle = P.navy;
    ctx.stroke();
  };
  Art.confetti = (ctx, t, t0, o = {}) => {
    const { count = 90, x = 540, y = 900, seed = 1, spread = 1100, colors = [P.coral, P.mustard, P.turq, P.pink, P.white, P.teal] } = o;
    const lt = t - t0;
    if (lt < 0 || lt > 3) return;
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (R.hash(i, seed) - 0.5) * 2.6, v = spread * (0.35 + R.hash(i, seed + 1));
      const px = x + Math.cos(a) * v * lt, py = y + Math.sin(a) * v * lt + 1300 * lt * lt;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(lt * (R.hash(i, seed + 2) - 0.5) * 18);
      ctx.globalAlpha = R.clamp(3 - lt);
      ctx.fillStyle = colors[i % colors.length];
      const sz = 12 + R.hash(i, seed + 3) * 16;
      ctx.fillRect(-sz / 2, -sz / 4, sz, sz / 2);
      ctx.restore();
    }
  };

  // ---------- diner ----------
  /** Piso xadrez em perspectiva, andando na direção da câmera. */
  Art.checker = (ctx, horizon, t, o = {}) => {
    const { speed = 2, c1 = P.cream, c2 = P.navy, cx = 540, f = 900, camH = 1.3, cols = 9 } = o;
    const off = (t * speed) % 1, base = Math.floor(t * speed);
    for (let k = 40; k >= 0; k--) {
      const z0 = Math.max(0.35, k - off), z1 = k + 1 - off;
      if (z1 <= 0.35) continue;
      const y0 = horizon + (camH * f) / z0, y1 = horizon + (camH * f) / z1;
      for (let X = -cols; X < cols; X++) {
        ctx.beginPath();
        ctx.moveTo(cx + (X * f) / z0, y0);
        ctx.lineTo(cx + ((X + 1) * f) / z0, y0);
        ctx.lineTo(cx + ((X + 1) * f) / z1, y1);
        ctx.lineTo(cx + (X * f) / z1, y1);
        ctx.closePath();
        ctx.fillStyle = (X + k + base) & 1 ? c1 : c2;
        ctx.fill();
      }
    }
  };
  Art.neon = (ctx, text, x, y, size, color, on) => {
    ctx.save();
    ctx.font = R.kin.FONTS.neon(size);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(90,40,50,0.6)';
    ctx.fillText(text, x, y);
    if (on > 0) {
      ctx.globalAlpha = on;
      ctx.shadowColor = color;
      for (const b of [60, 30, 10]) {
        ctx.shadowBlur = b;
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = Art.mix('#ffffff', P.pink, 0.2);
      ctx.globalAlpha = on * 0.7;
      ctx.fillText(text, x, y);
    }
    ctx.restore();
  };
  Art.milkshake = (ctx, x, y, s, t) => {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = P.navy;
    ctx.lineWidth = s * 0.03;
    // canudo listrado
    ctx.save();
    ctx.translate(x + s * 0.15, y - s * 1.55);
    ctx.rotate(0.28);
    Art.rr(ctx, -s * 0.06, -s * 0.5, s * 0.12, s * 1.3, s * 0.05);
    ctx.fillStyle = P.white;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = P.red;
    for (let k = -6; k < 12; k++) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, -s * 0.5 + k * s * 0.12);
      ctx.lineTo(s * 0.1, -s * 0.5 + k * s * 0.12 - s * 0.06);
      ctx.lineTo(s * 0.1, -s * 0.5 + k * s * 0.12);
      ctx.lineTo(-s * 0.1, -s * 0.5 + k * s * 0.12 + s * 0.06);
      ctx.fill();
    }
    ctx.restore();
    ctx.stroke();
    ctx.restore();
    // chantilly
    ctx.fillStyle = P.white;
    for (const [dx, dy, r] of [[-0.28, -1.2, 0.22], [0, -1.3, 0.26], [0.28, -1.2, 0.22], [-0.12, -1.45, 0.18], [0.12, -1.45, 0.18], [0, -1.58, 0.14]]) {
      ell(ctx, x + dx * s, y + dy * s, r * s, r * s * 0.85);
      ctx.fill();
      ctx.stroke();
    }
    Art.cherry(ctx, x - s * 0.02, y - s * 1.7, s * 0.2);
    // copo
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y - s * 1.15);
    ctx.lineTo(x + s * 0.5, y - s * 1.15);
    ctx.lineTo(x + s * 0.3, y - s * 0.15);
    ctx.lineTo(x - s * 0.3, y - s * 0.15);
    ctx.closePath();
    ctx.fillStyle = '#f7a7b8';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(x - s * 0.36, y - s * 1.05, s * 0.07, s * 0.8);
    // pé
    ctx.beginPath();
    ctx.moveTo(x - s * 0.08, y - s * 0.15);
    ctx.lineTo(x + s * 0.08, y - s * 0.15);
    ctx.lineTo(x + s * 0.05, y - s * 0.02);
    ctx.lineTo(x + s * 0.32, y);
    ctx.lineTo(x - s * 0.32, y);
    ctx.lineTo(x - s * 0.05, y - s * 0.02);
    ctx.closePath();
    ctx.fillStyle = '#d9eef0';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  // ---------- terror ----------
  Art.eyes = (ctx, x, y, s, open, color = '255,40,30') => {
    if (open <= 0.01) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, s * 3.2);
    g.addColorStop(0, `rgba(${color},${0.45 * open})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - s * 3.2, y - s * 3.2, s * 6.4, s * 6.4);
    for (const d of [-1, 1]) {
      ell(ctx, x + d * s * 0.85, y, s * 0.5, s * 0.24 * open, d * -0.18);
      ctx.fillStyle = `rgb(${color})`;
      ctx.fill();
      ell(ctx, x + d * s * 0.85, y, s * 0.22, s * 0.12 * open);
      ctx.fillStyle = '#fff2d8';
      ctx.fill();
    }
  };
  /** Criatura de membros longos rastejando. (x, y) = chão sob o corpo. */
  Art.creature = (ctx, x, y, s, t, o = {}) => {
    const { eyes = 1, walk = 1, headUp = 0 } = o;
    const p = t * 3.4 * walk;
    ctx.save();
    ctx.fillStyle = ctx.strokeStyle = '#040508';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const bodyY = y - s * 0.55 + Math.sin(p * 2) * s * 0.02;
    const hips = [[x - s * 0.5, bodyY, 0], [x - s * 0.35, bodyY + s * 0.02, Math.PI], [x + s * 0.5, bodyY - s * 0.02, Math.PI * 0.5], [x + s * 0.62, bodyY, Math.PI * 1.5]];
    for (const [hx, hy, ph] of hips) {
      const c = Math.cos(p + ph), lift = Math.max(0, Math.sin(p + ph));
      const fx = hx - s * 0.2 + c * s * 0.32, fy = y - lift * s * 0.14;
      const kx = (hx + fx) / 2 - s * 0.05, ky = Math.min(hy, fy) - s * (0.5 + 0.08 * lift);
      ctx.lineWidth = s * 0.06;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(kx, ky);
      ctx.stroke();
      ctx.lineWidth = s * 0.04;
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      ctx.lineTo(fx, fy);
      ctx.lineTo(fx - s * 0.1, fy + 2);
      ctx.stroke();
    }
    ell(ctx, x, bodyY, s * 0.78, s * 0.15, 0.04);
    ctx.fill();
    for (let k = 0; k < 6; k++) {
      ell(ctx, x - s * 0.45 + k * s * 0.18, bodyY - s * 0.12, s * 0.05, s * 0.06);
      ctx.fill();
    }
    const hx = x - s * 0.95, hy = bodyY - s * 0.08 - headUp * s * 0.25;
    ctx.lineWidth = s * 0.1;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.7, bodyY);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ell(ctx, hx - s * 0.05, hy, s * 0.15, s * 0.2, 0.3);
    ctx.fill();
    ctx.restore();
    Art.eyes(ctx, hx - s * 0.08, hy - s * 0.02, s * 0.09, eyes, '255,60,40');
  };
  Art.tape = (ctx, cx, cy, angle, p, t, text = 'NÃO ULTRAPASSE  •  ') => {
    if (p <= 0) return;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-(1 - p) * 2200, 0);
    ctx.fillStyle = '#f2c230';
    ctx.fillRect(-1600, -55, 3200, 110);
    ctx.fillStyle = '#111';
    ctx.fillRect(-1600, -55, 3200, 8);
    ctx.fillRect(-1600, 47, 3200, 8);
    ctx.font = '900 54px "Inter", sans-serif';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width, off = (t * 90) % tw;
    for (let x = -1600 - off; x < 1600; x += tw) ctx.fillText(text, x, 3);
    ctx.restore();
  };
  /** Mapa de investigação desenhado num papel. Coordenadas do mundo 0..1400 x 0..2200. */
  Art.map = (ctx, t, marks = []) => {
    ctx.fillStyle = '#e8d9b5';
    ctx.fillRect(-200, -200, 1800, 2600);
    ctx.fillStyle = 'rgba(120,90,50,0.12)';
    for (const x of [460, 930]) ctx.fillRect(x, -200, 6, 2600);
    for (const y of [720, 1460]) ctx.fillRect(-200, y, 1800, 6);
    // floresta
    ctx.fillStyle = 'rgba(70,110,70,0.35)';
    ctx.beginPath();
    ctx.moveTo(-200, -200);
    ctx.bezierCurveTo(900, -250, 1500, 300, 1300, 900);
    ctx.bezierCurveTo(1100, 1250, 400, 1000, -200, 1200);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(40,80,50,0.7)';
    for (let i = 0; i < 90; i++) {
      const x = R.hash(i, 5) * 1300, y = R.hash(i, 6) * 1050;
      if (y > 950 - x * 0.3) continue;
      ctx.beginPath();
      ctx.moveTo(x, y - 26);
      ctx.lineTo(x + 14, y);
      ctx.lineTo(x - 14, y);
      ctx.fill();
    }
    // rio
    ctx.strokeStyle = 'rgba(70,120,160,0.7)';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(1500, 400);
    ctx.bezierCurveTo(1000, 900, 1300, 1400, 700, 2400);
    ctx.stroke();
    // ruas e quarteirões
    ctx.strokeStyle = 'rgba(60,60,70,0.55)';
    ctx.lineWidth = 10;
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      ctx.moveTo(100, 1300 + k * 150);
      ctx.lineTo(1300, 1250 + k * 150);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(150 + k * 220, 1250);
      ctx.lineTo(120 + k * 220, 2200);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(150,110,80,0.35)';
    for (let k = 0; k < 24; k++) ctx.fillRect(175 + (k % 5) * 220, 1335 + Math.floor(k / 5) * 150, 150, 90);
    ctx.font = '64px "Special Elite", monospace';
    ctx.fillStyle = 'rgba(40,40,50,0.85)';
    ctx.fillText('ECHO VALLEY', 380, 1240);
    ctx.font = '48px "Special Elite", monospace';
    ctx.fillText('FLORESTA', 330, 380);
    for (const mk of marks) {
      if (t < mk.t) continue;
      const p = R.ease.outCubic(R.clamp((t - mk.t) / 0.35));
      R.fx.scribble(ctx, mk.x, mk.y, mk.r, p, { color: 'rgba(200,25,25,0.9)', width: 9, seed: mk.seed || 1 });
      if (mk.label && p > 0.9) {
        ctx.font = '70px "Special Elite", monospace';
        ctx.fillStyle = 'rgba(200,25,25,0.9)';
        ctx.fillText(mk.label, mk.x + mk.r * 0.9, mk.y - mk.r * 0.9);
      }
    }
  };
})();
