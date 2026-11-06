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
conteudo/vale/        os 10 elementos e os 103 golpes do guia, com estados, terrenos e névoas
src/conteudo/         esquema (Zod) e registro dos pacotes
src/nucleo/           batalha pura: passo e golpes (batalha), dano e efeitos no alvo (combate), estados,
                      chão da arena (campo: zonas, terrenos, névoas, objetos, agendados), projéteis,
                      geometria das formas, IA, movimento, sorteio
src/desenho/          canvas: perspectiva da arena, cenário, sprites, fonte de pixel, cena (setas, minimapa), efeitos especiais (fx, animacoes, pixels)
src/interface/        telas em Preact: HUD, cards de golpe, time, táticas, título, pausa, escolha, fim, ajuda
src/plataforma/       som (WebAudio) e preferências (localStorage)
src/app/              jogo.ts (controlador), main.tsx (entrada), depuracao.ts (visualizador do núcleo)
testes/               Vitest
design/ exportados/   protótipo e referências visuais (Claude Design)
docs/comparacao/      prints da original × refatorada, com o mapa de diferenças
```

Páginas: `index.html` é o jogo; `depuracao.html` é o visualizador do núcleo, com círculos no lugar dos sprites; `golpes.html` é o catálogo de golpes. Os três abrem o pacote `vale` por padrão; `?pacote=prototipo` abre a Arena original.

**Catálogo de golpes** (`golpes.html`, `src/app/golpes.tsx`): um card por golpe, com uma animação em loop e a ficha. A animação é uma batalha de demonstração no próprio `Jogo` (`demonstrar`), desenhada pelo `desenharCena` do jogo: a criatura do elemento usa o golpe num Boneco Arcano parado, com 999 de HP. Alguns golpes precisam de cena montada (`PREPAROS`: poças para o Recolher, alvo congelado para o Estilhaçar…) ou de um rival que anda (`RIVAL_ANDA`, `RIVAL_FOGE`: pisar na mina, cruzar a muralha…). A ficha (`src/interface/ficha.ts`) escreve cada efeito em português com os números do dicionário e explica os campos e estados citados. Só os cards na tela são animados. Filtros pela URL: `?tipo=fogo`, `?busca=raio`, `?pacote=prototipo`.

### Camadas

```
nucleo  ◄── app/jogo ──► desenho (canvas)
   ▲            │
