// Formato de um pacote de conteúdo (pasta `conteudo/<pacote>/`).
// Cada arquivo é um dicionário por id; este esquema valida os campos
// e confere se toda referência (tipo, golpe, espécie…) existe.

import { z } from 'zod';

const id = z.string().regex(/^[a-z0-9-]+$/, 'use só letras minúsculas sem acento, números e hífen');
const cor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'use uma cor no formato #rrggbb');
const positivo = z.number().positive();
const dicionario = <T extends z.ZodType>(item: T) => z.record(id, item);

/**
 * Estilos de efeito especial (partículas em pixel) que o desenho sabe fazer. Cada elemento escolhe um:
 * brasa sobe, gota cai, floco flutua, redemoinho gira, faísca risca em zigue-zague, poeira se espalha,
 * estilhaço voa e cai brilhando, folha balança, estrela cintila, garra risca, estouro se espalha rápido.
 */
export const ESTILOS_FX = ['brasa', 'estouro', 'gota', 'floco', 'redemoinho', 'faisca', 'poeira', 'estilhaco', 'folha', 'estrela', 'garra'] as const;

export const esquemaTipo = z.object({
  nome: z.string().min(1),
  cor,
  fundo: cor,
  /** Multiplicador dos golpes deste tipo contra cada tipo alvo. Tipo ausente = 1. */
  eficacia: dicionario(z.number().min(0)).default({}),
  /** Cor das partículas quando uma criatura deste tipo desmaia. Padrão: `cor`. */
  particula: cor.optional(),
  /** Cores do projétil: rastro, corpo e núcleo. Uma 4ª cor faz o núcleo piscar entre a 3ª e a 4ª. */
  projetil: z.array(cor).min(3).max(4).optional(),
  /** Ícone 8×8, uma string por linha: "#" acende o pixel, "." deixa vazio. */
  icone: z.array(z.string().regex(/^[#.]{8}$/, 'cada linha do ícone tem 8 caracteres "#" ou "."')).length(8).optional(),
  /** Terreno e névoa do elemento (ids de `campos.json`). */
  terreno: id.optional(),
  nevoa: id.optional(),
  /** Efeitos especiais do elemento: estilo das partículas e cores, da mais escura à mais clara. Sem ele, nada de FX. */
  fx: z.object({ estilo: z.enum(ESTILOS_FX), cores: z.array(cor).min(2) }).optional(),
});

export const esquemaSprite = z
  .object({
    /** Cor de cada índice; o índice 0 é sempre transparente (use null). */
    paleta: z.array(cor.nullable()).min(2),
    /** Uma string por linha; cada caractere (0–f) é um índice da paleta. Quadrado: N linhas de N caracteres. */
    pixels: z.array(z.string().regex(/^[0-9a-f]+$/, 'use só 0–9 e a–f')).min(1),
  })
  .superRefine((s, ctx) => {
    s.pixels.forEach((linha, i) => {
      if (linha.length !== s.pixels.length) {
        ctx.addIssue({ code: 'custom', path: ['pixels', i], message: `a linha tem ${linha.length} pixels; o sprite tem ${s.pixels.length} linhas e precisa ser quadrado` });
      }
      for (const ch of linha) {
        if (parseInt(ch, 16) >= s.paleta.length) {
          ctx.addIssue({ code: 'custom', path: ['pixels', i], message: `usa a cor "${ch}", mas a paleta só tem ${s.paleta.length} cores` });
          break;
        }
      }
    });
  });

export const esquemaCategoria = z.object({
  nome: z.string().min(1),
});

// ---------- Efeitos de golpe ----------
// Um golpe é uma lista de efeitos executados em ordem. Cada efeito é uma peça que o
// motor sabe fazer; golpes novos são combinações dessas peças, sem código novo.
// Distâncias em unidades da arena (área andável de 296 × 118); tempos em segundos.

const atributo = z.enum(['ataque', 'defesa', 'velocidade']);
const duracao = positivo;
/** Probabilidade de 0 a 1 de o efeito pegar. Sem `chance`, sempre pega. */
const chance = z.number().gt(0).max(1).optional();

/**
 * Efeitos em quem foi atingido. Soltos no golpe, exigem o rival ao alcance na hora; dentro de uma forma,
 * de um projétil ou de um campo, valem para quem for atingido. `estado` com `em: "si"` vale para quem usou.
 */
const efeitosNoAlvo = [
  z.object({ efeito: z.literal('empurrar'), distancia: positivo, duracao: duracao.default(0.2), chance }),
  z.object({ efeito: z.literal('puxar'), distancia: positivo, duracao: duracao.default(0.2), chance }),
  /** Com `acumula`, cada aplicação multiplica a lentidão que já havia, até `minimo`. */
  z.object({
    efeito: z.literal('lentidao'),
    fator: z.number().gt(0).lt(1),
    duracao,
    chance,
    acumula: z.boolean().default(false),
    minimo: z.number().gt(0).lt(1).optional(),
  }),
  z.object({ efeito: z.literal('prender'), duracao, chance }),
  z.object({ efeito: z.literal('atordoar'), duracao, chance }),
  /** `nome` identifica o dano contínuo para os estados que protegem dele (ex.: "queimadura"). */
  z.object({ efeito: z.literal('dano-continuo'), porSegundo: positivo, duracao, chance, nome: z.string().min(1).optional() }),
  z.object({ efeito: z.literal('debuff'), atributo, valor: positivo, duracao, chance }),
  /** Aplica um estado de `estados.json` em quem foi atingido, ou em quem usou (`em: "si"`). */
  z.object({ efeito: z.literal('estado'), estado: id, duracao, chance, em: z.enum(['alvo', 'si']).default('alvo') }),
  /** Corta a conjuração ou o golpe em andamento. */
  z.object({ efeito: z.literal('interromper'), chance }),
  /** Prende o alvo a quem usou: a distância entre os dois não passa de `distancia`. */
  z.object({ efeito: z.literal('acorrentar'), distancia: positivo, duracao, chance }),
  /** Os dois são puxados um para o outro; quando encostam, o alvo leva `aoEncostar` de poder e a atração acaba. */
  z.object({ efeito: z.literal('atrair'), velocidade: positivo, duracao, aoEncostar: z.number().min(0).default(0), chance }),
] as const;

export const esquemaEfeitoNoAlvo = z.discriminatedUnion('efeito', [...efeitosNoAlvo]);

/** O que uma forma ou um projétil faz em quem acerta: `poder` de dano (0 = sem dano), `efeitos`, e `drena` (fração do dano que volta como cura). */
const carga = {
  poder: z.number().min(0).default(0),
  efeitos: z.array(esquemaEfeitoNoAlvo).default([]),
  drena: z.number().gt(0).max(1).optional(),
};

/** Campo (`campos.json`) deixado por uma forma, com a mesma geometria ou com `raio`/`largura` próprios. Números ausentes vêm do campo. */
const esquemaDeixa = z.object({
  campo: id,
  duracao,
  raio: positivo.optional(),
  largura: positivo.optional(),
  pulso: positivo.optional(),
  poder: z.number().min(0).optional(),
  efeitos: z.array(esquemaEfeitoNoAlvo).optional(),
  aoEntrar: z.object({ poder: z.number().min(0).default(0), efeitos: z.array(esquemaEfeitoNoAlvo).default([]) }).optional(),
});

/**
 * Apaga os campos que a forma toca: os das `camadas` ou dos `tipos` (sem nenhum dos dois, todos) e, com `objetos`,
 * as estruturas. Com `converteEm`, troca o campo por esse.
 */
const esquemaApaga = z.object({
  camadas: z.array(z.enum(['terreno', 'nevoa'])).optional(),
  tipos: z.array(id).optional(),
  converteEm: id.optional(),
  objetos: z.boolean().default(false),
});

/**
 * Como a forma se comporta no tempo. Sem nada disso, acerta uma vez, na hora.
 * - `atraso`: a marca fica no chão e acerta depois; quem usou fica livre.
 * - `duracao` com `pulso`: fica e acerta a cada pulso (o primeiro na hora). A área fica parada; cone e linha são canalizados.
 * - `move`: anda (`velocidade`, até `ate` de distância; `persegue` vira para o rival). `raioFinal` (área): o raio cresce até ele.
 * - `umaVez`: cada criatura é atingida uma vez só. `arrasta`: leva junto quem pega. `puxa`: puxa para o centro (unidades/s).
 * - `alterna`: listas de efeitos que se revezam a cada pulso.
 * - `deixa`: campo deixado no lugar. `rastro`: campo deixado no caminho de uma forma que anda.
 * - `apaga`: apaga (ou converte) campos e estruturas que a forma toca.
 */
const comportamento = {
  duracao: positivo.optional(),
  pulso: positivo.optional(),
  atraso: positivo.optional(),
  move: z.object({ velocidade: positivo, ate: positivo.optional(), persegue: z.boolean().default(false) }).optional(),
  raioFinal: positivo.optional(),
  umaVez: z.boolean().default(false),
  arrasta: z.boolean().default(false),
  puxa: positivo.optional(),
  alterna: z.array(z.array(esquemaEfeitoNoAlvo)).min(2).optional(),
  deixa: esquemaDeixa.optional(),
  rastro: z.object({ campo: id, largura: positivo, duracao }).optional(),
  apaga: esquemaApaga.optional(),
};

/**
 * Círculo de `raio`. `centro`: no rival (onde ele estava quando o golpe começou), em quem usa (anel), ou no meio
 * dos dois. Dentro de um estouro, de `varias` ou de `cadaCampo`, o centro é o ponto de lá.
 */
const esquemaArea = z.object({ efeito: z.literal('area'), centro: z.enum(['rival', 'si', 'meio']).default('rival'), raio: positivo, ...carga, ...comportamento });
/** Leque de `alcance` e `angulo` (graus), de quem usa (ou da `ponta` do anterior) para onde o rival estava; `inverte` aponta de volta. */
const esquemaCone = z.object({
  efeito: z.literal('cone'),
  alcance: positivo,
  angulo: z.number().gt(0).max(360),
  origem: z.enum(['si', 'ponta']).default('si'),
  inverte: z.boolean().default(false),
  ...carga,
  ...comportamento,
});
/** Faixa reta de quem usa até `alcance` (ou até o rival, com `ateRival`), com `largura`; `reflete` quica na borda da arena. */
const esquemaLinha = z.object({
  efeito: z.literal('linha'),
  alcance: positivo,
  largura: positivo,
  ateRival: z.boolean().default(false),
  reflete: z.number().int().min(0).default(0),
  ...carga,
  ...comportamento,
});
/** Parede de `largura` × `espessura`, atravessada na direção do rival; `topo` nasce na borda de cima e aponta para baixo. */
const esquemaParede = z.object({
  efeito: z.literal('parede'),
  centro: z.enum(['si', 'meio', 'rival', 'topo']).default('meio'),
  largura: positivo,
  espessura: positivo,
  ...carga,
  ...comportamento,
});

export const esquemaForma = z.discriminatedUnion('efeito', [esquemaArea, esquemaCone, esquemaLinha, esquemaParede]);

/** Por onde o projétil anda. `guiado` é o da Arena original: persegue sem limite e sempre acerta. */
export const esquemaTrajetoria = z.enum(['guiado', 'reto', 'persegue', 'quica']);

/**
 * Projétil. Ao acertar causa `poder` de dano e aplica `efeitos`. Os que não são `guiado` podem errar:
 * acertam quando encostam (raio da criatura + `raio` do projétil) e somem ao fim da `vida`.
 * Valores ausentes vêm de `regras.projetil`.
 */
export const esquemaProjetil = z.object({
  efeito: z.literal('projetil'),
  ...carga,
  trajetoria: esquemaTrajetoria.default('guiado'),
  velocidade: positivo.optional(),
  /** Curva máxima de `persegue`, em graus por segundo. */
  curva: positivo.optional(),
  /** Segundos até sumir (não vale para `guiado`). */
  vida: positivo.optional(),
  raio: positivo.optional(),
  /** Quantos projéteis saem juntos, abertos em leque de `abertura` graus. */
  quantidade: z.number().int().positive().default(1),
  abertura: z.number().min(0).max(360).default(0),
  /** Acertos por encostar que cada projétil pode dar (0 = nenhum, só a aura); para acertar de novo, precisa sair e voltar. */
  acertos: z.number().int().min(0).default(1),
  /** Continua voando depois do último acerto, sem dano, em vez de sumir. */
  atravessa: z.boolean().default(false),
  /** `quica`: quantas vezes pode quicar; na borda seguinte, estoura. Sem ele, quica até a vida acabar. */
  quicas: z.number().int().min(0).optional(),
  /** Gruda em quem acerta e estoura `gruda` segundos depois. */
  gruda: positivo.optional(),
  /** Vai até `volta` de distância e volta para quem atirou (bumerangue). */
  volta: positivo.optional(),
  /** Acerta quem estiver a até `raio` dele a cada `pulso`, sem precisar encostar. */
  aura: z.object({ raio: positivo, pulso: positivo, poder: z.number().min(0), efeitos: z.array(esquemaEfeitoNoAlvo).default([]) }).optional(),
  /** Ao passar por estes campos, apaga cada um e ganha `poder` (até `maximo` no total) e `crescimento` no raio. */
  consome: z.object({ campos: z.array(id).min(1), poder: z.number().min(0), crescimento: positivo.default(1), maximo: positivo.optional() }).optional(),
  /** Leva junto o efeito do terreno onde quem atirou estava. */
  herdaCampo: z.boolean().default(false),
  /** Formas que acontecem onde o projétil some: ao acertar, no fim da vida, ao estourar na borda ou depois de grudar. */
  estouro: z.array(esquemaForma).default([]),
});

/** Efeitos que acontecem num ponto dado (o de `varias`, de `cadaCampo` ou de um campo que dispara). */
export const esquemaPosicionado = z.discriminatedUnion('efeito', [esquemaArea, esquemaCone, esquemaLinha, esquemaParede, esquemaProjetil]);

export const esquemaEfeito = z.discriminatedUnion('efeito', [
  /**
   * Dano na hora (corpo a corpo). `escalaHp`: o poder cresce até `ate` conforme quem usa perde HP (o máximo com 10% de HP).
   * `seEstado`: se o alvo estiver com o estado, usa esse `poder` e (com `remove`) tira o estado.
   */
  z.object({
    efeito: z.literal('dano'),
    poder: positivo,
    drena: z.number().gt(0).max(1).optional(),
    escalaHp: z.object({ ate: positivo }).optional(),
    seEstado: z.object({ estado: id, poder: positivo, remove: z.boolean().default(true) }).optional(),
  }),
  esquemaProjetil,
  esquemaArea,
  esquemaCone,
  esquemaLinha,
  esquemaParede,
  ...efeitosNoAlvo,
  /** Soma `valor` a um atributo de quem usou, por `duracao`. Um buff novo substitui o anterior. */
  z.object({ efeito: z.literal('buff'), atributo, valor: positivo, duracao }),
  /** Recupera uma porcentagem do HP máximo de quem usou. */
  z.object({ efeito: z.literal('curar'), porcento: z.number().gt(0).max(100) }),
  /**
   * Quem usou dispara em direção ao rival (para antes de encostar). O próximo efeito espera o fim.
   * `atravessa`: passa por dentro do rival e vai a distância toda; `poder`/`efeitos` acertam o rival ao passar;
   * `rastro` deixa um campo no caminho; `estado` vale em quem usa durante o avanço.
   */
  z.object({
    efeito: z.literal('avancar'),
    distancia: positivo,
    duracao,
    atravessa: z.boolean().default(false),
    poder: z.number().min(0).default(0),
    efeitos: z.array(esquemaEfeitoNoAlvo).default([]),
    rastro: z.object({ campo: id, largura: positivo, duracao }).optional(),
    estado: id.optional(),
  }),
  /** Quem usou salta para longe do rival. O próximo efeito espera o fim. */
  z.object({ efeito: z.literal('recuar'), distancia: positivo, duracao }),
  /** Quem usou some e reaparece atrás do rival (a `distancia` dele, do outro lado) ou em cima dele. */
  z.object({
    efeito: z.literal('teleporte'),
    para: z.enum(['atras-do-rival', 'no-rival']),
    distancia: z.number().min(0).default(0),
    rastro: z.object({ campo: id, largura: positivo, duracao }).optional(),
  }),
  /** O golpe continua em andamento por `duracao` (vale o `durante`). */
  z.object({ efeito: z.literal('esperar'), duracao }),
  /** Várias formas ou projéteis, um a cada `intervalo`, nos pontos da `disposicao`. */
  z.object({
    efeito: z.literal('varias'),
    quantidade: z.number().int().positive(),
    disposicao: z.enum(['linha-ate-rival', 'em-volta-do-rival', 'sorteio-no-rival', 'entre', 'em-volta-de-si']),
    /** Raio da volta ou do sorteio. */
    distancia: z.number().min(0).default(0),
    intervalo: z.number().min(0).default(0),
    faz: esquemaPosicionado,
  }),
  /** Para cada campo `campo` de quem usou: faz os efeitos no ponto dele (e com `apaga`, o campo some). Sem nenhum, faz `senao` em si. */
  z.object({
    efeito: z.literal('cada-campo'),
    campo: id,
    faz: z.array(esquemaPosicionado).min(1),
    apaga: z.boolean().default(false),
    senao: z.array(esquemaPosicionado).default([]),
  }),
  /**
   * Objeto na arena: `pilar` (bloqueia passagem e projéteis), `portais` (um em quem usa e outro perto do rival),
   * `copia` (cópia falsa: cada golpe do rival tem `chance` de mirar nela) ou `pino` (os golpes do tipo de quem usou
   * também saltam para quem estiver a até `raio` dele).
   */
  z.object({
    efeito: z.literal('objeto'),
    objeto: z.enum(['pilar', 'portais', 'copia', 'pino']),
    centro: z.enum(['meio', 'rival', 'si']).default('meio'),
    distancia: z.number().min(0).default(0),
    raio: positivo,
    duracao,
    chance,
    /** Tipos de golpe que destroem o objeto ao atingi-lo. */
    destruidoPor: z.array(id).default([]),
  }),
  /** Usa o último golpe que o rival usou. */
  z.object({ efeito: z.literal('copiar') }),
]);

const FORMAS = new Set(['area', 'cone', 'linha', 'parede']);
const NO_ALVO = new Set([
  'dano',
  'projetil',
  ...FORMAS,
  'teleporte',
  'varias',
  'objeto',
  'copiar',
  ...efeitosNoAlvo.map((e) => e.shape.efeito.value),
]);

export const esquemaGolpe = z
  .object({
    nome: z.string().min(1),
    tipo: id,
    categoria: id.optional(),
    /** Segundos até poder usar de novo, contados do fim do golpe (fim da conjuração e da canalização). */
    recarga: positivo,
    /** Distância máxima até o rival para usar o golpe. Obrigatório quando algum efeito atinge o rival. */
    alcance: positivo.optional(),
    /** Segundos concentrando antes dos efeitos. Levar atordoamento ou empurrão interrompe. */
    conjuracao: z.number().min(0).default(0),
    /** Como quem usa se move durante a conjuração e a canalização: parado, lento (`regras.golpeLento`) ou livre. */
    durante: z.enum(['parado', 'lento', 'livre']).default('parado'),
    efeitos: z.array(esquemaEfeito).min(1),
    animacao: z.string().optional(),
  })
  .superRefine((g, ctx) => {
    const noAlvo = g.efeitos.some((e) => NO_ALVO.has(e.efeito) && !(e.efeito === 'estado' && e.em === 'si'));
    if (g.alcance === undefined && noAlvo) {
      ctx.addIssue({ code: 'custom', path: ['alcance'], message: 'golpe que atinge o rival precisa de alcance' });
    }
    g.efeitos.forEach((e, i) => {
      if (FORMAS.has(e.efeito) && 'pulso' in e && e.pulso !== undefined && e.duracao === undefined) {
        ctx.addIssue({ code: 'custom', path: ['efeitos', i], message: 'pulso sem duração' });
      }
    });
  });

// ---------- Estados (estados.json) ----------
// Um estado é um conjunto de mudanças que valem enquanto ele dura. Cada campo é uma peça do motor.

const porTipo = z.record(z.string(), positivo);

export const esquemaEstado = z.object({
  nome: z.string().min(1),
  /** O que deixa de fazer: andar, agir (usar golpes) ou os dois. Travar a ação corta o golpe em andamento. */
  trava: z.enum(['movimento', 'acao', 'tudo']).optional(),
  /** Multiplica a velocidade. */
  velocidade: z.number().min(0).optional(),
  /** Multiplica o ataque e a defesa. */
  atributos: z.object({ ataque: positivo.optional(), defesa: positivo.optional() }).optional(),
  /** Multiplica o dano recebido de golpes de cada tipo ("*" = todos). */
  danoRecebido: porTipo.optional(),
  /** Multiplica o dano causado com golpes de cada tipo ("*" = todos). */
  danoCausado: porTipo.optional(),
  /** Golpes de `tipo` causam `andando`× em alvo que se move e `parado`× em alvo parado. */
  danoPorMovimento: z.object({ tipo: id, andando: positivo, parado: positivo }).optional(),
  /** Ritmo das recargas e da conjuração (0,7 = 30% mais devagar). */
  recarga: positivo.optional(),
  conjuracao: positivo.optional(),
  /** Os projéteis que a criatura dispara saem com um desvio sorteado de até tantos graus. */
  desvio: z.number().min(0).optional(),
  /** Multiplica os empurrões e puxões recebidos (0 = imune, 2 = dobrados). */
  empurrao: z.number().min(0).optional(),
  /** Não consegue ficar parada: quando pararia, segue à deriva. */
  inquieto: z.boolean().optional(),
  /** Não pode ser atingida; com `atingivelPor`, só as áreas em volta de si desses tipos a atingem. */
  intangivel: z.boolean().optional(),
  atingivelPor: z.array(id).optional(),
  /** Multiplica o raio do corpo; `areaPerto` multiplica as áreas em volta de si e o alcance do corpo a corpo. */
  tamanho: positivo.optional(),
  areaPerto: positivo.optional(),
  /** HP recuperado por segundo; com `soEmCampo`, só em cima desse campo; com `soTipos`, só criaturas desses tipos. */
  curaPorSegundo: positivo.optional(),
  soEmCampo: id.optional(),
  soTipos: z.array(id).optional(),
  impedeCura: z.boolean().optional(),
  /** Tira e impede danos contínuos com estes nomes (ex.: "queimadura"). */
  protege: z.array(z.string().min(1)).optional(),
  /** Projéteis que chegam a `raio` além do corpo viram `graus`. */
  desviaProjeteis: z.object({ graus: z.number(), raio: z.number().min(0) }).optional(),
  /** Projéteis que acertam voltam para quem atirou. */
  refleteProjeteis: z.boolean().optional(),
  /** Escorrega: quanto da velocidade desejada entra a cada passo (1 = normal, 0,05 = quase só desliza). */
  aderencia: z.number().gt(0).max(1).optional(),
  /** Cargas por distância andada (até `maximo`); o próximo golpe de `tipo` ganha `bonus` por carga e gasta o estado. */
  cargas: z.object({ distancia: positivo, maximo: z.number().int().positive(), bonus: positivo, tipo: id }).optional(),
  /** Caçada: anda `velocidade`× mais rápido em direção ao alvo do golpe e ganha `alcance` contra ele. */
  cacada: z.object({ velocidade: positivo, alcance: z.number().min(0) }).optional(),
  /** Tipo cujos efeitos especiais aparecem em volta de quem está com o estado (só visual). */
  fx: id.optional(),
});

// ---------- Campos (campos.json): terrenos e névoas ----------

/**
 * Terreno (no chão) ou névoa (no ar) de um elemento. Afeta quem está dentro, menos os tipos `imunes`
 * (com `afeta: "rival"`, só o rival de quem criou). Golpes criam campos com `deixa` e `rastro`.
 */
export const esquemaCampo = z.object({
  nome: z.string().min(1),
  camada: z.enum(['terreno', 'nevoa']),
  tipo: id,
  imunes: z.array(id).default([]),
  afeta: z.enum(['todos', 'rival']).default('todos'),
  /** A cada `pulso`, quem está dentro leva `poder` de dano e os `efeitos`. */
  pulso: positivo.optional(),
  poder: z.number().min(0).default(0),
  efeitos: z.array(esquemaEfeitoNoAlvo).default([]),
  /** Ao entrar: dano e efeitos uma vez por entrada. */
  aoEntrar: z.object({ poder: z.number().min(0).default(0), efeitos: z.array(esquemaEfeitoNoAlvo).default([]) }).optional(),
  /** Some no primeiro que entrar (mina, flor carnívora). */
  consome: z.boolean().default(false),
  /** Estado (de `estados.json`) de quem está dentro; `dono` é o estado de quem criou, quando está dentro. */
  estado: id.optional(),
  dono: id.optional(),
  /** Estado de quem é imune e está dentro (os esporos curam a Natureza sem feri-la). */
  estadoImunes: id.optional(),
  /** Quem fica `segundos` seguidos dentro leva os `efeitos` (e a conta recomeça). */
  permanencia: z.object({ segundos: positivo, efeitos: z.array(esquemaEfeitoNoAlvo).min(1) }).optional(),
  /** Projéteis que passam por dentro: `dano` multiplica o dano (uma vez), `desvio` vira até tantos graus, `atrai` curva para o centro (graus/s), `tempo` multiplica a velocidade. */
  projeteis: z
    .object({ dano: z.number().min(0).optional(), desvio: z.number().min(0).optional(), atrai: z.number().min(0).optional(), tempo: positivo.optional() })
    .optional(),
  /** Empurra quem está dentro: `lado` ao longo do comprimento da faixa, `frente` na direção dela (unidades/s). */
  empuxo: z.object({ lado: z.number().optional(), frente: z.number().optional() }).optional(),
  /** Rampa: quem anda no sentido do campo vai `rampa`× mais rápido; contra o sentido, escorrega de volta. */
  rampa: positivo.optional(),
  /** Ritmo do tempo dos outros campos com o centro aqui dentro. */
  tempo: positivo.optional(),
  /** Apaga o que entra nele enquanto dura. */
  apaga: esquemaApaga.optional(),
  /** Dispara um projétil no rival de quem criou a cada `intervalo`. */
  dispara: z.object({ intervalo: positivo, projetil: esquemaProjetil }).optional(),
  /** Detona quando um golpe do `tipo` acerta o campo: todos dentro levam `poder` e `efeitos`, e o campo some. */
  detona: z.object({ tipo: id, poder: z.number().min(0), efeitos: z.array(esquemaEfeitoNoAlvo).default([]) }).optional(),
});

export const esquemaEspecie = z.object({
  nome: z.string().min(1),
  tipos: z.array(id).min(1),
  hp: positivo,
  ataque: positivo,
  defesa: positivo,
  velocidade: positivo,
  /** Raio do corpo, para golpes e projéteis acertarem. Sem ele, vale `regras.raioCriatura`. */
  raio: positivo.optional(),
  golpes: z.array(id).min(1),
});

export const esquemaPiloto = z.enum(['jogador', 'ia']);

/** Membro do time: só o id da espécie (usa os golpes dela) ou a espécie com golpes escolhidos. */
export const esquemaMembro = z.union([id, z.object({ especie: id, golpes: z.array(id).min(1).optional() })]);

const esquemaEquipe = z.object({ piloto: esquemaPiloto, time: z.array(esquemaMembro).min(1) });

export const esquemaBatalha = z.object({
  nome: z.string().min(1),
  equipes: z.tuple([esquemaEquipe, esquemaEquipe]),
});

const ponto = z.object({ x: z.number(), y: z.number() });

export const esquemaRegras = z.object({
  maxGolpes: z.number().int().positive(),
  dano: z.object({
    divisor: positivo,
    multiplicador: positivo,
    ajuste: positivo,
    aleatorioMin: positivo,
    aleatorioMax: positivo,
    minimo: z.number().min(0),
    stab: positivo,
  }),
  /** Pausa depois de cada golpe antes do próximo: depois de um ataque, de um golpe sem alvo e ao entrar em campo. */
  recargaGlobal: z.object({ ataque: z.number().min(0), buff: z.number().min(0), aoEntrar: z.number().min(0) }),
  /** Multiplica a recarga de todos os golpes (1 = a do próprio golpe): o ritmo do pacote. */
  recargaGolpes: positivo.default(1),
  /** Mostra o nome do golpe sobre as duas criaturas (sem isso, só sobre o rival, como na Arena original). */
  anunciarGolpes: z.boolean().default(false),
  troca: z.object({ duracao: z.number().min(0), espera: z.number().min(0) }),
  entrada: z.number().min(0),
  substituicao: z.number().min(0),
  projetil: z.object({
    velocidade: positivo,
    /** Distância do centro do rival em que o projétil `guiado` acerta. */
    raioAcerto: positivo,
    /** Valores padrão dos projéteis que podem errar: raio, segundos de vida e curva (graus/s) de `persegue`. */
    raio: positivo,
    vida: positivo,
    curva: positivo,
  }),
  /** Raio do corpo das criaturas que não definem o próprio. */
  raioCriatura: positivo,
  /** Fator de velocidade de quem usa um golpe com `durante: "lento"`. */
  golpeLento: z.number().gt(0).max(1),
  arena: z.object({
    xMin: z.number(),
    xMax: z.number(),
    yMin: z.number(),
    yMax: z.number(),
    inicio: z.tuple([ponto, ponto]),
  }),
  taticas: z.object({
    perseguir: z.object({ longe: positivo, perto: positivo }),
    manter: z.object({ distancia: positivo, folga: positivo, fator: positivo }),
    evasivo: z.object({ fator: positivo, frequencia: positivo, ondulacao: z.number().min(0) }),
  }),
  /** Avanços e puxões param a esta distância do rival, para as criaturas não se sobreporem. */
  distanciaMinima: z.number().min(0),
  ia: z.object({
    hpEsquiva: z.number().min(0),
    hpBuff: z.number().min(0),
    esperaFila: z.number().min(0),
    /** Usa golpe de cura abaixo desta fração do HP. */
    hpCura: z.number().min(0),
    /** Usa golpe de recuo quando o rival chega mais perto que isto (e está esquivando). */
    distanciaFuga: z.number().min(0),
  }),
  dificuldades: dicionario(z.object({ ataque: positivo, hp: positivo })),
});

export const esquemaConteudo = z
  .object({
    tipos: dicionario(esquemaTipo),
    categorias: dicionario(esquemaCategoria),
    golpes: dicionario(esquemaGolpe),
    especies: dicionario(esquemaEspecie),
    batalhas: dicionario(esquemaBatalha),
    regras: esquemaRegras,
    estados: dicionario(esquemaEstado).default({}),
    campos: dicionario(esquemaCampo).default({}),
    /** Sprite de cada espécie. Espécie sem sprite aparece como um substituto redondo na cor do tipo. */
    sprites: dicionario(esquemaSprite).default({}),
  })
  .superRefine((c, ctx) => {
    const falta = (path: (string | number)[], oQue: string, valor: string) =>
      ctx.addIssue({ code: 'custom', path, message: `${oQue} "${valor}" não existe` });

    for (const [tid, tipo] of Object.entries(c.tipos)) {
      for (const alvo of Object.keys(tipo.eficacia)) {
        if (!c.tipos[alvo]) falta(['tipos', tid, 'eficacia', alvo], 'tipo', alvo);
      }
    }
    for (const [gid, golpe] of Object.entries(c.golpes)) {
      if (!c.tipos[golpe.tipo]) falta(['golpes', gid, 'tipo'], 'tipo', golpe.tipo);
      if (golpe.categoria && !c.categorias[golpe.categoria]) {
        falta(['golpes', gid, 'categoria'], 'categoria', golpe.categoria);
      }
    }
    for (const [eid, especie] of Object.entries(c.especies)) {
      especie.tipos.forEach((t, i) => {
        if (!c.tipos[t]) falta(['especies', eid, 'tipos', i], 'tipo', t);
      });
      especie.golpes.forEach((g, i) => {
        if (!c.golpes[g]) falta(['especies', eid, 'golpes', i], 'golpe', g);
      });
      if (especie.golpes.length > c.regras.maxGolpes) {
        ctx.addIssue({
          code: 'custom',
          path: ['especies', eid, 'golpes'],
          message: `tem ${especie.golpes.length} golpes; o máximo é ${c.regras.maxGolpes} (regras.maxGolpes)`,
        });
      }
    }
    for (const [tid, tipo] of Object.entries(c.tipos)) {
      for (const k of ['terreno', 'nevoa'] as const) {
        const v = tipo[k];
        if (v && !c.campos[v]) falta(['tipos', tid, k], 'campo', v);
      }
    }
    const conferir = (raiz: string, item: unknown) =>
      percorrer(item, [raiz], (chave, valor, caminho) => {
        const um = (ok: boolean, oQue: string, v: string) => ok || falta(caminho, oQue, v);
        if (typeof valor === 'string') {
          if (chave === 'estado' || chave === 'dono' || chave === 'estadoImunes') um(!!c.estados[valor], 'estado', valor);
          if (chave === 'campo' || chave === 'converteEm' || chave === 'soEmCampo') um(!!c.campos[valor], 'campo', valor);
          if (chave === 'tipo' || (chave === 'fx' && raiz.startsWith('estados'))) um(!!c.tipos[valor], 'tipo', valor);
        }
        if (Array.isArray(valor) && valor.every((v) => typeof v === 'string')) {
          if (['imunes', 'tipos', 'atingivelPor', 'soTipos', 'destruidoPor'].includes(chave)) valor.forEach((v) => um(!!c.tipos[v], 'tipo', v));
          if (chave === 'campos') valor.forEach((v) => um(!!c.campos[v], 'campo', v));
        }
        if ((chave === 'danoRecebido' || chave === 'danoCausado') && valor && typeof valor === 'object') {
          Object.keys(valor).forEach((v) => um(v === '*' || !!c.tipos[v], 'tipo', v));
        }
      });
    for (const [gid, g] of Object.entries(c.golpes)) conferir(`golpes.${gid}`, g.efeitos);
    for (const [cid, campo] of Object.entries(c.campos)) {
      conferir(`campos.${cid}`, { ...campo, tipo: undefined });
      if (!c.tipos[campo.tipo]) falta(['campos', cid, 'tipo'], 'tipo', campo.tipo);
    }
    for (const [sid, estado] of Object.entries(c.estados)) conferir(`estados.${sid}`, estado);
    for (const eid of Object.keys(c.sprites)) {
      if (!c.especies[eid]) falta(['sprites', eid], 'espécie', eid);
    }
    for (const [bid, batalha] of Object.entries(c.batalhas)) {
      batalha.equipes.forEach((eq, e) =>
        eq.time.forEach((membro, i) => {
          const caminho = ['batalhas', bid, 'equipes', e, 'time', i];
          const esp = typeof membro === 'string' ? membro : membro.especie;
          if (!c.especies[esp]) falta(caminho, 'espécie', esp);
          if (typeof membro === 'string' || !membro.golpes) return;
          membro.golpes.forEach((g, k) => {
            if (!c.golpes[g]) falta([...caminho, 'golpes', k], 'golpe', g);
          });
          if (membro.golpes.length > c.regras.maxGolpes) {
            ctx.addIssue({ code: 'custom', path: [...caminho, 'golpes'], message: `tem ${membro.golpes.length} golpes; o máximo é ${c.regras.maxGolpes} (regras.maxGolpes)` });
          }
        }),
      );
    }
  });

/** Visita cada par chave/valor de um objeto (e dos objetos e listas dentro dele). */
function percorrer(valor: unknown, caminho: (string | number)[], visitar: (chave: string, valor: unknown, caminho: (string | number)[]) => void): void {
  if (Array.isArray(valor)) {
    valor.forEach((v, i) => percorrer(v, [...caminho, i], visitar));
  } else if (valor && typeof valor === 'object') {
    for (const [k, v] of Object.entries(valor)) {
      visitar(k, v, [...caminho, k]);
      percorrer(v, [...caminho, k], visitar);
    }
  }
}

export type Conteudo = z.infer<typeof esquemaConteudo>;
export type Tipo = z.infer<typeof esquemaTipo>;
export type Golpe = z.infer<typeof esquemaGolpe>;
export type Efeito = z.infer<typeof esquemaEfeito>;
export type EfeitoNoAlvo = z.infer<typeof esquemaEfeitoNoAlvo>;
export type EfeitoForma = z.infer<typeof esquemaForma>;
export type EfeitoProjetil = z.infer<typeof esquemaProjetil>;
export type EfeitoPosicionado = z.infer<typeof esquemaPosicionado>;
export type Estado = z.infer<typeof esquemaEstado>;
export type EstiloFx = (typeof ESTILOS_FX)[number];
export type Campo = z.infer<typeof esquemaCampo>;
export type Trajetoria = z.infer<typeof esquemaTrajetoria>;
export type Membro = z.infer<typeof esquemaMembro>;
export type Especie = z.infer<typeof esquemaEspecie>;
export type Regras = z.infer<typeof esquemaRegras>;
export type Sprite = z.infer<typeof esquemaSprite>;
export type Piloto = z.infer<typeof esquemaPiloto>;

/** Valida um pacote cru. Lança um erro com uma linha por problema, no formato `caminho: mensagem`. */
export function carregarConteudo(bruto: unknown): Conteudo {
  const r = esquemaConteudo.safeParse(bruto);
  if (r.success) return r.data;
  throw new Error(`Conteúdo inválido:\n${formatar(r.error.issues as unknown as Problema[]).join('\n')}`);
}

interface Problema {
  path: PropertyKey[];
  message: string;
  issues?: Problema[];
}

// Erros em chaves de dicionário vêm aninhados ("Invalid key in record"); mostra a mensagem de dentro.
function formatar(issues: readonly Problema[], prefixo: PropertyKey[] = []): string[] {
  return issues.flatMap((i) => {
    const caminho = [...prefixo, ...i.path];
    if (i.issues?.length) return formatar(i.issues, caminho);
    return [`${caminho.map(String).join('.') || '(raiz)'}: ${i.message}`];
  });
}
