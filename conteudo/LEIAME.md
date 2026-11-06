# Conteúdo do jogo

Cada pasta aqui é um **pacote**: um conjunto completo de tipos, golpes e criaturas.
- `vale/`: os 10 elementos e os 103 golpes do guia de golpes (`origem/Guia_de_formulacao_de_golpes_Arena_Vale_das_Criaturas.md`), com terrenos, névoas e estados. As criaturas ainda são de laboratório. **É o pacote padrão do jogo**; a primeira batalha do arquivo (`torneio`) é a que abre. Os laboratórios: `?batalha=lab-fogo`, `lab-agua`…
- `prototipo/`: cópia fiel da Arena original, com 7 tipos e 6 criaturas. Abra com `?pacote=prototipo`.

Todos os arquivos são **dicionários**: a chave é o id e o valor é o item. O id usa só letras minúsculas sem acento, números e hífen (`aqua-muro`); o nome que aparece na tela fica em `nome`, com acento.

Para ver como cada golpe ficou, abra o catálogo (`/golpes.html` com o `npm run dev`): uma animação de cada golpe e a ficha com os números, lidos destes arquivos.

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
  - `terreno` e `nevoa`: os campos do elemento em `campos.json`.
  - `fx`: efeitos especiais em pixel do elemento: `estilo` e `cores` (da mais escura à mais clara). Os estilos: `brasa` (sobe), `estouro` (espalha rápido), `gota` (cai), `floco` (flutua e cintila), `redemoinho` (gira), `faisca` (risca em zigue-zague), `poeira` (se espalha devagar), `estilhaco` (voa e cai brilhando), `folha` (balança), `estrela` (cintila em cruz) e `garra` (risca). Sem `fx`, o elemento não tem efeito especial: é o caso da Arena original.
    - `fx.animacoes` (opcional): a animação própria do elemento em cada papel. Papel sem animação usa o efeito comum, igual para todos os elementos e só nas cores de cada um: anel de energia, feixe, bolinha com rastro e estrela de impacto. Todos os elementos do `vale` têm; os tipos da Arena original, não. Qualquer elemento pode usar qualquer animação, nas cores dele.

      | Papel | Animações |
      |---|---|
      | `projetil` | `bola-de-fogo` (chama com cauda e rastro), `meia-lua` (lâmina curva), `gota` (gota que pinga no voo), `bolha` (bolha de sabão), `espinho` (lasca comprida: gelo, quartzo, espinho de planta), `esfera-eletrica` (orbe com arcos que estalam), `rocha` (pedra que rola), `lamina-giratoria` (quatro pontas girando), `folha` (folha girando), `orbe` (orbe com estrelinhas em volta) |
      | `area`, `cone`, `linha`, `parede` | `labaredas` (línguas de fogo que se juntam num fogaréu), `jato-de-fogo` (jato que sai da boca, esfria e vira fumaça), `explosao` (bola de fogo, chamas e fumaça, com tremor), `clarao` (lampejo e raios de luz), `fumaca`, `vento` (riscos que se enrolam e arcos de rajada), `onda-de-vento` (anéis que se abrem), `redemoinho` (funil que gira), `succao` (riscos correndo para o centro), `respingo` (gotas e ondas no chão), `geiser` (coluna de água), `jato-dagua` (jato reto que respinga no fim), `ondulacao` (ondas no chão), `onda` (crista de água que quebra), `espinhos` (estacas ou cristais que brotam do chão), `estalactite` (cai do alto e estoura), `granizo` (pedras de gelo que quicam), `sopro` (bafo na cor do elemento), `avalanche` (neve e blocos rolando), `relampago` (raio do céu), `descarga` (raios do corpo para o chão), `arco-eletrico` (raio de ponta a ponta), `tremor` (rachaduras, pedras e poeira, com tremor), `rachadura` (fenda que corre e levanta o chão), `poeira` (nuvem e areia), `prisma` (luz que se abre em arco-íris), `corrente` (elos), `ressonancia` (anéis finos e lascas), `brilhos` (purpurina), `raizes` (raízes que brotam), `vinha` (vinha que chicoteia), `bruma` (névoa na cor do elemento), `runas` (círculo mágico e runas subindo), `rugido` (ondas no chão e no ar, com tremor), `varrida` (golpe largo que varre o cone) |
      | `impacto` | `chamusco` (chamas pegando no alvo), `lufada` (riscos de vento e anel de ar), `respingo` (gotas e espuma), `geada` (lascas de gelo e névoa fria), `choque` (raios curtos), `pedrada` (pedras e poeira), `estilhacos` (lascas e brilhos), `folhas`, `estrelas` (estrelas, anel e uma runa), `garras` (três riscos de garra), `mordida` (presas que se fecham) |
      | `terreno`, `nevoa` | `labaredas`, `fumaca`, `vento` (na direção do empuxo do campo), `redemoinho`, `succao`, `ondulacao` (ondinhas e brilhos), `chuva`, `brilho-de-gelo`, `estatica` (estalos), `nuvem-carregada` (nuvem escura que solta raios), `rachaduras`, `poeira`, `espinhos` (cristais que brotam e duram), `brilhos`, `raizes`, `bruma`, `runas` (o círculo acompanha o campo), `aura` (brasas subindo e um pulso no chão) |
      | `avanco` | `rastro-de-fogo`, `velocidade` (linhas de velocidade): quem avança com o golpe deixa o rastro |

      ```json
      "fx": { "estilo": "brasa", "cores": ["#a8322a", "#ef6a3a", "#ffb27a", "#fff09a"],
        "animacoes": { "projetil": "bola-de-fogo", "area": "labaredas", "cone": "jato-de-fogo", "impacto": "chamusco", "terreno": "labaredas" } }
      ```

      As cores das animações vêm de `cores`, com 5 tons: contorno, escura, média, clara e brilho. O 1º só desenha o contorno e a sombra das peças; as partículas usam os outros 4. Com 4 tons ou menos, o contorno usa o tom escuro. O `projetil` do tipo é `[escura, média, clara]` da mesma rampa.

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

