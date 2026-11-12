/* Resolve os cortes de shots.json para segundos, a partir dos tempos da voz.
 * Usado por prepare.cjs (Node) — o scene.js faz a mesma conta no navegador. */
const fs = require('fs');
const path = require('path');
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '');
function resolve(shots, words, trechos) {
  return shots.map((s) => {
    const tr = trechos[s.tr];
    let t = s.end ? tr.fim : tr.ini;
    if (s.w) {
      const m = words.filter((x) => x.trecho === s.tr && norm(x.w).startsWith(norm(s.w)));
      if (!m.length) throw new Error(`palavra "${s.w}" não achada no trecho ${s.tr}`);
      t = m[Math.min(s.n || 0, m.length - 1)].s;
    }
    return Math.max(0, Math.round((t + (s.d || 0) - (s.w ? 0.04 : 0)) * 1000) / 1000);
  });
}
function load(dir) {
  const A = path.join(dir, '../regras-fabrica/assets');
  const words = JSON.parse(fs.readFileSync(path.join(A, 'palavras.json'), 'utf8'));
  const { duracao, trechos } = JSON.parse(fs.readFileSync(path.join(A, 'trechos.json'), 'utf8'));
  const { shots } = JSON.parse(fs.readFileSync(path.join(dir, 'shots.json'), 'utf8'));
  const ts = resolve(shots, words, trechos);
  ts[0] = 0;
  return { shots, ts, end: Math.ceil((duracao + 0.6) * 10) / 10 };
}
module.exports = { resolve, load, norm };
