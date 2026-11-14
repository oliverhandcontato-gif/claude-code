// Contact sheet of given seconds: node tools/frames.mjs out.png 1 2.5 ...
import { chromium } from 'playwright';
import path from 'path'; import fs from 'fs';
const [out, ...ts] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = []; p.on('pageerror', (e) => errs.push(String(e.stack || e)));
await p.goto('file://' + path.resolve('index.html') + '#render');
const url = await p.evaluate((times) => {
  const c = document.getElementById('c'), ctx = c.getContext('2d');
  const cols = times.length > 4 ? 3 : 2, W = 640, H = 360, rows = Math.ceil(times.length / cols);
  const sh = document.createElement('canvas'); sh.width = cols * W; sh.height = rows * H; const s = sh.getContext('2d');
  times.forEach((t, i) => { const n = A.renderFrame(ctx, Math.round(t * 24)); s.drawImage(c, (i % cols) * W, Math.floor(i / cols) * H, W, H); s.fillStyle = '#000'; s.font = '14px sans-serif'; s.fillText(t + 's ' + n, (i % cols) * W + 6, Math.floor(i / cols) * H + 16); });
  return sh.toDataURL('image/png');
}, ts.map(Number));
fs.writeFileSync(out, Buffer.from(url.slice(22), 'base64'));
if (errs.length) console.log(errs.slice(0, 4).join('\n'));
await b.close();
