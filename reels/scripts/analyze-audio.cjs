#!/usr/bin/env node
/*
 * Analisa um arquivo de áudio e gera curvas por frame para animar o visual no ritmo do som:
 *   level: volume geral (RMS)      bass: energia dos graves      onset: ataques/batidas
 *
 *   node scripts/analyze-audio.cjs <audio> <saida.json> [--fps 30]
 */
const { spawnSync } = require('child_process');
const fs = require('fs');

const [input, output] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const fpsArg = process.argv.indexOf('--fps');
const FPS = fpsArg > 0 ? Number(process.argv[fpsArg + 1]) : 30;
if (!input || !output) {
  console.error('uso: node scripts/analyze-audio.cjs <audio> <saida.json> [--fps 30]');
  process.exit(1);
}

const SR = 48000;
const pcm = spawnSync('ffmpeg', ['-v', 'error', '-i', input, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
if (pcm.status !== 0) {
  console.error(pcm.stderr.toString());
  process.exit(1);
}
const x = new Float32Array(pcm.stdout.buffer, pcm.stdout.byteOffset, pcm.stdout.length / 4);
const hop = SR / FPS, n = Math.floor(x.length / hop);

// passa-baixa de 1 polo (~150 Hz) para os graves
const a = Math.exp((-2 * Math.PI * 150) / SR);
let lp = 0;
const rms = new Float32Array(n), low = new Float32Array(n);
for (let f = 0; f < n; f++) {
  let s = 0, b = 0;
  for (let i = Math.floor(f * hop); i < Math.floor((f + 1) * hop); i++) {
    lp = a * lp + (1 - a) * x[i];
    s += x[i] * x[i];
    b += lp * lp;
  }
  rms[f] = Math.sqrt(s / hop);
  low[f] = Math.sqrt(b / hop);
}

const pct = (arr, p) => [...arr].sort((u, v) => u - v)[Math.floor(arr.length * p)] || 1;
const norm = (arr) => {
  const ref = pct(arr, 0.97);
  return arr.map((v) => Math.min(1, v / ref));
};
// envelope com ataque rápido e soltura lenta
const smooth = (arr, att = 0.6, rel = 0.15) => {
  const out = new Float32Array(arr.length);
  let e = 0;
  arr.forEach((v, i) => {
    e += (v - e) * (v > e ? att : rel);
    out[i] = e;
  });
  return out;
};

const level = smooth(norm(rms));
const bass = smooth(norm(low), 0.7, 0.12);
const flux = rms.map((v, i) => Math.max(0, v - (rms[i - 1] + (rms[i - 2] ?? 0) + (rms[i - 3] ?? 0)) / 3 || 0));
const onset = norm(flux);

const r3 = (arr) => Array.from(arr, (v) => Math.round(v * 1000) / 1000);
fs.writeFileSync(output, JSON.stringify({ fps: FPS, duration: x.length / SR, level: r3(level), bass: r3(bass), onset: r3(onset) }));
console.log(`ok: ${n} frames (${(x.length / SR).toFixed(2)}s) -> ${output}`);
