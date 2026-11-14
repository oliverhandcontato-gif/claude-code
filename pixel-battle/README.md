# Pikachu × Charizard — pixel art animada por código

Luta de 40,9 s em pixel art: lança-chamas, choque do trovão, bolas de fogo, Electro Ball contra
Garra de Dragão, choque de raios, mergulho e a **Investida Trovão** que dá a vitória ao Pikachu.

## Entrega
- `out/pikachu_vs_charizard.mp4` — 1920×1080, 60 fps, H.264 + áudio chiptune/SFX sintetizado.
- `out/sheets/pikachu_sheet.png|json`, `out/sheets/charizard_sheet.png|json` — spritesheets
  (células fixas, pivô nos pés, estados, durações em ticks de 60 Hz).
- `out/battle_audio.wav` — trilha gerada pela mesma linha do tempo.
- `out/review/` — quadros de revisão na resolução interna (384×216) e na escala de exibição.

## Direção técnica
- Resolução interna **384×216**, ampliada **5×** (nearest-neighbor) → 1920×1080. Checagem
  automática: todo bloco 5×5 da saída é uniforme (grade preservada).
- Sprites **desenhados por pose** no grid (`src/raster.py`): cada frame é rasterizado de novo
  a partir dos parâmetros da pose, sem rotacionar/esticar bitmap pronto. Cel shading por teste
  de deslocamento de luz, dithering só nas transições de sombra de áreas grandes, contorno
  seletivo (cor por material), limpeza de cantos em L e de pixels órfãos. Rosto, bochechas,
  olhos e boca são pixels autorados à mão (`stamp`). Vista frontal da vitória e quadros da
  pirueta foram construídos separadamente.
- Mesmo tamanho de pixel em personagens, cenário e efeitos (`src/fx.py`). Posições e câmera
  sempre inteiras; paralaxe 0,15 / 0,4 / 1,0 / 1,3 com deslocamentos inteiros por camada.
- **Temporização**: vídeo a 60 fps; poses com durações próprias por frame (2–14 ticks, ver JSON);
  efeitos desenhados em 2s/3s; hit-stops (congelamentos) inseridos no impacto. Ciclos de corrida
  fecham sem salto; passada das patas calculada para casar com a velocidade (sem deslizar).

## Parâmetros expostos
- `src/sprites.py`: `SPEED` (taxa global de poses) e as durações por frame de cada estado.
- `src/scene.py`: trilhas de posição/estado (tempos), `FREEZES` (hit-stop), `INTENSITY` (tremor/flash).
- `src/render.py`: `ARENA_K` (compressão da arena), `--scale` (múltiplo inteiro da saída).

## Reproduzir
```bash
python3 src/audio.py out/battle_audio.wav
python3 src/render.py --scale 5 --audio out/battle_audio.wav --out out/pikachu_vs_charizard.mp4
python3 src/render.py --png out/frames            # alternativa: sequência PNG na resolução interna
python3 tools/sheet.py folha.png 12 21 30.2       # folha de contato de instantes
```
Requer Python 3 com numpy e Pillow, e ffmpeg.
