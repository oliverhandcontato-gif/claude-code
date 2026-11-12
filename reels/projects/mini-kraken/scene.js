/* MINI KRAKEN — vídeo espontâneo do Tio Arle (TikTok 1080×1920, ~41 s).
 * Gravação de tela do app (prepare.cjs) + legendas palavra por palavra, etiquetas de seção,
 * cartão dos planos do Catarse, cartela final, batida e efeitos por código.
 * Voz: assets/voz.wav (provisória; trocar pela voz do criador e rodar tools/palavras.py).
 * ?semtrilha=1 tira a batida e deixa só voz + efeitos.
 */
(async function () {
  'use strict';
  const R = window.Reel, E = R.ease, fx = R.fx;
  const { W, H } = R;
  const CACHE = '../../out/cache/mini-kraken/';
  const NO_MUSIC = new URLSearchParams(location.search).has('semtrilha');
  const WORDS = await (await fetch('assets/palavras.json')).json();
  const { duracao: VOICE, trechos: TR } = await (await fetch('assets/trechos.json')).json();
  const { shots: SH } = await (await fetch('shots.json')).json();
  const MAN = await (await fetch(CACHE + 'manifest.json')).json();
  const DUR = Math.ceil((VOICE + 0.8) * 10) / 10;

  // ---------------- tempos ----------------
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '');
  const T = (i) => TR[i];
  const wordsOf = (i) => WORDS.filter((w) => w.trecho === i);
  const wt = (i, w, n = 0) => wordsOf(i).filter((x) => norm(x.w).startsWith(norm(w)))[n].s;
  const TS = SH.map((s) => {
    const tr = TR[s.tr];
    let t = s.end ? tr.fim : tr.ini;
    if (s.w) t = wt(s.tr, s.w, s.n || 0);
    return Math.max(0, t + (s.d || 0) - (s.w ? 0.04 : 0));
  });
  TS[0] = 0;
  const shotAt = (t) => {
    let k = 0;
    for (let i = 0; i < TS.length; i++) if (t >= TS[i]) k = i;
    return k;
  };
  const shotEnd = (k) => TS[k + 1] ?? DUR;
  const GRATIS = T(10).ini - 0.05, PLANS = T(11).ini - 0.1, END = TS[23];
  const SECTIONS = [
    { n: '1', label: 'DOCUMENTOS', t0: T(2).ini - 0.1, t1: T(5).ini - 0.3 },
    { n: '2', label: 'FICHAS', t0: T(5).ini - 0.1, t1: T(7).ini - 0.3 },
    { n: '2', label: 'SEU SISTEMA', t0: T(7).ini - 0.1, t1: T(9).ini - 0.3 },
    { n: '+', label: 'BÔNUS', t0: T(9).ini - 0.1, t1: GRATIS - 0.1 },
  ];
  const WHIPS = [TS[2], TS[11], TS[13], TS[17], GRATIS];

  // ---------------- paleta ----------------
  const C = { bg: '#0d0a17', purple: '#7b3cf0', magenta: '#ff2e7e', pink: '#ff7ab0', yellow: '#ffd23f', white: '#ffffff', ink: '#120b22', lilac: '#c9b6ff' };
  const rr = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  };
  const spring = R.spring;

  // ---------------- footage ----------------
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
  const srcIndex = (k, lt) => Math.max(0, Math.min(MAN.shots[k].count - 1, Math.floor(lt * (SH[k].sp || 1) * 30)));
  let cur = null;

  // ---------------- câmera ----------------
  const EMPH = ['canva', 'noventa', 'surtar', 'sozinha', 'próprio', 'bloco', 'graça', 'quinze'].map((w) => WORDS.find((x) => norm(x.w).startsWith(norm(w)))?.s).filter((x) => x !== undefined);
  const punch = (t, c, amt, back = 0.22) => (t < c ? 0 : amt * Math.exp(-(t - c) / back) * R.clamp((t - c) / 0.04));
  function camera(k, t) {
    const lt = t - TS[k], d = shotEnd(k) - TS[k];
    let z = (SH[k].z || 1) * (k % 2 ? R.lerp(1.1, 1.03, lt / d) : R.lerp(1.03, 1.1, lt / d));
    z += lt < 0.12 ? 0.12 * (1 - E.outCubic(lt / 0.12)) : 0;
    for (const c of EMPH) z += punch(t, c, 0.08);
    if (k === 0) z = 1.0 + 0.35 * E.inOutCubic(R.clamp(lt / 2.6)) + punch(t, EMPH[0], 0.1);
    let ox = 0;
    for (const c of WHIPS) {
      if (t >= c - 0.1 && t < c) ox = -W * 0.6 * E.inCubic(R.prog(t, c - 0.1, c));
      if (t >= c && t < c + 0.12) ox = W * 0.6 * (1 - E.outCubic(R.prog(t, c, c + 0.12)));
    }
    return { z, ox, fy: SH[k].fy ?? 0.4 };
  }

  // ---------------- legendas (pop palavra por palavra) ----------------
  const EM = new Set(['canva', 'rpg', 'carta', 'jornal', 'diário', 'cartaz', 'noventa', 'surtar', 'd&d', 'ordem', 'paranormal', 'tormenta', 'sozinha', 'próprio', 'sistema', 'bloco', 'dados', '3d', 'masmorra', 'nomes', 'encontros', 'graça', 'catarse', 'quinze', 'reais', 'exclusivos', 'mini', 'kraken', 'mestre']);
  const clean = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}&]/gu, '');
  const CAPS = [];
  TR.forEach((tr) => {
    const ws = wordsOf(tr.i);
    let chunk = [];
    ws.forEach((w, k) => {
      chunk.push(w);
      const punct = /[,.…:!?]$/.test(w.w);
      if (chunk.length >= 3 || (punct && chunk.length >= 1) || k === ws.length - 1) {
        CAPS.push(chunk);
        chunk = [];
      }
    });
  });
  const CAPL = CAPS.map((c, k) => ({ words: c, t0: c[0].s, t1: Math.min(c[c.length - 1].e + 0.35, CAPS[k + 1] ? CAPS[k + 1][0].s - 0.03 : 1e9) }));
  function captions(ctx, t) {
    if (t < T(1).ini - 0.05 || t >= END) return; // o gancho e a cartela já mostram o texto
    const L = CAPL.find((c) => t >= c.t0 && t < c.t1);
    if (!L) return;
    const size = 92, y = t >= PLANS && t < END ? 1460 : 1290;
    ctx.save();
    ctx.font = `900 ${size}px "Inter", "Arial Black", sans-serif`;
    ctx.textBaseline = 'middle';
    const ws = L.words.map((w) => ({ ...w, txt: w.w.replace(/\.\.\.$/, '').toUpperCase(), em: EM.has(clean(w.w)) }));
    const sp = ctx.measureText(' ').width * 1.5;
    ws.forEach((w) => (w.width = ctx.measureText(w.txt).width));
    // quebra em até 2 linhas de no máx. 860 px
    const lines = [[]];
    let lw = 0;
    for (const w of ws) {
      if (lines[lines.length - 1].length && lw + sp + w.width > 860) {
        lines.push([]);
        lw = 0;
      }
      lines[lines.length - 1].push(w);
      lw += (lw ? sp : 0) + w.width;
    }
    lines.forEach((line, li) => {
      const total = line.reduce((a, w) => a + w.width, 0) + sp * (line.length - 1);
      let x = 520 - total / 2;
      const yy = y + (li - (lines.length - 1) / 2) * size * 1.12;
      for (const w of line) {
        if (t >= w.s - 0.02) {
          const s = 0.6 + 0.4 * spring(t - w.s + 0.02, 2.4, 7);
          const active = t >= w.s && t < w.e + 0.05;
          ctx.save();
          ctx.translate(x + w.width / 2, yy);
          ctx.scale(s, s);
          if (w.em) {
            rr(ctx, -w.width / 2 - 14, -size * 0.58, w.width + 28, size * 1.1, 16);
            ctx.fillStyle = active ? C.magenta : C.purple;
            ctx.fill();
          }
          ctx.lineJoin = 'round';
          ctx.lineWidth = size * 0.16;
          ctx.strokeStyle = C.ink;
          ctx.strokeText(w.txt, -w.width / 2, 4);
          ctx.fillStyle = w.em ? C.white : active ? C.yellow : C.white;
          ctx.fillText(w.txt, -w.width / 2, 4);
          ctx.restore();
        }
        x += w.width + sp;
      }
    });
    ctx.restore();
  }

  // ---------------- gráficos ----------------
  function sectionTag(ctx, t) {
    for (const s of SECTIONS) {
      if (t < s.t0 || t > s.t1 + 0.2) continue;
      const p = spring(t - s.t0, 1.8, 6), out = R.clamp((t - s.t1) / 0.2);
      ctx.save();
      ctx.translate(120 + (1 - p) * -500 - out * 600, 300);
      ctx.rotate(-0.04);
      ctx.font = '900 64px "Inter", "Arial Black", sans-serif';
      ctx.textBaseline = 'middle';
      const w = ctx.measureText(s.label).width;
      rr(ctx, -10, -56, 112, 112, 28);
      ctx.fillStyle = C.yellow;
      ctx.fill();
      ctx.fillStyle = C.ink;
      ctx.textAlign = 'center';
      ctx.fillText(s.n, 46, 4);
      ctx.textAlign = 'left';
      rr(ctx, 112, -48, w + 52, 96, 20);
      ctx.fillStyle = C.magenta;
      ctx.fill();
      ctx.fillStyle = C.white;
      ctx.fillText(s.label, 138, 4);
      ctx.restore();
    }
  }

  function hook(ctx, t) {
    // "HANDOUT NO CANVA?" e o risco na palavra Canva
    if (t > T(1).ini) return;
    const cw = wt(0, 'canva');
    const p = spring(t - 0.05, 1.6, 6);
    ctx.save();
    ctx.translate(540, 360);
    ctx.scale(p, p);
    ctx.rotate(-0.05);
    rr(ctx, -430, -95, 860, 190, 30);
    ctx.fillStyle = C.yellow;
    ctx.fill();
    ctx.font = '900 92px "Inter", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.ink;
    ctx.fillText('HANDOUT NO', 0, -2);
    ctx.restore();
    if (t > cw - 0.1) {
      const q = spring(t - cw + 0.1, 2, 6);
      ctx.save();
      ctx.translate(560, 540);
      ctx.scale(q, q);
      ctx.rotate(0.05);
      ctx.font = '900 128px "Inter", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 22;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = C.ink;
      ctx.strokeText('CANVA?', 0, 0);
      ctx.fillStyle = C.white;
      ctx.fillText('CANVA?', 0, 0);
      const k = E.outCubic(R.prog(t, cw + 0.35, cw + 0.6));
      if (k > 0) {
        ctx.strokeStyle = C.magenta;
        ctx.lineWidth = 22;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-250, 10);
        ctx.lineTo(-250 + 500 * k, -10);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function gratis(ctx, t) {
    if (t < GRATIS || t > PLANS + 0.3) return;
    const p = spring(t - GRATIS, 2.2, 6), out = R.clamp((t - PLANS) / 0.3);
    ctx.save();
    ctx.globalAlpha = 1 - out;
    ctx.translate(540, 820);
    ctx.rotate(-0.12);
    ctx.scale(p * (1 + 0.04 * Math.sin(t * 12)), p * (1 + 0.04 * Math.sin(t * 12)));
    Art.starburst(ctx, 0, 0, 380, 300, 16, t * 0.6, C.yellow, C.ink, 10);
    ctx.font = '900 150px "Inter", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.ink;
    ctx.fillText('GRÁTIS', 0, 10);
    ctx.restore();
  }

  const PLAN_ROWS = [
    ['Aspirante do Profundo', 'R$ 15', 'modelos exclusivos • exportação HD'],
    ['Cultista de Atlas', 'R$ 25', 'sem anúncios • 7 GB'],
    ['Profeta do Kraken', 'R$ 35', 'suporte prioritário • 10 GB'],
    ['Herói do Polvo', 'R$ 50', 'tudo ilimitado • uso comercial'],
  ];
  function plans(ctx, t) {
    if (t < PLANS || t > END + 0.25) return;
    const lt = t - PLANS, out = R.clamp((t - END) / 0.25);
    const p = spring(lt, 1.5, 6);
    ctx.save();
    ctx.globalAlpha = 1 - out;
    ctx.fillStyle = `rgba(8,5,18,${0.72 * Math.min(1, lt * 4)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.translate(540, 820 + (1 - p) * 1200);
    rr(ctx, -450, -470, 900, 940, 44);
    const g = ctx.createLinearGradient(0, -470, 0, 470);
    g.addColorStop(0, '#2a1650');
    g.addColorStop(1, '#170d2c');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = C.purple;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 54px "Inter", "Arial Black", sans-serif';
    ctx.fillStyle = C.lilac;
    ctx.fillText('APOIE NO CATARSE', 0, -385);
    ctx.font = '700 36px "Inter", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('projeto brasileiro e independente', 0, -325);
    PLAN_ROWS.forEach(([name, price, perk], i) => {
      const ti = PLANS + 0.35 + i * 0.28;
      if (t < ti) return;
      const q = spring(t - ti, 2, 6);
      const y = -215 + i * 165;
      const hi = i === 0 && t > wt(11, 'quinze') - 0.05;
      ctx.save();
      ctx.translate((1 - q) * 300, y);
      ctx.globalAlpha *= R.clamp(q * 2);
      if (hi) ctx.scale(1.04, 1.04);
      rr(ctx, -400, -66, 800, 132, 26);
      ctx.fillStyle = hi ? C.magenta : 'rgba(255,255,255,0.08)';
      ctx.fill();
      ctx.textAlign = 'left';
      ctx.font = '900 44px "Inter", "Arial Black", sans-serif';
      ctx.fillStyle = C.white;
      ctx.fillText(name, -370, -16);
      ctx.font = '600 30px "Inter", Arial, sans-serif';
      ctx.fillStyle = hi ? '#ffe3ef' : 'rgba(255,255,255,0.65)';
      ctx.fillText(perk, -370, 30);
      ctx.textAlign = 'right';
      ctx.font = '900 54px "Inter", "Arial Black", sans-serif';
      ctx.fillStyle = hi ? C.yellow : C.white;
      ctx.fillText(price, 370, -4);
      ctx.font = '600 26px "Inter", Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('/mês', 370, 36);
      ctx.restore();
    });
    ctx.font = '700 34px "Inter", Arial, sans-serif';
    ctx.fillStyle = C.lilac;
    ctx.fillText('catarse.com.br/minikraken', 0, 425);
    ctx.restore();
  }

  let tioIcon = null;
  function endCard(ctx, t) {
    if (t < END) return;
    const lt = t - END;
    ctx.save();
    ctx.fillStyle = `rgba(8,5,18,${Math.min(0.8, lt * 4)})`;
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(540, 700, 50, 540, 700, 900);
    g.addColorStop(0, 'rgba(123,60,240,0.55)');
    g.addColorStop(1, 'rgba(123,60,240,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const p = spring(lt, 1.6, 6);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.translate(540, 640);
    ctx.scale(p, p);
    ctx.rotate(-0.04);
    ctx.font = '900 76px "Inter", "Arial Black", sans-serif';
    ctx.fillStyle = C.lilac;
    ctx.fillText('PROCURA', 0, -150);
    ctx.font = '900 150px "Inter", "Arial Black", sans-serif';
    ctx.lineWidth = 26;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = C.ink;
    ctx.strokeText('MINI', 0, -10);
    ctx.strokeText('KRAKEN', 0, 140);
    ctx.fillStyle = C.white;
    ctx.fillText('MINI', 0, -10);
    ctx.fillStyle = C.magenta;
    ctx.fillText('KRAKEN', 0, 140);
    ctx.restore();
    const q = spring(lt - 0.35, 1.8, 6);
    ctx.save();
    ctx.translate(540, 960);
    ctx.scale(q, q);
    rr(ctx, -260, -50, 520, 100, 50);
    ctx.fillStyle = C.white;
    ctx.fill();
    ctx.font = '900 54px "Inter", "Arial Black", sans-serif';
    ctx.fillStyle = C.ink;
    ctx.fillText('erpg.app', 0, 4);
    ctx.restore();
    const mt = wt(12, 'marca') - 0.05;
    if (t > mt) {
      const s = spring(t - mt, 2, 6);
      ctx.save();
      ctx.translate(540, 1110);
      ctx.rotate(0.04);
      ctx.scale(s, s);
      rr(ctx, -400, -62, 800, 124, 26);
      ctx.fillStyle = C.yellow;
      ctx.fill();
      ctx.font = '900 58px "Inter", "Arial Black", sans-serif';
      ctx.fillStyle = C.ink;
      ctx.fillText('MARCA O MESTRE!', 0, 4);
      ctx.restore();
    }
    if (tioIcon) {
      ctx.globalAlpha = R.clamp(lt * 3) * 0.85;
      ctx.drawImage(tioIcon, 540 - 75, 1240, 150, 113);
      ctx.font = '30px "Shrikhand"';
      ctx.fillStyle = '#f2e8d8';
      ctx.fillText('Tio Arle', 540, 1385);
    }
    ctx.restore();
  }

  function watermark(ctx, t) {
    if (!tioIcon || t >= END) return;
    const POS = [[150, 520], [860, 520], [150, 900], [860, 900]];
    const i = Math.floor(t / 7) % POS.length, ph = (t % 7) / 7;
    ctx.save();
    ctx.globalAlpha = 0.3 * Math.min(1, ph * 14, (1 - ph) * 14);
    const [x, y] = POS[i];
    ctx.drawImage(tioIcon, x - 60, y - 45, 120, 90);
    ctx.restore();
  }

  // ---------------- pós ----------------
  const bump = (t, c, d) => Math.max(0, 1 - Math.abs(t - c) / d);
  function post(t) {
    const p = { uSat: 1.12, uContrast: 1.06, uVignette: 0.35, uGrain: 0.03, uBloom: 0.12 };
    for (let i = 1; i < TS.length; i++) p.uBright = (p.uBright || 0) + 0.25 * Math.max(0, 1 - (t - TS[i]) / 0.08) * (t >= TS[i] ? 1 : 0);
    let blur = 0;
    for (const c of WHIPS) blur = Math.max(blur, bump(t, c - 0.01, 0.1));
    p.uBlur = [240 * blur, 0];
    p.uAberr = 1 + 6 * blur;
    p.uSeed = R.frameOf(t) % 97;
    return p;
  }

  // ---------------- trilha e efeitos ----------------
  function beat(S, t0, t1, bpm = 118) {
    const b = 60 / bpm, ac = S.ac;
    const out = ac.createGain();
    out.gain.value = 0.5;
    out.connect(S.out);
    const kick = (t, g = 1) => {
      const o = ac.createOscillator(), a = ac.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      a.gain.setValueAtTime(0.0001, t);
      a.gain.exponentialRampToValueAtTime(0.9 * g, t + 0.004);
      a.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(a);
      a.connect(out);
      o.start(t);
      o.stop(t + 0.3);
    };
    const noise = R.audio.noise(ac, 'white', 2, 7);
    const hat = (t, g = 0.25, d = 0.04) => {
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), a = ac.createGain();
      s.buffer = noise;
      f.type = 'highpass';
      f.frequency.value = 7000;
      a.gain.setValueAtTime(g, t);
      a.gain.exponentialRampToValueAtTime(0.0001, t + d);
      s.connect(f);
      f.connect(a);
      a.connect(out);
      s.start(t, Math.random() * 1.5);
      s.stop(t + d + 0.02);
    };
    const clap = (t) => {
      for (const dt of [0, 0.012, 0.024]) hat(t + dt, 0.35, 0.12);
    };
    const BASS = [45, 45, 48, 43];
    const pluck = (t, n, g = 0.25) => {
      const o = ac.createOscillator(), f = ac.createBiquadFilter(), a = ac.createGain();
      o.type = 'sawtooth';
      o.frequency.value = 440 * Math.pow(2, (n - 69) / 12);
      f.type = 'lowpass';
      f.frequency.setValueAtTime(1800, t);
      f.frequency.exponentialRampToValueAtTime(200, t + 0.25);
      a.gain.setValueAtTime(0.0001, t);
      a.gain.exponentialRampToValueAtTime(g, t + 0.01);
      a.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(f);
      f.connect(a);
      a.connect(out);
      o.start(t);
      o.stop(t + 0.35);
    };
    for (let k = 0; t0 + k * b < t1; k++) {
      const t = t0 + k * b, bar = Math.floor(k / 4);
      kick(t, k % 4 === 0 ? 1 : 0.8);
      if (k % 2 === 1) clap(t);
      hat(t + b / 2);
      pluck(t, BASS[bar % 4]);
      pluck(t + b * 0.75, BASS[bar % 4] + 12, 0.12);
    }
  }
  function audio(S, A) {
    if (!NO_MUSIC) beat(S, 0.0, DUR - 0.3);
    for (let i = 1; i < TS.length; i++) A.click(S, TS[i], { gain: 0.3, seed: i });
    for (const c of WHIPS) A.whoosh(S, c - 0.12, { dur: 0.22, gain: 0.45, from: 600, to: 5000, verb: 0.1 });
    A.blip(S, wt(0, 'canva') + 0.35, { gain: 0.25 });
    A.boom(S, GRATIS, { gain: 0.4, freq: 70, decay: 0.6, verb: 0.2 });
    A.musicBox(S, wt(11, 'quinze'), 1568, { gain: 0.18, verb: 0.3 });
    A.musicBox(S, wt(11, 'quinze') + 0.09, 2093, { gain: 0.18, verb: 0.3 });
    A.boom(S, END, { gain: 0.4, freq: 60, decay: 0.8, verb: 0.2 });
    A.click(S, wt(12, 'marca'), { gain: 0.5, seed: 4 });
  }

  R.mount({
    duration: DUR,
    poster: 9,
    audioFile: 'assets/voz.wav',
    audioEnd: VOICE,
    sfxGain: 0.4,
    signal: 'assets/audio-analysis.json',
    assets: { icon: '../regras-fabrica-footage/assets/logo-icone.png' },
    fonts: ['40px "Shrikhand"'],
    setup(a) {
      tioIcon = a.icon;
    },
    async prepare(t) {
      const k = shotAt(t), idx = srcIndex(k, t - TS[k]);
      cur = { k, img: await getFrame(k, idx) };
      getFrame(Math.min(SH.length - 1, k + 1), 0);
    },
    render(ctx, t) {
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);
      const k = cur.k, c = camera(k, t);
      ctx.save();
      ctx.translate(c.ox, 0);
      R.drawCover(ctx, cur.img, { zoom: c.z, fx: SH[k].fx ?? 0.5, fy: c.fy });
      ctx.restore();
      // faixa de cor da marca em cima e embaixo, para a legenda respirar
      const g = ctx.createLinearGradient(0, H * 0.55, 0, H);
      g.addColorStop(0, 'rgba(13,10,23,0)');
      g.addColorStop(1, 'rgba(13,10,23,0.75)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    },
    post,
    overlay(ctx, t) {
      hook(ctx, t);
      sectionTag(ctx, t);
      gratis(ctx, t);
      plans(ctx, t);
      endCard(ctx, t);
      captions(ctx, t);
      watermark(ctx, t);
    },
    audio,
  });
})();
