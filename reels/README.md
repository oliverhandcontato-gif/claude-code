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
- `engine/kinetic.js`: tipografia cinética sincronizada palavra a palavra (retrô 3D com mola,
  script escrito à mão, horror com glitch, sussurro de máquina de escrever) e títulos letra por letra.
- `engine/gl.js`: pós-produção em WebGL2 (motion blur, aberração cromática, CRT, glitch, smear,
  bloom, meio-tom de impressão, papel, grading, light leak, película, scanlines, vinheta, grão).
- `engine/signal.js` + `scripts/analyze-audio.cjs`: curvas de volume, graves e batidas do áudio
  para animar no ritmo (ex.: a boca do mascote mexe com a voz).
- `projects/<nome>/scene.js`: o vídeo em si (cenas, legendas e trilha).

## Projetos

- `echo-valley`: reel de terror de 30 s com as imagens enviadas e som 100% sintetizado.
- `echo-valley-ad`: comercial anos 50 que vai sendo corrompido. Usa a voz e a música originais
  (`assets/voice-music.m4a`), e todo o visual é desenhado por código (`art.js`).
  Para trocar o áudio: substitua o arquivo e rode
  `node scripts/analyze-audio.cjs projects/echo-valley-ad/assets/voice-music.m4a projects/echo-valley-ad/assets/audio-analysis.json`.

- `echo-valley-segredo`: edição acelerada com footage do Mixkit (licença grátis, uso comercial
  sem crédito obrigatório) sobre a voz e a música originais, com efeitos sonoros por baixo.
  O footage não fica no git; para baixar os clipes e extrair os quadros:
  `node projects/echo-valley-segredo/prepare.cjs` (lista de cenas em `shots.json`), e depois
  `node render.cjs projects/echo-valley-segredo`.

- `toca-cookies-agentes`: "Toda mesa de Ordem Paranormal tem esses 5 agentes" (Toca dos Cookies).
  Locução gerada no CellCog (`assets/voz.wav` + tempos por palavra em `assets/palavras.json`),
  footage do Mixkit e, por código, D20 em 3D, fichas de agente, carimbos, cartela com botão
  Seguir, trilha e efeitos. Prepare com `node projects/toca-cookies-agentes/prepare.cjs`.

- `regras-fabrica`: "Você foi contratado como segurança noturno…" (Tio Arle), terror no formato
  regras de sobrevivência, 1:50. Locução gerada no CellCog (ElevenLabs) em `assets/voz.wav`;
  todo o visual, a trilha e os efeitos são código (`art.js`, `scene.js`). O texto fica em
  `roteiro.json`, e a linha do tempo segue os trechos dele: ao trocar a voz, rode
  `python3 -I projects/regras-fabrica/tools/palavras.py projects/regras-fabrica/assets/voz.wav`
  (faster-whisper) e `node scripts/analyze-audio.cjs projects/regras-fabrica/assets/voz.wav projects/regras-fabrica/assets/audio-analysis.json`.
  `tools/voz.py` gera uma voz local com o Piper, como alternativa. Capa: `node render.cjs projects/regras-fabrica/capa --stills 0`.

Fontes em `fonts/` (Google Fonts): Shrikhand, Monoton e VT323 (SIL OFL); Yellowtail e
Special Elite (Apache 2.0).