"lanca-chamas": { "nome": "Lança-chamas", "tipo": "fogo", "recarga": 4, "alcance": 55, "conjuracao": 0.3, "durante": "lento",
  "efeitos": [{ "efeito": "cone", "alcance": 50, "angulo": 70, "poder": 7, "duracao": 2, "pulso": 0.25,
    "efeitos": [{ "efeito": "dano-continuo", "porSegundo": 4, "duracao": 3, "nome": "queimadura", "chance": 0.15 }] }] },

"bola-de-fogo": { "nome": "Bola de Fogo", "tipo": "fogo", "recarga": 3, "alcance": 95, "conjuracao": 0.3,
  "efeitos": [{ "efeito": "projetil", "poder": 40, "trajetoria": "reto", "velocidade": 120, "raio": 5,
    "estouro": [{ "efeito": "area", "raio": 8, "deixa": { "campo": "chamas", "duracao": 3 } }] }] }
```

Campos do golpe:
- `recarga`: segundos até poder usar de novo, **contados do fim do golpe** (fim da conjuração e da canalização). Enquanto o golpe está em andamento, a recarga fica cheia e parada.
- `alcance`: distância máxima até o rival para usar o golpe. É obrigatório quando algum efeito atinge o rival. A área andável da arena mede 296 × 118 (o chão inteiro, 320 × 130); os tamanhos do guia de golpes valem nessa mesma unidade.
- `conjuracao` (opcional): segundos concentrando antes dos efeitos. Ser empurrado, puxado ou atordoado durante a conjuração interrompe o golpe. As formas do golpe aparecem marcadas no chão durante a conjuração.
- `durante` (opcional): como quem usa se move durante a conjuração e a canalização. `parado` (padrão), `lento` (velocidade × `regras.golpeLento`) ou `livre`.
- `categoria` e `animacao`: opcionais.
- `visual` (opcional, só visual): troca a animação do elemento em algum papel neste golpe, com os mesmos nomes de `fx.animacoes` (sem `terreno` e `nevoa`). Bola de Fogo e Detonação usam `{ "area": "explosao" }`; Tornado, `{ "area": "redemoinho" }`; Mordida Ancestral, `{ "impacto": "mordida" }`.

### Efeitos em quem usa

| Efeito | Campos | O que faz |
|---|---|---|
| `buff` | `atributo` (`ataque`, `defesa` ou `velocidade`), `valor`, `duracao` | Soma ao atributo. Um buff novo substitui o anterior. |
| `curar` | `porcento` | Recupera essa porcentagem do HP máximo. |
| `estado` com `"em": "si"` | `estado`, `duracao` | Põe em si um estado de `estados.json` (Armadura de Pedra, Gigante, Estática…). |
| `avancar` | `distancia`, `duracao`; opcionais `atravessa`, `poder`, `efeitos`, `rastro`, `estado` | Dispara em direção ao rival e para antes de encostar (`regras.distanciaMinima`). Com `atravessa`, passa por dentro dele e vai a distância toda. `poder`/`efeitos` acertam o rival ao passar (uma vez); `rastro` deixa um campo no caminho; `estado` vale em quem usa durante o avanço (Rasante: intangível). |
| `recuar` | `distancia`, `duracao` | Salta para longe do rival. |
| `teleporte` | `para` (`atras-do-rival` ou `no-rival`), `distancia`, `rastro` | Some e reaparece do outro lado do rival, a `distancia` dele, ou em cima dele. |
| `esperar` | `duracao` | O golpe continua em andamento (vale o `durante`): Fotossíntese, o tempo embaixo da terra do Escavar. |

### Formas

Carregam `poder` (dano por acerto ou por pulso; 0 = sem dano), `efeitos` no rival (a tabela mais abaixo) e `drena` (fração do dano que volta como cura). Acertam quem tiver alguma parte do corpo dentro: o corpo é um círculo de raio `raio` da espécie (padrão `regras.raioCriatura`, 12).

| Efeito | Campos | O que faz |
|---|---|---|
| `area` | `centro` (`rival`, `si` ou `meio`), `raio` | Círculo. No rival, cai onde ele estava quando o golpe começou: dá para sair durante a conjuração. Em si, é o anel em volta de quem usa. |
| `cone` | `alcance`, `angulo` (graus); `origem` (`si` ou `ponta`), `inverte` | Leque à frente de quem usa, apontado para onde o rival estava no começo do golpe. `origem: "ponta"` sai da ponta da forma anterior; `inverte` aponta de volta (Eco). |
| `linha` | `alcance`, `largura`; `ateRival`, `reflete` | Faixa reta de quem usa até `alcance` (ou só até o rival). `reflete` quica na borda da arena (Prisma). |
| `parede` | `centro` (`si`, `meio`, `rival` ou `topo`), `largura`, `espessura` | Faixa atravessada na direção do rival. `topo` nasce na borda de cima e aponta para baixo (Avalanche). |

Comportamento no tempo (todas as formas aceitam):
- Sem nada, acerta uma vez, na hora; se não pegar ninguém, aparece "ERROU".
- `atraso`: a marca fica no chão e acerta depois; quem usou fica livre (Selo, Granizo, Presas).
- `duracao` com `pulso`: fica e acerta a cada pulso; o primeiro sai na hora (2 s com pulso de 0,25 s dão 8 pulsos). A área fica parada onde caiu; o cone e a linha são **canalizados**: andam com quem usa, o golpe só acaba quando a duração termina, e a canalização acaba se o golpe for interrompido.
- `move`: anda a `velocidade`, até `ate` de distância; com `persegue`, vira para o rival (Onda, Fissura, Tornado, Avalanche).
- `raioFinal` (área com `duracao`): o raio cresce até ele (Onda de Choque).
- `umaVez`: cada criatura é atingida uma vez só. `arrasta`: leva junto quem pega. `puxa`: puxa para o centro (unidades/s).
- `alterna`: listas de efeitos que se revezam a cada pulso (Fluxo e Refluxo: empurra, puxa, empurra…).
- `deixa`: campo (`campos.json`) deixado no lugar da forma, com `duracao` e, se quiser, `raio`, `largura`, `pulso`, `poder`, `efeitos` e `aoEntrar` próprios. `rastro`: campo deixado no caminho de uma forma que anda.
- `apaga`: apaga os campos que a forma toca: os das `camadas` (`terreno`, `nevoa`) ou dos `tipos`; com `converteEm`, troca pelo campo dado (Decomposição); com `objetos`, derruba também as estruturas (Ruptura).
- Formas de um golpe do tipo de um gás (`detona` em `campos.json`) fazem o gás explodir; estruturas com `destruidoPor` caem com golpes daquele tipo (sem golpe no `vale` hoje; testado em `testes/vale-mecanicas.test.ts`).

### Projéteis

`projetil`: `poder`, `efeitos`, `drena` e, todos opcionais (os ausentes vêm de `regras.projetil`):
- `trajetoria`:
  - `guiado` (padrão): o da Arena original. Persegue sem limite e sempre acerta.
  - `reto`: segue em linha na direção do rival no momento do disparo. Quem anda de lado escapa: a distância máxima que ainda acerta é r × √(V² + v²) ÷ v (V do projétil, v de quem foge, r = raio da criatura + raio do projétil).
  - `persegue`: vira em direção ao rival no máximo `curva` graus por segundo. Some ao fim da `vida`.
  - `quica`: bate nas bordas da área andável e volta até acabar a `vida`; com `quicas`, estoura na borda seguinte (sem golpe no `vale` hoje; testado em `testes/vale-mecanicas.test.ts`).
- `velocidade`, `curva`, `vida`, `raio`.
- `quantidade` e `abertura`: vários projéteis saem juntos, abertos em leque. Com `vida` curta, viram estilhaços de curto alcance (Espinhos, Estilhaços).
- `acertos`: quantos acertos cada projétil pode dar (0 = nenhum por encostar, só a aura). Para acertar de novo, precisa sair do rival e voltar.
- `atravessa`: depois do último acerto, continua voando sem dano em vez de sumir.
- `estouro`: formas que acontecem onde o projétil some (ao acertar, no fim da vida, na borda): Bola de Fogo.
- `gruda`: gruda em quem acerta e estoura tantos segundos depois (sem golpe no `vale` hoje; testado em `testes/vale-mecanicas.test.ts`).
- `volta`: vai até essa distância e volta para quem atirou (Lâmina Bumerangue).
- `aura`: `raio`, `pulso`, `poder`, `efeitos`: acerta quem estiver perto, sem encostar (Esfera Estática).
- `consome`: `campos`, `poder`, `crescimento`, `maximo`: apaga os campos por onde passa e cresce (Fome do Fogo).
- `herdaCampo`: leva o efeito do terreno onde quem atirou estava (Arrancar Chão).

### Várias de uma vez, campos como munição, objetos e cópia

| Efeito | Campos | O que faz |
|---|---|---|
| `varias` | `quantidade`, `disposicao`, `distancia`, `intervalo`, `faz` | Faz a forma ou o projétil `faz` em vários pontos, um a cada `intervalo`. `disposicao`: `linha-ate-rival`, `em-volta-do-rival`, `sorteio-no-rival` (a até `distancia`), `entre` (entre os dois) ou `em-volta-de-si`. |
| `cada-campo` | `campo`, `faz`, `apaga`, `senao` | Para cada campo desse tipo criado por quem usa, faz os efeitos no ponto dele (Recolher, Ressonância); `senao` vale quando não há nenhum. |
| `objeto` | `objeto`, `centro`, `distancia`, `raio`, `duracao`, `chance`, `destruidoPor` | `pilar` (bloqueia passagem e projéteis), `portais` (um em quem usa, outro perto do rival; leva quem entra num até o outro), `copia` (cópia falsa a `distancia` de lado: cada golpe do rival tem `chance` de mirar nela) ou `pino` (os golpes do tipo de quem usou também saltam para quem estiver a até `raio` dele). |
| `copiar` | | Usa o último golpe que o rival usou (Espelho Arcano). |

### Efeitos no rival

Podem vir soltos no golpe (corpo a corpo: exigem o rival ao alcance na hora) ou dentro de uma forma, de um projétil ou de um campo. Todos aceitam `chance` (de 0 a 1); sem ela, sempre pegam.

| Efeito | Campos | O que faz |
|---|---|---|
| `dano` | `poder`; opcionais `drena`, `escalaHp`, `seEstado` | Dano na hora, corpo a corpo. `escalaHp` (`ate`): cresce até `ate` conforme quem usa perde HP, o máximo com 10% (Sangue Antigo). `seEstado` (`estado`, `poder`, `remove`): poder diferente se o alvo estiver com o estado (Estilhaçar contra congelado). |
| `empurrar` | `distancia`, `duracao` (padrão 0,2) | Joga o rival para longe. |
| `puxar` | `distancia`, `duracao` (padrão 0,2) | Traz o rival para perto (para antes de encostar). |
| `lentidao` | `fator` (entre 0 e 1), `duracao`; `acumula`, `minimo` | Multiplica a velocidade do rival. Com `acumula`, cada aplicação multiplica a que já havia, até `minimo` (Sopro Gélido). |
| `prender` | `duracao` | O rival não anda, mas ainda ataca. |
| `atordoar` | `duracao` | O rival não anda nem ataca. |
| `dano-continuo` | `porSegundo`, `duracao`, `nome` | Dano fixo por segundo. Não usa a fórmula nem a eficácia. `nome` ("queimadura") deixa um estado proteger dele. |
| `debuff` | `atributo`, `valor`, `duracao` | Tira do atributo do rival. |
| `estado` | `estado`, `duracao`, `em` | Põe um estado de `estados.json` no alvo (ou em quem usou, com `"em": "si"`). |
| `interromper` | | Corta a conjuração ou o golpe em andamento. |
| `acorrentar` | `distancia`, `duracao` | A distância entre o rival e quem usou não passa de `distancia` (Corrente de Metal). |
| `atrair` | `velocidade`, `duracao`, `aoEncostar` | Os dois são puxados um para o outro; ao encostarem, o rival leva `aoEncostar` de poder (Polaridade). |

Como os efeitos se encadeiam:
- Efeitos com duração em quem usa (`avancar`, `recuar`, `esperar`) e as canalizações fazem o próximo efeito esperar o fim. É assim que "avança e depois bate" funciona.
- Ser empurrado, puxado ou atordoado interrompe o golpe em andamento; um estado que trava a ação também.
- Condições, estados e buffs somem quando a criatura sai de campo. Aplicar de novo a mesma condição renova o tempo.

Como a IA usa cada golpe (ver `regras.ia`):
- golpe que atinge o rival (direto, projétil, forma, objeto, teleporte): usa com o rival ao alcance; na fila do jogador, golpes de perto (corpo a corpo, cone, linha e área em volta de si) fazem a criatura andar até o rival;
- cura, na hora ou por segundo: usa com HP abaixo de `hpCura`;
- recuo: usa esquivando e com o rival a menos de `distanciaFuga`;
- avanço sem dano: usa com o rival longe;
- buff: usa com HP acima de `hpBuff` e sem buff ativo; estado em si: usa se ainda não estiver com ele;
- cópia: só depois de o rival usar algum golpe; campo como munição (sem `senao`): só se houver o campo.

## estados.json

Um estado é um conjunto de mudanças que valem enquanto ele dura. Golpes aplicam com o efeito `estado`; campos aplicam em quem está dentro.

```json
"congelado": { "nome": "Congelado", "trava": "tudo" },
"bruma": { "nome": "Bruma", "danoRecebido": { "arcano": 1.25 } },
"armadura-de-pedra": { "nome": "Armadura de Pedra", "atributos": { "defesa": 1.5 }, "empurrao": 0, "velocidade": 0.6 }
```

| Campo | O que faz |
|---|---|
| `trava` | `movimento` (não anda), `acao` (não usa golpes) ou `tudo`. Travar a ação corta o golpe em andamento. |
| `velocidade` | Multiplica a velocidade. |
| `atributos` | `ataque` e `defesa` multiplicados. |
| `danoRecebido`, `danoCausado` | Multiplicador por tipo de golpe (`"*"` = todos). |
| `danoPorMovimento` | Golpes de `tipo` causam `andando`× em alvo que se move e `parado`× em alvo parado. |
| `recarga`, `conjuracao` | Ritmo das recargas dos golpes e da conjuração (0,7 = 30% mais devagar). |
| `desvio` | Projéteis disparados saem com um desvio sorteado de até tantos graus. |
| `empurrao` | Multiplica empurrões e puxões recebidos (0 = imune, 2 = dobrados). |
| `inquieto` | Não consegue ficar parado. |
| `intangivel`, `atingivelPor` | Não pode ser atingido; com `atingivelPor`, só áreas em volta de quem usa desses tipos (embaixo da terra, só anéis de Terra). |
| `tamanho`, `areaPerto` | Raio do corpo; tamanho das áreas em volta de si e alcance do corpo a corpo. |
| `curaPorSegundo`, `soEmCampo`, `soTipos` | Cura contínua; só em cima de um campo; só criaturas de certos tipos. |
| `impedeCura` | Nada cura. |
| `protege` | Tira e impede danos contínuos com esses nomes. |
| `desviaProjeteis` | Projéteis que chegam a `raio` além do corpo viram `graus`. |
| `refleteProjeteis` | Projéteis que acertam voltam para quem atirou. |
| `aderencia` | Escorregar: quanto da velocidade nova entra a cada passo (1 = normal). |
| `cargas` | Cada `distancia` andada vira uma carga (até `maximo`); o próximo golpe de `tipo` ganha `bonus` por carga e gasta o estado. |
| `cacada` | Anda `velocidade`× mais rápido em direção ao alvo do golpe e ganha `alcance` contra ele. |
| `fx` | Só visual: o tipo cujos efeitos especiais aparecem em volta de quem está com o estado (congelado: gelo). |

## campos.json

Terrenos (no chão) e névoas (no ar). Cada elemento tem os seus (`terreno` e `nevoa` em `tipos.json`), e golpes podem ter campos próprios. Afetam todos dentro, menos os tipos `imunes`, inclusive quem criou (com `"afeta": "rival"`, só o rival dele). Golpes criam campos com `deixa` e `rastro`; a duração vem do golpe.

```json
"chamas": { "nome": "Chamas", "camada": "terreno", "tipo": "fogo", "imunes": ["fogo"], "pulso": 0.5, "poder": 6,
  "aoEntrar": { "efeitos": [{ "efeito": "dano-continuo", "porSegundo": 4, "duracao": 3, "nome": "queimadura", "chance": 0.3 }] } }
