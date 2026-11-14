// Capitão Saci: layered 2D rig (one leg), drawn with inked shapes + shadow masses.
// Pose (all optional): x,y (hip), s (scale), face (1 right / -1 left), view ('3q'|'side'),
// lean, thigh, knee, foot, armF:[shoulder, elbow], armB, head (tilt), turn (0 side..1 3q),
// expr ('determined'|'smile'|'wink'|'surprised'|'grit'), gaze [x,y], cap (flop), capeWind, capeFlap,
// squash, handF ('fist'|'open'|'cap'), handB, glow (cap glow 0..1)
(function (A) {
  const U = A.U, K = A.K;
  const S = (A.SACI = {});
  const C = {
    skin: "#6b3b24", skinS: "#432214", skinH: "#8d5434",
    red: "#d42a24", redS: "#8e1a1c", redH: "#f05a3a",
    green: "#1f8a52", greenS: "#125a36", yellow: "#f4c430", yellowS: "#c08a1a",
    hair: "#1a1210", white: "#fbf6ea", eye: "#2a1a10",
  };
  S.C = C;

  // limb shape between two points with widths (tapered capsule)
  function limb(a, b, w0, w1) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l, ux = dx / l, uy = dy / l;
    const pts = [];
    for (let i = 0; i <= 6; i++) { const t = Math.PI * (0.5 + i / 6); pts.push([a[0] + (nx * Math.cos(t - Math.PI / 2) - ux * Math.sin(t - Math.PI / 2)) * w0 * 0 + Math.cos(t) * nx * w0 - Math.sin(t) * 0 + (-ux) * Math.sin(t - Math.PI / 2) * w0 * 0, 0]); }
    // simpler explicit outline: side a-left, cap at b, side b-right, cap at a
    const out = [];
    const cap = (c, w, from) => { for (let i = 0; i <= 5; i++) { const t = from + Math.PI * i / 5; out.push([c[0] + (nx * Math.cos(t) + ux * Math.sin(t)) * w, c[1] + (ny * Math.cos(t) + uy * Math.sin(t)) * w]); } };
    const mid = [U.lerp(a[0], b[0], 0.4) + nx * (w0 + w1) * 0.08, U.lerp(a[1], b[1], 0.4) + ny * (w0 + w1) * 0.08];
    out.push([a[0] + nx * w0, a[1] + ny * w0]);
    out.push([mid[0] + nx * (w0 * 0.55 + w1 * 0.5), mid[1] + ny * (w0 * 0.55 + w1 * 0.5)]);
    cap(b, w1, 0);
    out.push([mid[0] - nx * (w0 * 0.5 + w1 * 0.45), mid[1] - ny * (w0 * 0.5 + w1 * 0.45)]);
    cap(a, w0, Math.PI);
    return K.path(out, true, 0.35);
  }
  const fk = (o, ang, len) => [o[0] + Math.sin(ang) * len, o[1] + Math.cos(ang) * len];
  // shadow side: shape minus itself shifted toward the light
  function mass(ctx, path, dx, dy, color, dots, m) {
    const sh = new Path2D();
    sh.rect(-5000, -5000, 10000, 10000);
    sh.addPath(path, new DOMMatrix([1, 0, 0, 1, dx, dy]));
    ctx.save();
    ctx.clip(path);
    ctx.fillStyle = color;
    ctx.fill(sh, "evenodd");
    if (dots) {
      const pat = K.dots(7, 1.5, "rgba(15,8,6,0.45)");
      if (m) pat.setTransform(m);
      ctx.fillStyle = pat;
      ctx.fill(sh, "evenodd");
    }
    ctx.restore();
  }
  S.mass = mass;

  S.draw = (ctx, P, opts = {}) => {
    const g = (k, d = 0) => (P[k] == null ? d : P[k]);
    const s = g("s", 1), face = g("face", 1);
    const L = opts.light || [-6, -4]; // shift toward light, local units (light from the upper-left, behind)
    const lw = 3.6 / Math.max(0.5, Math.min(2.2, s)) * Math.min(1.4, Math.max(0.8, s));
    ctx.save();
    ctx.translate(g("x"), g("y"));
    const sq = g("squash");
    ctx.scale(s * face * (1 + sq * 0.12), s * (1 - sq * 0.15));
    const M = ctx.getTransform();
    const LW = 3.4 / s * g("lw", 1); // constant on-screen contour (lw compensates world zoom)
    const lwIn = 2.0 / s * g("lw", 1), lwDet = 1.4 / s * g("lw", 1);

    const lean = g("lean"), thigh = g("thigh", 0.05), knee = g("knee", 0.08);
    const hip = [0, 0];
    const kneeP = fk(hip, thigh, 46);
    const ankle = fk(kneeP, thigh - knee, 44);
    const neck = [Math.sin(lean) * 62, -Math.cos(lean) * 62];
    const shF = [neck[0] + Math.cos(lean) * 6, neck[1] + 8];
    const shB = [neck[0] - Math.cos(lean) * 10, neck[1] + 6];
    const armF = g("armF", [0.15, 0.3]), armB = g("armB", [-0.1, 0.35]);
    const elF = fk(shF, armF[0] + lean * 0.3, 32), haF = fk(elF, armF[0] + armF[1] + lean * 0.3, 28);
    const elB = fk(shB, armB[0] + lean * 0.3, 32), haB = fk(elB, armB[0] + armB[1] + lean * 0.3, 28);
    const headC = [neck[0] + Math.sin(lean + g("head")) * 24, neck[1] - Math.cos(lean + g("head")) * 24];
    const turn = g("turn", 1);

    // ---- cape (behind everything) ----
    const wind = g("capeWind", 0.4), flap = g("capeFlap", 0);
    const cb = [];
    const base = [[shB[0] - 4, shB[1] - 4], [shF[0] - 2, shF[1] - 6]];
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      const ang = -lean * 0.4 - 0.25 - wind * (0.6 + t * 0.9) + Math.sin(flap + t * 3) * 0.12 * (wind + 0.2);
      cb.push([shB[0] - 6 - Math.sin(-ang) * 0 + Math.sin(ang) * 96 * t * -1 - t * 8, shB[1] + Math.cos(ang) * 96 * t]);
    }
    const tip = cb[cb.length - 1];
    const capeOut = [base[1], [neck[0] - 2, neck[1] + 30], ...cb.slice(1).map((p, i) => [p[0] + 14 + i * 2, p[1] + 2]).reverse(), base[0]];
    const capeIn = [base[0], ...cb.slice(1), [tip[0] - 4, tip[1] + 2]];
    const cape = K.path(capeIn.concat(cb.slice(1).map((p, i) => [p[0] + 18 + i * 3 + Math.sin(flap + i) * 3, p[1] - 4]).reverse()), true, 0.4);
    K.shape(ctx, cape, C.red, LW);
    mass(ctx, cape, L[0] * 2.4, L[1] * 2.4, C.redS, true, M);
    // folds
    for (let k = 0; k < 3; k++) {
      const a = cb[1 + k], b = cb[3 + Math.min(2, k)];
      K.brush(ctx, [[a[0] + 6 + k * 5, a[1]], [b[0] + 8 + k * 5, b[1] - 4]], lwDet, lwIn, 0.2);
    }

    // ---- far arm ----
    const armBack = () => {
      const ua = limb(shB, elB, 6.5, 5.2), fa = limb(elB, haB, 5.2, 4.2);
      [ua, fa].forEach((p) => { K.shape(ctx, p, C.skinS, LW); });
      hand(ctx, haB, armB[0] + armB[1] + lean * 0.3, g("handB", "fist"), C.skinS, LW, true);
    };
    armBack();

    // ---- leg ----
    const thighP = limb(hip, kneeP, 11, 8.2), shinP = limb(kneeP, ankle, 8, 5.6);
    K.shape(ctx, shinP, C.skin, LW); mass(ctx, shinP, L[0], L[1], C.skinS);
    K.shape(ctx, thighP, C.skin, LW); mass(ctx, thighP, L[0], L[1], C.skinS);
    // foot (bare)
    const phi = thigh - knee + (P.footFlat ? -(thigh - knee + lean * 0) : 0) + g("foot");
    const toe = [ankle[0] + Math.cos(phi) * 20, ankle[1] - Math.sin(phi) * 20 + 4];
    const footP = K.path([[ankle[0] - 6, ankle[1] - 4], [ankle[0] + 4, ankle[1] - 5], [toe[0] - 3, toe[1] - 5], [toe[0] + 3, toe[1] - 1], [toe[0], toe[1] + 2], [ankle[0] - 2, ankle[1] + 6], [ankle[0] - 8, ankle[1] + 4]], true, 0.4);
    K.shape(ctx, footP, C.skin, LW); mass(ctx, footP, L[0] * 0.6, L[1] * 0.6, C.skinS);

    // ---- shorts ----
    const shorts = K.path([[-13, -12], [14, -12], [16, 6], [kneeP[0] * 0.55 + 9, kneeP[1] * 0.55 + 4], [kneeP[0] * 0.55 - 9, kneeP[1] * 0.55 + 6], [-14, 8]], true, 0.3);
    K.shape(ctx, shorts, C.red, LW); mass(ctx, shorts, L[0], L[1], C.redS, true, M);
    K.brush(ctx, [[kneeP[0] * 0.3 - 4, kneeP[1] * 0.3], [kneeP[0] * 0.5, kneeP[1] * 0.5 + 2]], lwDet, lwIn, 0.2);

    // ---- torso ----
    const tor = K.path([[-14, -8], [14, -10], [neck[0] + 15 * Math.cos(lean), neck[1] + 10], [neck[0] + 8, neck[1] - 1], [neck[0] - 10, neck[1] - 1], [neck[0] - 17 * Math.cos(lean), neck[1] + 12]], true, 0.4);
    K.shape(ctx, tor, C.green, LW);
    mass(ctx, tor, L[0] * 1.6, L[1] * 1.2, C.greenS, true, M);
    // emblem: yellow disc with red spiral (whirlwind)
    const em = [U.lerp(0, neck[0], 0.62) + 4 * turn, U.lerp(0, neck[1], 0.62)];
    const er = 8.5;
    const emb = new Path2D(); emb.ellipse(em[0], em[1], er * (0.55 + 0.45 * turn), er, lean, 0, U.TAU);
    K.shape(ctx, emb, C.yellow, lwIn);
    const sp = [];
    for (let i = 0; i < 14; i++) { const a = i * 0.75, r = er * 0.85 * (i / 14); sp.push([em[0] + Math.cos(a) * r * (0.55 + 0.45 * turn), em[1] + Math.sin(a) * r]); }
    K.brush(ctx, sp, 0.4, 2.2 / s * 1.4, 0.6, C.red);
    // belt line
    K.brush(ctx, [[-14, -9], [0, -11], [14, -10]], lwIn, LW * 0.8, lwIn);

    // ---- neck & head ----
    const nk = limb([neck[0], neck[1] + 4], [neck[0] + Math.sin(lean) * 8, neck[1] - 8], 6, 5.6);
    K.shape(ctx, nk, C.skin, LW); mass(ctx, nk, L[0], L[1], C.skinS);
    head(ctx, headC, lean + g("head"), P, LW, lwIn, lwDet, L, M);

    // ---- near arm ----
    const uaF = limb(shF, elF, 6.8, 5.4), faF = limb(elF, haF, 5.4, 4.4);
    K.shape(ctx, uaF, C.green, LW); mass(ctx, uaF, L[0], L[1], C.greenS);
    // short sleeve: skin forearm + lower upper-arm
    const uaSkin = limb(fk(shF, armF[0] + lean * 0.3, 16), elF, 5.8, 5.4);
    K.shape(ctx, uaSkin, C.skin, LW); mass(ctx, uaSkin, L[0], L[1], C.skinS);
    K.shape(ctx, faF, C.skin, LW); mass(ctx, faF, L[0], L[1], C.skinS);
    // yellow wristband
    const wb = limb(fk(elF, armF[0] + armF[1] + lean * 0.3, 19), haF, 5.2, 5.0);
    K.shape(ctx, wb, C.yellow, lwIn);
    hand(ctx, haF, armF[0] + armF[1] + lean * 0.3, g("handF", "fist"), C.skin, LW, false);
    ctx.restore();
    return { head: [g("x") + headC[0] * s * face, g("y") + headC[1] * s], hand: [g("x") + haF[0] * s * face, g("y") + haF[1] * s], foot: [g("x") + ankle[0] * s * face, g("y") + (ankle[1] + 6) * s] };
  };

  function hand(ctx, p, ang, kind, col, LW, far) {
    ctx.save();
    ctx.translate(p[0], p[1]);
    ctx.rotate(-ang);
    let path;
    if (kind === "open") path = K.path([[-5, -2], [5, -2], [7, 8], [5, 16], [1, 18], [-2, 14], [-5, 17], [-7, 9]], true, 0.35);
    else if (kind === "point") path = K.path([[-5, -2], [5, -2], [6, 6], [3, 8], [2, 20], [-1, 20], [-2, 9], [-6, 8]], true, 0.3);
    else if (kind === "cap") path = K.path([[-5, -2], [5, -2], [8, 5], [9, 12], [0, 14], [-6, 10]], true, 0.4);
    else path = K.path([[-6, -2], [6, -2], [8, 6], [5, 12], [-3, 12], [-7, 7]], true, 0.45);
    K.shape(ctx, path, col, LW);
    if (!far) {
      ctx.lineWidth = LW * 0.45;
      ctx.beginPath(); ctx.moveTo(-2, 7); ctx.lineTo(4, 7); ctx.stroke();
    }
    ctx.restore();
  }

  function head(ctx, c, ang, P, LW, lwIn, lwDet, L, M) {
    const g = (k, d = 0) => (P[k] == null ? d : P[k]);
    const turn = g("turn", 1); // 0 = profile, 1 = 3/4
    ctx.save();
    ctx.translate(c[0], c[1]);
    ctx.rotate(ang * 0.8);
    // ear (back)
    const ear = new Path2D(); ear.ellipse(-6 - turn * 3, 3, 4.5, 6, 0.2, 0, U.TAU);
    // skull + jaw (profile vs 3/4 shift the jaw forward)
    const jx = 6 + (1 - turn) * 6;
    const headP = K.path([[-19, -4], [-16, -18], [-2, -24], [14, -20], [20, -8], [20 + (1 - turn) * 3, 2], [jx + 10, 13], [jx + 2, 21], [-6, 20], [-15, 12]], true, 0.45);
    K.shape(ctx, headP, C.skin, LW);
    mass(ctx, headP, L[0] * 0.9, L[1] * 0.7, C.skinS);
    K.shape(ctx, ear, C.skin, lwIn);
    // hair below the cap
    const hair = K.path([[-19, -5], [-17, -16], [-4, -21], [10, -20], [16, -14], [6, -13], [-6, -10], [-12, -3]], true, 0.4);
    K.shape(ctx, hair, C.hair, lwIn);
    // ---- face features ----
    const ex = 7 + turn * 2, ey = -4;
    const expr = g("expr", "determined");
    const gz = g("gaze", [0.3, 0]);
    const eyeAt = (x, w, wink) => {
      if (wink) { K.brush(ctx, [[x - w, ey + 1], [x, ey - 1.5], [x + w, ey + 1]], lwDet, lwIn * 1.4, lwDet); return; }
      const e = new Path2D(); e.ellipse(x, ey, w, w * 0.78, 0, 0, U.TAU);
      ctx.fillStyle = C.white; ctx.fill(e);
      ctx.fillStyle = C.eye; ctx.beginPath(); ctx.arc(x + gz[0] * w * 0.5, ey + gz[1] * w * 0.4, w * 0.55, 0, U.TAU); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x + gz[0] * w * 0.5 - 1, ey - 1.4, 0.9, 0, U.TAU); ctx.fill();
      ctx.lineWidth = lwIn; ctx.strokeStyle = K.INK; ctx.stroke(e);
    };
    eyeAt(ex + 6 * turn, 3.6, expr === "wink");
    if (turn > 0.4) eyeAt(ex - 5.5, 3.0 * turn, false);
    // brows
    const bAng = expr === "determined" || expr === "grit" ? 0.35 : expr === "surprised" ? -0.25 : 0.05;
    K.brush(ctx, [[ex + 6 * turn - 4, ey - 6 - bAng * 2], [ex + 6 * turn + 4, ey - 6.5 + bAng * 4]], lwIn * 2, lwIn * 2.4, lwIn);
    if (turn > 0.4) K.brush(ctx, [[ex - 9, ey - 6 + bAng * 3], [ex - 3, ey - 6.5 - bAng]], lwIn * 1.5, lwIn * 2, lwIn);
    // nose
    K.brush(ctx, [[ex + 9 + turn, ey + 2], [ex + 12 + turn, ey + 7], [ex + 8 + turn, ey + 8]], lwDet, lwIn * 1.2, lwDet);
    // mouth
    const mx = ex + 5 * turn + 2, my = 12;
    if (expr === "smile" || expr === "wink") {
      const m = K.path([[mx - 6, my - 1], [mx + 6, my - 2], [mx + 3, my + 4], [mx - 3, my + 4]], true, 0.5);
      K.shape(ctx, m, "#7a1a14", lwIn);
      ctx.save(); ctx.clip(m); ctx.fillStyle = C.white; ctx.fillRect(mx - 7, my - 3, 14, 3); ctx.restore();
    } else if (expr === "surprised") {
      const m = new Path2D(); m.ellipse(mx, my + 1, 2.6, 3.4, 0, 0, U.TAU); K.shape(ctx, m, "#7a1a14", lwIn);
    } else if (expr === "grit") {
      const m = K.path([[mx - 6, my], [mx + 6, my - 1], [mx + 5, my + 3], [mx - 5, my + 3]], true, 0.2);
      K.shape(ctx, m, C.white, lwIn);
      K.brush(ctx, [[mx - 5, my + 1.5], [mx + 5, my + 1]], lwDet, lwDet, lwDet);
    } else K.brush(ctx, [[mx - 5, my + 1], [mx, my + 0.4], [mx + 5, my - 1.5]], lwDet, lwIn * 1.4, lwDet);

    // ---- red cap (carapuça): pointed, flopping back ----
    const flop = g("cap", 0.3);
    const tipA = -2.35 - flop * 0.45;
    const tipP = [Math.cos(tipA) * 44 - 8, Math.sin(tipA) * 44 - 6 + flop * 10];
    const midP = [U.lerp(-4, tipP[0], 0.45) + 6, U.lerp(-28, tipP[1], 0.45) - 12];
    const cap = K.path([[-22, -6], [-18, -20], [-4, -28], midP, tipP, [midP[0] - 8, midP[1] + 8], [-10, -16], [18, -14], [21, -9], [4, -11]], true, 0.4);
    K.shape(ctx, cap, C.red, LW);
    mass(ctx, cap, L[0] * 0.8, L[1] * 0.8, C.redS, true, M);
    // cap band + highlight
    K.brush(ctx, [[-21, -7], [0, -12], [21, -9]], lwIn, LW, lwIn);
    K.brush(ctx, [[-10, -22], [-2, -26], [6, -24]], 0.5, 2.6, 0.5, C.redH);
    if (g("glow")) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const gr = ctx.createRadialGradient(0, -18, 0, 0, -18, 70);
      gr.addColorStop(0, `rgba(255,120,80,${0.5 * g("glow")})`); gr.addColorStop(1, "rgba(255,80,40,0)");
      ctx.fillStyle = gr; ctx.fillRect(-80, -100, 160, 160); ctx.restore();
    }
    ctx.restore();
  }
})(window.A);
