/* ECHO VALLEY — "A cidade que não aparece em nenhum mapa" (edição acelerada com footage)
 * Voz e música: áudio original. Imagens: clipes do Mixkit (ver shots.json / prepare.cjs).
 * Por código: câmera (push, punch-in nas palavras fortes, tremida), speed ramps, cortes com
 * flash/glitch/whip, grading por cena (WebGL), elementos gráficos (mapa, carimbo, HUD, monitor
 * de bebê), partículas, legendas cinéticas e efeitos sonoros mixados por baixo da voz.
 */
(async function () {
  'use strict';
  const R = window.Reel, K = R.kin, E = R.ease, fx = R.fx;
  const { W, H } = R;
  const CACHE = '../../out/cache/echo-valley-segredo/';
  const AUDIO_END = 27.55; // depois disso o original vira a tela do TikTok
  const { shots: SHOTS, end: DUR } = await (await fetch('shots.json')).json();
  const MAN = await (await fetch(CACHE + 'manifest.json')).json();

  // ---------------- palavras (transcrição corrigida) ----------------
  const WT = {};
  [
    ['imagine', 0], ['nenhum', 1.92], ['mapa', 2.3], ['governo', 3.14], ['esconde', 3.32], ['pouca', 3.98], ['ela', 6.1],
    ['mistérios', 7.96], ['lendas', 9.82], ['monstros', 10.7], ['florestas', 11.94], ['base', 13.54], ['militar', 13.8],
    ['experimentos', 14.44], ['secretos', 15.0], ['compreensão', 16.62], ['humana', 17.3], ['pequena', 18.54],
    ['ninguém', 20.42], ['berçário', 22.44], ['dia', 24.16], ['causará', 24.5], ['apocalipse', 26.34],
  ].forEach(([k, v]) => (WT[k] = v));
  const w = K.words;
  const CAPS = [
    ['IMAGINE UMA CIDADE', [0, 0.36, 0.58]],
    ['QUE NÃO APARECE', [0.82, 1.12, 1.22]],
    ['EM *NENHUM MAPA*,', [1.54, 1.92, 2.3]],
    ['QUE O *GOVERNO* ESCONDE.', [3.02, 3.04, 3.14, 3.32]],
    ['POUCA GENTE', [3.98, 4.74]],
    ['OUVIU FALAR SOBRE ELA.', [5.08, 5.52, 5.78, 6.1]],
    ['UMA CIDADE', [6.72, 6.86]],
    ['CHEIA DE *MISTÉRIOS*', [7.2, 7.78, 7.96]],
    ['E QUE, SEGUNDO AS LENDAS,', [8.76, 9.04, 9.28, 9.56, 9.82]],
    ['*MONSTROS* VIVEM', [10.7, 11.14]],
    ['NAS *FLORESTAS*.', [11.82, 11.94]],
    ['UM LUGAR ONDE', [12.72, 12.8, 13.02]],
    ['UMA *BASE MILITAR*', [13.38, 13.54, 13.8]],
    ['FEZ EXPERIMENTOS *SECRETOS*', [14.16, 14.44, 15.0]],
    ['QUE DESAFIAVAM', [15.66, 15.8]],
    ['A *COMPREENSÃO HUMANA*.', [16.5, 16.62, 17.3]],
    ['E ESSA PEQUENA CIDADE', [18.28, 18.34, 18.54, 19.16]],
    ['QUE QUASE *NINGUÉM*', [19.58, 20.08, 20.42]],
    ['OUVIU FALAR', [20.9, 21.42]],
    ['FOI O *BERÇÁRIO*', [21.74, 22.32, 22.44]],
    ['DAQUILO QUE', [23.28, 23.68]],
    ['UM DIA', [24.0, 24.16]],
    ['*CAUSARÁ*', [24.5]],
    ['O…', [25.58]],
  ].map(([text, times], i, all) => ({ style: 'horror', y: 1290, size: 92, maxW: 900, jitter: 0.25, words: w(text, times), t1: (all[i + 1] ? all[i + 1][1][0] : 26.3) - 0.04 }));
  CAPS.push({ style: 'horror', y: 1180, size: 150, jitter: 0.6, words: w('*APOCALIPSE*', [WT.apocalipse]), t1: 27.45 });
  const EMPH = Object.values(WT).filter((t) => t > 0.5);

  // ---------------- footage ----------------
  const SPEED = { 0: 1.2, 6: 0.8, 8: 0.7, 16: 1.3, 22: 0.9, 23: 0.55, 24: 0.6 };
  const CUT = { 3: 'flash', 4: 'glitch', 9: 'glitch', 12: 'flash', 15: 'glitch', 17: 'glitch', 20: 'glitch', 22: 'glitch', 23: 'flash', 24: 'flash', 1: 'whip', 6: 'whip', 10: 'whip', 18: 'whip', 19: 'whip' };
  const shotAt = (t) => {
    let k = 0;
    for (let i = 0; i < SHOTS.length; i++) if (t >= SHOTS[i].t) k = i;
    return k;
  };
  const shotEnd = (k) => (SHOTS[k + 1] ? SHOTS[k + 1].t : DUR);
  const srcIndex = (k, lt) => {
    const sp = SPEED[k] || 1, d = shotEnd(k) - SHOTS[k].t;
    let st = lt * sp;
    if (CUT[k + 1] === 'whip' && lt > d - 0.12) st += (lt - (d - 0.12)) * 2.5; // acelera antes do whip
    return Math.max(0, Math.min(MAN.shots[k].count - 1, Math.floor(st * MAN.fps)));
  };
  const cache = new Map();
  const frameUrl = (k, idx) => `${CACHE}${MAN.shots[k].dir}/${String(idx + 1).padStart(4, '0')}.jpg`;
  async function getFrame(k, idx) {
    const key = `${k}:${idx}`;
    if (!cache.has(key)) {
      cache.set(key, R.loadImage(frameUrl(k, idx)));
      if (cache.size > 48) cache.delete(cache.keys().next().value);
    }
    return cache.get(key);
  }
  let cur = null;

  // ---------------- câmera ----------------
  const kick = (t) => R.sig.peak(t, 0.25, 0.55);
  function camera(k, t) {
    const s = SHOTS[k], lt = t - s.t, d = shotEnd(k) - s.t;
    let z = k % 2 ? R.lerp(1.12, 1.04, lt / d) : R.lerp(1.04, 1.12, lt / d);
    for (const tw of EMPH) if (t >= tw && t < tw + 1) z += 0.14 * Math.exp(-(t - tw) * 6) * Math.min(1, (t - tw) * 40);
    z += 0.035 * kick(t);
    if (lt < 0.16 && CUT[k] !== 'whip') z += 0.22 * (1 - E.outCubic(lt / 0.16));
    const fxp = 0.5 + Math.sin(k * 1.7) * 0.06 * (lt / d - 0.5);
    const shakeAmp = [9, 22, 23].includes(k) ? 14 : [24].includes(k) ? 6 : 2;
    const [sx, sy] = fx.shake(t, shakeAmp + 18 * kick(t), 9, k);
    let ox = 0;
    if (CUT[k + 1] === 'whip' && lt > d - 0.1) ox = -W * 0.5 * E.inCubic((lt - (d - 0.1)) / 0.1);
    if (CUT[k] === 'whip' && lt < 0.12) ox = W * 0.5 * (1 - E.outCubic(lt / 0.12));
    return { z, fx: fxp, ox: ox + sx, oy: sy, rot: k === 16 ? lt * 0.12 : 0 };
  }

  // ---------------- elementos gráficos ----------------
  function stamp(ctx, text, x, y, size, t0, t, color = '#d4161c', rot = -0.18) {
    if (t < t0) return;
    const p = R.spring(t - t0, 2.2, 7), sc = R.lerp(2.4, 1, Math.min(1, p));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(sc, sc);
    ctx.globalAlpha = R.clamp((t - t0) * 12) * 0.92;
    ctx.font = `900 ${size}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width;
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.1;
    ctx.strokeRect(-tw / 2 - size * 0.4, -size * 0.75, tw + size * 0.8, size * 1.5);
    ctx.fillStyle = color;
    ctx.fillText(text, 0, size * 0.05);
    // falhas de tinta
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 70; i++) {
      ctx.beginPath();
      ctx.arc((R.hash(i, 3) - 0.5) * (tw + size), (R.hash(i, 4) - 0.5) * size * 1.6, 2 + R.hash(i, 5) * size * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  function redact(ctx, t, bars) {
    ctx.save();
    ctx.fillStyle = '#050505';
    for (const [y, h, w0, t0] of bars) {
      const p = E.outExpo(R.prog(t, t0, t0 + 0.18));
      if (p > 0) ctx.fillRect(-20, y, (w0 + 20) * p, h);
    }
    ctx.restore();
  }
  function hud(ctx, t, label, lock) {
    ctx.save();
    ctx.strokeStyle = 'rgba(230,255,230,0.85)';
    ctx.fillStyle = 'rgba(230,255,230,0.9)';
    ctx.lineWidth = 5;
    const m = 70, L = 90;
    for (const [x, y, dx, dy] of [[m, 230, 1, 1], [W - m, 230, -1, 1], [m, 1560, 1, -1], [W - m, 1560, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(x, y + dy * L);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * L, y);
      ctx.stroke();
    }
    ctx.font = '48px "VT323", monospace';
    if (Math.floor(t * 2) % 2 === 0) {
      ctx.fillStyle = '#ff2b2b';
      ctx.beginPath();
      ctx.arc(m + 40, 290, 13, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(230,255,230,0.9)';
    ctx.fillText('REC', m + 62, 305);
    ctx.textAlign = 'right';
    ctx.fillText(label, W - m - 20, 305);
    ctx.textAlign = 'left';
    ctx.fillText(`44°12'N 121°37'W   ${(t * 1000 % 100000).toFixed(0).padStart(5, '0')}`, m + 20, 1530);
    if (lock !== undefined) {
      const p = E.outCubic(R.prog(t, lock, lock + 0.25)), r = R.lerp(260, 120, p);
      ctx.strokeStyle = p >= 1 ? 'rgba(255,60,60,0.95)' : 'rgba(230,255,230,0.8)';
      ctx.lineWidth = 4;
      ctx.strokeRect(540 - r, 900 - r, r * 2, r * 2);
      ctx.beginPath();
      ctx.moveTo(540, 900 - r - 30);
      ctx.lineTo(540, 900 - r + 30);
      ctx.moveTo(540, 900 + r - 30);
      ctx.lineTo(540, 900 + r + 30);
      ctx.moveTo(540 - r - 30, 900);
      ctx.lineTo(540 - r + 30, 900);
      ctx.moveTo(540 + r - 30, 900);
      ctx.lineTo(540 + r + 30, 900);
      ctx.stroke();
      if (p >= 1) {
        ctx.fillStyle = 'rgba(255,60,60,0.95)';
        ctx.textAlign = 'center';
        ctx.fillText('ALVO IDENTIFICADO', 540, 900 + r + 70);
      }
    }
    ctx.restore();
  }
  function embers(ctx, t, n = 70, seed = 1, alpha = 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const life = 2 + R.hash(i, seed) * 2, ph = ((t + R.hash(i, seed + 1) * life) % life) / life;
      const x = R.hash(i, seed + 2) * W + Math.sin(t * 2 + i) * 40, y = H + 50 - ph * (H + 200);
      ctx.globalAlpha = alpha * Math.sin(ph * Math.PI) * (0.5 + 0.5 * R.hash(i, seed + 3));
      ctx.fillStyle = R.hash(i, seed + 4) > 0.5 ? '#ffb347' : '#ff5a1f';
      ctx.beginPath();
      ctx.arc(x, y, 2 + R.hash(i, seed + 5) * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  const clock = (sec) => {
    const s = Math.floor(sec), pad = (n) => String(n).padStart(2, '0');
    return `${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
  };

  function overlays(ctx, k, t) {
    const lt = t - SHOTS[k].t;
    if (k === 2) {
      fx.scribble(ctx, 560, 900, 230, E.outCubic(R.prog(t, WT.nenhum, WT.nenhum + 0.35)), { width: 12, seed: 2, color: 'rgba(215,20,20,0.92)' });
      fx.scribble(ctx, 330, 1180, 140, E.outCubic(R.prog(t, WT.mapa, WT.mapa + 0.3)), { width: 11, seed: 5, color: 'rgba(215,20,20,0.92)' });
      if (t > WT.mapa + 0.3) {
        ctx.save();
        ctx.font = '160px "Special Elite", monospace';
        ctx.fillStyle = 'rgba(215,20,20,0.92)';
        ctx.fillText('?', 760, 1170);
        ctx.restore();
      }
    }
    if (k === 3) {
      redact(ctx, t, [[560, 70, 760, 3.1], [700, 54, 980, 3.17], [1480, 64, 640, 3.24]]);
      ctx.save();
      ctx.font = '44px "Special Elite", monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText('ARQUIVO Nº 1987-EV', 80, 300);
      ctx.restore();
      stamp(ctx, 'CONFIDENCIAL', 540, 1000, 120, WT.esconde, t);
    }
    if (k === 4 || k === 5) {
      fx.static(ctx, t, k === 4 ? 0.14 : 0.06);
      fx.osd(ctx, t, { tl: 'PLAY ►', tr: 'CH 03' });
    }
    if (k === 5 && lt > 1.4) fx.static(ctx, t, R.prog(t, SHOTS[6].t - 0.25, SHOTS[6].t));
    if (k === 8) embers(ctx, t, 40, 3, 0.8);
    if (k === 6 || k === 10 || k === 17) fx.fog(ctx, t, { alpha: 0.25, speed: 30, scale: 6, offset: k * 100 });
    if (k === 11) hud(ctx, t, 'CAM 07 · BASE ECHO');
    if (k === 12) hud(ctx, t, 'CAM 07 · BASE ECHO', WT.base);
    if (k === 13 || k === 14) {
      ctx.save();
      ctx.fillStyle = 'rgba(5,5,5,0.85)';
      ctx.fillRect(0, 230, W, 90);
      ctx.font = '52px "VT323", monospace';
      ctx.fillStyle = '#e8e8e8';
      ctx.textAlign = 'center';
      ctx.fillText('PROJETO ECHO  ·  NÍVEL 5', 540, 290);
      ctx.restore();
      if (k === 14) stamp(ctx, 'ACESSO NEGADO', 540, 760, 92, WT.secretos, t, '#ff2020', 0.12);
    }
    if (k === 20) {
      ctx.save();
      ctx.font = '52px "VT323", monospace';
      ctx.fillStyle = 'rgba(220,255,220,0.92)';
      ctx.fillText('CAM 2 · BERÇÁRIO', 80, 290);
      ctx.textAlign = 'right';
      ctx.fillText(`14/10/1987  ${clock(3 * 3600 + 17 * 60 + t * 3)}`, W - 80, 1530);
      ctx.textAlign = 'left';
      if (Math.floor(t * 2) % 2 === 0) {
        ctx.fillStyle = '#ff3030';
        ctx.beginPath();
        ctx.arc(W - 120, 272, 13, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (k === 22) {
      const flash = Math.max(0, 1 - Math.abs(lt - 0.28) / 0.08) + 0.5 * Math.max(0, 1 - Math.abs(lt - 0.45) / 0.06);
      fx.tint(ctx, '#dfe8ff', flash * 0.45, 'screen');
    }
    if (k >= 23) embers(ctx, t, 110, 7, 1);
  }

  // ---------------- vinheta final ----------------
  function endCard(ctx, t) {
    const p = R.prog(t, AUDIO_END, AUDIO_END + 0.25);
    if (p <= 0) return;
    fx.tint(ctx, '#000', 0.75 * p);
    fx.fog(ctx, t, { alpha: 0.25 * p, speed: -20, scale: 6, offset: 40 });
    embers(ctx, t, 90, 11, p);
    ctx.save();
    ctx.font = '900 150px "Inter", sans-serif';
    ctx.letterSpacing = '18px';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const sp = R.spring(t - AUDIO_END - 0.05, 1.8, 6);
    ctx.translate(540, 900);
    ctx.scale(R.lerp(1.4, 1, Math.min(1, sp)), R.lerp(1.4, 1, Math.min(1, sp)));
    for (const [dx, col] of [[-8, 'rgba(255,0,40,0.8)'], [8, 'rgba(0,220,255,0.6)'], [0, '#f2f2f2']]) {
      ctx.fillStyle = col;
      ctx.globalCompositeOperation = dx ? 'lighter' : 'source-over';
      ctx.fillText('ECHO', dx, -90);
      ctx.fillText('VALLEY', dx, 90);
    }
    ctx.restore();
    fx.tint(ctx, '#000', R.prog(t, DUR - 0.35, DUR));
  }

  // ---------------- pós-produção ----------------
  const BASE = { uSat: 0.7, uContrast: 1.2, uBright: -0.02, uTint: [0.92, 1.0, 1.08], uTintAmt: 0.4, uGrain: 0.08, uVignette: 0.9, uFilm: 0.35, uAberr: 1.5, uBloom: 0.25 };
  const LOOK = {
    4: { uScan: 0.45, uCurve: 0.08, uSat: 0.5 },
    5: { uScan: 0.25 },
    9: { uTint: [1.35, 0.6, 0.6], uTintAmt: 0.5, uGlitch: 0.12 },
    11: { uSat: 0.45, uTint: [0.85, 1.05, 0.95], uScan: 0.25 },
    12: { uSat: 0.45, uTint: [0.85, 1.05, 0.95], uScan: 0.25 },
    13: { uSat: 0.45, uContrast: 1.3, uBright: -0.06 },
    16: { uAberr: 6, uBloom: 0.5, uSat: 0.9 },
    20: { uSat: 0, uTint: [0.55, 1.35, 0.6], uTintAmt: 0.9, uContrast: 1.4, uScan: 0.35, uGrain: 0.16, uBright: 0.02 },
    22: { uBloom: 0.6, uSat: 0.6 },
    23: { uSat: 1.15, uTint: [1.15, 0.92, 0.78], uTintAmt: 0.4, uBloom: 0.55, uLeak: 0.4 },
    24: { uSat: 1.1, uTint: [1.15, 0.92, 0.78], uTintAmt: 0.4, uBloom: 0.55, uLeak: 0.3 },
  };
  function post(t) {
    const k = shotAt(t), lt = t - SHOTS[k].t;
    const p = { ...BASE, ...(LOOK[k] || {}) };
    p.uGlitch = (p.uGlitch || 0) + kick(t) * (k === 9 || k === 20 || k >= 22 ? 0.35 : 0.08);
    if (k === 20 && Math.abs(t - WT.berçário) < 0.1) p.uInvert = 1;
    for (let i = 1; i < SHOTS.length; i++) {
      const c = SHOTS[i].t, d = t - c, type = CUT[i] || 'punch';
      if (Math.abs(d) > 0.15) continue;
      if (type === 'glitch') p.uGlitch += Math.max(0, 1 - Math.abs(d) / 0.12) * 0.8;
      if (type === 'whip') p.uBlur = [260 * Math.max(0, 1 - Math.abs(d) / 0.12), 0];
      if (type === 'flash' && d >= 0) p.uBright += 0.8 * Math.exp(-d * 25);
      if (type === 'punch' && d >= 0) {
        p.uBright += 0.18 * Math.exp(-d * 30);
        p.uZoom = 1 + 0.06 * Math.exp(-d * 20);
      }
    }
    if (t > AUDIO_END) p.uGlitch += Math.max(0, 1 - Math.abs(t - AUDIO_END - 0.05) / 0.15) + 0.06;
    p.uSeed = R.frameOf(t) % 97;
    p.uGlitch = Math.min(1, p.uGlitch);
    return p;
  }

  // ---------------- efeitos sonoros (mixados por baixo da voz) ----------------
  function audio(S, A) {
    SHOTS.forEach((s, i) => {
      if (!i) return;
      const type = CUT[i] || 'punch';
      if (type === 'glitch') {
        A.blip(S, s.t, { gain: 0.45, seed: i });
        A.static(S, s.t - 0.03, 0.16, { gain: 0.5, seed: i });
      } else A.whoosh(S, s.t - 0.18, { dur: 0.26, gain: 0.55, from: i % 2 ? 500 : 3500, to: i % 2 ? 3500 : 500, verb: 0.1 });
      if (type === 'flash') A.boom(S, s.t, { gain: 0.6, decay: 1.2, freq: 60 });
    });
    for (const t of EMPH) if (t < 26) A.boom(S, t, { gain: 0.55, decay: 1.4, freq: 52 });
    A.boom(S, WT.esconde, { gain: 0.7, freq: 110, decay: 0.35, verb: 0.05 });
    A.click(S, WT.esconde, { gain: 0.6, seed: 2 });
    A.static(S, 3.98, 1.1, { gain: 0.22, seed: 7 });
    A.static(S, SHOTS[6].t - 0.25, 0.3, { gain: 0.5, seed: 8 });
    for (let t = 12.72; t < 18.2; ) {
      A.heartbeat(S, t, { gain: 0.9 });
      t += 60 / R.lerp(92, 125, R.prog(t, 12.72, 18.2));
    }
    for (let t = 12.75; t < 13.3; t += 0.06) A.click(S, t, { gain: 0.12, seed: Math.floor(t * 100) });
    A.drone(S, 18.2, 26.3, { base: 43.6, gain: 0.3, cutoff: 300, fin: 1.5, fout: 0.1 });
    A.thunder(S, SHOTS[22].t + 0.26, { gain: 0.9 });
    A.riser(S, 24.6, WT.apocalipse - 0.02, { gain: 0.55 });
    A.boom(S, WT.apocalipse, { gain: 1, freq: 38, decay: 3 });
    A.subDrop(S, WT.apocalipse, { gain: 0.8, dur: 2 });
    A.static(S, AUDIO_END, 0.3, { gain: 0.6, seed: 9 });
    A.boom(S, AUDIO_END + 0.05, { gain: 0.9, freq: 45, decay: 2.2 });
    A.whisper(S, AUDIO_END + 0.35, 1.0, { gain: 0.35 });
  }

  R.mount({
    duration: DUR,
    poster: 3.6,
    audioFile: 'assets/voice-music.m4a',
    audioEnd: AUDIO_END,
    sfxGain: 0.42,
    signal: 'assets/audio-analysis.json',
    fonts: ['40px "Special Elite"', '40px "VT323"'],
    async prepare(t) {
      const k = shotAt(t);
      cur = { k, img: await getFrame(k, srcIndex(k, t - SHOTS[k].t)) };
      const nk = Math.min(SHOTS.length - 1, k + 1);
      getFrame(nk, 0); // pré-carrega o próximo corte
    },
    render(ctx, t) {
      const k = cur.k, c = camera(k, t);
      ctx.save();
      ctx.translate(540 + c.ox, 960 + c.oy);
      ctx.rotate(c.rot);
      ctx.translate(-540, -960);
      R.drawCover(ctx, cur.img, { zoom: c.z, fx: c.fx, fy: 0.5 });
      ctx.restore();
      overlays(ctx, k, t);
      endCard(ctx, t);
    },
    post,
    overlay(ctx, t) {
      if (t > AUDIO_END) return;
      for (const L of CAPS) K.line(ctx, t, L);
    },
    audio,
  });
})();
