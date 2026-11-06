# Guia de geração de sprites (GPT e Gemini)

Como pedir folhas de poses ao ChatGPT ou ao Gemini e transformar cada uma em sprite animado do jogo. O processo tem três passos: a IA desenha uma folha grande, o importador (`ferramentas/importar-folha.ts`) reduz a folha para o tamanho do jogo e o jogo toca as animações.

## O que o jogo precisa

- **Vista lateral, olhando para a direita**, em todos os quadros. O jogo vira o desenho quando a criatura olha para a esquerda. É a folha obrigatória.
- **Frente e costas** (opcionais): mais duas folhas, com o mesmo layout e as mesmas quatro animações, uma com a criatura olhando para a câmera e outra de costas. O jogo usa quando o rival está quase na mesma vertical (acima ou abaixo na arena); sem elas, a criatura fica sempre de lado. Áries e Sagitário têm as três.
- **Quatro animações**: parado, andando, ataque e dano.
- **Tamanho final**: as criaturas de hoje têm de 19 a 24 px de altura, e a Briserecs entrou com 20. A IA desenha grande e o importador reduz. O tamanho dos estágios 2 e 3 ainda não foi decidido.

## Layout da folha

O layout é sempre o mesmo, para o comando de importação ser igual para todas as criaturas:

```
linha 1   parado    [1] [2] [3] [4]   respiração leve, em laço
linha 2   andando   [1] [2] [3] [4]   ciclo de passos
linha 3   ataque    [1] [2] [3] [4]   preparação, bote, golpe, volta
linha 4   dano      [1]               recuo, olhos fechados
```

O importador acha os quadros pelos espaços vazios entre eles. Por isso:

- nenhum quadro pode encostar no vizinho, nem com efeitos. Quadros encostados viram um só: na folha do estágio 2 da Briserecs, duas linhas perderam um quadro assim;
- o fundo tem que ser de uma cor lisa, sem caixas atrás dos quadros;
- não pode ter texto, número nem rótulo: cada letra vira um "quadro".

## Prompt base

Para produzir em massa, cole o prompt base nas instruções de um **Projeto do ChatGPT** ou de um **Gem do Gemini**. Assim, cada pedido só precisa da descrição da criatura. Anexe também uma folha já aprovada como referência de estilo: é isso que mantém todas as criaturas com o mesmo traço.

```
Você gera folhas de sprites em pixel art para um jogo de batalha em tempo real de criaturas colecionáveis, no estilo dos RPGs de 16 bits. Cada pedido é UMA criatura original, descrita pelo usuário.

LAYOUT (obrigatório):
- Imagem horizontal com exatamente 4 linhas de quadros.
- Linha 1: 4 quadros da criatura parada (respiração leve).
- Linha 2: 4 quadros andando (ciclo de passos).
- Linha 3: 4 quadros atacando (preparação, bote, golpe, volta).
- Linha 4: 1 quadro levando dano (recuando, olhos fechados).
- Todos os quadros em vista lateral, com a criatura olhando para a DIREITA.
- A criatura tem o mesmo tamanho e a mesma escala em todos os quadros, e os pés ficam na mesma altura em cada linha.
- Muito espaço vazio entre os quadros: nenhum quadro encosta em outro, nem com efeitos.
- Fundo de uma cor só, [COR DO FUNDO], liso: sem degradê, textura, chão, sombra ou caixas atrás dos quadros.
- Sem texto, números, rótulos, setas, molduras ou linhas de grade.

ESTILO:
- Pixel art nítido, sem desfoque nem anti-aliasing, com contorno de 1 pixel, paleta limitada e luz vindo de cima, à esquerda.
- Mesmo traço e mesmo nível de detalhe da folha de referência anexada.
- No ataque, efeitos pequenos e colados ao corpo: o jogo desenha o golpe por cima.
- Desenho original: não copie nem imite criaturas de jogos que já existem.
```

**Cor do fundo.** O importador separa a criatura do fundo pela diferença de cor. Use uma cor que não aparece em nenhuma parte do bicho, nem no contorno:

| Criatura | Fundo |
|---|---|
| a maioria | magenta `#FF00FF` |
| rosa, roxa ou vermelha | verde `#00FF00` |

