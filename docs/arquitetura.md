# Arquitetura do jogo

Decisão de 2026-10-31: **TypeScript + Vite com núcleo determinístico** (a opção "B" das três avaliadas). O escopo vai até a **batalha online**, então o núcleo precisa rodar sem tela e servir de autoridade num servidor no futuro.

## Princípios

1. **Lógica separada da tela.** As regras ficam em `src/nucleo/`, que não conhece canvas, DOM, relógio nem som. Os comandos entram, o estado muda e os eventos saem.
2. **Passo fixo e sorteio com semente.** A simulação sempre avança de `PASSO` (1/60 s). O sorteio usa mulberry32, com o estado guardado dentro da batalha. A mesma semente com os mesmos comandos dá a mesma luta, o que permite replays, testes e balanceamento automático.
3. **Conteúdo é dado.** Tipos, golpes, criaturas, batalhas e números de regra ficam em dicionários JSON, em `conteudo/<pacote>/`. Adicionar ou remover um item não exige mexer no motor. Um esquema (Zod) valida tudo e aponta referências quebradas.
4. **Visual vindo dos dados.** O visual de cada tipo (cor, fundo, ícone, cores do projétil e das partículas) e os sprites das criaturas ficam no conteúdo (`tipos.json` e `sprites.json`). A moldura de pixel e os ícones em box-shadow ficam em `src/interface/estilo.ts`.
5. **Regras testadas.** Vitest, em `testes/`. O teste `pureza` impede que o núcleo use `Math.random`, `Date`, `window`, `document`, timers ou imports de fora.

## Pastas

```
conteudo/prototipo/   dicionários da Arena original, sprites incluídos (ver conteudo/LEIAME.md)
conteudo/vale/        os 11 elementos e os 110 golpes do guia, com estados, terrenos e névoas
src/conteudo/         esquema (Zod) e registro dos pacotes
src/nucleo/           batalha pura: passo e golpes (batalha), dano e efeitos no alvo (combate), estados,
                      chão da arena (campo: zonas, terrenos, névoas, objetos, agendados), projéteis,
                      geometria das formas, IA, movimento, sorteio
src/desenho/          canvas: perspectiva da arena, cenário, sprites, fonte de pixel, cena (setas, minimapa)
src/interface/        telas em Preact: HUD, cards de golpe, time, táticas, título, pausa, escolha, fim, ajuda
src/plataforma/       som (WebAudio) e preferências (localStorage)
src/app/              jogo.ts (controlador), main.tsx (entrada), depuracao.ts (visualizador do núcleo)
testes/               Vitest
design/ exportados/   protótipo e referências visuais (Claude Design)
docs/comparacao/      prints da original × refatorada, com o mapa de diferenças
```

Páginas: `index.html` é o jogo; `depuracao.html` é o visualizador do núcleo, com círculos no lugar dos sprites.

### Camadas

```
nucleo  ◄── app/jogo ──► desenho (canvas)
   ▲            │
conteudo        └──────► interface (Preact)  ──► ações voltam para app/jogo
```

- **`app/jogo.ts`** é o único lugar que liga as partes. Traduz toque e teclado em comandos, avança o núcleo em passos fixos e transforma cada evento em reação: texto, partícula, tremor, aviso, som e mudança de tela. Também guarda o que é só apresentação, por criatura: o balanço do sprite, o flash, o clarão de entrada, a barra de HP atrasada e a borda do golpe recém-usado.
- **`desenho/`** e **`interface/`** só leem o estado. A interface redesenha a 12,5 Hz durante a partida, como na Arena, e o canvas a cada quadro.
- Opções pela URL, equivalentes às props da Arena no Claude Design: `?dificuldade=facil|normal|dificil`, `&assist=0`, `&velocidade=1.25` e `&semente=123` (repete a mesma batalha).

## Fluxo da batalha

```
entrada (toque/teclado/rede/IA) ──► Comando[] ──► avancar(estado, conteudo, comandos) ──► Evento[] ──► desenho, som, HUD
                                                        │
                                                   estado (JSON puro)
```

- `criarBatalha(conteudo, config)` monta o estado a partir de uma entrada de `batalhas.json`, com `configDaBatalha`.
- `avancar` aplica os comandos e avança um passo. Enquanto o jogador escolhe a próxima criatura (`aguardandoEscolha`), só os comandos rodam e o tempo não anda.
- `aplicarComandos` aplica comandos sem avançar o tempo. O app usa isso para o toque valer na hora, como "PRÓXIMO" aparecer no card no mesmo quadro. É equivalente a mandar os mesmos comandos no próximo `avancar`, e um teste garante isso.
- **Comandos**:
  - `direcao` (teclado ou joystick)
  - `destino` (toque; `fixo` enquanto o dedo está na tela)
  - `proximoGolpe` (fila; tocar de novo cancela)
  - `trocar`
  - `tatica`
