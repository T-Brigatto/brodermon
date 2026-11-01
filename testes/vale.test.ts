// Pacote "vale": os 110 golpes do guia de golpes e as peças que eles usam
// (estados, terrenos e névoas, formas que andam, objetos, projéteis especiais).

import { describe, expect, it } from 'vitest';
import { vale } from '../src/conteudo/pacotes';
import { PASSO, avancar, configDaBatalha, criarBatalha, golpeDe, perfilDoGolpe } from '../src/nucleo';
import { ate, conteudo, danos, duelo, pos, rodar } from './ajuda-vale';

describe('pacote vale', () => {
  it('tem os 11 elementos, 10 golpes de cada e a tabela de tipos do guia', () => {
    expect(Object.keys(vale.tipos)).toHaveLength(11);
    expect(Object.keys(vale.golpes)).toHaveLength(110);
    const porTipo = new Map<string, number>();
    for (const g of Object.values(vale.golpes)) porTipo.set(g.tipo, (porTipo.get(g.tipo) ?? 0) + 1);
    for (const n of porTipo.values()) expect(n).toBe(10);
    expect(vale.tipos['fogo']!.eficacia['natureza']).toBe(2);
    expect(vale.tipos['agua']!.eficacia['eletricidade']).toBe(0.5);
    expect(vale.tipos['explosao']!.eficacia).toEqual({}); // provisório: Explosão neutra
    for (const t of Object.values(vale.tipos)) expect(vale.campos[t.terreno!]).toBeDefined();
  });

  // Cada golpe, sozinho, contra um alvo parado ao alcance: sai sem erro e faz alguma coisa.
  for (const id of Object.keys(vale.golpes)) {
    it(`golpe ${id} roda e faz efeito`, () => {
      const c = conteudo();
      const g = golpeDe(c, id);
      const { b, A, B } = duelo(c, [id]);
      const alcance = g.alcance ?? 40;
      pos(B, 205, 70);
      pos(A, 205 - Math.min(alcance - 8, 60), 70);
      if (id === 'recolher') {
        // Munição: uma poça dele no chão.
        A.golpes = [{ id: 'geiser', recarga: 0 }];
        ate(b, c, () => b.zonas.some((z) => z.campo === 'poca'));
        A.golpes = [{ id, recarga: 0 }];
        A.recargaGlobal = 0;
      }
      if (id === 'espelho-arcano') B.ultimoGolpe = 'rajada';
      const estadoSi = perfilDoGolpe(g).estadoEmSi;
      if (estadoSi && c.estados[estadoSi]?.curaPorSegundo) A.hp = Math.round(A.hpMax * 0.3); // a IA só se cura com pouco HP
      const ev = ate(b, c, () => A.ultimoGolpe === id, 5);
      expect(A.ultimoGolpe, 'o golpe não foi usado').toBe(id);
      ev.push(...rodar(b, c, 4));
      const fez =
        danos(ev).some((e) => e.autor === A.uid) ||
        ev.some((e) => ['condicao', 'deslocamento', 'cura', 'projetil', 'forma', 'salto'].includes(e.tipo)) ||
        b.zonas.length > 0 ||
        b.objetos.length > 0;
      expect(fez).toBe(true);
      if (perfilDoGolpe(g).causaDano && !SEM_DANO_EM_ALVO_PARADO.has(id)) expect(danos(ev).some((e) => e.autor === A.uid), 'não causou dano').toBe(true);
    });
  }
});

/** Golpes de dano que não acertam um alvo parado sozinhos (precisam que ele ande ou de uma condição). */
const SEM_DANO_EM_ALVO_PARADO = new Set(['chamas', 'campo-minado', 'carnivora', 'muralha-de-fogo', 'cerca-eletrica', 'circulo-runico', 'selo']);

describe('batalhas do vale', () => {
  for (const id of Object.keys(vale.batalhas)) {
    it(`${id}: roda IA contra IA sem erro e de forma determinística`, () => {
      const c = conteudo();
      const jogar = () => {
        const cfg = configDaBatalha(c, id, 11);
        cfg.equipes[0].piloto = 'ia';
        const b = criarBatalha(c, cfg);
        let golpes = 0;
        for (let i = 0; i < 120 / PASSO && b.vencedor === null; i++) for (const e of avancar(b, c)) if (e.tipo === 'golpe') golpes++;
        return { b, golpes };
      };
      const um = jogar();
      expect(um.golpes).toBeGreaterThan(10);
      expect(jogar().b).toEqual(um.b);
    });
  }
});
