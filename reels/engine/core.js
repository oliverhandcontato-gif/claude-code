/* Reel engine — core
 * Tempo, easing, aleatoriedade determinística, ruído e helpers de imagem/câmera.
 * Tudo é função do tempo `t` (segundos): o mesmo frame sempre gera a mesma imagem,
 * o que permite renderizar em paralelo e pré-visualizar com scrub.
 */
(function () {
  'use strict';
  const R = (window.Reel = window.Reel || {});

  R.W = 1080;
  R.H = 1920;
  R.FPS = 30;

  R.clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  R.lerp = (a, b, t) => a + (b - a) * t;
  /** Progresso 0..1 de t entre a e b. */
  R.prog = (t, a, b) => R.clamp((t - a) / (b - a));
  /** Envelope 0..1: entra em `fin` segundos, sai em `fout` segundos antes de b. */
  R.env = (t, a, b, fin = 0.2, fout = 0.2) => {
    if (t < a || t > b) return 0;
    const i = fin > 0 ? R.clamp((t - a) / fin) : 1;
    const o = fout > 0 ? R.clamp((b - t) / fout) : 1;
    return Math.min(i, o);
  };
  R.frameOf = (t) => Math.floor(t * R.FPS + 1e-6);

  R.ease = {
    linear: (x) => x,
    inCubic: (x) => x * x * x,
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
    inExpo: (x) => (x === 0 ? 0 : Math.pow(2, 10 * x - 10)),
    outExpo: (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    outBack: (x) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    },
  };

  /** PRNG determinístico (mulberry32). */
  R.rng = (seed) => {
    let a = seed >>> 0 || 1;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  /** Hash inteiro -> 0..1. */
  R.hash = (i, seed = 0) => {
    let h = (Math.imul(i | 0, 374761393) + Math.imul((seed | 0) + 1, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  /** Ruído suave 1D em -1..1. */
  R.noise1 = (x, seed = 0) => {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return R.lerp(R.hash(i, seed), R.hash(i + 1, seed), u) * 2 - 1;
  };

  R.canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  };
  R.loadImage = (src) =>
    new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('Falha ao carregar ' + src));
      img.src = src;
    });
  R.resetCtx = (g) => {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.filter = 'none';
    g.shadowBlur = 0;
    g.shadowColor = 'rgba(0,0,0,0)';
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
  };

  /**
   * Desenha uma imagem (ou um recorte dela) cobrindo o quadro, com câmera.
   * o.crop = [x,y,w,h] no arquivo; o.zoom >= 1; o.fx/o.fy = ponto de foco (0..1 do recorte);
   * o.ox/o.oy = deslocamento extra (tremida). Retorna `map(u,v)` para posicionar
   * elementos em coordenadas do recorte.
   */
  R.drawCover = (ctx, img, o = {}) => {
    const [cx, cy, cw, ch] = o.crop || [0, 0, img.width, img.height];
    const W = o.w || R.W, H = o.h || R.H;
    const s = Math.max(W / cw, H / ch) * (o.zoom || 1);
    const dw = cw * s, dh = ch * s;
    const fx = o.fx ?? 0.5, fy = o.fy ?? 0.5;
    let x = R.clamp(W / 2 - fx * dw, W - dw, 0);
    let y = R.clamp(H / 2 - fy * dh, H - dh, 0);
    x += o.ox || 0;
    y += o.oy || 0;
    ctx.drawImage(img, cx, cy, cw, ch, x, y, dw, dh);
    return { x, y, s, dw, dh, map: (u, v) => [x + u * dw, y + v * dh] };
  };

  /**
   * Linha do tempo de cenas. Cada cena: {start, end, draw(ctx,t,lt), fadeIn?}.
   * Uma cena com fadeIn que começa sobre outra é desenhada numa layer e entra em fade.
   */
  R.sequence = (ctx, t, scenes, layer) => {
    let drew = false;
    for (const s of scenes) {
      if (t < s.start || t >= s.end) continue;
      const fi = s.fadeIn || 0;
      if (drew && fi > 0 && t < s.start + fi) {
        const g = layer.getContext('2d');
        R.resetCtx(g);
        g.fillStyle = '#000';
        g.fillRect(0, 0, layer.width, layer.height);
        s.draw(g, t, t - s.start);
        R.resetCtx(ctx);
        ctx.globalAlpha = R.ease.inOutSine(R.prog(t, s.start, s.start + fi));
        ctx.drawImage(layer, 0, 0);
        ctx.globalAlpha = 1;
      } else {
        R.resetCtx(ctx);
        s.draw(ctx, t, t - s.start);
      }
      drew = true;
    }
    R.resetCtx(ctx);
  };
})();
