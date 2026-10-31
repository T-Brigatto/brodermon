# O jogo — regras da Arena

Tudo aqui vem de `design/Arena.dc.html`, o único protótipo jogável. Ele usa o sistema **antigo** de 7 tipos; o sistema novo de 10 tipos está no fim deste arquivo.

## Conceito

Batalha 1×1 em tempo real numa arena vista em perspectiva. O jogador tem um time de 6 criaturas e o rival tem 4. Os golpes **saem sozinhos** quando recarregam e o rival está ao alcance; o jogador escolhe onde a criatura anda, qual golpe vem a seguir, quando trocar de criatura e a tática de movimento.

## Telas

`title` → `ready` (1,5 s: "PRONTO?" / "JÁ!") → `play` ⇄ `pause` → `choose` (quando a sua criatura desmaia e restam 2 ou mais) → `over` (VITÓRIA!/DERROTA, com tempo, nocautes, dano e destaque da batalha). A ajuda (`help`: "COMO JOGAR" e "TIPOS") abre por cima de qualquer tela.

## Controles

| Ação | Toque | Teclado |
|---|---|---|
| Mover | tocar na arena (segurar e arrastar guia) | WASD ou setas |
| Próximo golpe | tocar no card do golpe (de novo cancela) | 1–4 |
| Trocar criatura | tocar no time | Shift + 1–6 |
| Pausar | botão de pausa | Esc ou P |
| Começar / revanche | botão | Enter ou Espaço |

A página pausa sozinha quando a aba fica oculta. As preferências ficam em `localStorage`: `vdc-arena-mute` e `vdc-arena-hint`.

## Mecânicas

- **Recarga global**: 0,9 s depois de um ataque e 1,2 s depois de um buff. "Conjuração" visual de 0,2 s.
- **Fila**: o golpe tocado vira "PRÓXIMO" e dispara assim que recarregar e estiver ao alcance. Se for corpo a corpo, a criatura anda até o alvo.
- **Troca**: animação de 0,3 s e espera de 3 s entre trocas. A criatura nova entra no lugar da antiga.
- **Táticas** (quando o jogador não está guiando):
  - AVANÇAR (`perseguir`): aproxima até ~47 e recua se ficar a menos de 27.
  - DISTÂNCIA (`manter`): fica a ~55 do rival.
  - FIRME (`parado`): não se move.
  - ESQUIVAR (`evasivo`): foge em zigue-zague.
- **IA do rival**: usa AVANÇAR e passa a ESQUIVAR com menos de 30% de HP. Escolhe o primeiro golpe pronto que alcança e que não seja "sem efeito"; usa o buff se tiver mais de 50% de HP e nenhum buff ativo.
- **Projéteis** voam a 120 unidades/s até o alvo; golpes com `melee` acertam na hora.
- **Buff**: ATQ+ ou DEF+ somados ao atributo durante `buffDur` segundos; acaba na troca.

### Fórmula de dano

```
dano = max(1, floor(poder / 18 × ataque / defesa × 3 × eficácia × STAB × aleatório × 0,9))
```

- `eficácia` = produto dos multiplicadores contra cada tipo do defensor (criatura com dois tipos multiplica).
- `STAB` = 1,5 se o golpe é de um dos tipos do atacante.
- `aleatório` entre 0,9 e 1,1.
- Eficácia 0 → dano 0 ("SEM EFEITO").

### Dificuldade (prop `difficulty`)

Afeta só o rival: ataque ×0,8 / ×1 / ×1,2 e HP ×0,9 / ×1 / ×1,1 (fácil / normal / difícil). A prop `assist` mostra os selos x2/x0.5/x0 nos golpes e as setas de vantagem no time. A prop `speed` multiplica o tempo do jogo.

## Criaturas (sistema antigo)

Cada criatura tem 2 golpes do seu tipo (um forte e um rápido), **Investida** (normal, poder 35, recarga 2,0 s, alcance 23, corpo a corpo) e um buff. Os sprites são 24×24 desenhados em código (paleta indexada).

