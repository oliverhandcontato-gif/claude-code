#!/usr/bin/env node
/*
 * Prepara o footage: baixa cada clipe (Mixkit ou Pixabay — ver scripts/stock.cjs)
 * e extrai os quadros do trecho usado, num recorte vertical com folga para movimentos de câmera.
 *   node projects/echo-valley-segredo/prepare.cjs
 * Saída (fora do git): out/cache/clips/*.mp4 e out/cache/echo-valley-segredo/NN/*.jpg + manifest.json
 */
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const NAME = path.basename(__dirname);
const { shots, end } = require('./shots.json');
const CLIPS = path.join(ROOT, 'out/cache/clips');
const OUT = path.join(ROOT, 'out/cache', NAME);
const FPS = 30, MAX_SPEED = 1.6;

const probe = (f, entries) => spawnSync('ffprobe', ['-v', 'error', ...entries, '-of', 'csv=p=0', f]).stdout.toString().trim();
const valid = (f) => fs.existsSync(f) && probe(f, ['-show_entries', 'format=duration']) !== '';

const { fetchClip } = require('../../scripts/stock.cjs');

fs.mkdirSync(CLIPS, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });
const manifest = [];
shots.forEach((s, i) => {
  const file = fetchClip(s, CLIPS);
  const dur = Number(probe(file, ['-show_entries', 'format=duration']));
  const [w, h] = probe(file, ['-select_streams', 'v:0', '-show_entries', 'stream=width,height']).split(',').map(Number);
  const shotDur = (shots[i + 1] ? shots[i + 1].t : end) - s.t;
  const need = shotDur * MAX_SPEED + 0.5;
  const ss = Math.max(0, Math.min(s.ss, dur - need));
  const cw = Math.min(w, Math.round(h * 0.75));
  const cx = Math.round(Math.max(0, Math.min(w - cw, w * s.fx - cw / 2)));
  const dir = path.join(OUT, String(i).padStart(2, '0'));
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir);
  execFileSync('ffmpeg', ['-v', 'error', '-ss', String(ss), '-i', file, '-t', String(need), '-vf', `fps=${FPS},crop=${cw}:${h}:${cx}:0,scale=-2:${Math.min(h, 1080)}`, '-q:v', '3', path.join(dir, '%04d.jpg')]);
  const count = fs.readdirSync(dir).length;
  manifest.push({ dir: String(i).padStart(2, '0'), count, src: `${w}x${h}` });
  console.log(`${String(i).padStart(2, '0')} ${s.id} ${w}x${h} ${shotDur.toFixed(2)}s -> ${count} quadros  (${s.label})`);
});
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ fps: FPS, shots: manifest }));
