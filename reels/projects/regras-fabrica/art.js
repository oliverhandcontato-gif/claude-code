/* REGRAS DA FÁBRICA (Tio Arle) — biblioteca de ilustração procedural.
 * Nada de imagem: fábrica, bonecas, guarita, rádio, elevador, caixa, bilhete e a mascote
 * "Sorrisinho" são desenhados com caminhos, gradientes e ruído.
 * Convenção: (x, y) é o centro do objeto; `s` é a escala (raio da cabeça nas bonecas).
 */
(function () {
  'use strict';
  const R = window.Reel;
  const { W, H } = R;
  const Art = (window.Art = {});

  // Paleta fixa (11 cores) com papéis definidos.
  const P = (Art.P = {
    // comercial anos 50 (só na abertura)
    pink: '#f5aebd', mint: '#a9dfcc', cream: '#f4e7c9', mustard: '#efbd4a', navy: '#1d2638',
    // fábrica à noite
    void: '#050607', night: '#0c1311', grime: '#1f2a25', sick: '#56634a', rust: '#6a3a24',
    // bonecas e perigo
    doll: '#d9939f', porcelain: '#f0dccb', danger: '#d3142a', light: '#fff1c8',
  });

  const hex = (h) => {
    if (h[0] !== '#') return h.match(/[\d.]+/g).slice(0, 3).map(Number);
    if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  };
  Art.mix = (a, b, k) => {
    const A = hex(a), B = hex(b);
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * R.clamp(k))).join(',')})`;
  };
  Art.rr = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  };
  const ell = (Art.ell = (ctx, x, y, rx, ry, rot = 0) => {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  });
  Art.grad = (ctx, top, bottom, y0 = 0, y1 = H) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, W, y1 - y0);
  };
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
      ctx.stroke();
    }
  };

  // ---------- texturas pré-renderizadas ----------
  let wallTex, floorTex, paperTex, brickTex;
  Art.init = () => {
    wallTex = R.canvas(512, 512);
    {
      const g = wallTex.getContext('2d'), r = R.rng(11);
      g.fillStyle = '#34423b';
      g.fillRect(0, 0, 512, 512);
      // azulejos industriais
      for (let y = 0; y < 512; y += 64) for (let x = 0; x < 512; x += 64) {
        g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.035})`;
        g.fillRect(x + 2, y + 2, 60, 60);
      }
      g.fillStyle = 'rgba(0,0,0,0.35)';
      for (let k = 0; k <= 512; k += 64) {
        g.fillRect(k - 1, 0, 3, 512);
        g.fillRect(0, k - 1, 512, 3);
      }
      // manchas e escorridos
      for (let k = 0; k < 26; k++) {
        const x = r() * 512, y = r() * 512, rr = 20 + r() * 70;
        const gr = g.createRadialGradient(x, y, 0, x, y, rr);
        gr.addColorStop(0, `rgba(${r() < 0.3 ? '60,30,15' : '5,10,5'},${0.25 + r() * 0.25})`);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr;
        g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
        if (r() < 0.4) {
          g.fillStyle = 'rgba(40,20,10,0.25)';
          g.fillRect(x, y, 2 + r() * 3, 60 + r() * 160);
        }
      }
    }
    floorTex = R.canvas(512, 512);
    {
      const g = floorTex.getContext('2d'), r = R.rng(23);
      g.fillStyle = '#1a1f1c';
      g.fillRect(0, 0, 512, 512);
      for (let y = 0; y < 512; y += 128) for (let x = 0; x < 512; x += 128) {
        g.fillStyle = (x + y) % 256 ? '#232a26' : '#151a17';
        g.fillRect(x, y, 128, 128);
      }
      for (let k = 0; k < 900; k++) {
        g.fillStyle = `rgba(0,0,0,${r() * 0.25})`;
        g.fillRect(r() * 512, r() * 512, 2 + r() * 4, 2 + r() * 4);
      }
    }
    paperTex = R.canvas(512, 512);
    {
      const g = paperTex.getContext('2d'), r = R.rng(37);
      g.fillStyle = '#e9dcbc';
      g.fillRect(0, 0, 512, 512);
      for (let k = 0; k < 4000; k++) {
        g.fillStyle = `rgba(${r() < 0.5 ? '120,90,50' : '255,255,240'},${r() * 0.07})`;
        g.fillRect(r() * 512, r() * 512, 1 + r() * 3, 1 + r() * 3);
      }
      for (let k = 0; k < 8; k++) {
        const x = r() * 512, y = r() * 512, rr = 30 + r() * 90;
        const gr = g.createRadialGradient(x, y, rr * 0.6, x, y, rr);
        gr.addColorStop(0, 'rgba(150,110,60,0)');
        gr.addColorStop(0.85, 'rgba(150,110,60,0.12)');
        gr.addColorStop(1, 'rgba(150,110,60,0)');
        g.fillStyle = gr;
        g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      }
    }
    brickTex = R.canvas(512, 256);
    {
      const g = brickTex.getContext('2d'), r = R.rng(41);
      g.fillStyle = '#3a1e18';
      g.fillRect(0, 0, 512, 256);
      for (let row = 0; row < 8; row++) for (let c = -1; c < 9; c++) {
        const x = c * 64 + (row % 2) * 32, y = row * 32;
        g.fillStyle = Art.mix('#8a4a36', '#5a2c22', r());
        g.fillRect(x + 2, y + 2, 60, 28);
      }
    }
  };
  const tile = (ctx, tex, x, y, w, h, scale = 1, ox = 0, oy = 0) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const pat = ctx.createPattern(tex, 'repeat');
    const m = new DOMMatrix().translateSelf(x + ox, y + oy).scaleSelf(scale, scale);
    pat.setTransform(m);
    ctx.fillStyle = pat;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  };
  Art.wall = (ctx, x, y, w, h, scale = 1.4, ox = 0) => tile(ctx, wallTex, x, y, w, h, scale, ox);
  Art.floor = (ctx, x, y, w, h, scale = 1.2, ox = 0) => tile(ctx, floorTex, x, y, w, h, scale, ox);
  Art.paperFill = (ctx, x, y, w, h) => tile(ctx, paperTex, x, y, w, h, 1);
  Art.bricks = (ctx, x, y, w, h, scale = 1, ox = 0) => tile(ctx, brickTex, x, y, w, h, scale, ox);

  // ---------- luz ----------
  /** Escuridão total, menos o círculo da lanterna em (x, y). */
  Art.flashlight = (ctx, x, y, r, t, o = {}) => {
    const { flicker = 0.15, dark = 0.88, warm = 0.22 } = o;
    const f = 1 - flicker * Math.max(0, R.noise1(t * 9, 5)) - (R.hash(R.frameOf(t), 77) < flicker * 0.25 ? 0.5 : 0);
    const rr = r * (0.97 + 0.03 * R.noise1(t * 3, 9));
    const g = ctx.createRadialGradient(x, y, rr * 0.15, x, y, rr * 1.25);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.6, `rgba(0,0,0,${0.12 * (2 - f)})`);
    g.addColorStop(0.88, `rgba(0,0,0,${0.7 * dark})`);
    g.addColorStop(1, `rgba(0,0,0,${dark})`);
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(-W, -H, W * 3, H * 3);
    ctx.globalCompositeOperation = 'overlay';
    const g2 = ctx.createRadialGradient(x, y, 0, x, y, rr);
    g2.addColorStop(0, `rgba(255,236,190,${warm * f})`);
    g2.addColorStop(1, 'rgba(255,236,190,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    ctx.restore();
  };
  /** Lâmpada pendurada balançando, com cone de luz. Retorna a posição da lâmpada. */
  Art.hangingLamp = (ctx, x, y, t, o = {}) => {
    const { len = 260, swing = 0.08, on = 1, color = '255,230,170' } = o;
    const a = Math.sin(t * 1.3) * swing;
    const lx = x + Math.sin(a) * len, ly = y + Math.cos(a) * len;
    ctx.save();
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    ctx.translate(lx, ly);
    ctx.rotate(-a);
    ctx.fillStyle = '#1a1d1b';
    ctx.beginPath();
    ctx.moveTo(-70, 40);
    ctx.lineTo(-20, -10);
    ctx.lineTo(20, -10);
    ctx.lineTo(70, 40);
    ctx.closePath();
    ctx.fill();
    if (on > 0) {
      ctx.globalCompositeOperation = 'screen';
      const g = ctx.createLinearGradient(0, 40, 0, 1400);
      g.addColorStop(0, `rgba(${color},${0.35 * on})`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-60, 40);
      ctx.lineTo(60, 40);
      ctx.lineTo(560, 1500);
      ctx.lineTo(-560, 1500);
      ctx.closePath();
      ctx.fill();
      ell(ctx, 0, 44, 26, 12);
      ctx.fillStyle = `rgba(${color},${on})`;
      ctx.fill();
    }
    ctx.restore();
    return [lx, ly];
  };
  Art.glow = (ctx, x, y, r, color = '255,220,160', a = 0.5) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${color},${a})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  };

  // ---------- a boneca ----------
  /**
   * Boneca de porcelana. o = {
   *   eyes: 0..1 (0 fechados, 1 abertos), look:[x,y], mood: 0..1 (corrupção), talk: 0..1,
   *   body: bool, tilt, hair, bow, dress, face: 'doll'|'guard', grin: 0..1 (sorriso rasgado),
   *   pupil: 0..1 (olho preto com ponto vermelho), crack: 0..1, light: 0..1 (iluminação) }
   */
  Art.doll = (ctx, x, y, s, o = {}) => {
    const { eyes = 1, look = [0, 0], mood = 0, talk = 0, body = false, tilt = 0, hair = '#7a3b2e', bow = P.danger, dress = P.doll,
      face = 'doll', grin = 0, pupil = 0, crack = 0, light = 1, drift = 0, seed = 1 } = o;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    const shade = (c) => Art.mix(c, '#000000', 1 - light);
    if (body) {
      // vestido em sino + gola + braços
      ctx.save();
      ctx.translate(0, s * 1.05);
      ctx.beginPath();
      ctx.moveTo(-s * 0.42, 0);
      ctx.quadraticCurveTo(-s * 0.55, s * 0.7, -s * 1.05, s * 1.9);
      ctx.quadraticCurveTo(0, s * 2.15, s * 1.05, s * 1.9);
      ctx.quadraticCurveTo(s * 0.55, s * 0.7, s * 0.42, 0);
      ctx.closePath();
      const dg = ctx.createLinearGradient(-s, 0, s, 0);
      dg.addColorStop(0, shade(Art.mix(dress, '#000000', 0.35)));
      dg.addColorStop(0.5, shade(dress));
      dg.addColorStop(1, shade(Art.mix(dress, '#000000', 0.45)));
      ctx.fillStyle = dg;
      ctx.fill();
      ctx.lineWidth = s * 0.04;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.stroke();
      // babado
      ctx.fillStyle = shade('#efe6da');
      for (let k = -5; k <= 5; k++) {
        ell(ctx, k * s * 0.19, s * 1.95 - Math.abs(k) * s * 0.012, s * 0.12, s * 0.08);
        ctx.fill();
      }
      // gola
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, s * 0.02);
        ctx.quadraticCurveTo(sd * s * 0.42, -s * 0.02, sd * s * 0.46, s * 0.22);
        ctx.quadraticCurveTo(sd * s * 0.2, s * 0.3, 0, s * 0.02);
        ctx.fillStyle = shade('#f4eee4');
        ctx.fill();
      }
      // braços duros de boneca
      for (const sd of [-1, 1]) {
        ctx.save();
        ctx.translate(sd * s * 0.45, s * 0.18);
        ctx.rotate(sd * (0.25 + (o.arms || 0)));
        Art.rr(ctx, -s * 0.11, 0, s * 0.22, s * 0.95, s * 0.11);
        ctx.fillStyle = shade(P.porcelain);
        ctx.fill();
        ctx.lineWidth = s * 0.03;
        ctx.strokeStyle = 'rgba(60,30,30,0.5)';
        ctx.stroke();
        ctx.restore();
      }
      if (face === 'guard') {
        // uniforme: gravata e distintivo
        ctx.fillStyle = shade('#1c2a3e');
        ctx.beginPath();
        ctx.moveTo(-s * 0.42, 0);
        ctx.quadraticCurveTo(-s * 0.55, s * 0.7, -s * 1.05, s * 1.9);
        ctx.quadraticCurveTo(0, s * 2.15, s * 1.05, s * 1.9);
        ctx.quadraticCurveTo(s * 0.55, s * 0.7, s * 0.42, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade('#c9a43a');
        Art.starburst(ctx, -s * 0.38, s * 0.55, s * 0.13, s * 0.07, 6, 0, shade('#c9a43a'), null);
        ctx.fillStyle = shade('#0e1522');
        ctx.beginPath();
        ctx.moveTo(-s * 0.06, s * 0.05);
        ctx.lineTo(s * 0.06, s * 0.05);
        ctx.lineTo(s * 0.09, s * 0.6);
        ctx.lineTo(0, s * 0.72);
        ctx.lineTo(-s * 0.09, s * 0.6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    // cabelo de trás (chanel com franja)
    ctx.fillStyle = shade(hair);
    ell(ctx, 0, s * 0.05, s * 1.12, s * 1.15);
    ctx.fill();
    for (const sd of [-1, 1]) {
      ell(ctx, sd * s * 0.95, s * 0.55, s * 0.3, s * 0.6, sd * 0.2);
      ctx.fill();
    }
    // rosto de porcelana
    const fg = ctx.createRadialGradient(-s * 0.3, -s * 0.35, s * 0.1, 0, s * 0.1, s * 1.1);
    fg.addColorStop(0, shade(Art.mix('#fff6ee', '#cfc4b8', mood)));
    fg.addColorStop(1, shade(Art.mix('#e4b9a6', '#7d6f68', mood)));
    ell(ctx, 0, s * 0.12, s * 0.9, s * 0.95);
    ctx.fillStyle = fg;
    ctx.fill();
    // franja
    ctx.fillStyle = shade(hair);
    ctx.beginPath();
    ctx.moveTo(-s * 0.98, s * 0.1);
    ctx.bezierCurveTo(-s * 1.0, -s * 1.15, s * 1.0, -s * 1.15, s * 0.98, s * 0.1);
    for (let k = 6; k >= 0; k--) {
      const xx = -s * 0.9 + (k / 6) * s * 1.8;
      ctx.quadraticCurveTo(xx + s * 0.15, -s * 0.2, xx, -s * 0.32 + (k % 2) * s * 0.06);
    }
    ctx.closePath();
    ctx.fill();
    if (face === 'guard') {
      // quepe
      ctx.fillStyle = shade('#1c2a3e');
      ctx.beginPath();
      ctx.moveTo(-s * 0.95, -s * 0.5);
      ctx.quadraticCurveTo(0, -s * 1.45, s * 0.95, -s * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade('#0b111b');
      ell(ctx, 0, -s * 0.48, s * 1.0, s * 0.16);
      ctx.fill();
      Art.starburst(ctx, 0, -s * 0.82, s * 0.14, s * 0.07, 6, 0, shade('#c9a43a'), null);
    } else {
      // laço
      ctx.save();
      ctx.translate(s * 0.55, -s * 0.85);
      ctx.rotate(0.35);
      ctx.fillStyle = shade(bow);
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(sd * s * 0.5, -s * 0.42, sd * s * 0.55, 0);
        ctx.quadraticCurveTo(sd * s * 0.5, s * 0.42, 0, 0);
        ctx.fill();
      }
      ell(ctx, 0, 0, s * 0.12, s * 0.14);
      ctx.fillStyle = shade(Art.mix(bow, '#000000', 0.3));
      ctx.fill();
      ctx.restore();
    }
    if (o.human) {
      // rosto de homem costurado na cabeça de porcelana ("a boneca saiu com o rosto dele")
      ctx.save();
      ell(ctx, 0, s * 0.18, s * 0.66, s * 0.74);
      const hg = ctx.createRadialGradient(-s * 0.2, -s * 0.1, s * 0.05, 0, s * 0.2, s * 0.8);
      hg.addColorStop(0, shade('#d9b8a0'));
      hg.addColorStop(1, shade('#8f6a58'));
      ctx.fillStyle = hg;
      ctx.fill();
      ctx.clip();
      // barba por fazer
      const r = R.rng(seed * 7 + 1);
      ctx.fillStyle = 'rgba(40,30,30,0.35)';
      for (let k = 0; k < 260; k++) {
        const a = r() * Math.PI, rr = s * (0.25 + r() * 0.5);
        const px = Math.cos(a) * rr, py = s * 0.35 + Math.sin(a) * rr * 0.75;
        ctx.fillRect(px, py, s * 0.012, s * 0.012);
      }
      ctx.restore();
      // olheiras e olhos pequenos, cansados, olhando para o lado
      for (const sd of [-1, 1]) {
        const ex2 = sd * s * 0.26, ey2 = s * 0.05;
        ell(ctx, ex2, ey2 + s * 0.07, s * 0.15, s * 0.08);
        ctx.fillStyle = shade('#5a3a3e');
        ctx.globalAlpha = 0.55;
        ctx.fill();
        ctx.globalAlpha = 1;
        ell(ctx, ex2, ey2, s * 0.12, s * 0.055 * (1 - (o.blinkH || 0)));
        ctx.fillStyle = shade('#e9e2d4');
        ctx.fill();
        ell(ctx, ex2 + (look[0] || 0) * s * 0.05, ey2, s * 0.045, s * 0.045);
        ctx.fillStyle = '#120c0a';
        ctx.fill();
        // sobrancelha grossa caída
        ctx.strokeStyle = shade('#2a1e18');
        ctx.lineWidth = s * 0.05;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex2 - sd * s * 0.12, ey2 - s * 0.1);
        ctx.lineTo(ex2 + sd * s * 0.13, ey2 - s * 0.14);
        ctx.stroke();
      }
      // nariz
      ctx.strokeStyle = shade('#6b4a3c');
      ctx.lineWidth = s * 0.03;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.08);
      ctx.lineTo(-s * 0.05, s * 0.3);
      ctx.lineTo(s * 0.04, s * 0.32);
      ctx.stroke();
      // bigode e boca aberta, gritando sem som
      ctx.fillStyle = shade('#2a1e18');
      ctx.beginPath();
      ctx.moveTo(-s * 0.22, s * 0.44);
      ctx.quadraticCurveTo(0, s * 0.33, s * 0.22, s * 0.44);
      ctx.quadraticCurveTo(0, s * 0.4, -s * 0.22, s * 0.44);
      ctx.fill();
      ell(ctx, 0, s * 0.56, s * 0.09, s * (0.07 + 0.08 * (o.scream || 0)));
      ctx.fillStyle = '#1a0608';
      ctx.fill();
      // pontos de costura em volta do rosto
      ctx.strokeStyle = shade('#3a0d10');
      ctx.lineWidth = s * 0.025;
      for (let k = 0; k < 22; k++) {
        const a = (k / 22) * Math.PI * 2;
        const px = Math.cos(a) * s * 0.66, py = s * 0.18 + Math.sin(a) * s * 0.74;
        ctx.beginPath();
        ctx.moveTo(px - Math.cos(a) * s * 0.06, py - Math.sin(a) * s * 0.06);
        ctx.lineTo(px + Math.cos(a) * s * 0.06, py + Math.sin(a) * s * 0.06);
        ctx.stroke();
      }
    } else {
    // bochechas
    ctx.globalAlpha = 0.5 * (1 - mood * 0.7);
    ctx.fillStyle = shade('#ee7d86');
    for (const sd of [-1, 1]) {
      ell(ctx, sd * s * 0.55, s * 0.42, s * 0.17, s * 0.1);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // olhos
    const ey = s * 0.08, ex = s * 0.36;
    for (const sd of [-1, 1]) {
      const dx = sd === 1 ? drift * s * 0.12 : 0, dy = sd === 1 ? drift * s * 0.1 : 0;
      const exx = sd * ex + dx, eyy = ey + dy;
      const open = R.clamp(eyes);
      if (open > 0.05) {
        ctx.save();
        ell(ctx, exx, eyy, s * 0.24, s * 0.27 * open);
        ctx.fillStyle = shade(pupil > 0.5 ? '#0b0b0b' : '#fbf8f2');
        ctx.fill();
        ctx.clip();
        if (pupil <= 0.5) {
          ell(ctx, exx + look[0] * s * 0.08, eyy + look[1] * s * 0.07, s * 0.16, s * 0.18);
          ctx.fillStyle = shade(Art.mix('#4f86b8', '#2a2a2a', mood));
          ctx.fill();
          ell(ctx, exx + look[0] * s * 0.08, eyy + look[1] * s * 0.07, s * 0.08 * (1 - mood * 0.5), s * 0.09 * (1 - mood * 0.5));
          ctx.fillStyle = '#050505';
          ctx.fill();
          ell(ctx, exx - s * 0.06 + look[0] * s * 0.08, eyy - s * 0.08, s * 0.045, s * 0.05);
          ctx.fillStyle = `rgba(255,255,255,${0.9 * light})`;
          ctx.fill();
        } else {
          // ponto vermelho no olho todo preto
          ell(ctx, exx + look[0] * s * 0.08, eyy + look[1] * s * 0.06, s * 0.04, s * 0.04);
          ctx.fillStyle = P.danger;
          ctx.shadowColor = 'rgba(255,0,20,0.9)';
          ctx.shadowBlur = s * 0.2;
          ctx.fill();
        }
        ctx.restore();
        // pálpebra e cílios
        ctx.lineWidth = s * 0.045;
        ctx.strokeStyle = shade('#2a1512');
        ctx.beginPath();
        ctx.ellipse(exx, eyy, s * 0.24, s * 0.27 * open, 0, Math.PI * 1.05, Math.PI * 1.95);
        ctx.stroke();
        for (let k = 0; k < 4; k++) {
          const a = Math.PI * (1.15 + k * 0.23);
          const px = exx + Math.cos(a) * s * 0.24, py = eyy + Math.sin(a) * s * 0.27 * open;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + Math.cos(a) * s * 0.11, py + Math.sin(a) * s * 0.11);
          ctx.stroke();
        }
      } else {
        // olho fechado: arco com cílios para baixo
        ctx.lineWidth = s * 0.045;
        ctx.strokeStyle = shade('#2a1512');
        ctx.beginPath();
        ctx.arc(exx, eyy - s * 0.08, s * 0.22, Math.PI * 0.2, Math.PI * 0.8);
        ctx.stroke();
        for (let k = 0; k < 4; k++) {
          const a = Math.PI * (0.28 + k * 0.15);
          const px = exx + Math.cos(a) * s * 0.22, py = eyy - s * 0.08 + Math.sin(a) * s * 0.22;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + Math.cos(a) * s * 0.08, py + Math.sin(a) * s * 0.08);
          ctx.stroke();
        }
      }
    }
    // boca
    const my = s * 0.55;
    if (grin > 0.02) {
      // sorriso rasgado até as bochechas, com dentes e pontos de costura
      const wd = s * (0.25 + 0.5 * grin), hh = s * (0.06 + 0.22 * grin + talk * 0.12);
      ctx.beginPath();
      ctx.moveTo(-wd, my - s * 0.12 * grin);
      ctx.quadraticCurveTo(0, my + hh * 2.2, wd, my - s * 0.12 * grin);
      ctx.quadraticCurveTo(0, my + hh * 0.6, -wd, my - s * 0.12 * grin);
      ctx.closePath();
      ctx.fillStyle = '#1a0306';
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = shade('#efe6cf');
      const n = 12;
      for (let k = 0; k < n; k++) {
        const xx = -wd + ((k + 0.5) / n) * wd * 2;
        ctx.beginPath();
        ctx.moveTo(xx - wd / n, my - s * 0.3);
        ctx.lineTo(xx + wd / n, my - s * 0.3);
        ctx.lineTo(xx, my + hh * 0.9 + Math.abs(xx / wd) * -hh * 0.4);
        ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = shade('#3a0a0e');
      ctx.lineWidth = s * 0.025;
      for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) {
        const xx = sd * (wd * 0.55 + k * wd * 0.15), yy = my + hh * (0.9 - k * 0.25);
        ctx.beginPath();
        ctx.moveTo(xx - s * 0.03, yy - s * 0.06);
        ctx.lineTo(xx + s * 0.03, yy + s * 0.06);
        ctx.stroke();
      }
    } else {
      const op = R.clamp(talk);
      ctx.beginPath();
      ctx.moveTo(-s * 0.16, my);
      ctx.quadraticCurveTo(0, my + s * (0.12 + op * 0.25), s * 0.16, my);
      ctx.quadraticCurveTo(0, my + s * 0.04, -s * 0.16, my);
      ctx.fillStyle = shade('#9c1f2e');
      ctx.fill();
    }
    }
    // rachaduras na porcelana
    if (crack > 0) {
      ctx.strokeStyle = `rgba(30,10,10,${0.8 * crack})`;
      ctx.lineWidth = s * 0.02;
      const r = R.rng(seed * 13 + 5);
      for (let c = 0; c < 3; c++) {
        let px = (r() - 0.5) * s * 1.2, py = -s * 0.3 + r() * s * 0.6;
        ctx.beginPath();
        ctx.moveTo(px, py);
        const steps = Math.ceil(6 * crack);
        for (let k = 0; k < steps; k++) {
          px += (r() - 0.5) * s * 0.3;
          py += s * 0.08 + r() * s * 0.08;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  /** Mascote "Sorrisinho" para a abertura e o final (boneca grande + laço + corrupção). */
  Art.mascot = (ctx, x, y, s, t, o = {}) => {
    const { mood = 0, talk = 0, blink = 0, wave = 0 } = o;
    const m = R.clamp(mood);
    const bob = Math.sin(t * 2.4) * s * 0.03 * (1 - m);
    Art.doll(ctx, x, y + bob, s, {
      body: true, eyes: 1 - blink, talk, mood: m, crack: R.clamp((m - 0.3) * 1.6), grin: R.clamp((m - 0.55) * 2.2),
      pupil: m > 0.7 ? 1 : 0, drift: R.clamp((m - 0.2) * 1.5) * (0.6 + 0.4 * R.noise1(t * 2, 4)), arms: wave * Math.sin(t * 9) * 0.5 - wave * 1.6,
      tilt: m * 0.18 * Math.sin(t * 0.7) + (m > 0.8 ? R.noise1(t * 20, 3) * 0.04 : 0), dress: Art.mix(P.pink, P.doll, m), seed: 3, ...o.extra,
    });
  };

  // ---------- fábrica ----------
  /** Fachada da fábrica. night 0..1, sign = texto do letreiro. */
  Art.factory = (ctx, x, y, s, t, o = {}) => {
    const { night = 0, windows = [] } = o;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const day = 1 - night;
    // corpo de tijolos
    ctx.save();
    ctx.beginPath();
    ctx.rect(-480, -520, 960, 520);
    ctx.clip();
    Art.bricks(ctx, -480, -520, 960, 520, 1);
    ctx.fillStyle = Art.mix('#f2b8a6', '#000000', night) ;
    ctx.globalAlpha = day * 0.45;
    ctx.fillRect(-480, -520, 960, 520);
    ctx.globalAlpha = night * 0.55;
    ctx.fillStyle = '#000';
    ctx.fillRect(-480, -520, 960, 520);
    ctx.restore();
    // telhado em dente de serra
    ctx.fillStyle = Art.mix(P.mint, '#101614', night);
    ctx.beginPath();
    ctx.moveTo(-500, -520);
    for (let k = 0; k < 5; k++) {
      const x0 = -500 + k * 200;
      ctx.lineTo(x0, -640);
      ctx.lineTo(x0 + 200, -520);
    }
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = P.navy;
    ctx.stroke();
    // chaminés
    for (const [cx, hh] of [[-330, 330], [300, 420]]) {
      Art.bricks(ctx, cx - 40, -520 - hh, 80, hh - 60, 0.6);
      ctx.fillStyle = `rgba(0,0,0,${0.15 + night * 0.5})`;
      ctx.fillRect(cx - 40, -520 - hh, 80, hh - 60);
      ctx.fillStyle = Art.mix('#d8cdbd', '#1a1a1a', night);
      ctx.fillRect(cx - 50, -540 - hh, 100, 30);
      // fumaça
      for (let k = 0; k < 6; k++) {
        const ph = (t * 0.25 + k / 6) % 1;
        ell(ctx, cx + Math.sin(ph * 6 + k) * 30 + ph * 140, -560 - hh - ph * 400, 40 + ph * 90, 34 + ph * 70);
        ctx.fillStyle = night ? `rgba(40,45,42,${0.5 * (1 - ph)})` : `rgba(255,250,240,${0.85 * (1 - ph)})`;
        ctx.fill();
      }
    }
    // janelas
    const wins = [];
    for (let row = 0; row < 2; row++) for (let c = 0; c < 6; c++) {
      const wx = -400 + c * 150, wy = -450 + row * 170;
      if (row === 1 && (c === 2 || c === 3)) continue;
      Art.rr(ctx, wx, wy, 110, 120, 10);
      const lit = windows.includes(row * 6 + c);
      ctx.fillStyle = lit ? `rgba(255,${night ? 40 : 230},${night ? 40 : 160},1)` : Art.mix('#bfe6f2', '#070b0a', night);
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = P.navy;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(wx + 55, wy);
      ctx.lineTo(wx + 55, wy + 120);
      ctx.moveTo(wx, wy + 60);
      ctx.lineTo(wx + 110, wy + 60);
      ctx.lineWidth = 5;
      ctx.stroke();
      if (lit) wins.push([wx + 55, wy + 60]);
    }
    // portão
    Art.rr(ctx, -110, -220, 220, 220, [110, 110, 0, 0]);
    ctx.fillStyle = Art.mix(P.mustard, '#0a0705', night);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = P.navy;
    ctx.stroke();
    ctx.restore();
    return wins.map(([a, b]) => [x + a * s, y + b * s]);
  };

  /** Letreiro "FÁBRICA DE BONECAS S█████████" com a tarja de censura. */
  Art.sign = (ctx, x, y, s, t, o = {}) => {
    const { night = 0, censor = 1, name = 'SORRISINHO', flicker = 0 } = o;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.rotate(-0.03);
    Art.rr(ctx, -440, -120, 880, 240, 30);
    ctx.fillStyle = Art.mix(P.cream, '#14100d', night);
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.strokeStyle = Art.mix(P.navy, '#000000', night);
    ctx.stroke();
    const on = flicker > 0 && R.hash(R.frameOf(t), 51) < flicker ? 0.25 : 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '62px "Shrikhand"';
    ctx.fillStyle = Art.mix(P.danger, '#4a0a10', night * (1 - on * 0.6));
    ctx.fillText('FÁBRICA DE BONECAS', 0, -48);
    ctx.font = '96px "Shrikhand"';
    const tw = ctx.measureText(name).width;
    ctx.fillStyle = Art.mix(P.pink, '#ff2a40', night);
    if (night) {
      ctx.shadowColor = `rgba(255,30,50,${0.8 * on})`;
      ctx.shadowBlur = 30;
    }
    ctx.globalAlpha = on;
    ctx.fillText(name, 0, 50);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    // tarja preta: cobre tudo menos a primeira letra
    if (censor > 0) {
      const first = ctx.measureText(name[0]).width;
      const x0 = -tw / 2 + first + 6, w = (tw - first - 6) * R.clamp(censor);
      ctx.fillStyle = '#050505';
      ctx.fillRect(x0, 50 - 46, w, 92);
    }
    ctx.restore();
  };

  // ---------- guarita ----------
  /** Porta vista de dentro da guarita, com vidro, maçaneta e trinco. rattle 0..1. */
  Art.door = (ctx, x, y, s, t, o = {}) => {
    const { rattle = 0, locked = 1, silhouette = 0, light = 1 } = o;
    ctx.save();
    ctx.translate(x + (rattle ? R.noise1(t * 60, 1) * 6 * rattle : 0), y);
    ctx.scale(s, s);
    // batente
    ctx.fillStyle = Art.mix('#3b2a1e', '#000000', 1 - light);
    ctx.fillRect(-300, -800, 600, 1600);
    // folha
    const dg = ctx.createLinearGradient(-260, 0, 260, 0);
    dg.addColorStop(0, Art.mix('#4a5a50', '#000000', 1 - light));
    dg.addColorStop(1, Art.mix('#2c3731', '#000000', 1 - light));
    ctx.fillStyle = dg;
    ctx.fillRect(-260, -760, 520, 1560);
    // vidro aramado
    ctx.fillStyle = '#05080a';
    ctx.fillRect(-180, -660, 360, 420);
    if (silhouette > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-180, -660, 360, 420);
      ctx.clip();
      ctx.globalAlpha = silhouette;
      ctx.fillStyle = '#000';
      ell(ctx, 10, -470, 110, 130);
      ctx.fill();
      ctx.fillRect(-160, -360, 340, 200);
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(150,170,160,0.25)';
    ctx.lineWidth = 2;
    for (let k = -180; k < 180; k += 30) {
      ctx.beginPath();
      ctx.moveTo(k, -660);
      ctx.lineTo(k + 60, -240);
      ctx.moveTo(k + 60, -660);
      ctx.lineTo(k, -240);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.moveTo(-180, -660);
    ctx.lineTo(-60, -660);
    ctx.lineTo(-180, -420);
    ctx.fill();
    // maçaneta girando
    const turn = rattle * Math.sin(t * 38) * 0.35;
    ctx.save();
    ctx.translate(170, 40);
    ctx.fillStyle = '#9b9a8e';
    ell(ctx, 0, 0, 34, 34);
    ctx.fill();
    ctx.rotate(turn);
    Art.rr(ctx, -110, -14, 120, 28, 12);
    ctx.fillStyle = '#c9c7b8';
    ctx.fill();
    ctx.restore();
    // trinco
    ctx.fillStyle = '#7b7a70';
    ctx.fillRect(120, -140, 120, 40);
    ctx.fillStyle = '#b8b6a6';
    ctx.fillRect(120 + (1 - locked) * 60, -150, 60, 60);
    ctx.restore();
  };

  /** Relógio de parede. h:m em horas/minutos. */
  Art.clock = (ctx, x, y, r, h, m, o = {}) => {
    const { light = 1, red = 0 } = o;
    ctx.save();
    ctx.translate(x, y);
    ell(ctx, 0, 0, r, r);
    ctx.fillStyle = Art.mix('#efe6d2', '#0d0d0d', 1 - light);
    ctx.fill();
    ctx.lineWidth = r * 0.12;
    ctx.strokeStyle = Art.mix('#2b2b2b', '#000', 1 - light);
    ctx.stroke();
    ctx.fillStyle = '#222';
    for (let k = 0; k < 12; k++) {
      const a = (k * Math.PI) / 6;
      ctx.save();
      ctx.rotate(a);
      ctx.fillRect(-r * 0.03, -r * 0.88, r * 0.06, r * (k % 3 ? 0.1 : 0.18));
      ctx.restore();
    }
    const hand = (a, len, wd, c) => {
      ctx.save();
      ctx.rotate(a);
      ctx.fillStyle = c;
      ctx.fillRect(-wd / 2, -len, wd, len + r * 0.1);
      ctx.restore();
    };
    hand(((h % 12) + m / 60) * (Math.PI / 6), r * 0.5, r * 0.08, '#151515');
    hand(m * (Math.PI / 30), r * 0.78, r * 0.05, red ? P.danger : '#151515');
    ell(ctx, 0, 0, r * 0.07, r * 0.07);
    ctx.fillStyle = '#111';
    ctx.fill();
    ctx.restore();
  };

  /** Rádio de válvula. talk 0..1 pulsa o alto-falante; dial e luz. */
  Art.radio = (ctx, x, y, s, t, o = {}) => {
    const { talk = 0, glow = 1, evil = 0, cord = 0 } = o;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    Art.rr(ctx, -330, -230, 660, 460, [120, 120, 30, 30]);
    const g = ctx.createLinearGradient(0, -230, 0, 230);
    g.addColorStop(0, '#7a4a2b');
    g.addColorStop(1, '#3d2414');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#1b0f08';
    ctx.stroke();
    // grade do alto-falante
    const pulse = 1 + talk * 0.05;
    ctx.save();
    ctx.translate(-110, 10);
    ctx.scale(pulse, pulse);
    ell(ctx, 0, 0, 170, 170);
    ctx.fillStyle = '#d9c9a2';
    ctx.fill();
    ctx.clip();
    ctx.strokeStyle = 'rgba(70,45,25,0.8)';
    ctx.lineWidth = 7;
    for (let k = -180; k < 180; k += 22) {
      ctx.beginPath();
      ctx.moveTo(k, -180);
      ctx.lineTo(k, 180);
      ctx.stroke();
    }
    if (evil > 0) {
      // um rosto se forma na grade
      ctx.globalAlpha = evil;
      ctx.fillStyle = '#120404';
      for (const sd of [-1, 1]) {
        ell(ctx, sd * 55, -40, 26, 34 + talk * 6);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.ellipse(0, 60, 80 + talk * 10, 18 + talk * 40, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = P.danger;
      for (const sd of [-1, 1]) {
        ell(ctx, sd * 55, -40, 6, 6);
        ctx.fill();
      }
    }
    ctx.restore();
    // dial
    Art.rr(ctx, 90, -150, 190, 120, 16);
    ctx.fillStyle = glow ? `rgba(255,${evil ? 60 : 200},${evil ? 50 : 110},${0.6 + 0.4 * glow})` : '#2a2010';
    ctx.fill();
    ctx.fillStyle = '#2a1a0e';
    for (let k = 0; k < 9; k++) ctx.fillRect(105 + k * 20, -120, 3, k % 2 ? 20 : 34);
    ctx.fillStyle = P.danger;
    ctx.fillRect(130 + Math.sin(t * 0.8) * 50 + 50, -140, 5, 100);
    for (const kx of [130, 240]) {
      ell(ctx, kx, 90, 40, 40);
      ctx.fillStyle = '#1b0f08';
      ctx.fill();
      ell(ctx, kx, 90, 28, 28);
      ctx.fillStyle = '#c9a46a';
      ctx.fill();
    }
    // fio para a tomada
    ctx.strokeStyle = '#0e0e0e';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(300, 200);
    ctx.bezierCurveTo(420, 300, 380 + cord * 200, 420, 460 + cord * 300, 380 - cord * 120);
    ctx.stroke();
    ctx.restore();
  };

  // ---------- vitrine ----------
  /** Vitrine de vidro com prateleiras de bonecas. dolls = [{eyes, look, mood, pupil, grin, dx, dy, s}] */
  Art.showcase = (ctx, x, y, s, t, dolls, o = {}) => {
    const { light = 1, rows = 2, cols = 3 } = o;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    // fundo
    ctx.fillStyle = Art.mix('#3a1f26', '#030303', 1 - light);
    ctx.fillRect(-470, -700, 940, 1400);
    const cw = 940 / cols, rh = 1400 / rows;
    dolls.forEach((d, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      const dx = -470 + cw * (c + 0.5) + (d.dx || 0), dy = -700 + rh * r + rh * 0.3 + (d.dy || 0);
      Art.doll(ctx, dx, dy, (d.s || 1) * 105, { body: true, light, seed: i + 1, hair: ['#7a3b2e', '#d9b25a', '#2a1a14', '#a8603a'][i % 4], dress: [P.doll, '#9fc7d8', '#e6c56b', '#b7a6d8'][i % 4], ...d });
    });
    // prateleiras
    for (let r = 1; r <= rows; r++) {
      ctx.fillStyle = Art.mix('#5a3a24', '#050505', 1 - light);
      ctx.fillRect(-470, -700 + rh * r - 30, 940, 30);
    }
    // vidro com reflexo
    ctx.fillStyle = 'rgba(180,220,230,0.05)';
    ctx.fillRect(-470, -700, 940, 1400);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.moveTo(-470, -700);
    ctx.lineTo(-250, -700);
    ctx.lineTo(-470, -200);
    ctx.fill();
    ctx.lineWidth = 22;
    ctx.strokeStyle = Art.mix('#2b1a10', '#000000', 1 - light);
    ctx.strokeRect(-470, -700, 940, 1400);
    ctx.restore();
  };

  // ---------- esteira ----------
  /** Esteira com rolos e peças passando. items = [{type:'head'|'arm'|'doll', x, o}] */
  Art.conveyor = (ctx, y, t, speed, items, o = {}) => {
    const { light = 1 } = o;
    const off = (t * speed) % 80;
    // estrutura
    ctx.fillStyle = Art.mix('#3a403c', '#000', 1 - light);
    ctx.fillRect(-100, y + 60, W + 200, 200);
    ctx.fillStyle = '#0d0f0e';
    for (let k = -1; k < 16; k++) ctx.fillRect(k * 160 - (off * 2) % 160 + 60, y + 260, 30, 500);
    // lona
    ctx.fillStyle = Art.mix('#1b1e1c', '#000', 1 - light);
    ctx.fillRect(-100, y, W + 200, 70);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let k = -1; k < 16; k++) ctx.fillRect(k * 80 - off, y, 6, 70);
    for (const it of items) {
      const ix = it.x;
      if (ix < -300 || ix > W + 300) continue;
      if (it.type === 'head') Art.doll(ctx, ix, y - 95, 85, { light, ...(it.o || {}) });
      else if (it.type === 'doll') Art.doll(ctx, ix, y - 330, 95, { body: true, light, ...(it.o || {}) });
      else {
        ctx.save();
        ctx.translate(ix, y - 18);
        ctx.rotate(it.rot || 0.2);
        Art.rr(ctx, -80, -20, 160, 40, 20);
        ctx.fillStyle = Art.mix(P.porcelain, '#000', 1 - light);
        ctx.fill();
        ell(ctx, 88, 0, 30, 26);
        ctx.fill();
        ctx.restore();
      }
    }
  };

  // ---------- elevador ----------
  /** Painel do andar acima da porta do elevador + portas. open 0..1. floor = número aceso. */
  Art.elevator = (ctx, x, y, s, t, o = {}) => {
    const { open = 0, floor = 1, light = 1, inside } = o;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    // moldura
    ctx.fillStyle = Art.mix('#6d6e66', '#000', 1 - light);
    ctx.fillRect(-380, -620, 760, 1320);
    // indicador
    Art.rr(ctx, -260, -580, 520, 130, 20);
    ctx.fillStyle = '#0c0c0b';
    ctx.fill();
    ctx.font = '96px "VT323"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ['1', '2', '3'].forEach((n, k) => {
      const on = String(floor) === n;
      ctx.fillStyle = on ? (n === '3' ? '#ff2236' : '#ffb347') : '#2a2420';
      if (on) {
        ctx.shadowColor = n === '3' ? 'rgba(255,20,40,0.9)' : 'rgba(255,170,60,0.8)';
        ctx.shadowBlur = 30;
      }
      ctx.fillText(n, -150 + k * 150, -512);
      ctx.shadowBlur = 0;
    });
    // vão
    const gap = 300 * E3(open);
    ctx.fillStyle = '#020202';
    ctx.fillRect(-300, -420, 600, 1080);
    if (inside && open > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-gap, -420, gap * 2, 1080);
      ctx.clip();
      inside(ctx);
      ctx.restore();
    }
    // portas de aço escovado
    for (const sd of [-1, 1]) {
      const x0 = sd < 0 ? -300 - gap : gap;
      const dg = ctx.createLinearGradient(x0, 0, x0 + 300, 0);
      dg.addColorStop(0, Art.mix('#8d918b', '#000', 1 - light));
      dg.addColorStop(0.5, Art.mix('#b9bdb5', '#000', 1 - light));
      dg.addColorStop(1, Art.mix('#7c8079', '#000', 1 - light));
      ctx.fillStyle = dg;
      ctx.fillRect(x0, -420, 300, 1080);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(sd < 0 ? x0 + 296 : x0, -420, 4, 1080);
    }
    ctx.restore();
  };
  const E3 = (x) => 1 - Math.pow(1 - R.clamp(x), 3);

  /** Muitos olhos no escuro. */
  Art.eyes = (ctx, x, y, s, open, color = '255,40,30') => {
    if (open <= 0.02) return;
    ctx.save();
    ctx.translate(x, y);
    for (const sd of [-1, 1]) {
      const gx = sd * s * 1.6;
      const g = ctx.createRadialGradient(gx, 0, 0, gx, 0, s * 3);
      g.addColorStop(0, `rgba(${color},${0.5 * open})`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(gx - s * 3, -s * 3, s * 6, s * 6);
      ell(ctx, gx, 0, s, s * 0.55 * open);
      ctx.fillStyle = `rgba(255,${color.startsWith('255,2') ? 210 : 120},200,${open})`;
      ctx.fill();
      ell(ctx, gx, 0, s * 0.25, s * 0.45 * open);
      ctx.fillStyle = '#000';
      ctx.fill();
    }
    ctx.restore();
  };

  // ---------- janela + supervisor ----------
  /** Janela da guarita à noite; supervisor = 0..1 de presença; smile 0..1. */
  Art.windowNight = (ctx, x, y, s, t, o = {}) => {
    const { supervisor = 0, smile = 0, knock = 0, light = 1 } = o;
    ctx.save();
    ctx.translate(x + knock * R.noise1(t * 70, 4) * 5, y);
    ctx.scale(s, s);
    ctx.fillStyle = '#04070a';
    ctx.fillRect(-380, -480, 760, 960);
    // pátio lá fora: poste e neblina
    Art.glow(ctx, 260, -330, 420, '200,215,190', 0.45);
    Art.glow(ctx, -200, -380, 300, '170,190,220', 0.25);
    ctx.fillStyle = '#0b100e';
    ctx.fillRect(250, -340, 12, 820);
    if (supervisor > 0) {
      ctx.save();
      ctx.globalAlpha = R.clamp(supervisor);
      const sx = -40, sy = -40;
      // corpo e cabeça
      ctx.fillStyle = '#0c0d0e';
      ctx.beginPath();
      ctx.moveTo(sx - 260, 480);
      ctx.quadraticCurveTo(sx - 250, 120, sx, 100);
      ctx.quadraticCurveTo(sx + 250, 120, sx + 260, 480);
      ctx.fill();
      ell(ctx, sx, sy, 150, 175);
      ctx.fillStyle = '#c9c0b0';
      ctx.fill();
      // quepe
      ctx.fillStyle = '#141a24';
      ctx.beginPath();
      ctx.moveTo(sx - 160, sy - 90);
      ctx.quadraticCurveTo(sx, sy - 260, sx + 160, sy - 90);
      ctx.fill();
      ctx.fillRect(sx - 180, sy - 100, 360, 26);
      // olhos fundos
      for (const sd of [-1, 1]) {
        ell(ctx, sx + sd * 55, sy - 10, 32, 24);
        ctx.fillStyle = '#0a0606';
        ctx.fill();
        ell(ctx, sx + sd * 55, sy - 10, 6, 6);
        ctx.fillStyle = '#e8e2d0';
        ctx.fill();
      }
      // sorriso grande demais
      const wd = 50 + smile * 110, hh = 14 + smile * 46;
      ctx.beginPath();
      ctx.moveTo(sx - wd, sy + 60 - smile * 20);
      ctx.quadraticCurveTo(sx, sy + 60 + hh * 2, sx + wd, sy + 60 - smile * 20);
      ctx.quadraticCurveTo(sx, sy + 60 + hh * 0.5, sx - wd, sy + 60 - smile * 20);
      ctx.fillStyle = '#140405';
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#ece4cc';
      for (let k = 0; k < 14; k++) {
        const xx = sx - wd + ((k + 0.5) / 14) * wd * 2;
        ctx.fillRect(xx - 5, sy + 30, 10, 36 + smile * 30);
      }
      ctx.restore();
      ctx.restore();
    }
    // condensação/sujeira no vidro
    fxDirt(ctx, -380, -480, 760, 960, 7);
    // caixilho
    ctx.lineWidth = 34;
    ctx.strokeStyle = Art.mix('#2d2a22', '#000', 1 - light);
    ctx.strokeRect(-380, -480, 760, 960);
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(0, -480);
    ctx.lineTo(0, 480);
    ctx.stroke();
    ctx.restore();
  };
  function fxDirt(ctx, x, y, w, h, seed) {
    const r = R.rng(seed);
    for (let k = 0; k < 18; k++) {
      const px = x + r() * w, py = y + r() * h, rr = 40 + r() * 120;
      const g = ctx.createRadialGradient(px, py, 0, px, py, rr);
      g.addColorStop(0, 'rgba(180,190,170,0.06)');
      g.addColorStop(1, 'rgba(180,190,170,0)');
      ctx.fillStyle = g;
      ctx.fillRect(px - rr, py - rr, rr * 2, rr * 2);
    }
  }

  // ---------- caixa 12 ----------
  /** Caixa de papelão aberta vista de cima, cheia de cabeças de boneca. */
  Art.box = (ctx, x, y, s, t, o = {}) => {
    const { heads = 9, open = 1, extra = 0, light = 1, extraLook = [0, 0] } = o;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    // abas
    ctx.fillStyle = Art.mix('#9a6b3c', '#000', 1 - light);
    for (const [ax, ay, aw, ah, rot] of [[-420, -380, 840, 140, -0.12 * open], [-420, 240, 840, 140, 0.12 * open]]) {
      ctx.save();
      ctx.translate(ax + aw / 2, ay + ah / 2);
      ctx.rotate(rot);
      ctx.fillRect(-aw / 2, -ah / 2, aw, ah);
      ctx.restore();
    }
    ctx.fillStyle = Art.mix('#3b2614', '#000', 1 - light);
    ctx.fillRect(-380, -260, 760, 520);
    // cabeças empilhadas
    const r = R.rng(77);
    for (let k = 0; k < heads; k++) {
      const hx = -280 + (k % 4) * 185 + (r() - 0.5) * 40, hy = -160 + Math.floor(k / 4) * 170 + (r() - 0.5) * 30;
      Art.doll(ctx, hx, hy, 74, { eyes: r() < 0.3 ? 1 : 0, light: light * 0.85, tilt: (r() - 0.5) * 1.2, seed: k + 20, hair: ['#7a3b2e', '#d9b25a', '#2a1a14'][k % 3] });
    }
    if (extra > 0) Art.doll(ctx, 250, 140, 86, { eyes: 1, pupil: 1, grin: 0.6 * extra, look: extraLook, light, seed: 99, mood: 0.8, crack: 0.6 });
    // etiqueta
    ctx.save();
    ctx.translate(0, 330);
    ctx.rotate(0.03);
    Art.paperFill(ctx, -150, -55, 300, 110);
    ctx.font = '78px "Special Elite"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2a1a10';
    ctx.fillText('CX 12', 0, 6);
    ctx.restore();
    ctx.restore();
  };

  // ---------- bilhete ----------
  /** Bilhete amassado com letra tremida; burn 0..1 queima de baixo para cima. */
  Art.note = (ctx, x, y, s, t, o = {}) => {
    const { burn = 0, lines = ['AS REGRAS', 'SÃO', 'MENTIRA'], write = 1, rot = -0.06 } = o;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    const top = -330, bot = 330 - burn * 680;
    ctx.save();
    ctx.beginPath();
    // borda inferior irregular (queimando)
    ctx.moveTo(-260, top);
    ctx.lineTo(260, top);
    for (let k = 0; k <= 20; k++) {
      const xx = 260 - k * 26;
      ctx.lineTo(xx, bot + (burn > 0 ? R.noise1(k * 0.7 + t * 2, 3) * 30 : 0));
    }
    ctx.closePath();
    ctx.clip();
    Art.paperFill(ctx, -260, top, 520, 660);
    // dobras
    ctx.strokeStyle = 'rgba(90,60,30,0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-260, -40);
    ctx.lineTo(260, 20);
    ctx.moveTo(-30, top);
    ctx.lineTo(30, 330);
    ctx.stroke();
    // letra tremida em vermelho escuro
    ctx.font = '96px "Special Elite"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const total = lines.join('').length;
    let shown = Math.floor(write * total);
    lines.forEach((ln, i) => {
      const n = Math.max(0, Math.min(ln.length, shown));
      shown -= ln.length;
      const s2 = ln.slice(0, n);
      ctx.save();
      ctx.translate(R.noise1(i * 3.1, 2) * 10, -170 + i * 150);
      ctx.rotate(R.noise1(i * 1.7, 5) * 0.06);
      ctx.fillStyle = '#5e0a0f';
      ctx.fillText(s2, 0, 0);
      ctx.restore();
    });
    // brasa na borda
    if (burn > 0) {
      const g = ctx.createLinearGradient(0, bot - 70, 0, bot + 30);
      g.addColorStop(0, 'rgba(40,20,5,0)');
      g.addColorStop(0.6, 'rgba(30,10,0,0.9)');
      g.addColorStop(1, 'rgba(255,120,20,1)');
      ctx.fillStyle = g;
      ctx.fillRect(-270, bot - 70, 540, 110);
    }
    ctx.restore();
    if (burn > 0 && burn < 1) {
      // chamas
      for (let k = 0; k < 14; k++) {
        const fx0 = -240 + k * 37, hh = 60 + 70 * Math.abs(R.noise1(t * 6 + k, 8));
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(fx0, bot, 0, fx0, bot - hh * 0.5, hh);
        g.addColorStop(0, 'rgba(255,230,150,0.95)');
        g.addColorStop(0.4, 'rgba(255,120,20,0.7)');
        g.addColorStop(1, 'rgba(255,40,0,0)');
        ctx.fillStyle = g;
        ell(ctx, fx0, bot - hh * 0.4, 30, hh);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  };

  // ---------- cartão da regra ----------
  /** Folha do manual "REGRA Nº n" (papel, carimbo e rabiscos do segurança anterior). */
  Art.ruleCard = (ctx, x, y, s, t, n, o = {}) => {
    const { scrawl = '', scrawlP = 0, stamp = 0, tear = 0 } = o;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.rotate(-0.04 + (n % 2 ? 0.07 : 0));
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-370, -200, 760, 420);
    Art.paperFill(ctx, -380, -220, 760, 420);
    ctx.fillStyle = '#7d1a1e';
    ctx.fillRect(-380, -220, 760, 26);
    ctx.font = '40px "Special Elite"';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#3a2a1c';
    ctx.fillText('MANUAL DO SEGURANÇA NOTURNO', -340, -150);
    ctx.font = '118px "Shrikhand"';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1c1410';
    ctx.fillText(`REGRA Nº ${n}`, 0, 30);
    if (stamp > 0) {
      ctx.save();
      ctx.translate(230, 140);
      ctx.rotate(-0.2);
      const sc = 1 + 0.6 * (1 - R.clamp(stamp * 4));
      ctx.scale(sc, sc);
      ctx.globalAlpha = R.clamp(stamp * 4) * 0.85;
      ctx.lineWidth = 8;
      ctx.strokeStyle = P.danger;
      ctx.strokeRect(-150, -42, 300, 84);
      ctx.font = '52px "Special Elite"';
      ctx.fillStyle = P.danger;
      ctx.fillText('OBRIGATÓRIA', 0, 4);
      ctx.restore();
    }
    if (scrawl && scrawlP > 0) {
      // letra à mão tremida do segurança anterior
      ctx.save();
      ctx.translate(-150, 160);
      ctx.rotate(-0.08);
      ctx.font = '70px "Yellowtail"';
      const n2 = Math.floor(scrawl.length * R.clamp(scrawlP));
      ctx.fillStyle = '#8a0c12';
      ctx.fillText(scrawl.slice(0, n2), R.noise1(t * 30, 1) * 1.5, 0);
      ctx.restore();
    }
    ctx.restore();
  };

  /** Botão de seguir no estilo do app, com "+" e brilho. pressed 0..1. */
  Art.followButton = (ctx, x, y, s, t, pressed = 0) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * (1 - 0.08 * Math.sin(R.clamp(pressed) * Math.PI)), s * (1 - 0.08 * Math.sin(R.clamp(pressed) * Math.PI)));
    Art.rr(ctx, -230, -62, 460, 124, 20);
    ctx.fillStyle = pressed >= 1 ? '#2c2c30' : '#fe2c55';
    ctx.fill();
    ctx.font = '900 64px "Inter", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(pressed >= 1 ? 'Seguindo ✓' : '+  Seguir', 0, 4);
    ctx.restore();
  };
})();
