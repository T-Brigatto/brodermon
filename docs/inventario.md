# Inventário de arquivos

Levantamento de 31/10/2026. Ordem aproximada em que as peças foram feitas: Arena → selos em pixel → rodadas de ícones vetoriais → selos finais → lab de cards → refatoração v4 → card final.

## design/ — páginas do Claude Design

Todas carregam `./support.js`, que baixa o React 18.3.1 do unpkg e monta o template do `<x-dc>`.

| Arquivo | O que é | Props (`data-props`) | Status |
|---|---|---|---|
| `Arena.dc.html` | Protótipo jogável da batalha em tempo real, tela 390×844 escalada para caber na janela. ~1.700 linhas, quase tudo lógica em canvas. | `difficulty` (fácil/normal/difícil), `assist` (bool), `speed` (0.75–1.5) | Protótipo de referência; usa o sistema **antigo** de 7 tipos |
| `Lab de Tipos.dc.html` | Título interno "LAB DE SELOS": 5 selos em pixel art 7×7 para cada um dos 10 tipos novos (ex.: Fogo = Chama, Brasa, Sol, Vulcão, Fogueira), desenhados em canvas com contorno `#1a1c2c`. | `selo` (quadrado/chip/solto) | Exploração (pixel) |
| `Lab de Selos.dc.html` | Exploração de ícones vetoriais em rodadas: 2 (2a–2e: círculo, gema hexagonal, monograma, pílula, moeda de traço), 3 (híbridos 3a–3d), 4 (refino do 3a, 4a–4e), 5 (5a quadrado arredondado, 5b quadrado reto, 5c/5d categorias, 5e/5f selo no golpe), 6 (6a–6c categorias). | — | Histórico das decisões |
| `Selos Finais.dc.html` | Vitrine dos escolhidos: tipos em 5a e categorias em 6b, em 72/22/16 px. Gera os SVGs em data-URI; os mesmos desenhos estão em `icones/`. | — | **Final** |
| `Lab de Golpes.dc.html` | "Lab de cards de golpe": painel de 390px com cards 175×72 em 2 colunas, duas animações de recarga (1b Relógio: escurece e o selo gira; 1c Revelar: a cor volta da esquerda), galeria dos 10 tipos e estados fixos. Usa `icones/tipos/<tipo>.svg`. | `fonte` (sem efeito no template), `speed` | Exploração anterior ao card final |
| `support.js` | dc-runtime gerado (`dc-runtime/src/*.ts`, build com bun). Parser do template, expressões `{{ }}`, `sc-for`/`sc-if`, `x-import`, helmet, pseudo-classes. | — | Não editar |
| `icones/tipos/<tipo>.svg` | Selo 32×32 (quadrado `rx 6.5` na cor do tipo + ícone). | — | **Final** |
| `icones/tipos/<tipo>-glifo.svg` | Só o ícone, 24×24, em `currentColor`. | — | **Final** |
| `icones/categorias/{fisico,magico,especial}.svg` | Ícones 6b, 24×24, `currentColor`. | — | **Final** |

Os SVGs trazem metadados C2PA (procedência "Claude") dentro de `<metadata>`; isso não afeta a renderização.

## exportados/ — HTML autossuficiente

| Arquivo | O que é | Status |
|---|---|---|
| `Cards_de_golpe_final.html` | Card de golpe final. Exportação estática: fonte Big Shoulders Display 700 embutida em base64 (latin e latin-ext), template com `sc-for`/`sc-if` e um mini-runtime próprio (`render`/`morph`) no lugar do `support.js`. Seção "Arena" (4 golpes) e "Teste de escala" (outros 6), mais legenda dos ícones. | **Final** |
| `Lab_de_Cards_de_Golpe_v4.html` | Refatoração "UI/UX" feita fora do formato DC: Tailwind via CDN, fontes Urbanist/Lexend/Outfit, cards 175×88 em 3 linhas (nome, pílula tipo+categoria+alcance com poder, rodapé com tempos). Mesmos dados e paleta de gradientes do card final. | Exploração alternativa |

## origem/

`Redesign da interface do jogo.zip` — zip original que trouxe a pasta `icones/` (23 SVGs). Mantido intacto; o conteúdo já foi extraído em `design/icones/`.

## O que falta (não existe ainda)

- Tabela de eficácia para os 10 tipos novos.
- Criaturas no sistema novo (as 6 da Arena ainda são do sistema antigo).
- A sprite sheet da Briserecs (blob do Claude Design, 56×32 por quadro, 22 quadros).
- Arte do slot de 44×44 do card final (hoje é um ícone de imagem genérico ou o ícone do tipo).
