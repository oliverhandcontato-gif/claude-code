// Timeline: 5 shots laid out as comic panels. Times in seconds (24 fps, drawings mostly on 2s).
(function (A) {
  const U = A.U, K = A.K, Wd = A.WORLD, SA = A.SACI;
  const SH = (A.SHOTS = []);
  const shot = (t0, t1, name, draw, o = {}) => SH.push(Object.assign({ t0, t1, name, draw }, o));

  // ---------- pose keys ----------
  const lerpPose = (a, b, u) => {
    const o = Object.assign({}, a);
    for (const k of Object.keys(b)) {
      const va = a[k], vb = b[k];
      if (typeof vb === "number" && typeof va === "number") o[k] = U.lerp(va, vb, u);
      else if (Array.isArray(vb) && Array.isArray(va)) o[k] = va.map((v, i) => U.lerp(v, vb[i], u));
      else o[k] = u < 0.5 && va !== undefined ? va : vb;
    }
    return o;
  };
  // keys: [[t, pose, ease]]; returns pose at t (no stepping)
  const sample = (keys, t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
      const [ta, pa] = keys[i - 1], [tb, pb, e] = keys[i];
      return lerpPose(pa, pb, U.ease(e || "io", U.inv(ta, tb, t)));
    }
    return keys[keys.length - 1][1];
  };
  // character at time t: stepped on twos (or ones), cap/cape secondary motion from velocity
  const actor = (keys, t, step = 2, extra = {}) => {
    const ts = U.step(t, 24, step);
    const p = Object.assign({}, sample(keys, ts));
    const q = sample(keys, ts - 2 / 24);
    const vy = (p.y - q.y) * 12, vx = (p.x - q.x) * 12;
    p.cap = (p.cap == null ? 0.3 : p.cap) + U.clamp(-vy * 0.004, -0.5, 0.9);
    p.capeWind = (p.capeWind == null ? 0.35 : p.capeWind) + U.clamp(Math.abs(vx) * 0.0025 + Math.max(0, -vy) * 0.002, 0, 1);
    p.capeFlap = ts * 9;
    p.footFlat = p.footFlat == null ? true : p.footFlat;
    return Object.assign(p, extra);
  };

  // ---------- camera helpers ----------
  const world = (ctx, pw, ph, cx, cy, z) => {
    ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix([z, 0, 0, z, pw / 2 - cx * z, ph / 2 - cy * z])));
  };
  const SACI_S = 0.32;
  const drawSaci = (ctx, p, z) => { const k = K.lwk; K.lwk = 1; const r = SA.draw(ctx, Object.assign({ s: SACI_S, lw: 1.15 / z }, p)); K.lwk = k; return r; };
  const background = (ctx, pw, ph, cam, glow) => {
    Wd.sky(ctx, pw, ph, glow);
    Wd.stars(ctx, pw, ph, -cam.x * 0.05, -cam.y * 0.03 * 0);
    Wd.moon(ctx, pw * 0.82 - cam.x * 0.03, ph * 0.2 - (cam.y + 400) * 0.02, 46);
    Wd.skyline(ctx, { x: cam.x, y: cam.y }, 0.22, ph * 0.86 + (-cam.y - 300) * 0.12, Wd.COL.far, "rgba(232,192,96,0.55)", 3, 120, 330, pw);
    Wd.skyline(ctx, { x: cam.x, y: cam.y }, 0.45, ph * 1.02 + (-cam.y - 300) * 0.3, Wd.COL.mid, "rgba(232,192,96,0.8)", 8, 160, 420, pw);
  };
  const street = (ctx) => {
    const s = new Path2D(); s.rect(-2000, 0, 4600, 400);
    K.shape(ctx, s, Wd.COL.street, 4);
    const w = new Path2D(); w.rect(-2000, 0, 4600, 26);
    K.shape(ctx, w, Wd.COL.walk, 4);
    for (let x = -2000; x < 2600; x += 90) K.brush(ctx, [[x, 70], [x + 50, 70]], 3, 5, 3, "#c8c0a0");
  };
  const lamp = (ctx, x, glow = 1) => {
    const p = new Path2D(); p.rect(x - 5, -240, 10, 240);
    K.shape(ctx, p, Wd.COL.lamp, 4);
    const h = K.path([[x - 4, -240], [x + 40, -252], [x + 44, -240], [x + 2, -232]], true, 0.3);
    K.shape(ctx, h, Wd.COL.lamp, 4);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(x + 40, -236, 0, x + 40, -236, 120);
    g.addColorStop(0, `rgba(255,220,150,${0.5 * glow})`); g.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = g; ctx.fillRect(x - 100, -360, 280, 260); ctx.restore();
  };
  // all burning windows with flames + smoke; amt 0..1, pull = {x,y,k} bends flames toward the vortex
  const fires = (ctx, t, amt, pull) => {
    if (amt <= 0.01) return;
    Wd.FIRE.forEach(([f, c], i) => {
      const w = Wd.window(f, c);
      let lean = Math.sin(t * 2 + i) * 0.15;
      let h = w.h * 1.35 * amt * (0.85 + 0.15 * U.hash(i));
      if (pull) {
        const dx = pull.x - w.x;
        lean = U.lerp(lean, U.clamp(dx / 220, -1.2, 1.2), pull.k);
        h *= 1 + pull.k * 0.3;
      }
      Wd.flame(ctx, w.x, w.y + w.h / 2 + 2, w.w * 0.95, h, t, lean, i * 3.1);
    });
  };
  const smokes = (ctx, t, amt, pull) => {
    if (amt <= 0.01) return;
    Wd.FIRE.forEach(([f, c], i) => {
      const w = Wd.window(f, c);
      for (let k = 0; k < 3; k++) {
        const ph = ((t * 0.35 + k / 3 + U.hash(i) * 0.3) % 1);
        let x = w.x + Math.sin(ph * 4 + i) * 18, y = w.y - w.h / 2 - ph * 260;
        if (pull) { x = U.lerp(x, pull.x, pull.k * ph); y = U.lerp(y, pull.y, pull.k * ph * 0.6); }
        Wd.smoke(ctx, x, y, (16 + ph * 34) * amt, t, i * 5 + k, 0.4 + ph * 0.4);
      }
    });
  };
  const embers = (ctx, pw, ph, t, n = 26) => {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < n; i++) {
      const x = (U.hash(i * 3.1) * pw + Math.sin(t * 2 + i) * 20) % pw;
      const y = ph - ((t * (40 + U.hash(i) * 60) + U.hash(i * 7) * ph) % ph);
      ctx.fillStyle = i % 2 ? "rgba(255,170,80,0.9)" : "rgba(255,230,140,0.9)";
      ctx.fillRect(x, y, 3, 3);
    }
    ctx.restore();
  };
  A.SH_HELP = { actor, sample, world, drawSaci, background, fires, smokes, embers };

  // =============== S1 establishing ===============
  shot(0, 4.2, "S1 prédio em chamas", (ctx, lt, I) => {
    const { pw, ph } = I;
    const u = U.ease("io", lt / 4.2);
    const cam = { x: 260, y: U.lerp(-260, -470, u) };
    const z = U.lerp(0.78, 0.84, u);
    background(ctx, pw, ph, cam, 1);
    ctx.save();
    world(ctx, pw, ph, cam.x, cam.y, z);
    K.lwk = Math.pow(z, -0.6);
    street(ctx);
    Wd.building(ctx, lt, 1);
    // girl at her window (inside the glass)
    const gw = Wd.window(...Wd.GIRL);
    ctx.save(); const gl = new Path2D(); gl.rect(gw.x - gw.w / 2, gw.y - gw.h / 2, gw.w, gw.h); ctx.clip(gl);
    Wd.girl(ctx, { x: gw.x, y: gw.y + gw.h / 2 + 4, s: 0.62, expr: "scared", wave: 1, t: U.step(lt, 24, 2), look: 0.3 });
    ctx.restore();
    fires(ctx, lt, 1);
    smokes(ctx, lt, 1);
    lamp(ctx, -160);
    lamp(ctx, 700);
    ctx.restore();
    embers(ctx, pw, ph, lt);
    K.lwk = 1;
  });

  // =============== S2 arrival: whirlwind reveals Capitão Saci ===============
  const S2keys = [
    [0, { x: -150, y: -20, face: 1, thigh: 0.9, knee: 1.6, lean: 0.55, armF: [-1.2, 1.4], armB: [1.0, 0.6], squash: 0.6, expr: "determined", turn: 1, head: 0.1 }],
    [0.35, { x: -150, y: -20, face: 1, thigh: 0.9, knee: 1.6, lean: 0.55, armF: [-1.2, 1.4], armB: [1.0, 0.6], squash: 0.5, expr: "determined", turn: 1, head: 0.1 }],
    [0.6, { x: -150, y: -32, face: 1, thigh: 0.08, knee: 0.1, lean: -0.08, armF: [0.5, 0.9], armB: [-0.4, 1.0], squash: -0.15, expr: "determined", turn: 1, head: -0.05, handF: "fist", handB: "fist" }, "out3"],
    [0.85, { x: -150, y: -31, face: 1, thigh: 0.05, knee: 0.08, lean: -0.04, armF: [0.45, 1.1], armB: [-0.35, 1.2], squash: 0, expr: "smile", turn: 1, head: 0 }, "soft"],
    [1.4, { x: -150, y: -31, face: 1, thigh: 0.05, knee: 0.08, lean: -0.04, armF: [0.45, 1.1], armB: [-0.35, 1.2], squash: 0, expr: "smile", turn: 1, head: 0 }],
    [1.75, { x: -150, y: -31, face: 1, thigh: 0.05, knee: 0.1, lean: -0.12, armF: [0.3, 0.5], armB: [-0.2, 0.6], squash: 0.05, expr: "determined", turn: 0.8, head: -0.55, gaze: [0.4, -0.9] }, "io"],
    [2.4, { x: -150, y: -31, face: 1, thigh: 0.05, knee: 0.1, lean: -0.14, armF: [0.25, 0.45], armB: [-0.2, 0.6], squash: 0.05, expr: "determined", turn: 0.8, head: -0.6, gaze: [0.4, -1] }],
  ];
  shot(4.2, 8.0, "S2 o redemoinho chega", (ctx, lt, I) => {
    const { pw, ph } = I;
    const z = U.lerp(5.2, 5.8, U.ease("io", lt / 3.8));
    const cam = { x: -98 + lt * 2, y: -62 };
    background(ctx, pw, ph, { x: cam.x * 0.3, y: -300 }, 0.8);
    ctx.save();
    world(ctx, pw, ph, cam.x, cam.y, z);
    K.lwk = Math.pow(z, -0.6);
    street(ctx);
    Wd.building(ctx, lt + 4.2, 1);
    fires(ctx, lt + 4.2, 1);
    lamp(ctx, -420);
    // whirlwind travels in, then unwinds
    const arrive = U.ease("out", U.seg(lt, 0, 1.3));
    const vx = U.lerp(-640, -150, arrive);
    const unwind = U.seg(lt, 1.35, 2.0);
    const reveal = lt >= 1.75;
    if (reveal) {
      const p = actor(S2keys, lt - 1.75, 2, {});
      drawSaci(ctx, p, z);
    }
    if (unwind < 1) {
      Wd.vortex(ctx, vx, 0, U.lerp(150, 40, unwind) , U.lerp(70, 18, unwind), lt, { debris: 8, width: 1 - unwind * 0.6 });
    }
    // dust trail
    ctx.fillStyle = "rgba(200,180,150,0.5)";
    for (let k = 0; k < 6; k++) { const dx = vx - 40 - k * 50 - (lt * 80) % 50; ctx.beginPath(); ctx.ellipse(dx, -6, 20 - k * 2, 6, 0, 0, U.TAU); if (lt < 1.6) ctx.fill(); }
    ctx.restore();
    K.lwk = 1;
    // speed lines when he lands
    if (lt > 1.75 && lt < 2.3) {
      const k = 1 - U.seg(lt, 1.75, 2.3);
      ctx.save(); ctx.strokeStyle = `rgba(20,15,15,${0.5 * k})`; ctx.lineWidth = 3;
      for (let i = 0; i < 24; i++) { const a = i / 24 * U.TAU + U.hash(i); const r0 = 260, r1 = 900; ctx.beginPath(); ctx.moveTo(pw * 0.35 + Math.cos(a) * r0, ph * 0.62 + Math.sin(a) * r0); ctx.lineTo(pw * 0.35 + Math.cos(a) * r1, ph * 0.62 + Math.sin(a) * r1); ctx.stroke(); }
      ctx.restore();
    }
  }, { trans: "slide" });

  // =============== S3 climbing the facade, hop by hop ===============
  const hops = [[[-90, 0], Wd.ledge(1, 0)], [Wd.ledge(1, 0), Wd.ledge(2, 1)], [Wd.ledge(2, 1), Wd.ledge(3, 0)], [Wd.ledge(3, 0), Wd.ledge(4, 2)]];
  const HOP = 0.62;
  const saciOnHops = (lt) => {
    const i = Math.min(hops.length - 1, Math.floor(lt / HOP));
    const u = (lt - i * HOP) / HOP;
    const [a, b] = hops[i];
    const face = b[0] >= a[0] ? 1 : -1;
    const crouch = { thigh: 0.9, knee: 1.6, lean: 0.5, armF: [0.9, 0.5], armB: [1.1, 0.4], squash: 0.55, expr: "determined" };
    const air = { thigh: -0.1, knee: 0.5, lean: 0.1, armF: [-2.4, 0.2], armB: [-0.4, 0.8], squash: -0.2, expr: "grit", handF: "fist" };
    const land = { thigh: 0.7, knee: 1.3, lean: 0.4, armF: [-0.6, 0.8], armB: [0.8, 0.5], squash: 0.45, expr: "determined" };
    const legH = 96 * SACI_S;
    let pose, x, y;
    if (u < 0.2) { pose = crouch; x = a[0]; y = a[1] - legH * 0.62; }
    else if (u < 0.82) {
      const v = (u - 0.2) / 0.62;
      x = U.lerp(a[0], b[0], v); y = U.lerp(a[1], b[1], v) - legH - Math.sin(Math.PI * v) * 60;
      pose = v < 0.5 ? air : lerpPose(air, land, (v - 0.5) * 2);
    } else { pose = lerpPose(land, { thigh: 0.1, knee: 0.15, lean: 0, armF: [0.3, 0.6], armB: [-0.3, 0.8], squash: 0 }, (u - 0.82) / 0.18); x = b[0]; y = b[1] - legH * (pose.squash > 0.2 ? 0.66 : 0.98); }
    return Object.assign({ turn: 0.75, face }, pose, { x, y });
  };
  shot(8.0, 10.6, "S3 sobe pulando nas sacadas", (ctx, lt, I) => {
    const { pw, ph } = I;
    const ts = U.step(lt, 24, 2);
    const sp = saciOnHops(ts);
    const lag = saciOnHops(Math.max(0, U.step(lt, 24, 2) - 0.18));
    const camY = U.lerp(-60, lag.y + 10, U.ease("io", U.seg(lt, 0.0, 0.5)));
    const camX = U.lerp(-40, U.lerp(230, lag.x, 0.55), U.ease("io", U.seg(lt, 0.0, 0.5)));
    const z = 3.0;
    background(ctx, pw, ph, { x: camX, y: camY }, 1);
    ctx.save();
    world(ctx, pw, ph, camX, camY, z);
    K.lwk = Math.pow(z, -0.6);
    street(ctx);
    Wd.building(ctx, lt + 8, 1);
    fires(ctx, lt + 8, 1);
    smokes(ctx, lt + 8, 0.9);
    // motion arc trail during air time
    const prev = saciOnHops(Math.max(0, ts - 0.08));
    if (Math.hypot(sp.x - prev.x, sp.y - prev.y) > 8) K.brush(ctx, [[prev.x, prev.y], [sp.x, sp.y]], 0.5, 6, 1, "rgba(250,240,220,0.7)");
    drawSaci(ctx, Object.assign(sp, { capeWind: 0.6, capeFlap: ts * 9, cap: 0.4 + (sp.squash < 0 ? 0.5 : 0), footFlat: true }), z);
    ctx.restore();
    K.lwk = 1;
    embers(ctx, pw, ph, lt + 8, 18);
  }, { trans: "slide" });

  // =============== S4 the whirlwind swallows the fire ===============
  const V = { x: 260, y: -560 };
  shot(10.6, 15.4, "S4 redemoinho suga o fogo", (ctx, lt, I) => {
    const { pw, ph } = I;
    const z = 1.45;
    const cam = { x: 270, y: -575 + U.ease("in", U.seg(lt, 3.4, 4.8)) * -120 };
    const fire = 1 - U.ease("io", U.seg(lt, 1.9, 3.6));
    background(ctx, pw, ph, cam, fire);
    ctx.save();
    world(ctx, pw, ph, cam.x, cam.y, z);
    K.lwk = Math.pow(z, -0.6);
    Wd.building(ctx, lt + 10.6, fire);
    const L = Wd.ledge(4, 2);
    // vortex growth & travel
    const grow = U.ease("out3", U.seg(lt, 0.55, 1.3));
    const rise = U.ease("in3", U.seg(lt, 3.4, 4.8));
    const vx = U.lerp(L[0], V.x, U.ease("io", U.seg(lt, 0.9, 1.8)));
    const vy = U.lerp(L[1], V.y + 140, U.ease("io", U.seg(lt, 0.9, 1.8))) - rise * 900;
    const pull = { x: vx, y: vy - 120, k: U.seg(lt, 1.0, 1.8) };
    smokes(ctx, lt + 10.6, fire, pull);
    fires(ctx, lt + 10.6, fire, pull);
    // flame streaks being sucked in
    if (lt > 1.2 && lt < 3.8) {
      Wd.FIRE.forEach(([f, c], i) => {
        const w = Wd.window(f, c);
        for (let k = 0; k < 2; k++) {
          const ph2 = ((lt * 1.6 + k * 0.5 + U.hash(i)) % 1);
          const px = U.lerp(w.x, vx, ph2), py = U.lerp(w.y - w.h * 0.6, vy - 140 * ph2, ph2);
          K.brush(ctx, [[px, py], [U.lerp(px, vx, 0.25), U.lerp(py, vy - 140, 0.25)]], 1, 9 * fire + 2, 1, k ? "#ffb040" : "#ff6a2a");
        }
      });
    }
    // Saci before he becomes the whirlwind: crouch, then spin (drawings on ones)
    if (lt < 0.95) {
      const spin = lt > 0.45;
      const f = spin ? (Math.floor(lt * 24) % 2 ? 1 : -1) : 1;
      const pose = spin
        ? { thigh: 0.1, knee: 0.2, lean: 0, armF: [-1.5, 0.1], armB: [-1.5, 0.1], squash: -0.1, expr: "grit", turn: Math.floor(lt * 24) % 3 === 0 ? 0 : 1, face: f, glow: 1 }
        : { thigh: 0.8, knee: 1.5, lean: 0.45, armF: [-0.8, 2.2], armB: [-0.6, 2.0], squash: 0.5, expr: "grit", turn: 1, face: 1, glow: lt / 0.45 };
      drawSaci(ctx, Object.assign({ x: L[0], y: L[1] - 96 * SACI_S * (spin ? 1 : 0.65), capeWind: spin ? 1 : 0.4, capeFlap: lt * 20, cap: spin ? 0.9 : 0.3, footFlat: true }, pose), z);
    }
    if (grow > 0) Wd.vortex(ctx, vx, vy, 300 * grow, 150 * grow, lt, { fire: U.seg(lt, 1.2, 2.4) * (rise > 0 ? 1 : 1), debris: 12 });
    ctx.restore();
    K.lwk = 1;
    embers(ctx, pw, ph, lt + 10.6, Math.round(30 * Math.max(fire, rise)));
    // ----- inset panel: close-up of his face (cap glowing) -----
    const inT = U.seg(lt, 0.25, 0.45), outT = U.seg(lt, 1.6, 1.8);
    if (inT > 0 && outT < 1) {
      const iw = pw * 0.34, ih = ph * 0.42;
      const ix = pw - iw - 40 + outT * (iw + 80), iy = 40;
      const sc = U.lerp(0.6, 1, U.ease("back", inT));
      ctx.save();
      ctx.translate(ix + iw / 2, iy + ih / 2); ctx.scale(sc, sc); ctx.translate(-iw / 2, -ih / 2);
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(10, 12, iw, ih);
      const r = new Path2D(); r.rect(0, 0, iw, ih);
      ctx.save(); ctx.clip(r);
      ctx.fillStyle = "#b8231e"; ctx.fillRect(0, 0, iw, ih);
      ctx.strokeStyle = "rgba(255,200,120,0.55)"; ctx.lineWidth = 4;
      for (let i = 0; i < 36; i++) { const a = i / 36 * U.TAU + U.step(lt, 24, 2) * 0.5; ctx.beginPath(); ctx.moveTo(iw * 0.45 + Math.cos(a) * 120, ih * 0.55 + Math.sin(a) * 120); ctx.lineTo(iw * 0.45 + Math.cos(a) * 700, ih * 0.55 + Math.sin(a) * 700); ctx.stroke(); }
      const tt = U.step(lt, 24, 2);
      const expr = tt < 0.9 ? "determined" : "grit";
      SA.draw(ctx, { x: iw * 0.4, y: ih * 0.74 + 86 * 6.2, s: 6.2, face: 1, turn: 1, expr, head: -0.05, lean: 0, armF: [-1, 2.4], armB: [0.3, 0.6], glow: U.seg(lt, 0.3, 0.9), cap: 0.35 + Math.sin(tt * 12) * 0.05, gaze: [0.6, -0.2], lw: 1 / 6.2 * 1.4, capeWind: 0.8, capeFlap: tt * 12 });
      ctx.restore();
      ctx.lineWidth = 7; ctx.strokeStyle = K.INK; ctx.strokeRect(0, 0, iw, ih);
      ctx.restore();
    }
  }, { trans: "cut" });

  // =============== S5 at the girl's window ===============
  const gw = Wd.window(...Wd.GIRL);
  const LEDGE = [gw.x + 26, gw.y + gw.h / 2 + 6];
  const st = (o) => Object.assign({ face: -1, turn: 1, thigh: 0.05, knee: 0.1, lean: 0, armF: [0.3, 0.6], armB: [-0.3, 0.8], squash: 0, expr: "smile", head: 0, gaze: [0.5, 0] }, o);
  const LH = 96 * SACI_S;
  const S5keys = [
    [0, st({ x: LEDGE[0] + 20, y: LEDGE[1] - 260, thigh: -0.1, knee: 0.4, armF: [-2.6, 0.2], armB: [-2.2, 0.4], squash: -0.2, expr: "determined", handF: "fist" })],
    [0.42, st({ x: LEDGE[0], y: LEDGE[1] - LH, thigh: 0, knee: 0.3, armF: [-2.4, 0.3], armB: [-2.0, 0.4], squash: -0.15, expr: "determined" }), "in"],
    [0.55, st({ x: LEDGE[0], y: LEDGE[1] - LH * 0.62, thigh: 0.85, knee: 1.55, lean: 0.45, armF: [0.6, 1.0], armB: [0.9, 0.6], squash: 0.6, expr: "determined" }), "out"],
    [0.9, st({ x: LEDGE[0], y: LEDGE[1] - LH * 0.99, expr: "smile", head: 0.05 }), "soft"],
    [1.9, st({ x: LEDGE[0], y: LEDGE[1] - LH * 0.99, expr: "smile", head: 0.05, gaze: [0.6, 0.2] })],
    [2.25, st({ x: LEDGE[0], y: LEDGE[1] - LH * 0.97, expr: "smile", head: 0.18, armF: [2.5, 1.5], handF: "cap", lean: 0.08 }), "io"],
    [2.6, st({ x: LEDGE[0], y: LEDGE[1] - LH * 0.97, expr: "wink", head: 0.22, armF: [2.65, 1.6], handF: "cap", lean: 0.1, cap: 0.1 }), "out"],
    [3.25, st({ x: LEDGE[0], y: LEDGE[1] - LH * 0.97, expr: "wink", head: 0.15, armF: [2.55, 1.55], handF: "cap", lean: 0.06 })],
    [3.55, st({ x: LEDGE[0], y: LEDGE[1] - LH * 0.62, thigh: 0.85, knee: 1.55, lean: 0.45, armF: [0.7, 1.0], armB: [0.9, 0.6], squash: 0.55, expr: "smile", face: 1 }), "in"],
    [3.8, st({ x: LEDGE[0] + 80, y: LEDGE[1] - LH + 40, thigh: -0.1, knee: 0.4, armF: [-2.5, 0.2], armB: [-0.4, 0.8], squash: -0.2, expr: "smile", face: 1, handF: "fist" }), "out"],
  ];
  shot(15.4, 20.6, "S5 resgate na janela", (ctx, lt, I) => {
    const { pw, ph } = I;
    const z = 5.0;
    const cam = { x: gw.x + 16, y: gw.y + 2 };
    background(ctx, pw, ph, cam, 0.05);
    ctx.save();
    world(ctx, pw, ph, cam.x, cam.y, z);
    K.lwk = Math.pow(z, -0.6);
    Wd.building(ctx, lt + 15.4, 0);
    // girl inside the glass
    ctx.save(); const gl = new Path2D(); gl.rect(gw.x - gw.w / 2, gw.y - gw.h / 2, gw.w, gw.h); ctx.clip(gl);
    const tt = U.step(lt, 24, 2);
    const gExpr = tt < 0.7 ? "scared" : tt < 2.2 ? "relief" : "smile";
    Wd.girl(ctx, { x: gw.x - 12, y: gw.y + gw.h / 2 + 4, s: 0.62, expr: gExpr, wave: tt > 3.0 ? 1 : 0, t: tt, look: tt > 0.5 ? 1 : 0.2, tilt: tt > 2.4 && tt < 3.2 ? -0.12 : 0, bob: tt > 0.6 && tt < 0.9 ? 2 : 0 });
    ctx.restore();
    // ledge in front of her (redraw so it overlaps)
    const l = new Path2D(); l.rect(gw.x - gw.w / 2 - 12, gw.y + gw.h / 2 + 6, gw.w + 24, 8); K.shape(ctx, l, Wd.COL.trim, 3);
    // Saci: lands, smiles, tips his cap with a wink, hops away as a small whirlwind
    let headW = null;
    if (lt < 4.25) headW = drawSaci(ctx, actor(S5keys, lt, 2), z).head;
    if (lt > 3.75) {
      const u = U.seg(lt, 3.75, 4.6);
      Wd.vortex(ctx, LEDGE[0] + 80 + u * 110, LEDGE[1] + 30 + u * 150, 64 * (1 - u * 0.3), 28, lt, { debris: 5 });
    }
    // soot on the wall above burned windows
    ctx.restore();
    K.lwk = 1;
    // sparkle on the cap tip during the wink
    if (lt > 2.55 && lt < 3.0) {
      const k = Math.sin(Math.PI * U.seg(lt, 2.55, 3.0));
      const x = headW ? pw / 2 + (headW[0] - cam.x) * z + 34 : pw * 0.6, y = headW ? ph / 2 + (headW[1] - cam.y) * z - 70 : ph * 0.2;
      ctx.save(); ctx.fillStyle = "#fff6c8"; ctx.strokeStyle = K.INK; ctx.lineWidth = 3;
      const r = 26 * k;
      const p = K.poly([[x, y - r], [x + r * 0.22, y - r * 0.22], [x + r, y], [x + r * 0.22, y + r * 0.22], [x, y + r], [x - r * 0.22, y + r * 0.22], [x - r, y], [x - r * 0.22, y - r * 0.22]]);
      ctx.fill(p); ctx.stroke(p); ctx.restore();
    }
  }, { trans: "slide", out: { at: 4.6, dur: 0.6 } });
})(window.A);
