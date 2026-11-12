#!/usr/bin/env node
/*
 * Extrai os quadros usados em cada plano a partir dos vídeos originais (que não vão para o git).
 *   node projects/echo-valley-especial/prepare.cjs <pasta-dos-videos> parte1
 * Os originais não são alterados. Saída: out/cache/echo-valley-especial/<parte>/NN_k/*.jpg + manifest.json
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../..');
const [REFS, parte = 'parte1'] = process.argv.slice(2);
if (!REFS || !fs.existsSync(REFS)) throw new Error('uso: node prepare.cjs <pasta-dos-videos> [parte1|parte2]');
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const tl = JSON.parse(fs.readFileSync(path.join(__dirname, `${parte}.json`), 'utf8'));
const words = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets', parte, 'palavras.json'), 'utf8'));
const { duracao, trechos } = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets', parte, 'trechos.json'), 'utf8'));
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '');
const ts = tl.planos.map((p, i) => {
  if (i === 0) return 0;
  let t = trechos[p.b].ini - 0.2;
  if (p.w) t = words.filter((x) => x.trecho === p.b && norm(x.w).startsWith(norm(p.w)))[p.n || 0].s - 0.05;
  return Math.max(0, t);
});
const OUT = path.join(ROOT, 'out/cache', path.basename(__dirname), parte);
fs.mkdirSync(OUT, { recursive: true });
const manifest = { fps: 30, planos: [] };
tl.planos.forEach((p, i) => {
  const dur = ((ts[i + 1] ?? duracao + 0.6) - ts[i]) * (p.sp || 1) + 0.3;
  let items = [[p.ref, p.in]];
  if (p.tipo === 'dividido') items = [[p.ref.split('+')[0], p.in], [p.ref.split('+')[1], p.in2]];
  if (p.tipo === 'trio') items = p.trio.map(([r, s]) => [r, s]);
  const out = items.map(([ref, ss], k) => {
    const src = path.join(REFS, cfg.referencias[ref]);
    const dir = path.join(OUT, `${String(i).padStart(2, '0')}_${k}`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-ss', String(ss), '-i', src, '-t', String(dur), '-vf', 'fps=30,scale=w=min(iw\\,1080):h=-2', '-q:v', '3', path.join(dir, '%04d.jpg')]);
    const n = fs.readdirSync(dir).length;
    return { dir: path.relative(OUT, dir), count: n, ref, in: ss };
  });
  manifest.planos.push({ items: out });
  console.log(`${String(i).padStart(2, '0')} t=${ts[i].toFixed(2)} ${dur.toFixed(2)}s ${items.map(([r, s]) => r + '@' + s).join(' + ')}`);
});
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest));
