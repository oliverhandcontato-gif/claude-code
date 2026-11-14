// Verifies shots cover the whole duration with no gaps/overlaps.
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await b.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
await p.goto('file://' + path.resolve('index.html') + '#render');
const r = await p.evaluate(() => {
  const s = A.SHOTS.slice().sort((a, b) => a.t0 - b.t0);
  const issues = [];
  let t = 0;
  for (const x of s) { if (Math.abs(x.t0 - t) > 1e-6) issues.push(`gap/overlap at ${t.toFixed(2)} -> ${x.t0.toFixed(2)} (${x.name})`); t = x.t1; }
  if (t < A.CFG.duration) issues.push('ends early at ' + t);
  return { n: s.length, issues };
});
console.log(r.n, 'shots'); console.log(r.issues.join('\n') || 'timeline OK'); if (errs.length) console.log(errs.join('\n'));
await b.close();
