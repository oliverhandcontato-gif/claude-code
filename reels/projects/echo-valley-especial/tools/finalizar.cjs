#!/usr/bin/env node
/*
 * Finaliza os vídeos renderizados: volume a -14,5 LUFS (loudnorm em duas passadas + limitador, pico < -1 dBTP),
 * vídeo copiado sem recompressão, nomes do documento e SRT da fala.
 *   node tools/finalizar.cjs parte1 parte2 completo
 * Entrada: out/ev-<versão>.mp4 (render.cjs --query parte=<versão> --out out/ev-<versão>.mp4)
 */
const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../../..');
const NOMES = { parte1: 'Tio_Arle_Echo_Valley_Parte_1', parte2: 'Tio_Arle_Echo_Valley_Parte_2', completo: 'Tio_Arle_Echo_Valley_Completo' };
const ff = (args) => {
  const r = spawnSync('ffmpeg', ['-nostdin', '-y', '-hide_banner', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(r.stderr.slice(-1500));
  return r.stderr;
};
fs.mkdirSync(path.join(ROOT, 'out/final'), { recursive: true });
for (const v of process.argv.slice(2)) {
  const src = path.join(ROOT, 'out', `ev-${v}.mp4`), dst = path.join(ROOT, 'out/final', `${NOMES[v]}.mp4`);
  const m = ff(['-i', src, '-af', 'loudnorm=I=-14.5:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-']);
  const j = JSON.parse(m.slice(m.lastIndexOf('{'), m.lastIndexOf('}') + 1));
  const ln = `loudnorm=I=-14.5:TP=-1.5:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`;
  ff(['-i', src, '-map', '0:v', '-map', '0:a', '-c:v', 'copy', '-af', `${ln},alimiter=limit=0.7:attack=1:release=60:level=false,aresample=48000`, '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', dst]);
  const chk = ff(['-i', dst, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const I = chk.match(/I:\s+(-?[\d.]+) LUFS/g).pop(), P = chk.match(/Peak:\s+(-?[\d.]+) dBFS/g).pop();
  fs.writeFileSync(dst.replace(/\.mp4$/, '.srt'), execFileSync('node', [path.join(__dirname, 'srt.cjs'), v]));
  const d = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=width,height', '-of', 'csv=p=0', dst], { encoding: 'utf8' }).stdout.trim().replace(/\n/g, ' ');
  console.log(`${path.basename(dst)}  ${d}  ${I}  ${P}`);
}
