/* Reel engine — tipografia cinética sincronizada palavra por palavra.
 *
 * R.kin.line(ctx, t, line)  line = { style, t1, x, y, size, maxW, rot, words: [{s, t, em}] }
 *   style: 'retro'   letreiro anos 50 com extrusão 3D e "mola" (pop com overshoot)
 *          'script'  letra cursiva escrita da esquerda para a direita
 *          'horror'  caixa alta tremendo, separação RGB e letras trocadas por glitch
 *          'whisper' máquina de escrever com flicker e brilho frio
 * R.kin.title(ctx, t, {...}) título letra por letra caindo com mola e rotação.
 * R.kin.words("texto", [t...]) monta a lista de palavras a partir dos tempos.
 */
(function () {
  'use strict';
  const R = window.Reel;
  const K = (R.kin = {});

  /** Mola amortecida: 0 -> 1 com overshoot. */
  R.spring = (x, freq = 4.5, damp = 6) => (x <= 0 ? 0 : 1 - Math.exp(-damp * x) * Math.cos(freq * 2 * Math.PI * x));

  K.FONTS = {
    retro: (s) => `${s}px "Shrikhand", "Inter", sans-serif`,
    script: (s) => `${s}px "Yellowtail", cursive`,
    horror: (s) => `900 ${s}px "Inter", "Arial Black", sans-serif`,
    whisper: (s) => `${s}px "Special Elite", "Courier New", monospace`,
    vhs: (s) => `${s}px "VT323", monospace`,
    neon: (s) => `${s}px "Monoton", sans-serif`,
  };

  /** "UMA *FITA* AQUI" + tempos -> [{s, t, em}] */
  K.words = (text, times) => {
    let em = false;
    return text.split(/\s+/).filter(Boolean).map((w, i) => {
      if (w.startsWith('*')) em = true;
      const o = { s: w.replace(/\*/g, ''), t: times[i] ?? times[times.length - 1], em };
      if (w.replace(/[.,!?…:]+$/, '').endsWith('*')) em = false;
      return o;
    });
  };

  function layout(ctx, words, maxW, gap = 0) {
    const space = ctx.measureText(' ').width + gap;
    for (const w of words) w.w = ctx.measureText(w.s).width;
    const lines = [[]];
    let lw = 0;
    for (const w of words) {
      const line = lines[lines.length - 1];
      if (w.br || (line.length && lw + space + w.w > maxW)) {
        lines.push([w]);
        lw = w.w;
      } else {
        lw += (line.length ? space : 0) + w.w;
        line.push(w);
      }
    }
    return { lines, space };
  }

  /** Texto com extrusão 3D (camadas deslocadas) e contorno. */
  K.extrude = (ctx, s, x, y, o = {}) => {
    const { depth = 10, dx = 1.1, dy = 1.5, side = '#a8281f', edge = '#1d2638', fill = '#fff3d6', line = 0.06, size = 100 } = o;
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * line * 2;
    ctx.strokeStyle = edge;
    ctx.strokeText(s, x + depth * dx, y + depth * dy);
    ctx.fillStyle = side;
    for (let i = depth; i > 0; i--) ctx.fillText(s, x + i * dx, y + i * dy);
    ctx.lineWidth = size * line;
    ctx.strokeText(s, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(s, x, y);
  };

  K.line = (ctx, t, L) => {
    const { style = 'retro', t1, x = 540, y = 1250, size = 84, maxW = 880, rot = 0, words, lineH = 1.18, align = 'center' } = L;
    const outD = L.out ?? 0.2;
    if (!words.length || t < words[0].t - 0.05 || t > t1 + outD) return;
    ctx.save();
    ctx.font = K.FONTS[style](size);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    if (style === 'horror') ctx.letterSpacing = '-2px';
    const { lines, space } = layout(ctx, words, maxW, style === 'script' ? size * 0.08 : style === 'whisper' ? 0 : size * 0.36);
    ctx.translate(x, y);
    ctx.rotate(rot);
    const out = outD > 0 ? R.clamp((t - t1) / outD) : t > t1 ? 1 : 0;
    let yy = -((lines.length - 1) * size * lineH) / 2;
    let idx = 0;
    const f = R.frameOf(t);
    lines.forEach((line) => {
      const width = line.reduce((a, w) => a + w.w, 0) + space * (line.length - 1);
      let xx = align === 'left' ? 0 : -width / 2;
      line.forEach((w) => {
        const i = idx++;
        const next = words[i + 1] ? words[i + 1].t : t1;
        const lt = t - w.t;
        if (lt >= 0) {
          ctx.save();
          const cx = xx + w.w / 2;
          if (style === 'retro') drawRetro(ctx, t, w, cx, yy, lt, next, out, i, size);
          else if (style === 'script') drawScript(ctx, w, cx, yy, lt, out, size);
          else if (style === 'horror') drawHorror(ctx, t, f, w, cx, yy, lt, out, i, size, L.jitter ?? 1);
          else drawWhisper(ctx, t, w, cx, yy, lt, out, i, size);
          ctx.restore();
        }
        xx += w.w + space;
      });
      yy += size * lineH;
    });
    ctx.restore();
  };

  function drawRetro(ctx, t, w, cx, cy, lt, next, out, i, size) {
    const sp = R.spring(lt, 2.2, 7);
    const active = t >= w.t && t < next;
    const bounce = active ? 1 + 0.07 * Math.sin(Math.min(1, (t - w.t) / 0.2) * Math.PI) : 1;
    const sc = Math.max(0, sp) * bounce * (1 - R.ease.inCubic(out));
    ctx.translate(cx, cy + R.ease.inCubic(out) * 60);
    ctx.rotate((1 - sp) * (i % 2 ? 0.25 : -0.25));
    ctx.scale(sc, sc);
    ctx.globalAlpha = R.clamp(lt * 8) * (1 - out);
    K.extrude(ctx, w.s, -w.w / 2, 0, { size, fill: w.em ? '#ffd23f' : active ? '#fff8e6' : '#fff0cf', side: w.em ? '#c0392b' : '#b8322a' });
  }

  function drawScript(ctx, w, cx, cy, lt, out, size) {
    const p = R.ease.outCubic(R.clamp(lt / 0.32));
    ctx.translate(cx, cy);
    ctx.globalAlpha = 1 - out;
    ctx.beginPath();
    ctx.rect(-w.w / 2 - size * 0.4, -size, (w.w + size * 0.8) * p, size * 2);
    ctx.clip();
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.16;
    ctx.strokeStyle = '#1d2638';
    ctx.strokeText(w.s, -w.w / 2 + size * 0.05, size * 0.07);
    ctx.fillStyle = '#1d2638';
    ctx.fillText(w.s, -w.w / 2 + size * 0.05, size * 0.07);
    ctx.fillStyle = w.em ? '#ffd23f' : '#fff3d6';
    ctx.fillText(w.s, -w.w / 2, 0);
  }

  const GLITCH = '#@$%&?!/\\<>*01';
  function drawHorror(ctx, t, f, w, cx, cy, lt, out, i, size, jit = 1) {
    const J = w.em ? 1 : jit;
    const pop = 1 + 0.35 * Math.exp(-lt * 16);
    ctx.translate(cx, cy);
    ctx.scale(pop, pop);
    ctx.globalAlpha = 1 - out;
    const chars = [...w.s];
    let x = -w.w / 2;
    chars.forEach((c, k) => {
      const cw = ctx.measureText(c).width;
      const h1 = R.hash(f * 31 + k, i), h2 = R.hash(f * 17 + k, i + 9), h3 = R.hash(f * 7 + k, i + 3);
      const jx = (h1 - 0.5) * size * 0.12 * J, jy = (h2 - 0.5) * size * 0.14 * J;
      const ch = h3 < 0.012 * J ? GLITCH[Math.floor(R.hash(f, k) * GLITCH.length)] : c;
      ctx.lineJoin = 'round';
      ctx.lineWidth = size * 0.14;
      ctx.strokeStyle = '#000';
      ctx.strokeText(ch, x + jx, jy);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,0,40,0.9)';
      ctx.fillText(ch, x + jx - size * 0.06 * J, jy);
      ctx.fillStyle = 'rgba(0,230,255,0.75)';
      ctx.fillText(ch, x + jx + size * 0.06 * J, jy);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = w.em ? '#ff2a2a' : '#f4f4f4';
      ctx.fillText(ch, x + jx, jy);
      x += cw;
    });
  }

  function drawWhisper(ctx, t, w, cx, cy, lt, out, i, size) {
    const n = Math.ceil(R.clamp(lt / Math.max(0.12, w.s.length * 0.035)) * w.s.length);
    const s = w.s.slice(0, n);
    ctx.translate(cx, cy);
    ctx.globalAlpha = (0.78 + 0.22 * R.noise1(t * 14, i)) * (1 - out);
    ctx.shadowColor = 'rgba(170,200,255,0.55)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = w.em ? '#ff4a3a' : '#e6e0d2';
    ctx.fillText(s, -w.w / 2, 0);
  }

  /** Título letra por letra: cada letra cai com mola, gira e assenta. */
  K.title = (ctx, t, o) => {
    const { text, t0, x = 540, y = 600, size = 150, stagger = 0.045, rot = -0.06, fill = '#fff0cf', side = '#b8322a', depth = 14, t1 = 1e9, wave = 0.6 } = o;
    if (t < t0 || t > t1 + 0.2) return;
    ctx.save();
    ctx.font = K.FONTS.retro(size);
    ctx.textBaseline = 'middle';
    const chars = [...text];
    const widths = chars.map((c) => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0);
    const out = R.clamp((t - t1) / 0.2);
    ctx.translate(x, y);
    ctx.rotate(rot);
    let xx = -total / 2;
    chars.forEach((c, k) => {
      const lt = t - t0 - k * stagger;
      if (lt > 0 && c !== ' ') {
        const sp = R.spring(lt, 2.0, 6);
        ctx.save();
        const bob = Math.sin(t * 3 + k * 0.6) * size * 0.03 * wave;
        ctx.translate(xx + widths[k] / 2, -(1 - sp) * size * 2.2 + bob + R.ease.inCubic(out) * size);
        ctx.rotate((1 - sp) * (k % 2 ? 0.6 : -0.6));
        ctx.globalAlpha = R.clamp(lt * 10) * (1 - out);
        K.extrude(ctx, c, -widths[k] / 2, 0, { size, depth, fill, side, dx: 1.2, dy: 1.6 });
        ctx.restore();
      }
      xx += widths[k];
    });
    ctx.restore();
  };
})();
