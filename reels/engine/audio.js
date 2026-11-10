/* Reel engine — sons sintetizados com Web Audio (nenhum arquivo de áudio).
 * Cada som é uma função (S, t, opções) que agenda nós num AudioContext/OfflineAudioContext.
 * S = { ac, out, verb } vem de A.bus(ac). A trilha final é renderizada offline, normalizada e
 * exportada em WAV.
 */
(function () {
  'use strict';
  const R = window.Reel;
  const A = (R.audio = {});
  A.SR = 48000;

  const caches = new WeakMap();
  const cacheOf = (ac) => {
    let m = caches.get(ac);
    if (!m) caches.set(ac, (m = new Map()));
    return m;
  };

  /** Buffer de ruído estéreo determinístico: 'white' | 'pink' | 'brown'. */
  A.noise = (ac, color = 'white', seconds = 4, seed = 1) => {
    const key = `${color}:${seconds}:${seed}`, m = cacheOf(ac);
    if (m.has(key)) return m.get(key);
    const len = Math.floor(seconds * ac.sampleRate);
    const b = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch), r = R.rng(seed * 7 + ch * 101);
      let b0 = 0, b1 = 0, b2 = 0, last = 0;
      for (let i = 0; i < len; i++) {
        const w = r() * 2 - 1;
        if (color === 'pink') {
          b0 = 0.99765 * b0 + w * 0.099046;
          b1 = 0.963 * b1 + w * 0.2965164;
          b2 = 0.57 * b2 + w * 1.0526913;
          d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
        } else if (color === 'brown') {
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.5;
        } else d[i] = w;
      }
    }
    m.set(key, b);
    return b;
  };

  A.impulse = (ac, seconds = 3.5, decay = 2.6, seed = 9) => {
    const len = Math.floor(seconds * ac.sampleRate), b = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch), r = R.rng(seed + ch * 13);
      for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  };

  /** Mixer: master com compressor + barramento de reverb. */
  A.bus = (ac) => {
    const master = ac.createGain();
    master.gain.value = 0.9;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 8;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.3;
    master.connect(comp);
    comp.connect(ac.destination);
    const verb = ac.createGain();
    const conv = ac.createConvolver();
    conv.buffer = A.impulse(ac);
    const wet = ac.createGain();
    wet.gain.value = 0.55;
    verb.connect(conv);
    conv.connect(wet);
    wet.connect(master);
    return { ac, out: master, verb };
  };

  // ---- helpers internos ----
  const chain = (S, level = 1, verb = 0) => {
    const post = S.ac.createGain();
    post.gain.value = level;
    post.connect(S.out);
    if (verb > 0) {
      const s = S.ac.createGain();
      s.gain.value = verb;
      post.connect(s);
      s.connect(S.verb);
    }
    return post;
  };
  const noiseSrc = (S, color, t, dur, seed = 1) => {
    const src = S.ac.createBufferSource();
    src.buffer = A.noise(S.ac, color, 4, seed);
    src.loop = true;
    src.start(t, (seed * 0.37) % 3);
    src.stop(t + dur + 0.05);
    return src;
  };
  const filt = (S, type, freq, Q = 0.7) => {
    const f = S.ac.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = Q;
    return f;
  };
  const perc = (param, t, attack, peak, decay) => {
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  };
  const hold = (param, t0, t1, level, fin, fout) => {
    param.setValueAtTime(0.0001, t0);
    param.exponentialRampToValueAtTime(level, t0 + fin);
    param.setValueAtTime(level, Math.max(t0 + fin, t1 - fout));
    param.exponentialRampToValueAtTime(0.0001, t1);
  };
  const osc = (S, type, freq, t0, t1) => {
    const o = S.ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    o.start(t0);
    o.stop(t1);
    return o;
  };
  const pipe = (...nodes) => {
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
    return nodes[nodes.length - 1];
  };

  // ---- sons ----

  /** Impacto grave (sub + ruído). */
  A.boom = (S, t, { gain = 1, freq = 48, decay = 2.4, verb = 0.5 } = {}) => {
    const post = chain(S, gain, verb);
    const o = osc(S, 'sine', freq * 2.2, t, t + decay + 0.1);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.12);
    o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + decay);
    const g = S.ac.createGain();
    perc(g.gain, t, 0.006, 0.9, decay);
    pipe(o, g, post);
    const lp = filt(S, 'lowpass', 1200);
    lp.frequency.setValueAtTime(1200, t);
    lp.frequency.exponentialRampToValueAtTime(90, t + 0.7);
    const ng = S.ac.createGain();
    perc(ng.gain, t, 0.003, 0.8, 0.8);
    pipe(noiseSrc(S, 'brown', t, 1, 3), lp, ng, post);
  };

  /** Batida de coração (tum-tum). */
  A.heartbeat = (S, t, { gain = 0.8 } = {}) => {
    const post = chain(S, gain, 0.05);
    for (const [dt, k] of [[0, 1], [0.26, 0.7]]) {
      const tt = t + dt;
      const o = osc(S, 'sine', 100, tt, tt + 0.4);
      o.frequency.exponentialRampToValueAtTime(40, tt + 0.13);
      const g = S.ac.createGain();
      perc(g.gain, tt, 0.004, k, 0.24);
      pipe(o, g, post);
      // "knock" filtrado para ser audível em alto-falante de celular
      const ng = S.ac.createGain();
      perc(ng.gain, tt, 0.002, k * 0.55, 0.09);
      pipe(noiseSrc(S, 'brown', tt, 0.15, 11), filt(S, 'lowpass', 260), ng, post);
    }
  };

  /** Drone grave com filtro respirando. */
  A.drone = (S, t0, t1, { gain = 0.3, base = 55, fin = 2, fout = 1.5, cutoff = 320, verb = 0.3 } = {}) => {
    const post = chain(S, 1, verb);
    const amp = S.ac.createGain();
    hold(amp.gain, t0, t1, gain, fin, fout);
    const f = filt(S, 'lowpass', cutoff, 4);
    const lfo = osc(S, 'sine', 0.09, t0, t1);
    const lg = S.ac.createGain();
    lg.gain.value = cutoff * 0.5;
    pipe(lfo, lg, f.frequency);
    [[base, 'sawtooth', 0.5], [base * 1.0062, 'sawtooth', 0.5], [base * 1.059, 'triangle', 0.22], [base * 2.003, 'triangle', 0.16]].forEach(([fr, type, lv]) => {
      const g = S.ac.createGain();
      g.gain.value = lv;
      pipe(osc(S, type, fr, t0, t1), g, f);
    });
    const sg = S.ac.createGain();
    sg.gain.value = 0.6;
    pipe(osc(S, 'sine', base / 2, t0, t1), sg, amp);
    pipe(f, amp, post);
  };

  A.wind = (S, t0, t1, { gain = 0.3, center = 500, fin = 1, fout = 1, verb = 0.2 } = {}) => {
    const post = chain(S, 1, verb);
    const bp = filt(S, 'bandpass', center, 1.2);
    const lfo = osc(S, 'sine', 0.11, t0, t1);
    const lg = S.ac.createGain();
    lg.gain.value = center * 0.6;
    pipe(lfo, lg, bp.frequency);
    const mod = S.ac.createGain();
    mod.gain.value = 0.7;
    const lfo2 = osc(S, 'sine', 0.23, t0, t1);
    const lg2 = S.ac.createGain();
    lg2.gain.value = 0.3;
    pipe(lfo2, lg2, mod.gain);
    const amp = S.ac.createGain();
    hold(amp.gain, t0, t1, gain, fin, fout);
    pipe(noiseSrc(S, 'pink', t0, t1 - t0, 5), bp, mod, amp, post);
  };

  A.rain = (S, t0, t1, { gain = 0.35, fin = 0.6, fout = 0.3 } = {}) => {
    const post = chain(S, 1, 0.1);
    const amp = S.ac.createGain();
    hold(amp.gain, t0, t1, gain, fin, fout);
    pipe(noiseSrc(S, 'white', t0, t1 - t0, 21), filt(S, 'highpass', 900), filt(S, 'lowpass', 8000), amp);
    const low = S.ac.createGain();
    low.gain.value = 0.6;
    pipe(noiseSrc(S, 'brown', t0, t1 - t0, 22), filt(S, 'lowpass', 260), low, amp);
    amp.connect(post);
  };

  A.thunder = (S, t, { gain = 1, seed = 4 } = {}) => {
    const post = chain(S, gain, 0.6);
    const cg = S.ac.createGain();
    perc(cg.gain, t, 0.002, 0.9, 0.28);
    pipe(noiseSrc(S, 'white', t, 0.4, 31), filt(S, 'highpass', 600), cg, post);
    const rg = S.ac.createGain(), r = R.rng(seed);
    rg.gain.setValueAtTime(0.0001, t);
    rg.gain.exponentialRampToValueAtTime(0.9, t + 0.25);
    for (let k = 1; k < 13; k++) rg.gain.linearRampToValueAtTime((0.35 + 0.65 * r()) * Math.exp(-k * 0.28), t + 0.25 + k * 0.33);
    rg.gain.exponentialRampToValueAtTime(0.0001, t + 5);
    pipe(noiseSrc(S, 'brown', t, 5.1, 32), filt(S, 'lowpass', 220), rg, post);
  };

  A.whoosh = (S, t, { dur = 0.7, gain = 0.6, from = 300, to = 4000, verb = 0.3 } = {}) => {
    const post = chain(S, gain, verb);
    const bp = filt(S, 'bandpass', from, 1.5);
    bp.frequency.setValueAtTime(from, t);
    bp.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = S.ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + dur * 0.65);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    pipe(noiseSrc(S, 'white', t, dur, 41), bp, g, post);
  };

  /** Tensão subindo que corta seco em t1. */
  A.riser = (S, t0, t1, { gain = 0.5 } = {}) => {
    const post = chain(S, 1, 0.3);
    const amp = S.ac.createGain();
    amp.gain.setValueAtTime(0.001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t1 - 0.02);
    amp.gain.linearRampToValueAtTime(0, t1);
    const bp = filt(S, 'bandpass', 400, 3);
    bp.frequency.setValueAtTime(400, t0);
    bp.frequency.exponentialRampToValueAtTime(7000, t1);
    pipe(noiseSrc(S, 'white', t0, t1 - t0, 51), bp, amp);
    const o = osc(S, 'sawtooth', 70, t0, t1);
    o.frequency.exponentialRampToValueAtTime(420, t1);
    const og = S.ac.createGain();
    og.gain.value = 0.35;
    pipe(o, filt(S, 'lowpass', 1500), og, amp);
    amp.connect(post);
  };

  /** Nota de caixinha de música (parciais inarmônicos). detune em cents. */
  A.musicBox = (S, t, freq, { gain = 0.2, detune = 0, verb = 0.8 } = {}) => {
    const post = chain(S, gain, verb);
    for (const [mul, lv, dec] of [[1, 1, 1.8], [2.0, 0.35, 1.0], [3.98, 0.18, 0.5], [6.1, 0.06, 0.25]]) {
      const o = osc(S, 'sine', freq * mul, t, t + dec + 0.1);
      o.detune.value = detune;
      const g = S.ac.createGain();
      perc(g.gain, t, 0.003, lv, dec);
      pipe(o, g, post);
    }
  };

  A.click = (S, t, { gain = 0.22, seed = 1 } = {}) => {
    const post = chain(S, gain, 0.05);
    const g = S.ac.createGain();
    perc(g.gain, t, 0.001, 1, 0.03);
    pipe(noiseSrc(S, 'white', t, 0.05, 60 + (seed % 5)), filt(S, 'highpass', 2500), g, post);
    const o = osc(S, 'sine', 1200 + R.hash(seed, 61) * 600, t, t + 0.03);
    const og = S.ac.createGain();
    perc(og.gain, t, 0.001, 0.3, 0.015);
    pipe(o, og, post);
  };

  /** Chiado de fita + zumbido de 60 Hz. */
  A.vhsBed = (S, t0, t1, { gain = 0.2 } = {}) => {
    const post = chain(S, 1, 0);
    const amp = S.ac.createGain();
    hold(amp.gain, t0, t1, gain, 0.05, 0.05);
    const hiss = S.ac.createGain();
    hiss.gain.value = 0.5;
    pipe(noiseSrc(S, 'white', t0, t1 - t0, 71), filt(S, 'highpass', 4500), hiss, amp);
    for (const [fr, lv] of [[60, 0.3], [120, 0.15], [180, 0.12]]) {
      const g = S.ac.createGain();
      g.gain.value = lv;
      pipe(osc(S, 'sine', fr, t0, t1), g, amp);
    }
    const bz = S.ac.createGain();
    bz.gain.value = 0.08;
    pipe(osc(S, 'sawtooth', 60, t0, t1), filt(S, 'bandpass', 350, 1), bz, amp);
    amp.connect(post);
  };

  /** Fita entrando no videocassete: cliques mecânicos + motor. */
  A.tapeClunk = (S, t, { gain = 0.8 } = {}) => {
    const post = chain(S, gain, 0.15);
    [[0, 1500], [0.06, 700], [0.21, 1100], [0.33, 600]].forEach(([dt, fr], i) => {
      const g = S.ac.createGain();
      perc(g.gain, t + dt, 0.001, 0.9, 0.06);
      pipe(noiseSrc(S, 'white', t + dt, 0.1, 80 + i), filt(S, 'bandpass', fr, 2), g, post);
    });
    const o = osc(S, 'sawtooth', 35, t + 0.25, t + 1.0);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.9);
    const mg = S.ac.createGain();
    hold(mg.gain, t + 0.25, t + 1.0, 0.35, 0.1, 0.2);
    pipe(o, filt(S, 'lowpass', 320), mg, post);
  };

  /** Bip digital de glitch. */
  A.blip = (S, t, { gain = 0.35, dur = 0.09, seed = 1 } = {}) => {
    const post = chain(S, gain, 0.1);
    const o = osc(S, 'square', 600, t, t + dur);
    for (let k = 0; k * 0.015 < dur; k++) o.frequency.setValueAtTime(300 + R.hash(k, seed) * 1700, t + k * 0.015);
    const g = S.ac.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.setValueAtTime(0.0001, t + dur);
    pipe(o, g, post);
    const ng = S.ac.createGain();
    perc(ng.gain, t, 0.001, 0.6, dur);
    pipe(noiseSrc(S, 'white', t, dur, 90), filt(S, 'highpass', 2000), ng, post);
  };

  /** Estática de TV com estalos. */
  A.static = (S, t, dur, { gain = 0.5, seed = 3 } = {}) => {
    const post = chain(S, gain, 0.05);
    const g = S.ac.createGain();
    g.gain.setValueAtTime(0, t);
    for (let k = 0; k * 0.012 < dur; k++) {
      const e = 1 - (k * 0.012) / dur;
      g.gain.setValueAtTime((0.35 + 0.65 * R.hash(k, seed)) * (0.4 + 0.6 * e), t + k * 0.012);
    }
    g.gain.setValueAtTime(0, t + dur);
    pipe(noiseSrc(S, 'white', t, dur, 100 + seed), filt(S, 'bandpass', 2500, 0.4), g, post);
  };

  /** Susto: cluster dissonante distorcido + grito agudo + ruído. */
  A.sting = (S, t, { gain = 1 } = {}) => {
    const post = chain(S, gain, 0.7);
    const shaper = S.ac.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) curve[i] = Math.tanh(((i / 1023) * 2 - 1) * 6);
    shaper.curve = curve;
    const amp = S.ac.createGain();
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(0.5, t + 0.008);
    amp.gain.setValueAtTime(0.5, t + 0.35);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
    const mix = S.ac.createGain();
    mix.gain.value = 0.25;
    for (const fr of [110, 116.5, 164.8, 174.6, 233.1, 246.9]) pipe(osc(S, 'sawtooth', fr, t, t + 1.8), mix);
    pipe(mix, shaper, filt(S, 'lowpass', 4500), amp, post);
    for (const base of [1900, 2010]) {
      const o = osc(S, 'sine', base, t, t + 1.3);
      o.frequency.exponentialRampToValueAtTime(base * 1.45, t + 0.5);
      const vib = osc(S, 'sine', 11, t, t + 1.3);
      const vg = S.ac.createGain();
      vg.gain.value = 90;
      pipe(vib, vg, o.frequency);
      const g = S.ac.createGain();
      perc(g.gain, t, 0.01, 0.16, 1.1);
      pipe(o, g, post);
    }
    const ng = S.ac.createGain();
    perc(ng.gain, t, 0.002, 0.7, 0.4);
    pipe(noiseSrc(S, 'white', t, 0.5, 110), ng, post);
  };

  A.subDrop = (S, t, { gain = 0.9, dur = 1.4 } = {}) => {
    const post = chain(S, gain, 0.3);
    for (const [mul, type, lv] of [[1, 'sine', 1], [2, 'triangle', 0.3]]) {
      const o = osc(S, type, 110 * mul, t, t + dur + 0.1);
      o.frequency.exponentialRampToValueAtTime(28 * mul, t + dur);
      const g = S.ac.createGain();
      perc(g.gain, t, 0.01, lv, dur);
      pipe(o, g, post);
    }
  };

  /** Sussurro: ruído com "formantes" que mudam em sílabas aleatórias. */
  A.whisper = (S, t, dur, { gain = 0.25, seed = 5 } = {}) => {
    const post = chain(S, gain, 0.9);
    const bp1 = filt(S, 'bandpass', 1800, 6), bp2 = filt(S, 'bandpass', 3200, 8);
    const amp = S.ac.createGain();
    amp.gain.setValueAtTime(0, t);
    const r = R.rng(seed);
    let tt = t;
    while (tt < t + dur) {
      const seg = 0.12 + r() * 0.15;
      bp1.frequency.setValueAtTime(900 + r() * 1800, tt);
      bp2.frequency.setValueAtTime(2400 + r() * 1800, tt);
      amp.gain.linearRampToValueAtTime(0.4 + r() * 0.6, tt + seg * 0.4);
      amp.gain.linearRampToValueAtTime(0.05, tt + seg);
      tt += seg;
    }
    amp.gain.linearRampToValueAtTime(0, t + dur);
    const src = noiseSrc(S, 'white', t, dur, 120);
    src.connect(bp1);
    src.connect(bp2);
    bp1.connect(amp);
    bp2.connect(amp);
    amp.connect(post);
  };

  // ---- render / export ----

  /** Renderiza a trilha do projeto offline e normaliza o pico para -1 dBFS. */
  A.render = async (project, sr = A.SR) => {
    const ac = new OfflineAudioContext(2, Math.ceil(project.duration * sr), sr);
    const S = A.bus(ac);
    project.audio(S, A);
    const buf = await ac.startRendering();
    let peak = 0;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    }
    const k = peak > 0 ? 0.89 / peak : 1;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) d[i] *= k;
    }
    return buf;
  };

  A.wav = (buf) => {
    const ch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate;
    const ab = new ArrayBuffer(44 + len * ch * 2), v = new DataView(ab);
    const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF');
    v.setUint32(4, 36 + len * ch * 2, true);
    str(8, 'WAVEfmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, ch, true);
    v.setUint32(24, sr, true);
    v.setUint32(28, sr * ch * 2, true);
    v.setUint16(32, ch * 2, true);
    v.setUint16(34, 16, true);
    str(36, 'data');
    v.setUint32(40, len * ch * 2, true);
    const data = [...Array(ch)].map((_, c) => buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < len; i++) {
      for (let c = 0; c < ch; c++) {
        const s = R.clamp(data[c][i], -1, 1);
        v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        o += 2;
      }
    }
    return ab;
  };

  A.base64 = (ab) => {
    const bytes = new Uint8Array(ab);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };
})();
