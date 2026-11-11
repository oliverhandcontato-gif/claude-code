/* REGRAS DA FÁBRICA — "Você foi contratado como segurança noturno…" (Tio Arle, TikTok 1080×1920)
 * Voz: assets/voz.wav (tempos por palavra em assets/palavras.json, trechos em assets/trechos.json).
 * Visual, trilha e efeitos: 100% código. A linha do tempo é amarrada aos trechos do roteiro,
 * então trocar a voz (e rodar tools/palavras.py) reposiciona tudo sozinho.
 */
(async function () {
  'use strict';
  const R = window.Reel, Art = window.Art, P = Art.P, K = R.kin, E = R.ease, fx = R.fx;
  const { W, H } = R;
  const WORDS = await (await fetch('assets/palavras.json')).json();
  const { duracao: VOICE, trechos: TR } = await (await fetch('assets/trechos.json')).json();
  const DUR = Math.ceil((VOICE + 0.6) * 10) / 10;

  // ---------------- tempos ----------------
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '');
  const T = (i) => TR[i];
  const wordsOf = (i) => WORDS.filter((w) => w.trecho === i);
  /** Início (ou fim, com end=true) da palavra `w` no trecho i (n-ésima ocorrência). */
  const wt = (i, w, n = 0, end = false) => {
    const m = wordsOf(i).filter((x) => norm(x.w).startsWith(norm(w)));
    const x = m[Math.min(n, m.length - 1)];
    if (!x) throw new Error(`palavra "${w}" não achada no trecho ${i}`);
    return end ? x.e : x.s;
  };
  const cenaIni = (id) => TR.find((x) => x.cena === id).ini;
  const SC = ['abertura', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'final', 'cta'];
  const START = {};
  SC.forEach((id, k) => {
    if (k === 0) return (START[id] = 0);
    const i0 = TR.findIndex((x) => x.cena === id);
    START[id] = Math.max(TR[i0 - 1].fim + 0.15, TR[i0].ini - 0.3);
  });
  const RULE_IDX = { r1: 4, r2: 9, r3: 13, r4: 17, r5: 22, r6: 27, r7: 31, r8: 35 };
  const cardEnd = (id) => T(RULE_IDX[id]).fim + 0.35;
  // instantes-chave
  const BEEP = [T(0).fim + 0.08, Math.max(T(0).fim + 0.5, T(1).ini - 0.12)];
  const DARK_AT = BEEP[0];
  const K1 = {
    rattle: wt(6, 'abrir'), quiet: wt(7, 'não'), ownVoice: wt(8, 'própria'),
    open2: wt(11, 'abrir'), blink2: wt(12, 'pisca'),
    look3: wt(14, 'olhe'), face3: wt(16, 'rosto'), saiu3: wt(16, 'boneca'),
    jingle4: wt(18, 'jingle'), name4: wt(19, 'nome'), pull4: wt(19, 'arranque'), corra: wt(21, 'corra'),
    tres5: wt(24, 'três'), noAir: wt(25, 'não'), smell: wt(26, 'cheiro'),
    knock6: wt(28, 'bater'), smile6: wt(28, 'sorrindo'), demais: wt(29, 'demais'), fire6: wt(30, 'incêndio'),
    count7: wt(33, 'contar'), n47: wt(32, 'quarenta'), n48: wt(33, 'quarenta'), behind: wt(34, 'atrás'),
    note8: wt(36, 'as'), burn8: wt(37, 'queime'), here8: wt(39, 'aqui'),
    sun9: wt(41, 'sol'), chose9: wt(42, 'escolheu'), colecao: wt(43, 'coleção'),
    follow: wt(44, 'segue'), arle: wt(44, 'arle'), nome10: wt(45, 'nome'),
  };
  const TVOFF = [T(43).fim + 0.35, T(43).fim + 0.62];

  // ---------------- helpers ----------------
  let layer, tmpC;
  const cam = (ctx, z = 1, x = 540, y = 960, rot = 0, ox = 0, oy = 0) => {
    ctx.translate(540 + ox, 960 + oy);
    ctx.rotate(rot);
    ctx.scale(z, z);
    ctx.translate(-x, -y);
  };
  const talk = (t) => R.clamp(R.sig.level(t) * 1.5 - 0.25);
  const blink = (t, period = 3.3) => {
    const ph = t % period;
    return ph < 0.14 ? Math.sin((ph / 0.14) * Math.PI) : 0;
  };
  const bump = (t, c, d) => Math.max(0, 1 - Math.abs(t - c) / d);
  /** zoom de impacto: sobe rápido em c e volta devagar */
  const punch = (t, c, amt = 0.12, back = 0.6) => (t < c ? 0 : amt * Math.exp(-(t - c) / back) * R.clamp((t - c) / 0.05));
  const wander = (t, seed, amp) => [R.noise1(t * 0.35, seed) * amp, R.noise1(t * 0.3, seed + 7) * amp];
  const breathe = (t) => 1 + 0.004 * Math.sin(t * 1.6);

  // ---------------- cenas ----------------
  /** Comercial anos 50 (até o bipe) e a virada para a noite. */
  function abertura(ctx, t) {
    if (t < DARK_AT) {
      Art.rays(ctx, 540, 1000, 18, t * 0.18, P.cream, '#ffdbe2');
      ctx.save();
      cam(ctx, 1 + 0.05 * R.prog(t, 0, DARK_AT), 540, 980);
      Art.factory(ctx, 540, 1760, 1.0, t, {});
      Art.sign(ctx, 540, 610, 0.8 * R.spring(t - 0.35, 1.8, 6), t, { censor: 1 });
      const rise = R.spring(t - 0.15, 1.3, 5);
      Art.mascot(ctx, 540, 1000 + (1 - rise) * 900, 165, t, { talk: talk(t), blink: blink(t + 1), wave: R.clamp(t - 0.6) });
      ctx.restore();
      // tarja de censura batendo no nome junto com o bipe
      return;
    }
    // noite: a mesma fábrica, sem a mascote; janelas vermelhas acendendo
    const lt = t - DARK_AT;
    Art.grad(ctx, '#020303', '#0b120f');
    ctx.save();
    const z = 1.05 + 0.25 * E.inOutSine(R.prog(t, DARK_AT, START.r1));
    const [sx, sy] = fx.shake(t, 6 * Math.exp(-lt * 2), 18, 2);
    cam(ctx, z, 540, 1100, 0, sx, sy);
    fx.fog(ctx, t, { alpha: 0.12, speed: 18, scale: 6, offset: 400, y0: 600 });
    const lit = [];
    const order = [1, 4, 8, 6, 3, 11, 0, 9];
    order.forEach((n, k) => t > T(1).ini + k * 0.35 && lit.push(n));
    const wins = Art.factory(ctx, 540, 1760, 1.0, t, { night: 1, windows: lit });
    for (const [x, y] of wins) Art.glow(ctx, x, y, 160, '255,30,40', 0.45);
    Art.sign(ctx, 540, 610, 0.8, t, { night: 1, censor: 1, flicker: 0.25 });
    ctx.restore();
    // silhueta de boneca numa janela quando fala "durou três noites"
    if (t > wt(1, 'três') && t < T(2).ini) {
      ctx.save();
      cam(ctx, z, 540, 1100, 0, sx, sy);
      ctx.globalAlpha = 0.85;
      Art.doll(ctx, 540 - 400 + 4 * 150 + 55, 1760 - 450 + 50, 34, { light: 0.25, eyes: 1, pupil: 1 });
      ctx.restore();
    }
    Art.flashlight(ctx, 540 + R.noise1(t * 0.4, 3) * 160, 1000 + R.noise1(t * 0.3, 4) * 120, 900, t, { dark: 0.7, flicker: 0.1 });
  }

  /** Cartão do manual "REGRA Nº n". */
  const SCRAWL = { r1: 'NÃO ABRA', r2: 'não pisque', r3: 'não olhe!!', r4: 'ela canta…', r5: 'NÃO EXISTE', r6: 'não é ele', r7: 'eram 47…', r8: 'não confie' };
  function ruleCard(ctx, t, id) {
    const n = Number(id.slice(1)), t0 = START[id], i = RULE_IDX[id];
    Art.wall(ctx, 0, 0, W, H, 1.6, n * 120);
    ctx.save();
    cam(ctx, 1.02 + 0.06 * R.prog(t, t0, cardEnd(id)), 540, 860);
    Art.hangingLamp(ctx, 540, -40, t, { len: 300, swing: 0.12, on: 0.9 });
    const sp = R.spring(t - t0, 1.6, 6);
    Art.ruleCard(ctx, 540, 860 - (1 - sp) * 1400, 1.08, t, n, { stamp: R.clamp((t - T(i).fim + 0.05) / 0.3), scrawl: SCRAWL[id], scrawlP: R.prog(t, T(i).fim, T(i).fim + 0.4) });
    ctx.restore();
    Art.flashlight(ctx, 540 + R.noise1(t * 0.8, n) * 60, 860, 760, t, { dark: 0.92, flicker: 0.12 });
  }

  function r1(ctx, t) {
    // guarita: porta trancada, relógio 10:00 -> 10:01, maçaneta tentando abrir
    const rattle = t > K1.rattle ? (t < K1.quiet ? 1 : t < K1.ownVoice ? 0.35 : 0.8) : 0;
    const m = t < K1.rattle - 0.4 ? 0 : 1;
    ctx.save();
    const z = 1.0 + 0.12 * R.prog(t, cardEnd('r1'), START.r2) + punch(t, K1.rattle, 0.06) + punch(t, K1.ownVoice, 0.1, 0.8);
    const [sx, sy] = fx.shake(t, rattle * 5, 20, 7);
    cam(ctx, z, 540, 900, 0, sx, sy);
    Art.wall(ctx, -200, -200, W + 400, H + 400, 1.5);
    Art.floor(ctx, -200, 1560, W + 400, 800);
    Art.door(ctx, 540, 900, 0.95, t, { rattle, locked: R.clamp((t - T(5).ini - 0.5) / 0.25), silhouette: t > K1.ownVoice ? R.clamp((t - K1.ownVoice) / 0.6) : 0 });
    Art.clock(ctx, 900, 230, 80, 10, m, { red: m });
    ctx.restore();
    const [wx, wy] = wander(t, 11, 120);
    Art.flashlight(ctx, 560 + wx, (t > K1.ownVoice ? 420 : 820) + wy, 600, t, { flicker: 0.12 + rattle * 0.1 });
  }

  const SHOW2 = (t, open, close) => [
    { eyes: 0 }, { eyes: 0 }, { eyes: 0 },
    { eyes: 0 }, { eyes: open, pupil: open > 0.5 ? 1 : 0, look: [0, 0.2], grin: close * 0.6, mood: 0.6 * open }, { eyes: 0 },
  ];
  function r2(ctx, t) {
    const open = R.clamp((t - K1.open2) / 0.35);
    const moved = t > K1.blink2 + 0.08;
    ctx.save();
    const z = moved ? 2.3 + 0.15 * R.prog(t, K1.blink2, START.r3) : 1.0 + 0.1 * R.prog(t, cardEnd('r2'), K1.open2) + 0.5 * E.inOutCubic(R.prog(t, K1.open2, K1.open2 + 1.4));
    const fy = moved ? 1180 : R.lerp(960, 1180, E.inOutCubic(R.prog(t, K1.open2, K1.open2 + 1.4)));
    cam(ctx, z, moved ? 540 : R.lerp(540, 540, open), fy);
    Art.wall(ctx, -400, -400, W + 800, H + 800, 1.5);
    Art.showcase(ctx, 540, 960, 1, t, SHOW2(t, open, moved ? 1 : 0), { light: 0.95 });
    ctx.restore();
    if (moved) {
      // ela se mexeu: boneca colada no vidro
      ctx.save();
      cam(ctx, 1 + punch(t, K1.blink2 + 0.08, 0.15), 540, 960);
      Art.doll(ctx, 540, 900, 330, { eyes: 1, pupil: 1, grin: 0.7, mood: 0.8, crack: 0.6, tilt: -0.12 + R.noise1(t * 10, 3) * 0.02, body: true, seed: 5 });
      ctx.restore();
    }
    Art.flashlight(ctx, 540 + R.noise1(t * 0.5, 2) * 80, moved ? 900 : 760 + open * 300, moved ? 640 : 700, t, { flicker: 0.15 });
    // piscada: o quadro fecha como pálpebra
    const bl = bump(t, K1.blink2, 0.09);
    if (bl > 0) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, (H / 2) * bl * 1.05);
      ctx.fillRect(0, H - (H / 2) * bl * 1.05, W, H);
    }
  }

  function r3(ctx, t) {
    const look = E.inOutCubic(R.prog(t, K1.look3, K1.look3 + 0.6));
    const saiu = R.prog(t, K1.saiu3 - 0.6, K1.face3 + 0.1);
    ctx.save();
    const face = t > K1.face3;
    const z = face ? 2.4 + 0.25 * R.prog(t, K1.face3, START.r4) + punch(t, K1.face3, 0.3, 0.8) : 1.05 + 0.08 * R.prog(t, cardEnd('r3'), START.r4);
    // "não olhe": câmera desvia para o chão; depois volta e encontra a boneca
    const aimY = R.lerp(1050, 1500, look * (1 - R.clamp((t - K1.saiu3 + 0.3) / 0.4)));
    cam(ctx, z, face ? 760 : 540, face ? 900 : aimY, face ? -0.04 : 0);
    Art.wall(ctx, -300, -300, W + 600, 1500);
    Art.floor(ctx, -300, 1300, W + 600, 1200);
    const speed = 160;
    const items = [];
    for (let k = 0; k < 7; k++) items.push({ type: k % 3 === 1 ? 'arm' : 'head', x: ((k * 260 + t * speed) % (7 * 260)) - 300, o: { eyes: k % 2, seed: k + 3, tilt: (k % 3) * 0.4 - 0.4 }, rot: k * 0.7 });
    const gx = R.lerp(-260, 760, E.outCubic(saiu));
    items.push({ type: 'doll', x: gx, o: { face: 'guard', human: true, scream: R.clamp((t - K1.face3) / 0.4), look: [-0.6, 0], crack: 0.4, seed: 9 } });
    Art.conveyor(ctx, 1250, t, speed, items, { light: 0.9 });
    Art.hangingLamp(ctx, 540, -60, t, { len: 360, swing: 0.15 });
    ctx.restore();
    Art.flashlight(ctx, t > K1.face3 ? 540 : 540 + R.noise1(t, 4) * 100, t > K1.face3 ? 900 : R.lerp(860, 1300, look), t > K1.face3 ? 820 : 680, t, { dark: 0.85, flicker: 0.12 });
  }

  function r4(ctx, t) {
    const evil = R.clamp((t - K1.name4) / 0.6);
    const pulled = t > K1.pull4 + 0.4;
    const run = t > K1.corra;
    ctx.save();
    const z = run ? 1.25 + 0.4 * R.prog(t, K1.corra, START.r5) : 1.0 + 0.18 * R.prog(t, cardEnd('r4'), K1.corra) + punch(t, K1.name4, 0.1);
    const [sx, sy] = fx.shake(t, run ? 26 : evil * 4, run ? 14 : 30, 4);
    cam(ctx, z, 540, 1000, run ? Math.sin(t * 9) * 0.05 : 0, sx + (run ? -(t - K1.corra) * 260 : 0), sy);
    Art.wall(ctx, -600, -300, W + 1200, H + 600, 1.5);
    // mesa
    ctx.fillStyle = '#2a1b10';
    ctx.fillRect(-200, 1230, W + 400, 60);
    ctx.fillStyle = '#160e08';
    ctx.fillRect(-200, 1290, W + 400, 700);
    Art.radio(ctx, 520, 1000, 1.1, t, { talk: t > K1.jingle4 ? talk(t) + 0.3 * Math.abs(Math.sin(t * 9)) : talk(t) * 0.3, evil, glow: pulled ? 0.6 + 0.4 * Math.sin(t * 20) : 1, cord: R.clamp((t - K1.pull4) / 0.3) });
    // tomada na parede
    Art.rr(ctx, 870, 1100, 90, 120, 10);
    ctx.fillStyle = '#d8d0bc';
    ctx.fill();
    ctx.restore();
    Art.flashlight(ctx, 520 + R.noise1(t * 0.7, 6) * 80, 980, run ? 900 : 640, t, { flicker: 0.12 + evil * 0.2 });
    if (evil > 0) fx.tint(ctx, '#ff1020', 0.08 * evil * (0.6 + 0.4 * Math.sin(t * 12)), 'screen');
  }

  function r5(ctx, t) {
    const floor = t < K1.tres5 - 0.8 ? 1 : t < K1.tres5 ? 2 : 3;
    const open = R.clamp((t - K1.tres5 - 0.4) / 1.2);
    const noAir = t > K1.noAir;
    const near = E.inCubic(R.prog(t, K1.smell - 0.2, START.r6));
    ctx.save();
    const z = 1.0 + 0.15 * R.prog(t, cardEnd('r5'), K1.noAir) + 0.5 * near + punch(t, K1.tres5, 0.08);
    cam(ctx, z, 540, R.lerp(1000, 950, near));
    Art.wall(ctx, -400, -400, W + 800, H + 800, 1.5);
    Art.floor(ctx, -400, 1700, W + 800, 800);
    Art.elevator(ctx, 540, 1060, 1, t, {
      open, floor, light: 0.95,
      inside: (g) => {
        const n = noAir ? 9 : 3;
        for (let k = 0; k < n; k++) {
          const ex = (R.hash(k, 3) - 0.5) * 460, ey = -300 + R.hash(k, 4) * 800, s = 10 + R.hash(k, 5) * 12 + near * 22;
          const o = R.clamp((t - K1.tres5 - 0.8 - k * 0.12) / 0.2) * (1 - blink(t + k * 0.4, 2.6) * 0.9);
          Art.eyes(g, ex, ey, s, o);
        }
      },
    });
    ctx.restore();
    Art.flashlight(ctx, 540, 900, 760, t, { dark: noAir ? 0.95 : 0.85, flicker: 0.1 + near * 0.3 });
  }

  function r6(ctx, t) {
    const sup = R.clamp((t - K1.knock6) / 0.5);
    const smile = R.clamp((t - K1.smile6) / 0.8) * 0.45 + R.clamp((t - K1.demais) / 0.5) * 0.55;
    const fire = R.clamp((t - K1.fire6) / 0.5);
    const knock = [0, 0.22, 0.44].some((d) => t > K1.knock6 + d && t < K1.knock6 + d + 0.08) ? 1 : 0;
    ctx.save();
    const z = 1.0 + 0.1 * R.prog(t, cardEnd('r6'), K1.demais) + punch(t, K1.demais, 0.3, 1.5) + 0.25 * fire;
    cam(ctx, z, 540, R.lerp(900, 820, R.prog(t, K1.demais, K1.demais + 0.5)));
    Art.wall(ctx, -300, -300, W + 600, H + 600, 1.5);
    Art.windowNight(ctx, 540, 860, 1.05, t, { supervisor: sup, smile, knock });
    Art.clock(ctx, 860, 1480, 80, 3, 17, { red: 1 });
    ctx.restore();
    if (fire > 0) {
      // lembrança do incêndio: chamas tingindo o quadro
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let k = 0; k < 9; k++) {
        const x = (k / 8) * W, hh = 500 + 300 * Math.abs(R.noise1(t * 3 + k, 2));
        const g = ctx.createRadialGradient(x, H, 0, x, H - hh * 0.4, hh);
        g.addColorStop(0, `rgba(255,140,30,${0.55 * fire})`);
        g.addColorStop(1, 'rgba(255,40,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - hh, H - hh * 1.6, hh * 2, hh * 1.6);
      }
      ctx.restore();
    }
    Art.flashlight(ctx, 540 + R.noise1(t * 0.6, 8) * 60, 760, 720, t, { dark: 0.8, flicker: 0.15 });
  }

  function r7(ctx, t) {
    const behind = t > K1.behind;
    if (behind) {
      // vira a lanterna: a boneca que sobrou está atrás de você
      const lt = t - K1.behind;
      ctx.save();
      cam(ctx, 1 + punch(t, K1.behind + 0.12, 0.25, 0.9) + lt * 0.05, 540, 900, 0, ...fx.shake(t, 10 * Math.exp(-lt * 3), 25, 5));
      Art.wall(ctx, -300, -300, W + 600, H + 600, 1.5);
      Art.doll(ctx, 540, 760, 380, { eyes: 1, pupil: 1, grin: 1, mood: 1, crack: 1, talk: 0.4, body: true, seed: 12, tilt: 0.1 });
      ctx.restore();
      Art.flashlight(ctx, 540, 820, 720, t, { flicker: 0.3 });
      return;
    }
    ctx.save();
    const z = 1.0 + 0.15 * R.prog(t, cardEnd('r7'), K1.behind) + punch(t, K1.count7, 0.05);
    cam(ctx, z, 540, 920);
    Art.floor(ctx, -300, -300, W + 600, H + 600, 1.4);
    Art.box(ctx, 540, 900, 1.12, t, { extra: t > K1.n48 ? 1 : 0, extraLook: [-0.5, -0.3] });
    ctx.restore();
    Art.flashlight(ctx, 540 + R.noise1(t * 0.6, 9) * 120, 880, 720, t, { dark: 0.86 });
  }

  function r8(ctx, t) {
    const here = t > K1.here8 - 0.15;
    if (here) {
      // ele ainda está aqui: na vitrine, de uniforme
      ctx.save();
      const lt = t - K1.here8;
      cam(ctx, 1.5 + 0.6 * E.inOutCubic(R.prog(lt, 0, 1.4)), 853, R.lerp(1150, 1250, R.prog(lt, 0, 1.4)));
      Art.wall(ctx, -400, -400, W + 800, H + 800, 1.5);
      Art.showcase(ctx, 540, 960, 1, t, [{ eyes: 0 }, { eyes: 0 }, { eyes: 0 }, { eyes: 0 }, { eyes: 0 }, { face: 'guard', human: true, look: [-1, 0], scream: 1, crack: 0.5, dress: '#1c2a3e' }], { light: 0.9 });
      ctx.restore();
      Art.flashlight(ctx, 540, 800, 640, t, { flicker: 0.2 });
      return;
    }
    ctx.fillStyle = '#080706';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    const z = 1.0 + 0.1 * R.prog(t, cardEnd('r8'), K1.here8);
    cam(ctx, z, 540, 860);
    Art.floor(ctx, -300, -300, W + 600, H + 600, 1.4);
    Art.note(ctx, 540, 840, 1.25, t, { write: R.prog(t, K1.note8, T(36).fim), burn: R.prog(t, K1.burn8 + 0.1, K1.here8 - 0.4) });
    ctx.restore();
    const burnLight = t > K1.burn8 ? 0.35 + 0.15 * R.noise1(t * 12, 3) : 0;
    Art.flashlight(ctx, 540, 820, 700, t, { dark: 0.85 - burnLight * 0.5 });
    if (burnLight) Art.glow(ctx, 540, 1200, 700, '255,120,30', burnLight);
  }

  function final(ctx, t) {
    // 6:00 e o céu continua preto -> a fábrica -> a coleção (o novo boneco é você)
    const t1 = T(42).ini - 0.1, t2 = T(43).ini - 0.2;
    if (t < t1) {
      ctx.save();
      cam(ctx, 1 + 0.1 * R.prog(t, START.final, t1), 540, 900);
      Art.wall(ctx, -300, -300, W + 600, H + 600, 1.5);
      Art.windowNight(ctx, 540, 860, 1.05, t, {});
      Art.clock(ctx, 860, 1480, 80, 6, 0, { red: t > K1.sun9 ? 1 : 0 });
      ctx.restore();
      Art.flashlight(ctx, 540, 900, 760, t, { dark: 0.8 });
      return;
    }
    if (t < t2) {
      Art.grad(ctx, '#020303', '#0b120f');
      ctx.save();
      cam(ctx, 1.0 + 0.5 * E.inCubic(R.prog(t, t1, t2)), 540, 1250);
      const wins = Art.factory(ctx, 540, 1760, 1.0, t, { night: 1, windows: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] });
      Art.sign(ctx, 540, 610, 0.8, t, { night: 1, censor: 1, flicker: 0.4 });
      for (const [x, y] of wins) Art.glow(ctx, x, y, 170, '255,30,40', 0.4);
      ctx.restore();
      Art.flashlight(ctx, 540, 1000, 820, t, { dark: 0.8 });
      return;
    }
    ctx.save();
    const lt = t - t2;
    cam(ctx, 1.0 + 0.45 * E.inOutCubic(R.prog(lt, 0, 2.4)) + punch(t, K1.colecao, 0.08), R.lerp(540, 820, E.inOutCubic(R.prog(lt, 0.4, 2.4))), R.lerp(960, 1160, E.inOutCubic(R.prog(lt, 0.4, 2.4))));
    Art.wall(ctx, -400, -400, W + 800, H + 800, 1.5);
    Art.showcase(ctx, 540, 960, 1, t, [{ eyes: 1, pupil: 1, look: [0.5, 0.4] }, { eyes: 1, pupil: 1, look: [0.3, 0.5] }, { eyes: 1, pupil: 1, look: [0, 0.6] }, { eyes: 1, pupil: 1, look: [0.6, 0] }, { eyes: 1, pupil: 1, look: [0.6, 0] }, { face: 'guard', eyes: R.clamp((t - K1.colecao) / 0.3), look: [0, 0], dress: '#1c2a3e', mood: 0.2 }], { light: 0.9 });
    ctx.restore();
    Art.flashlight(ctx, R.lerp(540, 760, R.prog(lt, 0.4, 2.4)), 900, 700, t, { flicker: 0.15 });
  }

  function cta(ctx, t) {
    Art.rays(ctx, 540, 820, 16, t * 0.25, '#0b0204', '#1d0508');
    ctx.save();
    const rise = R.spring(t - START.cta, 1.2, 5);
    cam(ctx, 1 + 0.06 * R.prog(t, START.cta, DUR), 540, 900);
    Art.mascot(ctx, 540, 860 + (1 - rise) * 900, 190, t, { mood: 1, talk: talk(t), blink: blink(t, 2.2) });
    ctx.restore();
    fx.fog(ctx, t, { alpha: 0.1, speed: 14, scale: 6, offset: 1300, y0: 1100 });
    const p = R.clamp((t - K1.nome10 - 0.2) / 0.25);
    Art.followButton(ctx, 540, 1390, 1.05 * R.spring(t - K1.follow - 0.3, 1.8, 6), t, t > K1.nome10 + 0.45 ? 1 : p);
    if (t > K1.nome10) {
      // dedo tocando o botão
      const tap = E.outCubic(R.prog(t, K1.nome10, K1.nome10 + 0.3));
      ctx.save();
      ctx.translate(R.lerp(760, 610, tap), R.lerp(1620, 1430, tap));
      ctx.fillStyle = '#e9c9b0';
      Art.rr(ctx, -34, -20, 68, 260, 34);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }
  }

  // ---------------- linha do tempo ----------------
  const SCENES = [];
  for (const id of SC) {
    if (id.startsWith('r')) {
      SCENES.push([START[id], (c, t) => ruleCard(c, t, id)]);
      SCENES.push([cardEnd(id), { r1, r2, r3, r4, r5, r6, r7, r8 }[id]]);
    } else SCENES.push([START[id], { abertura, final, cta }[id]]);
  }
  const RULE_CUTS = Object.keys(RULE_IDX).map((id) => START[id]);
  const GLITCH_CUTS = [DARK_AT, ...RULE_CUTS, K1.blink2 + 0.08, K1.face3, K1.behind, K1.here8, START.cta];
  const WHIPS = [K1.behind];
  const sceneAt = (t) => {
    let k = 0;
    for (let i = 0; i < SCENES.length; i++) if (t >= SCENES[i][0]) k = i;
    return k;
  };

  function drawScenes(ctx, t) {
    const k = sceneAt(t);
    let ox = 0;
    for (const c of WHIPS) {
      if (t >= c - 0.12 && t < c) ox = W * 0.6 * E.inCubic(R.prog(t, c - 0.12, c));
      if (t >= c && t < c + 0.14) ox = -W * 0.6 * (1 - E.outCubic(R.prog(t, c, c + 0.14)));
    }
    ctx.save();
    ctx.translate(ox, 0);
    SCENES[k][1](ctx, t);
    ctx.restore();
    // desligamento de TV de tubo antes da chamada final
    const k2 = R.prog(t, TVOFF[0], TVOFF[1]);
    if (k2 > 0 && t < START.cta) {
      const g = tmpC.getContext('2d');
      R.resetCtx(g);
      g.drawImage(ctx.canvas, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      const sy2 = Math.max(0.004, 1 - E.outExpo(R.clamp(k2 * 1.6))), sx2 = k2 > 0.62 ? 1 - E.inCubic((k2 - 0.62) / 0.38) : 1;
      ctx.drawImage(tmpC, 540 - 540 * sx2, 960 - 960 * sy2, W * sx2, H * sy2);
      fx.tint(ctx, '#fff', R.clamp(k2 * 2) * 0.5, 'lighter');
    }
  }

  // ---------------- legendas (geradas dos tempos da voz) ----------------
  const EM = new Set(['contratado', 'três', 'noites', 'sol', 'regras', 'guarita', 'alguém', 'responda', 'própria', 'voz', 'olhos', 'pisque', 'pisca', 'sozinha', 'olhe', 'olhou', 'rosto', 'dele', 'nome', 'fio', 'corra', 'terceiro', 'andar', 'respire', 'cheiro',
    'supervisor', 'sorrindo', 'demais', 'morreu', 'incêndio', 'quarenta', 'oito', 'atrás', 'você', 'mentira', 'queime', 'anterior', 'aqui', 'nascer', 'escolheu', 'coleção', 'segue', 'tio', 'arle', 'antes']);
  const clean = (s) => s.toLowerCase().replace(/[^\p{L}-]/gu, '');
  const CAPS = [];
  TR.forEach((tr) => {
    if (Object.values(RULE_IDX).includes(tr.i) || tr.i === 44) return; // "Regra N." vai no cartão; "Segue o Tio Arle" é título
    const ws = wordsOf(tr.i).slice(tr.i === 0 ? 3 : 0); // "Você foi contratado" já é o título
    let chunk = [];
    const flush = () => {
      if (chunk.length) CAPS.push({ tr: tr.i, words: chunk });
      chunk = [];
    };
    ws.forEach((w, k) => {
      chunk.push(w);
      const punct = /[,.…:!?]$/.test(w.w), left = ws.length - k - 1;
      if ((punct && chunk.length >= 2) || chunk.length >= 4 || (chunk.length >= 3 && left === 1 ? false : false)) {
        if (left === 1 && !punct) return; // não deixa uma palavra sozinha no fim
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
    return { style, t1, words, y: c.tr === 45 ? 560 : 1280, size: style === 'retro' ? 84 : 86, maxW: 820, x: 520, jitter: 0.3, emJitter: 0.45, out: 0.16 };
  });

  // ---------------- pós-produção por trecho ----------------
  const HAPPY = { uPrint: 0.55, uHalftone: 0.3, uFilm: 0.55, uLeak: 0.45, uGrain: 0.06, uVignette: 0.5, uSat: 1.08, uContrast: 1.06, uAberr: 1.6, uBloom: 0.15 };
  const DARK = { uPrint: 0.1, uFilm: 0.8, uGrain: 0.13, uVignette: 0.8, uSat: 0.5, uContrast: 1.12, uBright: 0.03, uAberr: 2.4, uScan: 0.14, uCurve: 0.04, uTint: [0.88, 1.0, 0.95], uTintAmt: 0.4, uBloom: 0.35 };
  const SCARES = [K1.blink2 + 0.08, K1.face3, K1.corra, K1.smell, K1.demais, K1.behind, K1.here8, K1.colecao];
  function post(t) {
    let p;
    if (t < DARK_AT) p = { ...HAPPY };
    else if (t < DARK_AT + 0.5) p = { uGlitch: 0.6, uCurve: 0.14, uScan: 0.6, uSat: 0.3, uTint: [1.4, 0.5, 0.5], uTintAmt: 0.7, uContrast: 1.5, uAberr: 9, uGrain: 0.15, uInvert: t < DARK_AT + 0.07 ? 1 : 0 };
    else if (t < START.cta) p = { ...DARK };
    else p = { ...DARK, uSat: 0.7, uTint: [1.2, 0.8, 0.8], uTintAmt: 0.5, uCurve: 0.08, uScan: 0.25 };
    for (const c of GLITCH_CUTS) p.uGlitch = (p.uGlitch || 0) + bump(t, c, 0.12) * 0.7;
    for (const c of SCARES) {
      const d = t - c;
      if (d >= 0 && d < 0.5) {
        p.uAberr = (p.uAberr || 0) + 12 * Math.exp(-d * 8);
        p.uGlitch = (p.uGlitch || 0) + 0.35 * Math.exp(-d * 10);
        p.uBright = (p.uBright || 0) + 0.18 * Math.exp(-d * 14);
      }
    }
    for (const c of WHIPS) p.uBlur = [240 * Math.max(bump(t, c - 0.02, 0.12), 0), 0];
    // olho vermelho do rádio e incêndio esquentam o grading
    if (t > K1.fire6 && t < START.r7) p.uTint = [1.15, 0.85, 0.7];
    p.uSeed = R.frameOf(t) % 97;
    return p;
  }

  // ---------------- trilha e efeitos (Web Audio) ----------------
  const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
  // jingle da fábrica (caixinha de música): C E G A G E C D E D C
  const JINGLE = [[72, 0], [76, 0.25], [79, 0.5], [81, 0.75], [79, 1.0], [76, 1.25], [72, 1.5], [74, 1.75], [76, 2.0], [74, 2.25], [72, 2.75]];
  function beep(S, t0, t1) {
    const o = S.ac.createOscillator(), g = S.ac.createGain();
    o.type = 'sine';
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
  function knock(S, A, t) {
    A.boom(S, t, { gain: 0.5, freq: 70, decay: 0.25, verb: 0.35 });
    A.click(S, t, { gain: 0.5, seed: 3 });
  }
  function happyBed(S, A, t0, t1) {
    // comercial: caixinha de música alegre + baixo pulsando
    for (let r = 0; t0 + r * 3 < t1; r++) for (const [n, dt] of JINGLE) {
      const tt = t0 + r * 3 + dt;
      if (tt < t1 - 0.05) A.musicBox(S, tt, NOTE(n), { gain: 0.22, verb: 0.4 });
    }
    for (let k = 0; t0 + k * 0.5 < t1; k++) {
      const tt = t0 + k * 0.5;
      const o = S.ac.createOscillator(), g = S.ac.createGain();
      o.type = 'triangle';
      o.frequency.value = NOTE([48, 55, 53, 55][k % 4]);
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(0.22, tt + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.35);
      o.connect(g);
      g.connect(S.out);
      o.start(tt);
      o.stop(tt + 0.4);
    }
  }
  function corruptJingle(S, A, t0, notes = 6, slow = 1.6, gain = 0.16) {
    JINGLE.slice(0, notes).forEach(([n, dt], k) => A.musicBox(S, t0 + dt * slow, NOTE(n - 12), { gain, detune: -40 - k * 12, verb: 0.9 }));
  }

  function audio(S, A) {
    happyBed(S, A, 0.05, DARK_AT);
    beep(S, BEEP[0], BEEP[1]);
    A.tapeClunk(S, DARK_AT - 0.05, { gain: 0.6 });
    A.static(S, DARK_AT, 0.4, { gain: 0.45 });
    A.subDrop(S, DARK_AT + 0.05, { gain: 0.8 });
    // camas contínuas
    A.drone(S, DARK_AT, START.cta + 0.4, { gain: 0.16, base: 41.2, fin: 2.5, fout: 1, cutoff: 260 });
    A.vhsBed(S, DARK_AT, DUR, { gain: 0.05 });
    A.wind(S, DARK_AT + 1, START.r6, { gain: 0.07, center: 380 });
    // cartões das regras: impacto + jingle quebrado
    Object.keys(RULE_IDX).forEach((id, k) => {
      A.boom(S, START[id] + 0.3, { gain: 0.55, freq: 44, decay: 1.6 });
      A.whoosh(S, START[id] + 0.02, { dur: 0.32, gain: 0.25, from: 2000, to: 300 });
      corruptJingle(S, A, T(RULE_IDX[id]).fim + 0.05, 3, 1.4, 0.1);
    });
    // r1: maçaneta
    for (let k = 0; K1.rattle + k * 0.11 < K1.quiet; k++) A.click(S, K1.rattle + k * 0.11 + R.hash(k, 4) * 0.03, { gain: 0.35, seed: k });
    for (let k = 0; K1.ownVoice + k * 0.13 < START.r2 - 0.2; k++) A.click(S, K1.ownVoice + k * 0.13, { gain: 0.25, seed: k + 9 });
    A.heartbeat(S, K1.quiet, { gain: 0.5 });
    A.whisper(S, K1.ownVoice + 0.3, 1.2, { gain: 0.18, seed: 4 });
    // r2
    A.riser(S, K1.open2, K1.blink2 + 0.08, { gain: 0.35 });
    A.sting(S, K1.blink2 + 0.08, { gain: 0.8 });
    // r3: máquina
    A.drone(S, cardEnd('r3'), START.r4, { gain: 0.07, base: 98, fin: 0.3, fout: 0.3, cutoff: 900 });
    for (let k = 0; cardEnd('r3') + k * 0.5 < START.r4; k++) A.click(S, cardEnd('r3') + k * 0.5, { gain: 0.15, seed: k });
    A.riser(S, K1.saiu3 - 0.8, K1.face3, { gain: 0.3 });
    A.sting(S, K1.face3, { gain: 0.75 });
    // r4: o jingle no rádio vira a voz
    corruptJingle(S, A, K1.jingle4, 11, 0.9, 0.12);
    A.static(S, K1.name4, 0.5, { gain: 0.3, seed: 5 });
    A.whisper(S, K1.name4 + 0.1, 1.4, { gain: 0.25, seed: 9 });
    A.blip(S, K1.pull4 + 0.1, { gain: 0.4 });
    A.static(S, K1.pull4 + 0.3, Math.max(0.3, K1.corra - K1.pull4 - 0.3), { gain: 0.2, seed: 6 });
    A.boom(S, K1.corra, { gain: 0.9, freq: 40 });
    for (let k = 0; k < 6; k++) A.heartbeat(S, K1.corra + 0.1 + k * 0.42, { gain: 0.6 });
    // r5: elevador
    A.musicBox(S, K1.tres5 - 0.02, NOTE(88), { gain: 0.2, detune: -30, verb: 0.5 });
    A.musicBox(S, K1.tres5 + 0.18, NOTE(84), { gain: 0.2, detune: -60, verb: 0.5 });
    A.whoosh(S, K1.tres5 + 0.4, { dur: 1.2, gain: 0.2, from: 200, to: 900 });
    A.whisper(S, K1.smell - 0.2, 1.4, { gain: 0.25, seed: 13 });
    A.subDrop(S, K1.smell + 0.3, { gain: 0.7 });
    // r6: batidas, sorriso, incêndio
    [0, 0.22, 0.44].forEach((d) => knock(S, A, K1.knock6 + d));
    A.sting(S, K1.demais, { gain: 0.7 });
    A.wind(S, K1.fire6, START.r7, { gain: 0.15, center: 900 });
    // r7: contagem e a que sobrou
    A.heartbeat(S, K1.count7, { gain: 0.5 });
    A.heartbeat(S, K1.count7 + 0.8, { gain: 0.55 });
    A.riser(S, K1.count7 + 1, K1.behind, { gain: 0.35 });
    A.whoosh(S, K1.behind - 0.12, { dur: 0.25, gain: 0.5 });
    A.sting(S, K1.behind + 0.02, { gain: 1 });
    // r8: escrevendo, queimando, ele ainda está aqui
    for (let k = 0; K1.note8 + k * 0.09 < T(36).fim; k++) A.click(S, K1.note8 + k * 0.09, { gain: 0.12, seed: k + 3 });
    A.rain(S, K1.burn8, K1.here8, { gain: 0.12, fin: 0.3, fout: 0.3 });
    A.boom(S, K1.here8, { gain: 0.7, freq: 46 });
    corruptJingle(S, A, K1.here8 + 0.3, 6, 1.3, 0.12);
    // final
    A.heartbeat(S, K1.sun9, { gain: 0.5 });
    A.subDrop(S, K1.chose9, { gain: 0.6 });
    A.sting(S, K1.colecao, { gain: 0.65 });
    A.static(S, TVOFF[0], TVOFF[1] - TVOFF[0] + 0.1, { gain: 0.5, seed: 8 });
    // chamada: jingle quebrado de fundo + estalo no "seguir"
    corruptJingle(S, A, START.cta + 0.2, 11, 1.2, 0.14);
    A.click(S, K1.nome10 + 0.32, { gain: 0.6, seed: 2 });
  }

  // ---------------- títulos ----------------
  const TITLES = [
    { text: 'VOCÊ FOI', t0: 0.15, t1: DARK_AT - 0.1, y: 270, size: 100, stagger: 0.04 },
    { text: 'CONTRATADO!', t0: wt(0, 'contratado'), t1: DARK_AT - 0.1, y: 395, size: 112, stagger: 0.035, fill: '#ffd23f' },
  ];

  R.mount({
    duration: DUR,
    poster: K1.demais + 0.4,
    audioFile: 'assets/voz.wav',
    audioEnd: VOICE,
    sfxGain: 0.55,
    signal: 'assets/audio-analysis.json',
    fonts: ['40px "Shrikhand"', '40px "Yellowtail"', '40px "Special Elite"', '40px "VT323"', '40px "Monoton"'],
    setup() {
      Art.init();
      layer = R.canvas(W, H);
      tmpC = R.canvas(W, H);
    },
    render(ctx, t) {
      drawScenes(ctx, t);
      R.resetCtx(ctx);
    },
    post,
    overlay(ctx, t) {
      for (const L of LINES) K.line(ctx, t, L);
      for (const Ti of TITLES) K.title(ctx, t, Ti);
      // título final
      if (t > K1.follow - 0.1) {
        K.title(ctx, t, { text: 'SEGUE O', t0: K1.follow - 0.05, y: 260, size: 96, stagger: 0.04, fill: '#f2e6d8', side: '#7a0d16', wave: 0.2 });
        K.title(ctx, t, { text: 'TIO ARLE', t0: K1.arle - 0.1, y: 390, size: 140, stagger: 0.05, fill: '#ff2a3a', side: '#3a0408', wave: 0.3 });
      }
      // contagem da caixa 12
      if (t > T(32).ini && t < K1.behind) {
        const n = t >= K1.n48 ? 48 : Math.floor(1 + 46 * R.prog(t, T(32).ini, K1.n47));
        ctx.save();
        ctx.font = '170px "VT323"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const shake = n === 48 ? fx.shake(t, 8, 30, 2) : [0, 0];
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillText(String(n), 546 + shake[0], 316 + shake[1]);
        ctx.fillStyle = n === 48 ? '#ff2236' : '#e8e2d2';
        if (n === 48) {
          ctx.shadowColor = 'rgba(255,0,30,0.9)';
          ctx.shadowBlur = 30;
        }
        ctx.fillText(String(n), 540 + shake[0], 310 + shake[1]);
        ctx.restore();
      }
    },
    audio,
  });
})();
