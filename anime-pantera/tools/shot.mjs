// usage: node tools/shot.mjs <html relative to project> <jsExpr> <out.png>
import { chromium } from 'playwright';
import path from 'path';
const [,, html, expr, out] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = [];
p.on('pageerror', e => errs.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + path.resolve(html));
await p.waitForTimeout(150);
try { await p.evaluate(expr); } catch (e) { errs.push(String(e)); }
await (await p.$('canvas')).screenshot({ path: out });
if (errs.length) console.log(errs.join('\n'));
await b.close();
