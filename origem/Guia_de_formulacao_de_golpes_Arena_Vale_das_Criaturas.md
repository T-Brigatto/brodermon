# Guia de formulação de golpes — Arena Vale das Criaturas

Oct 31, 2026 · @Thiago 1 (Principal)

## Regras definidas

Todo golpe tem que combinar com o seu elemento. Ele pode interagir com a arena ou não. Estas regras foram definidas por você; o resto do guia segue a partir delas.

- **Personalidade:** a forma, o tempo e o efeito do golpe têm que fazer sentido para o elemento. Exemplo: Lança-chamas é um cone que queima por alguns segundos, porque fogo queima e se espalha.
- **Arena:** um golpe pode ter efeito de terreno, de névoa, ou nenhum. Chamas e Raízes Espinhentas deixam terreno; Folha Navalha não deixa nada.
- **Terreno e névoa por elemento:** todo elemento tem um terreno e uma névoa próprios. Água: o terreno é a poça, a névoa é a umidade.
- **Interação:** terrenos e névoas interagem entre si.
- **Imunidade:** um efeito de campo pode poupar certos tipos. Fakémons de Fogo não tomam dano das Chamas. As Raízes Espinhentas não afetam Natureza, Terra nem Ar.
- **Build:** fora da arena, o jogador escolhe os 4 golpes de cada fakémon e a ordem deles.
- **Na arena:** a IA usa todos os golpes sozinha, seguindo a ordem da build e a recarga. O jogador só troca de fakémon e cuida do posicionamento.
- **Golpes por elemento:** cada fakémon leva 4 golpes. Cada elemento oferece 10, a escolha do editor entre 17 propostos; escolher 4 de 10 dá 210 combinações por elemento.

**Variedade (pedido seu):** cada golpe de um elemento explora uma faceta diferente dele e usa uma mecânica própria. Variar só os números do mesmo efeito não conta como golpe novo. Referências: Avatar, animes e o comportamento real do elemento. Por isso cada golpe da escolha do editor traz a faceta que explora, e nenhum par repete mecânica.

Nas tabelas de elementos, **(seu)** marca os golpes que você deu como exemplo. Os demais são propostas para você aprovar ou trocar. Onde aparece "era", o valor foi ajustado pela análise e o antigo fica entre parênteses.

## Ficha do golpe

Todo golpe é descrito por estes campos. Um campo que não se aplica fica de fora (um golpe sem projétil não tem velocidade).

| Campo | O que define | Exemplo |
| --- | --- | --- |
| Nome | nome do golpe | Lança-chamas |
| Elemento | tipo do golpe, usado na tabela de tipos | Fogo |
| Forma | onde o golpe acerta: linha, cone, anel, área, espalhado, projétil, avanço | cone |
| Mira | onde o golpe é apontado: no rival, em si mesmo, entre os dois | no rival |
| Tamanho | alcance, ângulo do cone ou raio da área, em px | 50 px, 70° |
| Conjuração | tempo parado preparando antes de o golpe sair, em s | 0,3 s |
| Duração | tempo que o golpe fica ativo; 0 = instantâneo | 2 s |
| Pulso | intervalo entre danos enquanto o golpe dura | 0,25 s |
| Recarga | tempo até poder usar de novo, contado do fim do golpe | 5 s |
| Poder | dano por acerto ou por pulso, antes de tipo e atributos | 6 por pulso |
| Projétil | velocidade, comportamento, quantidade, tempo de vida | 120 px/s, reto, 1 |
| Efeito no alvo | estado aplicado, chance e duração | Queimadura 15% |
| Efeito de campo | terreno, névoa ou nenhum; duração no chão | nenhum |
| Imunes | tipos que o efeito de campo não afeta | — |
| Quem usa | se a criatura fica parada, lenta ou livre durante o golpe | lenta |

O último campo pesa no posicionamento: um golpe longo que prende a criatura no lugar deixa ela exposta.

## Formas, projéteis e efeitos

### Formas

| Forma | Como acerta | Exemplo |
| --- | --- | --- |
| Linha | faixa reta da criatura até o alcance | Jato d'Água |
| Cone | leque à frente da criatura | Rajada, Lança-chamas |
| Anel | círculo em volta da própria criatura | Tremor |
| Área | círculo num ponto da arena | Raízes Espinhentas |
| Espalhado | vários focos pequenos pela arena | Chamas |
| Projétil | objeto que viaja e acerta ao tocar | Folha Navalha |
| Avanço | a criatura se move junto com o golpe | Avanço Selvagem |

### Comportamento do projétil

| Comportamento | Como se move | Exemplo |
| --- | --- | --- |
| Reto | segue em linha; dá para sair da frente | Folha Navalha |
| Persegue | curva até o alvo com curva limitada; dá para escapar se movendo | Mísseis Mágicos |
| Quica | bate na borda da arena e volta até acabar o tempo de vida | Orbe Ricocheteante |

Hoje todo projétil persegue e sempre acerta. Para o posicionamento contar, isso precisa mudar.

### Efeitos no alvo

| Efeito | O que faz | Origem |
| --- | --- | --- |
| Empurrão | desloca o alvo para trás | seu (Rajada) |
| Lentidão | reduz a velocidade de movimento | seu (Raízes, Tremor) |
| Queimadura | dano contínuo por alguns segundos | seu (Lança-chamas, Chamas) |
| Atordoamento | alvo não age por um instante | proposta (Eletricidade) |
| Congelamento | alvo não se move nem age | proposta (Gelo) |
| Escorregão | alvo continua deslizando na direção em que vinha | proposta (Gelo) |

### Terreno e névoa

