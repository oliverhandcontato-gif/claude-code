/* NÃO FAÇA A MENINA CHORAR — enigma de terror com humor macabro do Tio Arle (TikTok 1080×1920, 100% código).
 * Voz: assets/voz.wav (guia provisória com Piper; o Tio Arle dubla e roda tools/palavras.py com o próprio áudio).
 * Tudo é amarrado aos trechos/palavras da fala, então a dublagem reposiciona o vídeo sozinha.
 * Gritos e risadas: assets/gritos.wav e assets/risada.wav (tools/efeitos.py), tocados na trilha de efeitos.
 * Violência implícita: o "tiro" é corte para preto + estampido + flash; a menina só aparece como silhueta.
 * Sem trilha musical (o criador põe a música no app): só ambiente e efeitos.
 */
(async function () {
  'use strict';
  const R = window.Reel, Art = window.Art, P = Art.P, K = R.kin, E = R.ease, fx = R.fx;
  const { W, H } = R;
  const WORDS = await (await fetch('assets/palavras.json')).json();
  const { duracao: VOICE, trechos: TR } = await (await fetch('assets/trechos.json')).json();
  const DUR = Math.ceil((VOICE + 0.6) * 10) / 10;
  const decodeWav = async (u) => new OfflineAudioContext(2, 48000, 48000).decodeAudioData(await (await fetch(u)).arrayBuffer());
  const [GRITOS, RISADA] = await Promise.all([decodeWav('assets/gritos.wav'), decodeWav('assets/risada.wav')]);

  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '');
  const T = (i) => TR[i];
  const wordsOf = (i) => WORDS.filter((w) => w.trecho === i);
  const wt = (i, w, n = 0) => {
    const m = wordsOf(i).filter((x) => (w.endsWith('=') ? norm(x.w) === norm(w) : norm(x.w).startsWith(norm(w))));
    if (!m.length) throw new Error(`palavra "${w}" não achada no trecho ${i}`);
    return m[Math.min(n, m.length - 1)].s;
  };
  const Kw = {
    nao: wt(0, 'não'), menina: wt(0, 'menina'), chorar0: wt(0, 'chorar'),
    tres: wt(1, 'três'), amarradas: wt(1, 'amarradas'), A: wt(1, 'a='), B: wt(1, 'bê'), C: wt(1, 'cê'),
    eliminar: wt(2, 'eliminar'), quem: wt(2, 'quem'),
    a3: wt(3, 'a', 1), era3: wt(3, 'era'), avo: wt(3, 'avô'), chorar3: wt(3, 'chorar'), muito: wt(3, 'muito'),
    b4: wt(4, 'bê'), era4: wt(4, 'era'), irmao: wt(4, 'irmão'), choro: wt(4, 'choro'), certa: wt(4, 'certa'),
    entao: wt(5, 'então'), c5: wt(5, 'cê'), parabens: wt(5, 'parabéns'), voce5: wt(5, 'você', 1),
    pai: wt(6, 'pai'), saida: wt(7, 'saída'), unico: wt(7, 'único'), atirar: wt(7, 'atirar'),
    chorou: wt(8, 'chorou'), segue: wt(9, 'segue'), arle: wt(9, 'arle'), coragem: wt(9, 'coragem'),
  };
  // cada cena começa um pouco antes do seu trecho
  const START = TR.map((x, i) => (i === 0 ? 0 : Math.max(TR[i - 1].fim + 0.1, x.ini - 0.25)));
  const TIMER0 = T(2).fim + 0.15, TIMER1 = START[3] - 0.05;
  const SCREAM = T(6).fim + 0.15, LAUGH = SCREAM + 1.75;
  const BEEP = T(7).beep || [T(7).fim + 0.06, T(7).fim + 0.86];
  const SHOT = BEEP[1] + 0.08;
  START[6] = Kw.pai - 0.03; // o "PAI" é o corte seco
  START[8] = Math.min(START[8], SHOT + 0.9);
  const sceneAt = (t) => {
    let k = 0;
    for (let i = 0; i < START.length; i++) if (t >= START[i]) k = i;
    return k;
  };

  // ---------------- helpers ----------------
  let logo, icon;
  const bump = (t, c, d) => Math.max(0, 1 - Math.abs(t - c) / d);
  const punch = (t, c, amt = 0.1, back = 0.3) => (t < c ? 0 : amt * Math.exp(-(t - c) / back) * R.clamp((t - c) / 0.04));
  const after = (t, c, d = 0.25) => R.clamp((t - c) / d);
  const HITS = [Kw.nao, Kw.tres, Kw.A, Kw.B, Kw.C, Kw.eliminar, Kw.avo, Kw.muito, Kw.irmao, Kw.choro, Kw.parabens, Kw.pai, Kw.atirar, Kw.segue];
  /** câmera: zoom z mirando o ponto (fx, fy) do mundo, sem mostrar a borda */
  const cam = (ctx, t, z, fxw, fyw, shake = 0) => {
    for (const c of HITS) z += punch(t, c, 0.035, 0.25);
    const hw = 540 / z, hh = 960 / z;
    const cx = R.clamp(fxw, hw, W - hw), cy = R.clamp(fyw, hh, H - hh);
    const [sx, sy] = fx.shake(t, 2 + shake, 8, 4);
    ctx.translate(540 + sx, 960 + sy);
    ctx.rotate(Math.sin(t * 0.4) * 0.008 + (shake ? 0.004 * shake * R.noise1(t * 9, 2) : 0));
    ctx.scale(z, z);
    ctx.translate(-cx, -cy);
  };
  const smooth = (t, a, b) => E.inOutCubic(R.prog(t, a, b));

  // posições dos cativos
  const SEAT_Y = 1040, SC = 0.78;
  const PEOPLE = [
    { kind: 'avo', letter: 'A', label: 'AVÔ', x: 255, seed: 1 },
    { kind: 'irmao', letter: 'B', label: 'IRMÃO', x: 540, seed: 2 },
    { kind: 'pai', letter: 'C', label: 'PAI', x: 825, seed: 3 },
  ];
  const HEAD_Y = SEAT_Y - 395 * SC;
  /** estado de cada cativo no tempo t */
  function stateOf(i, t) {
    const pop = [Kw.A, Kw.B, Kw.C][i];
    const s = { sack: 0, flip: 0, x: 0, fear: 0.5, pop: bump(t, pop + 0.1, 0.25) };
    if (i === 0) {
      s.sack = R.prog(t, Kw.era3 - 0.1, Kw.avo + 0.1);
      s.flip = R.prog(t, Kw.avo, Kw.avo + 0.3);
      s.x = R.prog(t, Kw.muito - 0.1, Kw.muito + 0.3);
    } else if (i === 1) {
      s.sack = R.prog(t, Kw.era4 - 0.1, Kw.irmao + 0.1);
      s.flip = R.prog(t, Kw.irmao, Kw.irmao + 0.3);
      s.x = R.prog(t, Kw.choro + 0.2, Kw.choro + 0.6);
    } else {
      s.sack = t >= Kw.pai ? 1 : 0.12 * R.prog(t, Kw.voce5, Kw.pai) * (1 + Math.sin(t * 30) * 0.3);
      s.flip = t >= Kw.pai ? 1 : 0;
    }
    if (t > Kw.eliminar) s.fear = 1;
    return s;
  }
  function drawCaptives(ctx, t, o = {}) {
    const b = o.bulb;
    // sombras na parede (contrárias à lâmpada)
    ctx.save();
    ctx.globalAlpha = 0.35 * (o.on ?? 1);
    ctx.filter = 'blur(10px)';
    for (const p of PEOPLE) {
      const dx = (p.x - b.x) * 0.35;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(p.x + dx, HEAD_Y - 120, 70, 160, (p.x - b.x) * 0.0006, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.filter = 'none';
    ctx.restore();
    PEOPLE.forEach((p, i) => {
      const s = stateOf(i, t);
      Art.captive(ctx, p.x, SEAT_Y, SC * (1 + 0.06 * s.pop), { ...p, ...s, t, x: s.x, label: p.label, wiggle: o.wiggle ?? 1 });
    });
  }
  /** cena do porão com a lâmpada e o véu de luz */
  function roomScene(ctx, t, o = {}) {
    const { z = 1, fx: fxw = 540, fy: fyw = 960, shake = 0, amp = 0.26, on = 1, spots = [], dark = 0.89 } = o;
    const b = Art.bulbPos(t, amp);
    ctx.save();
    cam(ctx, t, z, fxw, fyw, shake);
    Art.room(ctx, false);
    drawCaptives(ctx, t, { bulb: b, on, wiggle: o.wiggle });
    if (o.inside) o.inside(ctx, b);
    Art.darkness(ctx, b, on, { dark, spots });
    Art.lamp(ctx, b, on);
    fx.dust(ctx, t, { alpha: 0.25 * on });
    ctx.restore();
    return b;
  }
  const spotOn = (i, a, r = 260) => ({ x: PEOPLE[i].x, y: SEAT_Y - 150, r, a, sy: 1.6 });
  /** a menina em primeiro plano (só silhueta), de costas para a câmera, olhando os cativos */
  const girlFront = (ctx, t, a = 1, rim = '255,190,120') => {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    Art.girl(ctx, 150, 1930, 560, t, { rim, rimA: 0.7 });
    ctx.restore();
  };

  // ---------------- cenas ----------------
  function s0(ctx, t) {
    const on = t < 0.25 ? 0 : Art.flicker(t, t < 0.9 ? 0.9 : 0.25, 5);
    const b = Art.bulbPos(t, 0.2);
    ctx.save();
    cam(ctx, t, 1.06 + 0.12 * R.prog(t, 0, START[1]), 540, 980);
    Art.room(ctx, true);
    Art.doorway(ctx, t, { amt: 0.9 });
    Art.girl(ctx, 540, 1255, 520, t, { rim: '255,40,50', rimA: 0.9 });
    Art.darkness(ctx, b, on, { dark: 0.9, spots: [{ x: 540, y: 950, r: 420, a: 0.55, sy: 1.6 }] });
    Art.lamp(ctx, b, on);
    ctx.restore();
    if (t < 0.3) fx.static(ctx, t, 0.8);
  }
  function s1(ctx, t) {
    const sp = [0, 1, 2].map((i) => spotOn(i, 0.5 * bump(t, [Kw.A, Kw.B, Kw.C][i] + 0.2, 0.5)));
    roomScene(ctx, t, { z: 1.12 - 0.08 * smooth(t, START[1], Kw.tres), fy: 900, spots: sp, on: Art.flicker(t, 0.15) });
    girlFront(ctx, t, after(t, Kw.amarradas, 0.6));
  }
  function s2(ctx, t) {
    const timer = t >= TIMER0;
    // durante o timer o holofote passa de um em um
    const sp = [];
    if (timer) {
      const k = Math.floor((t - TIMER0) / 0.48) % 3;
      sp.push(spotOn(k, 0.45));
    }
    const shake = timer ? 1.5 * R.prog(t, TIMER0, TIMER1) : 0;
    roomScene(ctx, t, { z: 1.04 + 0.1 * R.prog(t, START[2], TIMER1), fy: 900, spots: sp, shake, on: Art.flicker(t, 0.15 + 0.3 * R.prog(t, TIMER0, TIMER1)) });
    girlFront(ctx, t);
    if (t > Kw.eliminar - 0.05 && t < Kw.eliminar + 0.6) fx.tint(ctx, 'rgba(160,0,10,1)', 0.25 * (1 - after(t, Kw.eliminar, 0.6)), 'multiply');
  }
  function sReveal(i, t0, t1) {
    return (ctx, t) => {
      const p = PEOPLE[i];
      const zin = smooth(t, t0, t0 + 0.7), zout = smooth(t, t1 - 0.6, t1);
      const z = 1 + 0.5 * zin - 0.35 * zout;
      const sp = [spotOn(i, 0.55 + 0.3 * after(t, i === 0 ? Kw.avo : Kw.irmao, 0.3))];
      roomScene(ctx, t, { z, fx: R.lerp(540, p.x, zin * (1 - zout)), fy: R.lerp(900, HEAD_Y + 120, zin * (1 - zout)), spots: sp, on: Art.flicker(t, 0.12), dark: 0.91 });
      girlFront(ctx, t, 1 - zin * 0.8 + zout * 0.8);
    };
  }
  const s3 = sReveal(0, START[3], START[4]);
  const s4 = sReveal(1, START[4], START[5]);
  function s5(ctx, t) {
    const zin = smooth(t, START[5], Kw.c5 + 0.3);
    const party = after(t, Kw.parabens - 0.05, 0.15);
    const sp = [spotOn(2, 0.6 + 0.35 * party)];
    roomScene(ctx, t, { z: 1 + 0.45 * zin + 0.1 * R.prog(t, Kw.voce5, Kw.pai), fx: R.lerp(540, 825, zin), fy: R.lerp(900, HEAD_Y + 140, zin), spots: sp, on: 1, dark: 0.89 - 0.22 * party, amp: 0.26 - 0.18 * zin });
    if (party > 0) {
      // luz de festa: brilho quente e girando
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      const hue = (t * 160) % 360;
      ctx.fillStyle = `hsla(${hue},90%,60%,${0.35 * party})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (t > Kw.parabens - 0.05) Art.confetti(ctx, t, Kw.parabens - 0.05);
  }
  function s6(ctx, t) {
    const scream = t >= SCREAM, laugh = t >= LAUGH;
    const on = Art.flicker(t, laugh ? 0.5 : scream ? 0.7 : 0.35, 9);
    const zin = 1.45 + 0.25 * punch(t, Kw.pai, 1, 0.6);
    if (!laugh) {
      roomScene(ctx, t, {
        z: zin + 0.12 * R.prog(t, SCREAM, LAUGH), fx: 825, fy: HEAD_Y + 140, shake: scream ? 10 : 6 * (1 - after(t, Kw.pai, 0.8)), amp: 0.45,
        on, dark: 0.95, spots: [{ x: 825, y: HEAD_Y + 80, r: 320, a: 0.7, sy: 1.4 }],
      });
      // confete congelado e sem cor
      ctx.save();
      ctx.filter = 'grayscale(1) brightness(0.6)';
      Art.confetti(ctx, t, Kw.parabens - 0.05, 140, Kw.pai);
      ctx.restore();
      fx.tint(ctx, 'rgb(150,0,15)', 0.55, 'multiply');
      if (scream) {
        const lt = t - SCREAM;
        for (let k = 0; k < 6; k++) {
          const ph = (lt * (0.35 + 0.1 * k) + k * 0.17) % 1;
          const x = 540 + Math.sin(k * 2.1 + lt * (1 + k * 0.3)) * 360, y = 1500 - ph * 1300;
          Art.ghost(ctx, x, y, 1.1 + 0.6 * Math.sin(k), t, k + 1, 0.5 * Math.sin(Math.PI * ph) * R.clamp(lt * 3));
        }
      }
    } else {
      // a risada: plano aberto, tudo no escuro, só olhos e um sorriso enorme
      const lt = t - LAUGH;
      roomScene(ctx, t, { z: 1.08 + 0.06 * Math.sin(lt * 2), fy: 900, shake: 4, amp: 0.5, on: on * 0.6, dark: 0.97 });
      girlFront(ctx, t, 1, '255,40,50');
      const op = 0.6 + 0.4 * Math.abs(Math.sin(lt * 11));
      ctx.save();
      ctx.globalAlpha = R.clamp(lt * 4) * (1 - after(t, START[7] - 0.3, 0.3));
      Art.grin(ctx, 540, 520, 820, t, op);
      ctx.restore();
    }
    if (t < Kw.pai + 0.1) fx.static(ctx, t, 0.6 * (1 - after(t, Kw.pai, 0.1)));
  }
  function s7(ctx, t) {
    if (t >= SHOT) {
      // corte para preto + flash do estampido
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      const f = R.frameOf(t) - R.frameOf(SHOT);
      if (f < 2) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, W, H);
      } else if (f < 6) {
        ctx.fillStyle = `rgba(255,240,220,${0.5 * (1 - (f - 2) / 4)})`;
        ctx.fillRect(0, 0, W, H);
      }
      return;
    }
    const b = Art.bulbPos(t, 0.3);
    const beep = t >= BEEP[0];
    const on = beep ? Art.flicker(t, 0.6, 13) : Art.flicker(t, 0.18, 4);
    ctx.save();
    cam(ctx, t, 1.05 + 0.35 * smooth(t, START[7], SHOT), 540, 960 - 60 * R.prog(t, START[7], SHOT), beep ? 6 : 0);
    Art.room(ctx, true);
    Art.doorway(ctx, t, { amt: 0.85 + 0.15 * Math.sin(t * 5) });
    Art.girl(ctx, 540, 1255, 520, t, { rim: '255,40,50', rimA: 0.95 });
    Art.darkness(ctx, b, on, { dark: 0.92, spots: [{ x: 540, y: 950, r: 440, a: 0.55, sy: 1.6 }] });
    Art.lamp(ctx, b, on);
    ctx.restore();
    if (beep) fx.static(ctx, t, 0.18);
  }
  function s8(ctx, t) {
    const b = Art.bulbPos(t, 0.14);
    const fin = after(t, START[8], 0.7);
    ctx.save();
    cam(ctx, t, 1.12, 540, 1000);
    Art.room(ctx, true);
    Art.doorway(ctx, t, { color: '120,140,175', amt: 0.75 });
    Art.teddy(ctx, 575, 1205, 0.8, 1.35);
    Art.darkness(ctx, b, 1, { dark: 0.9, spots: [{ x: 570, y: 1190, r: 320, a: 0.8, sy: 0.8 }] });
    Art.lamp(ctx, b, 1);
    fx.dust(ctx, t, { alpha: 0.25 });
    ctx.restore();
    if (fin < 1) {
      ctx.fillStyle = `rgba(0,0,0,${1 - fin})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
  function s9(ctx, t) {
    const lt = t - START[9];
    const g = ctx.createRadialGradient(540, 800, 40, 540, 800, 1200);
    g.addColorStop(0, '#2a0207');
    g.addColorStop(1, '#030102');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    fx.fog(ctx, t, { alpha: 0.12, speed: 14, scale: 6, mode: 'screen' });
    const m0 = Kw.segue + 0.25, m1 = Kw.segue + 1.45;
    const m = smooth(t, m0, m1);
    const [sx, sy] = fx.shake(t, 2 + 8 * bump(t, m0 + 0.6, 0.6), 8, 7);
    ctx.save();
    ctx.translate(sx, sy);
    // 1) o logo aparece com glitch; 2) o triângulo do A vira um olho que cresce; 3) o olho chora sangue
    const LS = 0.72, lw = 930 * LS, lh = 740 * LS, lx = 540 - lw / 2, ly = 800 - lh / 2 - 60;
    const hole = { x: lx + 463 * LS, y: ly + 272 * LS };
    if (m < 1 && logo) {
      const ins = after(t, START[9] + 0.05, 0.35);
      ctx.save();
      ctx.globalAlpha = ins * (1 - R.clamp((m - 0.35) / 0.5));
      const sc = 1 + 0.25 * m;
      ctx.translate(hole.x, hole.y);
      ctx.scale(sc, sc * (1 - 0.35 * m));
      ctx.translate(-hole.x, -hole.y);
      const gl = (1 - ins) * 0.8 + 0.9 * bump(m, 0.4, 0.4) + (R.hash(R.frameOf(t), 3) < 0.1 ? 0.3 : 0);
      if (gl > 0.05) Art.sliced(ctx, logo, lx, ly, lw, lh, gl, R.frameOf(t));
      else ctx.drawImage(logo, lx, ly, lw, lh);
      ctx.restore();
    }
    if (t > m0) {
      const er = R.lerp(26, 300, E.outBack(R.clamp(m))), ex = R.lerp(hole.x, 540, m), ey = R.lerp(hole.y, 780, m);
      const blink = bump(t, m1 + 1.2, 0.12);
      const look = t < m1 + 0.4 ? [R.noise1(t * 3, 4), R.noise1(t * 2, 8) * 0.5] : [0.25 * R.noise1(t * 1.2, 4), 0.15];
      Art.glow(ctx, ex, ey, er * 2.4, '200,10,30', 0.35);
      Art.bloodEye(ctx, ex, ey, er, t, { open: Math.min(R.clamp(m * 1.5), 1 - blink), look, blood: R.prog(t, m1 - 0.2, m1 + 2.4) });
    }
    ctx.restore();
    if (lt < 0.25) fx.static(ctx, t, 0.6 * (1 - lt / 0.25));
  }
  const SCENES = [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9];

  // ---------------- textos grandes (camada nítida) ----------------
  const CENS = ['G█R█T█NH█', 'G4R0T1NH4', 'G@R0T1NH4', 'G█R0T█NH4'];
  function titles(ctx, t) {
    const k = sceneAt(t);
    const pop = (c, d = 0.35) => R.spring(t - c, 2.2, 7);
    if (k === 0 && t > Kw.nao - 0.05) {
      Art.title(ctx, 'NÃO FAÇA A', 540, 330, 92, { scale: pop(Kw.nao - 0.05) });
      Art.title(ctx, 'MENINA CHORAR', 540, 450, 104, { fill: P.bloodHi, scale: pop(Kw.menina - 0.05), glow: 30, rot: 0.02 * R.noise1(t * 6, 1) });
    }
    if (k === 1 && t > Kw.A - 0.05) {
      ['A', 'B', 'C'].forEach((L, i) => {
        const c = [Kw.A, Kw.B, Kw.C][i] - 0.05;
        if (t > c) Art.title(ctx, L, PEOPLE[i].x, 420, 150, { font: 'party', fill: P.gold, scale: pop(c), lw: 0.1 });
      });
    }
    if (k === 2) {
      if (t > Kw.quem - 0.05 && t < TIMER0 + 0.2) Art.title(ctx, 'QUEM VOCÊ ESCOLHE?', 540, 400, 84, { scale: pop(Kw.quem - 0.05), alpha: 1 - after(t, TIMER0, 0.2) });
      if (t >= TIMER0) {
        const p = R.prog(t, TIMER0, TIMER1), n = Math.max(1, 5 - Math.floor(p * 5));
        if (p < 1) Art.timer(ctx, 540, 430, 125, p, n, t - TIMER0);
        Art.title(ctx, 'COMENTA: A, B OU C?', 540, 640, 58, { fill: '#fff', alpha: after(t, TIMER0 + 0.3, 0.3) });
      }
    }
    if (k === 3 || k === 4) {
      const i = k - 3, name = i ? 'O IRMÃO' : 'O AVÔ', kn = i ? Kw.irmao : Kw.avo, st = i ? Kw.choro : Kw.chorar3;
      if (t > kn - 0.05) Art.title(ctx, `ERA ${name}!`, 540, 330, 100, { scale: pop(kn - 0.05) });
      if (t > st - 0.05) {
        Art.tear(ctx, 540, 470, 0.9 + 0.1 * Math.sin(t * 6));
        Art.stamp(ctx, i ? 'CHORO NA CERTA' : 'ELA IA CHORAR', 540, 600, 56, R.prog(t, st - 0.05, st + 0.6));
      }
    }
    if (k === 5) {
      if (t > Kw.parabens - 0.05) Art.title(ctx, 'PARABÉNS!', 540, 380, 130, { font: 'party', fill: P.gold, scale: pop(Kw.parabens - 0.05), rot: 0.06 * Math.sin(t * 7), lw: 0.1, glow: 30 });
      if (t > Kw.voce5 - 0.05) Art.title(ctx, 'VOCÊ ESCOLHEU…', 540, 540, 70, { scale: pop(Kw.voce5 - 0.05) });
    }
    if (k === 6 && t < LAUGH) {
      const sh = fx.shake(t, 10, 20, 3);
      Art.title(ctx, 'ERA O PAI', 540 + sh[0], 330 + sh[1], 120, { fill: P.bloodHi, scale: 1 + 0.4 * Math.exp(-(t - Kw.pai) * 8), glow: 40 });
      Art.title(ctx, 'DELA!!', 540 - sh[1], 470 + sh[0], 120, { fill: P.bloodHi, glow: 40, alpha: after(t, Kw.pai + 0.25, 0.05) });
    }
    if (k === 6 && t >= LAUGH) {
      const lt = t - LAUGH;
      for (let j = 0; j < 9; j++) {
        const tj = j * 0.17;
        if (lt < tj) continue;
        const x = 200 + R.hash(j, 4) * 680, y = 760 + R.hash(j, 5) * 560;
        Art.title(ctx, 'HA', x, y, 70 + R.hash(j, 6) * 60, { font: 'mono', fill: P.bloodHi, rot: (R.hash(j, 7) - 0.5) * 0.8, scale: pop(LAUGH + tj), alpha: 1 - after(t, START[7] - 0.3, 0.3), lw: 0.12 });
      }
    }
    if (k === 7 && t >= BEEP[0] && t < SHOT) {
      const f = R.frameOf(t), w = CENS[Math.floor(f / 3) % CENS.length];
      const [gx, gy] = fx.shake(t, 8, 25, 5);
      Art.title(ctx, w + '!!', 540 + gx, 420 + gy, 108, { fill: P.bloodHi, glow: 40, scale: pop(BEEP[0]) });
      ctx.save();
      ctx.fillStyle = '#000';
      ctx.fillRect(250, 510, 580, 64);
      ctx.restore();
      Art.title(ctx, '▮ CENSURADO ▮', 540, 543, 44, { font: 'mono', fill: '#fff', lw: 0 });
    }
    if (k === 8 && t > Kw.chorou - 0.05) Art.stamp(ctx, '✔ ELA NÃO CHOROU', 540, 420, 60, R.prog(t, Kw.chorou - 0.05, Kw.chorou + 0.6), { color: '#6dff9a', rot: -0.08 });
    if (k === 9) {
      if (t > Kw.coragem - 0.05) Art.title(ctx, 'SE TIVER CORAGEM…', 540, 330, 64, { fill: P.bloodHi, alpha: after(t, Kw.coragem - 0.05, 0.3) });
      if (t > Kw.segue - 0.05) Art.title(ctx, 'SEGUE O TIO ARLE', 540, 1250, 88, { scale: pop(Kw.segue - 0.05) });
      if (t > Kw.arle) {
        const p = R.spring(t - Kw.arle, 1.8, 6);
        ctx.save();
        ctx.translate(540, 1385);
        ctx.scale(p, p);
        ctx.fillStyle = 'rgba(179,8,31,0.95)';
        ctx.beginPath();
        ctx.roundRect(-230, -55, 460, 110, 55);
        ctx.fill();
        if (icon) ctx.drawImage(icon, -215, -38, 101, 76);
        ctx.font = '900 60px "Inter", "Arial Black", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText('@tioarle', 40, 3);
        ctx.restore();
      }
    }
  }

  // ---------------- legendas ----------------
  const SHOW = { 'bê...': 'B…', 'bê?': 'B?', 'cê...': 'C…', 'cê.': 'C.', 'a...': 'A…' };
  const EM = new Set(['não', 'menina', 'chorar', 'três', 'amarradas', 'eliminar', 'escolhe', 'avô', 'irmão', 'choro', 'parabéns', 'pai', 'saída', 'único', 'atirar', 'pobre', 'chorou', 'tio', 'arle', 'coragem']);
  const clean = (s) => s.toLowerCase().replace(/[^\p{L}-]/gu, '');
  const CAPS = [];
  TR.forEach((tr) => {
    const ws = wordsOf(tr.i).map((w) => ({ ...w }));
    if (tr.i === 7) ws.push({ w: 'G█R█T█NH█!!', s: BEEP[0], e: BEEP[1], cens: true });
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
    let t1 = Math.min(end + 0.4, next ? next[0].s - 0.18 : end + 0.8);
    if (c.some((w) => w.cens)) t1 = SHOT - 0.02;
    return {
      style: 'horror', t1, y: 1330, size: 84, maxW: 820, x: 520, jitter: 0.3, emJitter: 0.35, out: 0.12,
      words: c.map((w) => ({ s: SHOW[w.w.toLowerCase()] || w.w.toUpperCase().replace(/\.\.\.$/, '…'), t: w.s, em: w.cens || EM.has(clean(w.w)) })),
    };
  });

  // ---------------- quadros subliminares (2 frames) ----------------
  const SUBS = [
    { t: 4.3, s: 'NÃO CHORE' },
    { t: 12.4, s: 'ELA ESTÁ VENDO' },
    { t: 19.9, girl: true },
    { t: 31.6, s: 'HA HA HA' },
    { t: 35.0, girl: true },
  ];
  function subliminal(ctx, t) {
    for (const s of SUBS) {
      if (t < s.t || t >= s.t + 2 / 30) continue;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      ctx.fillRect(0, 0, W, H);
      if (s.girl) Art.girl(ctx, 540, 1300, 700, t, { rim: '255,30,40', rimA: 1 });
      else Art.title(ctx, s.s, 540, 900, 120, { fill: P.bloodHi, glow: 40 });
      ctx.restore();
    }
  }

  // ---------------- pós-produção ----------------
  const BASE = { uSat: 0.78, uContrast: 1.2, uVignette: 1.1, uGrain: 0.14, uScan: 0.14, uCurve: 0.05, uAberr: 2.5, uFilm: 0.5, uBloom: 0.5, uTint: [1.05, 0.95, 0.88], uTintAmt: 0.3 };
  function post(t) {
    const k = sceneAt(t);
    const p = { ...BASE };
    if (k === 5) Object.assign(p, { uSat: 1.15, uBloom: 0.8, uTintAmt: 0.1 });
    if (k === 6) Object.assign(p, { uSat: 0.9, uTint: [1.2, 0.8, 0.8], uTintAmt: 0.5, uAberr: 6 });
    if (k === 9) Object.assign(p, { uSat: 1.05, uBloom: 0.7 });
    for (let i = 1; i < START.length; i++) p.uGlitch = (p.uGlitch || 0) + bump(t, START[i], 0.12) * 0.7;
    const f = R.frameOf(t);
    if (R.hash(Math.floor(f / 3), 41) < 0.05) p.uGlitch = (p.uGlitch || 0) + 0.2;
    for (const c of HITS) {
      const d = t - c;
      if (d >= 0 && d < 0.3) p.uAberr += 9 * Math.exp(-d * 10);
    }
    if (k === 6) {
      p.uGlitch = (p.uGlitch || 0) + 0.9 * Math.exp(-(t - Kw.pai) * 3) + (t > SCREAM && t < LAUGH ? 0.35 + 0.3 * Math.abs(Math.sin(t * 13)) : 0) + (t > LAUGH ? 0.15 : 0);
      if (t >= Kw.pai && t < Kw.pai + 2 / 30) p.uInvert = 1;
    }
    if (k === 7 && t >= BEEP[0]) p.uGlitch = (p.uGlitch || 0) + 0.5;
    if (k === 9) p.uGlitch = (p.uGlitch || 0) + 0.6 * bump(t, Kw.segue + 0.85, 0.5);
    p.uSeed = f % 97;
    return p;
  }

  // ---------------- efeitos sonoros (sem música) ----------------
  function play(S, buf, t, gain = 1, verb = 0.3, rate = 1) {
    const src = S.ac.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = S.ac.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(S.out);
    if (verb) {
      const v = S.ac.createGain();
      v.gain.value = verb;
      g.connect(v);
      v.connect(S.verb);
    }
    src.start(t);
  }
  const env = (param, t, a, peak, d) => {
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(peak, t + a);
    param.exponentialRampToValueAtTime(0.0001, t + a + d);
  };
  function noise(S, t, dur, seed = 1, color = 'white') {
    const s = S.ac.createBufferSource();
    s.buffer = R.audio.noise(S.ac, color, 4, seed);
    s.loop = true;
    s.start(t, (seed * 0.37) % 3);
    s.stop(t + dur + 0.05);
    return s;
  }
  function biq(S, type, f, q = 0.7) {
    const b = S.ac.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    return b;
  }
  function tone(S, t, f0, f1, dur, { type = 'sine', gain = 0.3, verb = 0, a = 0.005, lp = 0 } = {}) {
    const o = S.ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = S.ac.createGain();
    env(g.gain, t, a, gain, dur);
    let n = o;
    if (lp) {
      const f = biq(S, 'lowpass', lp);
      o.connect(f);
      n = f;
    }
    n.connect(g);
    g.connect(S.out);
    if (verb) {
      const v = S.ac.createGain();
      v.gain.value = verb;
      g.connect(v);
      v.connect(S.verb);
    }
    o.start(t);
    o.stop(t + a + dur + 0.05);
  }
  /** zumbido da lâmpada + tom de sala */
  function roomTone(S, t0, t1, gain = 0.05) {
    const g = S.ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.3);
    g.gain.setValueAtTime(gain, t1 - 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t1);
    g.connect(S.out);
    const o = S.ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 120;
    const bp = biq(S, 'bandpass', 360, 1.2), og = S.ac.createGain();
    og.gain.value = 0.35;
    o.connect(bp);
    bp.connect(og);
    og.connect(g);
    o.start(t0);
    o.stop(t1);
    const n = noise(S, t0, t1 - t0, 12, 'brown'), lp = biq(S, 'lowpass', 180);
    n.connect(lp);
    lp.connect(g);
  }
  /** rangido da corrente da lâmpada */
  function creak(S, t, seed) {
    const o = S.ac.createOscillator();
    o.type = 'sawtooth';
    const f0 = 260 + R.hash(seed, 2) * 120;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.linearRampToValueAtTime(f0 * 1.35, t + 0.3);
    const bp = biq(S, 'bandpass', 1400, 4), g = S.ac.createGain();
    env(g.gain, t, 0.05, 0.05, 0.3);
    // aspereza: modulação rápida
    const lfo = S.ac.createOscillator(), lg = S.ac.createGain();
    lfo.frequency.value = 38;
    lg.gain.value = 0.04;
    lfo.connect(lg);
    lg.connect(g.gain);
    o.connect(bp);
    bp.connect(g);
    g.connect(S.out);
    o.start(t);
    o.stop(t + 0.42);
    lfo.start(t);
    lfo.stop(t + 0.42);
  }
  function tick(S, t, hi = true) {
    tone(S, t, hi ? 2400 : 1700, hi ? 2400 : 1700, 0.05, { type: 'square', gain: 0.12, lp: 5000 });
    const n = noise(S, t, 0.04, 61), hp = biq(S, 'highpass', 3000), g = S.ac.createGain();
    env(g.gain, t, 0.001, 0.4, 0.03);
    n.connect(hp);
    hp.connect(g);
    g.connect(S.out);
  }
  /** trombone triste (wah wah wah waaah) — o humor */
  function sadTrombone(S, t, gain = 0.12) {
    const notes = [[311, 0.32], [294, 0.32], [277, 0.32], [262, 1.0]];
    let tt = t;
    for (const [f, d] of notes) {
      const o = S.ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, tt);
      if (d > 0.5) {
        const v = S.ac.createOscillator(), vg = S.ac.createGain();
        v.frequency.value = 6;
        vg.gain.value = 8;
        v.connect(vg);
        vg.connect(o.frequency);
        v.start(tt);
        v.stop(tt + d);
      }
      const lp = biq(S, 'lowpass', 1100, 3), g = S.ac.createGain();
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(gain, tt + 0.04);
      g.gain.setValueAtTime(gain, tt + d - 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + d);
      o.connect(lp);
      lp.connect(g);
      g.connect(S.out);
      o.start(tt);
      o.stop(tt + d + 0.02);
      tt += d;
    }
  }
  function drumroll(S, t0, t1, gain = 0.3) {
    for (let t = t0, i = 0; t < t1; t += 0.045, i++) {
      const k = 0.5 + 0.5 * R.prog(t, t0, t1);
      const n = noise(S, t, 0.06, 70 + (i % 5)), bp = biq(S, 'bandpass', 1800, 0.8), g = S.ac.createGain();
      env(g.gain, t, 0.002, gain * k * (0.7 + 0.3 * R.hash(i, 3)), 0.05);
      n.connect(bp);
      bp.connect(g);
      g.connect(S.out);
    }
  }
  function partyHorn(S, t) {
    const o = S.ac.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(520, t);
    o.frequency.linearRampToValueAtTime(700, t + 0.08);
    o.frequency.setValueAtTime(700, t + 0.5);
    const v = S.ac.createOscillator(), vg = S.ac.createGain();
    v.frequency.value = 22;
    vg.gain.value = 18;
    v.connect(vg);
    vg.connect(o.frequency);
    const lp = biq(S, 'lowpass', 2500), g = S.ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.1, t + 0.03);
    g.gain.setValueAtTime(0.1, t + 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(lp);
    lp.connect(g);
    g.connect(S.out);
    o.start(t);
    o.stop(t + 0.62);
    v.start(t);
    v.stop(t + 0.62);
  }
  function pop(S, t, seed) {
    const n = noise(S, t, 0.05, 90 + seed), bp = biq(S, 'bandpass', 900 + R.hash(seed, 1) * 1500, 1.2), g = S.ac.createGain();
    env(g.gain, t, 0.001, 0.5, 0.04);
    n.connect(bp);
    bp.connect(g);
    g.connect(S.out);
  }
  function gunshot(S, t) {
    // estalo + corpo + cauda longa
    const n = noise(S, t, 0.5, 33), hp = biq(S, 'highpass', 150), g = S.ac.createGain();
    env(g.gain, t, 0.0008, 1, 0.22);
    n.connect(hp);
    hp.connect(g);
    g.connect(S.out);
    const v = S.ac.createGain();
    v.gain.value = 1.4;
    g.connect(v);
    v.connect(S.verb);
    const nb = noise(S, t, 1.2, 34, 'brown'), lp = biq(S, 'lowpass', 900), gb = S.ac.createGain();
    lp.frequency.setValueAtTime(2500, t);
    lp.frequency.exponentialRampToValueAtTime(120, t + 0.9);
    env(gb.gain, t, 0.001, 1, 0.9);
    nb.connect(lp);
    lp.connect(gb);
    gb.connect(S.out);
    tone(S, t, 110, 38, 0.5, { gain: 0.9 });
    // zumbido no ouvido
    tone(S, t + 0.05, 3900, 3800, 2.6, { gain: 0.035, a: 0.2 });
  }
  function drip(S, t, seed = 0) {
    tone(S, t, 1300 + R.hash(seed, 1) * 400, 380, 0.09, { gain: 0.18, verb: 0.6 });
  }

  function audio(S, A) {
    // ambiente
    roomTone(S, 0.25, SHOT, 0.05);
    roomTone(S, START[8], DUR, 0.035);
    A.vhsBed(S, 0, DUR, { gain: 0.03 });
    // rangidos nos extremos do balanço da lâmpada
    for (let k = 0, t; (t = (Math.PI / 2 + k * Math.PI) / 1.75) < START[9]; k++) if (t < SHOT || t > START[8]) creak(S, t, k);
    // gancho
    A.static(S, 0, 0.28, { gain: 0.5 });
    A.click(S, 0.26, { gain: 0.7 });
    A.boom(S, Kw.nao, { gain: 0.55, freq: 45, decay: 1.6 });
    A.whisper(S, 0.6, 1.6, { gain: 0.1, seed: 3 });
    // três pessoas
    A.boom(S, Kw.tres, { gain: 0.45, freq: 40 });
    for (const [i, c] of [Kw.A, Kw.B, Kw.C].entries()) {
      A.click(S, c, { gain: 0.6, seed: i });
      tone(S, c, 160, 90, 0.25, { gain: 0.35 });
    }
    // escolha + timer
    A.subDrop(S, Kw.eliminar, { gain: 0.6 });
    A.whoosh(S, Kw.quem - 0.3, { dur: 0.35, gain: 0.25 });
    for (let k = 0; k < 5; k++) {
      const tt = TIMER0 + k * ((TIMER1 - TIMER0) / 5);
      tick(S, tt, true);
      tick(S, tt + (TIMER1 - TIMER0) / 10, false);
    }
    for (let t = TIMER0, i = 0; t < TIMER1 - 0.2; i++) {
      A.heartbeat(S, t, { gain: 0.5 + 0.3 * R.prog(t, TIMER0, TIMER1) });
      t += R.lerp(0.85, 0.42, R.prog(t, TIMER0, TIMER1));
    }
    A.riser(S, TIMER0 + 1.5, TIMER1, { gain: 0.25 });
    tone(S, TIMER1, 140, 140, 0.55, { type: 'square', gain: 0.18, lp: 1200 });
    tone(S, TIMER1, 147, 147, 0.55, { type: 'square', gain: 0.12, lp: 1200 });
    // revelações A e B
    for (const [era, nome, triste, x] of [[Kw.era3, Kw.avo, Kw.chorar3, Kw.muito], [Kw.era4, Kw.irmao, Kw.choro, Kw.choro + 0.25]]) {
      A.whoosh(S, era - 0.15, { dur: 0.4, gain: 0.3 });
      A.boom(S, nome, { gain: 0.45, freq: 50 });
      A.blip(S, nome, { gain: 0.2, seed: 3 });
      sadTrombone(S, triste + 0.15);
      A.click(S, x, { gain: 0.5, seed: 8 });
      tone(S, x, 90, 50, 0.3, { gain: 0.4 });
    }
    // C: festa falsa
    drumroll(S, Kw.entao, Kw.parabens, 0.18);
    partyHorn(S, Kw.parabens);
    for (let k = 0; k < 7; k++) pop(S, Kw.parabens + k * 0.06 + R.hash(k, 2) * 0.04, k);
    drumroll(S, Kw.voce5, Kw.pai - 0.02, 0.25);
    A.riser(S, Kw.voce5, Kw.pai, { gain: 0.3 });
    // O PAI
    A.sting(S, Kw.pai, { gain: 0.8 });
    A.boom(S, Kw.pai, { gain: 0.8, freq: 36, decay: 2.2 });
    A.static(S, Kw.pai, 0.35, { gain: 0.35 });
    A.subDrop(S, SCREAM, { gain: 0.6 });
    play(S, GRITOS, SCREAM, 2.0, 0.45);
    play(S, RISADA, LAUGH, 1.3, 0.4);
    // revelação
    for (let t = START[7] + 0.1; t < BEEP[0] - 0.3; t += 0.8) A.heartbeat(S, t, { gain: 0.55 });
    A.riser(S, Kw.unico, BEEP[0], { gain: 0.3 });
    tone(S, BEEP[0], 1000, 1000, BEEP[1] - BEEP[0] - 0.01, { gain: 0.22, a: 0.004 }); // bipe de censura
    A.static(S, BEEP[0], BEEP[1] - BEEP[0], { gain: 0.18 });
    gunshot(S, SHOT);
    // depois
    [1318.5, 1174.7, 1046.5, 987.8, 880].forEach((f, k) => A.musicBox(S, START[8] + 0.2 + k * 0.42, f * (1 - 0.01 * k), { gain: 0.1, verb: 0.6 }));
    A.boom(S, Kw.chorou, { gain: 0.3, freq: 55 });
    // CTA
    A.static(S, START[9], 0.25, { gain: 0.3 });
    A.boom(S, Kw.segue, { gain: 0.7, freq: 38, decay: 2.4 });
    A.whoosh(S, Kw.segue + 0.3, { dur: 1.0, gain: 0.3 });
    A.sting(S, Kw.segue + 1.1, { gain: 0.35 });
    for (let k = 0; k < 6; k++) drip(S, Kw.segue + 1.7 + k * 0.55 + R.hash(k, 3) * 0.2, k);
    for (let t = Kw.segue + 1.4; t < DUR - 0.5; t += 0.9) A.heartbeat(S, t, { gain: 0.35 });
  }

  R.mount({
    duration: DUR,
    poster: TIMER0 + 0.5,
    audioFile: 'assets/voz.wav',
    audioEnd: VOICE,
    sfxGain: 0.5,
    signal: 'assets/audio-analysis.json',
    assets: { logo: 'assets/logo.png', icon: 'assets/logo-icone.png' },
    fonts: ['40px "VT323"', '40px "Shrikhand"', '40px "DejaVu Sans"', '900 40px "Inter"'],
    setup(a) {
      logo = a.logo;
      icon = a.icon;
      Art.init();
    },
    render(ctx, t) {
      SCENES[sceneAt(t)](ctx, t);
      R.resetCtx(ctx);
    },
    post,
    overlay(ctx, t) {
      titles(ctx, t);
      if (t < START[9] && !(t >= SHOT && t < START[8])) for (const L of LINES) K.line(ctx, t, L);
      subliminal(ctx, t);
      if (icon && t < START[9] && !(t >= SHOT && t < START[8])) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.drawImage(icon, 40, 270, 100, 75);
        ctx.restore();
      }
    },
    audio,
  });
})();
