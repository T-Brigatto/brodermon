# Conteúdo do jogo

Cada pasta aqui é um **pacote**: um conjunto completo de tipos, golpes e criaturas. Hoje só existe o `prototipo/`, uma cópia fiel da Arena original com 7 tipos e 6 criaturas. O jogo de verdade, com os 10 tipos, será outro pacote ao lado.

Todos os arquivos são **dicionários**: a chave é o id e o valor é o item. O id usa só letras minúsculas sem acento, números e hífen (`aqua-muro`); o nome que aparece na tela fica em `nome`, com acento.

Ao rodar o jogo ou os testes, o esquema confere tudo. Se algo estiver errado, a mensagem aponta o lugar, por exemplo:

```
golpes.jato.tipo: tipo "lava" não existe
especies.gotinha.golpes.0: golpe "tsunami" não existe
```

## tipos.json

```json
"fogo": { "nome": "Fogo", "cor": "#ef7d57", "fundo": "#46213c", "eficacia": { "planta": 2, "agua": 0.5 } }
```

- `eficacia`: quanto um golpe **deste** tipo causa contra cada tipo alvo. O que não está na lista vale 1. Use 0 para "sem efeito".
- Contra uma criatura com dois tipos, os multiplicadores se multiplicam.
- `cor` é a cor do tipo; `fundo` é o tom escuro usado atrás dele na interface, por exemplo no card do golpe.
- Opcionais (sem eles, a interface usa um padrão):
  - `icone`: 8 linhas de 8 caracteres, com `#` para pixel aceso e `.` para vazio.
  - `projetil`: cores do rastro, do corpo e do núcleo. Uma 4ª cor faz o núcleo piscar.
  - `particula`: cor das faíscas quando a criatura desmaia.

## categorias.json

```json
"magico": { "nome": "Mágico" }
```

A categoria é só um rótulo que a interface mostra (ícone e nome). Ela não muda regra nenhuma.

## golpes.json

Um golpe é uma **lista de efeitos**, executados em ordem. Cada efeito é uma peça que o motor já sabe fazer; para criar um golpe novo, basta combinar peças, sem mexer em código.

```json
"labareda": { "nome": "Labareda", "tipo": "fogo", "categoria": "magico", "recarga": 2.8, "alcance": 88,
  "efeitos": [{ "efeito": "projetil", "poder": 50 }] },

"investida-veloz": { "nome": "Investida Veloz", "tipo": "normal", "recarga": 3.5, "alcance": 80,
  "efeitos": [
    { "efeito": "avancar", "distancia": 60, "duracao": 0.25 },
    { "efeito": "dano", "poder": 40 },
    { "efeito": "empurrar", "distancia": 35 }
  ] },

"golpe-carregado": { "nome": "Golpe Carregado", "tipo": "rocha", "recarga": 5, "alcance": 26, "conjuracao": 0.6,
  "efeitos": [{ "efeito": "dano", "poder": 85 }, { "efeito": "empurrar", "distancia": 45, "duracao": 0.3 }] }
```

Campos do golpe:
- `recarga`: segundos até poder usar de novo.
- `alcance`: distância máxima até o rival para usar o golpe. É obrigatório quando algum efeito atinge o rival. O chão da arena mede 320 × 130.
- `conjuracao` (opcional): segundos parado concentrando antes dos efeitos. Ser empurrado, puxado ou atordoado durante a conjuração interrompe o golpe.
- `categoria` e `animacao`: opcionais.

**Efeitos em quem usa**
| Efeito | Campos | O que faz |
|---|---|---|
| `buff` | `atributo` (`ataque`, `defesa` ou `velocidade`), `valor`, `duracao` | Soma ao atributo. Um buff novo substitui o anterior. |
| `curar` | `porcento` | Recupera essa porcentagem do HP máximo. |
| `avancar` | `distancia`, `duracao` | Dispara em direção ao rival e para antes de encostar (`regras.distanciaMinima`). |
| `recuar` | `distancia`, `duracao` | Salta para longe do rival. |

