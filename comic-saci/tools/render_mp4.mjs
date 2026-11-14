// Full deterministic render to MP4: N parallel workers each render a contiguous chunk of frames
// and pipe PNGs to their own ffmpeg; chunks are concatenated and muxed with the song.
// usage: node tools/render_mp4.mjs [--workers 4] [--from 0] [--to 5359] [--crf 16] [--out out/pantera.mp4]
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1]]]) : a), []));
const workers = +(args.workers || 4), crf = args.crf || '16';
const fps = 24, total = Math.round(20.6 * fps);
const from = +(args.from || 0), to = Math.min(+(args.to || total - 1), total - 1);
const outFile = path.resolve(args.out || 'out/capitao_saci.mp4');
const tmp = path.resolve('out/chunks');
fs.mkdirSync(tmp, { recursive: true });
const browser = await chromium.launch();
const n = to - from + 1, per = Math.ceil(n / workers);
const t0 = Date.now();
let done = 0;
async function chunk(i) {
  const a = from + i * per, b = Math.min(to, a + per - 1);
  if (a > b) return null;
  const file = path.join(tmp, `chunk${i}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', crf, '-pix_fmt', 'yuv420p', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('pageerror', (e) => console.error('pageerror', String(e)));
  await p.goto('file://' + path.resolve('index.html') + '#render');
  await p.evaluate(() => document.fonts.ready);
  for (let f = a; f <= b; f++) {
    const b64 = await p.evaluate((fr) => { const c = document.getElementById('c'); A.renderFrame(c.getContext('2d'), fr); return c.toDataURL('image/png').slice(22); }, f);
    const buf = Buffer.from(b64, 'base64');
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    done++;
    if (done % 240 === 0) console.log(`${done}/${n} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await p.close();
  return file;
}
const files = (await Promise.all(Array.from({ length: workers }, (_, i) => chunk(i)))).filter(Boolean);
await browser.close();
const list = path.join(tmp, 'list.txt');
fs.writeFileSync(list, files.map((f) => `file '${f}'`).join('\n'));
const ss = (from / fps).toFixed(4), dur = (n / fps).toFixed(4);
execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-ss', ss, '-t', dur, '-i', path.resolve(args.audio || 'out/saci_audio.wav'),
  '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', outFile]);
console.log(`done: ${outFile} (${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
