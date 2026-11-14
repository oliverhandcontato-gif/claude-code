// Shots 0:55 – 1:36 and 2:04 – 2:45 — pre-chorus, chorus, zone (built from reusable generators).
(function (A) {
  const U = A.U, R = A.R, P = A.P, F = A.F, ENV = A.ENV, S = A.S;
  const shot = A.shot;
  const G = (A.G = {});
  const RIM_BLUE = "rgba(120,180,255,0.95)";
  const EYE_R = [-3.4 * 1.1, 5.7 * 1.1, 8.15 * 1.1];
  const beatPulse = (t, k = 6) => {
    const b = A.BEATS.beats;
    let best = 1e9;
    for (let i = 0; i < b.length; i++) { const d = t - b[i]; if (d >= 0 && d < best) best = d; }
    return Math.exp(-best * k);
  };
  G.beatPulse = beatPulse;
  const holdBall = R.over(P.idle, { arm: { R: [-6, 10, 26] }, elbow: { R: 56 }, hand: { R: [0, -40, 0] }, handShape: { R: "hold" } });
  const holdBallPos = (J) => S.handPos(J, "R", 10, -8);

  // ---- stand hero shot ("não tem rival aqui") ----
  G.standHero = (t0, t1, v = 0) => shot(t0, t1, "pré-refrão: sem rival", (ctx, lt, I) => {
    const u = U.ease("inOut", lt / (t1 - t0));
    const ao = {
      spec: S.aoGame(), step: 2, at: [0, 0, 0], yaw: v ? -20 : 15,
      keys: [[0, R.over(holdBall, { head: [-6, -8, 0] })], [t1 - t0, R.over(holdBall, { head: [-10, -12, 2], chest: [0, -6, 0] })]],
      face: (t) => Object.assign({ lid: 0.68, browAngle: 0.6, gaze: [0.2, 0.2] }, S.lips(I.t)),
      opts: { rim: "rgba(255,240,220,0.9)", rimW: 3 },
      props: (J, view, t) => [S.ball(view, holdBallPos(J), 0.5)],
    };
    const cam = S.cam(S.lookAt([v ? -140 : 120, U.lerp(40, 70, u), U.lerp(380, 300, u)], [0, 140, 0], { fov: 40, roll: v ? 5 : -4 }));
    ENV.arena(ctx, cam, I.t, { hype: 0.15 });
    F.grade(ctx, "#000010", 0.45, "multiply");
    F.glow(ctx, cam.proj([0, 120, 0]).x, cam.proj([0, 140, 0]).y, 700, "220,230,255", 0.22);
    S.actor(ctx, cam, ao, lt);
  }, { vignette: 0.65 });

  // ---- orbit dribble ("tô jogando sozin") ----
  G.orbitDribble = (t0, t1, a0, a1) => shot(t0, t1, "pré-refrão: orbita drible", (ctx, lt, I) => {
    const a = U.lerp(a0, a1, U.ease("inOut", lt / (t1 - t0))) * U.D;
    const cam = S.cam(S.lookAt([Math.sin(a) * 330, 115, Math.cos(a) * 330], [0, 95, 0], { fov: 42 }));
    ENV.arena(ctx, cam, I.t, { hype: 0.2 });
    F.grade(ctx, "#000010", 0.4, "multiply");
    const ao = {
      spec: S.aoGame(), step: 2, at: [0, 0, 0],
      pose: (l) => R.full(P.sample(S.crossKeys, ((l * 1.2) % 2 + 2) % 2)),
      face: (t) => Object.assign({ lid: 0.7, browAngle: 0.5, gaze: [0, 0.2] }, S.lips(I.t)),
      opts: { rim: RIM_BLUE, rimW: 3 },
      props: (J, view, l) => {
        const c = ((l * 1.2) % 2 + 2) % 2;
        return [S.ball(view, S.dribblePos(J, (l * 2.4) % 1, c > 0.62 && c < 1.27 ? "L" : "R"), l * 9)];
      },
    };
    S.actor(ctx, cam, ao, lt);
  }, { vignette: 0.6 });

  // ---- beckon ("pode vir em mim") ----
  G.beckon = (t0, t1, side = 1) => shot(t0, t1, "pré-refrão: pode vir", (ctx, lt, I) => {
    const ao = {
      spec: S.aoGame(), step: 2, at: [0, 0, 0], yaw: -10 * side,
      keys: [[0, R.over(P.idle, { head: [-8, 0, 0] })], [0.45, P.beckon, "outBackSoft"], [t1 - t0, R.over(P.beckon, { head: [-10, -14, 4] })]],
      drag: { head: 0.06, arm: 0.05 },
      pose: null,
      face: (t) => Object.assign({ lid: 0.7, browAngle: 0.7, gaze: [0.1, 0.3] }, S.lips(I.t), I.t > t1 - 0.5 ? { mouth: "smirk" } : {}),
      opts: { rim: RIM_BLUE, rimW: 3 },
    };
    // finger curl on threes
    const base = ao.keys;
    ao.pose = (l) => {
      const p = R.full(P.sample(base, l));
      const curl = l > 0.7 && Math.floor(l * 8) % 3 === 0;
      return R.over(p, { handShape: { R: curl ? "hold" : "open" } });
    };
    const cam = S.cam(S.lookAt([60 * side, 95, 175], [0, 160, 0], { fov: 36 }));
    S.blurBg(ctx, 6, (b) => { ENV.arena(b, cam, I.t, { hype: 0.4 }); });
    F.grade(ctx, "#000010", 0.3, "multiply");
    S.actor(ctx, cam, ao, lt);
  }, { vignette: 0.6 });

  // ---- smirk ECU looking down ("cê tá mogadin") ----
  G.smirkECU = (t0, t1) => shot(t0, t1, "pré-refrão: mogadin", (ctx, lt, I) => {
    const ao = {
      spec: S.aoGame(), step: 2, at: [0, 0, 0], yaw: 8,
      keys: [[0, R.over(P.idle, { neck: [20, 0, 0], head: [22, -8, -4] })]],
      face: (t) => Object.assign({ lid: 0.6, browAngle: 0.8, gaze: [0, -0.8] }, S.lips(I.t), (!S.lips(I.t).open) ? { mouth: "smirk" } : {}),
      opts: { rim: RIM_BLUE, rimW: 5 },
    };
    const head = S.jointWorld(ao, 0, "head", [0, 4, 6]);
    const end = t1 - t0;
    const push = U.ease("in3", U.clamp((lt - (end - 0.6)) / 0.6));
    const cam = S.cam(S.lookAt([head[0] + 10, head[1] - 75 + push * 40, head[2] + 55 - push * 30], head, { fov: 34 - push * 10, roll: -6 }));
    S.blurBg(ctx, 8, (b) => { ENV.arena(b, cam, I.t, { hype: 0.4 }); });
    S.actor(ctx, cam, ao, lt);
    if (push > 0) F.focusLines(ctx, 960, 480, 380 * (1 - push * 0.5), I.t, { color: `rgba(255,255,255,${0.8 * push})` });
    F.flash(ctx, (push - 0.6) * 2.5);
  }, { vignette: 0.6 });

  // ---- drive past defender ----
  G.drive = (t0, t1, v = 0) => shot(t0, t1, "refrão: arrancada", (ctx, lt, I) => {
    const go = 0.55; // explosion moment
    const dir = v ? -1 : 1;
    const xAt = (t) => dir * (-260 + (t < go ? 0 : 640 * U.ease("in", U.clamp((t - go) / 0.6)) + Math.max(0, t - go - 0.6) * 640));
    const ao = {
      spec: S.aoGame(), step: 2, at: (t) => [xAt(t), 0, 0], yaw: 90 * dir,
      pose: (t) => {
        if (t < go - 0.18) return P.dribblePump(R.over(P.dribbleLow, { head: [-26, 0, 0] }), (t * 2.4) % 1);
        if (t < go) return R.over(P.dunkCrouch, { arm: { R: [-30, 0, 16] }, elbow: { R: 40 }, handShape: { R: "open" } });
        const r = P.run((t - go) * 2.2);
        return R.over(r, { hips: [30, r.hips[1], 0], spine: [16, r.spine[1], 0], arm: { R: [-30, 0, 18] }, elbow: { R: 40 }, handShape: { R: "open" } });
      },
      step: 1,
      face: (t) => ({ lid: 0.75, browAngle: 0.9, gaze: [0, 0.2], mouth: t > go ? "smirk" : "neutral", zone: 0.2 }),
      opts: { rim: RIM_BLUE, rimW: 3 },
      props: (J, view, t) => [S.ball(view, S.dribblePos(J, (t * (t > go ? 3.4 : 2.4)) % 1, "R", t > go ? 70 : 0), t * 12)],
    };
    const def = {
      spec: S.rival(11), step: 2, at: [dir * 40, 0, -70], yaw: -90 * dir,
      keys: [[0, P.defense], [go + 0.15, R.over(P.defense, { hips: [26, 30 * dir, 0] })], [go + 0.45, R.over(P.lunge, { root: { yaw: 70 * dir } }), "out"],
        [go + 1.0, R.over(P.lunge, { root: { yaw: 120 * dir, rot: [0, 0, -35 * dir] } }), "in"], [10, R.over(P.lunge, { root: { yaw: 130 * dir, rot: [0, 0, -50 * dir] } })]],
      face: { lid: 1.2, mouth: "talk", open: 0.5, brow: 0.6 },
    };
    const tx = U.lerp(xAt(Math.max(0, lt - 0.12)), 0, 0.25);
    const cam = S.cam(S.lookAt([tx * 0.6, 95, 430], [tx, 105, 0], { fov: 42, roll: v ? 4 : -4 }));
    ENV.arena(ctx, cam, I.t, { hype: 0.9, flashes: 1 });
    S.actor(ctx, cam, def, lt);
    if (lt > go) {
      for (let k = 3; k >= 1; k--) F.ghost(ctx, (b) => S.actor(b, cam, Object.assign({}, ao, { shadow: false }), lt - k * 0.05), "#3a7bff", 0.22);
    }
    S.actor(ctx, cam, ao, lt);
    const sp = U.clamp((lt - go) / 0.2) * U.clamp(1 - (lt - go - 1.2) / 0.5);
    if (sp > 0) F.speedLines(ctx, 0, I.t, { color: `rgba(255,255,255,${0.55 * sp})`, n: 60 });
  }, { vignette: 0.5 });

  // ---- panther crouch + dunk ----
  G.panther = (t0, t1, v = 0) => shot(t0, t1, "refrão: pantera", (ctx, lt, I) => {
    const ao = {
      spec: S.aoGame(), step: 2, at: [0, 0, 0], yaw: v ? 25 : -20,
      keys: [[0, R.over(P.panther, { head: [-34, 0, 0] })], [t1 - t0, R.over(P.panther, { hips: [46, 0, 0], head: [-38, 6, 0] })]],
      face: (t) => ({ lid: 0.85, browAngle: 1, gaze: [0, 0.6], zone: 0.6 + 0.4 * beatPulse(I.t), mouth: "smirk" }),
      opts: { rim: RIM_BLUE, rimW: 6, wind: [0, 1.2, -2] },
      props: (J, view) => [S.ball(view, S.handPos(J, "R", 9, -9), 0.2)],
    };
    const u = U.ease("inOut", lt / (t1 - t0));
    const cam = S.cam(S.lookAt([v ? -60 : 50, 28, U.lerp(250, 190, u)], [0, 70, 0], { fov: 40, roll: v ? -6 : 6 }));
    ENV.zone(ctx, cam, I.t, { core: "#123070" });
    const c = cam.proj([0, 80, 0]);
    F.glow(ctx, c.x, c.y, 500, "60,120,255", 0.35 + 0.25 * beatPulse(I.t));
    S.actor(ctx, cam, ao, lt);
    const eye = cam.proj(S.jointWorld(ao, lt, "head", EYE_R));
    F.lightning(ctx, [eye, { x: eye.x - 160, y: eye.y - 30 }, { x: eye.x - 420, y: eye.y - 10 }, { x: eye.x - 760, y: eye.y - 60 }], I.t, { width: 10, alpha: 0.9 });
  }, { vignette: 0.55 });

  G.dunk = (t0, t1, tImpact, v = 0) => shot(t0, t1, "refrão: enterrada", (ctx, lt, I) => {
    const ti = tImpact - t0;
    const rise0 = ti - 0.75;
    const path = (t) => {
      const u = U.clamp((t - rise0) / 0.75);
      const z = U.lerp(-820, -1185, U.ease("out", u));
      const y = U.lerp(0, 108, U.ease("out3", u));
      return [0, t < rise0 ? 0 : y * (t > ti + 0.4 ? U.lerp(1, 0.9, U.clamp((t - ti - 0.4) / 0.5)) : 1), t < rise0 ? -820 : z];
    };
    const ao = {
      spec: S.aoGame(), step: 2, at: path, yaw: 180, finish: { },
      keys: [[0, P.dunkCrouch], [rise0, R.over(P.dunkCrouch, { hips: [46, 0, 0], knee: { L: 125, R: 125 } }), "in"], [rise0 + 0.35, P.dunkRise, "out3"], [ti - 0.06, R.over(P.dunkRise, { arm: { R: [-200, 0, 4] }, spine: [-16, 0, 0] }), "inOut"], [ti, P.dunkSlam, "in5"], [ti + 0.35, P.hang, "outBack"], [10, P.hang]],
      face: (t) => ({ lid: 0.9, browAngle: 1, mouth: t > ti - 0.1 ? "shout" : "neutral", open: 0.8, zone: 0.4 }),
      opts: { rim: RIM_BLUE, rimW: 3 },
      props: (J, view, t) => {
        if (t < ti) return [S.ball(view, S.handPos(J, "R", 8, -10), t * 5)];
        return [];
      },
    };
    // ground the airborne pose by the feet at rise0 only (path supplies the height)
    ao.finish = { lift: 0 };
    const sh = lt > ti && lt < ti + 0.4 ? 30 * (1 - (lt - ti) / 0.4) : 0;
    const camBase = v
      ? S.lookAt([180, 60, -900], [0, 280, -1230], { fov: 50, roll: -8 })
      : S.lookAt([-120, 40, -1000 + lt * 20], [0, 270, -1220], { fov: 50, roll: 6 });
    const cam = S.cam(S.shake(camBase, sh, lt));
    const netT = U.clamp((lt - ti) / 0.9);
    ENV.arena(ctx, cam, I.t, { hype: lt > ti ? 1.6 : 0.6, flashes: lt > ti ? 4 : 1, netT: lt > ti ? netT : 0 });
    S.actor(ctx, cam, ao, lt);
    if (lt > ti && lt < ti + 0.6) {
      const q = cam.proj([S.RIM[0], S.RIM[1] - 35 * U.clamp((lt - ti) / 0.3), S.RIM[2]]);
      if (q.d > 0) F.ball(ctx, q.x, q.y, 12 * q.s, lt * 10);
    }
    const rim = cam.proj(S.RIM);
    if (lt > ti - 0.3 && lt < ti + 0.5) F.focusLines(ctx, rim.x, rim.y, 260, I.t, { color: "rgba(255,255,255,0.75)" });
    // impact frames (2 drawings) + flash
    const f = Math.floor((lt - ti) * 24);
    if (f >= 0 && f < 2) F.impact(ctx, f);
    else if (lt > ti) F.flash(ctx, 0.5 - (lt - ti - 0.08) * 2, "200,225,255");
  }, { vignette: 0.45 });

  // ---- lip sync performance ----
  G.sing = (t0, t1, v = 0) => shot(t0, t1, "refrão: canta", (ctx, lt, I) => {
    const bp = beatPulse(I.t, 8);
    const ao = {
      spec: S.aoGame(), step: 2, at: [0, 0, 0], yaw: v ? -16 : 14,
      pose: (l) => {
        const b = beatPulse(t0 + l, 7);
        const point = Math.sin(l * 1.7 + v) > 0.4;
        return R.over(P.idle, { neck: [4 + b * 6, 0, 0], head: [-4 + b * 4, (v ? 10 : -10), 3],
          arm: { R: point ? [-80, -20, 10] : [-20, 0, 12] }, elbow: { R: point ? 20 : 70 }, handShape: { R: point ? "point" : "fist" } });
      },
      face: (t) => Object.assign({ lid: 0.78, browAngle: 0.8, gaze: [0, 0.1] }, S.lips(I.t, 1.1), S.lips(I.t).open ? {} : { mouth: "smirk" }),
      opts: { rim: v ? "rgba(255,120,120,0.9)" : RIM_BLUE, rimW: 4 },
    };
    const cam = S.cam(S.lookAt([v ? -55 : 55, 166 - bp * 2, 130 - lt * 4], [0, 163, 0], { fov: 34, roll: v ? -8 : 8 }));
    S.blurBg(ctx, 7, (b) => {
      ENV.arena(b, cam, I.t, { hype: 1.2, flashes: 3 });
      const col = Math.floor(I.t * 2.392) % 2 ? "70,120,255" : "255,70,90";
      F.glow(b, 400 + 900 * Math.sin(I.t), 120, 900, col, 0.4 * bp + 0.1);
    });
    S.actor(ctx, cam, ao, lt);
  }, { vignette: 0.55 });

  // ---- chain glint + walk away ----
  G.chain = (t0, t1, tTurn, v = 0) => shot(t0, t1, "refrão: cordão", (ctx, lt, I) => {
    const tt = tTurn - t0;
    const ao = {
      spec: S.aoGame(), step: 2, at: (t) => [0, 0, t > tt + 0.4 ? -(t - tt - 0.4) * 100 : 0], yaw: 0,
      pose: (l) => {
        if (l < tt) return R.full(P.sample([[0, P.idle], [0.5, P.chainGrab, "outBackSoft"], [tt, R.over(P.chainGrab, { head: [-10, 20, -8] })]], l));
        const w = R.over(P.slouch, P.walk((l - tt) * 0.9));
        return R.over(w, { root: { yaw: U.lerp(0, 180, U.ease("inOut", U.clamp((l - tt) / 0.5))) } });
      },
      face: (t) => Object.assign({ lid: 0.7, browAngle: 0.6, gaze: [0.3, 0.1] }, S.lips(I.t), S.lips(I.t).open ? {} : { mouth: "smirk" }),
      opts: { rim: "rgba(255,220,150,0.9)", rimW: 3 },
    };
    const zoom = U.ease("inOut", U.clamp((lt - tt + 0.2) / 1.2));
    const chainPt = S.jointWorld(ao, Math.min(lt, tt - 0.01), "chest", [0, 13, 13]);
    const target = U.mix3(chainPt, [0, 120, -120], zoom);
    const cam = S.cam(S.lookAt([v ? -30 : 30, U.lerp(145, 140, zoom), U.lerp(chainPt[2] + 70, 300, zoom)], target, { fov: U.lerp(30, 44, zoom) }));
    ENV.arena(ctx, cam, I.t, { hype: 1, flashes: 3 });
    S.actor(ctx, cam, ao, lt);
    // glint star on the chain
    const g = U.clamp(1 - Math.abs(lt - 0.6) / 0.35);
    if (g > 0 && lt < tt) {
      const p = cam.proj(S.jointWorld(ao, lt, "chest", [3, 11, 13.5]));
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(255,245,200,0.95)";
      const r = 70 * g;
      ctx.beginPath(); ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x + r * 0.12, p.y); ctx.lineTo(p.x, p.y + r); ctx.lineTo(p.x - r * 0.12, p.y); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(p.x - r, p.y); ctx.lineTo(p.x, p.y + r * 0.12); ctx.lineTo(p.x + r, p.y); ctx.lineTo(p.x, p.y - r * 0.12); ctx.closePath(); ctx.fill();
      ctx.restore();
      F.glow(ctx, p.x, p.y, 120 * g, "255,230,160", 0.6);
    }
  }, { vignette: 0.5 });

  // ---- zone: eye ignite ----
  G.eyeIgnite = (t0, t1) => shot(t0, t1, "zona: olho acende", (ctx, lt, I) => {
    const k = U.clamp(lt / (t1 - t0));
    const ao = { spec: S.aoGame(), step: 1, at: [0, 0, 0], keys: [[0, R.over(P.idle, { head: [-2, -4, 0] })]], face: { lid: U.lerp(0.6, 1.0, U.ease("out", k)), zone: k, browAngle: 0.9, gaze: [0, 0.05] }, opts: { rim: RIM_BLUE, rimW: 7 } };
    const eye = S.jointWorld(ao, 0, "head", EYE_R);
    const cam = S.cam(S.lookAt([eye[0] - 4, eye[1], eye[2] + 40 - k * 10], eye, { fov: 22 }));
    ENV.zone(ctx, cam, I.t);
    S.actor(ctx, cam, ao, lt);
    const p = cam.proj(eye);
    F.glow(ctx, p.x, p.y, 200 + 500 * k, "90,160,255", 0.4 + 0.5 * k);
    F.lightning(ctx, [p, { x: p.x - 300, y: p.y - 40 }, { x: p.x - 700, y: p.y + 20 }, { x: p.x - 1200, y: p.y - 70 }], I.t, { width: 22, alpha: k });
    if (lt > t1 - t0 - 2 / 24) F.impact(ctx, 0);
  }, { vignette: 0.6 });

  // ---- zone dribble with afterimages, frozen defenders ----
  G.zoneDribble = (t0, t1, v = 0) => shot(t0, t1, "zona: drible", (ctx, lt, I) => {
    const sgn = v ? -1 : 1;
    const zAt = (t) => -500 + 170 * t;
    const xAt = (t) => sgn * 70 * Math.sin(t * 2.6);
    const ao = {
      spec: S.aoGame(), step: 1, at: (t) => [xAt(t), 0, zAt(t)],
      pose: (l) => {
        const c = ((l * 1.3) % 2 + 2) % 2;
        return R.full(P.sample(S.crossKeys, c));
      },
      face: (t) => ({ lid: 1.0, zone: 1, browAngle: 0.9, gaze: [0, 0.2], mouth: "neutral" }),
      opts: { rim: RIM_BLUE, rimW: 5, wind: [0, 0.6, -2.5] },
      props: (J, view, l) => {
        const c = ((l * 1.3) % 2 + 2) % 2;
        return [S.ball(view, S.dribblePos(J, (l * 2.6) % 1, c > 0.62 && c < 1.27 ? "L" : "R"), l * 9, { rim: RIM_BLUE })];
      },
    };
    const cam = S.cam(S.lookAt([sgn * 60, 70, zAt(lt) + 320], [xAt(lt) * 0.5, 110, zAt(lt)], { fov: 44, roll: sgn * 5 }));
    ENV.zone(ctx, cam, I.t);
    // frozen defenders as dark silhouettes
    [[-150, -250], [140, -60], [-110, 180]].forEach(([x, z], i) => {
      const d = { spec: S.rival(4 + i), step: 2, at: [x * sgn, 0, z], yaw: 180 + i * 20, keys: [[0, i % 2 ? P.defense : P.lunge]], shadow: false };
      F.silhouette(ctx, (b) => S.actor(b, cam, d, 0), "#030510", { rim: "rgba(80,140,255,0.8)" });
    });
    for (let k = 4; k >= 1; k--) F.ghost(ctx, (b) => S.actor(b, cam, Object.assign({}, ao, { shadow: false }), lt - k * 0.07), "#2f6dff", 0.18);
    S.actor(ctx, cam, ao, lt);
    // lightning trail from the eye through recent positions
    const pts = [];
    for (let k = 0; k < 6; k++) pts.push(cam.proj(S.jointWorld(ao, Math.max(0, lt - k * 0.06), "head", EYE_R)));
    F.lightning(ctx, pts.filter((p) => p.d > 0), I.t, { width: 9, jag: 10 });
  }, { vignette: 0.6 });

  // ---- zone formless shot ----
  G.zoneFormless = (t0, t1, v = 0) => shot(t0, t1, "zona: arremesso sem forma", (ctx, lt, I) => {
    const rel = 1.3;
    const ao = {
      spec: S.aoGame(), step: 2, at: [0, 0, 0], yaw: v ? -60 : 60,
      keys: [[0, R.over(P.dribbleLow, { head: [-20, 0, 0] })], [0.6, P.dunkCrouch, "in"], [0.95, R.over(P.formless, { root: { lift: 80 } }), "out3"],
        [rel, R.over(P.formless, { root: { lift: 105 }, arm: { R: [-150, 50, 80] }, hand: { R: [70, 0, 0] } }), "inOut"], [2.2, R.over(P.formless, { root: { lift: 60 } }), "in"], [3.5, R.over(P.formless, { root: { lift: 0, rot: [-10, 0, 6] } }), "out"]],
      face: (t) => ({ lid: 1, zone: 1, browAngle: 0.8, gaze: [0.6, 0.5], mouth: t > rel ? "smirk" : "neutral" }),
      opts: { rim: RIM_BLUE, rimW: 5 },
      props: (J, view, t) => (t < rel ? [S.ball(view, S.handPos(J, "R"), t * 7, { rim: RIM_BLUE })] : []),
    };
    const a = (v ? -30 : 30) + lt * (v ? -18 : 18);
    const cam = S.cam(S.lookAt([Math.sin(a * U.D) * 360, 60, Math.cos(a * U.D) * 360], [0, 170, 0], { fov: 44, roll: v ? 6 : -6 }));
    ENV.zone(ctx, cam, I.t);
    S.actor(ctx, cam, ao, lt);
    if (lt > rel) {
      const from = S.jointWorld(ao, rel, "handR", [0, -9, 9]);
      const trail = [];
      for (let k = 0; k < 14; k++) {
        const u = Math.max(0, (lt - rel) - k * 0.03) / 1.4;
        const p = U.add(from, [U.lerp(0, -900, u) * (v ? -1 : 1), Math.sin(Math.PI * Math.min(u, 1)) * 500 + u * 100, -u * 1400]);
        trail.push(cam.proj(p));
      }
      const vis = trail.filter((p) => p.d > 0);
      if (vis.length > 1) {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        F.ballTrail(ctx, vis.slice().reverse(), 14 * vis[0].s, "rgba(120,180,255,0.55)");
        ctx.restore();
        F.ball(ctx, vis[0].x, vis[0].y, 12 * vis[0].s, lt * 14, { rim: RIM_BLUE });
      }
    }
  }, { vignette: 0.6 });

  // ---- micro cuts on "sem forma, sem teto, sem lei, sem manual, sem aviso" ----
  G.microCuts = (cuts, v = 0) => {
    for (let i = 0; i < cuts.length - 1; i++) {
      const [ta, kind] = cuts[i];
      const tb = cuts[i + 1][0];
      shot(ta, tb, "zona: corte " + kind, (ctx, lt, I) => {
        const ao = {
          spec: S.aoGame(), step: 1, at: [0, 0, 0], yaw: (i % 2 ? -1 : 1) * 25,
          pose: (l) => P.dribblePump(R.over(P.dribbleLow, { head: [-24, 0, 0] }), (l * 2.6) % 1),
          face: { lid: 1, zone: 1, browAngle: 0.9, gaze: [0, 0.2], mouth: kind === "smirk" ? "smirk" : "neutral" },
          opts: { rim: RIM_BLUE, rimW: 6 },
          props: (J, view, l) => [S.ball(view, S.dribblePos(J, (l * 2.6) % 1), l * 9, { rim: RIM_BLUE })],
        };
        const tgt = {
          eye: ["head", EYE_R, 30, 20], smirk: ["head", [0, -1, 9], 40, 22], hand: ["handR", [0, -8, 4], 70, 28],
          shoe: ["footL", [0, -4, 6], 70, 36], number: ["spine", [0, 10, 14], 90, 30], ball: ["handR", [0, -30, 8], 120, 36],
        }[kind];
        const p = S.jointWorld(ao, lt, tgt[0], tgt[1]);
        const ang = (i * 47 + (v ? 20 : 0)) * U.D;
        const cam = S.cam(S.lookAt([p[0] + Math.sin(ang) * tgt[2], p[1] + (kind === "shoe" ? 8 : 6), p[2] + Math.cos(ang) * tgt[2] * 0.9 + 10], p, { fov: tgt[3], roll: (i % 2 ? 10 : -10) }));
        ENV.zone(ctx, cam, I.t);
        S.actor(ctx, cam, ao, lt);
        F.focusLines(ctx, 960, 540, 330, I.t, { color: "rgba(200,225,255,0.55)" });
        if (i % 3 === 1) F.filterFrame(ctx, "invert(1) hue-rotate(180deg)");
        F.flash(ctx, 0.45 - lt * 5, "180,210,255");
      }, { vignette: 0.6 });
    }
  };

  // ---- triplet feet ("speed no flow, triplet no pé") ----
  G.feet = (t0, t1, v = 0) => shot(t0, t1, "zona: passos em tercina", (ctx, lt, I) => {
    const sgn = v ? -1 : 1;
    const speed = 420;
    const xAt = (t) => sgn * (-400 + speed * t);
    const ao = {
      spec: S.aoGame(), step: 1, at: (t) => [xAt(t), 0, 0], yaw: 90 * sgn,
      pose: (t) => { const r = P.run(t * 2.1); return R.over(r, { arm: { R: [-30, 0, 18] }, elbow: { R: 40 }, handShape: { R: "open" } }); },
      face: { lid: 1, zone: 1, browAngle: 0.9, mouth: "neutral" },
      opts: { rim: RIM_BLUE, rimW: 4, wind: [0, 0.5, -3] },
      props: (J, view, t) => [S.ball(view, S.dribblePos(J, (t * 4.2) % 1, "R", 60), t * 14, { rim: RIM_BLUE })],
    };
    const pull = U.ease("inOut3", U.clamp((lt - 1.6) / 1.4));
    const cam = S.cam(S.lookAt([xAt(lt) + sgn * 30, U.lerp(18, 110, pull), U.lerp(120, 480, pull)], [xAt(lt) + sgn * 30, U.lerp(15, 100, pull), 0], { fov: U.lerp(40, 44, pull) }));
    ENV.zone(ctx, cam, I.t);
    // footprints that flash on triplet subdivisions
    const trip = 60 / A.BEATS.tempo / 3;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < 14; k++) {
      const tk = Math.floor(lt / trip) * trip - k * trip;
      if (tk < 0) break;
      const fp = cam.proj([xAt(tk), 0.5, (k % 2 ? 12 : -12)]);
      if (fp.d <= 0) continue;
      const a = Math.max(0, 1 - (lt - tk) / 0.6);
      ctx.fillStyle = `rgba(120,180,255,${0.7 * a})`;
      ctx.beginPath(); ctx.ellipse(fp.x, fp.y, 22 * fp.s, 7 * fp.s, 0, 0, U.TAU); ctx.fill();
    }
    ctx.restore();
    for (let k = 3; k >= 1; k--) F.ghost(ctx, (b) => S.actor(b, cam, Object.assign({}, ao, { shadow: false }), lt - k * 0.05), "#2f6dff", 0.2);
    S.actor(ctx, cam, ao, lt);
    F.speedLines(ctx, 0, I.t, { color: `rgba(180,210,255,${0.25 + 0.3 * pull})`, n: 50 });
  }, { vignette: 0.55 });

  // ============ PRE-CHORUS 1 / CHORUS 1 / ZONE 1 ============
  G.standHero(54.98, 58.4, 0);
  G.orbitDribble(58.4, 62.0, -30, 110);
  G.beckon(62.0, 64.3, 1);
  G.smirkECU(64.3, 67.55);
  G.drive(67.55, 71.3, 0);
  G.panther(71.3, 72.55, 0);
  G.dunk(72.55, 74.55, 73.96, 0);
  G.sing(74.55, 78.1, 0);
  G.chain(78.1, 81.5, 80.1, 0);
  G.eyeIgnite(81.5, 82.25);
  G.zoneDribble(82.25, 85.95, 0);
  G.zoneFormless(85.95, 89.3, 0);
  G.microCuts([[89.3, "eye"], [89.9, "hand"], [90.4, "shoe"], [90.88, "number"], [91.14, "smirk"], [91.64, "ball"], [92.6, "end"]], 0);
  G.feet(92.6, 96.3, 0);

  // ============ PRE-CHORUS 2 / CHORUS 2 / ZONE 2 ============
  G.standHero(123.3, 127.9, 1);
  G.orbitDribble(127.9, 131.6, 200, 330);
  G.beckon(131.6, 133.88, -1);
  G.smirkECU(133.88, 135.75);
  G.drive(135.75, 139.9, 1);
  G.panther(139.9, 141.2, 1);
  G.dunk(141.2, 143.0, 142.5, 1);
  G.sing(143.0, 146.75, 1);
  G.chain(146.75, 150.45, 148.9, 1);
  G.eyeIgnite(150.45, 151.04);
  G.zoneDribble(151.04, 154.45, 1);
  G.zoneFormless(154.45, 157.9, 1);
  G.microCuts([[157.9, "smirk"], [158.46, "eye"], [158.98, "hand"], [159.46, "number"], [159.82, "shoe"], [160.24, "ball"], [160.98, "end"]], 1);
  G.feet(160.98, 165.4, 1);
})(window.A);