- **Terreno** fica no chão e afeta quem pisa nele.
- **Névoa** fica no ar e afeta quem está dentro dela.
- Cada um tem duração própria, independente da duração do golpe que o criou.
- Cada um pode ter uma lista de tipos imunes.
- As reações entre terrenos e névoas de elementos diferentes ainda não foram definidas (ver Pendências).

## Escala de referência

No jogo atual, o poder de um golpe é cerca de 17 vezes a sua recarga em segundos. É a régua para calibrar golpes novos. Os números abaixo saem do código do jogo atual.

| Medida | Valor atual |
| --- | --- |
| Arena | 195 × 168 px; área andável de 143 × 88 px |
| Velocidade das criaturas | 46 a 64 px/s |
| Projétil atual | 120 px/s |
| Alcance dos golpes de longe | 68 a 95 px |
| Poder dos golpes de dano | 28 a 50 |
| Recarga dos golpes de dano | 1,5 a 3,0 s |
| Pausa entre golpes | 0,9 s (1,2 s depois de buff) |
| Poder por segundo de recarga | cerca de 17 (Jato 45/2,5; Gota 28/1,6; Pedrada 50/3,0) |

O dano final é calculado assim:

```latex
\text{dano} = \frac{\text{poder}}{18} \times \frac{\text{ATK}}{\text{DEF}} \times 3 \times \text{eficácia} \times \text{STAB} \times \text{aleatório} \times 0{,}9
```

STAB é 1,5 quando o golpe é do mesmo tipo da criatura. O aleatório varia de 0,9 a 1,1.

**Faixas propostas para os golpes novos:**

- Conjuração: 0 a 0,2 s rápida; 0,3 a 0,5 s média; 0,8 s ou mais, lenta e visível para o rival.
- Projétil: 180 px/s rápido; 120 px/s normal; 50 a 80 px/s lento.
- Terreno e névoa: 4 a 8 s no campo.
- Golpe com dano contínuo: poder total (pulso × número de pulsos) dentro da mesma régua de 17 por segundo de recarga.
- Golpe com controle (empurrão, lentidão, área) dá menos dano do que a régua, porque o efeito já tem valor.

## Elementos

