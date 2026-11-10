/* ECHO VALLEY — "Venha morar em Echo Valley!" (comercial anos 50 que vai sendo corrompido)
 * Voz e música: arquivo original. Visual: 100% desenhado por código.
 * Tempos das palavras vêm da transcrição do áudio; as animações reagem ao volume/batidas (R.sig).
 */
(function () {
  'use strict';
  const R = window.Reel, Art = window.Art, P = Art.P, K = R.kin, E = R.ease, fx = R.fx;
  const { W, H } = R;
  const DUR = 33.2;
  const w = K.words;

  let layer, maskC, innerC, tmpC;

  const cam = (ctx, z = 1, x = 540, y = 960, rot = 0, ox = 0, oy = 0) => {
    ctx.translate(540 + ox, 960 + oy);
    ctx.rotate(rot);
    ctx.scale(z, z);
    ctx.translate(-x, -y);
  };
  const kick = (t) => R.sig.peak(t, 0.25, 0.5);
  const talk = (t) => R.clamp(R.sig.level(t) * 1.4 - 0.3);
  const blink = (t, period = 3.1) => {
    const ph = t % period;
    return ph < 0.14 ? Math.sin((ph / 0.14) * Math.PI) : 0;
  };
  const bump = (t, c, d) => Math.max(0, 1 - Math.abs(t - c) / d);

  // ---------------- cenas ----------------

  function intro(ctx, t) {
    Art.rays(ctx, 540, 760, 18, t * 0.15, P.cream, '#cfe9dc');
    ctx.save();
    cam(ctx, 1 + 0.05 * R.prog(t, 0, 3.3) + kick(t) * 0.015);
    Art.town(ctx, t, { drift: t * 45, sky: false, houseY: 1560 });
    const rise = R.spring(t - 0.05, 1.3, 5);
    Art.sun(ctx, 540, 760 + (1 - rise) * 1000, 200, t, { talk: talk(t), blink: blink(t + 1) });
    ctx.restore();
  }

  function glitch1(ctx, t) {
    Art.rays(ctx, 540, 760, 18, t * 0.7, '#140303', '#360808');
    const lt = t - 3.3;
    const z = t < 4.4 ? 2.0 + lt * 0.3 : 3.3 + (t - 4.4) * 0.35;
    const [sx, sy] = fx.shake(t, 14 + 30 * kick(t), 22, 3);
    ctx.save();
    cam(ctx, z, 540, t < 4.4 ? 760 : 800, Math.sin(t * 9) * 0.03, sx, sy);
    Art.town(ctx, t, { drift: 150, night: 1, sky: false, houseY: 1560 });
    Art.sun(ctx, 540, 760, 200, t, { mood: 1, talk: talk(t) * 1.3, look: [R.noise1(t * 4, 1), R.noise1(t * 4, 2)] });
    ctx.restore();
    fx.static(ctx, t, 0.08 + 0.3 * kick(t));
    // desligamento de TV de tubo
    const k = R.prog(t, 5.08, 5.28);
    if (k > 0) {
      const g = tmpC.getContext('2d');
      R.resetCtx(g);
      g.drawImage(ctx.canvas, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      const sy2 = Math.max(0.004, 1 - E.outExpo(R.clamp(k * 1.6))), sx2 = k > 0.62 ? 1 - E.inCubic((k - 0.62) / 0.38) : 1;
      ctx.drawImage(tmpC, 540 - 540 * sx2, 960 - 960 * sy2, W * sx2, H * sy2);
      fx.tint(ctx, '#fff', R.clamp(k * 2) * 0.6, 'lighter');
    }
  }

  const bez = (p0, p1, p2, p3, u) => {
    const v = 1 - u;
    return [0, 1].map((i) => v * v * v * p0[i] + 3 * v * v * u * p1[i] + 3 * v * u * u * p2[i] + u * u * u * p3[i]);
  };
  function trails(ctx, t) {
    const p = E.inOutSine(R.prog(t, 5.28, 7.35));
    const crane = (1 - p) * 300;
    Art.grad(ctx, P.sky1, P.sky2, 0, H);
    Art.sun(ctx, 860, 330 + crane * 0.1, 85, t, { talk: talk(t), blink: blink(t) });
    for (let i = 0; i < 3; i++) Art.cloud(ctx, ((i * 470 + t * 40) % (W + 500)) - 250, 520 + i * 90 + crane * 0.15, 120 + i * 25);
    Art.mountains(ctx, 1180 + crane * 0.3, { seed: 7, count: 3, height: 720, color: P.mtn2 });
    Art.mountains(ctx, 1320 + crane * 0.45, { seed: 9, count: 4, height: 520, color: P.mtn });
    Art.forest(ctx, 1430 + crane * 0.6, { seed: 5, count: 11, h: 260, fill: P.pine2 });
    ctx.fillStyle = P.grass;
    ctx.fillRect(0, 1420 + crane * 0.75, W, H);
    // trilha pontilhada que se desenha morro acima
    const q = E.inOutCubic(R.prog(t, 5.6, 6.95));
    const pts = [[540, 2000 + crane], [300, 1700 + crane * 0.9], [820, 1520 + crane * 0.8], [640, 1250 + crane * 0.45]];
    ctx.save();
    ctx.lineCap = 'round';
    ctx.setLineDash([26, 24]);
    for (const [lw, col] of [[22, P.navy], [12, P.cream]]) {
      ctx.lineWidth = lw;
      ctx.strokeStyle = col;
      ctx.beginPath();
      for (let k = 0; k <= 60 * q; k++) {
        const [x, y] = bez(...pts, k / 60);
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    if (q > 0.98) Art.starburst(ctx, 640, 1250 + crane * 0.45, 34, 20, 8, t, P.coral, P.navy, 4);
    // placa
    const sp = R.spring(t - 6.66, 1.8, 5);
    if (t > 6.66) {
      ctx.save();
      ctx.translate(250, 1720 + crane);
      ctx.scale(sp, sp);
      ctx.rotate(-0.08);
      ctx.fillStyle = P.brown;
      ctx.fillRect(-12, -260, 24, 260);
      Art.rr(ctx, -150, -330, 300, 110, 14);
      ctx.fillStyle = '#c98a4e';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = P.navy;
      ctx.stroke();
      ctx.font = K.FONTS.retro(56);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = P.cream;
      ctx.fillText('TRILHA →', 0, -273);
      ctx.restore();
    }
    Art.forest(ctx, 2000 + crane, { seed: 8, count: 5, h: 560, fill: P.pine });
  }

  const BALLOONS = [[160, P.coral, 8.72], [880, P.turq, 8.84], [380, P.mustard, 8.98], [700, P.pink, 9.08], [960, P.coral, 9.4], [90, P.mint, 9.55], [560, P.teal, 9.68]];
  const SCOOPS = [{ color: '#f6a5b5', t: 7.82 }, { color: '#a8e0c8', t: 8.23 }, { color: '#fff1d6', t: 8.83 }];
  function iceCream(ctx, t) {
    Art.rays(ctx, 540, 980, 20, t * 0.4 + R.sig.bass(t) * 0.08, '#f9d3cc', '#fff1dc');
    ctx.save();
    cam(ctx, 1 + kick(t) * 0.03, 540, 960, Math.sin(t * 1.3) * 0.015);
    if (t > 10.3) Art.heart(ctx, 540, 860, 420 * R.spring(t - 10.3, 1.6, 5), P.coral);
    for (const [x, c, t0] of BALLOONS) if (t > t0) Art.balloon(ctx, x, 2050 - (t - t0) * 600, 85, c, t, x);
    const cp = R.spring(t - 7.36, 1.3, 5);
    if (t > 7.36) {
      const cy = 1560 - (1 - cp) * 1700, s = 400;
      Art.cone(ctx, 540, cy, s, SCOOPS, t);
      if (t > 9.03) Art.cherry(ctx, 545, cy - s * 1.1 - 2 * s * 0.4 - s * 0.55 - (1 - R.spring(t - 9.03, 1.6, 5)) * 700, s * 0.17);
      SCOOPS.forEach((sc, k) => Art.confetti(ctx, t, sc.t + 0.1, { x: 540, y: cy - s * 1.1 - k * s * 0.4, count: 36, spread: 700, seed: k + 3 }));
    }
    Art.confetti(ctx, t, 10.3, { x: 540, y: 900, count: 120, seed: 9 });
    ctx.restore();
  }

  function police(ctx, t) {
    Art.grad(ctx, '#03050a', '#0b1220');
    Art.forest(ctx, 950, { seed: 21, count: 9, h: 760, fill: '#0c1712', offset: t * 8 });
    Art.forest(ctx, 1320, { seed: 22, count: 7, h: 1050, fill: '#060b09', offset: -t * 14 });
    ctx.fillStyle = '#070b09';
    ctx.fillRect(0, 1300, W, H);
    // lanterna varrendo
    const a = -1.15 + Math.sin(t * 1.9) * 0.38, ox = 180, oy = 2050;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(ox, oy, 50, ox, oy, 2100);
    g.addColorStop(0, 'rgba(255,240,200,0.55)');
    g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + Math.cos(a - 0.2) * 2400, oy + Math.sin(a - 0.2) * 2400);
    ctx.lineTo(ox + Math.cos(a + 0.2) * 2400, oy + Math.sin(a + 0.2) * 2400);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // marcadores de evidência
    [[380, 1520, 11.96, '1'], [720, 1610, 12.36, '2']].forEach(([x, y, t0, n]) => {
      if (t < t0) return;
      const s = R.spring(t - t0, 2, 6);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      ctx.beginPath();
      ctx.moveTo(-50, 0);
      ctx.lineTo(0, -90);
      ctx.lineTo(50, 0);
      ctx.closePath();
      ctx.fillStyle = '#f2c230';
      ctx.fill();
      ctx.font = '900 54px Inter';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#111';
      ctx.fillText(n, 0, -16);
      ctx.restore();
    });
    Art.tape(ctx, 540, 1060, -0.33, E.outExpo(R.prog(t, 11.96, 12.2)), t);
    Art.tape(ctx, 540, 1230, 0.27, E.outExpo(R.prog(t, 12.36, 12.6)), -t);
    fx.fog(ctx, t, { alpha: 0.18, speed: 30, scale: 6, offset: 200 });
    const siren = Math.floor(t * 7) % 2;
    fx.tint(ctx, siren ? '#ff1020' : '#1040ff', 0.16 + 0.1 * Math.sin(t * 44), 'screen');
  }

  // palavra de cartão-postal com a cidade aparecendo DENTRO das letras
  function postcardWord(ctx, t, text, x, y, size, t0, stagger = 0.05) {
    if (t < t0) return;
    const g = ctx;
    g.save();
    g.font = K.FONTS.retro(size);
    const chars = [...text], ws = chars.map((c) => g.measureText(c).width), total = ws.reduce((a, b) => a + b, 0);
    g.restore();
    const L = [];
    let xx = x - total / 2;
    chars.forEach((c, k) => {
      const lt = t - t0 - k * stagger;
      if (lt > 0) {
        const sp = R.spring(lt, 1.8, 5.5);
        L.push({ c, x: xx + ws[k] / 2, y: y - (1 - sp) * 600 + Math.sin(t * 2.5 + k) * 6, rot: (1 - sp) * (k % 2 ? 0.7 : -0.7) - 0.06, s: Math.max(0.01, sp), w: ws[k] });
      }
      xx += ws[k];
    });
    const each = (c2, fn) => L.forEach((l) => {
      c2.save();
      c2.translate(l.x, l.y);
      c2.rotate(l.rot);
      c2.scale(l.s, l.s);
      c2.font = K.FONTS.retro(size);
      c2.textBaseline = 'middle';
      fn(c2, l);
      c2.restore();
    });
    each(ctx, (c2, l) => {
      c2.lineJoin = 'round';
      c2.fillStyle = P.red;
      for (let i = 18; i > 0; i--) c2.fillText(l.c, -l.w / 2 + i * 1.3, i * 1.8);
      c2.lineWidth = size * 0.07;
      c2.strokeStyle = P.navy;
      c2.strokeText(l.c, -l.w / 2 + 18 * 1.3, 18 * 1.8);
    });
    const m = maskC.getContext('2d');
    R.resetCtx(m);
    m.clearRect(0, 0, W, H);
    each(m, (c2, l) => {
      c2.fillStyle = '#fff';
      c2.fillText(l.c, -l.w / 2, 0);
    });
    const ig = innerC.getContext('2d');
    R.resetCtx(ig);
    ig.save();
    ig.translate(0, y - 1060);
    Art.town(ig, t, { drift: t * 60, houseY: 1230 });
    ig.restore();
    ig.globalCompositeOperation = 'destination-in';
    ig.drawImage(maskC, 0, 0);
    ctx.drawImage(innerC, 0, 0);
    each(ctx, (c2, l) => {
      c2.lineJoin = 'round';
      c2.lineWidth = size * 0.07;
      c2.strokeStyle = P.navy;
      c2.strokeText(l.c, -l.w / 2, 0);
      c2.lineWidth = size * 0.02;
      c2.strokeStyle = P.cream;
      c2.strokeText(l.c, -l.w / 2 + size * 0.02, -size * 0.02);
    });
  }
  function postcard(ctx, t) {
    Art.rays(ctx, 540, 940, 22, t * 0.2, P.cream, '#f3d9a8');
    ctx.save();
    cam(ctx, 1 + 0.06 * R.prog(t, 13.15, 16.15) + kick(t) * 0.01);
    postcardWord(ctx, t, 'ECHO', 540, 800, 300, 13.48);
    postcardWord(ctx, t, 'VALLEY', 540, 1080, 225, 13.7, 0.04);
    ctx.restore();
    const sp = R.spring(t - 14.0, 1.6, 5);
    if (t > 14.0) Art.sun(ctx, 900, 270 + (1 - sp) * -400, 95, t, { talk: talk(t), wink: t > 14.54 && t < 15.0 ? 1 : 0 });
  }

  function street(ctx, t) {
    const hz = 820, f = 700, camH = 1.5, speed = 7;
    Art.grad(ctx, P.sky1, P.sky2, 0, hz);
    for (let i = 0; i < 3; i++) Art.cloud(ctx, ((i * 420 + t * 25) % (W + 500)) - 250, 300 + i * 120, 110);
    Art.sun(ctx, 860, 250, 75, t, { talk: talk(t), blink: blink(t) });
    Art.mountains(ctx, hz, { seed: 12, count: 5, height: 240, color: P.mtn });
    ctx.fillStyle = P.grass;
    ctx.fillRect(0, hz, W, H - hz);
    const trap = (wTop, wBot, col) => {
      ctx.beginPath();
      ctx.moveTo(540 - wTop, hz);
      ctx.lineTo(540 + wTop, hz);
      ctx.lineTo(540 + wBot, H);
      ctx.lineTo(540 - wBot, H);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
    };
    trap(60, 1300, '#e3dccb');
    trap(34, 860, '#5d6470');
    ctx.fillStyle = P.cream;
    for (let k = 0; k < 30; k++) {
      const z = ((k * 1.6 - t * speed) % 48 + 48) % 48 + 0.9, z2 = z + 0.7;
      const y1 = hz + (camH * f) / z, y2 = hz + (camH * f) / z2;
      ctx.beginPath();
      ctx.moveTo(540 - (0.08 * f) / z, y1);
      ctx.lineTo(540 + (0.08 * f) / z, y1);
      ctx.lineTo(540 + (0.08 * f) / z2, y2);
      ctx.lineTo(540 - (0.08 * f) / z2, y2);
      ctx.fill();
    }
    const items = [];
    for (let i = 0; i < 24; i++) {
      const z = ((i * 2.2 - t * speed) % 52.8 + 52.8) % 52.8 + 2.2;
      items.push({ z, side: i % 2 ? 1 : -1, i });
    }
    items.sort((a, b) => b.z - a.z);
    for (const it of items) {
      const s = f / it.z, x = 540 + it.side * 3.4 * s, y = hz + (camH * f) / it.z;
      if (Math.floor(it.i / 2) % 2) Art.roundTree(ctx, 540 + it.side * 2.3 * s, y, 1.4 * s);
      Art.house(ctx, x, y, 2.6 * s, 1.7 * s, { body: P.houses[it.i % 6], roof: P.roofs[it.i % 5], chimney: it.i % 3 === 0 });
    }
  }

  function waver(ctx, x, y, s, t, ph, wave = true, eyes = 0) {
    ctx.fillStyle = P.navy;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.95, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
    Art.rr(ctx, x - s * 0.38, y - s * 0.7, s * 0.76, s * 0.75, s * 0.3);
    ctx.fill();
    if (wave) {
      ctx.save();
      ctx.translate(x + s * 0.3, y - s * 0.55);
      ctx.rotate(-0.5 + Math.sin(t * 9 + ph) * 0.45);
      Art.rr(ctx, -s * 0.07, -s * 0.62, s * 0.14, s * 0.64, s * 0.07);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -s * 0.66, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (eyes) Art.eyes(ctx, x, y - s * 0.97, s * 0.07, eyes);
  }
  function neighbors(ctx, t) {
    Art.grad(ctx, P.sky1, P.sky2, 0, H);
    ctx.save();
    cam(ctx, 1.02 + 0.05 * R.prog(t, 17.36, 18.4) + kick(t) * 0.015);
    ctx.fillStyle = P.grass;
    ctx.fillRect(-100, 1560, W + 200, 600);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 8;
    ctx.strokeStyle = P.navy;
    ctx.fillStyle = P.houses[1];
    ctx.fillRect(90, 560, 900, 1010);
    ctx.strokeRect(90, 560, 900, 1010);
    ctx.beginPath();
    ctx.moveTo(30, 570);
    ctx.lineTo(540, 170);
    ctx.lineTo(1050, 570);
    ctx.closePath();
    ctx.fillStyle = P.red;
    ctx.fill();
    ctx.stroke();
    const wins = [[200, 700], [630, 700], [200, 1060], [630, 1060]];
    wins.forEach(([x, y], k) => {
      ctx.fillStyle = '#ffe39a';
      ctx.fillRect(x, y, 250, 270);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, 250, 270);
      ctx.clip();
      waver(ctx, x + 125, y + 290, 190, t, k * 1.7);
      ctx.restore();
      ctx.fillStyle = P.coral;
      ctx.fillRect(x - 6, y - 6, 60, 282);
      ctx.fillRect(x + 196, y - 6, 60, 282);
      ctx.strokeRect(x, y, 250, 270);
      ctx.fillStyle = P.white;
      ctx.fillRect(x - 20, y + 270, 290, 22);
    });
    // janela do sótão: o único que não acena
    ctx.save();
    ctx.beginPath();
    ctx.arc(540, 420, 82, 0, Math.PI * 2);
    ctx.fillStyle = '#2a2f3a';
    ctx.fill();
    ctx.clip();
    waver(ctx, 540, 520, 150, t, 0, false, 0.9);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(540, 420, 82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = P.teal;
    ctx.fillRect(470, 1390, 140, 180);
    ctx.strokeRect(470, 1390, 140, 180);
    Art.fence(ctx, -40, W + 40, 1820, 230);
    ctx.restore();
  }

  function diner(ctx, t) {
    const hz = 900;
    ctx.fillStyle = P.cream;
    ctx.fillRect(0, 0, W, hz);
    ctx.fillStyle = P.red;
    ctx.fillRect(0, hz - 300, W, 220);
    ctx.fillStyle = '#c9d3d8';
    ctx.fillRect(0, hz - 90, W, 26);
    ctx.fillRect(0, hz - 320, W, 20);
    Art.checker(ctx, hz - 60, t, { speed: 2.4, camH: 1.25 });
    const g = ctx.createLinearGradient(0, hz - 60, 0, hz + 200);
    g.addColorStop(0, 'rgba(246,234,208,0.9)');
    g.addColorStop(1, 'rgba(246,234,208,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, hz - 60, W, 260);
    const flick = (t0) => (t < t0 ? 0 : t < t0 + 0.35 ? (R.hash(R.frameOf(t), 3) > 0.45 ? 1 : 0.1) : 1);
    const off = t > 21.1 ? (R.hash(R.frameOf(t), 7) > R.prog(t, 21.1, 21.45) ? 1 : 0) : 1;
    Art.neon(ctx, 'DINER', 540, 380, 190, '#ff4f7a', flick(18.96) * off);
    Art.neon(ctx, 'ABERTO', 540, 560, 64, '#5df2e6', flick(19.2) * off);
    ctx.save();
    const s = 430 * (1 + R.sig.bass(t) * 0.05);
    cam(ctx, 1 + kick(t) * 0.02);
    Art.milkshake(ctx, 540, 1660, s, t);
    if (t > 20.26) {
      const sp = R.spring(t - 20.26, 1.8, 5);
      ctx.save();
      ctx.translate(830, 1160);
      ctx.scale(sp, sp);
      ctx.rotate(t * 0.5);
      Art.starburst(ctx, 0, 0, 175, 135, 16, 0, P.mustard, P.navy, 8);
      ctx.rotate(-t * 0.5 + 0.2);
      ctx.font = K.FONTS.retro(110);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      K.extrude(ctx, 'Nº1', -ctx.measureText('Nº1').width / 2, 0, { size: 110, depth: 6 });
      ctx.restore();
    }
    ctx.restore();
    Art.confetti(ctx, t, 20.66, { x: 540, y: 1100, count: 130, seed: 4 });
  }

  function edge(ctx, t) {
    const p = E.inOutSine(R.prog(t, 21.45, 23.2));
    ctx.save();
    cam(ctx, 1 + p * 0.16, 600, 1050);
    Art.grad(ctx, '#2a3747', '#58666b', 0, 1300);
    Art.forest(ctx, 1260, { seed: 31, count: 8, h: 950, fill: '#0d1613' });
    Art.forest(ctx, 1360, { seed: 32, count: 10, h: 720, fill: '#08100d' });
    ctx.fillStyle = '#1b271f';
    ctx.fillRect(-200, 1330, W + 400, 900);
    const wins = Art.house(ctx, 170, 1560, 400, 270, { body: '#3b4250', roof: '#1a1e28', door: '#1a2228', lit: true, trim: '#555' });
    for (const [x, y, s] of wins) fx.glow(ctx, x, y, s * 2.4, '255,200,110', 0.45);
    Art.fence(ctx, 380, 640, 1700, 150, '#6d7076', '#1a1e28');
    ctx.save();
    ctx.translate(800, 1650);
    ctx.rotate(0.12);
    ctx.fillStyle = '#3a2a1e';
    ctx.fillRect(-10, -220, 20, 230);
    ctx.fillRect(-150, -300, 300, 100);
    ctx.font = '50px "Special Elite"';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c9c0a8';
    ctx.fillText('FLORESTA', 0, -235);
    ctx.restore();
    ctx.restore();
    fx.fog(ctx, t, { alpha: 0.35, speed: 22, scale: 7, offset: 600 });
  }

  function creature(ctx, t) {
    Art.grad(ctx, '#04060c', '#0d1424');
    fx.glow(ctx, 770, 430, 380, '200,210,230', 0.35);
    ctx.fillStyle = '#e6e4d6';
    ctx.beginPath();
    ctx.arc(770, 430, 95, 0, Math.PI * 2);
    ctx.fill();
    Art.forest(ctx, 1150, { seed: 51, count: 9, h: 800, fill: '#0b131b', offset: t * 10 });
    fx.fog(ctx, t, { alpha: 0.25, speed: 18, scale: 6, offset: 50 });
    Art.forest(ctx, 1380, { seed: 52, count: 8, h: 900, fill: '#070b10', offset: t * 22 });
    ctx.fillStyle = '#05080a';
    ctx.fillRect(0, 1360, W, H);
    const mist = ctx.createLinearGradient(0, 1150, 0, 1560);
    mist.addColorStop(0, 'rgba(120,140,175,0)');
    mist.addColorStop(0.7, 'rgba(120,140,175,0.42)');
    mist.addColorStop(1, 'rgba(120,140,175,0.08)');
    ctx.fillStyle = mist;
    ctx.fillRect(0, 1150, W, 410);
    const walkUntil = 24.22, tt = Math.min(t, walkUntil);
    const x = 1300 - (tt - 23.2) * 560;
    const up = E.outCubic(R.prog(t, walkUntil, walkUntil + 0.2));
    Art.creature(ctx, x, 1540, 430, tt, { eyes: 0.6 + up * 0.6, headUp: up });
    Art.pine(ctx, -60, 2050, 1800, '#020304', '#020304');
    Art.pine(ctx, 1150, 2050, 1700, '#020304', '#020304');
  }

  const MARKS = [
    { x: 420, y: 520, r: 120, t: 24.74, seed: 1 },
    { x: 880, y: 300, r: 95, t: 24.88, seed: 2 },
    { x: 280, y: 860, r: 105, t: 25.24, seed: 3, label: '?' },
    { x: 980, y: 720, r: 130, t: 25.48, seed: 4, label: 'X' },
  ];
  function mapScene(ctx, t) {
    const p = E.inOutSine(R.prog(t, 24.45, 26.45));
    ctx.save();
    cam(ctx, R.lerp(0.95, 1.2, p), R.lerp(700, 650, p), R.lerp(820, 680, p), R.lerp(-0.1, -0.03, p));
    Art.map(ctx, t, MARKS);
    ctx.restore();
    const lx = 540 + Math.sin(t * 1.4) * 220, ly = 860 + Math.cos(t * 1.1) * 200;
    const g = ctx.createRadialGradient(lx, ly, 120, lx, ly, 760);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.9)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  const EYES = [[300, 1040, 18, 26.62], [720, 980, 15, 27.06], [520, 1170, 22, 27.44], [850, 1150, 19, 27.82], [240, 1260, 25, 28.12], [640, 1300, 27, 28.32], [430, 950, 13, 28.54]];
  function windowPOV(ctx, t) {
    const p = E.inOutSine(R.prog(t, 26.45, 29.2));
    ctx.save();
    cam(ctx, 1 + p * 0.2, 540, 920);
    Art.grad(ctx, '#03050b', '#0e1626');
    fx.glow(ctx, 790, 560, 260, '200,210,230', 0.3);
    ctx.fillStyle = '#dedbcc';
    ctx.beginPath();
    ctx.arc(790, 560, 62, 0, Math.PI * 2);
    ctx.fill();
    Art.forest(ctx, 1150, { seed: 41, count: 9, h: 620, fill: '#0b131c' });
    Art.forest(ctx, 1350, { seed: 42, count: 8, h: 820, fill: '#060a0f' });
    ctx.fillStyle = '#04070a';
    ctx.fillRect(0, 1330, W, 700);
    const flare = R.clamp(1 + 0.6 * E.outCubic(R.prog(t, 28.68, 28.9)));
    for (const [x, y, s, t0] of EYES) {
      const o = E.outCubic(R.prog(t, t0, t0 + 0.18)) * (1 - blink(t + x * 0.01, 2.3) * 0.9);
      Art.eyes(ctx, x, y, s * (t > 28.68 ? flare * 1.25 : 1), o);
    }
    fx.fog(ctx, t, { alpha: 0.2, speed: 14, scale: 6, offset: 900, y0: 900 });
    // parede com a janela recortada
    ctx.beginPath();
    ctx.rect(-300, -300, W + 600, H + 600);
    ctx.rect(190, 420, 700, 1000);
    ctx.fillStyle = '#141822';
    ctx.fill('evenodd');
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (let yy = -280; yy < H + 300; yy += 90) for (let xx = -280 + ((yy / 90) % 2) * 45; xx < W + 300; xx += 90) {
      if (xx > 170 && xx < 910 && yy > 400 && yy < 1440) continue;
      ctx.beginPath();
      ctx.moveTo(xx, yy - 16);
      ctx.lineTo(xx + 12, yy);
      ctx.lineTo(xx, yy + 16);
      ctx.lineTo(xx - 12, yy);
      ctx.fill();
    }
    ctx.strokeStyle = '#3b2a1f';
    ctx.lineWidth = 36;
    ctx.strokeRect(190, 420, 700, 1000);
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(540, 420);
    ctx.lineTo(540, 1420);
    ctx.moveTo(190, 900);
    ctx.lineTo(890, 900);
    ctx.stroke();
    ctx.fillStyle = '#4a3426';
    ctx.fillRect(140, 1420, 800, 50);
    for (const side of [-1, 1]) {
      const sway = Math.sin(t * 0.9 + side) * 25;
      const x0 = side < 0 ? 40 : 1040, x1 = side < 0 ? 300 : 780;
      ctx.beginPath();
      ctx.moveTo(x0, 360);
      ctx.lineTo(x1, 360);
      ctx.bezierCurveTo(x1 + side * -40 + sway, 800, x1 + side * 30 + sway, 1200, x1 + side * -60 + sway * 1.5, 1560);
      ctx.lineTo(x0, 1560);
      ctx.closePath();
      const cg = ctx.createLinearGradient(x0, 0, x1, 0);
      cg.addColorStop(0, '#2a0c12');
      cg.addColorStop(0.5, '#5a1a26');
      cg.addColorStop(1, '#30101a');
      ctx.fillStyle = cg;
      ctx.fill();
    }
    ctx.restore();
  }

  function finale(ctx, t) {
    const horror = t >= 32.95;
    Art.rays(ctx, 540, 800, 20, t * (horror ? 0.9 : 0.35), horror ? '#140303' : P.cream, horror ? '#360808' : '#ffd9a0');
    ctx.save();
    const [sx, sy] = horror ? fx.shake(t, 30, 30, 5) : [0, 0];
    cam(ctx, 1 + 0.06 * R.prog(t, 29.2, 33) + kick(t) * 0.02 + (horror ? 0.5 : 0), 540, horror ? 800 : 960, 0, sx, sy);
    const wins = Art.town(ctx, t, { drift: t * 45, sky: false, houseY: 1600, night: horror ? 1 : 0 });
    if (horror) for (const [x, y, s] of wins) fx.glow(ctx, x, y, s * 2, '255,40,30', 0.5);
    for (const [x, c, t0] of BALLOONS) if (t > t0 + 22.1) Art.balloon(ctx, x, 2050 - (t - t0 - 22.1) * 560, 80, c, t, x);
    const rise = R.spring(t - 29.25, 1.3, 5);
    Art.sun(ctx, 540, 800 + (1 - rise) * 1000, 220, t, { talk: talk(t), mood: horror ? 1 : 0, wink: t > 32.55 && t < 32.85 ? 1 : 0, blink: blink(t) });
    ctx.restore();
    if (!horror) Art.confetti(ctx, t, 32.5, { x: 540, y: 1250, count: 150, seed: 12 });
  }

  // ---------------- linha do tempo ----------------
  const SCENES = [
    [0, intro], [3.3, glitch1], [5.28, trails], [7.35, iceCream], [10.95, police], [13.15, postcard],
    [16.15, street], [17.36, neighbors], [18.4, diner], [21.45, edge], [23.2, creature], [24.45, mapScene],
    [26.45, windowPOV], [29.2, finale],
  ];
  const WHIPS = [16.15, 17.36, 18.4];
  const BURNS = [5.28, 13.15, 29.2];
  const GLITCH_CUTS = [3.3, 10.95, 21.45, 23.2, 24.45, 26.45, 32.95];
  const IRIS = [7.05, 7.35];

  const sceneAt = (t) => {
    let k = 0;
    for (let i = 0; i < SCENES.length; i++) if (t >= SCENES[i][0]) k = i;
    return k;
  };

  function drawScenes(ctx, t) {
    const k = sceneAt(t);
    let ox = 0;
    for (const c of WHIPS) {
      if (t >= c - 0.12 && t < c) ox = -W * 0.55 * E.inCubic(R.prog(t, c - 0.12, c));
      if (t >= c && t < c + 0.14) ox = W * 0.55 * (1 - E.outCubic(R.prog(t, c, c + 0.14)));
    }
    ctx.save();
    ctx.translate(ox, 0);
    SCENES[k][1](ctx, t);
    ctx.restore();
    // íris em forma de estrela: trilhas -> sorveteria
    if (t >= IRIS[0] && t < IRIS[1]) {
      const g = layer.getContext('2d');
      R.resetCtx(g);
      iceCream(g, t);
      const r = E.inCubic(R.prog(t, IRIS[0], IRIS[1])) * 2300;
      ctx.save();
      Art.starburst(ctx, 540, 1000, r + 60, r * 0.75 + 40, 12, t * 2, P.mustard, P.navy, 10);
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = t * 2 + (i * Math.PI) / 12, rr = i % 2 ? r * 0.75 : r;
        i ? ctx.lineTo(540 + Math.cos(a) * rr, 1000 + Math.sin(a) * rr) : ctx.moveTo(540 + Math.cos(a) * rr, 1000 + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(layer, 0, 0);
      ctx.restore();
    }
  }

  // legendas que passam pela pós-produção (sofrem glitch/grão)
  const DIRTY = [
    { style: 'whisper', y: 520, size: 80, t1: 23.1, words: w('apenas não vá nas *florestas.*', [21.56, 21.88, 22.02, 22.22, 22.38]) },
    { style: 'whisper', y: 520, size: 84, t1: 24.42, words: w('existem *coisas* por lá…', [23.24, 23.5, 23.94, 24.24]) },
    { style: 'whisper', y: 1450, size: 76, t1: 26.4, words: w('que não querem ser *encontradas…*', [24.48, 24.74, 24.88, 25.24, 25.48]) },
    { style: 'whisper', y: 250, size: 76, t1: 27.4, words: w('e vai por mim…', [26.48, 26.62, 26.84, 27.06]) },
    { style: 'whisper', y: 250, size: 66, maxW: 920, t1: 29.15, words: w('você também não quer que elas o *encontrem.*', [27.44, 27.56, 27.82, 27.98, 28.12, 28.32, 28.54, 28.68]) },
  ];
  // legendas nítidas por cima de tudo
  const CLEAN = [
    { style: 'horror', y: 1440, size: 74, t1: 13.05, words: w('ENCONTRARAM OUTRO *CORPO* NA FLORESTA DE NOVO?', [11.34, 11.78, 11.96, 12.16, 12.36, 12.64, 12.8]) },
    { style: 'horror', y: 600, size: 130, t1: 13.05, words: w('O QUÊ?', [10.98, 11.06]) },
    { style: 'horror', y: 1330, size: 124, t1: 5.1, words: w('ELE TÁ *MENTINDO!*', [4.4, 4.48, 4.66]) },
    { style: 'horror', y: 1330, size: 112, t1: 4.36, words: w('NÃO ACREDITEM NELE!', [3.34, 3.44, 3.94]) },
    { style: 'retro', y: 300, size: 72, t1: 3.25, words: w('Venha morar em', [0, 0.24, 0.52]) },
    { style: 'script', y: 1205, size: 104, t1: 3.25, rot: -0.05, words: w('a nossa amada e querida cidade', [1.38, 1.46, 1.66, 2.18, 2.36, 2.74]) },
    { style: 'retro', y: 330, size: 80, t1: 7.05, words: w('Nossa cidade conta com *belas trilhas!*', [5.28, 5.4, 5.74, 6.08, 6.32, 6.66]) },
    { style: 'retro', y: 320, size: 86, t1: 8.66, words: w('E uma excelente *sorveteria!*', [7.14, 7.28, 7.36, 7.82]) },
    { style: 'script', y: 330, size: 104, t1: 10.9, rot: -0.05, words: w('que as suas crianças vão *amar!*', [8.72, 8.84, 8.98, 9.08, 9.68, 10.3]) },
    { style: 'script', y: 500, size: 120, t1: 16.1, rot: -0.06, words: w('Aqui em', [13.18, 13.4]) },
    { style: 'retro', y: 1420, size: 66, maxW: 900, t1: 16.1, words: w('você não tem *nada* com que precise se preocupar.', [14.08, 14.3, 14.48, 14.54, 14.86, 15.06, 15.14, 15.42, 15.6]) },
    { style: 'retro', y: 1300, size: 84, t1: 17.3, words: w('As nossas ruas são *tranquilas!*', [16.2, 16.26, 16.42, 16.7, 16.82]) },
    { style: 'retro', y: 1700, size: 82, t1: 18.36, words: w('Os moradores *amigáveis!*', [17.36, 17.42, 17.7]) },
    { style: 'retro', y: 690, size: 70, t1: 19.5, words: w('E os nossos restaurantes', [18.4, 18.64, 18.8, 18.96]) },
    { style: 'retro', y: 690, size: 76, t1: 21.1, words: w('são simplesmente os *melhores!*', [19.54, 19.72, 20.26, 20.66]) },
    { style: 'retro', y: 300, size: 72, t1: 32.92, words: w('Venha morar em', [29.22, 29.74, 29.98]) },
    { style: 'script', y: 1205, size: 92, t1: 32.42, rot: -0.05, words: w('ficaremos muito felizes em receber', [30.84, 31.16, 31.52, 31.9, 32.1]) },
  ];
  const TITLES = [
    { text: 'ECHO VALLEY!', t0: 0.62, t1: 3.25, y: 445, size: 138 },
    { text: 'ECHO VALLEY!', t0: 30.12, t1: 32.92, y: 445, size: 138 },
    { text: 'VOCÊ!', t0: 32.5, t1: 32.92, y: 1400, size: 210, stagger: 0.03, fill: '#ffd23f' },
  ];

  // ---------------- pós-produção por trecho ----------------
  const HAPPY = { uPrint: 0.55, uHalftone: 0.3, uFilm: 0.55, uLeak: 0.45, uGrain: 0.06, uVignette: 0.5, uSat: 1.08, uContrast: 1.06, uAberr: 1.6, uBloom: 0.15 };
  const DARK = { uPrint: 0.12, uFilm: 0.85, uGrain: 0.14, uVignette: 1.1, uSat: 0.28, uContrast: 1.2, uAberr: 3, uScan: 0.12, uTint: [0.82, 0.92, 1.15], uTintAmt: 0.5, uBloom: 0.35 };
  function post(t) {
    let p;
    if (t < 3.3) p = { ...HAPPY };
    else if (t < 5.28) {
      const k = kick(t);
      p = { uGlitch: 0.22 + k * 0.6, uCurve: 0.14, uScan: 0.55, uSat: 0.35, uTint: [1.35, 0.55, 0.5], uTintAmt: 0.7, uContrast: 1.45, uSmear: 0.25, uPixelate: k > 0.92 ? 8 : 0, uAberr: 7, uGrain: 0.15, uVignette: 1, uFilm: 0.4 };
      if (t < 3.37) p.uInvert = 1;
    } else if (t < 10.95) p = { ...HAPPY, uBloom: 0.25 };
    else if (t < 13.15) p = { ...DARK, uSat: 0.45, uGlitch: 0.05 + kick(t) * 0.3, uCurve: 0.04 };
    else if (t < 18.4) p = { ...HAPPY };
    else if (t < 21.45) p = { ...HAPPY, uBloom: 0.7, uSat: R.lerp(1.08, 0.1, R.prog(t, 21.1, 21.45)) };
    else if (t < 29.2) p = { ...DARK, uGlitch: kick(t) * 0.25, uSmear: t > 23.2 && t < 24.45 ? 0.25 : 0 };
    else if (t < 32.95) p = { ...HAPPY, uLeak: 0.65 };
    else p = { uGlitch: 0.7, uCurve: 0.14, uScan: 0.6, uSat: 0.4, uTint: [1.4, 0.5, 0.5], uTintAmt: 0.8, uContrast: 1.5, uAberr: 10, uInvert: R.frameOf(t) % 3 === 0 ? 1 : 0, uGrain: 0.15 };
    for (const c of GLITCH_CUTS) p.uGlitch = (p.uGlitch || 0) + bump(t, c, 0.12) * 0.7;
    for (const c of WHIPS) p.uBlur = [220 * Math.max(bump(t, c - 0.04, 0.12), 0), 0];
    for (const c of BURNS) {
      const d = t - c;
      if (d >= 0 && d < 0.6) {
        p.uBright = (p.uBright || 0) + 0.55 * Math.exp(-d * 7);
        p.uLeak = (p.uLeak || 0) + 1.4 * Math.exp(-d * 5);
      }
    }
    p.uSeed = R.frameOf(t) % 97;
    return p;
  }

  R.mount({
    duration: DUR,
    poster: 13.9,
    audioFile: 'assets/voice-music.m4a',
    signal: 'assets/audio-analysis.json',
    fonts: ['40px "Shrikhand"', '40px "Yellowtail"', '40px "Special Elite"', '40px "VT323"', '40px "Monoton"'],
    setup() {
      layer = R.canvas(W, H);
      maskC = R.canvas(W, H);
      innerC = R.canvas(W, H);
      tmpC = R.canvas(W, H);
    },
    render(ctx, t) {
      drawScenes(ctx, t);
      R.resetCtx(ctx);
      for (const L of DIRTY) K.line(ctx, t, L);
    },
    post,
    overlay(ctx, t) {
      if (t >= 32.95) return;
      let ox = 0;
      for (const c of WHIPS) ox += -W * 0.4 * Math.max(0, bump(t, c, 0.13));
      ctx.save();
      ctx.translate(ox, 0);
      for (const L of CLEAN) K.line(ctx, t, L);
      for (const T of TITLES) K.title(ctx, t, T);
      ctx.restore();
    },
  });
})();
