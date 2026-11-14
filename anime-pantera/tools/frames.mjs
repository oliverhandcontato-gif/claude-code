// Render specific frames (by second) into a contact sheet for review.
// usage: node tools/frames.mjs out.png 1.0 5.2 8.0 ...  (optional --w 640)
import { chromium } from 'playwright';
import path from 'path';
const args = process.argv.slice(2);
const out = args.shift();
const times = args.map(Number);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e.stack || e)));
await p.goto('file://' + path.resolve('index.html') + '#render');
await p.evaluate(() => document.fonts.ready);
const cols = times.length <= 4 ? 2 : 3;
const W = 640, H = 360;
const html = await p.evaluate(async ({ times, cols, W, H }) => {
  const c = document.getElementById('c'), ctx = c.getContext('2d');
  const sheet = document.createElement('canvas');
  const rows = Math.ceil(times.length / cols);
  sheet.width = cols * W; sheet.height = rows * H;
  const s = sheet.getContext('2d');
  const t0 = performance.now();
  times.forEach((t, i) => {
    const f = Math.round(t * A.CFG.fps);
    const name = A.renderFrame(ctx, f);
    s.drawImage(c, (i % cols) * W, Math.floor(i / cols) * H, W, H);
    s.fillStyle = 'rgba(0,0,0,0.6)'; s.fillRect((i % cols) * W, Math.floor(i / cols) * H, W, 22);
    s.fillStyle = '#fff'; s.font = '14px sans-serif'; s.fillText(t.toFixed(2) + 's ' + name, (i % cols) * W + 6, Math.floor(i / cols) * H + 16);
  });
  return { url: sheet.toDataURL('image/png'), ms: (performance.now() - t0) / times.length };
}, { times, cols, W, H });
const fs = await import('fs');
fs.writeFileSync(out, Buffer.from(html.url.slice(22), 'base64'));
console.log('ms/frame', html.ms.toFixed(0));
if (errs.length) console.log(errs.slice(0, 5).join('\n'));
await b.close();
