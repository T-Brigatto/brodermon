# Revisão de arte — golpes, efeitos e elementos (pacote vale)

Escopo: só a arte dos golpes, dos efeitos (condições e estados) e das cores dos elementos.
Nada de regra, número, interface do catálogo, câmera, arena ou sprite de criatura foi alterado.
`cor`, `fundo` e `particula` de cada tipo continuam iguais (são a identidade do elemento na UI).

Os nomes abaixo são os do HTML entregue (código minificado formatado). As funções novas têm nome
descritivo (`fx...`) para facilitar levar ao código-fonte.

## 1. Conteúdo (`conteudo/vale/`, tipos)

Arquivo `tipos-vale-fx.json`: para cada elemento, `fx.cores` passa a ter 5 tons e `projetil`
passa a ser `[escura, média, clara]` da rampa nova.

Ordem dos 5 tons: **contorno, escura, média, clara, brilho**.

| Elemento | contorno | escura | média | clara | brilho |
|---|---|---|---|---|---|
| Fogo | #4a1424 | #a82a2a | #ef6a3a | #ffb02e | #fff4b8 |
| Água | #10285e | #1d4fa8 | #2f8cf0 | #8ad0ff | #f2fbff |
| Gelo | #1a3557 | #3d7fb0 | #7fc8ec | #d2f3ff | #f4f4f4 |
| Ar | #0f3a48 | #1f7d8c | #4cc9d8 | #b8f3f7 | #f4f4f4 |
| Eletricidade | #2a1f4d | #c27a12 | #f2c230 | #fff09a | #f4f4f4 |
| Terra | #26160f | #5a3a26 | #8b5e3c | #c4925e | #ecc794 |
| Mineral | #1c2433 | #4d5b6e | #8a9bb0 | #d4e4f2 | #f4f4f4 |
| Natureza | #0c2e22 | #1f6a3a | #3fae5a | #9be08a | #e3f59a |
| Arcano | #241040 | #5a2a8f | #9b5bd6 | #d6a8f5 | #fbe6ff |
| Primordial | #330b19 | #6e1a30 | #c23b55 | #f08a98 | #ffd8cc |

Importante: os 5 tons só funcionam junto com a mudança do renderizador (seção 2, `Rp`/`ih`).
Com o renderizador antigo, o 1º tom seria lido como "escura".

## 2. Renderizador de efeitos

### Paleta
- `Rp(cores)` (paleta do efeito): com 5 cores devolve `{contorno, escura, media, clara, quente}`;
  com 4 ou menos mantém o comportamento antigo (`contorno` = 1º tom).
- `ih(cores)` (paleta das animações genéricas: impacto, nova, raio): mesmo mapeamento.
- `ah.particula`: partículas usam a rampa sem o tom de contorno.

### Contorno em todas as primitivas
O passe de contorno passou de `escura` para `contorno` em: `Up` (labaredas), `cm` (espinhos),
`um` (pedras), `hm` (folha), `gm` (vinha), `Xp` (arcos), `Yp` (riscos de vento), `ym` (runas),
`bm` (garras), `xm` (mordida), `fm` (rachaduras), `Xm` (orbe), `em` (tornado), `nm` (anel),
`rm` (círculo rúnico), `Cm` (corrente) e nos projéteis de `Zm` (bola-de-fogo, meia-lua, gota,
bolha, espinho, rocha, lâmina-giratória).

### Formas
- `qp` (bolhas: jatos de fogo e água, gêiser, onda): cada bolha vira gota alongada no sentido do
  movimento; contorno escuro só a partir de raio 2 (bolha miúda não vira mancha escura); fase
  escura mais curta; fogo vira fumaça a partir de 75% da vida.
- `cm` (espinhos, estacas, cristais): lado iluminado (clara), lado em sombra (escura), crista
  com brilho na ponta e contato escuro no chão.
- `Bm` (área de espinhos): estaca mínima de 9 px, central ×1,45.
- `desenhar` → `raio`: relâmpago com halo, contorno escuro completo, corpo claro e núcleo
  branco; arcos curtos (até 40 px) ficam finos.

### Campos e zonas
- `fxDentro` (novo) + `np`: retângulos de campo (linha/parede) com quinas arredondadas
  (raio até 6). O telegrafo branco de conjuração continua com quina viva.
- `ip`: estilo `campo`: tinta sólida (30%), borda de cima na cor clara, laterais na média, base
  no contorno. Sai a sombra azul-marinho de caixa de seleção.
- `mp`: campos de terreno e zonas animadas usam a paleta do elemento; `fxTintaCampo` (novo)
  escolhe a tinta (média quando ela é mais escura que a areia sem ser quase preta, senão escura);
  névoa vira véu claro sem trama.

### Objetos de golpe (`hp`)
- `portal`: buraco escuro com aro tracejado girando e brilhos.
- `pino` (para-raios): haste com contorno, globo piscando e faísca.
- `pilar`: cristal facetado com ponta, lado claro, lado escuro e brilho.

### Efeitos sobre os bichos
- `gp` (congelado): bloco de gelo facetado translúcido.
- `_p` → `fxCondicoes` (novo): atordoado (estrelas 3×3 com contorno girando sobre a cabeça),
  preso (duas amarras de vinha nos pés), lentidão (anel tracejado + gotas), dano contínuo
  (labaredas nas laterais e brasas subindo, na cor do elemento do golpe), debuff (seta para baixo
  na cor do atributo), acorrentado (corrente entre o alvo e quem prendeu, com barriga).
- `fxAuraEstado` (novo): anel tracejado girando no chão para cada estado que tem `fx`.
- `fxSobreEstado` (novo): esfera de ar (bolha), couraça (hexágono com brilho correndo),
  presa (mira de cantoneiras), estática (faíscas orbitando).
- `fxBuff` (novo): setas subindo pelas laterais na cor do atributo (substitui os 4 pixels).
- `ah.cargaChao` / `ah.cargaAr`: anel que se fecha durante a conjuração e partículas que
  convergem para o centro, com clarão no fim.

### Nitidez
- `fxCamada` (novo), usado por `pp` em todo desenho de efeito: converte cada retângulo do mundo
  para pixels inteiros de tela. Com o zoom fracionário da câmera, os `fillRect` deixavam
  listras finas dentro de chamas, fumaça e campos; agora os pixels saem cheios, como nos sprites.

## 3. Verificação feita
- Os 103 golpes do pacote vale e os 55 do protótipo rodaram 2,2 ciclos cada, sem erro.
- Mesmos quadros (mesma semente) comparados antes/depois.
- Desempenho no navegador sem GPU: 46 → 43 quadros/s com o catálogo inteiro aberto.
