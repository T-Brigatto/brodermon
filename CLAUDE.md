# Brodermon — Vale das Criaturas

Design e protótipo de um jogo mobile de criaturas colecionáveis com **batalha em tempo real**. "Brodermon" é o codinome da pasta; dentro do jogo o título é **VALE DAS CRIATURAS** (chaves de `localStorage` usam o prefixo `vdc-`).

A Arena foi refeita em **TypeScript + Vite com núcleo determinístico**, e a arquitetura está em [docs/arquitetura.md](docs/arquitetura.md). O jogo (`index.html`) abre por padrão o pacote `vale`, com os 103 golpes do guia. Com `?pacote=prototipo`, abre a Arena original, idêntica pixel a pixel: ver [docs/comparacao/](docs/comparacao/README.md). O projeto tem:
- o núcleo da batalha, com testes, em que **cada golpe é uma lista de efeitos**: dano, projéteis (guiado, reto, persegue, quica, com estouro, grudar, bumerangue, aura, dreno), formas (área, cone, linha, parede, que podem esperar, durar, andar, crescer e deixar campo), várias de uma vez, efeitos no alvo, estados, teleporte, avanço que atravessa, atração, corrente, objetos (pilar, portais, cópia, pino) e cópia do golpe do rival;
- **estados** (`estados.json`) e **terrenos e névoas** (`campos.json`) como dicionários, com imunes;
- dois pacotes de conteúdo: `prototipo` (a Arena original, mais 12 golpes de laboratório e 24 do guia) e `vale` (os 10 elementos e os **103 golpes do guia de golpes**, com criaturas de laboratório);
- o desenho em canvas, com efeitos especiais em pixel por elemento (`fx` em `tipos.json`; a Arena original não tem). Cada elemento do vale tem animações próprias por papel (`fx.animacoes`: labaredas, jato d'água, espinhos de gelo, relâmpago, rachadura, prisma, vinha, runas, garras…), montadas com peças (`desenho/animacoes.ts`) por receitas (`desenho/receitas.ts`). A arte foi revisada pelo Claude Design (`design/mudancas-arte.md`): 5 tons por elemento, campos pintados no chão, condições e estados desenhados (`desenho/sobreposicoes.ts`) e efeitos em pixels inteiros de tela;
- as telas em Preact;
- o som;
- um visualizador de depuração (`depuracao.html`);
- um **catálogo de golpes** (`golpes.html`): cada golpe do pacote numa animação em loop, com o motor e o desenho do jogo, e a ficha (poder, recarga, alcance, velocidade, efeitos, campos e estados) lida direto dos dicionários;
- as páginas de design do **Claude Design** (`.dc.html`), que continuam como referência visual.

Tudo é em **pt-BR**: interface, nomes, identificadores, comentários e respostas ao usuário.

## Estrutura

```
conteudo/       pacotes de dicionários (tipos, golpes, espécies, estados, campos, sprites, batalhas, regras): prototipo/ e vale/ — ver conteudo/LEIAME.md
src/nucleo/     batalha pura: comandos entram, eventos saem (sem DOM, relógio ou Math.random)
src/conteudo/   esquema Zod + registro dos pacotes
src/desenho/    canvas: perspectiva, cenário, sprites, fonte de pixel, cena, efeitos especiais (fx, animacoes, pixels)
src/interface/  telas em Preact (HUD, cards, time, táticas, título, pausa, escolha, fim, ajuda)
src/plataforma/ som e preferências
src/app/        jogo.ts (liga tudo), main.tsx (entrada), depuracao.ts
testes/         Vitest
ferramentas/   importador de folhas de poses (PNG → tira de sprite + sprites.json), roda com `node`
sprites-brutos/ folhas de poses originais (GPT), antes da importação
design/        páginas do Claude Design (.dc.html) + runtime support.js + icones/
exportados/    HTML autossuficientes (abrem sem o runtime)
origem/        zip original "Redesign da interface do jogo" — não editar
docs/          referência detalhada (ler antes de mexer no assunto)
```

- [docs/arquitetura.md](docs/arquitetura.md): decisão, princípios, camadas, fluxo comando → evento, diferenças em relação à Arena e problemas conhecidos
- [docs/comparacao/README.md](docs/comparacao/README.md): prints da original × refatorada e como a comparação foi feita
- [conteudo/LEIAME.md](conteudo/LEIAME.md): como editar e criar tipos, golpes, espécies e pacotes
- [docs/inventario.md](docs/inventario.md): o que é cada arquivo de design, status e dependências
- [docs/jogo.md](docs/jogo.md): regras da Arena, criaturas, golpes, tabela de tipos e fórmula de dano
- [docs/sistema-visual.md](docs/sistema-visual.md): paletas, cores por tipo, fontes, ícones e card de golpe
- [docs/guia-sprites.md](docs/guia-sprites.md): como pedir folhas de poses ao GPT/Gemini (layout, prompt, evoluções) e importar

## Como rodar

O Node 26 LTS está instalado. Depois de instalar o Node, reabra o terminal para o PATH ser atualizado.

```bash
npm run dev      # jogo em http://localhost:5173 (preview "jogo"; pacote vale); Arena original em /?pacote=prototipo; depuração em /depuracao.html; catálogo de golpes em /golpes.html
npm test         # testes
npm run check    # verificação de tipos
npm run build    # build de produção em dist/
```

Opções na URL, equivalentes às props da Arena: `?dificuldade=facil|normal|dificil`, `&assist=0`, `&velocidade=1.25` e `&semente=123`. `&pacote=` escolhe o conteúdo: `vale` (padrão, os 103 golpes do guia) ou `prototipo` (a Arena original). `&batalha=` escolhe qualquer id de `batalhas.json` do pacote; sem ela, vale a primeira (`torneio` no vale, `treino` no protótipo). No vale há um laboratório por elemento: `lab-fogo`, `lab-agua`… Em desenvolvimento, o objeto `jogo` fica exposto no console.

Para validar mudanças visuais, abra `?pacote=prototipo` e compare com a original da mesma forma que em `docs/comparacao/`: congele o mesmo estado nas duas versões e compare os prints pixel a pixel. Os textos com números são divididos em pedaços igual ao template original, porque essa divisão muda o espaçamento entre letras.

As páginas de design usam o servidor Python: `python -m http.server 8123`, depois `http://localhost:8123/design/Arena.dc.html`. O preview correspondente se chama `brodermon`. Elas precisam de internet, porque o React 18.3.1 vem do unpkg e as fontes do Google Fonts. No `launch.json`, o preview `jogo` aponta para `C:\Program Files\nodejs\node.exe` porque o app foi aberto antes da instalação do Node.

## Regras do código

- `src/nucleo/` não usa `Math.random`, `Date`, `performance`, `window`, `document`, timers nem imports de fora (só `../conteudo/esquema` para tipos). O teste `testes/pureza.test.ts` confere isso.
- Conteúdo novo entra **só nos JSON** de `conteudo/`. O motor não decide regra de conteúdo: a categoria é um rótulo, e o que vale é a lista de `efeitos` do golpe. Estados novos, terrenos e névoas também são só dados (`estados.json`, `campos.json`). Uma peça nova no motor exige código no núcleo (`batalha.ts` para efeitos do golpe, `combate.ts` para efeitos no alvo, `estados.ts`, `campo.ts` ou `projeteis.ts`), esquema em `src/conteudo/esquema.ts`, teste (`testes/efeitos.test.ts`, `formas.test.ts` ou `vale-mecanicas.test.ts`) e a linha correspondente em `conteudo/LEIAME.md`.
- `testes/paridade.test.ts` trava o comportamento das batalhas do protótipo, evento por evento. Só regrave a referência (`GERAR_PARIDADE=1`) quando a mudança de regra for intencional.
- Toda regra nova vem com teste. Rode `npm test` e `npm run check` antes de dar algo por pronto.

## Formato `.dc.html` (Claude Design)

- `<x-dc>` contém o template; `<helmet>` injeta `<link>`, `<style>` e `<meta>` no `<head>`.
- `{{ caminho }}` interpola o objeto retornado por `renderVals()`. Aceita só caminhos (`a.b[0]`), literais, `!` e `===`/`!==`. **Sem chamadas de função nem aritmética**: calcule tudo em `renderVals()`.
- Laços e condições: `<sc-for list="{{lista}}" as="item">` e `<sc-if value="{{cond}}">`. Os `hint-placeholder-*` só valem durante o streaming do editor.
- `style` é CSS inline em string; `style-hover="…"` e `style-active="…"` viram pseudo-classes.
- Eventos em camelCase (`onClick="{{fn}}"`, `onPointerDown`); `ref="{{fn}}"` para pegar `<canvas>`.
- Lógica em `<script type="text/x-dc" data-dc-script>` com `class Component extends DCLogic`: `state`/`setState`, `componentDidMount`/`WillUnmount`, `renderVals()`. `this.props` vem do `data-props` (JSON com `&quot;`; editores `enum`, `range`, `boolean`; `$preview` define o tamanho).
- `design/support.js` é **gerado** (dc-runtime) — nunca editar.
- As páginas `.dc.html` precisam ficar na mesma pasta que `support.js` e `icones/` (caminhos relativos). O nome do arquivo é o nome do componente: não renomear sem combinar com o usuário, para não quebrar o vínculo com o Claude Design.

## Decisões de design já tomadas

- **Selos de tipo**: opção 5a (quadrado arredondado, cor viva, ícone branco ou `#14243a`). **Categorias**: opção 6b (garras, projétil, chevrons). Exportados em `design/icones/` e mostrados em `Selos Finais.dc.html`.
- **Card de golpe final**: `exportados/Cards_de_golpe_final.html` — 1 coluna, 366×52, moldura de pixel, fonte Big Shoulders Display.
- **Arena**: protótipo jogável completo (título, contagem, batalha, pausa, troca forçada, fim, ajuda), tela de 390×844.
- **Escala da arena** (2026-11-01): área andável de 296 × 118 unidades. Os tamanhos do guia de golpes (`origem/Guia_de_formulacao_de_golpes_Arena_Vale_das_Criaturas.md`) valem nessa unidade; o 143 × 88 do guia estava errado.
- **Os 103 golpes do guia** estão no pacote `vale`: 10 elementos, 10 golpes cada, 11 em Fogo, Ar e Terra. Os ajustes feitos no guia e o que segue provisório (terrenos sem reação entre si, criaturas de laboratório) estão em [docs/arquitetura.md](docs/arquitetura.md).
- **Não existe o elemento Explosão** (2026-11-01). O guia trazia um 11º elemento que o usuário não autorizou; ele saiu do jogo. Com o ok do usuário, três golpes dele mudaram de elemento: Detonação (Fogo), Onda de Choque (Ar) e Ruptura (Terra); os outros sete saíram. Não acrescentar elemento, golpe ou mecânica que o usuário não pediu, mesmo que esteja num documento: perguntar antes.

## Inconsistências conhecidas (verificar antes de assumir)

1. **Dois sistemas de tipos.** A Arena usa 7 tipos antigos (normal, fogo, agua, planta, eletrico, rocha, ar) com tabela de eficácia. Os labs e cards usam 10 tipos novos (fogo, agua, ar, terra, eletricidade, natureza, mineral, arcano, primordial, gelo), **ainda sem tabela de eficácia**.
2. **Três famílias de ícones**: pixel 8×8 na Arena; vetoriais em `icones/`; e os do card final, redesenhados (paths próprios; categoria Físico = estrela de impacto, Mágico = orbe com ondas, Especial = chevron aberto).
3. **Paletas diferentes** por página (Sweetie 16 na Arena, cores de selo, *accents* do card final).
4. A sprite sheet da Briserecs aponta para `/_blob/e19be4fbcf47d7118afaa4f4256df2e3`, um blob do Claude Design que não existe aqui. A Arena cai no sprite 24×24 embutido. No `vale`, a Briserecs tem uma tira animada nova (`conteudo/vale/sprites/briserecs.png`).
5. A categoria Especial é descrita como "buff, defesa ou efeito sem dano", mas Rajada e Raio Curto são Especial com poder.
6. Nomes trocados: `Lab de Tipos.dc.html` tem o título "LAB DE SELOS" (selos em pixel art); `Lab de Selos.dc.html` é a exploração de ícones vetoriais em rodadas.
7. `Lab de Golpes.dc.html`: a prop `fonte` é calculada, mas o template usa uma fonte fixa.

## Convenções

- Pixel art: `image-rendering: pixelated`; bordas de 2px feitas com `box-shadow` nos 4 lados (sem `border-radius` na Arena); usar as cores da paleta documentada.
- Acessibilidade já presente na Arena (`aria-label`, `role`, foco visível `#ffcd75`): manter ao editar.
- Dependências atuais: Preact e Zod (jogo); Vite, TypeScript, Vitest e @types/node (desenvolvimento). Perguntar antes de adicionar outras.
- Os sprites vêm de folhas de poses geradas pelo usuário no GPT, importadas com `node ferramentas/importar-folha.ts` (ver "Sprite em tira" em `conteudo/LEIAME.md`); a vista de lado é obrigatória, e frente e costas são opcionais (`--frente`, `--costas`). A skill `fakemon-firered` foi descontinuada: não usar nem sugerir.
