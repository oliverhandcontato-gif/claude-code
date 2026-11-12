/* Capa do TikTok da versão com footage (1080×1920): quadro da boneca ruiva (clipe Mixkit 45195)
 * com os olhos acesos, título e logo. Precisa dos quadros do prepare.cjs.
 * Gerar: node render.cjs projects/regras-fabrica-footage/capa --stills 0 */
(function () {
  'use strict';
  const R = window.Reel, Art = window.Art, K = R.kin;
  const { W, H } = R;
  const FRAME = '../../../out/cache/regras-fabrica-footage/15/0040.jpg';
  let img, logo;
  R.mount({
    duration: 1,
    assets: { frame: FRAME, logo: '../assets/logo.png' },
    fonts: ['40px "Shrikhand"', '40px "Special Elite"', '40px "VT323"'],
    setup(a) {
      Art.init();
      img = a.frame;
      logo = a.logo;
    },
    render(ctx) {
      const m = R.drawCover(ctx, img, { zoom: 1.25, fx: 0.6, fy: 0.42 });
      for (const [u, v] of [[0.49, 0.494], [0.675, 0.478]]) {
        const [x, y] = m.map(u, v);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(x, y, 0, x, y, 150);
        g.addColorStop(0, 'rgba(255,50,40,1)');
        g.addColorStop(0.22, 'rgba(255,0,20,0.6)');
        g.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 150, y - 150, 300, 300);
        ctx.restore();
      }
      // escurece em cima e embaixo para o texto
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(0,0,0,0.85)');
      g.addColorStop(0.3, 'rgba(0,0,0,0.1)');
      g.addColorStop(0.62, 'rgba(0,0,0,0.1)');
      g.addColorStop(1, 'rgba(0,0,0,0.92)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    },
    post: () => ({ uFilm: 0.5, uGrain: 0.1, uVignette: 1.0, uSat: 0.45, uContrast: 1.25, uBright: -0.04, uAberr: 4, uScan: 0.12, uCurve: 0.04, uTint: [0.88, 1.0, 0.95], uTintAmt: 0.45, uBloom: 0.45 }),
    overlay(ctx) {
      ctx.save();
      ctx.textBaseline = 'middle';
      ctx.font = K.FONTS.retro(70);
      const s = 'VOCÊ FOI CONTRATADO';
      K.extrude(ctx, s, 540 - ctx.measureText(s).width / 2, 290, { size: 70, depth: 8, fill: '#f4e7c9', side: '#7a0d16' });
      ctx.restore();
      K.line(ctx, 0.9, { style: 'horror', t1: 5, x: 540, y: 470, size: 160, maxW: 1000, lineH: 1.0, jitter: 0, emJitter: 0, words: [{ s: 'SIGA', t: 0 }, { s: 'AS', t: 0 }, { s: 'REGRAS', t: 0, em: true }] });
      Art.sign(ctx, 540, 1330, 0.75, 0, { night: 1, censor: 1 });
      ctx.drawImage(logo, 540 - 140, 1450, 280, 223);
      // HUD
      ctx.save();
      ctx.font = '54px "VT323"';
      ctx.fillStyle = '#ff2236';
      ctx.beginPath();
      ctx.arc(110, 680, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(235,240,230,0.9)';
      ctx.textBaseline = 'middle';
      ctx.fillText('REC  03:17:00', 134, 682);
      ctx.restore();
    },
  });
})();
