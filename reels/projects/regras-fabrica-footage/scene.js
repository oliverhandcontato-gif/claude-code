/* REGRAS DA FÁBRICA — versão HÍBRIDA (footage + VFX por código), Tio Arle, TikTok 1080×1920.
 * Voz e tempos: ../regras-fabrica/assets (mesma locução da versão animada).
 * Footage: Mixkit (shots.json / prepare.cjs, quadros em out/cache). Por código: cartões das regras,
 * HUD de câmera de segurança, letreiro censurado, contadores, bilhete queimando, olhos da boneca,
 * legendas, marca d'água, cartela final, grading por cena, trilha e efeitos.
 * ?semtrilha=1 tira a trilha (drones, jingle, vento) e deixa só os efeitos, para pôr música no app.
 */
(async function () {
  'use strict';
  const R = window.Reel, Art = window.Art, K = R.kin, E = R.ease, fx = R.fx;
  const { W, H } = R;
  const AS = '../regras-fabrica/assets/';
  const CACHE = '../../out/cache/regras-fabrica-footage/';
  const NO_MUSIC = new URLSearchParams(location.search).has('semtrilha');
  const WORDS = await (await fetch(AS + 'palavras.json')).json();
  const { duracao: VOICE, trechos: TR } = await (await fetch(AS + 'trechos.json')).json();
  const { shots: SH } = await (await fetch('shots.json')).json();
  const MAN = await (await fetch(CACHE + 'manifest.json')).json();
  const DUR = Math.ceil((VOICE + 0.6) * 10) / 10;

  // ---------------- tempos ----------------
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '');
  const T = (i) => TR[i];
  const wordsOf = (i) => WORDS.filter((w) => w.trecho === i);
  const wt = (i, w, n = 0, end = false) => {
    const m = wordsOf(i).filter((x) => norm(x.w).startsWith(norm(w)));
    const x = m[Math.min(n, m.length - 1)];
    if (!x) throw new Error(`palavra "${w}" não achada no trecho ${i}`);
    return end ? x.e : x.s;
  };
  // mesma conta de timeline.cjs
  const TS = SH.map((s) => {
    const tr = TR[s.tr];
    let t = s.end ? tr.fim : tr.ini;
    if (s.w) t = wordsOf(s.tr).filter((x) => norm(x.w).startsWith(norm(s.w)))[s.n || 0].s;
    return Math.max(0, Math.round((t + (s.d || 0) - (s.w ? 0.04 : 0)) * 1000) / 1000);
  });
  TS[0] = 0;
  const shotAt = (t) => {
    let k = 0;
    for (let i = 0; i < TS.length; i++) if (t >= TS[i]) k = i;
    return k;
  };
  const shotEnd = (k) => (TS[k + 1] ?? DUR);
  const RULE_IDX = { r1: 4, r2: 9, r3: 13, r4: 17, r5: 22, r6: 27, r7: 31, r8: 35 };
  const RULE_SHOT = { r1: 7, r2: 13, r3: 19, r4: 25, r5: 30, r6: 35, r7: 40, r8: 45 };
  const cardEnd = (id) => T(RULE_IDX[id]).fim + 0.35;
  const BEEP = [T(0).fim + 0.08, Math.max(T(0).fim + 0.5, T(1).ini - 0.12)];
  const K1 = {
    open2: wt(11, 'abrir'), blink2: wt(12, 'pisca'), face3: wt(16, 'rosto'), corra: wt(21, 'corra'),
    jingle4: wt(18, 'jingle'), name4: wt(19, 'nome'), pull4: wt(19, 'arranque'),
    tres5: wt(24, 'três'), noAir: wt(25, 'não'), smell: wt(26, 'cheiro'),
    knock6: wt(28, 'bater'), demais: wt(29, 'demais'), fire6: wt(30, 'incêndio'),
    n47: wt(32, 'quarenta'), n48: wt(33, 'quarenta'), behind: wt(34, 'atrás'),
    dizendo: wt(36, 'dizendo'), note8: wt(36, 'as'), burn8: wt(37, 'queime'), here8: wt(39, 'aqui'),
    sun9: wt(41, 'sol'), colecao: wt(43, 'coleção'), follow: wt(44, 'segue'), arle: wt(44, 'arle'), nome10: wt(45, 'nome'),
  };
  const CTA = TS[SH.length - 1];
  const TVOFF = [CTA - 0.3, CTA];

  // ---------------- footage ----------------
  const SPEED = { 0: 1.3, 4: 0.8, 5: 0.7, 13: 0.7, 14: 0.75, 18: 0.6, 24: 1.2, 29: 1.25, 33: 0.8, 38: 0.85, 44: 1.0, 50: 0.7, 55: 0.6 };
  const CUT = {};
  Object.values(RULE_SHOT).forEach((k) => (CUT[k] = 'glitch'));
  Object.assign(CUT, { 3: 'glitch', 4: 'burn', 18: 'flash', 24: 'flash', 29: 'whip', 38: 'flash', 44: 'whip', 50: 'flash', 55: 'flash', 10: 'whip', 21: 'whip', 47: 'flash' });
  const srcIndex = (k, lt) => {
    const sp = SPEED[k] || 1, d = shotEnd(k) - TS[k];
    let st = lt * sp;
    if (CUT[k + 1] === 'whip' && lt > d - 0.12) st += (lt - (d - 0.12)) * 2.5;
    return Math.max(0, Math.min(MAN.shots[k].count - 1, Math.floor(st * MAN.fps)));
  };
  const cache = new Map();
  const frameUrl = (k, idx) => `${CACHE}${MAN.shots[k].dir}/${String(idx + 1).padStart(4, '0')}.jpg`;
  function getFrame(k, idx) {
    const key = `${k}:${idx}`;
    if (!cache.has(key)) {
      cache.set(key, R.loadImage(frameUrl(k, idx)));
      if (cache.size > 64) cache.delete(cache.keys().next().value);
    }
    return cache.get(key);
  }
  let cur = null;

  // ---------------- câmera ----------------
  const EMPH = [wt(1, 'três'), wt(3, 'regras'), wt(6, 'alguém'), wt(8, 'própria'), wt(11, 'pisque'), K1.blink2, wt(15, 'olhou'), K1.face3, K1.name4, K1.corra,
    K1.tres5, K1.smell, K1.demais, wt(30, 'morreu'), K1.n48, K1.behind, wt(36, 'mentira'), K1.burn8, K1.here8, wt(42, 'escolheu'), K1.colecao];
  const SCARE = [K1.blink2 + 0.15, K1.face3, K1.corra, K1.smell, K1.demais, K1.behind, K1.here8, K1.colecao];
  const punch = (t, c, amt = 0.12, back = 0.25) => (t < c ? 0 : amt * Math.exp(-(t - c) / back) * R.clamp((t - c) / 0.04));
  function camera(k, t) {
    const lt = t - TS[k], d = shotEnd(k) - TS[k];
    let z = k % 2 ? R.lerp(1.14, 1.05, lt / d) : R.lerp(1.05, 1.14, lt / d);
    for (const tw of EMPH) z += punch(t, tw, 0.1);
    for (const tw of SCARE) z += punch(t, tw, 0.22, 0.4);
    if (lt < 0.14 && !['whip', 'burn'].includes(CUT[k])) z += 0.18 * (1 - E.outCubic(lt / 0.14));
    const scare = SCARE.reduce((a, c) => a + (t >= c && t < c + 0.8 ? Math.exp(-(t - c) * 4) : 0), 0);
    const run = k === 29 ? 1 : 0;
    const [sx, sy] = fx.shake(t, 2.5 + 26 * scare + run * 22, run ? 11 : 9, k);
    let ox = 0;
    if (CUT[k + 1] === 'whip' && lt > d - 0.1) ox = -W * 0.5 * E.inCubic((lt - (d - 0.1)) / 0.1);
    if (CUT[k] === 'whip' && lt < 0.12) ox = W * 0.5 * (1 - E.outCubic(lt / 0.12));
    return { z, fx: 0.5 + Math.sin(k * 1.7) * 0.07 * (lt / d - 0.5), ox: ox + sx, oy: sy, rot: run ? Math.sin(t * 8) * 0.03 : 0 };
  }

  // ---------------- VFX e gráficos ----------------
  const pad2 = (n) => String(Math.floor(n)).padStart(2, '0');
  /** Relógio da história (HUD): cada regra acontece num horário da noite. */
  const CLOCK = [[T(5).ini, 22 * 3600 - 8], [T(6).ini, 22 * 3600 + 60], [T(22).ini, 25 * 3600 + 12 * 60], [T(28).ini, 27 * 3600 + 17 * 60], [T(31).ini, 28 * 3600 + 4 * 60], [T(40).ini, 30 * 3600]];
  const storyTime = (t) => {
    let c = CLOCK[0];
    for (const x of CLOCK) if (t >= x[0]) c = x;
    const s = c[1] + (t - c[0]);
    return `${pad2((s / 3600) % 24)}:${pad2((s / 60) % 60)}:${pad2(s % 60)}`;
  };
  const HUD_SHOTS = new Set([8, 9, 10, 11, 31, 32, 33, 36, 37, 44, 51, 52]);
  function hud(ctx, t, k) {
    const cam = { 8: 1, 9: 1, 10: 2, 11: 2, 31: 5, 32: 5, 33: 5, 36: 3, 37: 3, 44: 7, 51: 4, 52: 1 }[k];
    ctx.save();
    ctx.font = '58px "VT323"';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(235,240,230,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 8;
    if (Math.floor(t * 2) % 2 === 0) {
      ctx.fillStyle = '#ff2236';
      ctx.beginPath();
      ctx.arc(110, 292, 14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(235,240,230,0.92)';
    ctx.fillText('REC', 136, 294);
    ctx.textAlign = 'right';
    ctx.fillText(`CAM 0${cam}`, 930, 294);
    ctx.textAlign = 'left';
    ctx.font = '50px "VT323"';
    ctx.fillText(storyTime(t), 90, 1490);
    ctx.textAlign = 'right';
    ctx.fillText('NOITE 1', 930, 1490);
    // cantoneiras
    ctx.strokeStyle = 'rgba(235,240,230,0.75)';
    ctx.lineWidth = 5;
    for (const [x, y, sx, sy] of [[70, 240, 1, 1], [950, 240, -1, 1], [70, 1540, 1, -1], [950, 1540, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * 70);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * 70, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Olhos da boneca ruiva (45195) brilhando em vermelho. Posição no recorte (u,v) medida nos quadros. */
  // [quadro, [[u,v] olho esquerdo, [u,v] olho direito]] — interpolado entre os quadros-chave
  const EYES = {
    15: [[0, [[0.51, 0.45], [0.705, 0.45]]], [59, [[0.47, 0.49], [0.65, 0.46]]], [76, [[0.47, 0.49], [0.65, 0.46]]]],
    18: [[0, [[0.36, 0.47], [0.545, 0.435]]], [49, [[0.335, 0.47], [0.49, 0.435]]], [57, [[0.335, 0.47], [0.49, 0.435]]]],
  };
  const eyesAt = (k, idx) => {
    const kf = EYES[k];
    let a = kf[0], b = kf[kf.length - 1];
    for (let i = 0; i < kf.length - 1; i++) if (idx >= kf[i][0] && idx <= kf[i + 1][0]) [a, b] = [kf[i], kf[i + 1]];
    const f = b[0] > a[0] ? R.clamp((idx - a[0]) / (b[0] - a[0])) : 0;
    return a[1].map(([u, v], j) => [R.lerp(u, b[1][j][0], f), R.lerp(v, b[1][j][1], f)]);
  };
  function dollEyes(ctx, map, t, k, amt) {
    if (amt <= 0 || !EYES[k]) return;
    for (const [u, v] of eyesAt(k, cur.idx)) {
      const [x, y] = map(u, v);
      const r = 30 + 8 * Math.sin(t * 20);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
      g.addColorStop(0, `rgba(255,40,30,${0.95 * amt})`);
      g.addColorStop(0.25, `rgba(255,0,20,${0.55 * amt})`);
      g.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
      ctx.restore();
    }
  }

  let wm = null, wmIcon = null, darkC = null;
  function watermark(ctx, t) {
    if (t >= CTA - 0.3 || !wmIcon) return;
    const POS = [[150, 330], [830, 330], [150, 760], [830, 760]];
    const i = Math.floor(t / 7) % POS.length, ph = (t % 7) / 7;
    const a = 0.32 * Math.min(1, ph * 14, (1 - ph) * 14);
    const [x, y] = POS[i];
    ctx.save();
    ctx.globalAlpha = a;
    ctx.drawImage(wmIcon, x - 85, y - 64, 170, 128);
    ctx.font = '30px "Shrikhand"';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f2e8d8';
    ctx.fillText('Tio Arle', x, y + 92);
    ctx.restore();
  }

  function endCard(ctx, t) {
    if (t < CTA) return;
    const lt = t - CTA;
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${0.55 + 0.1 * Math.sin(t * 3)})`;
    ctx.fillRect(0, 0, W, H);
    const s = R.spring(lt - 0.05, 1.5, 5.5);
    const gl = lt < 0.5 || (t > K1.nome10 && t < K1.nome10 + 0.25) ? 1 : 0;
    ctx.translate(540, 760);
    ctx.scale(0.88 * s, 0.88 * s);
    if (gl) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      ctx.drawImage(wm, -465 - 14, -370, 930, 740);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(wm, -465 + (gl ? R.noise1(t * 40, 2) * 10 : 0), -370, 930, 740);
    ctx.restore();
    const p = R.clamp((t - K1.nome10 - 0.2) / 0.25);
    Art.followButton(ctx, 540, 1330, 1.05 * R.spring(t - K1.follow - 0.2, 1.8, 6), t, t > K1.nome10 + 0.45 ? 1 : p);
    if (t > K1.nome10) {
      const tap = E.outCubic(R.prog(t, K1.nome10, K1.nome10 + 0.3));
      ctx.save();
      ctx.translate(R.lerp(760, 610, tap), R.lerp(1600, 1370, tap));
      ctx.fillStyle = '#e9c9b0';
      Art.rr(ctx, -34, -20, 68, 260, 34);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }
  }

  // ---------------- legendas (geradas dos tempos da voz) ----------------
  const EM = new Set(['contratado', 'três', 'noites', 'sol', 'regras', 'guarita', 'alguém', 'responda', 'própria', 'voz', 'olhos', 'pisque', 'pisca', 'sozinha', 'olhe', 'olhou', 'rosto', 'dele', 'nome', 'fio', 'corra', 'terceiro', 'andar', 'respire', 'cheiro',
    'supervisor', 'sorrindo', 'demais', 'morreu', 'incêndio', 'quarenta', 'oito', 'atrás', 'você', 'mentira', 'queime', 'anterior', 'aqui', 'nascer', 'escolheu', 'coleção', 'antes']);
  const clean = (s) => s.toLowerCase().replace(/[^\p{L}-]/gu, '');
  const CAPS = [];
  TR.forEach((tr) => {
    if (Object.values(RULE_IDX).includes(tr.i) || tr.i === 44) return;
    const ws = wordsOf(tr.i).slice(tr.i === 0 ? 3 : 0);
    let chunk = [];
    const flush = () => {
      if (chunk.length) CAPS.push({ tr: tr.i, words: chunk });
      chunk = [];
    };
    ws.forEach((w, k) => {
      chunk.push(w);
      const punct = /[,.…:!?]$/.test(w.w), left = ws.length - k - 1;
      if ((punct && chunk.length >= 2) || chunk.length >= 4) {
        if (left === 1 && !punct) return;
        flush();
      }
    });
    flush();
  });
  const LINES = CAPS.map((c, k) => {
    const next = CAPS[k + 1];
    const end = c.words[c.words.length - 1].e;
    const t1 = Math.min(end + 0.55, next ? next.words[0].s - 0.2 : end + 0.8);
    const style = c.tr === 0 ? 'retro' : 'horror';
    const words = c.words.map((w) => ({ s: (style === 'retro' ? w.w : w.w.toUpperCase()).replace(/\.\.\.$/, '…'), t: w.s, em: EM.has(clean(w.w)) }));
    return { style, t1, words, y: c.tr === 45 ? 300 : 1250, size: style === 'retro' ? 84 : 88, maxW: 820, x: 520, jitter: 0.3, emJitter: 0.45, out: 0.16 };
  });
  const TITLES = [
    { text: 'VOCÊ FOI', t0: 0.12, t1: BEEP[0] - 0.1, y: 300, size: 104, stagger: 0.04 },
    { text: 'CONTRATADO!', t0: wt(0, 'contratado'), t1: BEEP[0] - 0.1, y: 425, size: 116, stagger: 0.035, fill: '#ffd23f' },
  ];

  // ---------------- grading por cena ----------------
  const HAPPY = { uPrint: 0.5, uHalftone: 0.25, uFilm: 0.6, uLeak: 0.5, uGrain: 0.07, uVignette: 0.55, uSat: 1.1, uContrast: 1.08, uAberr: 1.6, uBloom: 0.2 };
  const DARK = { uFilm: 0.7, uGrain: 0.12, uVignette: 1.05, uSat: 0.38, uContrast: 1.22, uBright: -0.04, uAberr: 2.4, uScan: 0.1, uCurve: 0.03, uTint: [0.85, 1.0, 0.95], uTintAmt: 0.5, uBloom: 0.3 };
  // clipes claros escurecidos para combinar; vermelhos e fogo ficam quentes
  const LOOK = {
    9: { uBright: -0.2, uContrast: 1.3, uSat: 0.25 }, 13: { uBright: -0.16 }, 14: { uBright: -0.1, uSat: 0.45 }, 15: { uBright: -0.12, uSat: 0.5 }, 16: { uBright: -0.18 },
    17: { uBright: -0.22, uContrast: 1.35 }, 18: { uBright: -0.1, uSat: 0.55 }, 19: { uBright: -0.1 }, 20: { uBright: -0.12 }, 21: { uBright: -0.12 }, 22: { uBright: -0.16 },
    24: { uSat: 0.9, uTint: [1.2, 0.8, 0.8], uTintAmt: 0.4 }, 25: { uBright: -0.1 }, 30: { uBright: -0.12 }, 31: { uBright: -0.14 }, 32: { uBright: -0.18 }, 35: { uBright: -0.1 },
    37: { uBright: -0.06 }, 38: { uSat: 0.85, uTint: [1.15, 0.8, 0.8], uTintAmt: 0.3 }, 39: { uSat: 0.8, uTint: [1.2, 0.9, 0.7], uTintAmt: 0.4, uBloom: 0.6 },
    40: { uBright: -0.2, uContrast: 1.3 }, 43: { uBright: -0.1 }, 45: { uBright: -0.3, uContrast: 1.3, uSat: 0.15 }, 46: { uBright: -0.16 }, 47: { uSat: 0.8, uTint: [1.2, 0.9, 0.7], uTintAmt: 0.4 },
    48: { uSat: 0.8, uTint: [1.2, 0.9, 0.7], uTintAmt: 0.4, uBloom: 0.6 }, 50: { uBright: 0.12, uContrast: 1.3 }, 51: { uBright: 0.16, uContrast: 1.35, uSat: 0.3 }, 52: { uSat: 0.7, uTint: [1.3, 0.6, 0.6], uTintAmt: 0.6 }, 53: { uBright: 0.06 },
    55: { uBright: -0.08, uSat: 0.55 }, 56: { uSat: 0.6 },
  };
  const bump = (t, c, d) => Math.max(0, 1 - Math.abs(t - c) / d);
  function post(t) {
    const k = shotAt(t);
    let p = k <= 2 ? { ...HAPPY } : { ...DARK, ...(LOOK[k] || {}) };
    if (k === 3) p = { uGlitch: 0.55, uCurve: 0.14, uScan: 0.6, uSat: 0.3, uTint: [1.4, 0.5, 0.5], uTintAmt: 0.6, uContrast: 1.4, uAberr: 9, uGrain: 0.15, uInvert: t < BEEP[0] + 0.07 ? 1 : 0 };
    for (let i = 1; i < TS.length; i++) {
      const c = TS[i];
      if (CUT[i] === 'glitch') p.uGlitch = (p.uGlitch || 0) + bump(t, c, 0.12) * 0.7;
      if (CUT[i] === 'flash' && t >= c && t < c + 0.3) p.uBright = (p.uBright || 0) + 0.7 * Math.exp(-(t - c) * 14);
      if (CUT[i] === 'burn' && t >= c && t < c + 0.6) {
        p.uBright = (p.uBright || 0) + 0.5 * Math.exp(-(t - c) * 7);
        p.uLeak = (p.uLeak || 0) + 1.4 * Math.exp(-(t - c) * 5);
      }
      if (CUT[i] === 'whip') p.uBlur = [240 * Math.max(bump(t, c - 0.02, 0.12), 0), 0];
    }
    for (const c of SCARE) {
      const d = t - c;
      if (d >= 0 && d < 0.5) {
        p.uAberr = (p.uAberr || 0) + 12 * Math.exp(-d * 8);
        p.uGlitch = (p.uGlitch || 0) + 0.3 * Math.exp(-d * 10);
      }
    }
    if (t >= CTA) p = { ...DARK, uSat: 0.7, uTint: [1.2, 0.85, 0.85], uTintAmt: 0.4, uScan: 0.2, uGlitch: bump(t, CTA, 0.15) * 0.8 };
    p.uSeed = R.frameOf(t) % 97;
    return p;
  }

  // ---------------- trilha e efeitos ----------------
  const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const JINGLE = [[72, 0], [76, 0.25], [79, 0.5], [81, 0.75], [79, 1.0], [76, 1.25], [72, 1.5], [74, 1.75], [76, 2.0], [74, 2.25], [72, 2.75]];
  function beep(S, t0, t1) {
    const o = S.ac.createOscillator(), g = S.ac.createGain();
    o.frequency.value = 1000;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.32, t0 + 0.01);
    g.gain.setValueAtTime(0.32, t1 - 0.01);
    g.gain.linearRampToValueAtTime(0, t1);
    o.connect(g);
    g.connect(S.out);
    o.start(t0);
    o.stop(t1 + 0.02);
  }
  const corruptJingle = (S, A, t0, notes = 6, slow = 1.6, gain = 0.16) =>
    JINGLE.slice(0, notes).forEach(([n, dt], k) => A.musicBox(S, t0 + dt * slow, NOTE(n - 12), { gain, detune: -40 - k * 12, verb: 0.9 }));
  function audio(S, A) {
    const M = !NO_MUSIC;
    // abertura: jingle alegre de comercial
    if (M) for (const [n, dt] of JINGLE) if (dt < BEEP[0] - 0.1) A.musicBox(S, 0.1 + dt * 1.3, NOTE(n), { gain: 0.22, verb: 0.4 });
    A.click(S, 0.05, { gain: 0.4 });
    beep(S, BEEP[0], BEEP[1]);
    A.tapeClunk(S, BEEP[0] - 0.05, { gain: 0.6 });
    A.static(S, BEEP[0], BEEP[1] - BEEP[0] + 0.25, { gain: 0.35 });
    A.subDrop(S, TS[4], { gain: 0.8 });
    if (M) {
      A.drone(S, TS[4], CTA + 0.4, { gain: 0.15, base: 41.2, fin: 2.5, fout: 1, cutoff: 260 });
      A.wind(S, TS[4] + 1, T(27).ini, { gain: 0.06, center: 380 });
      corruptJingle(S, A, K1.jingle4, 11, 0.9, 0.12);
      corruptJingle(S, A, K1.here8 + 0.3, 6, 1.3, 0.12);
      corruptJingle(S, A, CTA + 0.2, 11, 1.2, 0.14);
    }
    A.vhsBed(S, TS[4], DUR, { gain: 0.04 });
    // cortes: whoosh nos whips, impacto nos cartões, estalo nos glitches
    for (let i = 1; i < TS.length; i++) {
      if (CUT[i] === 'whip') A.whoosh(S, TS[i] - 0.14, { dur: 0.26, gain: 0.4 });
      if (CUT[i] === 'glitch') A.blip(S, TS[i], { gain: 0.25, seed: i });
    }
    Object.keys(RULE_IDX).forEach((id) => {
      const t0 = TS[RULE_SHOT[id]];
      A.boom(S, t0 + 0.28, { gain: 0.55, freq: 44, decay: 1.6 });
      A.whoosh(S, t0, { dur: 0.3, gain: 0.25, from: 2000, to: 300 });
      if (M) corruptJingle(S, A, T(RULE_IDX[id]).fim + 0.05, 3, 1.4, 0.1);
    });
    // r1: porta
    for (let k = 0; k < 9; k++) A.click(S, wt(6, 'abrir') + k * 0.11, { gain: 0.35, seed: k });
    A.heartbeat(S, T(7).ini, { gain: 0.5 });
    A.whisper(S, wt(8, 'própria') + 0.2, 1.2, { gain: 0.18, seed: 4 });
    // r2
    A.riser(S, K1.open2, K1.blink2 + 0.15, { gain: 0.35 });
    A.sting(S, K1.blink2 + 0.15, { gain: 0.8 });
    // r3
    for (let k = 0; TS[19] + k * 0.5 < TS[22]; k++) A.click(S, TS[19] + k * 0.5, { gain: 0.15, seed: k });
    A.riser(S, K1.face3 - 1.2, K1.face3, { gain: 0.3 });
    A.sting(S, K1.face3, { gain: 0.75 });
    // r4
    A.static(S, K1.name4, 0.5, { gain: 0.3, seed: 5 });
    A.whisper(S, K1.name4 + 0.1, 1.4, { gain: 0.25, seed: 9 });
    A.static(S, K1.pull4, 0.35, { gain: 0.5, seed: 6 });
    A.boom(S, K1.corra, { gain: 0.9, freq: 40 });
    for (let k = 0; k < 3; k++) A.heartbeat(S, K1.corra + 0.1 + k * 0.42, { gain: 0.6 });
    // r5
    A.musicBox(S, K1.tres5 - 0.02, NOTE(88), { gain: 0.2, detune: -30, verb: 0.5 });
    A.musicBox(S, K1.tres5 + 0.18, NOTE(84), { gain: 0.2, detune: -60, verb: 0.5 });
    A.whisper(S, K1.smell - 0.2, 1.4, { gain: 0.25, seed: 13 });
    A.subDrop(S, K1.smell + 0.3, { gain: 0.7 });
    // r6
    [0, 0.22, 0.44].forEach((d) => {
      A.boom(S, K1.knock6 + d, { gain: 0.5, freq: 70, decay: 0.25, verb: 0.35 });
      A.click(S, K1.knock6 + d, { gain: 0.5, seed: 3 });
    });
    A.sting(S, K1.demais, { gain: 0.7 });
    if (M) A.wind(S, K1.fire6, T(31).ini, { gain: 0.15, center: 900 });
    // r7
    A.heartbeat(S, K1.n47, { gain: 0.5 });
    A.heartbeat(S, K1.n48, { gain: 0.55 });
    A.riser(S, K1.n48 + 0.6, K1.behind, { gain: 0.35 });
    A.sting(S, K1.behind + 0.02, { gain: 1 });
    // r8
    for (let k = 0; K1.note8 + k * 0.09 < T(36).fim; k++) A.click(S, K1.note8 + k * 0.09, { gain: 0.12, seed: k + 3 });
    A.rain(S, K1.burn8, T(38).ini, { gain: 0.12, fin: 0.3, fout: 0.3 });
    A.boom(S, K1.here8, { gain: 0.7, freq: 46 });
    // final
    A.heartbeat(S, K1.sun9, { gain: 0.5 });
    A.subDrop(S, wt(42, 'escolheu'), { gain: 0.6 });
    A.sting(S, K1.colecao, { gain: 0.65 });
    A.static(S, TVOFF[0], 0.4, { gain: 0.5, seed: 8 });
    A.click(S, K1.nome10 + 0.32, { gain: 0.6, seed: 2 });
  }

  R.mount({
    duration: DUR,
    poster: K1.demais + 0.3,
    audioFile: AS + 'voz.wav',
    audioEnd: VOICE,
    sfxGain: 0.45,
    signal: AS + 'audio-analysis.json',
    assets: { logo: 'assets/logo.png', icon: 'assets/logo-icone.png' },
    fonts: ['40px "Shrikhand"', '40px "Yellowtail"', '40px "Special Elite"', '40px "VT323"'],
    setup(a) {
      Art.init();
      wm = a.logo;
      wmIcon = a.icon;
      darkC = R.canvas(W, H);
    },
    async prepare(t) {
      const k = shotAt(t);
      const idx = srcIndex(k, t - TS[k]);
      cur = { k, idx, img: await getFrame(k, idx) };
      getFrame(Math.min(SH.length - 1, k + 1), 0);
    },
    render(ctx, t) {
      const k = cur.k, c = camera(k, t);
      ctx.save();
      ctx.translate(540 + c.ox, 960 + c.oy);
      ctx.rotate(c.rot);
      ctx.translate(-540, -960);
      const m = R.drawCover(ctx, cur.img, { zoom: c.z, fx: c.fx, fy: 0.5 });
      // olhos da boneca: acendem em "abrir os olhos" e no susto
      if (k === 15) dollEyes(ctx, m.map, t, k, R.clamp((t - K1.open2) / 0.3));
      if (k === 18) dollEyes(ctx, m.map, t, k, 1);
      ctx.restore();
      // cartão da regra: escurece o fundo enquanto ele está na tela
      for (const id of Object.keys(RULE_SHOT)) {
        const t0 = TS[RULE_SHOT[id]], t1 = cardEnd(id);
        if (t >= t0 && t < t1 + 0.25) {
          const a = Math.min(R.clamp((t - t0) / 0.15), R.clamp((t1 + 0.25 - t) / 0.25));
          ctx.fillStyle = `rgba(0,0,0,${0.55 * a})`;
          ctx.fillRect(0, 0, W, H);
        }
      }
      // escuridão pesada no "não respire" e lanterna nos corredores
      if (k === 33 || k === 34) Art.flashlight(ctx, 540 + R.noise1(t * 0.6, 2) * 120, 900, 760, t, { dark: 0.8, flicker: 0.15 });
      if (HUD_SHOTS.has(k)) hud(ctx, t, k);
      if (t >= CTA) endCard(ctx, t);
      // desligamento de TV antes da cartela
      const k2 = R.prog(t, TVOFF[0], TVOFF[1]);
      if (k2 > 0 && t < CTA) {
        darkC.getContext('2d').drawImage(ctx.canvas, 0, 0);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        const sy2 = Math.max(0.004, 1 - E.outExpo(R.clamp(k2 * 1.6))), sx2 = k2 > 0.62 ? 1 - E.inCubic((k2 - 0.62) / 0.38) : 1;
        ctx.drawImage(darkC, 540 - 540 * sx2, 960 - 960 * sy2, W * sx2, H * sy2);
      }
    },
    post,
    overlay(ctx, t) {
      const k = shotAt(t);
      // letreiro censurado durante "Fábrica de Bonecas" e o bipe
      if (t >= TS[2] - 0.05 && t < TS[4]) {
        const sp = R.spring(t - TS[2] + 0.05, 1.8, 6);
        Art.sign(ctx, 540, 700, 0.8 * sp, t, { censor: 1, night: k >= 3 ? 1 : 0, flicker: k >= 3 ? 0.5 : 0 });
      }
      for (const Ti of TITLES) K.title(ctx, t, Ti);
      // cartões das regras
      for (const id of Object.keys(RULE_SHOT)) {
        const t0 = TS[RULE_SHOT[id]], t1 = cardEnd(id), i = RULE_IDX[id], n = Number(id.slice(1));
        if (t < t0 || t > t1 + 0.25) continue;
        const sp = R.spring(t - t0, 1.6, 6), out = R.clamp((t - t1) / 0.25);
        ctx.save();
        ctx.globalAlpha = 1 - out;
        Art.ruleCard(ctx, 540, 820 - (1 - sp) * 1400 - E.inCubic(out) * 200, 1.08, t, n, {
          stamp: R.clamp((t - T(i).fim + 0.05) / 0.3),
          scrawl: { r1: 'NÃO ABRA', r2: 'não pisque', r3: 'não olhe!!', r4: 'ela canta…', r5: 'NÃO EXISTE', r6: 'não é ele', r7: 'eram 47…', r8: 'não confie' }[id],
          scrawlP: R.prog(t, T(i).fim, T(i).fim + 0.4),
        });
        ctx.restore();
      }
      // relógio 03:17 sobre os nixies
      if (k === 36) {
        ctx.save();
        ctx.font = '230px "VT323"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(255,90,20,0.95)';
        ctx.shadowBlur = 50;
        ctx.fillStyle = '#ffb04a';
        const [sx, sy] = fx.shake(t, 4, 20, 3);
        ctx.fillText('03:17', 540 + sx, 640 + sy);
        ctx.restore();
      }
      // contagem da caixa 12
      if (t > T(32).ini && t < K1.behind) {
        const n = t >= K1.n48 ? 48 : Math.floor(1 + 46 * R.prog(t, T(32).ini, K1.n47));
        ctx.save();
        ctx.font = '200px "VT323"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const sh = n === 48 ? fx.shake(t, 9, 30, 2) : [0, 0];
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillText(String(n), 548 + sh[0], 438 + sh[1]);
        ctx.fillStyle = n === 48 ? '#ff2236' : '#ffb04a';
        ctx.shadowColor = n === 48 ? 'rgba(255,0,30,0.9)' : 'rgba(255,120,30,0.8)';
        ctx.shadowBlur = 34;
        ctx.fillText(String(n), 540 + sh[0], 430 + sh[1]);
        ctx.restore();
      }
      // bilhete: aparece em "dizendo", é escrito com a fala e queima em "queime"
      if (t > K1.dizendo - 0.1 && t < T(38).ini) {
        const sp = R.spring(t - K1.dizendo + 0.1, 1.6, 6);
        Art.note(ctx, 540, 760 + (1 - sp) * 1200, 0.95, t, { write: R.prog(t, K1.note8, T(36).fim), burn: R.prog(t, K1.burn8 + 0.05, T(38).ini - 0.05), rot: -0.08 });
      }
      for (const L of LINES) K.line(ctx, t, L);
      watermark(ctx, t);
    },
    audio,
  });
})();
