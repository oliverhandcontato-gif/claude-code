# Reels por código

Vídeos verticais (1080×1920, 30 fps) feitos com Canvas + Web Audio + ffmpeg.
As imagens entram só como cenário. Câmera, neblina, chuva, relâmpago, VHS, glitch,
legendas e todos os sons são gerados por código.

## Usar

```bash
node scripts/serve.cjs            # pré-visualização com som: http://localhost:5173/projects/echo-valley/
node render.cjs                   # gera out/echo-valley.mp4
node render.cjs --stills 2,15     # só salva frames em out/stills/
```

Precisa de Node 18+, `ffmpeg` e Playwright (`npm i -D playwright && npx playwright install chromium`).

## Estrutura

- `engine/core.js`: tempo, easing, aleatoriedade determinística, câmera (`drawCover`), linha do tempo de cenas.
- `engine/fx.js`: grão, vinheta, neblina, chuva, relâmpago, brilho, poeira, VHS, glitch, estática, silhueta.
- `engine/text.js`: legenda palavra por palavra (`*ênfase*` em vermelho) e máquina de escrever.
- `engine/audio.js`: sons sintetizados (impacto, coração, drone, vento, chuva, trovão, whoosh,
  caixinha de música, cliques, chiado de fita, glitch, estática, sussurro, susto).
- `projects/<nome>/scene.js`: o vídeo em si (cenas, legendas e trilha).
