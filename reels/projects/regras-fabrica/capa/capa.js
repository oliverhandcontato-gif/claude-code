/* Capa do TikTok (1080×1920). Texto e boneca dentro da faixa central 3:4 (y≈240–1680),
 * que é o que aparece na grade do perfil.  Gerar: node render.cjs projects/regras-fabrica/capa --stills 0 */
(function () {
  'use strict';
  const R = window.Reel, Art = window.Art, P = Art.P, K = R.kin, fx = R.fx;
  const { W, H } = R;
  R.mount({
    duration: 1,
    fonts: ['40px "Shrikhand"', '40px "Yellowtail"', '40px "Special Elite"', '40px "VT323"'],
    setup() { Art.init(); },
    render(ctx, t) {
      Art.wall(ctx, 0, 0, W, H, 1.6);
      // vitrine ao fundo, bonecas de olhos fechados
      ctx.save();
      ctx.translate(540, 1000);
      ctx.scale(1.25, 1.25);
      ctx.translate(-540, -960);
      Art.showcase(ctx, 540, 960, 1, 0, [{ eyes: 0 }, { eyes: 0 }, { eyes: 0 }, { eyes: 0 }, { eyes: 0 }, { eyes: 0 }], { light: 0.55 });
      ctx.restore();
      Art.flashlight(ctx, 540, 1060, 760, 0.3, { dark: 0.93, flicker: 0, warm: 0.3 });
      // a boneca que abriu os olhos, em primeiro plano
      Art.doll(ctx, 540, 1000, 300, { body: true, eyes: 1, pupil: 1, grin: 0.75, mood: 0.85, crack: 0.8, tilt: -0.1, seed: 5, light: 1 });
      // olhos vermelhos no escuro
      Art.eyes(ctx, 150, 560, 16, 1);
      Art.eyes(ctx, 930, 760, 13, 1);
      fx.fog(ctx, 0.5, { alpha: 0.12, speed: 10, scale: 6, offset: 1500, y0: 1300 });
    },
    post: () => ({ uFilm: 0.6, uGrain: 0.1, uVignette: 0.9, uSat: 0.6, uContrast: 1.15, uBright: 0.02, uAberr: 3, uScan: 0.12, uCurve: 0.04, uTint: [0.95, 1.0, 0.95], uTintAmt: 0.35, uBloom: 0.4 }),
    overlay(ctx) {
      // faixa de cima: "VOCÊ FOI CONTRATADO"
      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = K.FONTS.retro(72);
      K.extrude(ctx, 'VOCÊ FOI CONTRATADO', 540 - ctx.measureText('VOCÊ FOI CONTRATADO').width / 2, 285, { size: 72, depth: 8, fill: '#f4e7c9', side: '#7a0d16' });
      ctx.restore();
      // título
      K.line(ctx, 0.9, { style: 'horror', t1: 5, x: 540, y: 530, size: 158, maxW: 1000, lineH: 1.0, jitter: 0, emJitter: 0, words: [{ s: 'SIGA', t: 0, em: false }, { s: 'AS', t: 0, em: false }, { s: 'REGRAS', t: 0, em: true }] });
      // letreiro censurado
      Art.sign(ctx, 540, 1480, 0.8, 0, { night: 1, censor: 1 });
      // rabisco do segurança anterior
      ctx.save();
      ctx.translate(780, 1640);
      ctx.rotate(-0.1);
      ctx.font = '74px "Yellowtail"';
      ctx.textAlign = 'center';
      ctx.lineWidth = 10;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText('não pisque…', 0, 0);
      ctx.fillStyle = '#ff2a3a';
      ctx.fillText('não pisque…', 0, 0);
      ctx.restore();
      // selo "8 REGRAS"
      ctx.save();
      ctx.translate(200, 1650);
      ctx.rotate(-0.15);
      Art.paperFill(ctx, -150, -60, 300, 120);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#8a0c12';
      ctx.strokeRect(-138, -48, 276, 96);
      ctx.font = '58px "Special Elite"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#8a0c12';
      ctx.fillText('8 REGRAS', 0, 4);
      ctx.restore();
    },
  });
})();
