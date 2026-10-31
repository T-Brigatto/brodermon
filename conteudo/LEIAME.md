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
- `cor` é a cor do tipo; `fundo` é o tom escuro usado atrás dele na interface.

## categorias.json

```json
"magico": { "nome": "Mágico" }
```

A categoria é só um rótulo que a interface mostra (ícone e nome). Ela não muda regra nenhuma.

## golpes.json

```json
"labareda":  { "nome": "Labareda", "tipo": "fogo", "categoria": "magico", "recarga": 2.8, "alcance": 88, "dano": { "poder": 50 } },
"investida": { "nome": "Investida", "tipo": "normal", "recarga": 2.0, "alcance": 23, "contato": true, "dano": { "poder": 35 } },
"fervor":    { "nome": "Fervor", "tipo": "fogo", "recarga": 5.5, "buff": { "atributo": "ataque", "valor": 5, "duracao": 3 } }
```

- `recarga`: segundos até poder usar de novo.
- `dano.poder`: força do golpe. Precisa de `alcance`, a distância máxima até o alvo; a arena tem cerca de 300 de largura.
- `contato: true`: acerta na hora e, se estiver na fila, a criatura anda até o alvo. Sem isso, o golpe vira um projétil que voa até o alvo.
- `buff`: soma `valor` ao `ataque` ou à `defesa` de quem usou, por `duracao` segundos.
- Um golpe precisa de `dano`, de `buff` ou dos dois.
- `categoria` e `animacao` são opcionais.

## especies.json

```json
"brasino": { "nome": "Brasino", "tipos": ["fogo"], "hp": 95, "ataque": 16, "defesa": 10, "velocidade": 61, "golpes": ["labareda", "brasa", "investida", "fervor"] }
```

- `tipos`: um ou mais.
- `golpes`: de 1 até `maxGolpes` (4), na ordem dos botões 1–4.
- `velocidade`: unidades da arena por segundo.

## batalhas.json

```json
"treino": { "nome": "Treino na Arena", "equipes": [
  { "piloto": "jogador", "time": ["perereca", "gotinha"] },
  { "piloto": "ia", "time": ["brasino"] }
] }
```

`piloto` é `jogador` ou `ia`.

## regras.json

São os números da batalha: a fórmula de dano, as recargas globais, a troca (duração e espera), a velocidade dos projéteis, os limites da arena, as distâncias de cada tática, os limiares da IA e as dificuldades. Mudar um número aqui muda o jogo sem tocar no código.

## Criar um pacote novo

1. Copie a pasta `prototipo/` com outro nome, por exemplo `vale/`.
2. Edite os dicionários.
3. Registre o pacote em `src/conteudo/pacotes.ts`, seguindo o modelo do `prototipo`.
