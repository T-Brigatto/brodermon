// Trava de paridade: as batalhas do protótipo precisam continuar idênticas, evento a evento,
// ao que eram antes do sistema de efeitos. O arquivo de referência foi gravado com o motor antigo.
//
// Se uma mudança de regra for intencional, regrave com:  GERAR_PARIDADE=1 npx vitest run testes/paridade.test.ts

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Conteudo } from '../src/conteudo/esquema';
import { prototipo } from '../src/conteudo/pacotes';
import { PASSO, avancar, configDaBatalha, criarBatalha, type Evento } from '../src/nucleo';

const ARQUIVO = join(import.meta.dirname, 'fixtures', 'paridade.json');

/** Só os campos que existiam no motor antigo: campos novos dos eventos não entram na comparação. */
function assinatura(e: Evento): string {
  const x = e as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === 'number' ? v.toFixed(6) : String(v));
  switch (e.tipo) {
    case 'golpe': return `golpe ${x.autor} ${x.golpe} ${x.indice}`;
    case 'projetil': return `projetil ${x.autor} ${x.alvo} ${x.golpe}`;
    case 'projetilPerdido': return `perdido ${n(x.x)} ${n(x.y)} ${x.golpe}`;
    case 'dano': return `dano ${x.alvo} ${x.autor} ${x.golpe} ${x.valor} ${x.eficacia}`;
    case 'buff': return `buff ${x.lutador} ${x.atributo} ${x.valor}`;
    case 'trocaIniciada': return `troca ${x.equipe} ${x.saindo} ${x.entrando}`;
    case 'entrou': return `entrou ${x.equipe} ${x.lutador} ${x.motivo}`;
    case 'desmaio': return `desmaio ${x.lutador}`;
    case 'aguardandoEscolha': return `aguardando ${x.equipe}`;
    case 'fim': return `fim ${x.vencedor}`;
    default: return e.tipo;
  }
}

function gravarBatalha(c: Conteudo, semente: number, segundos: number) {
  const cfg = configDaBatalha(c, 'treino', semente);
  cfg.equipes[0].piloto = 'ia';
  const b = criarBatalha(c, cfg);
  const eventos: string[] = [];
  const passos = Math.round(segundos / PASSO);
  for (let i = 0; i < passos; i++) for (const e of avancar(b, c)) eventos.push(`${i} ${assinatura(e)}`);
  const final = b.equipes.flatMap((eq) =>
    eq.lutadores.map((l) => `${l.uid} hp=${l.hp} x=${l.x.toFixed(6)} y=${l.y.toFixed(6)} ${l.desmaiado ? 'KO' : 'ok'} dano=${l.danoCausado}`),
  );
  return { eventos, final };
}

function cenarios() {
  const semEsquiva = structuredClone(prototipo);
  semEsquiva.regras.ia.hpEsquiva = 0;
  return {
    'semente 3 (regras do protótipo)': gravarBatalha(prototipo, 3, 60),
    'semente 11 (sem esquiva)': gravarBatalha(semEsquiva, 11, 120),
    'semente 42 (sem esquiva)': gravarBatalha(semEsquiva, 42, 120),
  };
}

describe('paridade com o motor antigo', () => {
  if (process.env['GERAR_PARIDADE']) {
    it('grava a referência', () => {
      writeFileSync(ARQUIVO, `${JSON.stringify(cenarios(), null, 1)}\n`);
    });
    return;
  }
  const referencia = JSON.parse(readFileSync(ARQUIVO, 'utf8')) as Record<string, ReturnType<typeof gravarBatalha>>;
  const atual = cenarios();
  for (const nome of Object.keys(referencia)) {
    it(nome, () => {
      expect(atual[nome as keyof typeof atual]?.eventos).toEqual(referencia[nome]!.eventos);
      expect(atual[nome as keyof typeof atual]?.final).toEqual(referencia[nome]!.final);
    });
  }
});
