// Resumo curto de um golpe para o card ("Poder 45 · Longe", "Defesa +6 · 3s"), lido dos efeitos.

import type { Efeito, Golpe } from '../conteudo/esquema';
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
};

export function descricaoGolpe(g: Golpe): string {
  const p = perfilDoGolpe(g);
  const distancia = p.contato ? 'Perto' : 'Longe';
  if (p.causaDano) return `Poder ${p.poder} · ${distancia}`;
  if (p.buff) return `${ATRIBUTO[p.buff.atributo]} +${p.buff.valor} · ${p.buff.duracao}s`;
  if (p.cura !== null) return `Cura ${p.cura}%`;
  const controle = g.efeitos.flatMap((e) => (e.efeito === 'projetil' ? e.efeitos : [e])).find((e) => CONTROLE[e.efeito]);
  if (controle) return `${CONTROLE[controle.efeito]} · ${distancia}`;
  if (p.movimento) return p.movimento === 'avancar' ? 'Avanço' : 'Recuo';
  return g.nome;
}
