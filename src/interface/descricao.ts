// Resumo curto de um golpe para o card ("Poder 45 · Longe", "Defesa +6 · 3s", "Raízes · 5s"), lido dos efeitos.

import type { Conteudo, Efeito, Golpe } from '../conteudo/esquema';
import { perfilDoGolpe } from '../nucleo';

const ATRIBUTO = { ataque: 'Ataque', defesa: 'Defesa', velocidade: 'Velocidade' } as const;

const CONTROLE: Partial<Record<Efeito['efeito'], string>> = {
  empurrar: 'Empurra',
  puxar: 'Puxa',
  lentidao: 'Lentidão',
  prender: 'Prende',
  atordoar: 'Atordoa',
  'dano-continuo': 'Dano contínuo',
  debuff: 'Enfraquece',
  interromper: 'Interrompe',
  acorrentar: 'Acorrenta',
  atrair: 'Atrai',
};

const OBJETO = { pilar: 'Pilar', portais: 'Portais', copia: 'Cópia falsa', pino: 'Pino' } as const;

/** Campo que o golpe deixa no chão (direto, no estouro, em várias formas ou no caminho), com a duração. */
function campoDeixado(g: Golpe): { campo: string; duracao: number } | null {
  for (const e of g.efeitos) {
    const formas = e.efeito === 'varias' ? [e.faz] : e.efeito === 'projetil' ? e.estouro : [e];
    for (const f of formas) {
      if ('deixa' in f && f.deixa) return f.deixa;
      if ('rastro' in f && f.rastro) return f.rastro;
    }
  }
  return null;
}

export function descricaoGolpe(g: Golpe, c?: Conteudo): string {
  const p = perfilDoGolpe(g);
  const distancia = p.contato ? 'Perto' : 'Longe';
  if (p.causaDano) return `Poder ${p.poder} · ${distancia}`;
  if (p.buff) return `${ATRIBUTO[p.buff.atributo]} +${p.buff.valor} · ${p.buff.duracao}s`;
  if (p.cura !== null) return `Cura ${p.cura}%`;
  const campo = campoDeixado(g);
  if (campo) return `${c?.campos[campo.campo]?.nome ?? 'Campo'} · ${campo.duracao}s`;
  const estado = g.efeitos.find((e) => e.efeito === 'estado');
  if (estado?.efeito === 'estado') return `${c?.estados[estado.estado]?.nome ?? 'Estado'} · ${estado.duracao}s`;
  const objeto = g.efeitos.find((e) => e.efeito === 'objeto');
  if (objeto?.efeito === 'objeto') return `${OBJETO[objeto.objeto]} · ${objeto.duracao}s`;
  if (p.copia) return 'Copia o rival';
  if (p.usaCampo) return `Usa ${c?.campos[p.usaCampo]?.nome ?? 'campo'}`;
  const controle = g.efeitos.flatMap((e) => ('efeitos' in e ? e.efeitos : [e])).find((e) => CONTROLE[e.efeito]);
  if (controle) return `${CONTROLE[controle.efeito]} · ${distancia}`;
  if (p.movimento) return p.movimento === 'avancar' ? 'Avanço' : p.movimento === 'recuar' ? 'Recuo' : 'Teleporte';
  return g.nome;
}
