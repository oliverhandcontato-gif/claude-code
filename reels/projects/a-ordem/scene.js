/* A ORDEM — teaser de conspiração do Tio Arle (TikTok 1080×1920, 100% código).
 * Voz: assets/voz.wav (guia provisória; o Tio Arle dubla e roda tools/palavras.py com o próprio áudio).
 * Tudo é amarrado aos trechos/palavras da fala, então a dublagem reposiciona o vídeo sozinha.
 * Mensagens "subliminares": quadros de 2 frames com palavras/símbolos. Sem flashes brancos de tela
 * cheia acima de 3 por segundo (fotossensibilidade). ?semtrilha=1 tira a trilha e deixa voz + efeitos.
 */
(async function () {
  'use strict';
  const R = window.Reel, Art = window.Art, P = Art.P, K = R.kin, E = R.ease, fx = R.fx;
  const { W, H } = R;
  const NO_MUSIC = new URLSearchParams(location.search).has('semtrilha');
  const WORDS = await (await fetch('assets/palavras.json')).json();
  const { duracao: VOICE, trechos: TR } = await (await fetch('assets/trechos.json')).json();
  const DUR = Math.ceil((VOICE + 0.6) * 10) / 10;

  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '');
  const T = (i) => TR[i];
  const wordsOf = (i) => WORDS.filter((w) => w.trecho === i);
  const wt = (i, w, n = 0) => {
    const m = wordsOf(i).filter((x) => norm(x.w).startsWith(norm(w)));
    if (!m.length) throw new Error(`palavra "${w}" não achada no trecho ${i}`);
    return m[Math.min(n, m.length - 1)].s;
  };
  // cada cena começa um pouco antes do seu trecho
  const START = TR.map((x, i) => (i === 0 ? 0 : Math.max(TR[i - 1].fim + 0.1, x.ini - 0.25)));
  const sceneAt = (t) => {
    let k = 0;
    for (let i = 0; i < START.length; i++) if (t >= START[i]) k = i;
    return k;
  };
  const K1 = {
    acaso: wt(0, 'acaso'), verdade: wt(1, 'verdade'), seculos: wt(1, 'séculos'),
    mudaram: wt(2, 'mudaram'), silenciaram: wt(2, 'silenciaram'),
    moedas: wt(3, 'moedas'), predios: wt(3, 'prédios'), musicas: wt(3, 'músicas'),
    olho: wt(4, 'olho'), triangulo: wt(4, 'triângulo'), numero: wt(4, 'número'),
    coincid: wt(5, 'coincidência'), mensagem: wt(5, 'mensagem'),
    voce6: wt(6, 'você'), geracao: wt(6, 'geração'),
    alem: wt(7, 'além'), acordar: wt(7, 'acordar'),
    revelado: wt(8, 'revelado'), coragem: wt(9, 'coragem'), verdade9: wt(9, 'verdade'),
    pela: wt(10, 'pela'), segue: wt(11, 'segue'), ordem: wt(11, 'ordem'),
  };

  // ---------------- helpers ----------------
  let tmpC, logo, icon;
  const cam = (ctx, z = 1, x = 540, y = 960, rot = 0, ox = 0, oy = 0) => {
    ctx.translate(540 + ox, 960 + oy);
    ctx.rotate(rot);
    ctx.scale(z, z);
    ctx.translate(-x, -y);
  };
  const bump = (t, c, d) => Math.max(0, 1 - Math.abs(t - c) / d);
  const punch = (t, c, amt = 0.12, back = 0.3) => (t < c ? 0 : amt * Math.exp(-(t - c) / back) * R.clamp((t - c) / 0.04));
  const EMPH = Object.values(K1);
  const kick = (t) => R.sig.peak(t, 0.2, 0.5);
  /** câmera viva: deriva, giro lento, pulso em cada palavra forte */
  const live = (ctx, t, base = 1, x = 540, y = 960) => {
    let z = base + 0.025 * Math.sin(t * 0.9) + 0.04 * kick(t);
    for (const c of EMPH) z += punch(t, c, 0.07, 0.25);
    const [sx, sy] = fx.shake(t, 3 + 10 * kick(t), 7, 4);
    cam(ctx, z, x, y, Math.sin(t * 0.37) * 0.025, sx, sy);
  };
  const bigText = (ctx, s, x, y, size, color = P.bone, o = {}) => {
    const { font = 'mono', glow = 24, align = 'center', alpha = 1 } = o;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = font === 'mono' ? `700 ${size}px "VT323", monospace` : `900 ${size}px "Inter", "Arial Black", sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
    ctx.restore();
  };
  /** texto que "decodifica": glifos aleatórios que viram o texto certo */
  const decode = (ctx, s, x, y, size, p, t, color = P.bone) => {
    const n = s.length, out = [...s].map((ch, i) => (ch === ' ' || i < p * n ? ch : Art.GLYPHS[Math.floor(R.hash(i, R.frameOf(t)) * Art.GLYPHS.length)])).join('');
    ctx.save();
    ctx.font = `700 ${size}px "DejaVu Sans Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = color;
    ctx.fillText(out, x, y);
    ctx.restore();
  };

  // fundo comum: vazio, anel gigante, poeira
  function backdrop(ctx, t, hue = '42,15,58') {
    const g = ctx.createRadialGradient(540, 860, 50, 540, 860, 1300);
    g.addColorStop(0, `rgba(${hue},0.9)`);
    g.addColorStop(1, P.void);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    Art.ring(ctx, 540, 860, 980, t, { rot: t * 0.05, size: 60, alpha: 0.12, seed: 99, color: P.gold });
    Art.ring(ctx, 540, 860, 760, t, { rot: -t * 0.08, size: 46, alpha: 0.1, seed: 98, color: P.blood });
  }

  // ---------------- cenas ----------------
  function s0(ctx, t) {
    backdrop(ctx, t, '60,5,15');
    ctx.save();
    live(ctx, t, 1 + 0.15 * R.prog(t, 0, START[1]));
    Art.ring(ctx, 540, 820, 600, t, { rot: t * 0.4, size: 52, seed: 3 });
    Art.ring(ctx, 540, 820, 470, t, { rot: -t * 0.6, size: 40, seed: 4, color: P.blood });
    Art.star(ctx, 540, 820, 560, 7, 3, t * 0.3, R.prog(t, 0.2, 1.4));
    const open = E.outCubic(R.prog(t, 0.35, 1.1));
    Art.eye(ctx, 540, 820, 330, t, { open, look: [R.noise1(t * 1.3, 2) * 0.6, R.noise1(t * 1.1, 5) * 0.4], pupil: 1 - 0.5 * bump(t, K1.acaso, 0.4) });
    ctx.restore();
    if (t < 0.35) fx.static(ctx, t, 0.9);
  }
  function s1(ctx, t) {
    backdrop(ctx, t, '0,30,45');
    ctx.save();
    live(ctx, t, 1.05);
    Art.pyramidEye(ctx, 540, 640, 300, t, { p: R.prog(t, START[1], START[1] + 1.2), rays: 0.6 });
    Art.globe(ctx, 540, 900, 330, t, { marks: [[0.3, 0.6], [1.6, 0.2], [2.8, -0.3], [4.2, 0.5], [5.1, -0.1]] });
    if (t > K1.verdade - 0.1) Art.doc(ctx, 540 + (1 - E.outCubic(R.prog(t, K1.verdade - 0.1, K1.verdade + 0.3))) * 900, 1140, 520, 640, t, { redact: 1, seed: 2, rot: 0.08, stamp: R.prog(t, K1.verdade + 0.4, K1.verdade + 0.8) });
    ctx.restore();
    if (t > K1.seculos - 0.1) {
      const yrs = [1347, 1517, 1666, 1776, 1908, 1947, 1969, 2001, 2026];
      const i = Math.min(yrs.length - 1, Math.floor(R.prog(t, K1.seculos - 0.1, START[2]) * yrs.length * 1.1));
      bigText(ctx, String(yrs[i]), 540, 330, 190, P.blood);
    }
  }
  function s2(ctx, t) {
    backdrop(ctx, t, '30,5,10');
    ctx.save();
    live(ctx, t, 1.05);
    if (t < K1.mudaram - 0.1) {
      Art.doc(ctx, 540, 840, 760, 980, t, { redact: R.prog(t, START[2], K1.mudaram - 0.3), seed: 5, rot: -0.04, stamp: R.prog(t, K1.mudaram - 0.6, K1.mudaram - 0.3), title: 'APAGADO' });
    } else if (t < K1.silenciaram - 0.1) {
      Art.map(ctx, 540, 860, 900, 1120, t, { strings: R.prog(t, K1.mudaram, K1.silenciaram - 0.3), morph: R.prog(t, K1.mudaram, K1.silenciaram) });
    } else {
      // silhueta silenciada: boca com X vermelho
      Art.glow(ctx, 540, 860, 700, '120,10,25', 0.55);
      ctx.fillStyle = '#0a0609';
      ctx.shadowColor = 'rgba(255,30,50,0.9)';
      ctx.shadowBlur = 50;
      ctx.beginPath();
      ctx.arc(540, 760, 230, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(240, 1500);
      ctx.quadraticCurveTo(250, 1010, 540, 990);
      ctx.quadraticCurveTo(830, 1010, 840, 1500);
      ctx.fill();
      ctx.shadowBlur = 0;
      const p = E.outCubic(R.prog(t, K1.silenciaram, K1.silenciaram + 0.35));
      ctx.strokeStyle = P.blood;
      ctx.lineWidth = 34;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(430, 790);
      ctx.lineTo(R.lerp(430, 650, p), R.lerp(790, 900, p));
      ctx.moveTo(650, 790);
      ctx.lineTo(R.lerp(650, 430, p), R.lerp(790, 900, p));
      ctx.stroke();
      for (const sd of [-1, 1]) Art.glow(ctx, 540 + sd * 80, 700, 40, '255,40,30', 0.8);
    }
    ctx.restore();
    if (t > K1.silenciaram) fx.static(ctx, t, 0.12);
  }
  function s3(ctx, t) {
    backdrop(ctx, t, '35,25,5');
    ctx.save();
    live(ctx, t, 1.05);
    if (t < K1.moedas - 0.05) {
      // carrossel de símbolos trocando a cada 0,22 s
      const k = Math.floor(t / 0.22);
      Art.ring(ctx, 540, 860, 470, t, { seed: k, rot: t });
      if (k % 3 === 0) Art.star(ctx, 540, 860, 380, 8, 3, t, 1, P.gold);
      else if (k % 3 === 1) Art.sigil(ctx, 540, 860, 360, k, 1);
      else Art.flowerOfLife(ctx, 540, 860, 360, 1);
    } else if (t < K1.predios - 0.05) {
      Art.coin(ctx, 540, 860, 360, t, 1.4);
      Art.coin(ctx, 200, 1300, 120, t + 1, 2);
      Art.coin(ctx, 880, 470, 110, t + 2, 2.2);
    } else if (t < K1.musicas - 0.05) {
      Art.city(ctx, 1700, t, { glowTop: E.outCubic(R.prog(t, K1.predios, K1.predios + 0.5)) });
    } else {
      Art.wave(ctx, 900, t, { reveal: E.inOutCubic(R.prog(t, K1.musicas + 0.4, START[4] - 0.2)) });
      Art.ring(ctx, 540, 900, 520, t, { rot: t * 1.5, size: 34, seed: 12, alpha: 0.5, color: P.cyan });
    }
    ctx.restore();
  }
  function s4(ctx, t) {
    backdrop(ctx, t, '50,30,0');
    if (t > K1.numero - 0.05) Art.numberRain(ctx, t, { alpha: 0.55, color: '217,180,90' });
    ctx.save();
    live(ctx, t, 1.05 + 0.15 * R.prog(t, K1.olho, START[5]));
    if (t > K1.triangulo - 0.05) {
      const n = Math.floor(R.prog(t, K1.triangulo, K1.numero) * 6) + 1;
      for (let k = 0; k < n; k++) Art.star(ctx, 540, 860, 300 + k * 80, 3, 1, (k % 2 ? 1 : -1) * t * 0.4 + k * 0.3, 1, k % 2 ? P.blood : P.gold);
    }
    Art.pyramidEye(ctx, 540, 860, 330, t, { p: R.prog(t, START[4], K1.olho + 0.3), open: R.prog(t, K1.olho, K1.olho + 0.5), look: [Math.sin(t * 2) * 0.5, 0] });
    ctx.restore();
    if (t > K1.numero) {
      const nums = ['33', '11:11', '23', '333', '7'];
      bigText(ctx, nums[Math.floor(t * 6) % nums.length], 540, 330, 200, P.gold);
    }
  }
  function s5(ctx, t) {
    backdrop(ctx, t, '10,30,15');
    Art.numberRain(ctx, t, { alpha: 0.25, speed: 500 });
    ctx.save();
    live(ctx, t, 1.05);
    Art.metatron(ctx, 540, 860, 470, R.prog(t, START[5], START[5] + 1.5), t * 0.3);
    ctx.restore();
    decode(ctx, 'NÃO É', 540, 600, 110, R.prog(t, START[5] + 0.2, K1.coincid), t, P.toxic);
    decode(ctx, 'COINCIDÊNCIA', 540, 730, 100, R.prog(t, K1.coincid - 0.2, K1.coincid + 0.6), t, P.toxic);
    if (t > K1.mensagem - 0.3) decode(ctx, 'É UMA MENSAGEM', 540, 1000, 88, R.prog(t, K1.mensagem - 0.2, K1.mensagem + 0.5), t, P.blood);
  }
  function s6(ctx, t) {
    backdrop(ctx, t, '45,8,20');
    ctx.save();
    live(ctx, t, 1.05);
    Art.pyramidEye(ctx, 540, 520, 230, t, { rays: 1, look: [0, 0.6] });
    Art.crowd(ctx, 1600, t, { eyes: R.prog(t, K1.geracao - 0.2, K1.geracao + 0.6) });
    ctx.restore();
    // mira travando em "você"
    if (t > K1.voce6 - 0.1) {
      const p = E.outCubic(R.prog(t, K1.voce6 - 0.1, K1.voce6 + 0.3)), s = R.lerp(600, 180, p);
      ctx.save();
      ctx.strokeStyle = P.blood;
      ctx.lineWidth = 8;
      ctx.translate(540, 1080);
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        ctx.beginPath();
        ctx.moveTo(a * s, b * s * 0.6);
        ctx.lineTo(a * s, b * (s * 0.6 - 60));
        ctx.moveTo(a * s, b * s * 0.6);
        ctx.lineTo(a * (s - 60), b * s * 0.6);
        ctx.stroke();
      }
      bigText(ctx, 'VOCÊ', 0, 0, 120, P.blood, { font: 'sans', alpha: p });
      ctx.restore();
    }
  }
  function s7(ctx, t) {
    ctx.fillStyle = P.void;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    live(ctx, t, 1 + 0.2 * R.prog(t, START[7], START[8]));
    Art.portal(ctx, 540, 860, t, { speed: 1.2 + 2 * R.prog(t, K1.acordar - 0.5, K1.acordar) });
    const open = t > K1.acordar ? 1 : 0.15 + 0.2 * Math.sin(t * 3);
    Art.eye(ctx, 540, 860, 230 + 120 * punch(t, K1.acordar, 1, 0.5), t, { open, look: [0, 0], pupil: t > K1.acordar ? 0.5 : 1 });
    ctx.restore();
  }
  function s8(ctx, t) {
    backdrop(ctx, t, '50,5,10');
    ctx.save();
    live(ctx, t, 1.05);
    Art.flowerOfLife(ctx, 540, 820, 420, R.prog(t, START[8], K1.revelado + 0.4));
    ctx.restore();
    Art.loading(ctx, 540, 1080, 760, Math.min(0.99, R.prog(t, START[8], K1.revelado + 0.5) * 0.99), t);
    const days = Math.max(0, 7 - Math.floor(R.prog(t, START[8], START[9]) * 7));
    bigText(ctx, `00:0${days}:${String(59 - Math.floor((t * 10) % 60)).padStart(2, '0')}`, 540, 380, 150, P.blood);
  }
  function s9(ctx, t) {
    backdrop(ctx, t, '40,0,8');
    const hb = Math.max(bump(t % 0.86, 0.05, 0.1), bump(t % 0.86, 0.3, 0.1) * 0.7);
    ctx.save();
    live(ctx, t, 1.05 + 0.04 * hb);
    Art.ouroboros(ctx, 540, 860, 470, t, R.prog(t, START[9], START[9] + 1));
    Art.tree(ctx, 540, 860, 330, t, R.prog(t, START[9], K1.verdade9 + 0.3));
    ctx.restore();
    if (t > K1.coragem - 0.1) bigText(ctx, 'VOCÊ TEM CORAGEM?', 540, 285, 88, P.bone, { font: 'sans', alpha: R.clamp((t - K1.coragem + 0.1) * 4) });
  }
  const USERS = ['@iniciado_23', '@olho.aberto', '@ordem_777', '@nova.geracao', '@sinal.33'];
  function s10(ctx, t) {
    backdrop(ctx, t, '45,8,20');
    ctx.save();
    live(ctx, t, 1.0);
    Art.ring(ctx, 540, 860, 560, t, { rot: t * 0.5, size: 44, seed: 7, alpha: 0.6 });
    ctx.restore();
    const t0 = K1.pela - 0.1;
    Art.comment(ctx, 540, 520, 900, 'PELA NOVA GERAÇÃO', R.prog(t, t0, t0 + 0.8), { user: 'você', hl: true, likes: t > t0 + 0.8 ? Math.floor(R.prog(t, t0 + 0.8, START[11]) * 9999) : 0 });
    USERS.forEach((u, i) => {
      const ti = t0 + 0.5 + i * 0.22;
      if (t < ti) return;
      const p = E.outCubic(R.clamp((t - ti) / 0.25));
      Art.comment(ctx, 540 + (1 - p) * 700, 670 + i * 128, 860, 'PELA NOVA GERAÇÃO', 1, { user: u, likes: Math.floor(R.hash(i, 3) * 900) + 20 });
    });
  }
  function s11(ctx, t) {
    backdrop(ctx, t, '60,5,15');
    const lt = t - START[11];
    ctx.save();
    live(ctx, t, 1.0 + 0.08 * R.prog(t, START[11], DUR));
    Art.ring(ctx, 540, 760, 620, t, { rot: t * 0.3, size: 50, seed: 11 });
    Art.ring(ctx, 540, 760, 490, t, { rot: -t * 0.5, size: 38, seed: 13, color: P.blood });
    const m = E.inOutCubic(R.prog(t, K1.segue - 0.1, K1.segue + 0.8));
    ctx.globalAlpha = 1 - m;
    Art.pyramidEye(ctx, 540, 760, 300, t, { rays: 1 });
    ctx.globalAlpha = 1;
    if (m > 0 && logo) {
      // o olho da Ordem vira o símbolo do Tio Arle
      const s = 0.55 + 0.1 * m + 0.03 * Math.sin(t * 4);
      ctx.save();
      ctx.globalAlpha = m;
      ctx.translate(540 + (R.hash(R.frameOf(t), 3) < 0.15 ? 12 : 0), 760);
      ctx.drawImage(logo, -465 * s, -400 * s, 930 * s, 740 * s);
      ctx.restore();
    }
    ctx.restore();
    if (t > K1.segue - 0.1 && t < K1.ordem - 0.1) bigText(ctx, 'SEGUE O TIO ARLE', 540, 1210, 84, P.bone, { font: 'sans', alpha: R.clamp((t - K1.segue + 0.1) * 4) });
    if (t > K1.ordem - 0.1) bigText(ctx, 'FAÇA PARTE DA ORDEM', 540, 1210, 78, P.gold, { font: 'sans', alpha: R.clamp((t - K1.ordem + 0.1) * 4) });
    if (lt > 0.3) {
      ctx.save();
      const p = R.spring(lt - 0.3, 1.8, 6);
      ctx.translate(540, 1400);
      ctx.scale(p, p);
      ctx.fillStyle = 'rgba(196,16,42,0.95)';
      ctx.beginPath();
      ctx.roundRect(-330, -55, 660, 110, 26);
      ctx.fill();
      ctx.font = '900 46px "Inter", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText('COMENTE: PELA NOVA GERAÇÃO', 0, 4);
      ctx.restore();
    }
  }
  const SCENES = [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11];

  // ---------------- mensagens subliminares (2 quadros) ----------------
  const SUB_WORDS = ['ACORDE', 'VOCÊ FOI ESCOLHIDO', 'A ORDEM', 'OLHE DE NOVO', 'ELES SABEM', '33', 'NÃO PISQUE', 'PELA NOVA GERAÇÃO', 'TIO ARLE', 'ESTÁ PERTO'];
  const SUBS = [];
  for (let t = 1.7, i = 0; t < DUR - 2; t += 2.3 + R.hash(i, 77) * 1.6, i++) SUBS.push({ t, i });
  function subliminal(ctx, t) {
    for (const s of SUBS) {
      if (t < s.t || t >= s.t + 2 / 30) continue;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.88)';
      ctx.fillRect(0, 0, W, H);
      if (s.i % 3 === 2) {
        Art.pyramidEye(ctx, 540, 900, 380, t, { rays: 0 });
      } else {
        bigText(ctx, SUB_WORDS[s.i % SUB_WORDS.length], 540, 900, s.i % 2 ? 120 : 150, s.i % 2 ? P.blood : P.bone, { font: 'sans', glow: 40 });
      }
      ctx.restore();
    }
  }

  // ---------------- legendas ----------------
  const EM = new Set(['acaso', 'verdade', 'governos', 'séculos', 'apagaram', 'mapas', 'silenciaram', 'símbolos', 'moedas', 'prédios', 'músicas', 'olho', 'triângulo', 'número', 'coincidência', 'mensagem', 'você', 'geração', 'além', 'imaginável', 'acordar', 'revelado', 'coragem', 'pronto', 'pela', 'nova', 'tio', 'arle', 'ordem']);
  const clean = (s) => s.toLowerCase().replace(/[^\p{L}-]/gu, '');
  const CAPS = [];
  TR.forEach((tr) => {
    const ws = wordsOf(tr.i);
    let chunk = [];
    ws.forEach((w, k) => {
      chunk.push(w);
      const punct = /[,.…:!?]$/.test(w.w), left = ws.length - k - 1;
      if ((punct && chunk.length >= 1) || chunk.length >= 3) {
        if (left === 1 && !punct) return;
        CAPS.push(chunk);
        chunk = [];
      }
    });
    if (chunk.length) CAPS.push(chunk);
  });
  const LINES = CAPS.map((c, k) => {
    const next = CAPS[k + 1], end = c[c.length - 1].e;
    return {
      style: 'horror', t1: Math.min(end + 0.4, next ? next[0].s - 0.18 : end + 0.8), y: 1330, size: 90, maxW: 840, x: 520, jitter: 0.35, emJitter: 0.5, out: 0.14,
      words: c.map((w) => ({ s: w.w.toUpperCase().replace(/\.\.\.$/, '…'), t: w.s, em: EM.has(clean(w.w)) })),
    };
  });

  // ---------------- pós-produção ----------------
  const BASE = { uSat: 0.9, uContrast: 1.22, uVignette: 1.0, uGrain: 0.12, uScan: 0.16, uCurve: 0.06, uAberr: 3, uFilm: 0.4, uBloom: 0.55, uTint: [1.06, 0.92, 0.98], uTintAmt: 0.4 };
  function post(t) {
    const k = sceneAt(t);
    const p = { ...BASE };
    if (k === 5) Object.assign(p, { uTint: [0.8, 1.15, 0.9], uTintAmt: 0.5 });
    if (k === 7) Object.assign(p, { uBloom: 0.9, uSat: 1.1 });
    for (let i = 1; i < START.length; i++) p.uGlitch = (p.uGlitch || 0) + bump(t, START[i], 0.14) * 0.8;
    // micro-glitches frequentes
    const f = R.frameOf(t);
    if (R.hash(Math.floor(f / 3), 41) < 0.08) p.uGlitch = (p.uGlitch || 0) + 0.25;
    for (const c of EMPH) {
      const d = t - c;
      if (d >= 0 && d < 0.3) p.uAberr += 10 * Math.exp(-d * 10);
    }
    if (t >= K1.acordar && t < K1.acordar + 0.08) p.uInvert = 1; // um único quadro invertido
    p.uSeed = f % 97;
    return p;
  }

  // ---------------- trilha e efeitos ----------------
  function pad(S, t0, t1, notes, gain = 0.08) {
    const ac = S.ac, out = ac.createGain();
    out.gain.setValueAtTime(0.0001, t0);
    out.gain.exponentialRampToValueAtTime(gain, t0 + 2);
    out.gain.setValueAtTime(gain, t1 - 1.5);
    out.gain.exponentialRampToValueAtTime(0.0001, t1);
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1100;
    f.Q.value = 2;
    f.connect(out);
    out.connect(S.out);
    const v = ac.createGain();
    v.gain.value = 0.5;
    out.connect(v);
    v.connect(S.verb);
    for (const n of notes) for (const d of [-9, 0, 8]) {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 440 * Math.pow(2, (n - 69) / 12);
      o.detune.value = d;
      const g = ac.createGain();
      g.gain.value = 0.12;
      o.connect(g);
      g.connect(f);
      o.start(t0);
      o.stop(t1 + 0.1);
    }
  }
  function audio(S, A) {
    const M = !NO_MUSIC;
    if (M) {
      A.drone(S, 0, DUR, { gain: 0.16, base: 36.7, fin: 1.5, fout: 1.5, cutoff: 300 });
      pad(S, START[1], START[7], [50, 53, 57], 0.07); // ré menor
      pad(S, START[7], START[10], [49, 52, 56, 59], 0.09); // tensão
      pad(S, START[10], DUR, [50, 54, 57, 62], 0.1); // abre no final
      A.vhsBed(S, 0, DUR, { gain: 0.05 });
    }
    A.static(S, 0, 0.35, { gain: 0.5 });
    A.subDrop(S, 0.35, { gain: 0.8 });
    for (let i = 1; i < START.length; i++) {
      A.boom(S, START[i] + 0.02, { gain: 0.5, freq: 42, decay: 1.4 });
      A.blip(S, START[i], { gain: 0.3, seed: i });
    }
    for (const s of SUBS) A.static(S, s.t, 0.07, { gain: 0.35, seed: s.i });
    for (let t = 2, i = 0; t < DUR - 3; t += 4.7, i++) A.whisper(S, t, 1.2, { gain: 0.12, seed: i + 20 });
    A.whoosh(S, K1.verdade - 0.3, { dur: 0.35, gain: 0.3 });
    A.click(S, K1.verdade + 0.4, { gain: 0.5 });
    for (let k = 0; k < 6; k++) A.click(S, START[2] + 0.2 + k * 0.18, { gain: 0.2, seed: k });
    A.static(S, K1.silenciaram, 0.5, { gain: 0.3 });
    A.musicBox(S, K1.moedas, 2637, { gain: 0.15, verb: 0.5 });
    A.boom(S, K1.olho, { gain: 0.6, freq: 50 });
    for (let k = 0; k < 8; k++) A.blip(S, K1.numero + k * 0.16, { gain: 0.15, seed: k + 50 });
    A.riser(S, K1.alem - 0.5, K1.acordar, { gain: 0.4 });
    A.sting(S, K1.acordar, { gain: 0.8 });
    for (let k = 0; START[9] + k * 0.86 < START[10]; k++) A.heartbeat(S, START[9] + k * 0.86, { gain: 0.55 });
    for (let k = 0; k < 8; k++) A.click(S, K1.pela + 0.5 + k * 0.22, { gain: 0.25, seed: k + 9 });
    A.boom(S, K1.segue, { gain: 0.8, freq: 38, decay: 2.4 });
    A.subDrop(S, K1.ordem, { gain: 0.7 });
  }

  R.mount({
    duration: DUR,
    poster: K1.olho + 0.6,
    audioFile: 'assets/voz.wav',
    audioEnd: VOICE,
    sfxGain: 0.5,
    signal: 'assets/audio-analysis.json',
    assets: { logo: '../regras-fabrica-footage/assets/logo.png', icon: '../regras-fabrica-footage/assets/logo-icone.png' },
    fonts: ['40px "VT323"', '40px "Shrikhand"', '40px "DejaVu Sans"', '40px "DejaVu Sans Mono"'],
    setup(a) {
      logo = a.logo;
      icon = a.icon;
      tmpC = R.canvas(W, H);
    },
    render(ctx, t) {
      SCENES[sceneAt(t)](ctx, t);
      R.resetCtx(ctx);
    },
    post,
    overlay(ctx, t) {
      if (t < START[11]) for (const L of LINES) K.line(ctx, t, L);
      subliminal(ctx, t);
      // marca d'água discreta
      if (icon && t < START[11]) {
        ctx.save();
        ctx.globalAlpha = 0.28;
        const pos = [[150, 300], [860, 300], [150, 1060], [860, 1060]][Math.floor(t / 7) % 4];
        ctx.drawImage(icon, pos[0] - 60, pos[1] - 45, 120, 90);
        ctx.restore();
      }
    },
    audio,
  });
})();
