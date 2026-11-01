// Formato de um pacote de conteúdo (pasta `conteudo/<pacote>/`).
// Cada arquivo é um dicionário por id; este esquema valida os campos
// e confere se toda referência (tipo, golpe, espécie…) existe.

import { z } from 'zod';

const id = z.string().regex(/^[a-z0-9-]+$/, 'use só letras minúsculas sem acento, números e hífen');
const cor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'use uma cor no formato #rrggbb');
const positivo = z.number().positive();
const dicionario = <T extends z.ZodType>(item: T) => z.record(id, item);

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
// Distâncias em unidades da arena (o chão tem 320 × 130); tempos em segundos.

const atributo = z.enum(['ataque', 'defesa', 'velocidade']);
const duracao = positivo;

/** Efeitos que atingem o rival. Num golpe direto, exigem o rival ao alcance na hora em que acontecem. */
const efeitosNoAlvo = [
  z.object({ efeito: z.literal('empurrar'), distancia: positivo, duracao: duracao.default(0.2) }),
  z.object({ efeito: z.literal('puxar'), distancia: positivo, duracao: duracao.default(0.2) }),
  z.object({ efeito: z.literal('lentidao'), fator: z.number().gt(0).lt(1), duracao }),
  z.object({ efeito: z.literal('prender'), duracao }),
  z.object({ efeito: z.literal('atordoar'), duracao }),
  z.object({ efeito: z.literal('dano-continuo'), porSegundo: positivo, duracao }),
  z.object({ efeito: z.literal('debuff'), atributo, valor: positivo, duracao }),
] as const;

export const esquemaEfeitoNoAlvo = z.discriminatedUnion('efeito', [...efeitosNoAlvo]);

export const esquemaEfeito = z.discriminatedUnion('efeito', [
  /** Dano na hora (corpo a corpo). */
  z.object({ efeito: z.literal('dano'), poder: positivo }),
  /** Projétil que persegue o rival; ao acertar causa `poder` de dano e aplica `efeitos`. */
  z.object({
    efeito: z.literal('projetil'),
    poder: z.number().min(0),
    velocidade: positivo.optional(),
    efeitos: z.array(esquemaEfeitoNoAlvo).default([]),
  }),
  ...efeitosNoAlvo,
  /** Soma `valor` a um atributo de quem usou, por `duracao`. Um buff novo substitui o anterior. */
  z.object({ efeito: z.literal('buff'), atributo, valor: positivo, duracao }),
  /** Recupera uma porcentagem do HP máximo de quem usou. */
  z.object({ efeito: z.literal('curar'), porcento: z.number().gt(0).max(100) }),
  /** Quem usou dispara em direção ao rival (para antes de encostar). O próximo efeito espera o fim. */
  z.object({ efeito: z.literal('avancar'), distancia: positivo, duracao }),
  /** Quem usou salta para longe do rival. O próximo efeito espera o fim. */
  z.object({ efeito: z.literal('recuar'), distancia: positivo, duracao }),
]);

const NO_ALVO = new Set(['dano', 'projetil', ...efeitosNoAlvo.map((e) => e.shape.efeito.value)]);

export const esquemaGolpe = z
  .object({
    nome: z.string().min(1),
    tipo: id,
    categoria: id.optional(),
    recarga: positivo,
    /** Distância máxima até o rival para usar o golpe. Obrigatório quando algum efeito atinge o rival. */
    alcance: positivo.optional(),
    /** Segundos parado concentrando antes dos efeitos. Levar atordoamento ou empurrão interrompe. */
    conjuracao: z.number().min(0).default(0),
    efeitos: z.array(esquemaEfeito).min(1),
    animacao: z.string().optional(),
  })
  .refine((g) => g.alcance !== undefined || !g.efeitos.some((e) => NO_ALVO.has(e.efeito)), {
    message: 'golpe que atinge o rival precisa de alcance',
    path: ['alcance'],
  });

export const esquemaEspecie = z.object({
  nome: z.string().min(1),
  tipos: z.array(id).min(1),
  hp: positivo,
  ataque: positivo,
  defesa: positivo,
  velocidade: positivo,
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
  recargaGlobal: z.object({ ataque: z.number().min(0), buff: z.number().min(0), aoEntrar: z.number().min(0) }),
  troca: z.object({ duracao: z.number().min(0), espera: z.number().min(0) }),
  entrada: z.number().min(0),
  substituicao: z.number().min(0),
  projetil: z.object({ velocidade: positivo, raioAcerto: positivo }),
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

export type Conteudo = z.infer<typeof esquemaConteudo>;
export type Tipo = z.infer<typeof esquemaTipo>;
export type Golpe = z.infer<typeof esquemaGolpe>;
export type Efeito = z.infer<typeof esquemaEfeito>;
export type EfeitoNoAlvo = z.infer<typeof esquemaEfeitoNoAlvo>;
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
