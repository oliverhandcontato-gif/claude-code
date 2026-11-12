# Tio Arle apresenta Echo Valley — especial vertical

Montagem do documento **"Tio Arle apresenta Echo Valley — roteiro de gravação, direção audiovisual e briefing" (v1)**.
Tio Arle é a página de fã/comentário; a página oficial da obra é a do Anfitrião (`arroba_oficial` em `config.json`).

## Estado atual

- Decisões do Oliver: duas partes **e** versão única; estilo mais dinâmico (degraus de zoom, punch-in nas palavras
  de `enfase` em config.json, glitch leve só nas viradas marcadas com `"trans": "glitch"`); **sem trilha**
  (só voz e efeitos pontuais); citações com o **áudio original** da obra; página oficial **@o.anfitriao_oficial**
  (TikTok) e canal **@tioarle**.
- Narração atual: **voz-guia provisória** (Piper), marcada na tela como "LOCUÇÃO PROVISÓRIA • VOZ-GUIA".
  Será trocada pela locução do Tio Arle.
- Citações com áudio original (conferidas com a legenda na tela):
  A 31,6–35,0 s "…Echo Valley é a cidade mais segura da—" (o original corta antes de "América");
  A 24,3–27,75 s "Apenas lembre-se de ficar longe da parte norte da floresta.";
  F 36,2–38,8 s "Nenhuma área é segura quando um Querubim desperta.".

## Arquivos

- `config.json` — @ oficial e do canal, assinatura, cores, fonte, legenda, destaque, palavras de ênfase e o mapa
  das letras A–H do documento para os arquivos recebidos.
- `parte1.json`, `parte2.json` — blocos (falas do Tio Arle; objetos `{cit}` = citação com áudio original) e a timeline.
- `completo.json` — versão única, **gerada** por `tools/completo.cjs` (seção 7 do documento). Não editar à mão.
- `prepare.cjs` — extrai só os trechos usados (originais intactos e fora do git).
- `tools/voz.py` — monta a faixa de voz (falas + citações), com tempos por palavra.
- `scene.js` — planos, textos, legenda (palavra falada em destaque), efeitos. `?parte=` escolhe a versão.
- `tools/srt.cjs` — SRT da fala; `tools/finalizar.cjs` — volume (-14,5 LUFS, pico < -1 dBTP), nomes finais e SRT.

## Trocar pela locução do Tio Arle

Grave **cada parte numa tomada**, lendo as falas de `parte1.json`/`parte2.json` na ordem, **sem** as citações
(elas entram sozinhas). Depois:

```bash
P=projects/echo-valley-especial
python3 -I $P/tools/voz.py parte1 <pasta-dos-videos> --gravacao parte1.wav
python3 -I $P/tools/voz.py parte2 <pasta-dos-videos> --gravacao parte2.wav
python3 -I $P/tools/voz.py completo <pasta-dos-videos> --gravacao completo.wav   # ou grave a ponte e reaproveite
for v in parte1 parte2 completo; do node $P/prepare.cjs <pasta-dos-videos> $v; done
for v in parte1 parte2 completo; do node render.cjs $P --query parte=$v --out out/ev-$v.mp4; done
node $P/tools/finalizar.cjs parte1 parte2 completo     # out/final/Tio_Arle_Echo_Valley_*.mp4 + .srt
```

Voz-guia (sem gravação): `--modelo pt_BR-cadu-medium.onnx` no lugar de `--gravacao`.

## Mapa dos arquivos (letras do documento)

