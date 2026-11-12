#!/usr/bin/env node
/* Gera o SRT da fala do Tio Arle (mesmos blocos de 4–8 palavras da legenda gravada no vídeo).
 *   node tools/srt.cjs parte1 > saida.srt */
const fs = require('fs');
const path = require('path');
const parte = process.argv[2] || 'parte1';
const A = path.join(__dirname, '..', 'assets', parte);
const words = JSON.parse(fs.readFileSync(path.join(A, 'palavras.json'), 'utf8'));
const { trechos } = JSON.parse(fs.readFileSync(path.join(A, 'trechos.json'), 'utf8'));
const caps = [];
trechos.forEach((tr) => {
  const ws = words.filter((w) => w.trecho === tr.i);
  let cur = [];
  ws.forEach((w, i) => {
    cur.push(w);
    if (/[.?!:]$/.test(w.w) || (/,$/.test(w.w) && cur.length >= 4) || cur.length >= 8 || i === ws.length - 1) {
      caps.push(cur);
      cur = [];
    }
  });
});
const ts = (s) => {
  const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, ss = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
};
caps.forEach((c, i) => {
  const t0 = c[0].s - 0.05, t1 = Math.min(c[c.length - 1].e + 0.5, caps[i + 1] ? caps[i + 1][0].s - 0.08 : 1e9);
  process.stdout.write(`${i + 1}\n${ts(t0)} --> ${ts(t1)}\n${c.map((w) => w.w).join(' ')}\n\n`);
});
