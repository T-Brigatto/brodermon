# Direção visual aprovada (2026-11-06)

A interface do Brodermon segue a **"chapada"**: navy neutro, painéis arredondados com degrau escuro, três cores com significado fixo e fonte geométrica. O pixel art (sprites, arena, efeitos) é a estrela; a interface é o palco e não imita nenhum outro jogo. A tela aprovada é [design/provas/batalha-chapada.html](../design/provas/batalha-chapada.html) (print em `batalha-chapada.png`). Ela foi escolhida entre três provas e refinada em quatro rodadas; o que está abaixo é a régua que saiu desse processo e vale para todas as telas.

Referências que o usuário trouxe e o que ficou de cada uma: o kit "Game UI Assets" chapado (painéis, degrau, botões coloridos: ficou a base), a HUD tecnológica (ficou só a ideia de luz no estado ativo, sem brilho) e a Tw Cen MT como fonte "simétrica" (ficou a Outfit, gêmea geométrica de webfont).

## Régua

| O quê | Valor |
|---|---|
| Grade | 8 px. Respiro externo 12, espaço entre blocos 12, espaço interno 12 |
| Raio | 12 px em painéis, cards, pastilhas e botões; 6 px em etiquetas pequenas; 4,5 px no selo de tipo (proporção do 5a) |
| Alturas | placa 56 · card de golpe 72 · pastilha do time 56 · botão de tática 48 · botão quadrado (pausa) 56 |
| Degrau | `box-shadow: 0 4px 0 <degrau>` em tudo que é painel ou botão; 2 px em etiquetas |
| Retrato | 40 × 40, raio 8, fundo `#171c2c` |
| Sprites | sempre em ampliação inteira: 40 no retrato, 32 na pastilha (tira), 26 no pixel 24 × 24 |

## Cores

| Papel | Hex |
|---|---|
| fundo | `#171c2c` |
| painel | `#242b3d` |
| card | `#2b3347` |
| card em espera | `#20263a` |
| botão neutro | `#3a4458` (degrau `#262d3d`) |
| degrau | `#0f1320` |
| acento (poder, ativo, seleção, recarga) | `#ffc14d` (degrau `#c48f1f`, texto sobre ele `#171c2c`) |
| vida, vantagem, defesa | `#5fd17f` |
| perigo, vidas do rival, desvantagem | `#ff5f6d` |
| texto | `#ffffff` |
| texto secundário | `#9aa5bd` |
| texto apagado (card em espera) | `#5e6880` |

A cor do elemento aparece **só no selo de tipo** (5a) e nunca em painel, botão ou barra. Não há azul, teal, roxo ou laranja fora disso.

## Fonte

**Outfit** (Google Fonts), três pesos: 700 para nomes, números e botões; 600 para rótulos; 500 para texto secundário. Botões e rótulos em caixa alta com espaçamento de 0,5 a 1 px; nomes de golpe em caixa normal. Números com `font-variant-numeric: tabular-nums`. A fonte de pixel fica só na arena (dano, avisos no canvas).

## Componentes da batalha

- **Placa** (rival e você, o mesmo componente): retrato 40 à esquerda; duas linhas de 16 e 12 px com 6 px entre elas: nome em cima, barra de HP (8 px, raio 4) com o número à direita embaixo. No rival, os corações das vidas (11 px, vermelho, apagado em `#3a4458`) na linha do nome; em você, o selo de tipo de 16 px.
- **Card de golpe** (72 px, padding 12): linha 1 com selo de tipo 22 px (categoria 6b encaixada no canto) e nome 14/16; linha 2 com alcance e recarga à esquerda (11 px secundário) e o **poder** à direita, número âmbar 18 px com "PODER" em 9 px. Golpe sem poder mostra "DEFESA" em verde no mesmo lugar.
- **Recarga é um estado, não um dado**: o card escurece, o selo apaga (`saturate(0) brightness(0.6)`), uma barra âmbar de 4 px avança na base e os segundos aparecem em 13 px âmbar no canto superior direito. O poder continua no lugar, apagado.
- **Pastilha do time** (56 px): sprite centrado e uma barra de 24 × 4 embaixo; a que está em campo tem anel interno de 2 px âmbar; vantagem e desvantagem são bolinhas de 14 px no canto (verde com seta para cima, vermelho com seta para baixo); HP baixo deixa a barra âmbar.
- **Táticas**: quatro botões de 48 px; o ativo é âmbar com texto escuro, os outros neutros.
- **Campo**: o pixel do jogo, intocado, com 60 px de faixa escura em cima; a HUD só encosta na borda superior (pausa 56 + placa do rival).

## Como seguir

Toda tela nova nasce desta régua e é **renderizada e conferida antes de ser mostrada** (Edge headless em 390 × 844, como em `design/provas/`). Mudança de régua é decisão do usuário e entra aqui antes de entrar nas telas.
