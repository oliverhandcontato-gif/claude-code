/*
 * Download de footage de bancos gratuitos.
 *   Mixkit  : { "id": 12345 }                      (sem chave; 1080p, ou 720p quando o 1080p não é público)
 *   Pixabay : { "src": "pixabay", "id": 11721 }    (chave em PIXABAY_API_KEY; pega a maior versão até 1080p)
 * A chave vem SEMPRE da variável de ambiente e nunca é gravada em arquivo.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const probeOk = (f) => fs.existsSync(f) && spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).stdout.toString().trim() !== '';
const curl = (url, out) => spawnSync('curl', ['-s', '-f', '-L', '-m', '400', '-o', out, url]).status === 0;

function pixabayUrl(id) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) throw new Error('PIXABAY_API_KEY não configurada no ambiente');
  const r = spawnSync('curl', ['-s', '-f', '-m', '30', `https://pixabay.com/api/videos/?key=${encodeURIComponent(key)}&id=${id}`]);
  const hit = JSON.parse(r.stdout.toString() || '{}').hits?.[0];
  if (!hit) throw new Error(`vídeo ${id} não encontrado no Pixabay`);
  const v = Object.values(hit.videos).filter((x) => x.url && x.height <= 1080).sort((a, b) => b.height - a.height)[0];
  return v.url;
}

/** Baixa o clipe (se ainda não estiver no cache) e devolve o caminho local. */
function fetchClip(shot, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const src = shot.src || 'mixkit';
  const file = path.join(dir, src === 'mixkit' ? `${shot.id}.mp4` : `${src}-${shot.id}.mp4`);
  if (probeOk(file)) return file;
  for (let k = 0; k < 3; k++) {
    if (src === 'pixabay') {
      if (curl(pixabayUrl(shot.id), file) && probeOk(file)) return file;
    } else {
      for (const q of ['1080', '720']) if (curl(`https://assets.mixkit.co/videos/${shot.id}/${shot.id}-${q}.mp4`, file) && probeOk(file)) return file;
    }
  }
  throw new Error(`não consegui baixar ${src} ${shot.id}`);
}

module.exports = { fetchClip };
