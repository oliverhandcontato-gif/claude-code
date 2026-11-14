// Deterministic frame renderer: opens index.html in headless Chromium and writes PNG frames.
// usage: node tools/render.mjs --from 0 --to 5359 --step 1 --workers 4 --out out/frames [--scale 1]
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1]]]) : a), []));
const from = +(args.from || 0), to = +(args.to || 5359), step = +(args.step || 1), workers = +(args.workers || 4);
const out = path.resolve(args.out || 'out/frames');
const list = args.list ? args.list.split(',').map(Number) : null;
fs.mkdirSync(out, { recursive: true });
const frames = list || [];
if (!list) for (let f = from; f <= to; f += step) frames.push(f);
const page0 = 'file://' + path.resolve('index.html') + '#render';
const browser = await chromium.launch({ args: ['--disable-gpu-vsync'] });
let next = 0, done = 0;
const t0 = Date.now();
async function worker(id) {
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(page0);
  await p.waitForFunction(() => window.A && A.SHOTS && A.SHOTS.length > 0);
  await p.evaluate(() => document.fonts.ready);
  while (next < frames.length) {
    const f = frames[next++];
    const b64 = await p.evaluate((fr) => {
      const c = document.getElementById('c');
      A.renderFrame(c.getContext('2d'), fr);
      return c.toDataURL('image/png').slice(22);
    }, f);
    fs.writeFileSync(path.join(out, `f${String(f).padStart(5, '0')}.png`), Buffer.from(b64, 'base64'));
    done++;
    if (errs.length) { console.error('frame', f, errs.join('\n')); errs.length = 0; }
    if (done % 100 === 0) console.log(`${done}/${frames.length} frames, ${((Date.now() - t0) / done).toFixed(0)} ms/frame`);
  }
  await p.close();
}
await Promise.all(Array.from({ length: workers }, (_, i) => worker(i)));
await browser.close();
console.log(`rendered ${done} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
