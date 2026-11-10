/* ECHO VALLEY — reel de terror/suspense, 9:16, 42 s.
 * As imagens são só o "cenário": câmera, neblina, chuva, relâmpagos, VHS, glitches,
 * a silhueta, as legendas e TODO o som são gerados por código.
 *
 * Easter egg para o replay: a silhueta aparece escondida em quase todas as cenas
 * (rua, relâmpago, cada plano da fita), cada vez mais perto.
 */
(function () {
  'use strict';
  const R = window.Reel;
  const { W, H, fx } = R;
  const T = R.text, E = R.ease;

  const DUR = 42;
  const TAPE0 = 20.0, TAPE1 = 31.4;
  const JUMP = 36.6; // susto
  const STRIKES = [16.55];

  // Recortes das colagens (pixels do arquivo original).
  const CROPS = {
    building: ['schoolA', [660, 55, 890, 860]],
    corridorA: ['schoolA', [55, 215, 510, 980]],
    pool: ['schoolA', [765, 1000, 770, 545]],
    classroom: ['schoolB', [425, 42, 560, 508]],
    trophies: ['schoolB', [488, 615, 492, 375]],
    field: ['schoolC', [422, 38, 568, 450]],
    classroom2: ['schoolC', [445, 538, 540, 452]],
  };
  // Planos da fita. fig = [u, v, altura] da silhueta, em frações do recorte.
  const SHOTS = [
    { crop: 'building', fx: 0.5, fy: 0.55, z: [1.04, 1.12], fig: [0.497, 0.758, 0.12] },
    { crop: 'corridorA', fx: 0.5, fy: 0.5, z: [1.02, 1.1], fig: [0.49, 0.452, 0.075] },
    { crop: 'classroom', fx: 0.52, fy: 0.5, z: [1.03, 1.1], fig: [0.6, 0.78, 0.42] },
    { crop: 'trophies', fx: 0.68, fy: 0.5, z: [1.03, 1.1], fig: [0.86, 0.5, 0.24] },
    { crop: 'pool', fx: 0.5, fy: 0.5, z: [1.03, 1.1], fig: [0.53, 0.56, 0.32] },
    { crop: 'field', fx: 0.5, fy: 0.55, z: [1.03, 1.12], fig: [0.45, 0.86, 0.5] },
    { crop: 'classroom2', fx: 0.5, fy: 0.5, z: [1.04, 1.14], fig: [0.55, 0.86, 0.78] },
  ];
  const SHOT_D = (TAPE1 - TAPE0) / SHOTS.length;

  const LOCATION = ['ECHO VALLEY, OREGON', 'POP. 2.314'];
  const LOC_T = [3.9, 5.15];

  const CAPTIONS = [
    { start: 0.3, end: 3.25, text: 'ESSA CIDADE NÃO EXISTE EM *NENHUM* MAPA.', y: 560, size: 92, stagger: 0.16 },
    { start: 5.5, end: 7.2, text: 'EM 14 DE OUTUBRO DE 1997…' },
    { start: 7.35, end: 9.15, text: '*TODOS* DESAPARECERAM.', size: 96 },
    { start: 9.5, end: 11.35, text: 'OS CARROS FICARAM.' },
    { start: 11.5, end: 14.0, text: 'MAS *NINGUÉM* NUNCA VOLTOU.' },
    { start: 14.3, end: 16.45, text: 'A POLÍCIA SÓ ACHOU UMA COISA:' },
    { start: 16.9, end: 19.0, text: 'UMA *FITA VHS* ESCONDIDA NA ESCOLA.' },
    { start: 20.3, end: 22.95, text: '47 MINUTOS DE CORREDORES VAZIOS…' },
    { start: 23.2, end: 25.6, text: 'ATÉ VOCÊ PERCEBER' },
    { start: 25.8, end: 28.4, text: 'QUE TEM *ALGUÉM*…' },
    { start: 28.6, end: 31.35, text: 'EM *TODAS* AS CENAS.', size: 96 },
    { start: 31.9, end: 34.1, text: 'A ÚLTIMA CENA DA FITA FOI GRAVADA AQUI.' },
    { start: 34.3, end: 35.6, text: 'E QUEM ESTAVA FILMANDO…' },
    { start: 35.7, end: 36.6, text: '*NUNCA SAIU.*', size: 116, stagger: 0.12 },
    { start: 37.7, end: 41.6, text: 'ASSISTE DE NOVO.', y: 800, size: 100 },
    { start: 38.7, end: 41.6, text: 'EM QUANTAS CENAS VOCÊ VIU *ELE*?', y: 1040, size: 78 },
  ];
  const END_TYPE = { start: 39.7, end: 41.6, text: '↓ responde nos comentários', x: W / 2, y: 1260, size: 40, cps: 24, align: 'center', color: '#bbb' };

  let A, seqLayer, tapeLayer;

  // ---------------- cenas ----------------

  function sceneFlash(ctx, t) {
    ctx.filter = 'grayscale(1) contrast(2.2) brightness(1.3)';
    R.drawCover(ctx, A.forest, { zoom: 2.3, fx: 0.532, fy: 0.2 });
    ctx.filter = 'none';
    fx.tint(ctx, '#a00', 0.45, 'multiply');
    fx.glitch(ctx, t, 0.9, 2);
  }

  function sceneMap(ctx, t) {
    const p = E.inOutCubic(R.prog(t, 0.13, 3.5));
    const flick = 0.9 + 0.1 * R.noise1(t * 18, 4);
    const [sx, sy] = fx.shake(t, 4, 7, 1);
    ctx.filter = `sepia(0.35) contrast(1.15) saturate(0.85) brightness(${(0.82 * flick).toFixed(3)})`;
    const cam = R.drawCover(ctx, A.map, { zoom: R.lerp(1.06, 1.5, p), fx: R.lerp(0.36, 0.22, p), fy: R.lerp(0.5, 0.44, p), ox: sx, oy: sy });
    ctx.filter = 'none';
    const [cx, cy] = cam.map(0.172, 0.403);
    fx.scribble(ctx, cx, cy, 0.12 * cam.dw, E.outCubic(R.prog(t, 0.45, 1.25)), { width: 10, seed: 3 });
    fx.glitch(ctx, t, 1 - R.prog(t, 0.13, 0.3), 5);
  }

  function sceneAerial(ctx, t) {
    const p = E.inOutSine(R.prog(t, 3.2, 9.5));
    ctx.filter = 'saturate(0.7) brightness(0.8) contrast(1.08)';
    R.drawCover(ctx, A.aerial, { zoom: R.lerp(1.0, 1.45, p), fx: R.lerp(0.5, 0.52, p), fy: R.lerp(0.42, 0.5, p) });
    ctx.filter = 'none';
    fx.tint(ctx, '#1d2b33', 0.35, 'soft-light');
    const thick = R.lerp(0.95, 0.3, E.outCubic(R.prog(t, 3.2, 6.2)));
    fx.fog(ctx, t, { alpha: thick, speed: -25, scale: 7, mode: 'source-over', offset: 100 });
    fx.fog(ctx, t, { alpha: thick * 0.7, speed: 40, scale: 4, offset: 500 });
    fx.tint(ctx, 'rgb(200,205,210)', R.lerp(0.85, 0, E.outCubic(R.prog(t, 3.2, 4.8))));
    LOCATION.forEach((s, i) => T.type(ctx, t, { start: LOC_T[i], end: 9.2, text: s, x: 90, y: 330 + i * 62, size: i ? 38 : 46, cursor: i === 1 }));
  }

  function sceneStreet(ctx, t) {
    const p = E.inOutSine(R.prog(t, 9.2, 14.3));
    ctx.filter = 'saturate(0.35) brightness(0.7) contrast(1.18)';
    const cam = R.drawCover(ctx, A.street, { zoom: R.lerp(1.05, 1.32, p), fx: 0.56, fy: 0.6 });
    ctx.filter = 'none';
    fx.tint(ctx, '#16303d', 0.45, 'soft-light');
    const [x, y] = cam.map(0.566, 0.652);
    fx.figure(ctx, x, y, 0.03 * cam.dh, 0.9);
    fx.fog(ctx, t, { alpha: 0.18, speed: 15, scale: 6, offset: 900 });
    fx.dust(ctx, t, { count: 40, seed: 4, alpha: 0.35 });
  }

  function sceneRain(ctx, t) {
    const p = E.inOutSine(R.prog(t, 14.0, 19.0));
    const L = fx.lightning(t, STRIKES);
    ctx.filter = `saturate(0.55) brightness(${(0.72 + L * 0.9).toFixed(3)}) contrast(${(1.1 + L * 0.3).toFixed(3)})`;
    const cam = R.drawCover(ctx, A.rainy, { zoom: R.lerp(1.06, 1.22, p), fx: 0.62, fy: 0.56 });
    ctx.filter = 'none';
    fx.tint(ctx, '#0f2230', 0.4, 'soft-light');
    const lamps = [[0.477, 0.567, 0.5, 0], [0.722, 0.559, 0.5, 1], [0.407, 0.533, 0.35, 0]];
    for (const [u, v, a, flick] of lamps) {
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
    if (t < 19.35 || t >= 19.85) {
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

  const clock = (sec) => {
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600) % 24, m = Math.floor(sec / 60) % 60, s = sec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${h >= 12 ? 'PM' : 'AM'} ${pad(h % 12 || 12)}:${pad(m)}:${pad(s)}`;
  };

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
    fx.figure(g, x + R.noise1(t * 3, k) * 2, y, h * cam.dh, 0.93);
    fx.vhs(ctx, tapeLayer, t);
    if (k > 0 && lt < 0.07) fx.glitch(ctx, t, 0.7, k);
    fx.osd(ctx, t, { bl1: 'OCT. 14 1997', bl2: clock(23 * 3600 + 41 * 60 + 7 + k * 397 + lt) });
  }

  function sceneForest(ctx, t) {
    const pre = E.inCubic(R.prog(t, 31.4, JUMP));
    let zoom = R.lerp(1.0, 1.6, pre), fy = R.lerp(0.42, 0.28, pre), sh = [0, 0];
    const jumping = t >= JUMP;
    if (jumping) {
      const j = E.outExpo(R.prog(t, JUMP, JUMP + 0.13));
      zoom = R.lerp(1.6, 3.6, j);
      fy = R.lerp(0.28, 0.17, j);
      sh = fx.shake(t, 40, 30, 7);
    }
    ctx.filter = jumping ? 'saturate(1.3) contrast(1.6) brightness(1.15)' : 'saturate(0.85) brightness(0.88) contrast(1.12)';
    R.drawCover(ctx, A.forest, { zoom, fx: 0.532, fy, ox: sh[0], oy: sh[1] });
    ctx.filter = 'none';
    fx.fog(ctx, t, { alpha: 0.22, speed: -18, scale: 6, offset: 300 });
    if (t < 31.7) {
      const k = 1 - R.prog(t, 31.4, 31.7);
      fx.glitch(ctx, t, k, 9);
      fx.static(ctx, t, k * 0.6);
    }
    if (jumping) {
      fx.tint(ctx, '#c00', 0.45, 'multiply');
      const f = R.frameOf(t - JUMP);
      if (f === 0 || f === 3) fx.invert(ctx, 1);
      if (f === 1) fx.tint(ctx, '#fff', 0.8);
      fx.glitch(ctx, t, 1 - R.prog(t, JUMP, 37.4) * 0.6, 13);
      fx.static(ctx, t, R.prog(t, 37.0, 37.4));
    }
  }

  function sceneEnd(ctx, t) {
    ctx.fillStyle = '#050506';
    ctx.fillRect(0, 0, W, H);
    fx.static(ctx, t, R.lerp(0.9, 0.06, E.outCubic(R.prog(t, 37.4, 37.9))));
    ctx.save();
    ctx.font = T.mono(28);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.globalAlpha = R.prog(t, 38.2, 38.8);
    ctx.fillText('história de ficção', W / 2, 1440);
    ctx.restore();
  }

  const SCENES = [
    { start: 0, end: 0.134, draw: sceneFlash },
    { start: 0.134, end: 3.5, draw: sceneMap },
    { start: 3.2, end: 9.5, draw: sceneAerial, fadeIn: 0.3 },
    { start: 9.2, end: 14.3, draw: sceneStreet, fadeIn: 0.3 },
    { start: 14.0, end: 19.0, draw: sceneRain, fadeIn: 0.3 },
    { start: 19.0, end: TAPE0, draw: sceneInsert },
    { start: TAPE0, end: TAPE1, draw: sceneTape },
    { start: TAPE1, end: 37.4, draw: sceneForest },
    { start: 37.4, end: DUR + 1, draw: sceneEnd },
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
    AU.boom(S, 0.134, { gain: 1 });
    AU.drone(S, 0.13, 19.2, { base: 49, gain: 0.22 });
    heartbeats(S, AU, 0.5, 3.2, 60, 64, 0.7);
    // cidade
    AU.whoosh(S, 2.95, { dur: 0.6, gain: 0.5, from: 3000, to: 300 });
    AU.wind(S, 3.2, 14.3, { gain: 0.32 });
    for (let i = 0, t = 3.6; t < 18.4; i++, t += 0.62) {
      const fade = Math.max(R.env(t, 3.6, 18.4, 1.2, 1.5), 0.01);
      AU.musicBox(S, t, MELODY[i % MELODY.length], { gain: 0.16 * fade, detune: -(t - 3.6) * 3 + R.noise1(t * 0.7, 3) * 12 });
    }
    LOCATION.forEach((s, i) => T.typeTimes(LOC_T[i], s, 20).forEach((t, j) => AU.click(S, t, { seed: i * 50 + j })));
    AU.whoosh(S, 9.0, { dur: 0.5, gain: 0.35 });
    AU.whoosh(S, 13.8, { dur: 0.5, gain: 0.35 });
    // chuva
    AU.rain(S, 14.0, 19.0, { gain: 0.4 });
    STRIKES.forEach((t) => AU.thunder(S, t));
    // fita
    AU.static(S, 19.0, 0.35, { gain: 0.5 });
    AU.tapeClunk(S, 19.3);
    AU.static(S, 19.82, 0.2, { gain: 0.4, seed: 4 });
    AU.vhsBed(S, 19.35, TAPE1, { gain: 0.2 });
    AU.drone(S, TAPE0, TAPE1, { base: 46.25, gain: 0.26, cutoff: 420 });
    heartbeats(S, AU, TAPE0, TAPE1, 70, 120, 0.75);
    for (let k = 1; k < SHOTS.length; k++) AU.blip(S, TAPE0 + k * SHOT_D, { seed: k });
    // floresta + susto
    AU.static(S, TAPE1 - 0.02, 0.3, { gain: 0.6, seed: 5 });
    AU.drone(S, TAPE1, 36.3, { base: 41.2, gain: 0.34, cutoff: 260, fout: 0.25 });
    AU.wind(S, TAPE1, 36.3, { gain: 0.22, center: 350, fout: 0.3 });
    heartbeats(S, AU, 31.6, 36.0, 120, 150, 0.85);
    AU.riser(S, 34.2, 36.25, { gain: 0.5 });
    AU.sting(S, JUMP, { gain: 1.1 });
    AU.boom(S, JUMP, { gain: 1, freq: 40, decay: 3 });
    AU.static(S, 37.15, 0.9, { gain: 0.45, seed: 6 });
    // final
    AU.subDrop(S, 37.7, { gain: 0.6 });
    T.typeTimes(END_TYPE.start, END_TYPE.text, END_TYPE.cps).forEach((t, j) => AU.click(S, t, { gain: 0.12, seed: 200 + j }));
    AU.whisper(S, 40.4, 1.3, { gain: 0.3 });
    // impacto em toda palavra em *ênfase* (sincronizado com a legenda)
    for (const c of CAPTIONS) {
      for (const w of T.wordTimes(c)) if (w.em && w.t < JUMP - 0.5) AU.boom(S, w.t, { gain: 0.5, decay: 1.5, freq: 55 });
    }
  }

  // ---------------- projeto ----------------

  R.mount({
    duration: DUR,
    poster: 26.5,
    assets: {
      map: 'assets/map.jpg',
      aerial: 'assets/aerial.jpg',
      street: 'assets/street.jpg',
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
      const inTape = t >= 19.0 && t < TAPE1;
      fx.grain(ctx, t, inTape ? 0.16 : 0.22);
      fx.vignette(ctx, inTape ? 0.6 : 0.85);
      for (const c of CAPTIONS) T.caption(ctx, t, c);
      T.type(ctx, t, END_TYPE);
      fx.tint(ctx, '#000', R.prog(t, 41.5, DUR));
    },
    audio,
  });
})();
