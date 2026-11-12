/* TOCA DOS COOKIES — "Toda mesa de Ordem Paranormal tem esses 5 agentes"
 * Voz: locução gerada no CellCog (assets/voz.wav, tempos por palavra em assets/palavras.json).
 * Imagens: footage do Mixkit (shots.json / prepare.cjs). Por código: D20 3D, fichas de agente,
 * carimbos, selos, marcações, cartela da página, legendas, grading, trilha e efeitos sonoros.
 */
(async function () {
  'use strict';
  const R = window.Reel, K = R.kin, E = R.ease, fx = R.fx, Art = window.Art;
  const { W, H } = R;
  const CACHE = '../../out/cache/toca-cookies-agentes/';
  const { shots: SHOTS } = await (await fetch('shots.json')).json();
  const DUR = 67.6, TAU_END = 57.4;
  const MAN = await (await fetch(CACHE + 'manifest.json')).json();
  // Voz: gravação do próprio dono da página (limpa e editada), com tempos por palavra.
  // A edição foi montada na linha do tempo da locução antiga ("tempo do roteiro", τ);
  // `warp` leva τ -> tempo real da voz nova e `unwarp` faz o caminho inverso.
  const WORDS = await (await fetch('assets/palavras-voz-propria.json')).json();
  const ANCHORS = await (await fetch('assets/sincronia-voz-propria.json')).json();
  const VOICE_END = 67.26;
  const pw = (pairs, t) => {
    if (t <= pairs[0][0]) return pairs[0][1] + (t - pairs[0][0]);
    for (let i = 1; i < pairs.length; i++) {
      const [a0, b0] = pairs[i - 1], [a1, b1] = pairs[i];
      if (t <= a1) return b0 + ((t - a0) / (a1 - a0)) * (b1 - b0);
    }
    const [a, b] = pairs[pairs.length - 1];
    return b + (t - a);
  };
  const warp = (tau) => pw(ANCHORS, tau);
  const unwarp = (t) => pw(ANCHORS.map(([a, b]) => [b, a]), t);

  // ---------------- legendas (geradas dos tempos da voz) ----------------
  const EM = new Set(['ordem', 'paranormal', 'você', 'ocultista', 'ritual', 'tudo', 'sanidade', 'combatente', 'sozinho', 'lanterna', 'aguentou', 'especialista', 'criatura', 'doze', 'morreu', 'cinco', 'perigoso', 'amaldiçoado', 'marca', 'morre', 'escritor', 'curioso']);
  const clean = (s) => s.toLowerCase().replace(/[^\p{L}]/gu, '');
  const CAPS = [];
  let chunk = [];
  WORDS.forEach((wd, i) => {
    chunk.push(wd);
    const endPunct = /[.,?…:!"]$/.test(wd.word), next = WORDS[i + 1];
    if (endPunct || chunk.length >= 4 || !next || next.start - wd.end > 0.35) {
      CAPS.push({
        style: 'horror', y: 1440, size: 84, maxW: 900, jitter: 0.12, out: 0,
        words: chunk.map((c) => ({ s: c.word.toUpperCase(), t: c.start, em: EM.has(clean(c.word)) })),
        t1: next ? next.start - 0.01 : VOICE_END + 0.2,
      });
      chunk = [];
    }
  });
  const wt = (word, after = 0) => WORDS.find((w) => clean(w.word) === word && w.start >= after).start;

  // ---------------- fichas ----------------
  const counter = (a, b, t0, t1, suffix = '') => (t) => `${Math.round(R.lerp(a, b, E.outCubic(R.prog(t, t0, t1))))}${suffix}`;
  const CARDS = [
    { n: 1, t0: 7.44, exit: 11.85, title: 'O|OCULTISTA', cls: 'CLASSE: OCULTISTA', icon: 'eye', accent: '#9b4dff', stats: [
      { label: 'SANIDADE', value: '20/20', bar: 1, t: 7.9 },
      { label: 'RITUAIS CONHECIDOS', value: '1', bar: 0.05, t: 8.96 },
      { label: 'PLANO A', value: 'RITUAL', t: 10.54 },
      { label: 'PLANO B', value: 'RITUAL', t: 10.88, warn: 10.88 }] },
    { n: 2, t0: 18.82, exit: 23.85, title: 'O|COMBATENTE', cls: 'CLASSE: COMBATENTE', icon: 'blade', accent: '#e01b24', stats: [
      { label: 'FORÇA', value: '5', bar: 1, t: 19.3 },
      { label: 'INTELECTO', value: '0', bar: 0.02, t: 19.94, warn: 19.94 },
      { label: 'AMIGOS POR PERTO', value: '0', bar: 0, t: 22.12, warn: 22.12 },
      { label: 'LANTERNA', value: 'NÃO', t: 22.82, warn: 22.82 }] },
    { n: 3, t0: 27.8, exit: 32.6, title: 'O|ESPECIALISTA', cls: 'CLASSE: ESPECIALISTA', icon: 'lens', accent: '#19c2b0', stats: [
      { label: 'INVESTIGAÇÃO', value: '+15', bar: 0.95, t: 28.96 },
      { label: 'GAVETAS ABERTAS', value: counter(0, 47, 29.72, 32.4), t: 29.72 },
      { label: 'PERCEPÇÃO DE PERIGO', value: '0', bar: 0, t: 30.82, warn: 30.82 },
      { label: 'STATUS', value: 'OCUPADO', t: 31.92 }] },
    { n: 4, t0: 35.96, exit: 40.6, title: 'O|ESCRITOR', cls: 'CLASSE: PROTAGONISTA?', icon: 'scroll', accent: '#f0a020', stats: [
      { label: 'BACKSTORY', value: counter(1, 12, 36.68, 37.6, ' PÁG.'), bar: (t) => R.prog(t, 36.68, 37.6), t: 36.68 },
      { label: 'TRAUMAS DE INFÂNCIA', value: '7', t: 37.84 },
      { label: 'NPCS NA FAMÍLIA', value: '23', t: 38.18 },
      { label: 'TEMPO DE TELA', value: '1 CENA', t: 39.4, warn: 39.4 }], stamp: { text: 'MORTO', t: 39.94 } },
    { n: 5, t0: 41.68, exit: 44.05, title: 'O|CURIOSO', cls: 'CLASSE: AMEAÇA AO GRUPO', icon: 'hand', accent: '#ff2a6d', stats: [
      { label: 'BOM SENSO', value: '0', bar: 0, t: 42.12, warn: 42.12 },
      { label: 'CURIOSIDADE', value: '∞', bar: 1, t: 42.3 },
      { label: 'MÃOS NO QUE NÃO DEVE', value: 'SEMPRE', t: 42.78 },
      { label: 'RISCO', value: 'TPK', t: 43.38, warn: 43.38 }] },
  ];
  const ROLLS = [[6.5, 1], [17.6, 2], [26.44, 3], [35.06, 4], [40.9, 5]];
  const TEST_ROLL = 55.24;
  const STAMPS = [
    { text: 'INSANO', t: 16.62, x: 540, y: 900, size: 150, color: '#b44dff', rot: -0.15 },
    { text: 'MORTO', t: 25.88, x: 540, y: 900, size: 170, color: '#ff1f2a', rot: 0.12 },
    { text: 'TPK', t: 48.6, x: 540, y: 880, size: 260, color: '#ff1f2a', rot: -0.1 },
  ];

  // ---------------- footage ----------------
  const SPEED = { 0: 0.8, 11: 0.9, 17: 0.6, 21: 0.7, 22: 0.75, 25: 0.6 };
  const CUT = { 1: 'flash', 2: 'glitch', 4: 'flash', 6: 'flash', 7: 'glitch', 8: 'whip', 12: 'glitch', 13: 'whip', 17: 'glitch', 18: 'whip', 19: 'glitch', 20: 'flash', 22: 'glitch', 23: 'flash', 25: 'flash' };
  const shotAt = (t) => {
    let k = 0;
    for (let i = 0; i < SHOTS.length; i++) if (t >= SHOTS[i].t) k = i;
    return k;
  };
  const shotEnd = (k) => (SHOTS[k + 1] ? SHOTS[k + 1].t : TAU_END);
  const srcIndex = (k, lt) => Math.max(0, Math.min(MAN.shots[k].count - 1, Math.floor(lt * (SPEED[k] || 1) * MAN.fps)));
  const cache = new Map();
  async function getFrame(k, idx) {
    const key = `${k}:${idx}`;
    if (!cache.has(key)) {
      cache.set(key, R.loadImage(`${CACHE}${MAN.shots[k].dir}/${String(idx + 1).padStart(4, '0')}.jpg`));
      if (cache.size > 48) cache.delete(cache.keys().next().value);
    }
    return cache.get(key);
  }
  let cur = null, LOGO = null;
  const kick = (tau) => R.sig.peak(warp(tau), 0.2, 0.6);
  const EMPH_T = CAPS.flatMap((c) => c.words.filter((w) => w.em).map((w) => unwarp(w.t)));

  function camera(k, t) {
    const lt = t - SHOTS[k].t, d = shotEnd(k) - SHOTS[k].t;
    let z = k % 2 ? R.lerp(1.14, 1.05, lt / d) : R.lerp(1.05, 1.14, lt / d);
    for (const tw of EMPH_T) if (t >= tw && t < tw + 0.8) z += 0.08 * Math.exp(-(t - tw) * 7) * Math.min(1, (t - tw) * 40);
    if (lt < 0.15 && CUT[k] !== 'whip') z += 0.2 * (1 - E.outCubic(lt / 0.15));
    if (k === 17) z = R.lerp(1.05, 1.5, E.inOutSine(R.prog(t, 32.66, 35.0))); // devagar até a criatura
    if (k === 21) z = R.lerp(1.1, 1.6, E.inOutSine(R.prog(t, 44.12, 46.9))); // aproxima no sorriso
    const [sx, sy] = fx.shake(t, ([12, 19, 22].includes(k) ? 10 : 2) + 10 * kick(t), 9, k);
    let ox = 0;
    if (CUT[k + 1] === 'whip' && lt > d - 0.1) ox = -W * 0.5 * E.inCubic((lt - (d - 0.1)) / 0.1);
    if (CUT[k] === 'whip' && lt < 0.12) ox = W * 0.5 * (1 - E.outCubic(lt / 0.12));
    return { z, ox: ox + sx, oy: sy };
  }

  // ---------------- elementos ----------------
  function miniCards(ctx, t, t0, focus, fadeAt) {
    if (t < t0 || t > fadeAt + 0.3) return;
    const out = E.inCubic(R.clamp((t - fadeAt) / 0.3));
    for (let i = 0; i < 5; i++) {
      const lt = t - t0 - i * 0.08, sp = R.spring(lt, 1.8, 6);
      if (lt < 0) continue;
      const isF = focus !== null && t >= focus && i === 2;
      const fz = isF ? 1 + 0.35 * R.spring(t - focus, 1.8, 6) : focus !== null && t >= focus ? 0.9 : 1;
      ctx.save();
      ctx.translate(540 + (i - 2) * 190 * (1 - out * 0.5), 820 + (1 - Math.min(1, sp)) * 700 + out * 900);
      ctx.rotate((i - 2) * 0.09 + (1 - sp) * 0.6);
      ctx.scale(fz, fz);
      ctx.globalAlpha = isF || focus === null || t < focus ? 1 : 0.55;
      ctx.fillStyle = '#16111a';
      ctx.strokeStyle = isF ? '#ff2a2a' : '#e8d8c0';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(-80, -115, 160, 230, 16);
      ctx.fill();
      ctx.stroke();
      Art.sigil(ctx, 0, -10, 58, t, i + 1, isF ? 'rgba(255,60,60,0.8)' : 'rgba(232,216,192,0.5)');
      ctx.font = '900 64px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isF ? '#ff2a2a' : '#e8d8c0';
      ctx.fillText(isF ? 'EU?' : '?', 0, -8);
      ctx.restore();
    }
  }
  function d20Show(ctx, t) {
    for (const [t0, face] of ROLLS) {
      const card = CARDS[face - 1];
      if (t < t0 || t > card.t0 + 0.45) continue;
      const p = R.prog(t, t0, t0 + 0.75), fly = E.inOutCubic(R.prog(t, card.t0 - 0.1, card.t0 + 0.35));
      ctx.save();
      ctx.globalAlpha = 1 - R.clamp((t - card.t0 - 0.15) / 0.3);
      Art.d20(ctx, R.lerp(540, 900, fly), R.lerp(860, 330, fly), R.lerp(230, 90, fly), p, face, { seed: face * 7, crit: true });
      ctx.restore();
    }
    if (t >= TEST_ROLL) {
      Art.d20(ctx, 860, 470, 125, R.prog(t, TEST_ROLL, TEST_ROLL + 0.8), 1, { seed: 99, crit: true, color: [70, 20, 110] });
      Art.stamp(ctx, 'FALHOU', 820, 640, 70, TEST_ROLL + 0.85, t, '#ff2a2a', 0.15);
    }
  }
  function tags(ctx, t) {
    const list = [['@o_ocultista_do_grupo', 49.9, 400, 620], ['@quem_toca_em_tudo', 50.1, 640, 820], ['@o_que_morre_primeiro', 50.3, 300, 1020]];
    for (const [s, t0, x, y] of list) {
      if (t < t0 || t > 51.0) continue;
      const sp = R.spring(t - t0, 2, 6);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(Math.min(1.1, sp), Math.min(1.1, sp));
      ctx.font = '900 46px "Inter", sans-serif';
      const w = ctx.measureText(s).width + 50;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.roundRect(-w / 2, -40, w, 80, 40);
      ctx.fill();
      ctx.fillStyle = '#fe2c55';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s, 0, 2);
      ctx.restore();
    }
  }

  function overlays(ctx, k, t) {
    miniCards(ctx, t, 3.0, 5.5, 6.35);
    if (t > 16.4 && t < 17.6) {
      // barra de sanidade esvaziando
      const p = E.inCubic(R.prog(t, 16.4, 16.9));
      ctx.save();
      ctx.fillStyle = 'rgba(10,6,14,0.85)';
      ctx.beginPath();
      ctx.roundRect(140, 560, 800, 150, 20);
      ctx.fill();
      ctx.font = '56px "VT323", monospace';
      ctx.fillStyle = '#e8d8ff';
      ctx.fillText(`SANIDADE  ${Math.round(R.lerp(20, 0, p))}/20`, 180, 620);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(180, 650, 720, 28);
      ctx.fillStyle = p >= 1 ? '#ff2a2a' : '#b44dff';
      ctx.fillRect(180, 650, 720 * (1 - p), 28);
      ctx.restore();
    }
    if (k === 17 && t > 33.2) {
      // "!" de alerta em cima da criatura
      const sp = R.spring(t - 33.2, 2, 6);
      ctx.save();
      ctx.translate(560, 520);
      ctx.scale(sp, sp);
      ctx.font = '900 220px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff2a2a';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 14;
      ctx.strokeText('!', 0, 0);
      ctx.fillText('!', 0, 0);
      ctx.restore();
    }
    if (t > 48.32 && t < 49.88) {
      Art.sigil(ctx, 540, 880, 520 + (t - 48.32) * 200, t * 3, 7, `rgba(255,30,40,${0.8 - (t - 48.32) * 0.4})`);
    }
    for (const c of CARDS) Art.card(ctx, t, c, c.t0, c.exit, 540, 830);
    for (const s of STAMPS) if (t < s.t + 1.1) Art.stamp(ctx, s.text, s.x, s.y, s.size, s.t, t, s.color, s.rot);
    tags(ctx, t);
    if (t > 52.2) {
      fx.tint(ctx, '#000', 0.55 * R.prog(t, 52.2, 52.5));
      Art.brand(ctx, t, 52.35, 53.74, LOGO);
    }
    d20Show(ctx, t);
    if (t < 52.2) Art.watermark(ctx, t, LOGO);
  }

  // ---------------- pós-produção ----------------
  const BASE = { uSat: 0.85, uContrast: 1.15, uBright: -0.02, uTint: [1.06, 0.98, 0.92], uTintAmt: 0.3, uGrain: 0.07, uVignette: 0.95, uFilm: 0.3, uAberr: 1.4, uBloom: 0.3, uLeak: 0.15 };
  const LOOK = {
    7: { uTint: [0.9, 1.25, 0.9], uTintAmt: 0.5 },
    12: { uTint: [1.4, 0.6, 0.6], uTintAmt: 0.5, uGlitch: 0.15 },
    17: { uSat: 0.5, uTint: [0.85, 0.95, 1.15], uTintAmt: 0.5 },
    19: { uSat: 0.5, uTint: [1.3, 0.7, 0.7], uTintAmt: 0.4 },
    21: { uSat: 0.55, uContrast: 1.3 },
    22: { uSat: 0.6, uBloom: 0.6 },
  };
  function post(t) {
    const k = shotAt(t);
    const p = { ...BASE, ...(LOOK[k] || {}) };
    p.uGlitch = (p.uGlitch || 0) + kick(t) * 0.05;
    for (let i = 1; i < SHOTS.length; i++) {
      const d = t - SHOTS[i].t, type = CUT[i] || 'punch';
      if (Math.abs(d) > 0.15) continue;
      if (type === 'glitch') p.uGlitch += Math.max(0, 1 - Math.abs(d) / 0.12) * 0.7;
      if (type === 'whip') p.uBlur = [240 * Math.max(0, 1 - Math.abs(d) / 0.12), 0];
      if (type === 'flash' && d >= 0) p.uBright += 0.6 * Math.exp(-d * 25);
      if (type === 'punch' && d >= 0) p.uZoom = 1 + 0.05 * Math.exp(-d * 20);
    }
    for (const s of STAMPS) if (t >= s.t && t < s.t + 0.3) p.uGlitch += 0.4 * (1 - (t - s.t) / 0.3);
    if (t >= 48.32 && t < 48.42) p.uInvert = 1;
    if (t >= 48.32 && t < 49.6) {
      p.uGlitch += 0.35;
      p.uAberr = 8;
      p.uTint = [1.4, 0.55, 0.55];
      p.uTintAmt = 0.6;
    }
    if (t >= 16.62 && t < 17.4) p.uGlitch += 0.2;
    p.uSeed = R.frameOf(t) % 97;
    p.uGlitch = Math.min(1, p.uGlitch);
    return p;
  }

  // ---------------- trilha e efeitos (por baixo da voz) ----------------
  function audio(S, A0) {
    // Efeitos pontuais são marcados no tempo do roteiro (τ) e levados para o tempo real da voz.
    const RANGE = new Set(['drone', 'wind', 'rain', 'vhsBed', 'riser']);
    const A = new Proxy(A0, {
      get: (o, k) => (typeof o[k] !== 'function' ? o[k] : (S2, t, ...r) =>
        RANGE.has(k) && typeof r[0] === 'number' ? o[k](S2, warp(t), warp(r[0]), ...r.slice(1)) : o[k](S2, warp(t), ...r)),
    });
    // pulso tenso de trilha, em andamento constante no tempo real
    const bpm = 96, beat = 60 / bpm;
    for (let t = warp(0.2), i = 0; t < warp(48.2); t += beat / 2, i++) {
      if (i % 2 === 0) A0.boom(S, t, { gain: 0.22, freq: 62, decay: 0.32, verb: 0.15 });
      else A0.click(S, t, { gain: 0.05, seed: i });
    }
    A.drone(S, 0, 48.3, { base: 41.2, gain: 0.2, cutoff: 280, fin: 1.5, fout: 0.05 });
    for (let t = warp(49.9), i = 0; t < warp(57.2); t += beat / 2, i++) {
      if (i % 2 === 0) A0.boom(S, t, { gain: 0.2, freq: 70, decay: 0.3, verb: 0.1 });
      else A0.click(S, t, { gain: 0.05, seed: 300 + i });
    }
    // cortes
    SHOTS.forEach((s, i) => {
      if (!i) return;
      const type = CUT[i] || 'punch';
      if (type === 'glitch') A.blip(S, s.t, { gain: 0.35, seed: i });
      else A.whoosh(S, s.t - 0.16, { dur: 0.24, gain: 0.4, from: i % 2 ? 600 : 3200, to: i % 2 ? 3200 : 600, verb: 0.1 });
    });
    // dados rolando
    const roll = (tau0, gain = 0.5) => {
      const t0 = warp(tau0);
      let t = t0;
      for (let k = 0; k < 9; k++) {
        A0.click(S, t, { gain: gain * (1 - k / 12), seed: Math.floor(t0 * 10) + k });
        t += 0.045 + k * 0.012;
      }
      A0.boom(S, warp(tau0 + 0.75), { gain: 0.45, freq: 130, decay: 0.18, verb: 0.05 });
    };
    ROLLS.forEach(([t0]) => roll(t0));
    roll(TEST_ROLL);
    // fichas entrando
    CARDS.forEach((c) => {
      A.whoosh(S, c.t0 - 0.2, { dur: 0.3, gain: 0.45, from: 300, to: 2500, verb: 0.15 });
      A.boom(S, c.t0 + 0.08, { gain: 0.4, freq: 90, decay: 0.3 });
      if (c.stamp) A.boom(S, c.stamp.t, { gain: 0.7, freq: 100, decay: 0.4 });
    });
    STAMPS.forEach((s) => A.boom(S, s.t, { gain: 0.8, freq: 55, decay: 1.5 }));
    A.static(S, 16.5, 0.6, { gain: 0.35, seed: 3 });
    for (let t = warp(32.7); t < warp(34.9); t += 0.55) A0.heartbeat(S, t, { gain: 0.8 });
    A.riser(S, 46.9, 48.3, { gain: 0.45 });
    A.sting(S, 48.32, { gain: 0.9 });
    A.boom(S, 48.32, { gain: 1, freq: 40, decay: 2.5 });
    A.click(S, 53.74, { gain: 0.6, seed: 5 });
    A.boom(S, 53.76, { gain: 0.35, freq: 220, decay: 0.12 });
    // "falha" cômica do teste de sanidade
    [[392, 0], [370, 0.28], [349, 0.56], [330, 0.84]].forEach(([f, dt], i) => {
      const t = warp(TEST_ROLL + 0.9) + dt;
      A0.musicBox(S, t, f / 2, { gain: 0.4, verb: 0.2, detune: i === 3 ? -40 : 0 });
    });
  }

  R.mount({
    duration: DUR,
    poster: 9.5,
    audioFile: 'assets/voz-propria.wav',
    audioEnd: VOICE_END,
    sfxGain: 0.45,
    signal: 'assets/audio-analysis-voz-propria.json',
    fonts: ['40px "Shrikhand"', '40px "VT323"'],
    assets: { logo: 'assets/logo.jpg' },
    setup(a) {
      LOGO = a.logo;
    },
    async prepare(t) {
      const tau = unwarp(t), k = shotAt(tau);
      cur = { k, tau, img: await getFrame(k, srcIndex(k, tau - SHOTS[k].t)) };
      getFrame(Math.min(SHOTS.length - 1, k + 1), 0);
    },
    render(ctx, t) {
      const k = cur.k, c = camera(k, cur.tau);
      t = cur.tau;
      ctx.save();
      ctx.translate(c.ox, c.oy);
      R.drawCover(ctx, cur.img, { zoom: c.z, fx: 0.5, fy: 0.5 });
      ctx.restore();
      // escurece o fundo quando há ficha ou dado na tela
      const busy = CARDS.some((cd) => t > cd.t0 - 0.6 && t < cd.exit + 0.2);
      fx.tint(ctx, '#000', busy ? 0.35 : 0.12);
    },
    post: (t) => post(unwarp(t)),
    overlay(ctx, t) {
      overlays(ctx, cur.k, cur.tau);
      for (const L of CAPS) K.line(ctx, t, L);
      fx.tint(ctx, '#000', R.prog(t, DUR - 0.3, DUR));
    },
    audio,
  });
})();
