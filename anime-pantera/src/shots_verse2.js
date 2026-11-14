// Shots 1:36 – 2:04 (verse 2), 2:45 – 3:14 (bridge), final chorus and outro.
(function (A) {
  const U = A.U, R = A.R, P = A.P, F = A.F, ENV = A.ENV, S = A.S, G = A.G;
  const shot = A.shot;
  const RIM_BLUE = "rgba(120,180,255,0.95)";
  const RIM_GOLD = "rgba(255,210,120,0.95)";
  const EYE_R = [-3.4 * 1.1, 5.7 * 1.1, 8.15 * 1.1];
  const walk = (rate, lazy = 1) => (l) => R.over(P.slouch, P.walk(l * rate, { lazy }));
  const star = (ctx, x, y, r, a = 1) => {
    if (r <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = `rgba(255,245,200,${a})`;
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.12, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.12, y); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x, y + r * 0.12); ctx.lineTo(x + r, y); ctx.lineTo(x, y - r * 0.12); ctx.closePath(); ctx.fill();
    ctx.restore();
    F.glow(ctx, x, y, r * 1.8, "255,230,160", 0.5 * a);
  };

  // ================= VERSE 2 =================
  shot(96.3, 99.7, "V2 entrada com flashes", (ctx, lt, I) => {
    const ao = { spec: S.aoGame(), step: 2, at: (t) => [0, 0, -700 + 85 * t], yaw: 0, pose: walk(0.7), face: { lid: 0.62, browAngle: 0.5, gaze: [0, 0] }, opts: { rim: "rgba(255,255,255,0.9)", rimW: 3 } };
    const z = -700 + 85 * lt;
    const cam = S.cam(S.lookAt([30, 60, z + 380 - lt * 20], [0, 150, z], { fov: 40 }));
    ENV.arena(ctx, cam, I.t, { hype: 1.2, flashes: 6 });
    F.grade(ctx, "#05060c", 0.35, "multiply");
    S.actor(ctx, cam, ao, lt);
    // camera flashes in front of the lens
    for (let k = 0; k < 3; k++) {
      const q = Math.floor(I.t * 6 + k * 13);
      if (U.hash(q * 1.7) > 0.7) F.glow(ctx, U.hash(q * 2.1) * 1920, 700 + U.hash(q * 3.3) * 380, 220, "255,255,255", 0.7);
    }
  }, { vignette: 0.6 });
  shot(99.7, 103.1, "V2 MCU andando", (ctx, lt, I) => {
    const ao = { spec: S.aoGame(), step: 2, at: (t) => [0, 0, -400 + 85 * t], yaw: 0, pose: walk(0.7), face: (t) => Object.assign({ lid: 0.66, browAngle: 0.6, gaze: [0.3, 0.1] }, S.lips(I.t), S.lips(I.t).open ? {} : { mouth: "smirk" }), opts: { rim: "rgba(255,255,255,0.9)", rimW: 4 } };
    const z = -400 + 85 * lt;
    const cam = S.cam(S.lookAt([-40, 168, z + 120], [0, 165, z], { fov: 34 }));
    S.blurBg(ctx, 7, (b) => ENV.arena(b, cam, I.t, { hype: 1.2, flashes: 6 }));
    S.actor(ctx, cam, ao, lt);
  }, { vignette: 0.55 });
  shot(103.1, 104.9, "V2 ostentação no pulso", (ctx, lt, I) => {
    const spec = Object.assign(S.aoGame(), { wristband: "#d9a93c" });
    const ao = { spec, step: 2, at: [0, 0, 0], yaw: 30, keys: [[0, R.over(P.idle, { arm: { L: [-50, 0, 20] }, elbow: { L: [100, 60] }, head: [10, 20, 0] })], [1.8, R.over(P.idle, { arm: { L: [-56, 0, 22] }, elbow: { L: [104, 70] }, head: [14, 24, 0] })]], face: { lid: 0.6 }, opts: { rim: RIM_GOLD, rimW: 3 } };
    const w = S.jointWorld(ao, lt, "handL", [0, 3, 0]);
    const cam = S.cam(S.lookAt([w[0] + 50, w[1] + 10, w[2] + 85], U.add(w, [0, -8, 0]), { fov: 30, roll: -10 }));
    S.blurBg(ctx, 8, (b) => ENV.arena(b, cam, I.t, { hype: 1, flashes: 4 }));
    S.actor(ctx, cam, ao, lt);
    const g = U.clamp(1 - Math.abs(I.t - 103.9) / 0.35);
    const p = cam.proj(w);
    star(ctx, p.x + 20, p.y - 10, 120 * g, g);
  }, { vignette: 0.55 });
  shot(104.9, 106.6, "V2 cordão no pescoço", (ctx, lt, I) => {
    const ao = { spec: S.aoGame(), step: 2, at: [0, 0, 0], yaw: -12, keys: [[0, R.over(P.idle, { head: [-14, -16, 0] })], [1.7, R.over(P.idle, { head: [-16, -22, 0] })]], face: { lid: 0.7, mouth: "smirk" }, opts: { rim: RIM_GOLD, rimW: 3 } };
    const c = S.jointWorld(ao, lt, "chest", [0, 12, 13]);
    const cam = S.cam(S.lookAt([c[0] - 20, c[1] + 8, c[2] + 80 - lt * 10], [c[0], c[1] + 6, c[2]], { fov: 30, roll: 6 }));
    S.blurBg(ctx, 8, (b) => ENV.arena(b, cam, I.t, { hype: 1, flashes: 4 }));
    S.actor(ctx, cam, ao, lt);
    const g = U.clamp(1 - Math.abs(I.t - 105.3) / 0.35);
    const p = cam.proj(S.jointWorld(ao, lt, "chest", [-3, 11, 13.6]));
    star(ctx, p.x, p.y, 140 * g, g);
  }, { vignette: 0.55 });
  shot(106.6, 109.1, "V2 banco relaxado", (ctx, lt, I) => {
    const ao = { spec: S.aoGame(), step: 2, at: [0, 0, 0], yaw: 10,
      keys: [[0, R.over(P.bench, { arm: { L: [10, 0, 70], R: [10, 0, 70] }, elbow: { L: 30, R: 30 }, head: [4, -10, 0] })], [2.5, R.over(P.bench, { arm: { L: [10, 0, 74], R: [10, 0, 74] }, elbow: { L: 30, R: 30 }, head: [2, -16, 4] })]],
      face: (t) => Object.assign({ lid: 0.6, browAngle: 0.5, gaze: [0, 0.3] }, S.lips(I.t), S.lips(I.t).open ? {} : { mouth: "smirk" }) };
    const cam = S.cam(S.lookAt([60, 125, 250 - lt * 10], [0, 105, 0], { fov: 40 }));
    ENV.arena(ctx, cam, I.t, { hype: 0.7, flashes: 2 });
    ENV.fillPoly(ctx, cam.poly([[-140, 44, -26], [140, 44, -26], [140, 44, 18], [-140, 44, 18]]), "#3b2a24");
    ENV.fillPoly(ctx, cam.poly([[-140, 0, 18], [140, 0, 18], [140, 44, 18], [-140, 44, 18]]), "#241914");
    S.actor(ctx, cam, Object.assign(ao, { shadow: false }), lt);
  }, { vignette: 0.55 });
  shot(109.1, 110.85, "V2 Kise copia", (ctx, lt, I) => {
    const cam = S.cam(S.lookAt([0, 110, 520], [0, 110, 0], { fov: 40 }));
    ENV.stage(ctx, cam, I.t, { spots: [[-140, 0], [140, 0]], spotColor: "220,210,160" });
    const loop = (d) => (l) => R.full(P.sample(S.crossKeys, (((l - d) * 1.2) % 2 + 2) % 2));
    const k = { spec: S.ao(), step: 2, at: [150, 0, -20], yaw: -20, pose: (l) => P.mirror(loop(0.25)(l)), shadow: false };
    const glitch = U.clamp((lt - 0.85) / 0.6);
    if (glitch < 1) {
      const b = F.buffer("kise");
      F.silhouette(b, (bb) => S.actor(bb, cam, k, lt), "#0a0a08", { rim: "#f2cd3c" });
      ctx.save();
      for (let i = 0; i < 18; i++) {
        const y0 = i * 60, off = glitch > 0 ? (U.hash2(i, Math.floor(I.t * 24)) - 0.5) * 220 * glitch : 0;
        ctx.globalAlpha = 1 - glitch;
        ctx.drawImage(b.canvas, 0, y0, 1920, 60, off, y0, 1920, 60);
      }
      ctx.restore();
    }
    const ao = { spec: S.ao(), step: 2, at: [-150, 0, 0], yaw: 20, pose: loop(0), face: { lid: 0.7, mouth: "smirk", browAngle: 0.6 }, opts: { rim: RIM_BLUE, rimW: 3 },
      props: (J, view, l) => { const c = ((l * 1.2) % 2 + 2) % 2; return [S.ball(view, S.dribblePos(J, (l * 2.4) % 1, c > 0.62 && c < 1.27 ? "L" : "R"), l * 9)]; } };
    S.actor(ctx, cam, ao, lt);
  }, { vignette: 0.6 });
  shot(110.85, 112.84, "V2 Midorima treme", (ctx, lt, I) => {
    const tr = U.clamp((I.t - 111.9) / 0.3);
    const cam = S.cam(S.shake(S.lookAt([60, 110, -260], [-180, 190, -700], { fov: 46 }), tr * 16, lt));
    ENV.stage(ctx, cam, I.t, { spots: [[-200, -700]], spotColor: "150,230,180" });
    const m = { spec: S.ao(), step: 2, at: [-200 + (tr ? (U.hash(Math.floor(I.t * 24)) - 0.5) * 12 : 0), 0, -700], yaw: 160, keys: [[0, P.shootSet], [0.5, P.shootRelease, "out3"], [3, P.shootRelease]], shadow: false };
    F.silhouette(ctx, (b) => S.actor(b, cam, m, lt), "#050a07", { rim: "#53c27e" });
    if (lt > 0.5) {
      const from = S.jointWorld(m, 0.5, "handR", [0, -9, 9]);
      const pts = [];
      for (let k = 0; k < 24; k++) {
        const u = Math.max(0, lt - 0.5 - k * 0.04) / 1.4;
        const p = U.add(from, [u * 500, Math.sin(Math.PI * Math.min(u, 1)) * 900 - (tr > 0 ? Math.pow(Math.max(0, u - 0.55), 2) * 1600 : 0), u * 900]);
        pts.push(cam.proj(p));
      }
      const vis = pts.filter((p) => p.d > 0);
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      if (vis.length > 1) F.ballTrail(ctx, vis.slice().reverse(), 12 * vis[0].s, "rgba(120,240,160,0.5)");
      ctx.restore();
      if (vis.length) F.ball(ctx, vis[0].x, vis[0].y, 12 * vis[0].s, lt * 8);
    }
  }, { vignette: 0.6 });
  shot(112.84, 116.06, "V2 ouro não é latão", (ctx, lt, I) => {
    const cam = S.cam(S.lookAt([0, 120, 600 - lt * 50], [0, 130, 0], { fov: 40 }));
    ENV.stage(ctx, cam, I.t, { spots: [[0, 0]], spotColor: "255,210,130" });
    const fade = U.clamp((I.t - 114.3) / 0.9);
    S.drawGom(ctx, cam, lt, I.t, 0, { skip: (i) => i === 2, alpha: () => 1 - fade, dx: (i) => (i < 2 ? -1 : 1) * fade * 120 });
    const ao = { spec: S.ao(), step: 2, at: [0, 0, 60], keys: [[0, R.over(P.idle, { head: [-8, 0, 0] })], [1.5, R.over(P.idle, { head: [-8, 0, 0] })], [2.0, R.over(P.idle, { head: [-4, -40, 6] }), "outBackSoft"], [3.2, R.over(P.idle, { head: [-4, -42, 6] })]],
      drag: { head: 0.06 }, face: (t) => Object.assign({ lid: 0.6, browAngle: 0.4, gaze: [-0.6, 0] }, S.lips(I.t)), opts: { rim: RIM_GOLD, rimW: 5 } };
    S.actor(ctx, cam, ao, lt);
    ENV.motes(ctx, I.t, 0.6, "rgba(255,215,130,0.85)", 80);
    F.grade(ctx, "#ffb340", 0.25, "soft-light");
  }, { vignette: 0.6 });
  shot(116.06, 119.52, "V2 arrogância (bocejo)", (ctx, lt, I) => {
    const ao = { spec: S.aoGame(), step: 2, at: [0, 0, 0], yaw: 20,
      keys: [[0, P.slouch], [0.4, P.yawn, "out"], [1.6, P.yawn], [2.0, P.scratch, "inOut"], [3.46, R.over(P.scratch, { head: [12, 16, -6] })]],
      drag: { head: 0.08, arm: 0.06 },
      face: (t) => (t > 0.3 && t < 1.7 ? { lid: 0.1, mouth: "shout", open: 0.9, round: 0.7, brow: 0.3 } : { lid: 0.5, mouth: "frown", gaze: [0.4, -0.2] }) };
    const cam = S.cam(S.lookAt([90, 150, 260], [0, 140, 0], { fov: 36 }));
    S.blurBg(ctx, 4, (b) => ENV.arena(b, cam, I.t, { hype: 0, scoreboard: false }));
    F.grade(ctx, "#0b0d18", 0.3, "multiply");
    S.actor(ctx, cam, ao, lt);
  }, { vignette: 0.5 });
  shot(119.52, 123.3, "V2 eu não treino mais (terraço)", (ctx, lt, I) => {
    A.CFG.light = [0.6, -0.6];
    const ao = { spec: S.ao(), step: 3, at: [0, 0, 0], keys: [[0, R.over(P.lieBack, { head: [16, -24, 0] })]], face: { lid: 0 } };
    const a = (20 + lt * 8) * U.D;
    const cam = S.cam(S.lookAt([Math.sin(a) * 380, 150 + lt * 10, Math.cos(a) * 380], [0, 110, -30], { fov: 46 }));
    ENV.rooftop(ctx, cam, I.t, { top: "#2c3a7a", mid: "#d77d58", bot: "#ffd2a0" });
    S.actor(ctx, cam, ao, lt);
    F.grade(ctx, "#ff8a50", 0.3, "soft-light");
    F.flash(ctx, (lt - 3.3) * 2, "0,0,0");
  }, { vignette: 0.45 });

  // ================= BRIDGE =================
  const frozen = { spec: S.aoGame(), step: 1, at: [0, 0, 0], yaw: 30,
    keys: [[0, R.over(P.formless, { root: { lift: 90 }, arm: { R: [-150, 50, 80] }, hand: { R: [70, 0, 0] } })]],
    face: { lid: 0.95, zone: 0.8, browAngle: 0.8, gaze: [0.6, 0.5] }, opts: { rim: RIM_BLUE, rimW: 5 },
    props: (J, view) => [S.ball(view, U.add(S.handPos(J, "R"), [0, 26, 0]), 0.8, { rim: RIM_BLUE })] };
  const frozenMotes = (ctx, cam) => {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 140; i++) {
      const p = cam.proj([(U.hash(i) - 0.5) * 900, U.hash(i * 2.2) * 400, (U.hash(i * 3.3) - 0.5) * 900]);
      if (p.d <= 0) continue;
      ctx.fillStyle = `rgba(170,210,255,${0.4 + 0.5 * U.hash(i * 5)})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, 1.6 * p.s), 0, U.TAU); ctx.fill();
    }
    ctx.restore();
  };
  shot(165.4, 172.4, "Ponte: tempo congelado", (ctx, lt, I) => {
    const a = (-40 + lt * 10) * U.D;
    const cam = S.cam(S.lookAt([Math.sin(a) * 380, 120 + lt * 6, Math.cos(a) * 380], [0, 190, 0], { fov: 40 }));
    ENV.zone(ctx, cam, I.t, { frozen: true, core: "#0d1f48" });
    frozenMotes(ctx, cam);
    S.actor(ctx, cam, frozen, 0);
    F.filterFrame(ctx, "saturate(0.55)");
    F.flash(ctx, 1 - lt / 0.6, "0,0,0");
  }, { vignette: 0.6, letterbox: 1 });
  const cuts = [172.4, 173.42, 174.18, 174.92, 175.42];
  const angs = [[150, 40, 30], [-110, 300, 40], [20, 10, 36], [-170, 160, 46]];
  for (let i = 0; i < 4; i++) {
    shot(cuts[i], cuts[i + 1], "Ponte: sem " + ["forma", "chão", "lei", "par"][i], (ctx, lt, I) => {
      const [ad, h, fov] = angs[i];
      const a = (ad + lt * 4) * U.D;
      const cam = S.cam(S.lookAt([Math.sin(a) * 340, h, Math.cos(a) * 340], [0, 180, 0], { fov, roll: i % 2 ? 12 : -12 }));
      ENV.zone(ctx, cam, I.t, { frozen: true, core: "#0d1f48" });
      frozenMotes(ctx, cam);
      S.actor(ctx, cam, frozen, 0);
      F.filterFrame(ctx, i % 2 ? "saturate(0.3) contrast(1.3)" : "saturate(0.6)");
      F.flash(ctx, 0.7 - lt * 6, "200,225,255");
    }, { vignette: 0.6, letterbox: 1 });
  }
  shot(175.42, 177.74, "Ponte: o relógio para", (ctx, lt, I) => {
    ctx.fillStyle = "#03050c"; ctx.fillRect(0, 0, 1920, 1080);
    const stop = I.t >= 177.1;
    const tt = stop ? 177.1 : I.t;
    const cs = Math.max(0, Math.floor((177.1 - tt) * 100 * 3.1) % 1000);
    const txt = stop ? "0:00.0" : "0:0" + Math.floor(cs / 100) + "." + (Math.floor(cs / 10) % 10);
    F.title(ctx, txt, stop ? "ZONA" : "", I.t, { size: 260, scale: 1 + lt * 0.05, color: stop ? "#ffffff" : "#ff5a48", glow: true, shake: stop ? 0 : 4 });
    if (stop) {
      const k = U.clamp((I.t - 177.1) / 0.5);
      F.lightning(ctx, [{ x: 0, y: 380 }, { x: 600, y: 520 }, { x: 1100, y: 470 }, { x: 1920, y: 640 }], 177.1, { width: 12, alpha: 1 - k * 0.5 });
      F.flash(ctx, 0.8 - k * 1.6, "200,225,255");
    }
  }, { vignette: 0.5, letterbox: 1 });
  shot(177.74, 185.78, "Ponte: só eu acesso", (ctx, lt, I) => {
    const z = -300 + lt * 45;
    const cam = S.cam(S.lookAt([0, 130 - lt * 4, z + 430], [0, 140, z - 200], { fov: 40 }));
    ENV.stage(ctx, cam, I.t, { spots: [[0, z]], spotColor: "170,200,255" });
    const sink = U.clamp((lt - 1) / 5);
    ctx.save();
    S.GOM.forEach((g, i) => {
      if (i === 2) return;
      const cfg = { spec: S.ao(), step: 2, at: [g.x * 1.3, -sink * 220, -700 + g.z], yaw: g.yaw, keys: [[0, g.pose]], shadow: false };
      const v = cam.charView(cfg.at); v.k = g.k; cfg.view = v;
      F.silhouette(ctx, (b) => S.actor(b, cam, cfg, lt), "#05060b", { rim: g.rim, alpha: 1 - sink * 0.85 });
    });
    ctx.restore();
    const ao = { spec: S.ao(), step: 2, at: [0, 0, z], yaw: 0, pose: walk(0.55, 0.6), face: (t) => Object.assign({ lid: 0.7, browAngle: 0.7, zone: 0.3 }, S.lips(I.t)), opts: { rim: RIM_BLUE, rimW: 4 } };
    S.actor(ctx, cam, ao, lt);
  }, { vignette: 0.65, letterbox: 1 });
  shot(185.78, 192.5, "Ponte: não existe", (ctx, lt, I) => {
    const open = U.clamp((I.t - 190.0) / 0.25);
    const ao = { spec: S.aoGame(), step: 2, at: [0, 0, 0], yaw: 4, keys: [[0, R.over(P.idle, { head: [6, -4, 0] })], [4.2, R.over(P.idle, { head: [2, -4, 0] })], [4.45, R.over(P.idle, { head: [-6, -2, 0] }), "outBack"], [7, R.over(P.idle, { head: [-6, -2, 0] })]],
      face: (t) => Object.assign({ lid: U.lerp(0.45, 1.15, open), browAngle: U.lerp(0.3, 1, open), zone: open, gaze: [0, 0.05] }, S.lips(I.t)), opts: { rim: RIM_BLUE, rimW: 6 } };
    const head = S.jointWorld(ao, lt, "head", [0, 4, 8]);
    const push = U.ease("inOut", lt / 6.7);
    const cam = S.cam(S.lookAt([head[0] + 6, head[1] + 2, head[2] + U.lerp(90, 50, push)], head, { fov: 28 }));
    ENV.zone(ctx, cam, I.t, { core: "#0a1838" });
    S.actor(ctx, cam, ao, lt);
    if (open > 0) {
      const p = cam.proj(S.jointWorld(ao, lt, "head", EYE_R));
      F.glow(ctx, p.x, p.y, 300 + 600 * open, "90,160,255", 0.6 * open);
      F.lightning(ctx, [p, { x: p.x - 300, y: p.y - 60 }, { x: p.x - 800, y: p.y }, { x: p.x - 1400, y: p.y - 100 }], I.t, { width: 24, alpha: open });
    }
    F.flash(ctx, (I.t - 191.8) / 0.6);
  }, { vignette: 0.6, letterbox: 1 });
  shot(192.5, 194.45, "Ponte: silêncio", (ctx, lt, I) => {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 1920, 1080);
    const k = U.ease("in3", lt / 1.95);
    const pts = [{ x: 960, y: 540 }];
    for (let i = 1; i < 6; i++) pts.push({ x: 960 + i * 200 * k * (i % 2 ? 1 : 1.2), y: 540 + (U.hash(i) - 0.5) * 300 * k });
    F.lightning(ctx, pts, 192.5, { width: 6 + 14 * k, alpha: k });
    const pts2 = pts.map((p) => ({ x: 1920 - p.x, y: 1080 - p.y }));
    F.lightning(ctx, pts2, 192.6, { width: 6 + 14 * k, alpha: k });
    F.flash(ctx, (lt - 1.85) * 10, "220,235,255");
  }, { vignette: 0 });

  // ================= FINAL CHORUS =================
  G.dunk(194.45, 198.1, 195.43, 1);
  G.sing(198.1, 201.4, 0);
  G.drive(201.4, 205.0, 0);
  G.chain(205.0, 209.5, 207.6, 1);

  // ================= OUTRO =================
  shot(209.5, 215.5, "Final: vai embora na chuva", (ctx, lt, I) => {
    const ao = { spec: S.ao(), step: 2, at: (t) => [-20, 0, -150 - 80 * t], yaw: 180, pose: walk(0.62), face: { lid: 0.6 }, opts: { rim: "rgba(255,196,130,0.9)", rimW: 3 } };
    const cam = S.cam(S.lookAt([60, 70, 330], [-20, 150, -300], { fov: 44 }));
    ENV.street(ctx, cam, I.t, { flicker: S.flick(I.t) * U.lerp(1, 0.35, lt / 6) });
    S.actor(ctx, cam, ao, lt);
    const b = cam.proj([90, 12, 120]);
    if (b.d > 0) { F.shadow(ctx, b.x, b.y + 11 * b.s, 16 * b.s, 4 * b.s, 0.5); F.ball(ctx, b.x, b.y, 12 * b.s, 0.2); }
    ENV.rain(ctx, cam, I.t, 1);
    F.grade(ctx, "#000000", lt / 6 * 0.6, "multiply");
  }, { vignette: 0.6 });
  shot(215.5, 220.0, "Final: a bola fica", (ctx, lt, I) => {
    const u = U.ease("out3", U.clamp(lt / 3.5));
    const bx = U.lerp(120, 10, u), bz = U.lerp(-200, 40, u);
    const cam = S.cam(S.lookAt([20, 22, 140], [0, 20, -100], { fov: 40 }));
    ENV.street(ctx, cam, I.t, { flicker: 0.35 });
    const b = cam.proj([bx, 12, bz]);
    if (b.d > 0) {
      ctx.save(); ctx.globalAlpha = 0.35; F.ball(ctx, b.x, b.y + 26 * b.s, 12 * b.s, -u * 9); ctx.restore();
      F.shadow(ctx, b.x, b.y + 11 * b.s, 16 * b.s, 4 * b.s, 0.5);
      F.ball(ctx, b.x, b.y, 12 * b.s, u * 9);
    }
    ENV.rain(ctx, cam, I.t, 0.6);
    F.grade(ctx, "#000000", 0.6, "multiply");
    F.flash(ctx, (lt - 3.6) * 1.2, "0,0,0");
  }, { vignette: 0.7 });
  shot(220.0, 223.4, "Final: título", (ctx, lt, I) => {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 1920, 1080);
    const a = U.clamp(lt / 0.8) * U.clamp((3.3 - lt) / 0.9);
    ctx.globalAlpha = a;
    F.title(ctx, "PANTERA", "ZONA · AOMINE DAIKI", I.t, { size: 160, subSize: 34, glow: true });
    ctx.globalAlpha = 1;
  }, { vignette: 0 });
})(window.A);
