# Comparação: Arena original × Arena refatorada

Cada imagem tem três painéis:
- **à esquerda**, a Arena original (`design/Arena.dc.html`, Claude Design);
- **no meio**, a refatorada (`index.html?pacote=prototipo`: núcleo em TypeScript, desenho em canvas e painéis em Preact; sem o parâmetro, o jogo abre o pacote `vale`);
- **à direita**, o mapa de diferenças, com cada pixel diferente pintado de magenta.

Resultado de 2026-10-31: **as 9 telas são idênticas pixel a pixel** (0 de 329.160 pixels diferentes em cada uma).

| # | Tela | Pixels diferentes | Imagem |
|---|---|---|---|
| 1 | Título | 0 | [01-titulo.png](01-titulo.png) |
| 2 | Contagem "PRONTO?" | 0 | [02-pronto.png](02-pronto.png) |
| 3 | Início da batalha (aviso "VAI", dica de toque) | 0 | [03-inicio.png](03-inicio.png) |
| 4 | Meio da batalha (HP com atraso, buff, recargas, fila, projétil, KO, troca em espera) | 0 | [04-batalha.png](04-batalha.png) |
| 5 | Pausa | 0 | [05-pausa.png](05-pausa.png) |
| 6 | Ajuda: como jogar | 0 | [06-como-jogar.png](06-como-jogar.png) |
| 7 | Ajuda: tabela de tipos | 0 | [07-tipos.png](07-tipos.png) |
| 8 | Escolha da próxima criatura | 0 | [08-escolha.png](08-escolha.png) |
| 9 | Fim: vitória, com destaque da batalha | 0 | [09-fim.png](09-fim.png) |

## Como foi feito

1. **Mesma tela.** As duas versões rodaram no navegador do app com a janela em 390×844, escala 1, no mesmo tamanho do design.
2. **Mesmo estado, com o tempo parado.** Em cada tela, o laço de quadros das duas versões foi parado e as duas receberam exatamente o mesmo estado: posições, HP, barra de atraso, recargas, golpe na fila, buff, projétil, texto flutuante, aviso, câmera, tática e criaturas desmaiadas. Depois cada uma redesenhou. Na original, o estado foi alterado pelo componente interno da página; na refatorada, pelo objeto `jogo`, que fica exposto no console só em desenvolvimento.
3. **Print sem perda.** Cada tela foi capturada em PNG, em tamanho real.
4. **Comparação pixel a pixel** com o Pillow. A tolerância para ruído de captura era de 24 em 255 por canal, mas nenhuma tela chegou a usá-la: todas deram diferença zero.

## O que a comparação pegou e foi corrigido

A primeira rodada deu 3 telas com diferenças pequenas (13, 55 e 54 pixels), todas em textos com número, como "50/110", "4 CRIATURAS" e "Seu time 5/6".

A causa: o navegador ajusta o espaçamento entre letras de forma diferente quando o texto vem em um pedaço só ou dividido em vários. O template da Arena junta alguns textos e divide outros. A refatorada agora divide cada texto exatamente igual à original. Os pontos estão comentados em `src/interface/`.

## Além dos prints

Os prints validam o visual. As regras são validadas pelos testes (`npm test`): dano, eficácia, fila, troca, desmaio, IA, determinismo e conteúdo. A partida ao vivo também foi conferida no navegador: começar com Enter, golpes automáticos, fila, toque para mover, troca com Shift+3, pausa com Esc, buffs e números de dano. O console terminou sem erros.

O que os prints parados não cobrem são os efeitos que dependem de sorteio ou de tempo:
- as partículas;
- o tremor da tela;
- a cintilação do projétil de fogo;
- o piscar do marcador de destino.

O código deles é porte direto da Arena; ver `src/desenho/cena.ts` e `src/app/jogo.ts`.