| Letra | Arquivo recebido | Resolução | Conteúdo conferido |
|---|---|---|---|
| A | VID_20261112_000325_444.mp4 | 1080×1920, 39 s | apresentação da cidade; aviso da parte norte em 24–27 s; "a cidade mais segura da américa!" em 33–34 s |
| B | VID_20261112_000306_079.mp4 | 1080×1920, 33 s | 13 crianças em 2001; documentos em 5–7 s; jornal em 12–13 s |
| C | 40770fe21dd1ccce03e4cbf6d06c2ff4.mp4 | 576×1024, 82 s | "não está localizada em nenhum mapa" em ~31 s; ECHO Rádio em ~72 s |
| D | bf6220bec05226e597d42c8d187b9abf.mp4 | 576×1030, 85 s | Sala Branca; "Agentes que possam combater as anomalias" em 58–60 s; "Mas é TUDO mentira" em 65–66 s |
| E | VID_20261112_001106_573.mp4 | 1080×1920, 166 s | sobre o projeto; "mergulhar fundo na LORE de ECHO Valley" em 146–147 s |
| F | 252361124810c9c3817281deab5de690.mp4 | 576×1024, 67 s | níveis de ameaça; "NENHUMA ÁREA É SEGURA QUANDO UM QUERUBIM DESPERTA!" em ~36 s |
| G | VID_20261112_001124_922.mp4 | 1080×1920, 75 s | outra versão dos níveis de ameaça (não usada) |
| H | VID_20261112_000235_233.mp4 | 1080×1920, 59 s | relato em dias, neblina (não usado) |

Também recebidos e não usados: 572406a9…mp4 e VID_20261112_001205_371.mp4 (versões de D/I/J),
5a1f828d…mp4 (E em 576 px), VID_20261112_001151_094.mp4 (L, "a ruptura").
Fora de propósito: em D, 45–48 s mostra um cartaz de personagem de outra obra; não usar.

## Trechos usados (arquivo e entrada no original)

### Parte 1 — Echo Valley: a cidade é só o começo

| # | Bloco | Arquivo (ref @ entrada) | Velocidade | Tipo | Etiqueta |
|---|---|---|---|---|---|
| 0 | 0 | VID_20261112_000325_444.mp4 (A @ 2 s) | 0.6× | cheio | OBRA |
| 1 | 0 ("mais") | VID_20261112_000325_444.mp4 (A @ 33 s) | 0.65× | cheio | OBRA |
| 2 | 0 ("outro") | VID_20261112_000306_079.mp4 (B @ 0.3 s) | 1× | cheio | FICCAO |
| 3 | 1 | VID_20261112_000325_444.mp4 (A @ 14 s)<br>VID_20261112_000306_079.mp4 (B @ 3 s) | 1× | dividido | — |
| 4 | 2 | VID_20261112_000325_444.mp4 (A @ 15 s) | 1× | cartao | TIO |
| 5 | 2 ("página") | VID_20261112_000325_444.mp4 (A @ 18 s) | 1× | cartao | TIO |
| 6 | 3 | VID_20261112_000325_444.mp4 (A @ 0 s) | 1× | cheio | OBRA |
| 7 | 3 ("trilhas") | VID_20261112_000325_444.mp4 (A @ 6 s) | 1× | cheio | OBRA |
| 8 | 3 ("sorveteria") | VID_20261112_000325_444.mp4 (A @ 8 s) | 1× | cheio | OBRA |
| 9 | 3 ("moradores") | VID_20261112_000325_444.mp4 (A @ 20 s) | 1× | cheio | OBRA |
| 10 | 3 ("parece") | VID_20261112_000325_444.mp4 (A @ 14 s) | 1× | cheio | OBRA |
| 11 | 4 | VID_20261112_000325_444.mp4 (A @ 21.2 s) | 1× | cheio | OBRA |
| 12 | 4 ("aviso") | VID_20261112_000325_444.mp4 (A @ 24.6 s) | 1× | cheio | OBRA |
| 13 | 4 ("pra") | VID_20261112_000325_444.mp4 (A @ 28 s) | 1× | cheio | OBRA |
| 14 | 5 | VID_20261112_000306_079.mp4 (B @ 0.4 s) | 1× | cheio | FICCAO |
| 15 | 5 ("documentos") | VID_20261112_000306_079.mp4 (B @ 5.2 s) | 1× | cheio | FICCAO |
| 16 | 5 ("silêncio") | VID_20261112_000306_079.mp4 (B @ 12.2 s) | 1× | cheio | FICCAO |
| 17 | 5 ("esse") | VID_20261112_000306_079.mp4 (B @ 24.2 s) | 1× | cheio | FICCAO |
| 18 | 5 ("mistérios") | VID_20261112_000306_079.mp4 (B @ 20 s) | 1× | cheio | FICCAO |
| 19 | 6 ("entidades") | 252361124810c9c3817281deab5de690.mp4 (F @ 27.2 s) | 1× | painel | OBRA |
| 20 | 6 ("relatos") | bf6220bec05226e597d42c8d187b9abf.mp4 (D @ 21.5 s) | 1× | painel | FICCAO |
| 21 | 6 ("a") | VID_20261112_000325_444.mp4 (A @ 18 s) | 1× | cheio | OBRA |
| 22 | 7 | VID_20261112_000325_444.mp4 (A @ 0.3 s)<br>VID_20261112_000306_079.mp4 (B @ 0.5 s)<br>40770fe21dd1ccce03e4cbf6d06c2ff4.mp4 (C @ 72 s) | 0.25× | trio | — |
| 23 | 8 | VID_20261112_000325_444.mp4 (A @ 2 s) | 0.12× | cheio | OBRA |