Cada elemento traz o seu terreno, a sua névoa e a escolha do editor: 10 golpes entre os 17 propostos. Os critérios foram estes: os golpes seus entram sempre; cada golpe explora uma faceta diferente e nenhum par repete mecânica; todo elemento tem quem crie o seu terreno e a sua névoa; golpes de reação que funcionam melhor como passiva ficaram de fora; e onde a análise apontou excesso ou falta, o número foi ajustado. Os 7 que não entraram aparecem no fim de cada elemento, com o motivo. Os números continuam sendo ponto de partida para calibrar; o porquê de cada ajuste está na [Análise dos golpes](https://claude.ai/artifact/B3TB4F4eFNSGqheRwaKy3D).

### Fogo

Queima, se espalha e dá dano ao longo do tempo.

- **Terreno:** Chamas no chão (seu). Quem pisa toma dano e pode pegar Queimadura. Fogo é imune.
- **Névoa:** Fumaça quente. Dá dano leve a quem está dentro. Fogo é imune.

**Escolha do editor.** Queima de perto (Lança-chamas, Pira, Rastro Ardente), ataca de longe com dois projéteis, ocupa o chão com Chamas, Fumaça e a Muralha, e tem duas defesas de luz e calor (Clarão, Miragem).

| Golpe | Faceta | Forma e mira | Conj. | Duração | Recarga | Poder | Efeito | Campo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Lança-chamas (seu) | queimar em cone | cone 50 px, 70°, no rival | 0,3 s | 2 s, pulso 0,25 s | 4 s | 7 por pulso | Queimadura 15% por pulso; quem usa fica lento | nenhum |
| Pira | onda de calor | anel de 30 px em volta de si | 0,6 s | instantâneo | 6 s | 35 | Queimadura garantida | nenhum |
| Rastro Ardente | rastro | avanço de 60 px na direção do rival | 0,2 s | instantâneo | 5 s | 30 | Queimadura 30%; o caminho vira Chamas por 4 s | terreno |
| Bola de Fogo | projétil | projétil reto, 120 px/s | 0,3 s | instantâneo | 3 s | 40 | deixa 1 foco de Chamas por 3 s onde estoura | terreno |
| Fome do Fogo | combustível | projétil lento, 60 px/s | 0,3 s | até acertar | 5 s | 15, até 60 | cresce 50% e ganha +15 de poder a cada Raízes, Esporos ou Fumaça que atravessa, e consome esse campo | nenhum |
| Chamas (seu) | espalhar | 4 focos de 8 px em volta do rival | 0,4 s | 5 s | 7 s | 6 a cada 0,5 s | Queimadura 30% ao entrar | terreno |
| Fumaceira | fumaça | área de 30 px em volta de si | 0,3 s | 6 s | 8 s | 2 a cada 0,5 s | — | névoa (Fumaça quente) |
| Muralha de Fogo | barreira | parede de 50 px atravessada entre si e o rival | 0,5 s | 5 s | 8 s | 8 a cada 0,5 s para quem atravessa | Queimadura 50% ao atravessar | terreno |
| Clarão | luz | anel de 50 px em volta de si | 0,3 s | instantâneo | 7 s | 10 | Cegueira 1,5 s: os projéteis do alvo saem com desvio de até 30° | nenhum |
| Miragem | calor que distorce | cópia falsa de quem usa, a 25 px dele | 0,3 s | 4 s | 10 s | — | cada golpe do rival tem 50% de chance de mirar a cópia | nenhum |

**Fora da seleção:** Brasas Saltitantes (repete os focos de Chamas), Brasa Viva (persegue até acertar; Pira já garante Queimadura), Sopro Quente (segundo cone, ao lado de Lança-chamas), Propulsão Ígnea (falta definir quem escolhe a direção), Cauterizar (depende de ter efeito negativo), Fênix (melhor como passiva) e Brasa Interior (2 s parado e depende do golpe seguinte).

### Explosão

Concentra energia e libera de uma vez: impacto, ruptura e deslocamento. Melhor contra estruturas rígidas, pior contra alvos fluidos.

- **Terreno:** Minas. Explodem quando alguém pisa, com dano e empurrão. Explosão é imune.
- **Névoa:** Gás volátil. Não dá dano sozinho; detona quando um golpe de Explosão acerta a nuvem.

**Escolha do editor.** Estouros grandes e anunciados (Detonação, Carga Concentrada), dois explosivos de tempo (Granada, Bomba-Relógio), Minas e Gás para preparar o campo, e três golpes que quebram coisas: estruturas, conjurações e a defesa do rival.

| Golpe | Faceta | Forma e mira | Conj. | Duração | Recarga | Poder | Efeito | Campo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Detonação | estouro anunciado | área de 20 px onde o rival estava; a marca fica visível | 1,0 s | instantâneo | 5 s | 75 | empurrão 40 px | nenhum |
| Granada | arremesso | projétil que quica 1 vez, 110 px/s; explode em 1,2 s ou ao tocar o rival; área de 15 px | 0,3 s | até 1,2 s | 4 s | 45 | empurrão 25 px | nenhum |
| Bomba-Relógio | tempo | projétil reto, 140 px/s, que gruda no rival e explode 2 s depois; área de 18 px | 0,3 s | 2 s | 6 s | 60 | empurrão 30 px | nenhum |
| Carga Concentrada | carga | anel de 30 px em volta de si; a criatura brilha cada vez mais enquanto carrega | 1,5 s, parada | instantâneo | 7 s | 90 | empurrão 50 px | nenhum |
| Impacto | avanço explosivo | avanço de 40 px que explode no fim; área de 15 px | 0,3 s | instantâneo | 5 s | 40 | empurrão 35 px no rival; quem usa recua 15 px | nenhum |
| Campo Minado | armadilha | 3 minas entre os dois | 0,4 s | 8 s | 8 s | 25 por mina | empurrão 20 px | terreno |
| Nuvem Volátil | gás | área de 25 px no rival | 0,3 s | 6 s | 7 s | 45 ao detonar | empurrão 25 px ao detonar | névoa |
| Ruptura | destruir estruturas | linha no chão de si até o rival | 0,6 s | instantâneo | 5 s | 35 | destrói terrenos e estruturas na linha (Raízes, Cristais, Pilar) | nenhum |
| Onda de Choque | onda de choque | anel que se abre de 40 a 100 px em 0,6 s | 0,3 s | 0,6 s | 7 s | 15 | interrompe conjurações e dissipa as névoas que toca | nenhum |
| Ponto de Ruptura | fragilizar | projétil reto, 140 px/s | 0,3 s | 5 s | 7 s | 10 | Rachado 5 s: o alvo leva +30% de dano de Explosão e de Terra (era +60% em Mineral) | nenhum |

A Nuvem Volátil depende da ordem da build: precisa de um golpe de Explosão logo depois para detonar.

**Fora da seleção:** Estouro em Cadeia (o alvo pega 1 ou 2 das 4 explosões), Detonador (só serve com Minas ou Gás em campo), Implosão (área de 25 px sem tempo de desviar), Mira Explosiva (repete Detonação), Pavio Curto (melhor como passiva), Reação em Cadeia (conta de cargas indefinida) e Barragem (dano ao acaso, sem tamanho de bomba).

### Água

Empurra, ocupa espaço e apaga fogo.

- **Terreno:** Poça (seu). Proposta de efeito: lentidão de 25% para quem não é de Água.
- **Névoa:** Umidade (seu). Proposta de efeito: quem está dentro perde a Queimadura e não pode pegar outra.

**Escolha do editor.** Empurra e ocupa espaço: dois golpes de longe (Jato, Lâmina), Bolhas que perseguem por pouco tempo, Gêiser marcado, Onda e Fluxo e Refluxo para mover o rival, e um ciclo de Poça (Alagamento, Recolher, Fonte).

| Golpe | Faceta | Forma e mira | Conj. | Duração | Recarga | Poder | Efeito | Campo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Jato d'Água | jato | linha de 90 px até o rival | 0,4 s | instantâneo | 3 s | 40 | empurrão 15 px | nenhum |
| Lâmina d'Água | corte | projétil reto, 160 px/s, atravessa o alvo | 0,2 s | instantâneo | 2,5 s | 30 | — | nenhum |
| Bolhas | bolhas | 4 projéteis lentos que perseguem, 60 px/s, curva fraca, vivem 3 s | 0,2 s | até 3 s | 3,5 s | 10 cada | — | nenhum |
| Gêiser | pressão do chão | área de 14 px no rival; a marca aparece no chão | 0,8 s | instantâneo | 5 s | 55 | arremessa o alvo, empurrão 20 px | terreno (Poça, 4 s) |
| Onda | onda | parede de 30 px que avança 70 px/s até 90 px | 0,5 s | até chegar ao fim | 6 s | 30 | empurra enquanto passa | terreno (Poça, 4 s) |
| Fluxo e Refluxo | maré | área de 60 px em volta de si | 0,3 s | 6 s | 9 s | 5 por troca | a cada 1,5 s alterna entre empurrar o rival para longe e puxar para perto | nenhum |
| Alagamento | ocupar espaço | 3 poças de 15 px entre os dois | 0,3 s | 6 s | 7 s | — | — | terreno (Poça) |
| Garoa | umidade | área de 30 px em volta de si | 0,3 s | 6 s | 8 s | — | protege contra Queimadura | névoa (Umidade) |
| Recolher | arena como munição | todas as Poças do campo | 0,4 s | instantâneo | 6 s | 15 por Poça | cada Poça some e vira um projétil reto de 130 px/s disparado no rival | nenhum |
| Fonte | cura | em si mesmo | 0,2 s | 6 s | 10 s | — | enquanto quem usa estiver em cima de Poça, recupera 5 HP/s | nenhum |

**Fora da seleção:** Maré (repete o empurrão em área), Pressão (versão pior de Jato d'Água), Espirro d'Água (cone curto de pouco efeito), Marionete (tira 2 s de controle do jogador), Fluir (melhor como passiva), Bolha-Prisão (reta e lenta para um controle forte) e Corrente Subterrânea (repete Gêiser).

### Gelo

Desacelera, trava e tira o controle do movimento.

- **Terreno:** Chão congelado. Quem não é de Gelo escorrega e continua deslizando na direção em que vinha.
- **Névoa:** Neblina gelada. Dá lentidão; quem fica 3 s seguidos dentro é congelado por 1 s. Gelo é imune.

**Escolha do editor.** Tira o controle do movimento sem travar demais: projétil, quedas marcadas, sopro e congelamento anunciado; Estilhaçar fecha contra quem está congelado; e três golpes mudam o chão e a arena.

| Golpe | Faceta | Forma e mira | Conj. | Duração | Recarga | Poder | Efeito | Campo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Lança de Gelo | projétil | projétil reto, 140 px/s (era 80) | 0,4 s | instantâneo | 3,5 s | 45 (era 50) | lentidão de 30% por 2 s | nenhum |
| Granizo | granizo | 6 pedras de 8 px caem em pontos aleatórios a até 30 px do rival; cada uma tem marca 0,5 s antes (tamanho novo) | 0,3 s | 2 s | 6 s | 12 cada | — | nenhum |
| Estalactite | queda | área de 10 px no rival; a marca aparece no chão | 0,9 s | instantâneo | 5 s | 55 | congela 0,8 s | nenhum |
| Sopro Gélido | sopro | cone 45 px, 70°, no rival | 0,3 s | 1,5 s, pulso 0,25 s | 5 s | 5 por pulso | lentidão que aumenta a cada pulso; quem usa fica lento | nenhum |
| Estilhaçar | fragilidade | corpo a corpo, 25 px | 0,2 s | instantâneo | 4 s | 30, ou 60 se o alvo estiver congelado (era 90) | quebra o congelamento | nenhum |
| Frio Cortante | frio que tira energia | projétil reto, 130 px/s | 0,3 s | 5 s | 7 s | 15 | Gelado 5 s: as recargas do alvo correm 30% mais devagar | nenhum |
| Nevasca | nevasca | área de 30 px no rival | 0,5 s | 5 s | 8 s | 3 a cada 0,5 s | lentidão e congelamento | névoa |
| Rastro Congelado | escorregar | faixa de 90 px de si até o rival | 0,3 s | 5 s | 6 s | — | escorregão | terreno |
| Escultor | esculpir | rampa de gelo em linha de 60 px | 0,4 s | 6 s | 8 s | — | quem anda no sentido da rampa ganha +60% de velocidade; contra o sentido, escorrega de volta | terreno (Chão congelado) |
| Avalanche | avalanche | onda de neve que nasce na borda de cima da arena e desce toda a largura em 1,5 s | 1,0 s | 1,5 s | 10 s | 30 | arrasta quem for pego até a borda de baixo; quem usa fica de fora (era: também era arrastado) | nenhum |

**Fora da seleção:** Pista de Gelo e Pegadas de Gelo (repetem o Chão congelado), Neblina Branca (repete a névoa da Nevasca), Prisão de Gelo (reta e lenta; fechava um combo de 110 com Estilhaçar), Fragmentos Congelados (repete a lentidão da Lança de Gelo), Hibernar (defesa que a IA não sabe quando usar) e Lente de Gelo (depende de projéteis passarem pela lente).

### Ar

Rápido, leve, desloca o rival e desvia o que vem pelo ar.

- **Terreno:** Corrente de vento. Desloca quem está dentro. Ar é imune.
- **Névoa:** Turbilhão. Desvia os projéteis que passam por dentro.

**Escolha do editor.** Rápido e de reposicionar: empurra (Rajada), corta de longe (Corte de Vento), avança sem ser atingido (Rasante), move o rival com Tornado e Corredor, e se defende de projéteis (Cortina, Esfera).

| Golpe | Faceta | Forma e mira | Conj. | Duração | Recarga | Poder | Efeito | Campo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rajada (seu) | empurrar | cone 45 px, 90°, no rival | 0,2 s | instantâneo | 3 s | 30 | empurrão 30 px | nenhum |
| Corte de Vento | corte | projétil reto, 200 px/s, atravessa o alvo | 0,1 s | instantâneo | 2 s | 28 | — | nenhum |
| Eco | eco | cone 50 px, 70°; 1 s depois, um segundo cone volta do ponto mais distante em direção a quem usa | 0,2 s | 1 s | 4 s | 18 por cone | — | nenhum |
| Rasante | voo rasante | avanço de 70 px atravessando o rival | 0,1 s | instantâneo | 5 s | 35 | quem usa não pode ser atingido durante o avanço | nenhum |
| Tornado | tornado | área de 20 px que anda 30 px/s em direção ao rival | 0,5 s | 4 s | 8 s | 5 a cada 0,5 s | puxa quem está perto | terreno (móvel) |
| Corredor de Vento | corrente | faixa de 20 × 80 px entre os dois | 0,3 s | 5 s | 7 s | — | empurra para o lado quem entra | terreno (Corrente de vento) |
| Cortina de Vento | desvio | área de 30 px em volta de si | 0,3 s | 5 s | 9 s | — | — | névoa (Turbilhão) |
| Vácuo | ausência de ar | área de 25 px no rival | 0,4 s | 3 s | 8 s | — | apaga Fogo e névoas dentro; quem está dentro conjura 50% mais devagar | nenhum |
| Leveza | leveza | projétil reto, 160 px/s | 0,2 s | 4 s | 7 s | 10 | Leve 4 s: o alvo sofre empurrão dobrado e não consegue ficar parado | nenhum |
| Esfera de Ar | esquiva | esfera girando em volta de quem usa | 0,1 s | 3 s | 9 s | — | projéteis que tocam a esfera são desviados em 90°; quem usa anda 30% mais rápido | nenhum |

**Fora da seleção:** Leque de Vento e Assobio Cortante (repetem o corte de Corte de Vento), Redemoinho (repete Tornado), Vendaval (empurrão repetido com pouco dano), Troca de Lugar (falta definir quando a troca ajuda), Projeção Espiritual (dano baixo e corpo exposto) e Corrente Ascendente (o estado "no ar" ainda não tem regra).

### Eletricidade

Instantâneo, imprevisível, trava o rival.

- **Terreno:** Campo estático. Dá dano em pulsos e pode atordoar. Eletricidade é imune.
- **Névoa:** Nuvem carregada. Solta descargas em quem está dentro. Eletricidade é imune.

**Escolha do editor.** Instantâneo, mas sempre anunciado: Raio e Arco com aviso, estática que persegue devagar, tempestade e cerca para o campo, e três golpes que jogam com movimento e magnetismo (Passo Relâmpago, Polaridade, Estática).

| Golpe | Faceta | Forma e mira | Conj. | Duração | Recarga | Poder | Efeito | Campo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Raio | raio | área de 8 px no rival; a marca aparece no chão | 0,6 s | instantâneo | 3 s | 40 (era 50) | atordoa 0,4 s | nenhum |
| Arco Voltaico | arco | linha de 70 px até o rival | 0,2 s | instantâneo | 2,5 s | 35 | a linha aparece durante a conjuração (novo) | nenhum |
| Esfera Estática | estática no ar | projétil que persegue, 50 px/s, curva fraca, vive 3 s | 0,3 s | 3 s, pulso 0,3 s | 5 s | 6 por pulso a até 12 px | — | nenhum |
| Descarga | descarga | anel de 25 px em volta de si | 0,1 s | instantâneo | 4 s | 30 | atordoa 0,3 s | nenhum |
| Nuvem de Tempestade | tempestade | área de 30 px no rival | 0,5 s | 6 s | 8 s | 15 a cada 1,2 s | atordoa 0,2 s | névoa |
| Cerca Elétrica | barreira | parede de 50 px atravessada entre os dois | 0,4 s | 5 s | 8 s | 10 a cada 0,5 s para quem atravessa | atordoa 0,3 s | terreno (Campo estático) |
| Passo Relâmpago | relâmpago | quem usa reaparece do outro lado do rival, a 30 px | 0,1 s | instantâneo | 7 s | 20 para quem cruzar o rastro | deixa uma linha elétrica no caminho por 2 s | nenhum |
| Polaridade | atrair | marca quem usa e o rival com cargas opostas | 0,3 s | 4 s | 8 s | 35 ao encostar | os dois são puxados um para o outro a 20 px/s; quando encostam, choque | nenhum |
| Estática | carga pelo movimento | em si mesmo | 0,1 s | 8 s | 10 s | — | cada 20 px andados somam uma carga (até 6); o próximo golpe de Eletricidade ganha +10% por carga | nenhum |
| Para-raios | para-raios | pino fincado no chão perto do rival | 0,3 s | 6 s | 9 s | — | todo golpe de Eletricidade de quem usa também salta para quem estiver a até 20 px do pino | terreno (Campo estático em volta do pino) |

**Fora da seleção:** Trovão (repete Raio), Campo Magnético (repete Nuvem de Tempestade), Faísca Saltitante (dano baixo), Sobrecarga (põe atordoamento em todo golpe), Redirecionar Raio (só serve contra Eletricidade), Repulsão (empurrão contínuo sem força definida) e Pane (efeito fraco com a IA atual).

### Terra

Pesada, firme, domina o chão.

- **Terreno:** Fissuras. Lentidão de 40% para quem não é de Terra.
- **Névoa:** Poeira. Dá dano leve a quem está dentro. Terra é imune.

**Escolha do editor.** Pesada e dona do chão: Tremor de perto; Estacas, Rocha e bloco arrancado de longe; Fissura e Areia Movediça no chão; Poeira como névoa; e três golpes de defesa e leitura do rival (Escavar, Armadura de Pedra, Sentido Sísmico).

| Golpe | Faceta | Forma e mira | Conj. | Duração | Recarga | Poder | Efeito | Campo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tremor (seu) | tremor | anel de 35 px em volta de si | 0,5 s | instantâneo | 5 s | 40 | lentidão de 40% por 2 s | nenhum |
| Estacas de Terra | estacas | 3 estacas de 8 px em linha até o rival, uma a cada 0,2 s; cada uma com marca 0,3 s antes (marca nova) | 0,3 s | 0,6 s | 4 s | 18 cada | — | nenhum |
| Rocha Rolante | rolar | projétil reto lento e grande (8 px), 70 px/s | 0,4 s | instantâneo | 4 s | 50 | empurrão 25 px | nenhum |
| Arrancar Chão | arena como munição | arranca um bloco aos próprios pés e arremessa: projétil reto, 130 px/s (era 90) | 0,4 s | instantâneo | 4 s | 45 | se quem usa estiver sobre um terreno (Poça, Cristais, Raízes…), o bloco leva o efeito desse terreno | terreno (Fissuras onde arrancou, 4 s) |
| Fissura | rachar | rachadura que avança 100 px/s até 90 px | 0,4 s | até chegar ao fim | 4 s | 35 | — | terreno (Fissuras, 4 s) |
| Areia Movediça | afundar | área de 25 px no rival | 0,4 s | 6 s | 9 s | — | quem fica 2 s seguidos dentro fica preso 1 s | terreno |
| Tempestade de Areia | areia | área de 35 px em volta de si | 0,4 s | 6 s | 8 s | 3 a cada 0,5 s | — | névoa |
| Escavar | cavar | quem usa afunda e reaparece embaixo do rival; área de 15 px | 0,3 s | 1,5 s embaixo da terra | 7 s | 40 | embaixo da terra, só é atingido por anéis de Terra | nenhum |
| Armadura de Pedra | armadura | em si mesmo | 0,3 s | 5 s | 10 s | — | DEF +50% e imune a empurrão, mas anda 40% mais devagar | nenhum |
| Sentido Sísmico | sentir vibrações | em si mesmo | 0,2 s | 6 s | 10 s | — | golpes de Terra de quem usa dão +30% em alvo andando e −30% em alvo parado | nenhum |

**Fora da seleção:** Terremoto (repete Tremor), Pisão (terceiro anel em volta de si), Afundar (área sem tempo de desviar), Poeirada (segundo jeito de criar Poeira), Espera da Montanha (melhor como passiva), Fenda Ígnea (aplica Queimadura, estado de Fogo) e Desmoronar (encolhe a arena inteira).

### Mineral

Rígido, cortante, ergue estruturas.

- **Terreno:** Cristais. Pontas no chão que dão dano a quem pisa. Mineral é imune.
- **Névoa:** Pó cristalino. Projéteis que atravessam perdem metade do dano.

**Escolha do editor.** Rígido e cortante: Agulha de longe, Estilhaços de perto, duas trajetórias próprias (Bumerangue, Prisma), Cristais com Ressonância, Pó cristalino como névoa, e três golpes de estrutura e reflexo (Corrente de Metal, Pilar, Couraça).

| Golpe | Faceta | Forma e mira | Conj. | Duração | Recarga | Poder | Efeito | Campo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Agulha de Quartzo | perfurar | projétil reto e fino, 220 px/s, atravessa o alvo | 0,3 s | instantâneo | 3 s | 35 | — | nenhum |
| Estilhaços | cortar | cone 35 px, 60°, 5 fragmentos | 0,2 s | instantâneo | 2,5 s | 9 cada | — | nenhum |
| Lâmina Bumerangue | lâmina que volta | disco que vai 90 px e volta para quem usa | 0,2 s | 1,5 s | 4 s | 20 na ida, 20 na volta | — | nenhum |
| Prisma | refração | feixe de 100 px que reflete uma vez na borda da arena | 0,5 s | instantâneo | 4 s | 35 | — | nenhum |
| Corrente de Metal | dobrar metal | cabo de metal em linha de 70 px até o rival | 0,4 s | 3 s | 9 s | 15 | prende o rival a quem usa: a distância entre os dois não passa de 70 px | nenhum |
| Campo de Cristais | cristais | espalhado em 30 px em volta de si | 0,4 s | 6 s | 8 s | 12 ao pisar, 1 vez por segundo | — | terreno |
| Ressonância | ressonância | todos os Cristais em campo; sem Cristais, anel de 20 px em volta de si | 0,3 s | instantâneo | 5 s | 15 perto de cada Cristal, 10 no anel | os Cristais vibram e atingem quem estiver a até 20 px deles | nenhum |
| Poeira de Gema | pó | área de 30 px em volta de si | 0,3 s | 6 s | 9 s | — | — | névoa (Pó cristalino) |
| Pilar de Cristal | erguer | pilar de 8 × 12 px entre si e o rival | 0,5 s | 5 s | 7 s | — | bloqueia projéteis e passagem; Explosão destrói | estrutura (ver Pendências) |
| Couraça Cristalina | refletir | em si mesmo | 0,2 s | 3 s | 9 s | — | projéteis que acertam quem usa voltam para o atacante | nenhum |

**Fora da seleção:** Chuva de Gemas e Fragmentação (repetem Cristais no chão), Geodo (estilhaços para todos os lados acertam pouco), Cristalizar (acumula com Rachado), Peso (reto e lento), Gema Refletora e Fundição (dependem de outros golpes).

### Natureza

Cresce, prende e drena.

- **Terreno:** Raízes (seu). Lentidão e dano a quem não é de Natureza, Terra ou Ar.
- **Névoa:** Esporos. Dão dano leve; fakémons de Natureza dentro regeneram.

**Escolha do editor.** Cresce, prende e drena: Folha e Espinhos para dano, Chicote e Raízes para prender, Drenar e Fotossíntese para se curar, Carnívora como armadilha, Esporos como névoa, e Decomposição e Vinhas para dominar o chão.

| Golpe | Faceta | Forma e mira | Conj. | Duração | Recarga | Poder | Efeito | Campo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Folha Navalha (seu) | folha | projétil reto rápido, 180 px/s | 0,1 s | instantâneo | 2 s | 35 | — | nenhum |
| Espinhos | espinhos | cone 40 px, 60°, 6 espinhos | 0,2 s | instantâneo | 2,5 s | 7 cada | — | nenhum |
| Chicote de Vinha | puxar | linha curta de 35 px até o rival | 0,2 s | instantâneo | 3 s | 35 | puxa o alvo 15 px para perto | nenhum |
| Drenar | drenar | projétil que persegue, 80 px/s, vive 2,5 s (era: até acertar) | 0,3 s | até 2,5 s | 4 s | 25 | quem usa recupera metade do dano causado | nenhum |
| Raízes Espinhentas (seu) | prender | área de 22 px no rival | 0,5 s | 5 s | 7 s | 4 a cada 0,5 s | lentidão de 40%; imunes Natureza, Terra e Ar | terreno |
| Carnívora | planta carnívora | flor de 15 px no chão perto do rival | 0,4 s | 6 s ou até morder | 8 s | 35 | o primeiro que pisar é mordido e fica preso 1,2 s | terreno |
| Nuvem de Esporos | esporos | área de 28 px no rival | 0,4 s | 6 s | 8 s | 3 por segundo | Natureza dentro recupera 2 HP/s | névoa |
| Decomposição | decomposição | área de 25 px no rival | 0,5 s | instantâneo | 9 s | — | todo terreno dentro da área (Poça, Fissuras, Chamas, Cristais…) apodrece e vira Raízes | terreno (Raízes) |
| Vinhas Entrelaçadas | ligar pontos | faixa de vinhas de quem usa até o rival | 0,3 s | 6 s | 9 s | — | quem usa anda 50% mais rápido sobre as vinhas; o rival que cruza tropeça e para por 0,4 s | terreno |
| Fotossíntese | luz do sol | em si mesmo; quem usa fica parado | 0,3 s | 2 s | 12 s | — | recupera 15 HP/s | nenhum |

**Fora da seleção:** Semeadura e Bomba de Sementes (mais dois jeitos de criar Raízes), Esporos Sufocantes (repete Nuvem de Esporos), Semente Parasita (repete Drenar), Florada (cura espalhada difícil de calibrar), Camuflagem (só funciona sobre Raízes) e Crescimento (linha instantânea; o dano depende do tempo de luta).

### Arcano

Trajetórias impossíveis: quica, persegue, dispara sozinho.

- **Terreno:** Círculo rúnico. Dispara sozinho enquanto dura.
- **Névoa:** Bruma arcana. Quem está dentro leva 25% a mais de dano de Arcano.

**Escolha do editor.** Trajetórias impossíveis e regras quebradas: ricochete, mísseis, selo e runa para dano; bruma, gravidade e tempo lento para controlar a área; teleporte, portais e cópia como truques.

| Golpe | Faceta | Forma e mira | Conj. | Duração | Recarga | Poder | Efeito | Campo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Orbe Ricocheteante (seu) | ricochete | projétil que quica, 100 px/s, vive 2 s | 0,3 s | 2 s | 4 s | 25 por acerto, até 2 acertos | — | nenhum |
| Mísseis Mágicos (seu) | perseguir | 3 projéteis que perseguem, 90 px/s, curva limitada, vivem 2,5 s (era: até acertar) | 0,3 s | até 2,5 s | 3,5 s | 14 cada | — | nenhum |
| Selo | selo | área de 20 px no rival; explode 1,5 s depois de aparecer | 0,3 s | 1,5 s | 5 s | 55 | — | terreno (Círculo rúnico, 3 s; duração nova) |
| Círculo Rúnico | runa | área de 20 px em volta de si | 0,6 s | 5 s | 9 s | 12 por míssil | dispara 1 míssil no rival a cada 1,5 s | terreno |
| Véu Arcano | bruma | área de 30 px no rival | 0,3 s | 6 s | 8 s | — | — | névoa (Bruma arcana) |
| Gravidade Arcana | gravidade | área de 25 px no rival | 0,4 s | 3 s | 8 s | — | projéteis que passam por dentro fazem curva para o centro | terreno |
| Salto Arcano | teleporte | quem usa some e reaparece 40 px atrás do rival; anel de 15 px ao reaparecer | 0,4 s | instantâneo | 8 s | 20 | — | nenhum |
| Portais | espaço | 2 portais: um em quem usa, outro perto do rival | 0,5 s | 5 s | 10 s | — | projéteis e criaturas que entram num portal saem no outro | nenhum |
| Tempo Lento | tempo | área de 40 px no rival | 0,5 s | 4 s | 11 s | — | tudo dentro (criaturas, projéteis e o tempo restante de terrenos) anda a 40% da velocidade | nenhum |
| Espelho Arcano | cópia | em si mesmo | 0,3 s | instantâneo | 8 s | do golpe copiado | usa contra o rival o último golpe que o rival usou; não copia golpes de uso único (regra nova) | nenhum |

**Fora da seleção:** Feixe Arcano (1,8 s parado para pouco dano), Espiral de Orbes (sem teto de acertos), Orbe Divisor (só se divide se errar), Rebobinar e Elo de Dor (defesas que a IA não sabe quando usar), Encantar (indefinido para anéis e buffs) e Silêncio (Tempo Lento já cobre o controle de área).

### Primordial

Você ainda não definiu a personalidade de Primordial. Proposta: força antiga e bruta, territorial, de perto.

- **Terreno:** Território. O dono causa 20% a mais de dano enquanto está dentro.
- **Névoa:** Miasma. Dá dano leve e impede cura.

**Escolha do editor.** Força bruta de perto: mordida, investida, cauda e rugido; presas que saem do chão; Miasma como névoa; e quatro golpes de fúria, território, caçada e tamanho.

| Golpe | Faceta | Forma e mira | Conj. | Duração | Recarga | Poder | Efeito | Campo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mordida Ancestral | mordida | corpo a corpo, 20 px | 0,3 s | instantâneo | 3 s | 55 | — | nenhum |
| Avanço Selvagem | investida | avanço de 50 px até o rival | 0,3 s | instantâneo | 4 s | 45 | empurrão 20 px | nenhum |
| Cauda Varrida | cauda | meia-volta: cone 30 px, 160° | 0,3 s | instantâneo | 4 s | 35 | empurrão 30 px | nenhum |
| Rugido | rugido | anel de 40 px em volta de si | 0,4 s | instantâneo | 6 s | 20 | empurrão 35 px | nenhum |
| Presas Ancestrais | presas do chão | 4 presas saem do chão em volta do rival; cada uma tem marca 0,6 s antes (era 0,5); área de 8 px | 0,3 s | 0,8 s | 5 s | 15 cada | — | nenhum |
| Sangue Antigo | fúria de quem está caindo | corpo a corpo, 25 px | 0,3 s | instantâneo | 4 s | 30, até 60 | quanto menor o HP de quem usa, maior o dano (dobro com 10% de HP) | nenhum |
| Marcar Território | território | área de 30 px em volta de si | 0,4 s | 6 s | 8 s | — | bônus de 20% de dano para o dono | terreno |
| Hálito Pútrido | hálito | cone 40 px, 80°, no rival | 0,3 s | instantâneo | 6 s | 15 | — | névoa (Miasma no cone, 5 s) |
| Marcar Presa | caçada | marca no rival | 0,2 s | 8 s | 10 s | — | quem usa anda 25% mais rápido em direção à presa e seus golpes ganham +20 px de alcance contra ela | nenhum |
| Gigante | crescer | em si mesmo | 0,5 s | 5 s | 12 s | — | quem usa dobra de tamanho: anéis e corpo a corpo +50% de área, DEF +20%; fica mais lento e mais fácil de acertar | nenhum |

**Fora da seleção:** Pisoteio e Bote (repetem Avanço Selvagem), Fúria (terceiro bônus de dano, ao lado de Território e Sangue Antigo), Adaptação e Instinto (melhores como passiva), Chamado Ancestral e Uivo do Bando (dependem do tamanho do time).

## Tabela de tipos

Esta é a matriz que você passou, com 10 tipos; Explosão ainda não entrou. Linha = quem ataca, coluna = quem defende.

| Ataca ↓ / Defende → | Fogo | Água | Ar | Terra | Eletr. | Natureza | Mineral | Arcano | Primordial | Gelo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fogo | 1 | 0,5 | 1 | 0,5 | 1 | 2 | 2 | 1 | 0,5 | 2 |
| Água | 2 | 1 | 1 | 2 | 0,5 | 0,5 | 2 | 1 | 0,5 | 1 |
| Ar | 1 | 1 | 1 | 2 | 0,5 | 2 | 0,5 | 1 | 0,5 | 1 |
| Terra | 2 | 0,5 | 0,5 | 1 | 2 | 0,5 | 2 | 1 | 0,5 | 1 |
| Eletricidade | 1 | 2 | 2 | 0,5 | 1 | 0,5 | 2 | 1 | 1 | 1 |
| Natureza | 0,5 | 2 | 0,5 | 2 | 1 | 1 | 2 | 1 | 1 | 0,5 |
| Mineral | 0,5 | 1 | 2 | 0,5 | 1 | 1 | 1 | 2 | 2 | 2 |
| Arcano | 1 | 2 | 2 | 1 | 0,5 | 1 | 0,5 | 1 | 2 | 1 |
| Primordial | 2 | 1 | 1 | 2 | 2 | 1 | 0,5 | 2 | 1 | 0,5 |
| Gelo | 0,5 | 1 | 2 | 1 | 1 | 2 | 0,5 | 1 | 2 | 1 |

O que a matriz já mostra:

- Arcano não resiste a nenhum tipo.
- Mineral é fraco contra 5 tipos, o maior número da tabela.
- Ar dá 2x em só 2 tipos e é resistido por 3.
- Nenhum tipo resiste a si mesmo.
- Arcano e Primordial dão 2x um no outro.

## Pendências

Estes pontos dependem de decisão sua antes de fechar os golpes.

- [ ] **Reações entre terrenos e névoas:** você definiu que interagem, mas não como. Exemplo de pergunta: o que acontece quando Chamas encontra Poça?
- [ ] **Explosão na tabela de tipos:** falta a linha e a coluna do 11º tipo.
- [ ] **Personalidade de Primordial:** a proposta deste guia é força bruta e territorial.
- [ ] **Terreno e névoa propostos:** só Poça, Umidade, Chamas e Raízes são seus. Os outros 18 são propostas.
- [ ] **Estrutura:** o Pilar de Cristal não é terreno nem névoa. Precisa decidir se essa categoria existe.
- [ ] **Novos estados:** Atordoamento, Congelamento e Escorregão são propostas, além dos seus Empurrão, Lentidão e Queimadura. Os golpes adicionais também usam puxão, prisão, cura, roubo de vida, reflexo de projéteis, bônus em si mesmo e destruição de terreno; a ficha do golpe ainda não tem um campo para efeito em si mesmo. A escolha do editor acrescenta estados (Cegueira, Rachado, Gelado, Leve), objetos na arena (cópia da Miragem, Pilar, portais, pino do Para-raios) e um golpe que depende da build do rival (Espelho Arcano).
- [ ] **Uso pela IA:** com a regra atual (ordem da build e recarga), a IA usa um golpe assim que ele recarrega. Golpes como Tremor, que só acertam de perto, seriam usados mesmo com o rival longe. Precisa decidir se o golpe ganha uma condição de uso.
- [x] **Quantidade final por elemento:** definida em 10 por elemento, a escolha do editor; cada fakémon leva 4.
