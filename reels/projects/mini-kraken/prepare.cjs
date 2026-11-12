#!/usr/bin/env node
/*
 * Extrai os quadros de cada corte da gravação de tela do app (vertical, do celular).
 *   node projects/mini-kraken/prepare.cjs /caminho/da/gravacao.mp4 [índices]
 * Saída (fora do git): out/cache/mini-kraken/NN/*.jpg + manifest.json
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const NAME = path.basename(__dirname);
const SRC = process.argv[2];
if (!SRC || !fs.existsSync(SRC)) throw new Error('uso: node prepare.cjs <gravacao.mp4> [índices]');
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '');
const words = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets/palavras.json'), 'utf8'));
const { duracao, trechos } = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets/trechos.json'), 'utf8'));
const { shots } = JSON.parse(fs.readFileSync(path.join(__dirname, 'shots.json'), 'utf8'));
const END = Math.ceil((duracao + 0.8) * 10) / 10;
const ts = shots.map((s) => {
  const tr = trechos[s.tr];
  let t = s.end ? tr.fim : tr.ini;
  if (s.w) t = words.filter((x) => x.trecho === s.tr && norm(x.w).startsWith(norm(s.w)))[s.n || 0].s;
  return Math.max(0, t + (s.d || 0) - (s.w ? 0.04 : 0));
});
ts[0] = 0;
const OUT = path.join(ROOT, 'out/cache', NAME);
fs.mkdirSync(OUT, { recursive: true });
const only = process.argv[3] ? new Set(process.argv[3].split(',').map(Number)) : null;
const old = fs.existsSync(path.join(OUT, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'))).shots : [];
const manifest = [];
shots.forEach((s, i) => {
  const dirName = String(i).padStart(2, '0');
  if (only && !only.has(i) && old[i]) return manifest.push(old[i]);
  const dur = (ts[i + 1] ?? END) - ts[i];
  const need = dur * (s.sp || 1) + 0.4;
  const dir = path.join(OUT, dirName);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir);
  execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-ss', String(s.src), '-i', SRC, '-t', String(need), '-vf', 'fps=30,scale=1080:-2', '-q:v', '3', path.join(dir, '%04d.jpg')]);
  const count = fs.readdirSync(dir).length;
  manifest.push({ dir: dirName, count });
  console.log(`${dirName} src=${s.src}s t=${ts[i].toFixed(2)} ${dur.toFixed(2)}s -> ${count} quadros  (${s.label})`);
});
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ fps: 30, shots: manifest }));