A Briserecs foi feita com fundo azul-marinho e funcionou, porque ela é clara. Com contorno preto, um fundo escuro come o contorno.

## Pedido de cada criatura

```
Criatura: [NOME], elemento [ELEMENTO].
Corpo: [forma do corpo, postura, tamanho da cabeça].
Traços marcantes: [1 a 3 coisas que fazem reconhecer o bicho].
Cores: [cor de cada parte: corpo, barriga, olhos, detalhes].
Ataque: [movimento do ataque: bote, cabeçada, patada, investida...].
```

Quanto mais a descrição for parte por parte, menos a IA inventa. Use de 1 a 3 famílias de cor: com 20 px de altura, detalhe miúdo some.

## Evoluções

1. Aprove a folha do estágio 1 primeiro.
2. Na mesma conversa, anexe a folha do estágio 1 e peça: "Mesma criatura, evolução para o estágio 2: maior e mais detalhada, mantendo [cores e traços que identificam a família]. Mesmo layout e mesmo fundo."
3. Repita para o estágio 3, anexando as duas folhas anteriores.

## Antes de importar

Salve em **PNG** (o importador não lê JPG) com o nome `sprites-brutos/ESPECIE-estagioN.png`, por exemplo `sprites-brutos/briserecs-estagio1.png`. Depois rode o importador só com a folha. Ele mostra a grade que achou, sem gravar nada:

```bash
node ferramentas/importar-folha.ts sprites-brutos/briserecs-estagio1.png
```

A saída precisa terminar em `4 linhas: 4, 4, 4, 1 quadros`. Se não terminar:

| O que aparece | Causa provável | O que fazer |
|---|---|---|
| uma linha com menos quadros | quadros ou efeitos encostados | pedir à IA mais espaço entre os quadros |
| uma linha com mais quadros | efeito solto, texto ou pedaço separado | pedir sem texto e com o efeito colado ao corpo |
| mais de 4 linhas | vistas extras (frente, costas) ou efeito sozinho num quadro | pedir só a vista lateral e só as 4 linhas |
| fundo errado ou bicho cortado | fundo com degradê ou cor parecida com a do bicho | trocar a cor do fundo |

Também confira de olho: todos os quadros olhando para a direita, mesmo tamanho nas quatro linhas e estilo de pixel art. Se a IA devolver um desenho pintado, com desfoque, ele fica borrado quando reduzido.

Quando só uma parte sai errada, peça para refazer só ela ("refaça a linha 3 com mais espaço entre os quadros"). Sai mais rápido do que gerar tudo de novo.

## Importar

A espécie precisa existir em `conteudo/vale/especies.json`. Sem ela, o jogo recusa o sprite.

```bash
node ferramentas/importar-folha.ts sprites-brutos/briserecs-estagio1.png --especie briserecs --altura 20 --anim parado=1:1-4 --anim andando=2:1-4 --anim ataque=3:1-4 --anim dano=4:1 --previa sprites-brutos/briserecs-previa.png
```

Para importar várias folhas de uma vez:

```bash
for f in sprites-brutos/*-estagio1.png; do
  especie=$(basename "$f" -estagio1.png)
  node ferramentas/importar-folha.ts "$f" --especie "$especie" --altura 20 --anim parado=1:1-4 --anim andando=2:1-4 --anim ataque=3:1-4 --anim dano=4:1 --previa "sprites-brutos/$especie-previa.png"
done
```

Com folhas de frente e de costas, acrescente `--frente ESPECIE-estagio1-frente.png --costas ESPECIE-estagio1-costas.png`: elas precisam passar na mesma conferência da grade (`4, 4, 4, 1`) e entram na mesma tira.

O comando grava a tira em `conteudo/vale/sprites/ESPECIE.png` e a entrada da espécie em `conteudo/vale/sprites.json`. A `--previa` mostra a tira ampliada sobre o chão da arena. Depois, confira a criatura no jogo (`?batalha=` com um laboratório em que ela aparece) ou no catálogo de golpes (`/golpes.html`). As opções do importador e o formato da tira estão em [conteudo/LEIAME.md](../conteudo/LEIAME.md), na seção "Sprite em tira".
