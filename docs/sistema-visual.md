# Sistema visual

## Paleta base — Sweetie 16

A Arena e os selos em pixel usam a paleta **Sweetie 16** (GrafxKid) e mais alguns neutros escuros de interface.

| Cor | Hex | Uso típico |
|---|---|---|
| quase preto | `#1a1c2c` | contorno, texto sobre cor clara |
| ameixa | `#5d275d` | moldura do rival |
| vinho | `#b13e53` | HP perdido, derrota, x0 |
| laranja | `#ef7d57` | fogo, HP baixo, alerta |
| amarelo | `#ffcd75` | destaque, foco, fila, títulos |
| verde-claro | `#a7f070` | HP cheio, botão principal, vitória |
| verde | `#38b764` | sombra do botão principal, vantagem |
| verde-azulado | `#257179` | vegetação |
| azul-escuro | `#29366f` | estandarte |
| azul | `#3b5dc9` | moldura do jogador |
| azul-claro | `#41a6f6` | água |
| ciano | `#73eff7` | ar, tática ativa |
| branco | `#f4f4f4` | texto principal |
| cinza-azulado claro | `#94b0c2` | texto secundário |
| cinza-azulado | `#566c86` | texto apagado |
| ardósia | `#333c57` | bordas |

Neutros de interface: `#0c0d16` (fundo da página), `#10121e`, `#141625` (painéis), `#1d2035`, `#262b44`, `#2a2f4a`, `#c0cbdc` (texto terciário).

**Moldura de pixel** (Arena): sem `border-radius`; borda de 2px com `box-shadow: 0 -2px 0 0 C, 0 2px 0 0 C, -2px 0 0 0 C, 2px 0 0 0 C`, mais `inset 0 -4px 0 0` para o degrau dos botões e `translateY(2px)` no `:active`.

## Cores dos 10 tipos

| Tipo | Selo (`c`) | Claro (`l`) | Escuro (`d`) | Fundo UI (`tint`) | Tinta do ícone | Accent do card | Gradiente do card (vibrante) |
|---|---|---|---|---|---|---|---|
| Fogo | `#ef6a3a` | `#ffb27a` | `#a8322a` | `#46213c` | branco | `#ffbe76` | `#d94b27 → #5e1914` |
| Água | `#2f8cf0` | `#8cc8ff` | `#1d4fa8` | `#1f3566` | branco | `#82ccdd` | `#226bd4 → #0e285c` |
| Ar | `#4cc9d8` | `#b8f3f7` | `#22808f` | `#1b4260` | `#14243a` | `#9aecdb` | `#2798a6 → #0f3d47` |
| Terra | `#b9773f` | `#e2b07a` | `#6e4123` | `#3d2a2a` | branco | `#f5cd79` | `#9c6534 → #3d2412` |
| Eletricidade | `#f2c230` | `#fff09a` | `#b07a10` | `#463826` | `#14243a` | `#ffeaa7` | `#c79816 → #453309` |
| Natureza | `#3fae5a` | `#9be08a` | `#1f6a3a` | `#173f45` | branco | `#b8e994` | `#2b8543 → #10381c` |
| Mineral | `#8a9bb0` | `#d6dfe8` | `#4d5b6e` | `#2b3451` | branco | `#d1d8e0` | `#65758c → #242b38` |
| Arcano | `#9b5bd6` | `#d6a8f5` | `#5a2a8f` | `#3a2148` | branco | `#e0b0ff` | `#8847cc → #2d144d` |
| Primordial | `#c23b55` | `#f08a98` | `#6e1a30` | `#3e1a2e` | branco | `#ff9ff3` | `#b52b4c → #420e1d` |
| Gelo | `#7fc8ec` | `#e6f8ff` | `#3d86b0` | `#24405a` | `#14243a` | `#c7ecee` | `#3c98bd → #14374a` |

