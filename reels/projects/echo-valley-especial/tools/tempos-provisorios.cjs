#!/usr/bin/env node
/*
 * Sem a locução gravada: gera tempos PROVISÓRIOS por palavra (≈2,6 palavras/s, pausas na pontuação),
 * no mesmo formato de tools/palavras.py, para montar a PRÉVIA SEM LOCUÇÃO.
 *   node tools/tempos-provisorios.cjs parte1
 * Quando a voz chegar: python3 -I tools/palavras.py <voz.wav> parte1  (substitui estes arquivos).
 */
const fs = require('fs');
const path = require('path');
const parte = process.argv[2] || 'parte1';
const DIR = path.resolve(__dirname, '..');
const { blocos } = JSON.parse(fs.readFileSync(path.join(DIR, `${parte}.json`), 'utf8'));
const out = [], trechos = [];
let t = 0.6;
blocos.forEach((txt, i) => {
  const ini = t;
  for (const w of txt.split(/\s+/)) {
    const d = 0.25 + w.replace(/[^\p{L}\p{N}]/gu, '').length * 0.035;
    out.push({ w, s: +t.toFixed(3), e: +(t + d).toFixed(3), trecho: i });
    t += d + (/[.?!]$/.test(w) ? 0.45 : /[,:]$/.test(w) ? 0.22 : 0.04);
  }
  trechos.push({ i, texto: txt, ini: +ini.toFixed(3), fim: +(t - 0.45).toFixed(3) });
  t += 0.55;
});
const A = path.join(DIR, 'assets', parte);
fs.mkdirSync(A, { recursive: true });
fs.writeFileSync(path.join(A, 'palavras.json'), JSON.stringify(out));
fs.writeFileSync(path.join(A, 'trechos.json'), JSON.stringify({ duracao: +(t + 0.6).toFixed(3), provisorio: true, trechos }, null, 1));
console.log(`${parte}: ${out.length} palavras, ${(t + 0.6).toFixed(1)} s (PROVISÓRIO)`);
