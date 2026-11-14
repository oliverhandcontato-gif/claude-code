// Page composition: panels on paper, graphic transitions between shots, stable print texture.
(function (A) {
  const U = A.U, K = A.K;
  A.CFG = { W: 1920, H: 1080, fps: 24, margin: 34, border: 7, transDur: 0.42, paperAlpha: 0.22 };
  A.DURATION = A.SHOTS[A.SHOTS.length - 1].t1;
  const findShot = (t) => { for (let i = 0; i < A.SHOTS.length; i++) if (t < A.SHOTS[i].t1) return i; return A.SHOTS.length - 1; };

  function panel(ctx, shot, lt, x, y, w, h, scale = 1) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2); ctx.scale(scale, scale); ctx.translate(-w / 2, -h / 2);
    const r = new Path2D(); r.rect(0, 0, w, h);
    ctx.save(); ctx.clip(r);
    shot.draw(ctx, lt, { pw: w, ph: h, t: shot.t0 + lt });
    ctx.restore();
    ctx.lineWidth = A.CFG.border; ctx.strokeStyle = K.INK; ctx.lineJoin = "miter";
    ctx.strokeRect(0, 0, w, h);
    ctx.restore();
  }

  A.renderFrame = (ctx, frame) => {
    const { W, H, fps, margin } = A.CFG;
    const t = frame / fps;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(K.paper(W, H), 0, 0);
    const i = findShot(t);
    const s = A.SHOTS[i];
    const lt = t - s.t0;
    const pw = W - margin * 2, ph = H - margin * 2;
    const td = A.CFG.transDur;
    K.lwk = 1;
    if (s.trans === "slide" && lt < td && i > 0) {
      const u = U.ease("io3", lt / td);
      const prev = A.SHOTS[i - 1];
      const gap = 40;
      panel(ctx, prev, prev.t1 - prev.t0 - 1 / fps, margin - u * (pw + gap), margin, pw, ph);
      panel(ctx, s, lt, margin + (1 - u) * (pw + gap), margin, pw, ph);
    } else if (s.out && lt > s.out.at) {
      const u = U.ease("in3", U.seg(lt, s.out.at, s.out.at + s.out.dur));
      if (u < 1) panel(ctx, s, lt, margin, margin, pw, ph, 1 - u);
    } else {
      panel(ctx, s, lt, margin, margin, pw, ph);
    }
    // stable print texture over everything (multiply)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = A.CFG.paperAlpha;
    ctx.drawImage(K.paper(W, H), 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    return s.name;
  };
})(window.A);
