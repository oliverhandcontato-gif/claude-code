/* Reel engine — texto
 * Legendas palavra por palavra no estilo TikTok (com *ênfase* em vermelho) e máquina de escrever.
 */
(function () {
  'use strict';
  const R = window.Reel;
  const T = (R.text = {});

  T.font = (size, weight = 900) => `${weight} ${size}px "Inter", "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  T.mono = (size, weight = 500) => `${weight} ${size}px "JetBrains Mono", "Courier New", monospace`;

  /** "UMA *FITA VHS* AQUI" -> [{s:'UMA'}, {s:'FITA', em:true}, {s:'VHS', em:true}, {s:'AQUI'}] */
  T.parse = (text) => {
    let em = false;
    return text.split(/\s+/).filter(Boolean).map((w) => {
      if (w.startsWith('*')) em = true;
      const word = { s: w.replace(/\*/g, ''), em };
      if (w.replace(/[.,!?…:]+$/, '').endsWith('*')) em = false;
      return word;
    });
  };

  /** Instante em que cada palavra de uma legenda aparece (útil para sincronizar sons). */
  T.wordTimes = (c) => T.parse(c.text).map((w, i) => ({ ...w, t: c.start + i * (c.stagger ?? 0.09) }));

  /**
   * Legenda com pop palavra a palavra.
   * c = {start, end, text, x=530, y=1180, size=84, maxW=860, stagger=0.09, pop=0.22, out=0.18}
   */
  T.caption = (ctx, t, c) => {
    const { start, end, text, x = 530, y = 1180, size = 84, maxW = 860, stagger = 0.09, pop = 0.22, out = 0.18, lineH = 1.12, color = '#fff', emColor = '#ff2a2a' } = c;
    if (t < start || t > end) return;
    ctx.save();
    ctx.font = T.font(size);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const words = T.parse(text);
    const space = ctx.measureText(' ').width;
    for (const w of words) w.w = ctx.measureText(w.s).width;
    const lines = [[]];
    let lw = 0;
    for (const w of words) {
      const line = lines[lines.length - 1];
      if (line.length && lw + space + w.w > maxW) {
        lines.push([w]);
        lw = w.w;
      } else {
        lw += (line.length ? space : 0) + w.w;
        line.push(w);
      }
    }
    const fade = R.clamp((end - t) / out);
    let yy = y - (lines.length * size * lineH) / 2 + (size * lineH) / 2;
    let idx = 0;
    for (const line of lines) {
      const width = line.reduce((a, w) => a + w.w, 0) + space * (line.length - 1);
      let xx = x - width / 2;
      for (const w of line) {
        const ta = start + idx * stagger;
        idx++;
        if (t >= ta) {
          const p = R.clamp((t - ta) / pop);
          const sc = R.lerp(0.55, 1, R.ease.outBack(p));
          const jx = w.em ? R.noise1(t * 25, idx) * 3 : 0;
          const jy = w.em ? R.noise1(t * 25, idx + 50) * 3 : 0;
          ctx.save();
          ctx.translate(xx + w.w / 2 + jx, yy + jy);
          ctx.scale(sc, sc);
          ctx.globalAlpha = R.clamp(p * 2.5) * fade;
          ctx.lineJoin = 'round';
          ctx.lineWidth = size * 0.17;
          ctx.strokeStyle = 'rgba(0,0,0,0.95)';
          ctx.strokeText(w.s, -w.w / 2, 0);
          if (w.em) {
            ctx.shadowColor = 'rgba(255,0,0,0.65)';
            ctx.shadowBlur = 26;
          }
          ctx.fillStyle = w.em ? emColor : color;
          ctx.fillText(w.s, -w.w / 2, 0);
          ctx.restore();
        }
        xx += w.w + space;
      }
      yy += size * lineH;
    }
    ctx.restore();
  };

  /** Máquina de escrever. c = {start, end, text, x, y, size=44, cps=20, align='left'|'center'} */
  T.type = (ctx, t, c) => {
    const { start, end = 1e9, text, x, y, size = 44, cps = 20, color = '#e8e8e8', cursor = true, align = 'left', out = 0.2, font = T.mono(size) } = c;
    if (t < start || t > end) return;
    const n = Math.min(text.length, Math.floor((t - start) * cps));
    const s = text.slice(0, n);
    ctx.save();
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const x0 = align === 'center' ? x - ctx.measureText(text).width / 2 : x;
    ctx.globalAlpha = R.clamp((end - t) / out);
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillText(s, x0 + 3, y + 3);
    ctx.fillStyle = color;
    ctx.fillText(s, x0, y);
    if (cursor && (n < text.length || Math.floor(t * 2.5) % 2 === 0)) {
      ctx.fillRect(x0 + ctx.measureText(s).width + 6, y - size * 0.45, size * 0.55, size * 0.9);
    }
    ctx.restore();
  };

  /** Instantes de cada caractere visível da máquina de escrever (para cliques de tecla). */
  T.typeTimes = (start, text, cps = 20) => {
    const out = [];
    for (let i = 0; i < text.length; i++) if (text[i] !== ' ') out.push(start + (i + 1) / cps);
    return out;
  };
})();