Fontes: selo, claro, escuro e tinta vêm de `Lab de Selos`/`Selos Finais`; o fundo UI é o `tint` dos selos em pixel; accent e gradiente vêm do card final (`PAL` em `Cards_de_golpe_final.html`, que também tem os acabamentos `s` sóbrio e `e`).

Os selos em pixel (`Lab de Tipos`) usam rampas de 2 cores, todas da Sweetie 16 ou próximas: fogo `#ffcd75/#ef7d57`, água `#73eff7/#41a6f6`, ar `#f4f4f4/#73eff7`, terra `#e3a86e/#b06a3c`, eletricidade `#f4f4f4/#ffcd75`, natureza `#a7f070/#38b764`, mineral `#f4f4f4/#94b0c2`, arcano `#f4f4f4/#a95cc6`, primordial `#ef8a8a/#b13e53`, gelo `#f4f4f4/#a8e4f4`.

## Fontes por página

| Página | Fonte |
|---|---|
| Arena, Lab de Tipos | Pixelify Sans (texto) + Press Start 2P (títulos), com `-webkit-font-smoothing: none` |
| Lab de Selos, Selos Finais | Rubik 500/600/800 |
| Lab de Golpes | Tw Cen MT → Josefin Sans (fixa no template) |
| Lab v4 | Urbanist, com Lexend e Outfit como alternativas |
| Card final | Big Shoulders Display 700, embutida |

A Arena desenha os números de dano e os avisos no canvas com uma fonte própria de 3×5 pixels (`D.FONT`), em maiúsculas e sem acento.

## Ícones

- **Tipos (final)**: `design/icones/tipos/` — selo 32×32 e glifo 24×24 em `currentColor`. Os traços usam `stroke-width` 2,4 com pontas arredondadas.
- **Categorias (final, 6b)**: Físico = três garras, Mágico = projétil com rastro, Especial = chevrons duplos. `design/icones/categorias/`, 24×24, `currentColor`.
- **Alcance**: Perto = espada curta, Longe = alvo/mira, Em si = silhueta de pessoa.
- **Tempo**: recarga = seta circular, conjuração = ampulheta.
- **Arena (pixel)**: ícones 8×8 por tipo (`D.ICON`) e glifos de interface (`D.GLYPH`: alvo, golpe, troca, setas, táticas, fechar), desenhados com `box-shadow` de 1px por pixel.

O card final redesenha os ícones de tipo, categoria e alcance com outros paths (ver `ELEM`, `CAT`, `RNG` no arquivo). Antes de usar um ícone, decidir com o usuário qual família vale.

## Card de golpe final

`exportados/Cards_de_golpe_final.html`, painel de 390px com cards de 366×52 em 1 coluna:

```
[slot 44×44] NOME DO GOLPE   [NA FILA]        ↻ 2.5  [placa 44×44]
             [tipo | categoria | alcance] [⧗ 0.4] [ATQ 6 SEG]   poder / tempo
```

- **Slot** à esquerda: espaço para arte (hoje um ícone de imagem genérico, ou o ícone do tipo com a prop `slot: 'elemento'`).
- **Placa** à direita: mostra o poder (ou `+N` no buff); na recarga mostra o tempo restante em amarelo e enche de baixo para cima.
- **Moldura de pixel**: anel de 2px na cor do estado, degrau de 2px embaixo e contorno escuro `#0b0c12` com cantos em degrau.
- **Estados**: pronto (anel no accent misturado); recarregando (o card afunda 2px, perde o degrau e escurece 50%); na fila (anel `#ffcd75` e etiqueta "NA FILA"); recém-pronto (anel branco por 450 ms).
- **Contraste**: o fundo atrás do texto nunca passa de luminância 0,125 (branco com contraste de 6:1 ou mais); `skinScrim()` soma uma película escura só o necessário.
- **Props** (sem `data-props`, valores padrão no código): `modo` (`interativo` ou estado fixo de referência), `acabamento` (`sóbrio`, `vibrante` ou outro valor para o meio-termo `e`; padrão vibrante), `slot` (`placeholder` ou `elemento`).
