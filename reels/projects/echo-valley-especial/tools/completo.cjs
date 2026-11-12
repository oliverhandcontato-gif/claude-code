#!/usr/bin/env node
/*
 * Monta completo.json (versão única, seção 7 do documento) a partir de parte1.json e parte2.json:
 * Parte 1 até "Cada formato mostra um pedaço diferente do universo." (sem a chamada para a parte 2),
 * a abertura da parte 2 ("Em Echo Valley, eu prestaria atenção em duas coisas…") como ponte,
 * sem o parágrafo de reapresentação (bloco 1 da parte 2). Sem "Parte 1/2" na tela.
 *   node tools/completo.cjs && python3 -I tools/completo_voz.py   (voz: recortes das duas locuções já montadas)
 */
const fs = require('fs');
const path = require('path');
const D = path.resolve(__dirname, '..');
const p1 = JSON.parse(fs.readFileSync(path.join(D, 'parte1.json'), 'utf8'));
const p2 = JSON.parse(fs.readFileSync(path.join(D, 'parte2.json'), 'utf8'));
const corte1 = p1.blocos.findIndex((b) => typeof b === 'string' && b.includes('Cada formato mostra'));
const blocos = p1.blocos.slice(0, corte1 + 1);
const planos = p1.planos.filter((p) => p.b <= corte1).map((p) => ({ ...p }));
const map = {}; // bloco da parte 2 -> bloco da versão única
p2.blocos.forEach((b, i) => {
  if (i === 1) return; // reapresentação
  map[i] = blocos.length;
  blocos.push(b);
});
for (const p of p2.planos) {
  if (map[p.b] === undefined) continue;
  const q = { ...p, b: map[p.b] };
  if (p.b === 0 && !p.w) delete q.destaque; // segue o fluxo, sem novo gancho
  planos.push(q);
}
const out = { _doc: 'Gerado por tools/completo.cjs — não editar à mão; edite parte1.json/parte2.json.', titulo: 'O que é Echo Valley? Conheça esse universo de terror', blocos, planos };
fs.writeFileSync(path.join(D, 'completo.json'), JSON.stringify(out, null, 1));
console.log(`completo: ${blocos.length} blocos, ${planos.length} planos`);