- **Eventos**:
  - `golpe` (com `conjuracao`), `projetil`, `projetilPerdido`, `forma` (forma instantânea, com posição e direção)
  - `dano` (com a eficácia e a `origem`: `contato`, `projetil`, `forma` ou `continuo`), `buff`, `cura`
  - `deslocamento` (`avancar`, `recuar`, `empurrar`, `puxar`), `condicao`
  - `errou`, `interrompido`
  - `trocaIniciada`, `entrou`, `desmaio`
  - `aguardandoEscolha`, `fim`
  - `comandoRecusado` (traz o motivo)
- Cada equipe tem um `piloto`: `jogador` ou `ia`. A IA define a tática pelo HP e manda a próxima criatura sozinha. Os golpes automáticos (`escolherGolpe`) valem para as duas equipes, e é isso que faz os golpes "saírem sozinhos".
- O laço do app acumula o tempo real e chama `avancar` quantas vezes for preciso (ver `atualizar` em `src/app/jogo.ts`). A velocidade de jogo multiplica só esse acumulador.

## Golpes como lista de efeitos

O golpe é dado: uma lista de efeitos (`conteudo/LEIAME.md` tem a lista completa). O motor conhece um conjunto fechado de peças e cada golpe é uma combinação delas. Para criar golpes novos, basta editar o JSON. Só uma peça nova exige código, com teste.

- **Ação** (`Lutador.acao`): golpe em andamento. Primeiro corre a `conjuracao`, parado. Depois os efeitos rodam em ordem: os instantâneos na hora, e os que têm duração (`avancar`, `recuar`) fazem o próximo esperar. Enquanto há ação, a criatura não começa outro golpe.
- **Deslocamento** (`Lutador.deslocamento`): movimento forçado de avanço, recuo, empurrão ou puxão. Enquanto dura, ignora a entrada do jogador e a tática, e no fim a criatura para no lugar.
- **Condições** (`Lutador.condicoes`): lentidão, preso, atordoado, dano contínuo e debuff, cada uma com tempo restante. Uma nova do mesmo tipo substitui a anterior.
- **Interrupção**: ser empurrado, puxado ou atordoado corta a ação. Sair de campo limpa buff, condições, deslocamento e ação.
- **Perfil** (`perfilDoGolpe`): o que o golpe faz, lido dos efeitos (contato, dano, controle, buff, cura, movimento). O motor usa para a recarga global e para a aproximação de golpes na fila; a IA, para decidir quando usar; a interface, para o resumo no card.
- **Velocidade e atributos** passam por `velocidadeAtual` e `combatente`, que somam buff e debuffs e aplicam a lentidão.
- Os temporizadores novos usam uma folga de 10⁻⁹ para o resíduo do ponto flutuante não dar um passo a mais.

## Base espacial

Decisão de 2026-11-01: a arena continua com a área andável de **296 × 118** unidades (o chão inteiro tem 320 × 130). O guia de golpes (`origem/Guia_de_formulacao_de_golpes_Arena_Vale_das_Criaturas.md`) dizia 143 × 88, uma medida errada; os tamanhos dele valem como estão escritos, na mesma unidade dos alcances e das velocidades.

- **Corpo.** Cada criatura é um círculo de raio `raio` da espécie (padrão `regras.raioCriatura`). Formas e projéteis acertam quando encostam no corpo.
- **Mira.** No começo do golpe, a ação guarda onde o rival estava e a direção até ele (`Acao.mira`). A área no rival cai nesse ponto; o cone e a linha apontam nessa direção. Quem vê a marca durante a conjuração tem tempo de sair.
- **Formas** (`area`, `cone`, `linha`): a geometria fica em `src/nucleo/formas.ts`, e o desenho usa a mesma conta para pintar as marcas no chão.
- **Zonas** (`EstadoBatalha.zonas`): formas com duração acertam a cada pulso. A área fica parada onde caiu; o cone e a linha são canalizados, andam com quem usa e acabam junto com a ação.
- **Projéteis que podem errar** (`reto`, `persegue`, `quica`) têm velocidade própria, vida e contagem de acertos. O `guiado` da Arena continua igual.
- **Recarga do fim.** A recarga do golpe fica cheia e parada enquanto ele está em andamento e começa a correr quando a ação acaba, completa ou interrompida (`encerrarAcao`).
- **Quem usa** (`durante`): `parado` freia como a conjuração da Arena; `lento` e `livre` passam pelo fator `Acao.movimento` em `velocidadeAtual`.
- **Chance.** Um efeito com `chance` < 1 sorteia; sem `chance`, não mexe no sorteio, e por isso as batalhas gravadas continuam idênticas.

