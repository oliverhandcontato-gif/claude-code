# Capitão Saci salva o prédio — animação em linguagem de HQ

Sequência de 20,6 s (1920×1080, 24 fps, H.264 + som sintetizado) desenhada por código em Canvas 2D.

## Roteiro (5 quadros)
1. **0,0–4,2 s** Plano geral: prédio pegando fogo à noite, a menina acenando na janela.
2. **4,2–8,0 s** Um redemoinho chega pela rua, se desfaz e revela o Capitão Saci
   (aterrissagem agachada → pose de herói → olha para o prédio).
3. **8,0–10,6 s** Ele sobe a fachada pulando de sacada em sacada (antecipação, arco, impacto).
4. **10,6–15,4 s** Gira e vira um redemoinho que suga chamas e fumaça; quadro inserido com close
   da carapuça acesa; o redemoinho sobe levando o fogo embora.
5. **15,4–20,6 s** Pousa na sacada da menina, sorri, toca a carapuça com uma piscadela e sai
   girando; o quadro se fecha sobre o papel.
Sem balões, legendas ou onomatopeias (não foram pedidos).

## Estrutura
- `src/core.js` — matemática, easing, ruído, nanquim (pincel afinado, contornos), retícula, papel.
- `src/saci.js` — rig 2D em camadas (uma perna), sombras em massa, rosto 3/4 ↔ perfil, expressões,
  carapuça e capa com movimento secundário.
- `src/world.js` — cidade, prédio, fogo, fumaça, redemoinho, menina.
- `src/shots.js` — os 5 quadros, poses-chave e câmeras; `src/main.js` — página, quadros, transições.
- `tools/render_mp4.mjs` — render paralelo no Chromium → MP4; `tools/audio.py` — som; `tools/frames.mjs` — folhas de contato.

## Reproduzir
```bash
python3 tools/audio.py out/saci_audio.wav
node tools/render_mp4.mjs --workers 4 --crf 17
```
