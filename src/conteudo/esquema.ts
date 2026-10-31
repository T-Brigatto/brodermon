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
});

export const esquemaCategoria = z.object({
  nome: z.string().min(1),
});

export const esquemaGolpe = z
  .object({
    nome: z.string().min(1),
    tipo: id,
    categoria: id.optional(),
    recarga: positivo,
    /** Distância máxima até o alvo, em unidades da arena. Obrigatório quando há dano. */
    alcance: positivo.optional(),
    /** Corpo a corpo: acerta na hora e a criatura anda até o alvo quando o golpe está na fila. */
    contato: z.boolean().default(false),
    dano: z.object({ poder: positivo }).optional(),
    buff: z
      .object({ atributo: z.enum(['ataque', 'defesa']), valor: z.number(), duracao: positivo })
      .optional(),
    animacao: z.string().optional(),
  })
  .refine((g) => g.dano || g.buff, { message: 'o golpe precisa de dano, buff ou os dois' })
  .refine((g) => !g.dano || g.alcance !== undefined, {
    message: 'golpe com dano precisa de alcance',
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

export const esquemaBatalha = z.object({
  nome: z.string().min(1),
  equipes: z.tuple([
    z.object({ piloto: esquemaPiloto, time: z.array(id).min(1) }),
    z.object({ piloto: esquemaPiloto, time: z.array(id).min(1) }),
  ]),
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
  ia: z.object({ hpEsquiva: z.number().min(0), hpBuff: z.number().min(0), esperaFila: z.number().min(0) }),
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
    for (const [bid, batalha] of Object.entries(c.batalhas)) {
      batalha.equipes.forEach((eq, e) =>
        eq.time.forEach((esp, i) => {
          if (!c.especies[esp]) falta(['batalhas', bid, 'equipes', e, 'time', i], 'espécie', esp);
        }),
      );
    }
  });

export type Conteudo = z.infer<typeof esquemaConteudo>;
export type Tipo = z.infer<typeof esquemaTipo>;
export type Golpe = z.infer<typeof esquemaGolpe>;
export type Especie = z.infer<typeof esquemaEspecie>;
export type Regras = z.infer<typeof esquemaRegras>;
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