conteudo        └──────► interface (Preact)  ──► ações voltam para app/jogo
```

- **`app/jogo.ts`** é o único lugar que liga as partes. Traduz toque e teclado em comandos, avança o núcleo em passos fixos e transforma cada evento em reação: texto, partícula, tremor, aviso, som e mudança de tela. Também guarda o que é só apresentação, por criatura: o balanço do sprite, o tempo desde o último golpe (animação de ataque das tiras), o flash, o clarão de entrada, a barra de HP atrasada e a borda do golpe recém-usado.
- **`desenho/`** e **`interface/`** só leem o estado. A interface redesenha a 12,5 Hz durante a partida, como na Arena, e o canvas a cada quadro.
- Opções pela URL, equivalentes às props da Arena no Claude Design: `?dificuldade=facil|normal|dificil`, `&assist=0`, `&velocidade=1.25` e `&semente=123` (repete a mesma batalha). Além delas, `&pacote=vale|prototipo` e `&batalha=<id>`.

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

## Os 103 golpes do guia

O pacote `conteudo/vale/` tem os 10 elementos e os 103 golpes do guia (10 por elemento, 11 em Fogo, Ar e Terra), montados só com peças do motor (o mapa completo está em `conteudo/LEIAME.md`). É o pacote padrão do jogo e abre no `torneio`; `?batalha=lab-fogo` abre um laboratório (há um por elemento).

- **Estados** (`estados.json`): congelado, cegueira, gelado, leve, intangível, embaixo da terra, armadura, gigante, esfera de ar, couraça, estática, sentido sísmico, caçada, e os de quem está dentro de um campo. Cada estado é uma combinação de modificadores; `mods` (`src/nucleo/estados.ts`) junta numa conta só os estados da criatura e os campos onde ela está.
- **Terrenos e névoas** (`campos.json`): 20 do guia (2 por elemento) e 8 próprios de golpes. São zonas com `campo`: entrada, permanência, pulsos, imunes, estado de quem está dentro e do dono, efeito nos projéteis, empuxo, rampa, ritmo do tempo, disparo, detonação e o que apagam.
- **Formas que andam, crescem e esperam** (`move`, `raioFinal`, `atraso`), **várias de uma vez** (`varias`, com `b.agendados`) e **campos como munição** (`cada-campo`).
- **Projéteis**: estouro, quicas, gruda, volta, aura, dreno, consumir campos e herdar terreno. Cada projétil guarda uma cópia do efeito que o criou (`Projetil.def`), porque vários nascem de dentro de outros efeitos.
- **Movimento**: avanço que atravessa e acerta ao passar, rastro no caminho, teleporte, atração e corrente (ligações processadas depois do `agir`).
- **Objetos** (`b.objetos`): pilar, portais (levam só quem entra neles), cópia falsa (sorteia a mira só quando existe uma) e pino.
- **Especiais**: Espelho Arcano copia o último golpe do rival; Sangue Antigo escala com o HP perdido; Estilhaçar bate mais em quem está congelado.

Tudo isso só existe no pacote `vale` (e no laboratório `formas`): nos golpes da Arena não há estados nem campos, e por isso a paridade continua valendo. Os caminhos novos só rodam quando há zonas, objetos ou estados.

**Animações próprias dos elementos** (`fx.animacoes` em `tipos.json`; `visual` em golpes e campos). Cada elemento escolhe uma animação por papel (projétil, área, cone, linha, parede, impacto, terreno, névoa, avanço); a lista completa está em `conteudo/LEIAME.md`. São três camadas:
- **Peças** (`src/desenho/animacoes.ts`): labareda, baforada, bolha (de fogo ou de água), risco de vento, arco, mancha, clarão, gota, espinho, pedra, rachadura, folha, vinha, runa, garra, mordida, traçado (prisma e corrente), e o funil, o anel e o círculo de runas que seguem uma zona (`Fx.continuos`). Cada peça nasce, anda e se desenha sozinha, nas cores do elemento.
- **Receitas** (`src/desenho/receitas.ts`): cada nome do dicionário combina peças, por papel: a forma que acerta, a zona que dura, o terreno ou a névoa, o impacto, o projétil (rastro e corpo) e o avanço. Os `Record` obrigam a ter receita para todo nome que o esquema aceita. Uma zona sem receita própria usa a do terreno de mesmo nome.
- **Motor** (`src/desenho/fx.ts`): guarda as peças vivas (até 1200), passa o tempo e desenha em ordem: no chão (manchas, rachaduras, ondinhas, anéis, círculos), depois fumaça, o que brota (vinhas, espinhos, chamas), o que voa e as partículas.

Labaredas, bolhas, espinhos e vinhas são pintados em camadas (contorno de todos, depois corpo, miolo e núcleo), para os que se encostam virarem um fogaréu, um jato ou um maciço só. Riscos, arcos e anéis têm 2 pixels e sombra no tom de contorno do elemento, para aparecer no chão claro.

**Revisão de arte do Claude Design** (2026-11-02; o que mudou está em `design/mudancas-arte.md`, e o catálogo de referência em `design/Catalogo_de_golpes.html`). Cada elemento tem 5 tons em `fx.cores` (contorno, escura, média, clara, brilho), e o contorno das peças e dos projéteis usa o 1º. As bolhas viram gotas alongadas no sentido em que andam; os espinhos têm lado iluminado, lado em sombra, crista e contato escuro no chão; o relâmpago tem halo e contorno. No pacote com arte própria (algum tipo com `fx`), `cena.ts` também troca:
- os terrenos e as zonas com animação por campos pintados no chão (tinta sólida, quinas arredondadas na linha e na parede, borda clara em cima, média nos lados e contorno embaixo; `desenho/formas.ts`), e a névoa por um véu claro;
- o portal, o pino do para-raios e o pilar (`desenho/sobreposicoes.ts`);
- o que fica sobre as criaturas (`desenho/sobreposicoes.ts`): estrelas do atordoado, amarras do preso, anel e gotas da lentidão, chamas do dano contínuo na cor do golpe, seta do debuff, a corrente do acorrentado, setas do buff, bloco de gelo do congelado, anel no chão de cada estado com `fx` e o desenho de alguns estados (bolha de ar, couraça, mira de presa, estática);
- a energia de conjuração (anel que se fecha e partículas que convergem).

Tudo o que é efeito sai em pixels inteiros de tela (`emPixelsDeTela` em `desenho/pixels.ts`): com o zoom fracionário da câmera, os `fillRect` deixavam listras finas dentro de chamas, fumaça e campos. A Arena original não tem `fx` e passa pelo desenho de antes, idêntica pixel a pixel. Com animação própria, a forma do golpe fica só marcada no chão (`desenho/cena.ts`). O tremor de tela vem da animação (`TREMOR_DA_ANIMACAO` em `app/jogo.ts`). O avanço que não acerta ao passar (Avanço Selvagem) é reconhecido pelo efeito `avancar` em andamento (`acao.passo`).

**Efeitos especiais comuns** (`src/desenho/fx.ts`): animações desenhadas pixel a pixel nas cores do elemento (`fx` em `tipos.json`): impacto em estrela com núcleo branco e halo, anel de energia que se abre (áreas), feixe grosso (linhas) e raio quebrado com galhos (Eletricidade); e partículas com o jeito de cada elemento (brasa sobe, gota cai, floco cintila…). A energia de quem conjura e o brilho com rastro dos projéteis são desenhados direto do estado, em `desenho/cena.ts`. O app (`fxDoQuadro` e `fxDaForma` em `src/app/jogo.ts`) solta o resto a cada quadro (o ar dos terrenos e névoas, o sopro das formas canalizadas, os estados com `fx`) e a cada evento (forma acertando, impacto, projétil saindo e sumindo, teleporte, salto do pino).

**Ritmo do vale** (`regras.json`): 2 s de pausa entre golpes e recargas 1,5× as do guia (`recargaGolpes`); o nome dos golpes aparece sobre as duas criaturas (`anunciarGolpes`). No torneio, IA contra IA, sai um golpe a cada 2,1 s (era 1,2 s) e a luta dura uns 148 s (era 84 s). É só apresentação: usa `Math.random` à vontade e não toca no núcleo. Os tipos do protótipo não têm `fx`, e a Arena original continua idêntica pixel a pixel.

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

**Provisório até decisão:** terrenos e névoas não reagem entre si (só as reações dos golpes); as criaturas do `vale` são de laboratório (5 reaproveitam sprites do protótipo, 4 aparecem como bolinha); a Briserecs, a Áries e o Sagitário têm sprite animado, importado da folha de poses (`conteudo/LEIAME.md`, "Sprite em tira"); Áries e Sagitário também têm as vistas de frente e de costas (`vistas` em `sprites.json`), usadas quando a criatura anda para o fundo ou para a frente da arena (parada ou golpeando, fica de lado); a escolha da vista, com folga para não piscar, é só apresentação (`vistaPara` em `desenho/sprites.ts`, guardada em `Visual.vista` no app). As folhas originais estão em `sprites-brutos/`.

**Sem Explosão** (2026-11-01). O guia trazia um 11º elemento, Explosão, que o usuário não autorizou; ele saiu do pacote com os 2 campos (minas, gás volátil), o estado rachado e a criatura de laboratório. Com o ok do usuário, três golpes dele mudaram de elemento, com os números do guia: Detonação foi para o Fogo, Onda de Choque para o Ar e Ruptura para a Terra; nos laboratórios, cada um entrou no lugar de um golpe repetido. Os outros sete (Granada, Bomba-Relógio, Carga Concentrada, Impacto, Campo Minado, Nuvem Volátil e Ponto de Ruptura) saíram. As peças do motor que só eles usavam continuam, testadas em `testes/vale-mecanicas.test.ts` com golpes de teste: projétil que quica e estoura (`quicas`), que gruda (`gruda`), mina (`consome` com `aoEntrar`), gás que detona (`detona`), estrutura que cai com um tipo (`destruidoPor`) e dano recebido por tipo. O estilo de efeito `estouro` (bola de fogo com clarão) também continua disponível em `tipos.json`, sem elemento usando.

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

A sprite sheet animada da Briserecs da Arena nunca esteve no projeto (era um blob do Claude Design), e a própria Arena sempre caía no sprite 24×24, que o protótipo mantém. No `vale`, a Briserecs usa uma tira nova (parado, andando, ataque e dano), feita pelo importador de folhas (`ferramentas/importar-folha.ts`).

A paridade visual foi conferida tela a tela: 9 telas idênticas pixel a pixel. Ver [comparacao/README.md](comparacao/README.md).

Correção de 2026-11-01: quando as duas criaturas atiravam no mesmo passo, só o último projétil saía da altura de quem atirou; o outro saía da altura do alvo. Agora cada projétil sai da altura de quem atirou, como na original (`h: mid + alt` no `Arena.dc.html`). Na conferência contra o commit anterior, 29 de 31 quadros deram idênticos; os 2 restantes eram esse caso, e fora da caixa dos projéteis os pixels também deram idênticos.

## Problemas conhecidos

- **Impasse de esquiva.** Quando as duas equipes estão com menos de 30% de HP e as duas pilotadas pela IA, as duas passam a ESQUIVAR, fogem para cantos opostos e ninguém mais alcança ninguém. Isso também acontece com o jogador parado na tática ESQUIVAR contra um rival fraco. A regra veio da Arena original e foi mantida para paridade. Ideias para resolver: esquivar só enquanto o rival estiver ao alcance; ou a IA não esquivar se o rival também estiver esquivando. O teste de IA contra IA desliga a esquiva (`ia.hpEsquiva = 0`) enquanto isso não for decidido.
- **Empate eterno com cura.** Na batalha `laboratorio`, o duelo final costuma ser Brotinho contra Brotinho. Planta resiste a planta e os dois usam Fôlego (cura de 25% a cada 8 s), então a cura vence o dano e a luta não acaba. Não é defeito do motor: é balanceamento (recarga maior, cura menor, ou cura que perde força a cada uso). O simulador de balanceamento é o lugar para medir isso.
- **Nomes longos no card 2×2.** "Investida Veloz" e "Salto para Trás" aparecem cortados com reticências no card da Arena.
- **Efeitos extras não aparecem no card.** O resumo mostra só o principal ("Poder 15 · Longe"); o "prende" da Teia de Raiz não aparece.
- **IA não desvia.** Com as táticas atuais, a IA anda até a distância de perseguição e para; quase todo projétil reto e toda marca no chão acertam. Na batalha `formas`, IA contra IA, a equipe 1 venceu nas 5 sementes testadas. O desvio é trabalho do jogador (posicionamento), mas a IA rival vai precisar reagir às marcas.
- **Pendências do guia:** reações entre terrenos e névoas e a condição de uso dos golpes (a IA ainda usa a heurística de alcance e HP).

## Comandos

```bash
npm run dev      # jogo em http://localhost:5173 (pacote vale; Arena original em /?pacote=prototipo; depuração em /depuracao.html)
npm test         # testes
npm run check    # verificação de tipos
npm run build    # build de produção em dist/
```
