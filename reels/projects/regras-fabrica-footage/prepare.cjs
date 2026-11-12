#!/usr/bin/env node
/*
 * Prepara o footage: baixa cada clipe do Mixkit (1080p, ou 720p quando o 1080p não é público)
 * e extrai os quadros do trecho usado, num recorte vertical com folga para movimentos de câmera.
 *   node projects/regras-fabrica-footage/prepare.cjs
 * Saída (fora do git): out/cache/clips/*.mp4 e out/cache/regras-fabrica-footage/NN/*.jpg + manifest.json
 */
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { load } = require('./timeline.cjs');

const ROOT = path.resolve(__dirname, '../..');
const NAME = path.basename(__dirname);
const { shots, ts, end } = load(__dirname);
const CLIPS = path.join(ROOT, 'out/cache/clips');
const OUT = path.join(ROOT, 'out/cache', NAME);
const FPS = 30, MAX_SPEED = 1.4;

const probe = (f, entries) => spawnSync('ffprobe', ['-v', 'error', ...entries, '-of', 'csv=p=0', f]).stdout.toString().trim();
const valid = (f) => fs.existsSync(f) && probe(f, ['-show_entries', 'format=duration']) !== '';

function download(id) {
  const file = path.join(CLIPS, `${id}.mp4`);
  if (valid(file)) return file;
  for (const q of ['1080', '720']) {
    for (let k = 0; k < 3; k++) {
      spawnSync('curl', ['-s', '-f', '-m', '400', '-o', file, `https://assets.mixkit.co/videos/${id}/${id}-${q}.mp4`]);
      if (valid(file)) return file;
    }
  }
  throw new Error(`não consegui baixar o clipe ${id}`);
}

fs.mkdirSync(CLIPS, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });
const only = process.argv[2] !== undefined ? new Set(process.argv[2].split(',').map(Number)) : null;
const old = fs.existsSync(path.join(OUT, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'))).shots : [];
const manifest = [];
shots.forEach((s, i) => {
  const dirName = String(i).padStart(2, '0');
  if (only && !only.has(i) && old[i]) return manifest.push(old[i]);
  const file = download(s.id);
  const dur = Number(probe(file, ['-show_entries', 'format=duration']));
  const [w, h] = probe(file, ['-select_streams', 'v:0', '-show_entries', 'stream=width,height']).split(',').map(Number);
  const shotDur = (ts[i + 1] ?? end) - ts[i];
  const need = shotDur * MAX_SPEED + 0.5;
  const ss = Math.max(0, Math.min(s.ss ?? dur * (s.ssp ?? 0.3), dur - need));
  const cw = Math.min(w, Math.round(h * 0.75));
  const cx = Math.round(Math.max(0, Math.min(w - cw, w * s.fx - cw / 2)));
  const dir = path.join(OUT, dirName);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir);
  execFileSync('ffmpeg', ['-v', 'error', '-ss', String(ss), '-i', file, '-t', String(need), '-vf', `fps=${FPS},crop=${cw}:${h}:${cx}:0,scale=-2:${Math.min(h, 1080)}`, '-q:v', '3', path.join(dir, '%04d.jpg')]);
  const count = fs.readdirSync(dir).length;
  manifest.push({ dir: dirName, count, src: `${w}x${h}` });
  console.log(`${dirName} ${String(s.id).padEnd(6)} ${w}x${h} t=${ts[i].toFixed(2)} ${shotDur.toFixed(2)}s -> ${count} quadros  (${s.label})`);
});
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ fps: FPS, shots: manifest }));
