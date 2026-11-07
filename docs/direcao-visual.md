# Direção visual aprovada (2026-11-06)

A interface do Brodermon segue a **"chapada"**: navy neutro, painéis arredondados com degrau escuro, três cores com significado fixo e fonte geométrica. O pixel art (sprites, arena, efeitos) é a estrela; a interface é o palco e não imita nenhum outro jogo. A tela aprovada é [design/provas/batalha-f.html](../design/provas/batalha-f.html) (print em `batalha-f.png`): golpes embaixo de tudo, blocos separados por divisores, pastilhas do time como retratos e cards de golpe opacos. As versões anteriores ficam como histórico: `batalha-chapada.html` (a primeira aprovada, 2026-11-06) e `batalha-c.html` (a compactação, com `batalha-c-standalone.html` para revisão externa). O que está abaixo é a régua que saiu desse processo e vale para todas as telas.

Referências que o usuário trouxe e o que ficou de cada uma: o kit "Game UI Assets" chapado (painéis, degrau, botões coloridos: ficou a base), a HUD tecnológica (ficou só a ideia de luz no estado ativo, sem brilho) e a Tw Cen MT como fonte "simétrica" (ficou a Outfit, gêmea geométrica de webfont).

## Régua

| O quê | Valor |
|---|---|
| Grade | 8 px. Respiro externo 12, espaço entre blocos 12, espaço interno 12 |
| Raio | 12 px em painéis, cards, pastilhas e botões; 6 px em etiquetas pequenas; 4,5 px no selo de tipo (proporção do 5a) |
| Alturas | placa do rival 56 · placa do jogador 48 · card de golpe 72 · pastilha do time 54 · botão de tática 40 · botão quadrado (pausa) 56 · respiro inferior 24 |
| Degrau | `box-shadow: 0 4px 0 <degrau>` em tudo que é painel ou botão; 2 px em etiquetas |
| Divisor | 1 px `#2b3347` entre os blocos da HUD inferior (placa, time, táticas, golpes) |
| Retrato | 40 × 40 na placa do rival, 36 × 36 na do jogador, raio 8, fundo `#171c2c`; a arte preenche o quadro (`background-size: cover`) |
| Sprites | sempre em ampliação inteira: 24 ou 48 no pixel 24 × 24; a tira a 1,5× ou 2× com recorte no busto, só enquanto a criatura não tem retrato |

## Retratos

Cada criatura tem um **retrato** quadrado, usado na placa e na pastilha do time, no estilo dos ícones de campeão: busto ocupando o quadro, fundo chapado escuro ou na cor do elemento, olhar para a direita ou para a câmera, sem texto nem moldura. Entregue em PNG de pelo menos 108 × 108 (o dobro da pastilha) e guardado em `design/provas/img/retrato-<especie>.png`. Já existem Áries e Sagitário (gerados pelo usuário, 2026-11-06).

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
- **Ordem da HUD inferior**: placa do jogador · time · táticas · golpes, cada bloco separado por um divisor. Sem textos explicativos ("Tática: …", "Toque para trocar").
- **Card de golpe** (72 px, padding 12, dois por linha): fundo opaco `linear-gradient(180deg, #2f384e, #252c3f)` com um tingimento radial da cor do elemento no canto inferior esquerdo (42 % de opacidade, sumindo até a metade); linha 1 com o nome 13,5/16 e o **poder** à direita em âmbar 20 px (ou "DEF" em verde); linha 2 com o selo de tipo 22 px, os ícones de categoria e alcance em pastilhas `rgba(15,19,32,.55)` com traço `#e6ebf5`, e a recarga à direita em 13 px. O gradiente do Lab de Golpes ficou só como referência: na batalha o card é escuro e a cor do elemento é um tingimento.
- **Recarga é um estado, não um dado**: o card vira `#1d2233`, a linha 1 e os ícones caem para 42 % de opacidade, uma barra âmbar de 3 px avança na base e os segundos continuam no lugar. O poder fica apagado, nunca some.
- **Pastilha do time** (54 × 54, raio 10, seis por linha com 8 px entre elas): o retrato preenche o quadro por baixo de uma moldura interna de 2 px `#3a4458` e de uma vinheta (`inset 0 0 14px rgba(8,10,20,.75)` mais um fio claro em cima). Por cima: selo do elemento 14 px no canto superior esquerdo, marca de vantagem ou desvantagem 14 px no canto superior direito, barra de vida de 4 px na base. A que está em campo troca a moldura por âmbar com um halo de 1 px. HP baixo deixa a barra âmbar.
- **Táticas**: quatro botões de 40 px; o ativo é âmbar com texto escuro, os outros neutros.
- **Campo**: o pixel do jogo, intocado, com 60 px de faixa escura em cima; a HUD só encosta na borda superior (pausa 56 + placa do rival).

## Como seguir

Toda tela nova nasce desta régua e é **renderizada e conferida antes de ser mostrada** (Edge headless em 390 × 844, como em `design/provas/`). Mudança de régua é decisão do usuário e entra aqui antes de entrar nas telas.