A batalha `formas` junta 24 golpes do guia; `testes/formas.test.ts` confere cada peça, incluindo a fórmula de esquiva do projétil reto em três combinações de velocidade.

## Os 110 golpes do guia

O pacote `conteudo/vale/` tem os 11 elementos e os 110 golpes do guia, montados só com peças do motor (o mapa completo está em `conteudo/LEIAME.md`). Abra com `?pacote=vale&batalha=lab-fogo` (um laboratório por elemento) ou `?pacote=vale&batalha=torneio`.

- **Estados** (`estados.json`): congelado, cegueira, rachado, gelado, leve, intangível, embaixo da terra, armadura, gigante, esfera de ar, couraça, estática, sentido sísmico, caçada, e os de quem está dentro de um campo. Cada estado é uma combinação de modificadores; `mods` (`src/nucleo/estados.ts`) junta numa conta só os estados da criatura e os campos onde ela está.
- **Terrenos e névoas** (`campos.json`): 22 do guia (2 por elemento) e 8 próprios de golpes. São zonas com `campo`: entrada, permanência, pulsos, imunes, estado de quem está dentro e do dono, efeito nos projéteis, empuxo, rampa, ritmo do tempo, disparo, detonação e o que apagam.
- **Formas que andam, crescem e esperam** (`move`, `raioFinal`, `atraso`), **várias de uma vez** (`varias`, com `b.agendados`) e **campos como munição** (`cada-campo`).
- **Projéteis**: estouro, quicas, gruda, volta, aura, dreno, consumir campos e herdar terreno. Cada projétil guarda uma cópia do efeito que o criou (`Projetil.def`), porque vários nascem de dentro de outros efeitos.
- **Movimento**: avanço que atravessa e acerta ao passar, rastro no caminho, teleporte, atração e corrente (ligações processadas depois do `agir`).
- **Objetos** (`b.objetos`): pilar, portais (levam só quem entra neles), cópia falsa (sorteia a mira só quando existe uma) e pino.
- **Especiais**: Espelho Arcano copia o último golpe do rival; Sangue Antigo escala com o HP perdido; Estilhaçar bate mais em quem está congelado.

Tudo isso só existe no pacote `vale` (e no laboratório `formas`): nos golpes da Arena não há estados nem campos, e por isso a paridade continua valendo. Os caminhos novos só rodam quando há zonas, objetos ou estados.

**Ajustes feitos no guia** para os golpes funcionarem como descritos:
- Salto Arcano reaparece a 20 do rival, não a 40: com um anel de 15, a 40 ele nunca acertaria.
- Ressonância sem cristais é usada a até 32 (o anel de 20 mais o corpo).
- Tornado nasce em quem usa e anda até o rival (o guia não dizia de onde ele sai).
- Corpo a corpo (Mordida, Sangue Antigo, Estilhaçar) tem alcance 30: com corpos de raio 12, "20 px" não deixaria encostar.
- Carnívora nasce ao lado do rival (a 22), para ele precisar pisar nela.
- Para-raios: o Campo estático fica em volta do rival, e o pino a 20 dele.
- Fluxo e Refluxo fica onde foi usado, em vez de acompanhar quem usa.
- Muralha de Fogo e Cerca Elétrica: "quem atravessa" vira "quem entra ou está dentro".
- Queimadura: 4 por segundo durante 3 s (o guia não dava números).
- Vinhas: o tropeço é preso por 0,4 s.
- Esporos: Natureza é imune ao dano e se cura dentro (o guia dizia que ela regenera).

**Provisório até decisão:** Explosão é neutra (×1) na tabela de tipos; terrenos e névoas não reagem entre si (só as reações dos golpes); as criaturas do `vale` são de laboratório (6 reaproveitam sprites do protótipo, 5 aparecem como bolinha); Explosão tem cor provisória.

**Trava de paridade.** Antes do sistema de efeitos, gravei três batalhas do protótipo evento por evento (`testes/fixtures/paridade.json`). O teste `testes/paridade.test.ts` exige que o motor continue reproduzindo cada uma igualzinho. Se uma mudança de regra for intencional, regrave com `GERAR_PARIDADE=1 npx vitest run testes/paridade.test.ts` e explique no commit.

## Online (planejado)

