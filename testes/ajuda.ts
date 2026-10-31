import type { Conteudo } from '../src/conteudo/esquema';
import { prototipo } from '../src/conteudo/pacotes';
import { PASSO, avancar, configDaBatalha, criarBatalha, type Comando, type EstadoBatalha, type Evento } from '../src/nucleo';

/** Cópia do conteúdo do protótipo que o teste pode alterar à vontade. */
export const conteudo = (): Conteudo => structuredClone(prototipo);

export function batalhaTreino(semente = 1, c: Conteudo = prototipo): EstadoBatalha {
  return criarBatalha(c, configDaBatalha(c, 'treino', semente));
}

export function iaContraIa(semente = 1, c: Conteudo = prototipo): EstadoBatalha {
  const cfg = configDaBatalha(c, 'treino', semente);
  cfg.equipes[0].piloto = 'ia';
  return criarBatalha(c, cfg);
}

/** Avança `segundos` de jogo e devolve todos os eventos. Os comandos entram só no primeiro passo. */
export function rodar(b: EstadoBatalha, segundos: number, comandos: Comando[] = [], c: Conteudo = prototipo): Evento[] {
  const ev: Evento[] = [];
  const passos = Math.round(segundos / PASSO);
  for (let i = 0; i < passos; i++) ev.push(...avancar(b, c, i === 0 ? comandos : []));
  return ev;
}

/** Avança até `cond` ser verdade (ou estourar `limite` segundos). */
export function rodarAte(b: EstadoBatalha, cond: (ev: Evento[]) => boolean, limite = 120, c: Conteudo = prototipo): Evento[] {
  const todos: Evento[] = [];
  for (let i = 0; i < limite / PASSO; i++) {
    const ev = avancar(b, c);
    todos.push(...ev);
    if (cond(ev)) return todos;
  }
  throw new Error(`a condição não aconteceu em ${limite} s`);
}
