# Brodermon — Vale das Criaturas

Design e protótipo de um jogo mobile de criaturas colecionáveis com **batalha em tempo real**. "Brodermon" é o codinome da pasta; dentro do jogo o título é **VALE DAS CRIATURAS** (chaves de `localStorage` usam o prefixo `vdc-`).

A Arena foi refeita em **TypeScript + Vite com núcleo determinístico**, e a arquitetura está em [docs/arquitetura.md](docs/arquitetura.md). Ela é jogável em `index.html` e fica idêntica pixel a pixel à original: ver [docs/comparacao/](docs/comparacao/README.md). O projeto tem:
- o núcleo da batalha, com testes;
- o conteúdo do protótipo em dicionários JSON, sprites incluídos;
- o desenho em canvas;
- as telas em Preact;
- o som;
- um visualizador de depuração (`depuracao.html`);
- as páginas de design do **Claude Design** (`.dc.html`), que continuam como referência visual.

Tudo é em **pt-BR**: interface, nomes, identificadores, comentários e respostas ao usuário.

## Estrutura

```
conteudo/       dicionários do jogo (tipos, golpes, espécies, sprites, batalhas, regras) — ver conteudo/LEIAME.md
src/nucleo/     batalha pura: comandos entram, eventos saem (sem DOM, relógio ou Math.random)
src/conteudo/   esquema Zod + registro dos pacotes
src/desenho/    canvas: perspectiva, cenário, sprites, fonte de pixel, cena
src/interface/  telas em Preact (HUD, cards, time, táticas, título, pausa, escolha, fim, ajuda)
src/plataforma/ som e preferências
src/app/        jogo.ts (liga tudo), main.tsx (entrada), depuracao.ts
testes/         Vitest
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

## Como rodar

O Node 26 LTS está instalado. Depois de instalar o Node, reabra o terminal para o PATH ser atualizado.

```bash
npm run dev      # jogo em http://localhost:5173 (preview "jogo"); depuração em /depuracao.html
npm test         # testes
npm run check    # verificação de tipos
npm run build    # build de produção em dist/
```

Opções na URL, equivalentes às props da Arena: `?dificuldade=facil|normal|dificil`, `&assist=0`, `&velocidade=1.25` e `&semente=123`. Em desenvolvimento, o objeto `jogo` fica exposto no console.

Para validar mudanças visuais, compare com a original da mesma forma que em `docs/comparacao/`: congele o mesmo estado nas duas versões e compare os prints pixel a pixel. Os textos com números são divididos em pedaços igual ao template original, porque essa divisão muda o espaçamento entre letras.

As páginas de design usam o servidor Python: `python -m http.server 8123`, depois `http://localhost:8123/design/Arena.dc.html`. O preview correspondente se chama `brodermon`. Elas precisam de internet, porque o React 18.3.1 vem do unpkg e as fontes do Google Fonts. No `launch.json`, o preview `jogo` aponta para `C:\Program Files\nodejs\node.exe` porque o app foi aberto antes da instalação do Node.

## Regras do código

- `src/nucleo/` não usa `Math.random`, `Date`, `performance`, `window`, `document`, timers nem imports de fora (só `../conteudo/esquema` para tipos). O teste `testes/pureza.test.ts` confere isso.
- Conteúdo novo entra **só nos JSON** de `conteudo/`. O motor não decide regra de conteúdo: a categoria é um rótulo, e o que vale são `dano`, `buff` e `contato` no golpe.
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

## Inconsistências conhecidas (verificar antes de assumir)

1. **Dois sistemas de tipos.** A Arena usa 7 tipos antigos (normal, fogo, agua, planta, eletrico, rocha, ar) com tabela de eficácia. Os labs e cards usam 10 tipos novos (fogo, agua, ar, terra, eletricidade, natureza, mineral, arcano, primordial, gelo), **ainda sem tabela de eficácia**.
2. **Três famílias de ícones**: pixel 8×8 na Arena; vetoriais em `icones/`; e os do card final, redesenhados (paths próprios; categoria Físico = estrela de impacto, Mágico = orbe com ondas, Especial = chevron aberto).
3. **Paletas diferentes** por página (Sweetie 16 na Arena, cores de selo, *accents* do card final).
4. A sprite sheet da Briserecs aponta para `/_blob/e19be4fbcf47d7118afaa4f4256df2e3`, um blob do Claude Design que não existe aqui. A Arena cai no sprite 24×24 embutido.
5. A categoria Especial é descrita como "buff, defesa ou efeito sem dano", mas Rajada e Raio Curto são Especial com poder.
6. Nomes trocados: `Lab de Tipos.dc.html` tem o título "LAB DE SELOS" (selos em pixel art); `Lab de Selos.dc.html` é a exploração de ícones vetoriais em rodadas.
7. `Lab de Golpes.dc.html`: a prop `fonte` é calculada, mas o template usa uma fonte fixa.

## Convenções

- Pixel art: `image-rendering: pixelated`; bordas de 2px feitas com `box-shadow` nos 4 lados (sem `border-radius` na Arena); usar as cores da paleta documentada.
- Acessibilidade já presente na Arena (`aria-label`, `role`, foco visível `#ffcd75`): manter ao editar.
- Dependências atuais: Preact e Zod (jogo); Vite, TypeScript, Vitest e @types/node (desenvolvimento). Perguntar antes de adicionar outras.
- A skill `fakemon-firered` gera sprites para este jogo (96×96, tira de 4 quadros, data-URI e dados da espécie).
