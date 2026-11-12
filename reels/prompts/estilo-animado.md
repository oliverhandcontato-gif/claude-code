# Prompt — Estilo ANIMADO (motion design 100% por código)

> Cole numa conversa nova e preencha os campos entre [COLCHETES].

---

Quero um vídeo vertical para [TIKTOK / REELS / SHORTS] do canal **[NOME DO CANAL]**, no estilo **animado 100% por código**, igual ao "Echo Valley — comercial anos 50": nenhuma foto ou footage, todo o visual desenhado e animado por código.

**Antes de começar qualquer coisa, me pergunte o que faltar.** Não comece a produzir sem eu aprovar o roteiro e o storyboard.

## O que eu vou fornecer
- Áudio: [ARQUIVO COM VOZ E MÚSICA / SÓ A VOZ / NENHUM — VOCÊ GERA A TRILHA POR CÓDIGO]
- Roteiro ou tema: [COLE O ROTEIRO OU DESCREVA O TEMA]
- Duração: [EX.: 30–45 s]
- Clima: [EX.: alegre que vai sendo corrompido para o terror / épico / fofo / sombrio]
- Logo ou mascote: [ARQUIVO OU "CRIE UM"]

## Ferramentas (já prontas no repositório)
- Repositório `oliverhandcontato-gif/claude-code`, branch `claude/reels-tiktok-editor-components-n00ox6`, pasta `reels/`.
- Motor: `engine/` (Canvas 2D + pós-produção WebGL2 + Web Audio + tipografia cinética + curvas de áudio). Render com `node render.cjs projects/<nome>`.
- Referência de estilo: `projects/echo-valley-ad/` (`art.js` = biblioteca de ilustração procedural, `scene.js` = timeline).
- Crie um projeto novo em `projects/[nome-do-projeto]/`, sem quebrar os existentes.

## Processo
1. **Transcrição:** se eu mandar áudio, transcreva com tempo por palavra (faster-whisper) e corte a tela final do TikTok, se houver.
2. **Análise do áudio:** rode `scripts/analyze-audio.cjs` para gerar volume, graves e batidas por frame.
3. **Storyboard:** cena a cena, com o trecho da fala e o que aparece na tela. Me mostre e espere eu aprovar.
4. **Construção:**
   - **Paleta:** fixa, de 8 a 12 cores com papéis definidos, coerente com o tema.
   - **Ilustrações procedurais:** cenários (céu, montanhas, cidade, interiores), objetos e personagens desenhados com caminhos, gradientes e ruído.
   - **Mascote:** um personagem com a boca sincronizada pelo volume da voz e piscadas. Se o tema tiver virada de terror, ele ganha uma versão "corrompida".
   - **Câmera:** push-in lento por cena, punch-in (zoom de impacto) nas palavras fortes e "kick" nas batidas da música.
   - **Tipografia cinética sincronizada palavra por palavra:**
     - letreiro com extrusão 3D e mola nos trechos alegres;
     - letra cursiva escrita à mão nos trechos suaves;
     - horror com glitch e separação RGB nos sustos;
     - máquina de escrever nos sussurros.
   - **Transições:** íris em forma de estrela, whip pan com motion blur, queima de filme, glitch e desligamento de TV de tubo.
   - **Pós-produção WebGL por trecho:**
     - alegre: meio-tom de impressão, papel envelhecido, película, light leak e bloom;
     - terror: dessaturado e frio, glitch, CRT, scanlines e aberração cromática.
   - **Final:** chamada para seguir, com o nome do canal.
5. **Revisão antes do render final:**
   - Renderize quadros-chave de todas as cenas numa folha de contato e corrija o que encontrar.
   - Erros a procurar:
     - legendas sobrepostas (a anterior precisa sumir antes da próxima entrar);
     - palavras grudadas;
     - texto cortado na borda;
     - elementos fora da área segura.
6. **Render final:** em segundo plano. Confira a duração e o volume (de -14 a -16 LUFS, pico abaixo de -1 dB). Depois me envie o MP4 e faça commit e push.

## Regras de layout (área segura do TikTok)
- Tela de 1080×1920, 30 fps.
- Legendas entre y≈250 e y≈1450.
- Nada importante abaixo de y≈1520 nem colado na direita (x>950), onde ficam os botões.
- Legendas grandes (70–110 px), com contorno escuro e destaque colorido nas palavras fortes.

## Entregáveis
- MP4 1080×1920 H.264 + AAC.
- Código do projeto commitado na branch.
- Resumo do que foi feito e do que eu posso ajustar.