**Efeitos no rival**
| Efeito | Campos | O que faz |
|---|---|---|
| `dano` | `poder` | Dano na hora, corpo a corpo. |
| `projetil` | `poder`, `velocidade` (opcional), `efeitos` (opcional) | Projétil que persegue o rival. Ao acertar, causa `poder` de dano (0 = sem dano) e aplica os `efeitos` da lista. |
| `empurrar` | `distancia`, `duracao` (padrão 0,2) | Joga o rival para longe. |
| `puxar` | `distancia`, `duracao` (padrão 0,2) | Traz o rival para perto (para antes de encostar). |
| `lentidao` | `fator` (entre 0 e 1), `duracao` | Multiplica a velocidade do rival. |
| `prender` | `duracao` | O rival não anda, mas ainda ataca. |
| `atordoar` | `duracao` | O rival não anda nem ataca. |
| `dano-continuo` | `porSegundo`, `duracao` | Dano fixo por segundo (queimadura, veneno). Não usa a fórmula nem a eficácia. |
| `debuff` | `atributo`, `valor`, `duracao` | Tira do atributo do rival. |

Como os efeitos se encadeiam:
- Efeitos no rival fora de um projétil acontecem na hora e exigem o rival ao alcance (com folga de 4). Se ele tiver fugido, aparece "ERROU".
- Efeitos com `duracao` em quem usa (`avancar`, `recuar`) fazem o próximo efeito esperar o fim. É assim que "avança e depois bate" funciona.
- Ser empurrado, puxado ou atordoado interrompe o golpe em andamento.
- Condições (lentidão, prisão, atordoamento, dano contínuo, debuff) e buffs somem quando a criatura sai de campo. Aplicar de novo a mesma condição renova o tempo.

Como a IA usa cada golpe (ver `regras.ia`):
- golpe que atinge o rival: usa com o rival ao alcance;
- cura: usa com HP abaixo de `hpCura`;
- recuo: usa esquivando e com o rival a menos de `distanciaFuga`;
- avanço sem dano: usa com o rival longe;
- buff: usa com HP acima de `hpBuff` e sem buff ativo.

## especies.json

```json
"brasino": { "nome": "Brasino", "tipos": ["fogo"], "hp": 95, "ataque": 16, "defesa": 10, "velocidade": 61, "golpes": ["labareda", "brasa", "investida", "fervor"] }
```

- `tipos`: um ou mais.
- `golpes`: de 1 até `maxGolpes` (4), na ordem dos botões 1–4.
- `velocidade`: unidades da arena por segundo.

## sprites.json

```json
"gotinha": {
  "paleta": [null, "#1a1c2c", "#73eff7", "#41a6f6", "#f4f4f4", "#3b5dc9", "#ef7d57"],
  "pixels": ["000000000000110000000000", "..."]
}
```

- Um sprite por espécie, com a mesma chave de `especies.json`. Hoje todos têm 24×24.
- `pixels`: uma string por linha. Cada caractere, de `0` a `f`, é a posição de uma cor na `paleta`. A posição 0 é sempre transparente (`null`).
- O sprite precisa ser quadrado: N linhas de N caracteres.
- Espécie sem sprite aparece como uma bolinha na cor do tipo.
- A skill `fakemon-firered` gera sprites para este jogo.

## batalhas.json

```json
"treino": { "nome": "Treino na Arena", "equipes": [
  { "piloto": "jogador", "time": ["perereca", "gotinha"] },
  { "piloto": "ia", "time": ["brasino"] }
] }
```

- `piloto` é `jogador` ou `ia`.
- Cada membro do `time` pode ser só o id da espécie, usando os golpes padrão dela, ou a espécie com golpes escolhidos para aquela batalha:

```json
{ "especie": "brasino", "golpes": ["chama-viva", "investida-veloz", "labareda", "fervor"] }
```

- A batalha `laboratorio` usa os golpes novos dos dois lados. Abra com `?batalha=laboratorio` na URL do jogo.

## regras.json

São os números da batalha:
- a fórmula de dano;
- as recargas globais;
- a troca (duração e espera);
- a velocidade dos projéteis;
- os limites da arena;
- a `distanciaMinima` entre as criaturas em avanços e puxões;
- as distâncias de cada tática;
- os limiares da IA (`hpEsquiva`, `hpBuff`, `hpCura`, `distanciaFuga`…);
- as dificuldades.

Mudar um número aqui muda o jogo sem tocar no código.

## Criar um pacote novo

1. Copie a pasta `prototipo/` com outro nome, por exemplo `vale/`.
2. Edite os dicionários.
3. Registre o pacote em `src/conteudo/pacotes.ts`, seguindo o modelo do `prototipo`.
