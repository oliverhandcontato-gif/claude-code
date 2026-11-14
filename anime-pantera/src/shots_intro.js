// Shots 0:00 – 0:55 — intro (spoken), verse 1.
(function (A) {
  const U = A.U, R = A.R, P = A.P, F = A.F, ENV = A.ENV, S = A.S, C = A.C;
  const shot = A.shot;
  const RIM_WARM = "rgba(255,196,130,0.95)";
  const RIM_BLUE = "rgba(120,180,255,0.95)";
  const flick = (t) => (U.hash(Math.floor(t * 9)) > 0.12 ? 1 : 0.35) * (0.92 + 0.08 * Math.sin(t * 40));
  S.flick = flick;

  // Blurred background helper (depth of field for close shots)
  S.blurBg = (ctx, px, fn) => {
    const b = F.buffer("bg");
    fn(b);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = `blur(${px}px)`;
    ctx.drawImage(b.canvas, 0, 0);
    ctx.restore();
  };

  // ---------------- S01 establishing, rain ----------------
  shot(0, 4.6, "S01 quadra de rua – chuva", (ctx, lt, I) => {
    const cam = S.track([
      { t: 0, pos: [420, 250, 760], yaw: 16, pitch: 7, fov: 42 },
      { t: 4.6, pos: [170, 150, 160], yaw: 9, pitch: 3, fov: 40, ease: "inOut3" },
    ], lt);
    ENV.street(ctx, cam, I.t, { flicker: flick(I.t) });
    const b = cam.proj([-70, 12, -430]);
    if (b.d > 0) { F.shadow(ctx, b.x, b.y + 11 * b.s, 16 * b.s, 4 * b.s, 0.5); F.ball(ctx, b.x, b.y, 12 * b.s, 0.4); }
    ENV.rain(ctx, cam, I.t, 1);
    F.flash(ctx, 1 - U.ease("out", lt / 1.8), "0,0,0");
  }, { vignette: 0.55 });

  // ---------------- S02 he walks in (back view, low angle) ----------------
  const walkCfg = (lazy = 1) => ({
    spec: S.ao(), step: 2,
    pose: (lt) => R.over(P.slouch, P.walk(lt * 0.85, { lazy })),
  });
  shot(4.6, 7.3, "S02 entra caminhando", (ctx, lt, I) => {
    const cfg = Object.assign(walkCfg(), { at: (t) => [30, 0, 240 - 105 * t], yaw: 180 });
    const cam = S.cam(S.lookAt([95, 48, 470 - lt * 22], [25, 165, 40 - lt * 60], { fov: 46 }));
    ENV.street(ctx, cam, I.t, { flicker: flick(I.t) });
    const b = cam.proj([-70, 12, -430]);
    if (b.d > 0) { F.shadow(ctx, b.x, b.y + 11 * b.s, 16 * b.s, 4 * b.s, 0.5); F.ball(ctx, b.x, b.y, 12 * b.s, 0.4); }
    S.actor(ctx, cam, Object.assign(cfg, { opts: { rim: RIM_WARM, rimW: 3 } }), lt);
    ENV.rain(ctx, cam, I.t, 1);
  }, { vignette: 0.55 });

  // ---------------- S03 MCU "pode vir que eu tô pronto" ----------------
  const mcuCfg = (extra) => Object.assign({
    spec: S.ao(), step: 2, at: [0, 0, 0], yaw: 18,
    keys: [[0, R.over(P.idle, { neck: [14, 0, 0], head: [12, -4, 4] })],
      [1.0, R.over(P.idle, { neck: [14, 0, 0], head: [12, -4, 4] })],
      [1.35, R.over(P.idle, { neck: [2, 0, 0], head: [-4, -10, 2] }), "outBackSoft"],
      [2.6, R.over(P.idle, { neck: [2, 0, 0], head: [-6, -12, 2] })]],
    drag: { head: 0.06, arm: 0.08 },
  }, extra);
  shot(7.3, 9.9, "S03 MCU pode vir", (ctx, lt, I) => {
    const cfg = mcuCfg({
      face: (t, l) => {
        const lift = U.smooth(U.inv(1.0, 1.4, t));
        const f = Object.assign({ lid: U.lerp(0.55, 0.82, lift), gaze: [U.lerp(0.2, 0.55, lift), U.lerp(-0.6, 0.15, lift)], browAngle: 0.5 }, S.lips(I.t));
        if (I.t > 9.05) Object.assign(f, { mouth: "smirk", open: 0 });
        return f;
      },
      opts: { rim: RIM_WARM, rimW: 5 },
    });
    const head = [0, 172, 0];
    const cam = S.cam(S.lookAt([-34 + lt * 4, 170, 96 - lt * 6], [6, 166, 0], { fov: 30 }));
    S.blurBg(ctx, 7, (b) => { ENV.street(b, cam, I.t, { flicker: flick(I.t) }); });
    S.actor(ctx, cam, cfg, lt);
    ENV.rain(ctx, cam, I.t, 0.7);
  }, { vignette: 0.6 });

  // ---------------- S04 ECU eye "o único que me derrota sou eu" ----------------
  shot(9.9, 12.3, "S04 ECU olho", (ctx, lt, I) => {
    const cfg = mcuCfg({
      yaw: 6,
      keys: [[0, R.over(P.idle, { neck: [2, 0, 0], head: [-4, -6, 2] })]],
      face: (t) => {
        const narrow = U.smooth(U.inv(1.1, 1.5, t));
        const z = I.t > 11.62 ? U.clamp(1 - (I.t - 11.62) * 1.6) : 0;
        return { lid: U.lerp(0.82, 0.58, narrow), gaze: [0.1, 0.05], browAngle: U.lerp(0.5, 0.9, narrow), zone: z * 0.9 + (I.t > 11.62 ? 0.15 : 0) };
      },
      opts: { rim: RIM_WARM, rimW: 7 },
    });
    const eye = S.jointWorld(cfg, lt, "head", [-3.4 * 1.1, 5.7 * 1.1, 8.15 * 1.1]);
    const push = U.ease("inOut", lt / 2.4);
    const cam = S.cam(S.lookAt([eye[0] - 6 + push * 2, eye[1] + 1, eye[2] + 46 - push * 14], eye, { fov: 24 }));
    S.blurBg(ctx, 10, (b) => { ENV.street(b, cam, I.t, { flicker: flick(I.t) }); });
    S.actor(ctx, cam, cfg, lt);
    if (I.t > 11.62) {
      const p = cam.proj(eye);
      const k = U.clamp(1 - (I.t - 11.62) * 1.4);
      F.glow(ctx, p.x, p.y, 260 * (0.6 + k), "90,160,255", 0.55 * k + 0.1);
      F.lightning(ctx, [{ x: p.x + 40, y: p.y - 6 }, { x: p.x + 380, y: p.y - 40 }, { x: p.x + 900, y: p.y - 30 }, { x: p.x + 1300, y: p.y - 90 }], I.t, { width: 18, alpha: k });
    }
    ENV.rain(ctx, cam, I.t, 0.5);
  }, { vignette: 0.65 });

  // ---------------- S05 title smash ----------------
  shot(12.3, 12.9, "S05 título", (ctx, lt, I) => {
    const g = ctx.createLinearGradient(0, 0, 1920, 1080);
    g.addColorStop(0, "#050814"); g.addColorStop(1, "#0d1f4e");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
    F.focusLines(ctx, 960, 540, 420, I.t, { color: "rgba(120,170,255,0.5)", n: 120 });
    const sc = U.lerp(1.5, 1, U.ease("outBack", U.clamp(lt / 0.22)));
    F.title(ctx, "PANTERA", "ZONA · AOMINE DAIKI", I.t, { scale: sc, shake: 14 * (1 - lt / 0.6), slash: U.clamp(lt / 0.3) });
    F.flash(ctx, 1 - lt / 0.12);
  }, { vignette: 0.5 });

  // ---------------- S06 rooftop wake up "acordei com dom" ----------------
  shot(12.9, 15.9, "S06 terraço acorda", (ctx, lt, I) => {
    A.CFG.light = [0.45, -0.85];
    const lieHands = P.lieBack;
    const cfg = {
      spec: S.ao(), step: 2, at: [0, 0, 0], yaw: -20,
      keys: [[0, lieHands], [1.3, R.over(lieHands, { head: [10, 10, 0] })],
        [1.5, R.over(lieHands, { spine: [-86, 0, 0], head: [20, 10, 0] }), "in"],
        [2.05, R.over(P.sitFloor, { spine: [18, 0, 0], neck: [10, 0, 0], arm: { L: [-10, 0, 30], R: [20, 0, 30] } }), "out3"],
        [2.4, R.over(P.sitFloor, { head: [0, 24, 0], arm: { R: [-50, 0, 20] }, elbow: { R: 120 } }), "outBackSoft"],
        [3.0, R.over(P.sitFloor, { head: [4, 28, 0], arm: { R: [-60, 0, 20] }, elbow: { R: 130 } })]],
      drag: { head: 0.08, arm: 0.06 },
      face: (t) => ({ lid: t < 0.7 ? 0 : U.lerp(0.25, 0.65, U.smooth(U.inv(0.7, 1.6, t))), gaze: [0.3, 0.1], mouth: t > 2.3 && t < 2.9 ? "talk" : "neutral", open: 0.3 }),
    };
    const cam = S.cam(S.lookAt([250 - lt * 10, 75, 210 - lt * 12], [-10, 40, -30], { fov: 40 }));
    ENV.rooftop(ctx, cam, I.t);
    S.actor(ctx, cam, cfg, lt);
  }, { vignette: 0.3 });

  // ---------------- S07 Generation of Miracles lineup ----------------
  const GOM = [
    { x: -390, z: -70, rim: "#53c27e", k: 1.0, yaw: 10, pose: R.over(P.stand, { arm: { R: [-30, 0, 10] }, elbow: { R: 110 }, head: [0, 10, 0] }) },
    { x: -195, z: -25, rim: "#f2cd3c", k: 0.99, yaw: 6, pose: R.over(P.idle, { head: [0, -12, -4] }) },
    { x: 0, z: 0, rim: "#5b8cff", k: 1.0, yaw: 0, pose: P.idle, ao: true },
    { x: 200, z: -25, rim: "#a46ae0", k: 1.1, yaw: -6, pose: R.over(P.slouch, { spine: [16, 0, 0] }) },
    { x: 380, z: -70, rim: "#e0443a", k: 0.9, yaw: -10, pose: R.over(P.stand, { head: [-4, 0, 0] }) },
  ];
  S.GOM = GOM;
  S.drawGom = (ctx, cam, lt, t, lit, opts = {}) => {
    const order = GOM.map((g, i) => i).sort((a, b) => GOM[a].z - GOM[b].z);
    order.forEach((i) => {
      const g = GOM[i];
      if (opts.skip && opts.skip(i)) return;
      const cfg = { spec: S.ao(), step: 2, at: [g.x + (opts.dx ? opts.dx(i) : 0), 0, g.z], yaw: g.yaw, keys: [[0, g.pose]], shadow: false, viewExtra: {}, face: { lid: 0.8 } };
      const v = cam.charView(cfg.at);
      v.k = g.k;
      cfg.view = v;
      if (opts.pose) cfg.pose = (l) => opts.pose(i, l);
      if (g.ao && lit) {
        S.actor(ctx, cam, Object.assign(cfg, { opts: { rim: RIM_BLUE, rimW: 4 }, face: { lid: 0.8, zone: lit, browAngle: 0.6 } }), lt);
      } else {
        F.silhouette(ctx, (b) => S.actor(b, cam, cfg, lt), "#07080e", { rim: g.rim, rimOff: [3, -2], alpha: opts.alpha ? opts.alpha(i) : 1 });
        // eye glints
        const e = S.jointWorld(cfg, lt, "head", [0, 6.2 * g.k, 9]);
        const p = cam.proj([g.x + (e[0] - g.x) * g.k, e[1] * g.k, g.z + (e[2] - g.z) * g.k]);
        if (p.d > 0) F.glow(ctx, p.x, p.y, 22 * p.s, U.hex(g.rim).join(","), 0.85 * (opts.alpha ? opts.alpha(i) : 1));
      }
    });
  };
  shot(15.9, 19.65, "S07 Geração Milagrosa", (ctx, lt, I) => {
    const lit = U.clamp((I.t - 17.54) / 0.4);
    const push = U.ease("inOut", lt / 3.75);
    const cam = S.cam(S.lookAt([0, U.lerp(120, 150, push), U.lerp(820, 470, push)], [0, 120, 0], { fov: 40 }));
    ENV.stage(ctx, cam, I.t, { spots: GOM.map((g) => [g.x, g.z]), spotColor: "150,170,220" });
    if (lit > 0) F.glow(ctx, cam.proj([0, 100, 0]).x, cam.proj([0, 100, 0]).y, 600, "70,130,255", 0.35 * lit);
    S.drawGom(ctx, cam, lt, I.t, lit);
    F.flash(ctx, lit > 0 && lit < 1 ? (1 - lit) * 0.5 : 0, "160,200,255");
  }, { vignette: 0.6 });

  // ---------------- S08 the others copy him (echo silhouettes) ----------------
  const crossKeys = (() => {
    const a = P.dribbleLow, b = P.mirror(P.dribbleLow);
    const lean = (p, x) => R.over(p, { root: { pos: [x, 0, 0] } });
    return [[0, lean(a, 0)], [0.45, lean(R.over(a, { hips: [30, -20, 6] }), -20), "inOut"], [0.62, lean(b, 50), "snap"], [1.1, lean(R.over(b, { hips: [30, 20, -6] }), 40)], [1.27, lean(a, -30), "snap"], [1.8, lean(a, -10)], [2.0, lean(a, 0)]];
  })();
  S.crossKeys = crossKeys;
  const loopKeys = (keys, t) => P.sample(keys, ((t % 2) + 2) % 2);
  shot(19.65, 22.95, "S08 os outros copiam", (ctx, lt, I) => {
    const cam = S.cam(S.lookAt([lt * 14, 80, 560 - lt * 20], [0, 110, -150], { fov: 42 }));
    ENV.stage(ctx, cam, I.t, { spots: [[0, 0], [-260, -260], [260, -260]], spotColor: "120,150,230" });
    const echo = [[-260, -280, 0.3, 0], [260, -280, 0.45, 1], [-480, -520, 0.6, 3], [480, -520, 0.75, 4]];
    echo.forEach(([x, z, d, gi]) => {
      const cfg = { spec: S.ao(), step: 3, at: [x, 0, z], pose: (l) => R.full(loopKeys(crossKeys, l - d)), shadow: false };
      F.silhouette(ctx, (b) => S.actor(b, cam, cfg, lt), "#06070c", { rim: GOM[gi].rim, alpha: 0.95 });
    });
    const cfg = {
      spec: S.ao(), step: 2, at: [0, 0, 0], pose: (l) => R.full(loopKeys(crossKeys, l)),
      face: { lid: 0.75, browAngle: 0.6, mouth: "smirk" }, opts: { rim: RIM_BLUE, rimW: 3 },
      props: (J, view, l) => {
        const ph = (l * 2) % 1;
        const side = ((l % 2) + 2) % 2 > 0.62 && ((l % 2) + 2) % 2 < 1.27 ? "L" : "R";
        return [S.ball(view, S.dribblePos(J, ph, side), l * 9)];
      },
    };
    S.actor(ctx, cam, cfg, lt);
  }, { vignette: 0.6 });

  // ---------------- S09 panther prowl + defender lunge (street) ----------------
  shot(22.95, 26.6, "S09 pantera na quadra", (ctx, lt, I) => {
    const tc = 1.6; // crossover moment
    const xAt = (t) => U.lerp(0, -95, U.ease("snap", U.clamp((t - tc) / 0.25)));
    const ao = {
      spec: S.ao(), step: 2, at: (t) => [xAt(t), 0, -560 + 105 * t],
      pose: (t) => {
        const base = t < tc ? R.over(P.dribbleLow, { head: [-18, 0, 0] }) : P.mirror(P.dribbleLow);
        const lean = R.over(base, { hips: [34, t > tc && t < tc + 0.3 ? 20 : 0, 0] });
        return P.dribblePump(lean, (t * 2.4) % 1, t < tc ? "R" : "L");
      },
      face: (t) => ({ lid: 0.7, browAngle: 0.7, gaze: [0, 0.25], mouth: t > tc + 0.2 ? "smirk" : "neutral" }),
      opts: { rim: RIM_WARM, rimW: 3 },
      props: (J, view, t) => [S.ball(view, S.dribblePos(J, (t * 2.4) % 1, t < tc ? "R" : "L"), t * 10)],
    };
    const dz = (t) => -260 + 30 * t;
    const def = {
      spec: S.rival(8), step: 2, at: (t) => [U.lerp(130, -40, U.ease("in", U.clamp((t - tc + 0.1) / 0.5))), 0, dz(t)], yaw: -25,
      keys: [[0, P.defense], [tc - 0.15, R.over(P.defense, { hips: [30, 0, 0] })], [tc + 0.15, P.lunge, "out"], [tc + 0.7, R.over(P.lunge, { root: { rot: [0, 0, 25] } }), "in"], [3.6, R.over(P.lunge, { root: { rot: [0, 0, 40] } })]],
      face: { lid: 1.15, mouth: "talk", open: 0.4 },
    };
    const cam = S.cam(S.lookAt([40 - lt * 8, 55, 330 - lt * 20], [xAt(lt) * 0.4, 95, -220], { fov: 46 }));
    ENV.street(ctx, cam, I.t, { flicker: 1 });
    // draw farther actor first
    const aoZ = -560 + 105 * lt;
    if (aoZ < dz(lt)) { S.actor(ctx, cam, ao, lt); S.actor(ctx, cam, def, lt); } else { S.actor(ctx, cam, def, lt); S.actor(ctx, cam, ao, lt); }
    const k = U.clamp(1 - Math.abs(lt - tc - 0.1) / 0.3);
    if (k > 0) F.speedLines(ctx, 0, I.t, { color: `rgba(255,255,255,${0.5 * k})`, n: 50 });
  }, { vignette: 0.5 });

  // ---------------- S10 side tracking streetball ----------------
  shot(26.6, 29.9, "S10 streetball lateral", (ctx, lt, I) => {
    const speed = 260;
    const xAt = (t) => -420 + speed * t;
    const btb = 1.5; // behind the back
    const ao = {
      spec: S.ao(), step: 2, at: (t) => [xAt(t), 0, 0], yaw: 90,
      pose: (t) => {
        const r = P.run(t * 1.5);
        const dr = R.over(r, { hips: [24, r.hips[1], 0], arm: { R: [-25, 0, 18] }, elbow: { R: 40 }, handShape: { R: "open", L: "open" } });
        if (t > btb && t < btb + 0.35) return R.over(dr, { arm: { R: [40, 30, 30], L: [30, -30, 30] }, elbow: { R: 70, L: 70 } });
        return t > btb ? P.mirror(dr) : dr;
      },
      face: { lid: 0.7, browAngle: 0.6, mouth: "smirk" },
      props: (J, view, t) => {
        let pos;
        if (t > btb && t < btb + 0.35) {
          const u = (t - btb) / 0.35;
          const a = S.handPos(J, "R", 6, -14), b = S.handPos(J, "L", 6, -14);
          pos = U.mix3(a, b, u); pos[2] -= 22 * Math.sin(Math.PI * u); pos[1] -= 30 * Math.sin(Math.PI * u);
        } else pos = S.dribblePos(J, (t * 3) % 1, t > btb ? "L" : "R", 45);
        return [S.ball(view, pos, t * 12, { zBias: t > btb && t < btb + 0.35 ? -30 : 0 })];
      },
    };
    const cam = S.cam(S.lookAt([xAt(lt) + 60, 105, 470], [xAt(lt) + 60, 100, 0], { fov: 40 }));
    ENV.street(ctx, cam, I.t, { flicker: 1, lamp: [-200, 620, -700] });
    F.speedLines(ctx, 0, I.t, { color: "rgba(255,255,255,0.28)", n: 40 });
    S.actor(ctx, cam, ao, lt);
    const k = U.clamp(1 - Math.abs(lt - btb - 0.17) / 0.25);
    if (k > 0) F.focusLines(ctx, cam.proj([xAt(lt), 100, 0]).x, 520, 300, I.t, { color: `rgba(255,255,255,${0.7 * k})` });
  }, { vignette: 0.45 });

  // ---------------- S11 formless shot ----------------
  const RIM = [0, 305, -1242.5];
  S.RIM = RIM;
  shot(29.9, 31.4, "S11a sem forma (arremesso)", (ctx, lt, I) => {
    const rel = 0.95;
    const ao = {
      spec: S.ao(), step: 2, at: [150, 0, -1120], yaw: 200,
      keys: [[0, R.over(P.dribbleLow, { head: [-20, 0, 0] })], [0.3, P.dunkCrouch, "in"], [0.55, R.over(P.formless, { root: { lift: 70 } }), "out3"], [rel, R.over(P.formless, { root: { lift: 95 }, arm: { R: [-150, 50, 80] }, hand: { R: [70, 0, 0] } }), "inOut"], [1.5, R.over(P.formless, { root: { lift: 40 } }), "in"]],
      finish: {},
      face: (t) => ({ lid: 0.7, browAngle: 0.4, gaze: [0.6, 0.4], mouth: t > rel ? "smirk" : "neutral" }),
      opts: { rim: RIM_WARM, rimW: 3 },
      props: (J, view, t) => (t < rel ? [S.ball(view, S.handPos(J, "R"), t * 6)] : []),
    };
    const cam = S.cam(S.lookAt([430, 60, -760], [120, 200, -1200], { fov: 46 }));
    ENV.street(ctx, cam, I.t, { flicker: 1 });
    const st = S.actor(ctx, cam, ao, lt);
    if (lt >= rel) {
      // ball flight in world space toward the rim
      const from = S.jointWorld(ao, rel, "handR", [0, -9, 9]);
      const u = U.clamp((lt - rel) / 0.95);
      const p = U.mix3(from, RIM, u); p[1] += Math.sin(Math.PI * u) * 260;
      const q = cam.proj(p);
      if (q.d > 0) F.ball(ctx, q.x, q.y, 12 * q.s, lt * 14);
    }
    const k = U.clamp(1 - Math.abs(lt - rel) / 0.25);
    if (k > 0) F.focusLines(ctx, cam.proj(S.jointWorld(ao, lt, "chest")).x, 480, 260, I.t, { color: `rgba(255,255,255,${0.7 * k})` });
  }, { vignette: 0.45 });
  shot(31.4, 32.9, "S11b cesta (rede)", (ctx, lt, I) => {
    const cam = S.cam(S.lookAt([60 + lt * 10, 130, -1080], [0, 300, -1242], { fov: 40 }));
    const netT = U.clamp((lt - 0.38) / 0.8);
    ENV.street(ctx, cam, I.t, { flicker: 1, netT: netT > 0 ? netT : 0 });
    const u = U.clamp(lt / 0.55);
    const p = [U.lerp(8, 0, u), U.lerp(420, 230, U.ease("in", u)), RIM[2] + U.lerp(-20, 0, u)];
    const q = cam.proj(p);
    if (q.d > 0 && lt < 0.75) F.ball(ctx, q.x, q.y, 12 * q.s, lt * 10);
    if (lt > 0.4 && lt < 0.9) F.focusLines(ctx, cam.proj(RIM).x, cam.proj(RIM).y, 240, I.t, { color: "rgba(255,255,255,0.6)" });
  }, { vignette: 0.5 });

  // ---------------- S12 Teiko flashback ----------------
  shot(32.9, 36.7, "S12 flashback Teikō", (ctx, lt, I) => {
    A.CFG.light = [0.6, -0.7];
    const ao = {
      spec: S.aoTeiko(), step: 2, at: [0, 0, 0], yaw: 40,
      keys: [[0, R.over(P.teikoHold, { head: [-2, 20, 4] })], [1.2, P.teikoHold, "inOut"], [3.8, R.over(P.teikoHold, { spine: [8, -16, 0] })]],
      drag: { head: 0.08 },
      face: (t) => ({ lid: 1.05, gaze: [0.7, 0.1], mouth: "grin", open: 0.6, smile: 1, brow: 0.4, browAngle: -0.2 }),
      opts: { rim: "rgba(255,210,150,0.95)", rimW: 5, light: [0.6, -0.7] },
      props: (J, view, t) => [S.ball(view, U.add(S.holdPos(J), [0, 0, 0]), 0.3, { light: [0.6, -0.7] })],
    };
    const push = U.ease("inOut", lt / 3.8);
    const cam = S.cam(S.lookAt([U.lerp(160, 110, push), 150, U.lerp(300, 200, push)], [0, 140, 0], { fov: 34 }));
    S.blurBg(ctx, 5, (b) => ENV.teiko(b, cam, I.t));
    S.actor(ctx, cam, ao, lt);
    F.grade(ctx, "#ff9a50", 0.35, "soft-light");
    F.glow(ctx, 1500, 200, 900, "255,190,120", 0.25);
    F.vignette(ctx, 0.5, "255,235,210");
    F.flash(ctx, 1 - lt / 0.35);
  }, { vignette: 0 });

  // ---------------- S13 present: bored ----------------
  shot(36.7, 40.4, "S13 virou obrigação", (ctx, lt, I) => {
    const turn = 2.1;
    const ao = {
      spec: S.aoGame(), step: 2, at: [0, 0, 0], yaw: 0,
      keys: [[0, R.over(P.slouch, { neck: [18, 0, 0], head: [14, 10, 0] })], [turn, R.over(P.slouch, { neck: [18, 0, 0], head: [12, 14, 0] })],
        [turn + 0.5, R.over(P.slouch, { root: { yaw: 70 }, head: [8, 30, 0] }), "inOut"], [3.7, R.over(P.slouch, { root: { yaw: 150 }, head: [8, 20, 0] })]],
      drag: { head: 0.1, arm: 0.08 },
      face: (t) => ({ lid: 0.55, gaze: [0.2, -0.7], browAngle: 0.2, mouth: "frown" }),
    };
    const cam = S.cam(S.lookAt([60, 160, 175 - lt * 6], [0, 152, 0], { fov: 32 }));
    S.blurBg(ctx, 6, (b) => ENV.arena(b, cam, I.t, { hype: 0.1 }));
    S.actor(ctx, cam, ao, lt);
    F.filterFrame(ctx, `saturate(${U.lerp(1, 0.3, U.clamp(lt / 1.2))}) brightness(0.9)`);
    F.grade(ctx, "#4a6aa0", 0.3, "soft-light");
    F.flash(ctx, 0.6 - lt / 0.4);
  }, { vignette: 0.55 });

  // ---------------- S14 eyes closed free throw ----------------
  const FT = [0, 0, -820];
  const ftCfg = () => ({
    spec: S.aoGame(), step: 2, at: FT, yaw: 180,
    keys: [[0, P.shootSet], [1.25, R.over(P.shootSet, { leg: { L: [-34, 0, 8], R: [-34, 0, 8] }, knee: { L: 56, R: 56 }, hips: [18, 0, 0] }), "inOut"],
      [1.55, P.shootRelease, "out3"], [2.4, P.shootRelease], [3.0, R.over(P.stand, { arm: { R: [-40, 0, 10] }, elbow: { R: 40 } }), "inOut"]],
    drag: { arm: 0.04 },
    face: (t) => ({ lid: 0, mouth: t > 0.9 ? "smirk" : "neutral", browAngle: 0.2 }),
    props: (J, view, t) => (t < 1.5 ? [S.ball(view, U.add(S.handPos(J, "R", 12, -8), [0, 0, 0]), 0.2)] : []),
  });
  shot(40.4, 42.2, "S14a olho fechado", (ctx, lt, I) => {
    const ao = ftCfg();
    const cam = S.cam(S.lookAt([40, 182, -1075], [0, 192, -820], { fov: 34 }));
    S.blurBg(ctx, 6, (b) => ENV.arena(b, cam, I.t, { hype: 0.2 }));
    S.actor(ctx, cam, ao, lt);
    if (lt > 1.5) {
      const from = S.jointWorld(ao, 1.5, "handR", [0, -8, 12]);
      const u = (lt - 1.5) / 1.3;
      const p = U.mix3(from, RIM, u); p[1] += Math.sin(Math.PI * u) * 300;
      const q = cam.proj(p);
      if (q.d > 0) F.ball(ctx, q.x, q.y, 12 * q.s, lt * 9);
    }
  }, { vignette: 0.5 });
  shot(42.2, 43.6, "S14b cesta de olho fechado", (ctx, lt, I) => {
    const ao = ftCfg();
    const L = lt + 1.8;
    const cam = S.cam(S.lookAt([110, 200, -380], [0, 240, -1150], { fov: 38 }));
    const netT = U.clamp((L - 2.8) / 0.8);
    ENV.arena(ctx, cam, I.t, { hype: 0.5, netT });
    S.actor(ctx, cam, ao, L);
    const from = S.jointWorld(ao, 1.5, "handR", [0, -8, 12]);
    const u = (L - 1.5) / 1.3;
    if (u < 1.15) {
      const p = U.mix3(from, RIM, Math.min(u, 1)); p[1] += Math.sin(Math.PI * Math.min(u, 1)) * 300 - Math.max(0, u - 1) * 300;
      const q = cam.proj(p);
      if (q.d > 0) F.ball(ctx, q.x, q.y, 12 * q.s, L * 9);
    }
  }, { vignette: 0.45 });

  // ---------------- S15 rooftop top-down yawn ----------------
  shot(43.6, 47.2, "S15 entediado (topo)", (ctx, lt, I) => {
    A.CFG.light = [0.45, -0.85];
    const ao = {
      spec: S.ao(), step: 3, at: [0, 0, 0], yaw: 0,
      keys: [[0, P.lieBack], [3.6, R.over(P.lieBack, { head: [16, -20, 0] })]],
      face: (t) => {
        const y = U.clamp(Math.sin(Math.PI * U.clamp((I.t - 44.6) / 1.4)));
        return { lid: U.lerp(0.5, 0.1, y), mouth: y > 0.15 ? "shout" : "neutral", open: y, round: 0.6, brow: y * 0.4 };
      },
    };
    const ang = lt * 4;
    const cam = S.cam({ pos: [Math.sin(ang * U.D) * 4, 300, -35 + 4], yaw: ang, pitch: 84, roll: 0, fov: 44 });
    ENV.rooftop(ctx, cam, I.t);
    S.actor(ctx, cam, ao, lt);
  }, { vignette: 0.35 });

  // ---------------- S16 crane up "tô no topo sozin" ----------------
  shot(47.2, 50.6, "S16 grua sobe", (ctx, lt, I) => {
    A.CFG.light = [0.45, -0.85];
    const ao = { spec: S.ao(), step: 3, at: [0, 0, 0], keys: [[0, R.over(P.lieBack, { head: [16, -20, 0] })]], face: { lid: 0.4 } };
    const u = U.ease("inOut3", lt / 3.4);
    const cam = S.cam({ pos: [U.lerp(0, 300, u), U.lerp(300, 3300, u), U.lerp(-31, 2600, u)], yaw: U.lerp(0, 8, u), pitch: U.lerp(84, 34, u), fov: U.lerp(44, 50, u) });
    ENV.rooftop(ctx, cam, I.t);
    S.actor(ctx, cam, ao, lt);
  }, { vignette: 0.3 });

  // ---------------- S17 scoreboard 50 + walk away ----------------
  shot(50.6, 53.0, "S17a placar 50", (ctx, lt, I) => {
    const n = Math.min(50, 41 + Math.floor(U.clamp(lt / 0.32) * 9));
    const cam = S.cam(S.lookAt([0, 940 - lt * 10, 560 - lt * 40], [0, 960, 0], { fov: 34, roll: -4 }));
    ENV.arena(ctx, cam, I.t, { score: ["TOUOU", n, "GUEST", 31], clock: "0:00", hype: 1, flashes: 2 });
    if (n === 50 && lt < 0.6) F.focusLines(ctx, 960, 540, 380, I.t, { color: "rgba(255,230,180,0.5)" });
    F.flash(ctx, n === 50 ? 0.35 - (lt - 0.32) : 0, "255,220,160");
  }, { vignette: 0.5 });
  shot(53.0, 54.98, "S17b sai andando", (ctx, lt, I) => {
    const cfg = Object.assign(walkCfg(1.2), { spec: S.aoGame(), at: (t) => [20, 0, -100 - 100 * t], yaw: 180, face: { lid: 0.6 } });
    const cam = S.cam(S.lookAt([-90, 70, 260], [20, 150, -200], { fov: 44 }));
    ENV.arena(ctx, cam, I.t, { hype: 1, flashes: 3 });
    S.actor(ctx, cam, cfg, lt);
  }, { vignette: 0.45 });
})(window.A);
