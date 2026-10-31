# Arquitetura do jogo

Decisão de 2026-10-31: **TypeScript + Vite com núcleo determinístico** (a opção "B" das três avaliadas). O escopo vai até a **batalha online**, então o núcleo precisa rodar sem tela e servir de autoridade num servidor no futuro.

## Princípios

1. **Lógica separada da tela.** As regras ficam em `src/nucleo/`, que não conhece canvas, DOM, relógio nem som. Os comandos entram, o estado muda e os eventos saem.
2. **Passo fixo e sorteio com semente.** A simulação sempre avança de `PASSO` (1/60 s). O sorteio usa mulberry32, com o estado guardado dentro da batalha. A mesma semente com os mesmos comandos dá a mesma luta, o que permite replays, testes e balanceamento automático.
3. **Conteúdo é dado.** Tipos, golpes, criaturas, batalhas e números de regra ficam em dicionários JSON, em `conteudo/<pacote>/`. Adicionar ou remover um item não exige mexer no motor. Um esquema (Zod) valida tudo e aponta referências quebradas.
4. **Visual centralizado.** Esta é a próxima fase. As cores de tipo já vêm do conteúdo (`tipos.json`), e o resto vira tokens num lugar só.
5. **Regras testadas.** Vitest, em `testes/`. O teste `pureza` impede que o núcleo use `Math.random`, `Date`, `window`, `document`, timers ou imports de fora.

## Pastas

```
conteudo/prototipo/   dicionários do jogo (ver conteudo/LEIAME.md)
src/conteudo/         esquema (Zod) e registro dos pacotes
src/nucleo/           batalha pura: modelo, passo, dano, eficácia, IA, movimento, sorteio
src/app/              ponto de entrada no navegador (hoje: visualizador de depuração)
testes/               Vitest
design/ exportados/   protótipo e referências visuais (Claude Design); não são código do jogo
```

Ainda não existem e virão nas próximas fases: `src/desenho/` (canvas: arena, sprites, câmera, partículas), `src/interface/` (cards de golpe, time, táticas, telas; em Preact) e `src/plataforma/` (toque, teclado, som, salvamento).

## Fluxo da batalha

```
entrada (toque/teclado/rede/IA) ──► Comando[] ──► avancar(estado, conteudo, comandos) ──► Evento[] ──► desenho, som, HUD
                                                        │
                                                   estado (JSON puro)
```

- `criarBatalha(conteudo, config)` monta o estado a partir de uma entrada de `batalhas.json`, com `configDaBatalha`.
- `avancar` aplica os comandos e avança um passo. Enquanto o jogador escolhe a próxima criatura (`aguardandoEscolha`), só os comandos rodam e o tempo não anda.
- **Comandos**:
  - `direcao` (teclado ou joystick)
  - `destino` (toque; `fixo` enquanto o dedo está na tela)
  - `proximoGolpe` (fila; tocar de novo cancela)
  - `trocar`
  - `tatica`
- **Eventos**:
  - `golpe`, `projetil`, `projetilPerdido`
  - `dano` (com a eficácia), `buff`
  - `trocaIniciada`, `entrou`, `desmaio`
  - `aguardandoEscolha`, `fim`
  - `comandoRecusado` (traz o motivo)
- Cada equipe tem um `piloto`: `jogador` ou `ia`. A IA define a tática pelo HP e manda a próxima criatura sozinha. Os golpes automáticos (`escolherGolpe`) valem para as duas equipes, e é isso que faz os golpes "saírem sozinhos".
- O laço do app acumula o tempo real e chama `avancar` quantas vezes for preciso (ver `src/app/depuracao.ts`). A velocidade de jogo multiplica só esse acumulador.

## Online (planejado)

O servidor roda o mesmo `avancar` como autoridade. Os clientes enviam comandos e recebem o estado e os eventos. O resultado só é idêntico entre motores JavaScript diferentes até certo ponto: `Math.sin` e `Math.hypot` podem diferir no último bit entre V8 e Safari. Por isso o modelo previsto é **servidor autoritativo**, e não *lockstep* entre clientes. Replays e testes rodam no mesmo motor e são exatos.

## Diferenças em relação à Arena original

O núcleo reproduz `design/Arena.dc.html` com estas mudanças deliberadas:

- O passo é fixo (1/60 s), em vez do `dt` variável limitado a 0,05 s.
- As regras ficaram simétricas para as duas equipes: o banco do rival também recarrega, e a troca do rival também cancela os ataques do jogador.
- O atraso até a próxima criatura depois de um desmaio é 1,0 s para as duas equipes (era 0,9 s para o jogador e 1,0 s para o rival).
- O dano causado é contado nas duas equipes (era só no jogador).
- Golpes podem ter dano **e** buff ao mesmo tempo. A categoria é só um rótulo de dados; o motor olha `dano`, `buff` e `contato`.

Ficaram de fora do núcleo, porque são apresentação: a conjuração visual de 0,2 s, o flash, a animação de dano atrasada (`hpLag`), as partículas, os textos flutuantes e a câmera.

## Problemas conhecidos

- **Impasse de esquiva.** Quando as duas equipes estão com menos de 30% de HP e as duas pilotadas pela IA, as duas passam a ESQUIVAR, fogem para cantos opostos e ninguém mais alcança ninguém. Isso também acontece com o jogador parado na tática ESQUIVAR contra um rival fraco. A regra veio da Arena original e foi mantida para paridade. Ideias para resolver: esquivar só enquanto o rival estiver ao alcance; ou a IA não esquivar se o rival também estiver esquivando. O teste de IA contra IA desliga a esquiva (`ia.hpEsquiva = 0`) enquanto isso não for decidido.

## Comandos

```bash
npm run dev      # visualizador em http://localhost:5173
npm test         # testes
npm run check    # verificação de tipos
npm run build    # build de produção em dist/
```
