/* Capa do TikTok (1080×1920) com o gancho. Texto e cativos dentro da faixa central 3:4 (y≈240–1680),
 * que é o que aparece na grade do perfil.  Gerar: node render.cjs projects/menina-chorar/capa --stills 0 */
(function () {
  'use strict';
  const R = window.Reel, Art = window.Art, P = Art.P, fx = R.fx;
  const { W, H } = R;
  let icon;
  const PEOPLE = [
    { kind: 'avo', letter: 'A', x: 255, seed: 1 },
    { kind: 'irmao', letter: 'B', x: 540, seed: 2 },
    { kind: 'pai', letter: 'C', x: 825, seed: 3 },
  ];
  R.mount({
    duration: 1,
    assets: { icon: '../assets/logo-icone.png' },
    fonts: ['40px "Shrikhand"', '40px "VT323"', '900 40px "Inter"'],
    setup(a) {
      icon = a.icon;
      Art.init();
    },
    render(ctx) {
      const t = 2.2, b = Art.bulbPos(0.9, 0.12);
      ctx.save();
      ctx.translate(540, 1000);
      ctx.scale(1.08, 1.08);
      ctx.translate(-540, -960);
      Art.room(ctx, false);
      for (const p of PEOPLE) Art.captive(ctx, p.x, 1060, 0.8, { ...p, x: 0, t, sack: 0, fear: 1 });
      Art.darkness(ctx, b, 1, { dark: 0.86, spots: PEOPLE.map((p) => ({ x: p.x, y: 900, r: 270, a: 0.45, sy: 1.6 })) });
      Art.lamp(ctx, b, 1);
      ctx.restore();
      Art.girl(ctx, 175, 1980, 640, t, { rim: '255,40,50', rimA: 1 });
      fx.fog(ctx, 0.5, { alpha: 0.08, speed: 10, scale: 6, offset: 900 });
    },
    post: () => ({ uFilm: 0.5, uGrain: 0.1, uVignette: 1.0, uSat: 0.85, uContrast: 1.2, uAberr: 3, uScan: 0.12, uCurve: 0.04, uTint: [1.05, 0.95, 0.9], uTintAmt: 0.3, uBloom: 0.5 }),
    overlay(ctx) {
      Art.title(ctx, 'NÃO FAÇA A', 540, 330, 110);
      Art.title(ctx, 'MENINA CHORAR', 540, 465, 106, { fill: P.bloodHi, glow: 36 });
      Art.title(ctx, 'QUEM VOCÊ', 540, 1420, 104);
      Art.title(ctx, 'ESCOLHE?', 540, 1545, 120, { fill: P.gold, font: 'party', lw: 0.1 });
      // carimbo "A, B OU C?" + timer
      Art.timer(ctx, 850, 650, 64, 0.4, 3, 0.5);
      Art.stamp(ctx, 'ENIGMA', 200, 650, 50, 1, { rot: -0.1 });
      if (icon) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.drawImage(icon, 470, 1610, 140, 105);
        ctx.restore();
      }
    },
  });
})();
