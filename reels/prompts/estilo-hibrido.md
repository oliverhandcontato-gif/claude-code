# Prompt — Estilo HÍBRIDO (footage + gráficos por código)

> Cole numa conversa nova e preencha os campos entre [COLCHETES].

---

Quero um vídeo vertical para [TIKTOK / REELS / SHORTS] do canal **[NOME DO CANAL]**, no estilo **híbrido**, igual aos vídeos "Echo Valley — segredo" e "Toca dos Cookies — 5 agentes":
- footage real (vídeos de banco) de fundo;
- edição acelerada;
- elementos gráficos animados por código por cima.

**Antes de começar qualquer coisa, me pergunte o que faltar.** Não comece a produzir sem eu aprovar o roteiro e o storyboard.

## O que eu vou fornecer
- Formato e tema: [EX.: "tipos de jogadores", história, curiosidades, lore, terror]
- Voz: [VOU GRAVAR EU MESMO / GERAR NO CELLCOG / ÁUDIO DE UM VÍDEO ORIGINAL QUE EU MANDAR]
- Roteiro: [COLE O ROTEIRO OU PEÇA PARA EU ESCREVER]
- Duração: [EX.: 45–60 s]
- Logo: [ARQUIVO] e nome para a marca d'água: [NOME]
- Elementos gráficos temáticos que eu quero: [EX.: fichas de personagem, D20, carimbos, HUD de câmera, mapas, documentos]

## Ferramentas (já prontas no repositório)
- Repositório `oliverhandcontato-gif/claude-code`, branch `claude/reels-tiktok-editor-components-n00ox6`, pasta `reels/`.
- Motor: `engine/` (Canvas 2D + pós-produção WebGL2 + Web Audio + tipografia cinética + curvas de áudio). Render com `node render.cjs projects/<nome>`.
- Referências:
  - `projects/toca-cookies-agentes/`: fichas, D20 3D, carimbos, marca d'água, cartela "Seguir", voz própria com sincronia.
  - `projects/echo-valley-segredo/`: footage com tarjas, carimbo de CONFIDENCIAL, HUD e monitor de bebê.
  - Cada projeto tem `shots.json` com a lista de cenas e `prepare.cjs`, que baixa e extrai os quadros.
- Crie um projeto novo em `projects/[nome-do-projeto]/`, sem quebrar os existentes.

## Processo
1. **Roteiro:**
   - Gancho forte nos 2 primeiros segundos, uma virada ou piada em cada bloco e uma chamada final.
   - "Marca o seu grupo / comenta" e "segue o [CANAL]".
   - Me mostre e espere eu aprovar.
2. **Voz:**
   - **Se eu gravar:**
     1. Transcreva com tempo por palavra, usando o roteiro como referência.
     2. Detecte fala × não fala por energia + vibração de voz + brilho do som.
     3. Remova respirações, fungadas, ronquinhos, erros, repetições e o que vier depois do fim do roteiro.
     4. Encurte as pausas pela pontuação, mantendo as pausas dramáticas.
     5. Corrija clipping, tire o ruído e faça EQ (corpo, menos abafado, presença), de-esser, compressão e -16 LUFS.
     6. Me mande a voz tratada para ouvir.
   - **Se for CellCog:** voz isolada, sem música, com legendas por palavra. Avise o custo em créditos antes.
   - **Se eu regravar depois:** use as palavras em comum como âncoras de um mapa de tempo, para ressincronizar tudo sem refazer a edição.
3. **Footage:**
   - Fontes, nesta ordem: Pexels ou Pixabay (se a chave estiver configurada), depois Mixkit, Internet Archive e NASA. Só material com licença livre para uso comercial.
   - Baixe em 1080p; se não for público, em 720p.
   - Monte uma folha de contato com o número de cada clipe e um **storyboard** com uma cena para cada trecho da fala. Me mostre e espere eu aprovar.
4. **Edição (ritmo acelerado):**
   - **Cortes:** cerca de 1 por segundo, com speed ramps, push-in lento por cena, punch-in nas palavras fortes e tremida nos sustos.
   - **Transições por clima:** flash, glitch ou whip pan com motion blur.
   - **Color grading:** unificado por cena na pós-produção WebGL, com grão, vinheta e bloom. Cor própria para cada momento (sustos, fogo, cenas frias).
   - **Gráficos temáticos por código, sincronizados com a fala:**
     - fichas e cards com atributos que aparecem na palavra certa, barras e contadores animados;
     - carimbos (desenhados numa camada própria);
     - dados em 3D;
     - HUD, mapas e marcações.
   - **Legendas cinéticas palavra por palavra:** destaque em vermelho nas palavras fortes, corte seco entre blocos (sem sobreposição) e o nome do canal sempre limpo, sem glitch.
   - **Marca d'água:** logo + nome, ~30% de opacidade, mudando de lugar a cada ~7 s, fora das legendas e dos botões.
   - **Cartela final:** logo + nome + botão "Seguir" sendo tocado.
   - **Som:** trilha e efeitos sintetizados **por baixo da voz** (whoosh nos cortes, impactos nas palavras fortes, sons temáticos), com a voz sempre na frente.
5. **Revisão antes do render final:**
   - Folha de contato com quadros de cada cena e conferência da sincronia palavra por palavra.
   - Erros a procurar:
     - legendas sobrepostas ou palavras grudadas;
     - texto passando da borda dos cards;
     - elementos na área dos botões do TikTok;
     - glitch deixando palavras ilegíveis.
6. **Render final:** em segundo plano. Confira a duração e o volume (de -14 a -16 LUFS, pico abaixo de -1 dB). Depois me envie o MP4 e faça commit e push. O footage baixado não vai para o git, só `shots.json` e `prepare.cjs`.

## Regras de layout (área segura do TikTok)
- Tela de 1080×1920, 30 fps.
- Legendas entre y≈250 e y≈1450.
- Nada importante abaixo de y≈1520 nem colado na direita (x>950).

## Entregáveis
- MP4 1080×1920 H.264 + AAC.
- Voz tratada separada (quando for a minha voz).
- Código do projeto commitado na branch.
- Resumo do que foi feito, custos (créditos) e o que eu posso ajustar.
