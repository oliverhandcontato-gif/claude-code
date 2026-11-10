/* ECHO VALLEY — reel de terror/suspense, 9:16, 30 s, final de suspense aberto.
 * As imagens são só o "cenário": câmera, neblina, chuva, relâmpago, VHS, glitches,
 * a silhueta, as legendas e TODO o som são gerados por código.
 *
 * Easter egg para o replay: a silhueta aparece escondida no relâmpago e em cada
 * plano da fita, cada vez mais perto.
 */
(function () {
  'use strict';
  const R = window.Reel;
  const { W, H, fx } = R;
  const T = R.text, E = R.ease;

  const DUR = 30;
  const MAP = [0.134, 2.9], AERIAL = [2.6, 6.7], RAIN = [6.4, 10.2], INSERT = [10.2, 10.9];
  const TAPE0 = 10.9, TAPE1 = 20.5, FOREST = [20.5, 27.4], END0 = 27.4;
  const STRIKES = [8.0];
  const SECOND = [24.0, 25.6]; // segunda silhueta surgindo na floresta

  // Recortes das colagens (pixels do arquivo original).
  const CROPS = {
    building: ['schoolA', [660, 55, 890, 860]],
    corridorA: ['schoolA', [55, 215, 510, 980]],
    pool: ['schoolA', [765, 1000, 770, 545]],
    classroom: ['schoolB', [425, 42, 560, 508]],
    field: ['schoolC', [422, 38, 568, 450]],
    classroom2: ['schoolC', [445, 538, 540, 452]],
  };
  // Planos da fita. fig = [u, v, altura] da silhueta, em frações do recorte (cada vez mais perto).
  const SHOTS = [
    { crop: 'building', fx: 0.5, fy: 0.55, z: [1.04, 1.12], fig: [0.497, 0.758, 0.11] },
    { crop: 'corridorA', fx: 0.5, fy: 0.5, z: [1.02, 1.1], fig: [0.49, 0.452, 0.075] },
    { crop: 'classroom', fx: 0.52, fy: 0.5, z: [1.03, 1.1], fig: [0.6, 0.76, 0.34] },
    { crop: 'pool', fx: 0.5, fy: 0.5, z: [1.03, 1.1], fig: [0.53, 0.56, 0.28] },
    { crop: 'field', fx: 0.5, fy: 0.55, z: [1.03, 1.12], fig: [0.45, 0.86, 0.44] },
    { crop: 'classroom2', fx: 0.5, fy: 0.5, z: [1.04, 1.14], fig: [0.55, 0.86, 0.74] },
  ];
  const SHOT_D = (TAPE1 - TAPE0) / SHOTS.length;

  const LOCATION = ['ECHO VALLEY, OREGON', 'POP. 2.314'];
  const LOC_T = [3.0, 4.1];

  const CAPTIONS = [
    { start: 0.3, end: 2.85, text: 'ESSA CIDADE NÃO EXISTE EM *NENHUM* MAPA.', y: 560, size: 92, stagger: 0.14 },
    { start: 4.4, end: 6.6, text: 'EM 1997, *TODOS* DESAPARECERAM.', size: 90 },
    { start: 6.75, end: 8.4, text: 'A POLÍCIA SÓ ACHOU UMA COISA:' },
    { start: 8.6, end: 10.15, text: 'UMA *FITA VHS* NA ESCOLA.', size: 90 },
    { start: 11.1, end: 13.4, text: '47 MINUTOS DE CORREDORES VAZIOS…' },
    { start: 13.6, end: 15.8, text: 'ATÉ VOCÊ PERCEBER' },
    { start: 16.0, end: 18.2, text: 'QUE TEM *ALGUÉM*…' },
    { start: 18.3, end: 20.45, text: 'EM *TODAS* AS CENAS.', size: 96 },
    { start: 21.0, end: 23.3, text: 'A ÚLTIMA CENA FOI GRAVADA AQUI.' },
    { start: 23.6, end: 25.4, text: 'OLHA COM ATENÇÃO…' },
    { start: 25.6, end: 27.35, text: 'ELE *NÃO ESTÁ SOZINHO.*', size: 96, stagger: 0.14 },
    { start: 27.9, end: 29.7, text: 'A FITA *CONTINUA* RODANDO…' },
  ];

  let A, seqLayer, tapeLayer;

  const clock = (sec) => {
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600) % 24, m = Math.floor(sec / 60) % 60, s = sec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${h >= 12 ? 'PM' : 'AM'} ${pad(h % 12 || 12)}:${pad(m)}:${pad(s)}`;
  };
  // relógio da fita: corre durante a fita e continua no final
  const tapeClock = (t) => 23 * 3600 + 41 * 60 + 7 + (t - TAPE0) * 140;

  // ---------------- cenas ----------------

  function sceneFlash(ctx, t) {
    ctx.filter = 'grayscale(1) contrast(2.2) brightness(1.3)';
    R.drawCover(ctx, A.forest, { zoom: 2.3, fx: 0.532, fy: 0.2 });
    ctx.filter = 'none';
    fx.tint(ctx, '#a00', 0.45, 'multiply');
    fx.glitch(ctx, t, 0.9, 2);
  }

  function sceneMap(ctx, t) {
    const p = E.inOutCubic(R.prog(t, MAP[0], MAP[1] + 0.3));
    const flick = 0.9 + 0.1 * R.noise1(t * 18, 4);
    const [sx, sy] = fx.shake(t, 4, 7, 1);
    ctx.filter = `sepia(0.35) contrast(1.15) saturate(0.85) brightness(${(0.82 * flick).toFixed(3)})`;
    const cam = R.drawCover(ctx, A.map, { zoom: R.lerp(1.06, 1.5, p), fx: R.lerp(0.36, 0.22, p), fy: R.lerp(0.5, 0.44, p), ox: sx, oy: sy });
    ctx.filter = 'none';
    const [cx, cy] = cam.map(0.172, 0.403);
    fx.scribble(ctx, cx, cy, 0.12 * cam.dw, E.outCubic(R.prog(t, 0.45, 1.2)), { width: 10, seed: 3 });
    fx.glitch(ctx, t, 1 - R.prog(t, MAP[0], 0.3), 5);
  }

  function sceneAerial(ctx, t) {
    const [a, b] = AERIAL;
    const p = E.inOutSine(R.prog(t, a, b));
    ctx.filter = 'saturate(0.7) brightness(0.8) contrast(1.08)';
    R.drawCover(ctx, A.aerial, { zoom: R.lerp(1.0, 1.4, p), fx: R.lerp(0.5, 0.52, p), fy: R.lerp(0.42, 0.5, p) });
    ctx.filter = 'none';
    fx.tint(ctx, '#1d2b33', 0.35, 'soft-light');
    const thick = R.lerp(0.95, 0.3, E.outCubic(R.prog(t, a, a + 2.6)));
    fx.fog(ctx, t, { alpha: thick, speed: -25, scale: 7, mode: 'source-over', offset: 100 });
    fx.fog(ctx, t, { alpha: thick * 0.7, speed: 40, scale: 4, offset: 500 });
    fx.tint(ctx, 'rgb(200,205,210)', R.lerp(0.85, 0, E.outCubic(R.prog(t, a, a + 1.4))));
    LOCATION.forEach((s, i) => T.type(ctx, t, { start: LOC_T[i], end: b, text: s, x: 90, y: 330 + i * 62, size: i ? 38 : 46, cursor: i === 1 }));
  }

  function sceneRain(ctx, t) {
    const p = E.inOutSine(R.prog(t, RAIN[0], RAIN[1]));
    const L = fx.lightning(t, STRIKES);
    ctx.filter = `saturate(0.55) brightness(${(0.72 + L * 0.9).toFixed(3)}) contrast(${(1.1 + L * 0.3).toFixed(3)})`;
    const cam = R.drawCover(ctx, A.rainy, { zoom: R.lerp(1.06, 1.22, p), fx: 0.62, fy: 0.56 });
    ctx.filter = 'none';
    fx.tint(ctx, '#0f2230', 0.4, 'soft-light');
    for (const [u, v, a, flick] of [[0.477, 0.567, 0.5, 0], [0.722, 0.559, 0.5, 1], [0.407, 0.533, 0.35, 0]]) {
      const [x, y] = cam.map(u, v);
      const k = flick ? (R.noise1(t * 9, 8) > -0.1 ? 1 : 0.15) : 1;
      fx.glow(ctx, x, y, 150, '255,190,110', a * k);
    }
    const [hx, hy] = cam.map(0.84, 0.575);
    fx.glow(ctx, hx, hy, 220, '255,170,90', 0.3);
    fx.rain(ctx, t, { count: 260, speed: 1900, len: 45, alpha: 0.18, width: 1.5, seed: 3 });
    fx.rain(ctx, t, { count: 160, speed: 3000, len: 95, alpha: 0.3, width: 2.5, seed: 7 });
    fx.tint(ctx, 'rgb(220,230,255)', L * 0.55, 'screen');
    if (L > 0.02) {
      const [x, y] = cam.map(0.63, 0.62);
      fx.figure(ctx, x, y, 0.11 * cam.dh, R.clamp(L * 2.5));
    }
  }

  function sceneInsert(ctx, t) {
    if (t < 10.4 || t >= 10.75) {
      fx.static(ctx, t, 1);
      return;
    }
    const g = tapeLayer.getContext('2d');
    R.resetCtx(g);
    g.fillStyle = '#1b2fa8';
    g.fillRect(0, 0, W, H);
    fx.vhs(ctx, tapeLayer, t, { filter: 'none' });
    fx.osd(ctx, t, { tl: 'PLAY ►', tr: '' });
  }

  function sceneTape(ctx, t) {
    const k = Math.min(SHOTS.length - 1, Math.floor((t - TAPE0) / SHOT_D));
    const s = SHOTS[k], lt = t - TAPE0 - k * SHOT_D, lp = lt / SHOT_D;
    const [img, crop] = CROPS[s.crop];
    const g = tapeLayer.getContext('2d');
    R.resetCtx(g);
    const cam = R.drawCover(g, A[img], {
      crop,
      zoom: R.lerp(s.z[0], s.z[1], lp),
      fx: s.fx + R.noise1(t * 0.8, k + 20) * 0.012,
      fy: s.fy + R.noise1(t * 0.7, k + 40) * 0.01,
    });
    const [u, v, h] = s.fig;
    const [x, y] = cam.map(u, v);
    fx.figure(g, x + R.noise1(t * 3, k) * 2, y, h * cam.dh, 0.85);
    fx.vhs(ctx, tapeLayer, t);
    if (k > 0 && lt < 0.07) fx.glitch(ctx, t, 0.7, k);
    fx.osd(ctx, t, { bl1: 'OCT. 14 1997', bl2: clock(tapeClock(t)) });
  }

  function sceneForest(ctx, t) {
    const [a, b] = FOREST;
    const p = E.inOutSine(R.prog(t, a, b));
    ctx.filter = 'saturate(0.85) brightness(0.86) contrast(1.12)';
    const cam = R.drawCover(ctx, A.forest, { zoom: R.lerp(1.0, 1.45, p), fx: 0.532, fy: R.lerp(0.42, 0.32, p) });
    ctx.filter = 'none';
    // segunda silhueta, mais perto, surgindo devagar na névoa
    const [x, y] = cam.map(0.37, 0.7);
    fx.figure(ctx, x + R.noise1(t * 2, 4) * 2, y, 0.42 * cam.dh, 0.8 * E.inOutSine(R.prog(t, SECOND[0], SECOND[1])));
    fx.fog(ctx, t, { alpha: 0.22, speed: -18, scale: 6, offset: 300 });
    if (t < a + 0.3) {
      const k = 1 - R.prog(t, a, a + 0.3);
      fx.glitch(ctx, t, k, 9);
      fx.static(ctx, t, k * 0.6);
    }
    fx.tint(ctx, '#000', R.prog(t, b - 0.8, b) * 0.4);
  }

  function sceneEnd(ctx, t) {
    ctx.fillStyle = '#050506';
    ctx.fillRect(0, 0, W, H);
    fx.static(ctx, t, R.lerp(0.9, 0.05, E.outCubic(R.prog(t, END0, END0 + 0.5))));
    fx.osd(ctx, t, { tl: 'PLAY ►', tr: 'SP', bl1: 'OCT. 14 1997', bl2: clock(tapeClock(t)) });
    ctx.save();
    ctx.font = T.mono(28);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.globalAlpha = R.prog(t, 28.2, 28.8);
    ctx.fillText('história de ficção', W / 2, 1560);
    ctx.restore();
  }

  const SCENES = [
    { start: 0, end: MAP[0], draw: sceneFlash },
    { start: MAP[0], end: MAP[1], draw: sceneMap },
    { start: AERIAL[0], end: AERIAL[1], draw: sceneAerial, fadeIn: 0.3 },
    { start: RAIN[0], end: RAIN[1], draw: sceneRain, fadeIn: 0.3 },
    { start: INSERT[0], end: INSERT[1], draw: sceneInsert },
    { start: TAPE0, end: TAPE1, draw: sceneTape },
    { start: FOREST[0], end: FOREST[1], draw: sceneForest },
    { start: END0, end: DUR + 1, draw: sceneEnd },
  ];

  // ---------------- trilha sonora ----------------

  const MELODY = [880, 659.25, 1046.5, 987.77, 880, 659.25, 622.25, 659.25, 880, 659.25, 1046.5, 1174.66, 1046.5, 987.77, 830.61, 880];

  function heartbeats(S, AU, t0, t1, b0, b1, gain) {
    for (let t = t0; t < t1; ) {
      const k = R.prog(t, t0, t1);
      AU.heartbeat(S, t, { gain: gain * (0.8 + 0.4 * k) });
      t += 60 / R.lerp(b0, b1, k);
    }
  }

  function audio(S, AU) {
    // gancho
    AU.static(S, 0, 0.14, { gain: 0.7 });
    AU.boom(S, MAP[0], { gain: 1 });
    AU.drone(S, 0.13, RAIN[1] + 0.1, { base: 49, gain: 0.22 });
    heartbeats(S, AU, 0.5, 2.7, 60, 64, 0.7);
    // cidade
    AU.whoosh(S, 2.35, { dur: 0.6, gain: 0.5, from: 3000, to: 300 });
    AU.wind(S, AERIAL[0], RAIN[1], { gain: 0.3 });
    for (let i = 0, t = 3.0; t < 9.8; i++, t += 0.62) {
      const fade = Math.max(R.env(t, 3.0, 9.8, 1.0, 1.2), 0.01);
      AU.musicBox(S, t, MELODY[i % MELODY.length], { gain: 0.16 * fade, detune: -(t - 3) * 4 + R.noise1(t * 0.7, 3) * 12 });
    }
    LOCATION.forEach((s, i) => T.typeTimes(LOC_T[i], s, 20).forEach((t, j) => AU.click(S, t, { seed: i * 50 + j })));
    AU.whoosh(S, 6.2, { dur: 0.5, gain: 0.35 });
    // chuva
    AU.rain(S, RAIN[0], RAIN[1], { gain: 0.4 });
    STRIKES.forEach((t) => AU.thunder(S, t));
    // fita
    AU.static(S, INSERT[0], 0.2, { gain: 0.5 });
    AU.tapeClunk(S, 10.3);
    AU.static(S, 10.75, 0.15, { gain: 0.4, seed: 4 });
    AU.vhsBed(S, 10.4, TAPE1, { gain: 0.2 });
    AU.drone(S, TAPE0, TAPE1, { base: 46.25, gain: 0.26, cutoff: 420 });
    heartbeats(S, AU, TAPE0, TAPE1, 70, 115, 0.75);
    for (let k = 1; k < SHOTS.length; k++) AU.blip(S, TAPE0 + k * SHOT_D, { seed: k });
    // floresta — a tensão cai em vez de explodir
    AU.static(S, TAPE1 - 0.02, 0.3, { gain: 0.6, seed: 5 });
    AU.drone(S, FOREST[0], FOREST[1], { base: 41.2, gain: 0.32, cutoff: 260, fin: 1.5, fout: 0.4 });
    AU.wind(S, FOREST[0], FOREST[1], { gain: 0.2, center: 350, fout: 0.4 });
    heartbeats(S, AU, 20.7, 25.4, 115, 92, 0.85);
    AU.subDrop(S, 25.6, { gain: 0.55, dur: 1.8 });
    AU.whisper(S, 25.9, 1.3, { gain: 0.3 });
    // final aberto: a fita continua rodando
    AU.static(S, END0 - 0.02, 0.5, { gain: 0.5, seed: 6 });
    AU.vhsBed(S, END0 + 0.3, DUR, { gain: 0.14 });
    AU.whisper(S, 28.7, 0.9, { gain: 0.18, seed: 9 });
    // impacto na primeira palavra em *ênfase* de cada legenda
    for (const c of CAPTIONS) {
      const w = T.wordTimes(c).find((w) => w.em);
      if (w && w.t < 25) AU.boom(S, w.t, { gain: 0.5, decay: 1.5, freq: 55 });
    }
  }

  // ---------------- projeto ----------------

  R.mount({
    duration: DUR,
    poster: 17.0,
    assets: {
      map: 'assets/map.jpg',
      aerial: 'assets/aerial.jpg',
      rainy: 'assets/rainy-crossing.jpg',
      schoolA: 'assets/school-a.jpg',
      schoolB: 'assets/school-b.jpg',
      schoolC: 'assets/school-c.jpg',
      forest: 'assets/forest-figure.jpg',
    },
    setup(assets) {
      A = assets;
      seqLayer = R.canvas(W, H);
      tapeLayer = R.canvas(W, H);
    },
    render(ctx, t) {
      R.sequence(ctx, t, SCENES, seqLayer);
      const inTape = t >= INSERT[0] && t < TAPE1;
      fx.grain(ctx, t, inTape ? 0.16 : 0.22);
      fx.vignette(ctx, inTape ? 0.6 : 0.85);
      for (const c of CAPTIONS) T.caption(ctx, t, c);
      fx.tint(ctx, '#000', R.prog(t, DUR - 0.4, DUR));
    },
    audio,
  });
})();