O servidor roda o mesmo `avancar` como autoridade. Os clientes enviam comandos e recebem o estado e os eventos. O resultado só é idêntico entre motores JavaScript diferentes até certo ponto: `Math.sin` e `Math.hypot` podem diferir no último bit entre V8 e Safari. Por isso o modelo previsto é **servidor autoritativo**, e não *lockstep* entre clientes. Replays e testes rodam no mesmo motor e são exatos.

## Diferenças em relação à Arena original

O núcleo reproduz `design/Arena.dc.html` com estas mudanças deliberadas:

- O passo é fixo (1/60 s), em vez do `dt` variável limitado a 0,05 s.
- As regras ficaram simétricas para as duas equipes: o banco do rival também recarrega, e a troca do rival também cancela os ataques do jogador.
- O atraso até a próxima criatura depois de um desmaio é 1,0 s para as duas equipes (era 0,9 s para o jogador e 1,0 s para o rival).
- O dano causado é contado nas duas equipes (era só no jogador).
- Golpes são listas de efeitos, e a categoria é só um rótulo de dados. Os 19 golpes da Arena viraram listas de um efeito (`dano`, `projetil` ou `buff`) e se comportam exatamente como antes.
- As primeiras criaturas começam a batalha já prontas. Na Arena, a "entrada" de 0,3 s delas também terminava durante a contagem "PRONTO?/JÁ!", então o efeito é o mesmo. O clarão branco da entrada é só visual.

Ficaram de fora do núcleo, porque são apresentação: a conjuração visual de 0,2 s, o flash, a animação de dano atrasada (`hpLag`), as partículas, os textos flutuantes e a câmera. Eles vivem em `app/jogo.ts` e `desenho/`.

Ficou de fora de vez: a sprite sheet animada da Briserecs. O arquivo nunca esteve no projeto (era um blob do Claude Design), e a própria Arena sempre caía no sprite 24×24. Quando a sheet existir, ela entra pelos dados.

A paridade visual foi conferida tela a tela: 9 telas idênticas pixel a pixel. Ver [comparacao/README.md](comparacao/README.md).

Correção de 2026-11-01: quando as duas criaturas atiravam no mesmo passo, só o último projétil saía da altura de quem atirou; o outro saía da altura do alvo. Agora cada projétil sai da altura de quem atirou, como na original (`h: mid + alt` no `Arena.dc.html`). Na conferência contra o commit anterior, 29 de 31 quadros deram idênticos; os 2 restantes eram esse caso, e fora da caixa dos projéteis os pixels também deram idênticos.

## Problemas conhecidos

- **Impasse de esquiva.** Quando as duas equipes estão com menos de 30% de HP e as duas pilotadas pela IA, as duas passam a ESQUIVAR, fogem para cantos opostos e ninguém mais alcança ninguém. Isso também acontece com o jogador parado na tática ESQUIVAR contra um rival fraco. A regra veio da Arena original e foi mantida para paridade. Ideias para resolver: esquivar só enquanto o rival estiver ao alcance; ou a IA não esquivar se o rival também estiver esquivando. O teste de IA contra IA desliga a esquiva (`ia.hpEsquiva = 0`) enquanto isso não for decidido.
- **Empate eterno com cura.** Na batalha `laboratorio`, o duelo final costuma ser Brotinho contra Brotinho. Planta resiste a planta e os dois usam Fôlego (cura de 25% a cada 8 s), então a cura vence o dano e a luta não acaba. Não é defeito do motor: é balanceamento (recarga maior, cura menor, ou cura que perde força a cada uso). O simulador de balanceamento é o lugar para medir isso.
- **Nomes longos no card 2×2.** "Investida Veloz" e "Salto para Trás" aparecem cortados com reticências no card da Arena.
- **Efeitos extras não aparecem no card.** O resumo mostra só o principal ("Poder 15 · Longe"); o "prende" da Teia de Raiz não aparece.
- **IA não desvia.** Com as táticas atuais, a IA anda até a distância de perseguição e para; quase todo projétil reto e toda marca no chão acertam. Na batalha `formas`, IA contra IA, a equipe 1 venceu nas 5 sementes testadas. O desvio é trabalho do jogador (posicionamento), mas a IA rival vai precisar reagir às marcas.
- **Pendências do guia:** reações entre terrenos e névoas, a linha e a coluna de Explosão na tabela de tipos, e a condição de uso dos golpes (a IA ainda usa a heurística de alcance e HP).

## Comandos

```bash
npm run dev      # jogo em http://localhost:5173 (depuração em /depuracao.html)
npm test         # testes
npm run check    # verificação de tipos
npm run build    # build de produção em dist/
```