| Criatura (id) | Tipo | HP | Atq | Def | Vel | Golpe forte | Golpe rápido | Buff |
|---|---|---|---|---|---|---|---|---|
| Briserecs (`perereca`) | ar | 100 | 14 | 12 | 59 | Ventania 45 · 2,5 s · 95 | Bolha 28 · 1,6 s · 75 | Brisa DEF+6 3 s (6 s) |
| Gotinha | água | 105 | 13 | 13 | 55 | Jato 45 · 2,5 s · 95 | Gota 28 · 1,6 s · 75 | Aqua Muro DEF+6 3 s (6 s) |
| Brasino | fogo | 95 | 16 | 10 | 61 | Labareda 50 · 2,8 s · 88 | Brasa 30 · 1,8 s · 68 | Fervor ATQ+5 3 s (5,5 s) |
| Brotinho | planta | 110 | 12 | 14 | 50 | Folhada 45 · 2,6 s · 90 | Semente 28 · 1,7 s · 75 | Raiz DEF+6 3 s (6 s) |
| Faísca | elétrico | 90 | 15 | 10 | 64 | Raio 48 · 2,6 s · 90 | Choque 28 · 1,5 s · 75 | Carga ATQ+5 3 s (5,5 s) |
| Pedrisco | rocha/planta | 120 | 14 | 16 | 46 | Pedrada 50 · 3,0 s · 85 | Cascalho 30 · 1,9 s · 70 | Casca DEF+7 3 s (6 s) |

Golpes no formato *poder · recarga · alcance*. Time do jogador: as 6, nessa ordem. Rival: Brasino, Faísca, Pedrisco, Brotinho.

A Briserecs é a única preparada para sprite sheet animada (quadros de 56×32; animações idle, walk, slash, shoot, buff, hurt, ko e win; o quadro 21 é o retrato). O arquivo da sheet não está na pasta (ver inventário).

## Tabela de eficácia (sistema antigo)

Linha = tipo do golpe; coluna = tipo de quem recebe. Vazio = 1×.

| Golpe ↓ / Alvo → | normal | fogo | água | planta | elétrico | rocha | ar |
|---|---|---|---|---|---|---|---|
| normal | | | | | | ½ | |
| fogo | | ½ | ½ | 2 | | ½ | |
| água | | 2 | ½ | ½ | | ½ | |
| planta | | ½ | 2 | ½ | | 2 | ½ |
| elétrico | | | 2 | ½ | ½ | 0 | 2 |
| rocha | | 2 | | ½ | 2 | ½ | 2 |
| ar | | | | 2 | ½ | ½ | |

## Sistema novo (10 tipos) — em construção

Tipos: **fogo, água, ar, terra, eletricidade, natureza, mineral, arcano, primordial, gelo**. Ainda não há tabela de eficácia nem criaturas nesse sistema.

**Categorias** (o que o golpe é): **Físico** (contato: garra, investida, mordida), **Mágico** (energia lançada à distância), **Especial** (buff, defesa ou efeito sem dano).

**Alcance**: Perto, Longe, Em si (buffs).

**Tempos**: recarga (ícone de seta circular) e conjuração (ampulheta; "INST" quando é 0).

Golpes de exemplo usados nos labs e no card final:

| Golpe | Tipo | Categoria | Poder | Alcance | Recarga | Conjuração |
|---|---|---|---|---|---|---|
| Labareda | fogo | Mágico | 60 | Longe | 2,5 | 0,4 |
| Jato d'Água | água | Mágico | 55 | Longe | 2,2 | 0,3 |
| Rajada | ar | Especial | 40 | Longe | 1,4 | 0 |
| Garra de Pedra | terra | Físico | 75 | Perto | 3,2 | 0 |
| Raio Curto | eletricidade | Especial | 45 | Longe | 1,6 | 0,2 |
| Chicote de Cipó | natureza | Físico | 50 | Perto | 2,0 | 0 |
| Lâmina de Quartzo | mineral | Físico | 70 | Perto | 3,0 | 0,2 |
| Foco Arcano | arcano | Especial | ATQ +10 por 6 s | Em si | 7,0 | 0,8 |
| Eco Ancestral | primordial | Mágico | 80 | Longe | 5,0 | 1,0 |
| Sopro Gélido | gelo | Mágico | 50 | Longe | 2,4 | 0,5 |

Rajada e Raio Curto contradizem a definição de Especial (têm poder). A Arena ainda não tem conjuração com tempo real nem categoria por golpe.

Correspondência provável entre os sistemas, **a confirmar com o usuário**: planta → natureza, elétrico → eletricidade, rocha → terra ou mineral. Normal não tem equivalente.
