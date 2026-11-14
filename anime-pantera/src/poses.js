// Pose library, procedural cycles and key-pose interpolation.
// Poses are partial: anything omitted comes from the rest pose (see rig.js for conventions).
(function (A) {
  const U = A.U, R = A.R;
  const P = {};

  // ---- key poses ----
  P.idle = { hips: [0, 6, 3], spine: [5, -3, -2], chest: [5, -2, -2], neck: [8, 0, 0], head: [2, -6, 3],
    arm: { L: [3, 0, 7], R: [-2, 12, 5] }, elbow: { L: 16, R: 12 }, hand: { L: [10, 0, 0], R: [5, 0, 0] },
    leg: { L: [-3, 0, 7], R: [3, -8, 2] }, knee: { L: 9, R: 3 }, handShape: { L: "relaxed", R: "relaxed" } };
  P.slouch = R.over(P.idle, { spine: [10, -4, -3], chest: [8, 0, -2], neck: [12, 0, 0], head: [6, -4, 4], sh: { L: [0, 0, -4], R: [0, 0, -4] } });
  P.stand = { hips: [0, 0, 0], spine: [2, 0, 0], chest: [2, 0, 0], neck: [4, 0, 0], head: [0, 0, 0],
    arm: { L: [0, 0, 6], R: [0, 0, 6] }, elbow: { L: 12, R: 12 }, leg: { L: [0, 0, 5], R: [0, 0, 5] }, knee: { L: 3, R: 3 } };
  // low dribble stance, ball in right hand
  P.dribbleLow = { hips: [28, -10, 0], spine: [12, 4, 0], chest: [6, 6, 0], neck: [-24, 0, 0], head: [-14, 6, 0],
    arm: { L: [-38, 0, 30], R: [-30, -10, 14] }, elbow: { L: 40, R: 30 }, hand: { L: [0, 0, 0], R: [-30, 0, 0] },
    leg: { L: [-58, 0, 18], R: [-32, 10, 16] }, knee: { L: 78, R: 58 }, handShape: { L: "open", R: "open" } };
  // panther prowl: very low, left hand near the floor
  P.panther = { hips: [42, 0, 0], spine: [22, 0, 0], chest: [10, 0, 0], neck: [-40, 0, 0], head: [-26, 0, 0],
    arm: { L: [-62, 0, 12], R: [-10, 0, 26] }, elbow: { L: 12, R: 40 }, hand: { L: [-30, 0, 0], R: [0, 0, 0] },
    leg: { L: [-80, 0, 16], R: [-20, 0, 18] }, knee: { L: 110, R: 95 }, handShape: { L: "open", R: "open" } };
  P.defense = { hips: [24, 0, 0], spine: [10, 0, 0], chest: [4, 0, 0], neck: [-16, 0, 0], head: [-10, 0, 0],
    arm: { L: [-30, 0, 62], R: [-30, 0, 62] }, elbow: { L: 40, R: 40 }, leg: { L: [-40, 0, 26], R: [-40, 0, 26] }, knee: { L: 66, R: 66 }, handShape: { L: "open", R: "open" } };
  P.lunge = { hips: [36, -20, 0], spine: [16, -10, 6], chest: [8, -10, 0], neck: [-24, 0, 0], head: [-10, 0, 0],
    arm: { L: [-80, 0, 10], R: [-30, 0, 40] }, elbow: { L: 6, R: 40 }, leg: { L: [-70, 0, 10], R: [30, 0, 12] }, knee: { L: 70, R: 30 }, handShape: { L: "open", R: "open" } };
  // shooting (free throw form)
  P.shootSet = { hips: [12, 0, 0], spine: [2, 0, 0], chest: [-4, 0, 0], neck: [-6, 0, 0], head: [-8, 0, 0],
    arm: { L: [-130, 30, 22], R: [-140, -10, 10] }, elbow: { L: 70, R: 100 }, hand: { L: [0, 30, 0], R: [-50, 0, 0] },
    leg: { L: [-24, 0, 8], R: [-24, 0, 8] }, knee: { L: 40, R: 40 }, handShape: { L: "open", R: "open" } };
  P.shootRelease = { hips: [0, 0, 0], spine: [-2, 0, 0], chest: [-6, 0, 0], neck: [-10, 0, 0], head: [-14, 0, 0],
    arm: { L: [-150, 20, 26], R: [-172, -6, 6] }, elbow: { L: 30, R: 6 }, hand: { L: [0, 20, 0], R: [60, 0, 0] },
    leg: { L: [0, 0, 6], R: [0, 0, 6] }, knee: { L: 2, R: 2 }, foot: { L: [30, 0, 0], R: [30, 0, 0] }, handShape: { L: "open", R: "point" } };
  // formless shot: falling backwards, ball released from beside the head
  P.formless = { root: { rot: [-22, 0, 14] }, hips: [-10, 20, 0], spine: [-10, 10, -10], chest: [-6, 10, -12], neck: [10, -30, 0], head: [10, -30, 0],
    arm: { L: [-40, 0, 60], R: [-120, 40, 70] }, elbow: { L: 30, R: 20 }, hand: { L: [0, 0, 0], R: [40, 0, 0] },
    leg: { L: [-50, 0, 10], R: [10, 0, 20] }, knee: { L: 70, R: 20 }, handShape: { L: "open", R: "open" } };
  // dunk sequence
  P.dunkCrouch = { hips: [40, 0, 0], spine: [16, 0, 0], chest: [8, 0, 0], neck: [-30, 0, 0], head: [-16, 0, 0],
    arm: { L: [30, 0, 20], R: [36, 0, 10] }, elbow: { L: 20, R: 40 }, leg: { L: [-70, 0, 12], R: [-70, 0, 12] }, knee: { L: 115, R: 115 },
    handShape: { L: "open", R: "hold" } };
  P.dunkRise = { hips: [-6, 0, 0], spine: [-8, 0, 0], chest: [-10, 0, 0], neck: [-12, 0, 0], head: [-14, 0, 0],
    arm: { L: [-60, 0, 40], R: [-178, 0, 6] }, elbow: { L: 30, R: 30 }, hand: { R: [-30, 0, 0] },
    leg: { L: [-80, 0, 10], R: [16, 0, 6] }, knee: { L: 100, R: 30 }, foot: { L: [20, 0, 0], R: [50, 0, 0] }, handShape: { L: "open", R: "hold" } };
  P.dunkSlam = { hips: [20, 0, 0], spine: [16, 0, 0], chest: [12, 0, 0], neck: [10, 0, 0], head: [12, 0, 0],
    arm: { L: [-40, 0, 46], R: [-150, 0, 4] }, elbow: { L: 50, R: 10 }, hand: { R: [70, 0, 0] },
    leg: { L: [-40, 0, 12], R: [-30, 0, 12] }, knee: { L: 80, R: 70 }, foot: { L: [40, 0, 0], R: [40, 0, 0] }, handShape: { L: "fist", R: "open" } };
  P.hang = { hips: [-4, 0, 0], spine: [-6, 0, 0], chest: [-4, 0, 0], neck: [-20, 0, 0], head: [-8, 0, 0],
    arm: { L: [-150, 0, 26], R: [-176, 0, 6] }, elbow: { L: 50, R: 4 }, leg: { L: [-30, 0, 10], R: [-10, 0, 10] }, knee: { L: 60, R: 30 },
    foot: { L: [40, 0, 0], R: [40, 0, 0] }, handShape: { L: "fist", R: "hold" } };
  // floor / sitting / lying (root moved down so hips rest at ~13cm)
  P.sitFloor = { root: { pos: [0, -86, 0] }, hips: [0, 0, 0], spine: [10, 0, 0], chest: [6, 0, 0], neck: [6, 0, 0], head: [0, 0, 0],
    arm: { L: [10, 0, 20], R: [10, 0, 20] }, elbow: { L: 30, R: 30 }, leg: { L: [-84, 0, 12], R: [-118, 6, 16] }, knee: { L: 14, R: 118 } };
  P.lieBack = { root: { pos: [0, -86, 0] }, hips: [0, 0, 0], spine: [-80, 0, 0], chest: [-12, 0, 0], neck: [10, 0, 0], head: [16, -14, 0],
    arm: { L: [-150, 10, 40], R: [-150, -10, 40] }, elbow: { L: 140, R: 140 }, hand: { L: [0, 0, 0], R: [0, 0, 0] },
    leg: { L: [-86, 0, 8], R: [-118, 6, 16] }, knee: { L: 4, R: 118 }, handShape: { L: "relaxed", R: "relaxed" } };
  P.bench = { root: { pos: [0, -54, 0] }, hips: [-6, 0, 0], spine: [-10, 0, 0], chest: [-4, 0, 0], neck: [6, 0, 0], head: [4, 0, 0],
    arm: { L: [16, 0, 28], R: [16, 0, 28] }, elbow: { L: 10, R: 10 }, leg: { L: [-84, 0, 18], R: [-80, 0, 22] }, knee: { L: 88, R: 70 } };
  // gestures
  P.beckon = R.over(P.idle, { chest: [0, 14, 0], neck: [-4, 0, 0], head: [-6, -10, 0], arm: { R: [-62, 0, 12] }, elbow: { R: [22, 90] }, hand: { R: [-20, 0, 0] }, handShape: { R: "open" } });
  P.chainGrab = R.over(P.idle, { head: [-8, 14, -8], arm: { R: [-58, 40, -6] }, elbow: { R: 126 }, hand: { R: [0, 40, 0] }, handShape: { R: "fist" } });
  P.yawn = R.over(P.slouch, { neck: [-10, 0, 0], head: [-20, 0, -6], arm: { L: [-170, 0, 30], R: [-130, -20, 50] }, elbow: { L: 40, R: 120 }, handShape: { L: "fist", R: "relaxed" } });
  P.scratch = R.over(P.slouch, { head: [10, 8, -6], arm: { L: [-150, 20, 40] }, elbow: { L: 130 }, handShape: { L: "relaxed" } });
  P.teikoHold = { hips: [4, -30, 0], spine: [6, -14, 0], chest: [4, -12, 0], neck: [0, 30, 0], head: [-4, 34, 6],
    arm: { L: [-40, 30, 10], R: [-30, -40, 20] }, elbow: { L: 90, R: 80 }, hand: { L: [0, 40, 0], R: [0, -30, 0] },
    leg: { L: [-10, 0, 8], R: [8, 0, 6] }, knee: { L: 12, R: 6 }, handShape: { L: "hold", R: "hold" } };
  P.pointUp = R.over(P.stand, { arm: { R: [-170, 0, 8] }, elbow: { R: 4 }, handShape: { R: "point" }, head: [-16, 0, 0] });
  P.fistDown = R.over(P.stand, { hips: [10, 0, 0], spine: [16, 0, 0], arm: { R: [-20, 0, 20] }, elbow: { R: 110 }, handShape: { R: "fist" }, head: [10, 0, 0] });

  // ---- procedural cycles (phase 0..1) ----
  P.walk = (ph, o = {}) => {
    const a = ph * U.TAU, s = Math.sin(a), c = Math.cos(a);
    const lazy = o.lazy == null ? 1 : o.lazy;
    const st = o.stride || 1;
    return {
      root: { lift: Math.abs(Math.cos(a)) * 2.5 * st },
      hips: [2, s * 6, c * 2], spine: [4 + lazy * 6, -s * 4, 0], chest: [4 + lazy * 3, -s * 5, 0], neck: [6 + lazy * 6, 0, 0], head: [lazy * 2, s * 3, 0],
      arm: { L: [s * 16 * st, 0, 7], R: [-s * 16 * st, 0, 7] }, elbow: { L: 14 + Math.max(0, -s) * 16, R: 14 + Math.max(0, s) * 16 },
      leg: { L: [-s * 24 * st, 0, 4], R: [s * 24 * st, 0, 4] },
      knee: { L: 6 + Math.max(0, Math.sin(a + 1.4)) * 34 * st, R: 6 + Math.max(0, Math.sin(a + Math.PI + 1.4)) * 34 * st },
      foot: { L: [Math.max(0, Math.sin(a + 0.6)) * 14, 0, 0], R: [Math.max(0, Math.sin(a + Math.PI + 0.6)) * 14, 0, 0] },
      footFlat: { L: 0.7, R: 0.7 },
      handShape: { L: "relaxed", R: "relaxed" },
    };
  };
  P.run = (ph, o = {}) => {
    const a = ph * U.TAU, s = Math.sin(a), c = Math.cos(a);
    return {
      root: { lift: Math.max(0, -Math.cos(a * 2)) * 10 },
      hips: [16, s * 10, 0], spine: [12, -s * 6, 0], chest: [6, -s * 8, 0], neck: [-14, 0, 0], head: [-8, s * 3, 0],
      arm: { L: [s * 50, 0, 12], R: [-s * 50, 0, 12] }, elbow: { L: 90, R: 90 },
      leg: { L: [-s * 46 - 14, 0, 4], R: [s * 46 - 14, 0, 4] },
      knee: { L: 30 + Math.max(0, Math.sin(a + 1.2)) * 80, R: 30 + Math.max(0, Math.sin(a + Math.PI + 1.2)) * 80 },
      foot: { L: [20, 0, 0], R: [20, 0, 0] }, footFlat: { L: 0.3, R: 0.3 },
      handShape: { L: "fist", R: "fist" },
    };
  };
  // Dribble pump for the right hand: ph 0 = ball in hand (top)
  P.dribblePump = (base, ph, hand = "R") => {
    const k = 0.5 - 0.5 * Math.cos(ph * U.TAU); // 0 top .. 1 bottom
    const o = { arm: {}, elbow: {}, hand: {} };
    const b = base.arm[hand];
    o.arm[hand] = [b[0] + k * 14, b[1], b[2]];
    o.elbow[hand] = (base.elbow[hand] || 0) - k * 18;
    o.hand[hand] = [-30 + k * 50, 0, 0];
    return R.over(base, o);
  };

  // ---- interpolation ----
  // keys: [[t, pose, ease?], ...]  (ease applies to the segment ending at that key)
  P.sample = (keys, t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const a = keys[i - 1], b = keys[i];
        const u = U.ease(b[2] || "inOut", U.inv(a[0], b[0], t));
        return R.blend(R.full(a[1]), R.full(b[1]), u);
      }
    }
    return keys[keys.length - 1][1];
  };
  // With overlapping action: head/arms trail the body by a few frames.
  P.at = (keys, t, o = {}) => {
    const step = o.step == null ? A.CFG.defaultStep : o.step;
    const fps = A.CFG.fps;
    const ts = U.stepTime(t, fps, step);
    let p = R.full(P.sample(keys, ts));
    if (o.drag) {
      const h = R.full(P.sample(keys, ts - (o.drag.head || 0)));
      const ar = R.full(P.sample(keys, ts - (o.drag.arm || 0)));
      p = Object.assign({}, p, { neck: h.neck, head: h.head, elbow: ar.elbow, hand: ar.hand });
    }
    return p;
  };

  // Finalise: flat feet compensation + grounding so the lowest sole rests on the floor.
  P.finish = (pose, o = {}) => {
    const p = R.full(pose);
    const ff = p.footFlat || { L: 1, R: 1 };
    const foot = { L: (p.foot && p.foot.L) || [0, 0, 0], R: (p.foot && p.foot.R) || [0, 0, 0] };
    for (const s of ["L", "R"]) {
      const legX = p.leg[s][0] || 0, kn = p.knee[s] || 0;
      const comp = -((p.hips[0] || 0) + legX + kn + ((p.root.rot && p.root.rot[0]) || 0));
      foot[s] = [foot[s][0] + comp * (ff[s] == null ? 1 : ff[s]), foot[s][1] || 0, foot[s][2] || 0];
    }
    p.foot = foot;
    const root = Object.assign({}, p.root);
    let pos = (root.pos || [0, 0, 0]).slice();
    if (o.ground !== false && !root.noGround) {
      const J = R.fk(Object.assign({}, p, { root: Object.assign({}, root, { pos: [0, 0, 0] }) }));
      let minY = 1e9;
      for (const s of ["L", "R"]) {
        const F = J["foot" + s];
        for (const q of [[0, -8.5, -5], [0, -8.5, 16], [0, -5.0, 18]]) minY = Math.min(minY, U.add(F.p, U.mv(F.m, q))[1]);
      }
      // body contact points (sitting / lying): buttocks, back, skull
      for (const [n, q] of [["hips", [0, -13, -6]], ["spine", [0, 6, -11]], ["chest", [0, 12, -12]], ["head", [0, 10, -10]]]) {
        minY = Math.min(minY, U.add(J[n].p, U.mv(J[n].m, q))[1]);
      }
      pos[1] = (o.keepY ? pos[1] : 0) - minY + (root.lift || 0) + (o.lift || 0);
      if (o.offsetY) pos[1] += o.offsetY;
    }
    root.pos = [pos[0], pos[1], pos[2]];
    p.root = root;
    return p;
  };

  A.P = P;
})(window.A = window.A || {});

// Mirror a pose left/right (swap limbs, negate yaw/roll of the spine chain).
(function (A) {
  const R = A.R, P = A.P;
  P.mirror = (pose) => {
    const p = R.full(pose);
    const flip = (e) => (e ? [e[0], -(e[1] || 0), -(e[2] || 0)] : e);
    const o = Object.assign({}, p);
    for (const k of ["hips", "spine", "chest", "neck", "head"]) o[k] = flip(p[k]);
    for (const k of ["sh", "arm", "elbow", "hand", "leg", "knee", "foot", "handShape", "footFlat"]) if (p[k]) o[k] = { L: p[k].R, R: p[k].L };
    o.root = Object.assign({}, p.root);
    if (p.root.rot) o.root.rot = flip(p.root.rot);
    if (p.root.pos) o.root.pos = [-p.root.pos[0], p.root.pos[1], p.root.pos[2]];
    return o;
  };
})(window.A);
