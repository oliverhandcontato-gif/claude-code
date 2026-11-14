// Timeline runtime: finds the shot for a frame, renders it, applies post effects.
// Shots register themselves with A.shot(t0, t1, name, drawFn(ctx, lt, info)).
(function (A) {
  const U = A.U, C = A.C, P = A.P, F = A.F;
  const S = (A.S = {});
  A.SHOTS = [];
  A.shot = (t0, t1, name, draw, o = {}) => A.SHOTS.push(Object.assign({ t0, t1, name, draw }, o));

  // ---------- specs ----------
  S.gold = { base: "#e2b84a", hi: "#fff1b0" };
  S.ao = () => C.aomine("touou", { chain: S.gold });
  S.aoGame = () => C.aomine("touou", { chain: S.gold, wristband: "#1d1d24" });
  S.aoTeiko = () => C.aomine("teiko", { chain: null });
  S.rival = (n = 8) => {
    const sp = C.aomine("rival", { number: n, kanji: "", word: "", headScale: 1.06 });
    sp.pal = Object.assign({}, sp.pal, {
      skin: { base: "#e6b892", shade: "#b98466", deep: "#8a5a44", hi: "#f6d2b2", blush: "#d08870" },
      hair: { base: "#3a2a24", shade: "#21160f", deep: "#120a06", hi: "#6a5040", spec: "#8a7060" },
      eye: Object.assign({}, A.PAL.eye, { iris: "#4a3a2a", irisDark: "#241a10", irisHi: "#8a7050" }),
    });
    return sp;
  };

  // ---------- lip sync ----------
  S.lips = (t, gain = 1) => {
    const M = A.MOUTH;
    if (!M) return { mouth: "neutral" };
    let f = Math.floor(t * M.fps);
    f -= f % 2; // mouth drawings on twos
    const o = U.clamp((M.open[f] || 0) * gain);
    const r = M.round[f] || 0;
    if (o < 0.12) return { mouth: "neutral", open: 0 };
    // quantise to 3 drawings like hand-drawn lip flaps
    const q = o < 0.38 ? 0.3 : o < 0.7 ? 0.6 : 0.95;
    return { mouth: "talk", open: q, round: r > 0.5 ? 0.8 : 0.1 };
  };

  // ---------- actor ----------
  // cfg: { spec, keys | pose(lt), at:[x,y,z], yaw, face(lt)|face, step, drag, props(J,view,lt), opts, view (override) }
  S.posed = (cfg, lt) => {
    const raw = cfg.pose ? cfg.pose(lt) : P.at(cfg.keys, lt, { step: cfg.step, drag: cfg.drag });
    const p = P.finish(raw, cfg.finish || {});
    p.root = Object.assign({}, p.root, { yaw: (p.root.yaw || 0) + (cfg.yaw || 0) });
    return p;
  };
  S.actor = (ctx, cam, cfg, lt) => {
    const step = cfg.step == null ? A.CFG.defaultStep : cfg.step;
    const ts = U.stepTime(lt, A.CFG.fps, step);
    const pose = S.posed(cfg, ts);
    const prev = S.posed(cfg, ts - Math.max(1, step) / A.CFG.fps);
    const at = typeof cfg.at === "function" ? cfg.at(ts) : cfg.at || [0, 0, 0];
    const view = cfg.view || cam.charView(at, cfg.viewExtra || {});
    const face = typeof cfg.face === "function" ? cfg.face(ts, lt) : cfg.face || {};
    const layers = C.layers(cfg.spec, pose, prev, view, face, cfg.opts || {});
    const props = cfg.props ? cfg.props(layers.J, layers.view, ts, pose) : [];
    const all = layers.concat(props);
    all.sort((a, b) => a.z - b.z);
    if (cfg.shadow !== false) {
      const sp = cam.proj([at[0] + pose.root.pos[0], 0, at[2] + pose.root.pos[2]]);
      const hgt = U.clamp(1 - pose.root.pos[1] / 150, 0.3, 1);
      if (sp.d > 0) F.shadow(ctx, sp.x, sp.y, 45 * sp.s * hgt, 12 * sp.s * hgt, 0.32 * hgt);
    }
    all.forEach((l) => l.draw(ctx));
    return { J: layers.J, view: layers.view, pose, at };
  };
  // ball positions in character space
  S.handPos = (J, side = "R", out = 9, down = -9) => {
    const H = J["hand" + side];
    return U.add(H.p, U.mv(H.m, [0, down, out]));
  };
  S.holdPos = (J) => U.mul(U.add(S.handPos(J, "L", 8, -9), S.handPos(J, "R", 8, -9)), 0.5);
  // dribble: ph 0 = in hand, 0.5 = floor
  S.dribblePos = (J, ph, side = "R", fwd = 0) => {
    const h = S.handPos(J, side, 6, -14);
    const k = Math.pow(Math.sin(Math.PI * (ph % 1)), 0.75);
    const f = U.mv(J.root.m, [0, 0, 1]);
    return [h[0] + f[0] * fwd * k, U.lerp(h[1], 12, k), h[2] + 4 * k + f[2] * fwd * k];
  };
  S.ball = (view, pos, spin, o) => F.ballLayer(view, pos, spin, o);

  // camera helpers
  S.cam = (o) => A.CAM.make(o);
  S.track = (keys, lt) => A.CAM.make(A.CAM.track(keys, lt));
  S.shake = (o, amt, lt, freq = 24) => {
    if (!amt) return o;
    const q = Math.floor(lt * freq);
    return Object.assign({}, o, { shiftX: (o.shiftX || 0) + (U.hash(q) - 0.5) * amt, shiftY: (o.shiftY || 0) + (U.hash(q + 77) - 0.5) * amt });
  };
  // world-space point of a joint (for aiming cameras at body parts)
  S.jointWorld = (cfg, lt, joint, local = [0, 0, 0]) => {
    const p = S.posed(cfg, lt);
    const J = A.R.fk(p);
    const at = typeof cfg.at === "function" ? cfg.at(lt) : cfg.at || [0, 0, 0];
    const q = U.add(J[joint].p, U.mv(J[joint].m, local));
    return U.add(q, at);
  };
  // aim: camera yaw/pitch so that it looks from pos to target
  S.lookAt = (pos, target, extra = {}) => {
    const d = U.sub(target, pos);
    const yaw = Math.atan2(-d[0], -d[2]) / U.D;
    const pitch = Math.atan2(-d[1], Math.hypot(d[0], d[2])) / U.D;
    return Object.assign({ pos, yaw, pitch }, extra);
  };

  // ---------- frame ----------
  A.findShot = (t) => {
    for (const s of A.SHOTS) if (t >= s.t0 && t < s.t1) return s;
    return A.SHOTS[A.SHOTS.length - 1];
  };
  A.renderFrame = (ctx, frame) => {
    const fps = A.CFG.fps;
    const t = frame / fps;
    const shot = A.findShot(t);
    const lt = t - shot.t0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, A.CFG.width, A.CFG.height);
    A.CFG.light = [-0.55, -0.75];
    ctx.save();
    shot.draw(ctx, lt, { t, frame, shot, dur: shot.t1 - shot.t0, u: lt / (shot.t1 - shot.t0) });
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (shot.vignette !== 0) F.vignette(ctx, shot.vignette == null ? 0.4 : shot.vignette);
    F.letterbox(ctx, shot.letterbox || A.CFG.letterbox);
    F.grain(ctx, frame, A.CFG.grain);
    if (A.CFG.showLyrics && A.WORDS) {
      const seg = A.WORDS.find((s) => t >= s.start - 0.1 && t <= s.end + 0.3);
      if (seg) F.caption(ctx, seg.text, 1);
    }
    return shot.name;
  };
})(window.A = window.A || {});
