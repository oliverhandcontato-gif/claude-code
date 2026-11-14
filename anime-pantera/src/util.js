// Math, easing, deterministic noise and small vector/matrix helpers.
// All animation is a pure function of time: nothing here keeps state between frames.
(function (A) {
  const U = {};
  U.TAU = Math.PI * 2;
  U.D = Math.PI / 180;
  U.clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.inv = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
  U.remap = (v, a, b, c, d, clampIt = true) => {
    let t = U.inv(a, b, v);
    if (clampIt) t = U.clamp(t);
    return c + (d - c) * t;
  };
  U.smooth = (t) => t * t * (3 - 2 * t);
  U.smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);

  // Easing library. Named so shot data can reference them as strings.
  const E = {
    linear: (t) => t,
    in: (t) => t * t,
    out: (t) => 1 - (1 - t) * (1 - t),
    inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    in3: (t) => t * t * t,
    out3: (t) => 1 - Math.pow(1 - t, 3),
    inOut3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out5: (t) => 1 - Math.pow(1 - t, 5),
    in5: (t) => t * t * t * t * t,
    outBack: (t) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    outBackSoft: (t) => {
      const c1 = 0.9, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    inBack: (t) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return c3 * t * t * t - c1 * t * t;
    },
    outElastic: (t) => {
      if (t === 0 || t === 1) return t;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (U.TAU / 3)) + 1;
    },
    step: (t) => (t < 1 ? 0 : 1),
    hold: (t) => (t < 1 ? 0 : 1),
    // Fast in the middle, long ease in and out: snappy anime "pose to pose".
    snap: (t) => {
      const k = 0.18;
      if (t < k) return 0.06 * (t / k) * (t / k);
      if (t > 1 - k) return 1 - 0.06 * Math.pow((1 - t) / k, 2);
      const m = (t - k) / (1 - 2 * k);
      return 0.06 + 0.88 * U.smoother(m);
    },
  };
  U.E = E;
  U.ease = (name, t) => (typeof name === "function" ? name(t) : (E[name] || E.inOut)(U.clamp(t)));

  // Stepped time: animate "on twos/threes" like hand-drawn anime.
  U.stepTime = (t, fps, step) => (step <= 1 ? t : Math.floor((t * fps) / step + 1e-6) * step / fps);

  // Deterministic hash noise.
  U.hash = (n) => {
    let x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  };
  U.hash2 = (a, b) => U.hash(a * 57.31 + b * 113.17);
  U.rng = (seed) => {
    let s = seed >>> 0 || 1;
    return () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  };
  U.noise1 = (x) => {
    const i = Math.floor(x), f = x - i;
    return U.lerp(U.hash(i), U.hash(i + 1), U.smooth(f)) * 2 - 1;
  };
  U.fbm = (x, oct = 3) => {
    let a = 0, amp = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { a += amp * U.noise1(x * f + i * 17.3); f *= 2; amp *= 0.5; }
    return a;
  };

  // --- 3D vectors (arrays [x,y,z]) ---
  U.v3 = (x = 0, y = 0, z = 0) => [x, y, z];
  U.add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  U.sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  U.mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  U.dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  U.cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  U.len = (a) => Math.hypot(a[0], a[1], a[2]);
  U.norm = (a) => { const l = U.len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  U.mix3 = (a, b, t) => [U.lerp(a[0], b[0], t), U.lerp(a[1], b[1], t), U.lerp(a[2], b[2], t)];

  // --- 3x3 matrices, row-major flat arrays ---
  U.I3 = () => [1, 0, 0, 0, 1, 0, 0, 0, 1];
  U.mm = (a, b) => {
    const r = new Array(9);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    return r;
  };
  U.mv = (m, v) => [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
  U.rx = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
  U.ry = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
  U.rz = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
  // Euler in degrees, applied Y * X * Z (yaw, then pitch, then roll in local space).
  U.euler = (e) => {
    if (!e) return U.I3();
    const D = U.D;
    return U.mm(U.mm(U.ry((e[1] || 0) * D), U.rx((e[0] || 0) * D)), U.rz((e[2] || 0) * D));
  };
  U.col = (m, i) => [m[i], m[3 + i], m[6 + i]];

  // --- 2D helpers ---
  U.p2 = (x, y) => ({ x, y });
  U.dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  U.lerp2 = (a, b, t) => ({ x: U.lerp(a.x, b.x, t), y: U.lerp(a.y, b.y, t) });
  U.angLerp = (a, b, t) => {
    let d = ((b - a + Math.PI) % U.TAU + U.TAU) % U.TAU - Math.PI;
    return a + d * t;
  };

  // Colour helpers (hex <-> rgb, mixing).
  U.hex = (h) => {
    h = h.replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.rgb = (c, a = 1) => (a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`);
  U.mixc = (h1, h2, t, a = 1) => {
    const c1 = U.hex(h1), c2 = U.hex(h2);
    return U.rgb([U.lerp(c1[0], c2[0], t), U.lerp(c1[1], c2[1], t), U.lerp(c1[2], c2[2], t)], a);
  };
  U.alpha = (h, a) => U.rgb(U.hex(h), a);

  A.U = U;
})(window.A = window.A || {});
