#!/usr/bin/env node
/*
 * Renderiza um projeto em MP4 (1080x1920, H.264 + AAC).
 *
 *   node render.cjs [projects/echo-valley] [--out out/arquivo.mp4] [--from 0] [--to 42]
 *                   [--workers 3] [--crf 24] [--stills 1,12.5,30]
 *
 * Abre a página no Chromium headless (Playwright), pede cada frame como JPEG,
 * renderiza a trilha com OfflineAudioContext e junta tudo no ffmpeg.
 * --stills salva PNGs dos instantes (em segundos) em out/stills/ sem gerar vídeo.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { once } = require('events');
const { chromium } = require('playwright');
const { serve } = require('./scripts/serve.cjs');

const ROOT = __dirname;

function parseArgs(argv) {
  const o = { project: 'projects/echo-valley' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) o[a.slice(2)] = argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined ? true : argv[++i];
    else o.project = a;
  }
  return o;
}

async function openPage(browser, url) {
  const context = await browser.newContext({ viewport: { width: 540, height: 960 } });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error('[página]', e.message));
  page.on('console', (m) => m.type() === 'error' && console.error('[console]', m.text()));
  await page.goto(url);
  await page.waitForFunction(() => window.Reel && window.Reel.ready === true, null, { timeout: 120000 });
  return page;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectDir = path.resolve(ROOT, args.project);
  const name = path.basename(projectDir);
  const outDir = path.join(ROOT, 'out');
  fs.mkdirSync(outDir, { recursive: true });

  const { server, port } = await serve(ROOT);
  const url = `http://127.0.0.1:${port}/${path.relative(ROOT, projectDir).split(path.sep).join('/')}/index.html?render=1`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const first = await openPage(browser, url);
    const info = await first.evaluate(() => ({ duration: Reel.project.duration, fps: Reel.FPS, total: Reel.totalFrames, audioFile: Reel.project.audioFile || null,
      audioEnd: Reel.project.audioEnd || null, sfxGain: Reel.project.sfxGain ?? 0.5, hasSynth: typeof Reel.project.audio === 'function' }));

    if (args.stills) {
      const dir = path.join(outDir, 'stills');
      fs.mkdirSync(dir, { recursive: true });
      for (const s of String(args.stills).split(',').map(Number)) {
        const i = Math.min(info.total - 1, Math.round(s * info.fps));
        const b64 = await first.evaluate(async (i) => Reel.framePNG(i), i);
        const file = path.join(dir, `${name}-${s.toFixed(2)}s.png`);
        fs.writeFileSync(file, Buffer.from(b64, 'base64'));
        console.log('still:', path.relative(process.cwd(), file));
      }
      return;
    }

    const from = Math.round((Number(args.from) || 0) * info.fps);
    const to = Math.min(info.total, args.to !== undefined ? Math.round(Number(args.to) * info.fps) : info.total);
    const out = path.resolve(args.out || path.join(outDir, `${name}.mp4`));
    // Trilha: arquivo do projeto (voz/música prontas), som sintetizado pelo código, ou os dois mixados.
    const clipDur = (to - from) / info.fps;
    const t0 = from / info.fps;
    const afade = Math.min(0.3, clipDur / 4);
    const synthWav = path.join(outDir, `${name}.wav`);
    if (info.hasSynth) {
      console.log(`Áudio: sintetizando efeitos (${info.duration}s)…`);
      fs.writeFileSync(synthWav, Buffer.from(await first.evaluate(() => Reel.audioWAVBase64()), 'base64'));
    }
    const audioArgs = [];
    let filter;
    if (info.audioFile) {
      const file = path.join(projectDir, info.audioFile);
      const fileDur = Math.max(0.1, Math.min(clipDur, (info.audioEnd ?? info.duration) - t0));
      console.log(`Áudio: ${path.relative(ROOT, file)}${info.hasSynth ? ' + efeitos' : ''}`);
      audioArgs.push('-ss', String(t0), '-t', String(fileDur), '-i', file);
      const fileFade = info.audioEnd ? Math.min(0.12, fileDur / 4) : afade;
      filter = `[1:a]aresample=48000,aformat=channel_layouts=stereo,afade=t=out:st=${(fileDur - fileFade).toFixed(3)}:d=${fileFade},apad[a]`;
      if (info.hasSynth) {
        audioArgs.push('-ss', String(t0), '-t', String(clipDur), '-i', synthWav);
        filter += `;[2:a]aresample=48000,volume=${info.sfxGain}[b];[a][b]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.89[m];[m]`;
      } else filter += ';[a]';
    } else {
      audioArgs.push('-ss', String(t0), '-t', String(clipDur), '-i', synthWav);
      filter = '[1:a]';
    }
    filter += `atrim=0:${clipDur.toFixed(3)},afade=t=out:st=${(clipDur - afade).toFixed(3)}:d=${afade}[aout]`;

    const nWorkers = Math.max(1, Number(args.workers) || Math.min(3, os.cpus().length - 1));
    const pages = [first];
    while (pages.length < nWorkers) pages.push(await openPage(browser, url));

    const ff = spawn('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(info.fps), '-c:v', 'mjpeg', '-i', '-',
      ...audioArgs,
      '-filter_complex', filter, '-map', '0:v', '-map', '[aout]',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', String(args.crf || 24), '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
      '-movflags', '+faststart', '-shortest', out,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const ffDone = once(ff, 'close');

    let next = from, writeIdx = from;
    const pending = new Map();
    const tStart = Date.now();
    const flush = async () => {
      while (pending.has(writeIdx)) {
        const buf = pending.get(writeIdx);
        pending.delete(writeIdx);
        writeIdx++;
        if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
        const done = writeIdx - from;
        if (done % 30 === 0 || writeIdx === to) {
          const el = (Date.now() - tStart) / 1000, fps = done / el;
          process.stdout.write(`\rFrames ${done}/${to - from}  ${fps.toFixed(1)} fps  ETA ${Math.max(0, (to - writeIdx) / fps).toFixed(0)}s   `);
        }
      }
    };
    await Promise.all(pages.map(async (page) => {
      for (;;) {
        const i = next++;
        if (i >= to) break;
        const b64 = await page.evaluate(async (i) => Reel.frameJPEG(i, 0.93), i);
        pending.set(i, Buffer.from(b64, 'base64'));
        await flush();
      }
    }));
    ff.stdin.end();
    const [code] = await ffDone;
    process.stdout.write('\n');
    if (code !== 0) throw new Error(`ffmpeg saiu com código ${code}`);
    console.log(`Pronto: ${path.relative(process.cwd(), out)}`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
