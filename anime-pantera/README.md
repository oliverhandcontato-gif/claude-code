# Pantera — sequência animada (anime, por código)

Videoclipe completo de 3:43 para a faixa `assets/pantera.mp3` ("Pantera", sobre Aomine Daiki).
Todo o desenho é gerado por código (Canvas 2D no Chromium). A temporização é determinística:
cada quadro é uma função pura do número do quadro.

## Entrega
- `out/pantera.mp4` — 1920×1080, 24 fps, H.264 + AAC (música original).
- `out/review/` — quadros de conferência (início, meio, fim, momentos de mais movimento).
- `index.html` — player de pré-visualização com a música e uma barra de busca.

## Como reproduzir
```bash
# 1) análise de áudio (separação de voz, batidas, abertura de boca, transcrição com tempos)
python tools/analyze_audio.py          # requer demucs, faster-whisper, librosa
python tools/export_audio_data.py      # gera audio/data.js
# 2) render
node tools/check_timeline.mjs          # confere que as tomadas cobrem 0–223,32 s sem buracos
node tools/frames.mjs folha.png 12.6 73.98 190.5   # folha de contato de quadros específicos
node tools/render_mp4.mjs --workers 4  # gera out/pantera.mp4
```
Requer Node com `playwright` e Chromium, e `ffmpeg`.

## Estrutura
| Arquivo | Função |
|---|---|
| `src/config.js` | **Parâmetros editáveis**: resolução, fps, desenho em 2s/3s, espessura do traço, direção da luz, grão, letterbox, legendas, paletas (Touou preto/bordô, Teikō branco/marinho) |
| `src/rig.js` | Esqueleto 3D, cinemática direta, mistura de poses, projeção pela câmera |
| `src/body.js` | Membros com perfil muscular, tronco por seções elípticas, mãos e tênis |
| `src/head.js` | Crânio pseudo-3D, mechas de cabelo, olhos, pálpebras, sobrancelhas, boca e orelhas em planos locais |
| `src/character.js` | Montagem do personagem: camadas por profundidade, uniforme (estampa 桐皇 / GAKUEN / 5 curvada no tecido), acabamentos, dobras, corrente, munhequeira, movimento secundário do cabelo e da barra |
| `src/brush.js` | Contorno com espessura variável, traços afinados nas pontas, cel shading e luz de recorte |
| `src/poses.js` | Biblioteca de poses-chave, ciclos (andar, correr, driblar), interpolação, ação sobreposta, apoio dos pés no chão, espelhamento |
| `src/camera.js` | Câmera em perspectiva compartilhada por cenário e personagem |
| `src/env.js` | Cenários: quadra de rua com chuva, ginásio com torcida e placar, terraço, zona, ginásio do Teikō ao pôr do sol, palco |
| `src/fx.js` | Bola, linhas de velocidade e de foco, raio da zona, quadros de impacto, silhuetas, rastros, graduação de cor, grão, títulos |
| `src/main.js` | Runtime da linha do tempo, sincronia labial, auxiliares de câmera |
| `src/shots_*.js` | Decupagem: 84 tomadas sincronizadas com os tempos das palavras |
| `tools/` | Análise de áudio, render, checagem da linha do tempo, folhas de contato |

## Sincronia
Os tempos de corte vêm da transcrição com tempo por palavra (`audio/words.json`). A boca é guiada
pela trilha de voz separada (`audio/mouth.json`), com 3 desenhos de boca trocados em 2s.