### Parte 2 — Echo Valley: quem conta a história também importa

| # | Bloco | Arquivo (ref @ entrada) | Velocidade | Tipo | Etiqueta |
|---|---|---|---|---|---|
| 0 | 0 | VID_20261112_000325_444.mp4 (A @ 18 s) | 1× | cheio | OBRA |
| 1 | 0 ("quem") | bf6220bec05226e597d42c8d187b9abf.mp4 (D @ 7.2 s) | 1× | painel | FICCAO |
| 2 | 1 | VID_20261112_000325_444.mp4 (A @ 15 s) | 1× | cartao | TIO |
| 3 | 2 | VID_20261112_000325_444.mp4 (A @ 18 s) | 1× | cheio | OBRA |
| 4 | 2 ("outro") | VID_20261112_000306_079.mp4 (B @ 0.4 s) | 1× | cheio | FICCAO |
| 5 | 2 ("personagens") | bf6220bec05226e597d42c8d187b9abf.mp4 (D @ 57.8 s) | 1× | painel | FICCAO |
| 6 | 3 | bf6220bec05226e597d42c8d187b9abf.mp4 (D @ 64.8 s) | 0.5× | painel | FICCAO |
| 7 | 3 ("acusação") | bf6220bec05226e597d42c8d187b9abf.mp4 (D @ 8 s) | 0.6× | painel | FICCAO |
| 8 | 4 | VID_20261112_000325_444.mp4 (A @ 18 s) | 1× | cartao | TIO |
| 9 | 5 | 252361124810c9c3817281deab5de690.mp4 (F @ 18.5 s) | 1× | painel | OBRA |
| 10 | 5 ("querubim") | 252361124810c9c3817281deab5de690.mp4 (F @ 35 s) | 0.8× | painel | OBRA |
| 11 | 5 ("mas") | VID_20261112_000325_444.mp4 (A @ 18 s) | 1× | cheio | OBRA |
| 12 | 6 | VID_20261112_001106_573.mp4 (E @ 145.5 s) | 0.25× | cheio | PROJETO |
| 13 | 6 ("personagem") | bf6220bec05226e597d42c8d187b9abf.mp4 (D @ 0.3 s) | 1× | painel | FICCAO |
| 14 | 6 ("criação") | VID_20261112_001106_573.mp4 (E @ 160 s) | 0.6× | cheio | PROJETO |
| 15 | 7 | VID_20261112_000325_444.mp4 (A @ 0.3 s)<br>VID_20261112_000306_079.mp4 (B @ 0.5 s)<br>252361124810c9c3817281deab5de690.mp4 (F @ 27.2 s) | 0.2× | trio | TIO |
| 16 | 8 | VID_20261112_000325_444.mp4 (A @ 2 s) | 0.2× | cartao | TIO |