```

| Campo | O que faz |
|---|---|
| `camada`, `tipo`, `imunes`, `afeta` | Terreno ou névoa, elemento, quem não é afetado, todos ou só o rival. |
| `pulso`, `poder`, `efeitos` | A cada pulso, quem está dentro leva o dano e os efeitos. |
| `aoEntrar` | Dano e efeitos ao entrar. Com `consome`, o campo some no primeiro que entra (flor carnívora). |
| `estado`, `dono`, `estadoImunes` | Estado de quem está dentro, de quem criou (Território) e dos imunes (os Esporos curam a Natureza). |
| `permanencia` | Quem fica `segundos` seguidos dentro leva os `efeitos` (Neblina gelada congela; Areia movediça prende). |
| `projeteis` | Em projéteis que passam: `dano` (multiplica), `desvio` (graus sorteados), `atrai` (curva para o centro, graus/s), `tempo` (velocidade). |
| `empuxo`, `rampa` | Empurra quem está dentro de lado ou para a frente; rampa acelera no sentido dela e faz escorregar contra. |
| `tempo` | Ritmo dos outros campos com o centro dentro dele (Tempo Lento). |
| `apaga` | Apaga o que entra nele enquanto dura (Vácuo apaga Fogo e névoas). |
| `dispara` | Dispara um projétil no rival a cada `intervalo` (Círculo rúnico). |
| `detona` | Explode quando um golpe do `tipo` o acerta (sem golpe no `vale` hoje; testado em `testes/vale-mecanicas.test.ts`). |
| `visual` | Só visual: a animação deste campo no lugar da do elemento para a camada (`fx.animacoes.terreno` ou `.nevoa`). Vácuo, Areia movediça e Gravidade arcana usam `succao`. |

As reações entre terrenos e névoas de elementos diferentes ainda não foram definidas (pendência do guia); por enquanto, só valem as dos golpes (Decomposição, Ruptura, Vácuo, Onda de Choque, Fome do Fogo).

## especies.json

```json
"brasino": { "nome": "Brasino", "tipos": ["fogo"], "hp": 95, "ataque": 16, "defesa": 10, "velocidade": 61, "golpes": ["labareda", "brasa", "investida", "fervor"] }
```

- `tipos`: um ou mais.
- `golpes`: de 1 até `maxGolpes` (4), na ordem dos botões 1–4.
- `velocidade`: unidades da arena por segundo.
- `raio` (opcional): raio do corpo, para golpes e projéteis acertarem. Sem ele, vale `regras.raioCriatura`.

## sprites.json

```json
"gotinha": {
  "paleta": [null, "#1a1c2c", "#73eff7", "#41a6f6", "#f4f4f4", "#3b5dc9", "#ef7d57"],
  "pixels": ["000000000000110000000000", "..."]
}
```

- Um sprite por espécie, com a mesma chave de `especies.json`. Pode ser uma grade de pixels (acima) ou uma tira em imagem com animações (abaixo).
- `pixels`: uma string por linha. Cada caractere, de `0` a `f`, é a posição de uma cor na `paleta`. A posição 0 é sempre transparente (`null`).
- A grade precisa ser quadrada: N linhas de N caracteres. Ela olha para a esquerda e tem um quadro só (o jogo faz um balanço de 1 px).
- Espécie sem sprite aparece como uma bolinha na cor do tipo.

### Sprite em tira (animado)

```json
"briserecs": {
  "imagem": "sprites/briserecs.png", "quadro": 40, "pe": 38, "altura": 20, "olhaPara": "direita",
  "animacoes": {
    "parado":  {"quadros": [0, 1, 2, 3], "fps": 4},
    "andando": {"quadros": [4, 5, 6, 7], "fps": 8},
    "ataque":  {"quadros": [8, 9, 10, 11], "fps": 10},
    "dano":    {"quadros": [12], "fps": 1}
  }
}
```

- `imagem`: PNG na pasta `sprites/` do pacote, com os quadros lado a lado, cada um um quadrado de `quadro` px.
- `pe`: linha dos pés em cada quadro (os pés ficam no meio, na horizontal). `altura`: altura do bicho, usada para a barra de HP, os textos e os efeitos.
- `olhaPara`: para onde o desenho olha na tira (`direita` ou `esquerda`); o jogo vira quando precisa.
- `vistas` (opcional): `frente` e `costas`, cada uma com as mesmas animações, em quadros da mesma tira (mesmo `quadro` e mesmo `pe`). A vista segue para onde a criatura anda: de costas subindo para o fundo da arena, de frente descendo (mais de 45° da horizontal; volta ao lado abaixo de ~35°, para não piscar). Parada, andando na horizontal, golpeando ou empurrada, ela fica de lado, virada para o rival. Sem `vistas`, ela fica sempre de lado, espelhada. Frente e costas não são espelhadas.
- `animacoes`: `parado` é obrigatória; `andando`, `ataque` e `dano` são opcionais (sem elas, vale a `parado`). Os quadros contam de 0.
- Quando cada uma toca: `dano` enquanto a criatura pisca depois de levar dano; `ataque` fica no primeiro quadro enquanto ela carrega um golpe e toca uma vez quando o golpe sai; `andando` quando ela se move; senão `parado`, em laço.

### Importar uma folha de poses

As tiras saem das folhas de poses geradas no GPT ou no Gemini (a folha original fica em `sprites-brutos/`). Como pedir a folha, com o layout e o prompt: [docs/guia-sprites.md](../docs/guia-sprites.md). O importador acha o fundo e os quadros da folha, reduz para a altura pedida com uma escala só, reduz as cores a uma paleta comum, alinha os pés e grava a tira e a entrada no `sprites.json`:

```bash
node ferramentas/importar-folha.ts sprites-brutos/briserecs-estagio1.png
node ferramentas/importar-folha.ts sprites-brutos/briserecs-estagio1.png --pacote vale --especie briserecs --altura 20 --anim parado=1:1-4 --anim andando=2:1-4 --anim ataque=3:1-4 --anim dano=4:6 --previa previa.png
```

A primeira linha só mostra a grade que achou (quantos quadros por linha). Na segunda, `--anim NOME=LINHA:COLUNAS` escolhe os quadros de cada animação, contando de 1 como se vê na folha (`1-4` ou `1,3,5`). Outras opções: `--fps parado=4,andando=8`, `--olha esquerda` e `--cores 32`. A `--previa` mostra a tira ampliada sobre o chão da arena.

Com `--frente FOLHA.png` e `--costas FOLHA.png`, as folhas de frente e de costas (mesmo layout, mesmas `--anim`) entram na mesma tira, na escala da vista de lado, e viram `vistas` na entrada:

```bash
node ferramentas/importar-folha.ts sprites-brutos/aries-estagio1-lado.png --frente sprites-brutos/aries-estagio1-frente.png --costas sprites-brutos/aries-estagio1-costas.png --especie aries --altura 20 --anim parado=1:1-4 --anim andando=2:1-4 --anim ataque=3:1-4 --anim dano=4:1
```

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

- A batalha `laboratorio` usa os golpes de movimento e controle dos dois lados. Abra com `?batalha=laboratorio` na URL do jogo.
- A batalha `formas` usa 24 golpes do guia de golpes adaptados aos 7 tipos do protótipo: `?batalha=formas`.
- Sem `?batalha=`, o jogo abre a primeira batalha do arquivo.
- No pacote `vale`, cada elemento tem um laboratório (`lab-fogo`, `lab-agua`…): o jogador leva três criaturas do elemento com os 10 golpes dele. `?batalha=lab-gelo`.

## regras.json

São os números da batalha:
- a fórmula de dano;
- o ritmo: a pausa depois de cada golpe (`recargaGlobal`) e o multiplicador da recarga de todos os golpes (`recargaGolpes`). No vale, 2 s de pausa e recargas 1,5× as do guia, para dar tempo de ler a luta e pôr golpe na fila;
- `anunciarGolpes`: o nome do golpe aparece sobre as duas criaturas (sem ele, só sobre o rival, como na Arena original);
- a troca (duração e espera);
- os projéteis: velocidade, `raioAcerto` do guiado e os padrões dos que podem errar (`raio`, `vida`, `curva`);
- o `raioCriatura` padrão e o fator `golpeLento` de quem usa um golpe com `durante: "lento"`;
- os limites da arena;
- a `distanciaMinima` entre as criaturas em avanços e puxões;
- as distâncias de cada tática;
- os limiares da IA (`hpEsquiva`, `hpBuff`, `hpCura`, `distanciaFuga`…);
- as dificuldades.

Mudar um número aqui muda o jogo sem tocar no código.

## Criar um pacote novo

1. Copie a pasta `prototipo/` com outro nome, por exemplo `vale/`.
2. Edite os dicionários.
3. Registre o pacote em `src/conteudo/pacotes.ts`, seguindo o modelo do `vale`, e ponha-o no dicionário `pacotes` para abrir com `?pacote=<nome>`.
