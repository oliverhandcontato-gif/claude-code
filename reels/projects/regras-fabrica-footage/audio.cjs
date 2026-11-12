#!/usr/bin/env node
/*
 * Gera as duas mixagens finais a partir do vídeo renderizado (out/regras-fabrica-footage.mp4):
 *   out/final/regras-fabrica-footage-completo.mp4    voz + trilha + efeitos
 *   out/final/regras-fabrica-footage-sem-trilha.mp4  voz + efeitos (para pôr música no app)
 * Volume: -14,5 LUFS integrados, pico real abaixo de -1,5 dBTP (loudnorm em duas passadas).
 *   node projects/regras-fabrica-footage/audio.cjs
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');
const { serve } = require('../../scripts/serve.cjs');

const ROOT = path.resolve(__dirname, '../..');
const NAME = path.basename(__dirname);
const OUT = path.join(ROOT, 'out');
const VOICE = path.join(ROOT, 'projects/regras-fabrica/assets/voz.wav');
const SFX_GAIN = 0.45;

async function synth(query) {
  const { server, port } = await serve(ROOT);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/projects/${NAME}/index.html?render=1${query}`);
    await page.waitForFunction(() => window.Reel && window.Reel.ready === true, null, { timeout: 120000 });
    const dur = await page.evaluate(() => Reel.project.duration);
    const b64 = await page.evaluate(() => Reel.audioWAVBase64());
    return { dur, wav: Buffer.from(b64, 'base64') };
  } finally {
    await browser.close();
    server.close();
  }
}

function ff(args) {
  const r = spawnSync('ffmpeg', ['-nostdin', '-y', '-hide_banner', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(r.stderr.slice(-2000));
  return r.stderr;
}

async function main() {
  const video = path.join(OUT, `${NAME}.mp4`);
  fs.mkdirSync(path.join(OUT, 'final'), { recursive: true });
  for (const [label, query] of [['completo', ''], ['sem-trilha', '&semtrilha=1']]) {
    const { dur, wav } = await synth(query);
    const sfx = path.join(OUT, `${NAME}-${label}-sfx.wav`);
    fs.writeFileSync(sfx, wav);
    const mix = `[1:a]aformat=sample_rates=48000:channel_layouts=stereo,apad[v];[2:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${SFX_GAIN}[s];` +
      `[v][s]amix=inputs=2:normalize=0:duration=longest,atrim=0:${dur},afade=t=out:st=${(dur - 0.3).toFixed(2)}:d=0.3`;
    const meas = ff(['-i', video, '-i', VOICE, '-i', sfx, '-filter_complex', `${mix},loudnorm=I=-14.5:TP=-1.5:LRA=11:print_format=json`, '-f', 'null', '-']);
    const j = JSON.parse(meas.slice(meas.lastIndexOf('{'), meas.lastIndexOf('}') + 1));
    const ln = `loudnorm=I=-14.5:TP=-1.5:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`;
    const out = path.join(OUT, 'final', `${NAME}-${label}.mp4`);
    ff(['-i', video, '-i', VOICE, '-i', sfx, '-filter_complex', `${mix},${ln},aresample=48000[a]`, '-map', '0:v', '-map', '[a]',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-maxrate', '12M', '-bufsize', '24M', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out]);
    const chk = ff(['-i', out, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
    const I = chk.match(/I:\s+(-?[\d.]+) LUFS/g).pop(), P = chk.match(/Peak:\s+(-?[\d.]+) dBFS/g).pop();
    console.log(`${label}: ${path.relative(ROOT, out)}  ${I}  ${P}`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
