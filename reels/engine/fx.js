/* Reel engine — efeitos visuais gerados por código
 * grão, vinheta, neblina, chuva, relâmpago, brilho de luz, poeira, VHS, glitch,
 * estática, tremida, círculo rabiscado e a silhueta.
 */
(function () {
  'use strict';
  const R = window.Reel;
  const { W, H } = R;
  const fx = (R.fx = {});

  let grainTiles = [], fogTex, scan, vig, figure, tmp, small, planeR, planeGB, vhsOut;

  fx.init = () => {
    // Grão: 6 texturas de ruído alternadas por frame.
    const gw = 540, gh = 960;
    for (let k = 0; k < 6; k++) {
      const c = R.canvas(gw, gh), g = c.getContext('2d');
      const img = g.createImageData(gw, gh), d = img.data, rnd = R.rng(1000 + k);
      for (let i = 0; i < d.length; i += 4) {
        const v = 128 + (rnd() + rnd() - 1) * 125;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      grainTiles.push(c);
    }
    fogTex = makeFog(256, 7);

    scan = R.canvas(W, H);
    {
      const g = scan.getContext('2d');
      g.fillStyle = 'rgba(0,0,0,0.6)';
      for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 2);
    }
    vig = R.canvas(W, H);
    {
      const g = vig.getContext('2d');
      const grd = g.createRadialGradient(W / 2, H * 0.48, H * 0.16, W / 2, H * 0.5, H * 0.64);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(0.55, 'rgba(0,0,0,0.3)');
      grd.addColorStop(1, 'rgba(0,0,0,0.95)');
      g.fillStyle = grd;
      g.fillRect(0, 0, W, H);
    }
    figure = makeFigure();
    tmp = R.canvas(W, H);
    small = R.canvas(270, 480);
    planeR = R.canvas(540, 960);
    planeGB = R.canvas(540, 960);
    vhsOut = R.canvas(540, 960);
  };

  /** Textura de neblina contínua nas bordas (value noise periódico, 4 oitavas). */
  function makeFog(N, seed) {
    const c = R.canvas(N, N), g = c.getContext('2d');
    const img = g.createImageData(N, N), d = img.data;
    const octs = [[4, 0.5], [8, 0.25], [16, 0.15], [32, 0.1]];
    const grids = octs.map(([p], k) => {
      const r = R.rng(seed * 31 + k);
      return Array.from({ length: p * p }, () => r());
    });
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let v = 0;
        octs.forEach(([p, a], k) => {
          const gx = (x / N) * p, gy = (y / N) * p;
          const x0 = Math.floor(gx), y0 = Math.floor(gy);
          let u = gx - x0, w = gy - y0;
          u = u * u * (3 - 2 * u);
          w = w * w * (3 - 2 * w);
          const x1 = (x0 + 1) % p, y1 = (y0 + 1) % p, G = grids[k];
          const top = R.lerp(G[y0 * p + x0], G[y0 * p + x1], u);
          const bot = R.lerp(G[y1 * p + x0], G[y1 * p + x1], u);
          v += a * R.lerp(top, bot, w);
        });
        const i = (y * N + x) * 4;
        d[i] = d[i + 1] = d[i + 2] = 222;
        d[i + 3] = R.clamp((v - 0.36) * 2.3) * 255;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  /** Silhueta alta e magra, desenhada com caminhos e levemente desfocada. */
  function makeFigure() {
    const w = 240, h = 900;
    const base = R.canvas(w, h), g = base.getContext('2d');
    g.fillStyle = g.strokeStyle = 'rgb(9,9,12)';
    g.beginPath();
    g.ellipse(120, 62, 29, 40, 0, 0, Math.PI * 2);
    g.fill();
    g.fillRect(111, 95, 18, 40);
    g.beginPath();
    g.moveTo(80, 130);
    g.quadraticCurveTo(120, 118, 160, 130);
    g.lineTo(151, 300);
    g.lineTo(147, 432);
    g.lineTo(93, 432);
    g.lineTo(89, 300);
    g.closePath();
    g.fill();
    const limb = (pts, w0, w1) => {
      g.lineCap = 'round';
      for (let i = 0; i < pts.length - 1; i++) {
        g.lineWidth = R.lerp(w0, w1, i / (pts.length - 1));
        g.beginPath();
        g.moveTo(pts[i][0], pts[i][1]);
        g.lineTo(pts[i + 1][0], pts[i + 1][1]);
        g.stroke();
      }
    };
    limb([[84, 138], [72, 300], [65, 470], [60, 610]], 17, 8);
    limb([[156, 138], [168, 300], [175, 470], [180, 610]], 17, 8);
    limb([[106, 425], [103, 650], [101, 878]], 27, 15);
    limb([[134, 425], [137, 650], [139, 878]], 27, 15);
    const c = R.canvas(w, h), cg = c.getContext('2d');
    cg.filter = 'blur(3px)';
    cg.drawImage(base, 0, 0);
    cg.filter = 'none';
    cg.globalAlpha = 0.85;
    cg.drawImage(base, 0, 0);
    return c;
  }

  /** Desenha a silhueta com os pés em (x, y) e altura `height` px. */
  fx.figure = (ctx, x, y, height, alpha = 1) => {
    if (alpha <= 0.001) return;
    const s = height / 858, dw = 240 * s, dh = 900 * s;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.drawImage(figure, x - dw / 2, y - 880 * s, dw, dh);
    ctx.restore();
  };

  fx.tint = (ctx, color, alpha = 1, mode = 'source-over') => {
    if (alpha <= 0.001) return;
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  };
  fx.invert = (ctx, alpha = 1) => fx.tint(ctx, '#fff', alpha, 'difference');

  fx.grain = (ctx, t, amount = 0.2) => {
    const f = R.frameOf(t);
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = amount;
    ctx.drawImage(grainTiles[f % 6], -R.hash(f, 77) * 100, -R.hash(f, 78) * 180, W + 110, H + 190);
    ctx.restore();
  };

  fx.vignette = (ctx, amount = 0.8) => {
    ctx.save();
    ctx.globalAlpha = amount;
    ctx.drawImage(vig, 0, 0);
    ctx.restore();
  };

  /** Neblina rolando. mode 'screen' clareia; 'source-over' cobre (nuvem densa). */
  fx.fog = (ctx, t, o = {}) => {
    const { alpha = 0.35, speed = 20, scale = 5, mode = 'screen', offset = 0, y0 = 0, y1 = H } = o;
    if (alpha <= 0.001) return;
    const pat = ctx.createPattern(fogTex, 'repeat');
    pat.setTransform(new DOMMatrix().translateSelf(t * speed + offset, t * speed * 0.18 + offset * 0.37).scaleSelf(scale, scale));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = mode;
    ctx.fillStyle = pat;
    ctx.fillRect(0, y0, W, y1 - y0);
    ctx.restore();
  };

  fx.rain = (ctx, t, o = {}) => {
    const { count = 320, speed = 2600, len = 70, angle = 0.16, alpha = 0.3, width = 2, seed = 1, color = '205,215,225' } = o;
    const dx = Math.tan(angle), span = H + len + 200;
    ctx.save();
    ctx.strokeStyle = `rgba(${color},${alpha})`;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const r1 = R.hash(i, seed), r2 = R.hash(i, seed + 1), r3 = R.hash(i, seed + 2);
      const sp = speed * (0.75 + 0.5 * r3), l = len * (0.7 + 0.6 * r3);
      const y = ((r2 * span + t * sp) % span) - len - 100;
      const x = r1 * (W + 400) - 200 + y * dx;
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx * l, y + l);
    }
    ctx.stroke();
    ctx.restore();
  };

  /** Intensidade 0..1 de relâmpago (três pulsos que decaem) para os instantes dados. */
  fx.lightning = (t, strikes) => {
    let v = 0;
    for (const s of strikes) {
      const d = t - s;
      if (d < 0 || d > 1.4) continue;
      v = Math.max(v, Math.exp(-d * 14));
      if (d > 0.09) v = Math.max(v, 0.85 * Math.exp(-(d - 0.09) * 10));
      if (d > 0.25) v = Math.max(v, 0.55 * Math.exp(-(d - 0.25) * 6));
    }
    return R.clamp(v);
  };

  fx.glow = (ctx, x, y, r, color = '255,200,120', alpha = 0.5) => {
    if (alpha <= 0.001) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${color},${alpha})`);
    g.addColorStop(0.35, `rgba(${color},${alpha * 0.35})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.restore();
  };

  fx.dust = (ctx, t, o = {}) => {
    const { count = 40, seed = 1, alpha = 0.3, size = 3, color = '255,240,220' } = o;
    const mod = (v, m) => ((v % m) + m) % m;
    ctx.save();
    ctx.fillStyle = `rgb(${color})`;
    for (let i = 0; i < count; i++) {
      const x = mod(R.hash(i, seed) * W + t * (10 + R.hash(i, seed + 1) * 20) + Math.sin(t * 0.7 + i) * 20, W);
      const y = mod(R.hash(i, seed + 2) * H - t * (8 + R.hash(i, seed + 3) * 12), H);
      ctx.globalAlpha = alpha * (0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + i)));
      ctx.beginPath();
      ctx.arc(x, y, size * (0.5 + R.hash(i, seed + 4)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  /** [dx, dy] de tremida de câmera. */
  fx.shake = (t, amp, freq = 12, seed = 3) => [R.noise1(t * freq, seed) * amp, R.noise1(t * freq, seed + 9) * amp];

  /** Círculo à mão: p (0..1) controla quanto já foi desenhado. */
  fx.scribble = (ctx, cx, cy, r, p, o = {}) => {
    if (p <= 0) return;
    const { color = 'rgba(200,20,20,0.9)', width = 9, seed = 1, turns = 1.18 } = o;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.beginPath();
    const n = 140, end = p * turns * Math.PI * 2, a0 = -2.2;
    for (let i = 0; i <= n; i++) {
      const a = a0 + (end * i) / n;
      const rr = r * (1 + 0.07 * R.noise1((i / n) * 6, seed) + (0.05 * (a - a0)) / (Math.PI * 2));
      const x = cx + Math.cos(a) * rr * 1.06, y = cy + Math.sin(a) * rr * 0.94;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  };

  fx.static = (ctx, t, alpha = 1) => {
    const f = R.frameOf(t);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(grainTiles[f % 6], -R.hash(f, 5) * 60, -R.hash(f, 6) * 60, W + 120, H + 120);
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 7; i++) ctx.fillRect(0, R.hash(f * 13 + i, 9) * H, W, 2 + R.hash(f * 13 + i, 10) * 8);
    ctx.restore();
  };

  /** Glitch: fatias deslocadas, blocos de cor e inversão parcial. amt 0..1. */
  fx.glitch = (ctx, t, amt, seed = 1) => {
    if (amt <= 0.001) return;
    const f = R.frameOf(t), rnd = R.rng(seed * 7919 + f * 104729);
    const tg = tmp.getContext('2d');
    tg.globalCompositeOperation = 'copy';
    tg.drawImage(ctx.canvas, 0, 0);
    tg.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const n = 4 + Math.floor(amt * 16);
    for (let i = 0; i < n; i++) {
      const y = rnd() * H, h = 8 + rnd() * 160 * amt, dx = (rnd() - 0.5) * 420 * amt;
      ctx.drawImage(tmp, 0, y, W, h, dx, y, W, h);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < Math.floor(amt * 6); i++) {
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,0,40,0.2)' : 'rgba(0,220,255,0.16)';
      ctx.fillRect(rnd() * W * 0.6, rnd() * H, W * (0.2 + rnd() * 0.6), 6 + rnd() * 60);
    }
    if (rnd() < amt * 0.4) {
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, rnd() * H, W, 40 + rnd() * 220 * amt);
    }
    ctx.restore();
  };

  /**
   * Fita VHS: baixa resolução, separação de cor, linhas tremendo, faixa de tracking,
   * ruído de troca de cabeça no rodapé e scanlines. Lê `src` (canvas) e pinta em `ctx`.
   */
  fx.vhs = (ctx, src, t, o = {}) => {
    const f = R.frameOf(t);
    const { jitter = 1, chroma = 1, band = 1, filter = 'sepia(0.2) saturate(0.8) contrast(1.15) brightness(1.05)' } = o;
    const pw = 540, ph = 960;
    const sg = small.getContext('2d');
    sg.filter = filter;
    sg.drawImage(src, 0, 0, small.width, small.height);
    sg.filter = 'none';
    for (const [plane, color] of [[planeR, '#ff0000'], [planeGB, '#00ffff']]) {
      const g = plane.getContext('2d');
      g.globalCompositeOperation = 'source-over';
      g.drawImage(small, 0, 0, pw, ph);
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = color;
      g.fillRect(0, 0, pw, ph);
      g.globalCompositeOperation = 'source-over';
    }
    const og = vhsOut.getContext('2d');
    og.globalCompositeOperation = 'source-over';
    og.fillStyle = '#000';
    og.fillRect(0, 0, pw, ph);
    og.globalCompositeOperation = 'lighter';
    og.drawImage(planeGB, 0, 0);
    og.drawImage(planeR, (3 + 1.5 * R.noise1(t * 3, 5)) * chroma, 0);
    og.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const bandY = (((t * 0.23 + 0.6) % 1.4) - 0.2) * ph, bandH = 70, strip = 4;
    for (let y = 0; y < ph; y += strip) {
      let off = R.noise1(y * 0.02 + t * 2, 11) * 1.6 * jitter;
      if (R.hash(f * 1000 + y, 3) < 0.02) off += (R.hash(f * 1000 + y, 4) - 0.5) * 14 * jitter;
      const db = Math.abs(y - bandY);
      if (db < bandH) {
        const k = 1 - db / bandH;
        off += k * k * (8 + R.noise1(y * 0.3 + t * 40, 12) * 10) * band;
      }
      if (y > ph - 22) off += 10 + R.hash(f + y, 8) * 14;
      ctx.drawImage(vhsOut, 0, y, pw, strip, off * 2, y * 2, W, strip * 2);
    }
    if (band > 0) {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.3 * band;
      ctx.drawImage(grainTiles[f % 6], 0, R.hash(f, 21) * 800, 540, 70, 0, bandY * 2 - 70, W, 140);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.25;
    ctx.drawImage(scan, 0, 0);
    ctx.restore();
  };

  /** Textos de tela do videocassete. */
  fx.osd = (ctx, t, o = {}) => {
    const { tl = 'PLAY ►', tr = 'SP', bl1, bl2 } = o;
    ctx.save();
    ctx.font = '600 54px "JetBrains Mono", "Courier New", monospace';
    ctx.textBaseline = 'top';
    const txt = (s, x, y, align = 'left') => {
      if (!s) return;
      ctx.textAlign = align;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(s, x + 4, y + 4);
      ctx.fillStyle = 'rgba(240,240,240,0.93)';
      ctx.fillText(s, x, y);
    };
    txt(tl, 80, 250);
    txt(tr, W - 80, 250, 'right');
    txt(bl1, 80, 1370);
    txt(bl2, 80, 1436);
    ctx.restore();
  };
})();
