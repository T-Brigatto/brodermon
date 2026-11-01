// Projéteis: o guiado da Arena (persegue sem limite e sempre acerta) e os que podem errar
// (reto, persegue, quica), com estouro, grudar, bumerangue, aura, consumir campos, herdar
// terreno, e o que os campos, objetos e estados fazem com eles no caminho.

import type { Conteudo, EfeitoProjetil } from '../conteudo/esquema';
import { sortear } from './aleatorio';
import { aplicarCarga, atingivel, rivalEmCampo } from './combate';
import { ativo, distancia, golpeDe, lutadorPorUid, raioDe } from './consulta';
import { EPS, ESPERA_PORTAL, MARGEM_PROJETIL, PASSO } from './constantes';
import { colocarForma, ritmoProjetil } from './campo';
import { dentroDe, mods, raioCorpo } from './estados';
import type { EstadoBatalha, Evento, Lutador, Ponto, Projetil } from './modelo';

function novo(p: Pick<Projetil, 'x' | 'y' | 'vx' | 'vy' | 'alvo' | 'autor' | 'golpe' | 'def' | 'vida'> & Partial<Projetil>): Projetil {
  return {
    acertos: 0,
    tocando: false,
    quicou: 0,
    grudado: null,
    gruda: 0,
    percorrido: 0,
    voltando: false,
    poderExtra: 0,
    escala: 1,
    multiplicador: 1,
    campos: [],
    herda: null,
    aura: p.def.aura?.pulso ?? 0,
    desviado: false,
    portalEspera: 0,
    ...p,
  };
}

/** O projétil guiado da Arena: sai 6 à frente de quem atira, na direção para onde olha. */
export function lancarGuiado(b: EstadoBatalha, l: Lutador, alvo: Lutador, golpe: string, ef: EfeitoProjetil, ev: Evento[]): void {
  b.projeteis.push(novo({ x: l.x + l.olhando * 6, y: l.y, vx: 0, vy: 0, alvo: alvo.uid, autor: l.uid, golpe, def: ef, vida: null }));
  ev.push({ tipo: 'projetil', autor: l.uid, alvo: alvo.uid, golpe });
}

/**
 * Solta os projéteis que podem errar a partir de `origem`: na direção do rival (ou de `mira`, quando o golpe foi
 * enganado por uma cópia), abertos em leque. Quem atira com cegueira erra a direção por um desvio sorteado.
 */
export function lancarDe(
  b: EstadoBatalha,
  c: Conteudo,
  autor: Lutador,
  golpe: string,
  ef: EfeitoProjetil,
  origem: Ponto,
  ev: Evento[],
  op: { alvo?: Lutador | null; mira?: Ponto | null; alvoUid?: number; bonus?: number; herda?: string | null } = {},
): void {
  const R = c.regras;
  const rival = op.alvo !== undefined ? op.alvo : rivalEmCampo(b, autor.equipe);
  const para = op.mira ?? rival;
  let ux = autor.olhando as number;
  let uy = 0;
  if (para) {
    const d = distancia(origem, para);
    if (d > 0.001) {
      ux = (para.x - origem.x) / d;
      uy = (para.y - origem.y) / d;
    }
  }
  let base = Math.atan2(uy, ux);
  if (autor.condicoes.some((cd) => cd.tipo === 'estado')) {
    const desvio = mods(b, c, autor).desvio;
    if (desvio > 0) base += (sortear(b.rng) * 2 - 1) * ((desvio * Math.PI) / 180);
  }
  const v = ef.velocidade ?? R.projetil.velocidade;
  const vida = ef.vida ?? R.projetil.vida;
  const alvo = rival?.uid ?? op.alvoUid ?? ativo(b, autor.equipe === 0 ? 1 : 0).uid;
  const abertura = ef.quantidade > 1 ? (ef.abertura * Math.PI) / 180 / (ef.quantidade - 1) : 0;
  for (let i = 0; i < ef.quantidade; i++) {
    const ang = base + (i - (ef.quantidade - 1) / 2) * abertura;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    b.projeteis.push(
      novo({ x: origem.x + dx * 6, y: origem.y + dy * 6, vx: dx * v, vy: dy * v, alvo, autor: autor.uid, golpe, def: ef, vida, multiplicador: op.bonus ?? 1, herda: op.herda ?? null }),
    );
    ev.push({ tipo: 'projetil', autor: autor.uid, alvo, golpe });
  }
}

export function moverProjeteis(b: EstadoBatalha, c: Conteudo, ev: Evento[]): void {
  const R = c.regras;
  for (let i = b.projeteis.length - 1; i >= 0; i--) {
    const p = b.projeteis[i]!;
    const ef = p.def;
    if (ef.trajetoria !== 'guiado') {
      if (!moverLivre(b, c, p, ev)) {
        const k = b.projeteis.indexOf(p);
        if (k >= 0) b.projeteis.splice(k, 1);
      }
      continue;
    }
    const alvo = lutadorPorUid(b, p.alvo);
    const emCampo = ativo(b, alvo.equipe) === alvo && !alvo.desmaiado && !b.equipes[alvo.equipe].troca;
    if (!emCampo) {
      b.projeteis.splice(i, 1);
      ev.push({ tipo: 'projetilPerdido', x: p.x, y: p.y, golpe: p.golpe });
      continue;
    }
    const dx = alvo.x - p.x;
    const dy = alvo.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < R.projetil.raioAcerto) {
      b.projeteis.splice(i, 1);
      aplicarCarga(b, c, alvo, lutadorPorUid(b, p.autor), p.golpe, ef, 'projetil', ev, p.multiplicador);
    } else {
      const k = Math.min(1, ((ef.velocidade ?? R.projetil.velocidade) * PASSO) / d);
      p.x += dx * k;
      p.y += dy * k;
    }
  }
}

/** Vira a velocidade do projétil em direção a `para`, no máximo `graus` por segundo. */
function virar(p: Projetil, para: Ponto, graus: number): void {
  const atual = Math.atan2(p.vy, p.vx);
  let giro = Math.atan2(para.y - p.y, para.x - p.x) - atual;
  giro = Math.atan2(Math.sin(giro), Math.cos(giro));
  const max = ((graus * Math.PI) / 180) * PASSO;
  girar(p, Math.max(-max, Math.min(max, giro)));
}

function girar(p: Projetil, ang: number): void {
  const a = Math.atan2(p.vy, p.vx) + ang;
  const v = Math.hypot(p.vx, p.vy);
  p.vx = Math.cos(a) * v;
  p.vy = Math.sin(a) * v;
}

/** Onde o projétil some: as formas do estouro acontecem ali. */
function estourar(b: EstadoBatalha, c: Conteudo, p: Projetil, ev: Evento[], perdido: boolean): void {
  const v = Math.hypot(p.vx, p.vy);
  const ux = v > 0.001 ? p.vx / v : 1;
  const uy = v > 0.001 ? p.vy / v : 0;
  const autor = lutadorPorUid(b, p.autor);
  for (const f of p.def.estouro) colocarForma(b, c, autor, p.golpe, f, { x: p.x, y: p.y, ux, uy }, ev, { bonus: p.multiplicador });
  if (perdido) ev.push({ tipo: 'projetilPerdido', x: p.x, y: p.y, golpe: p.golpe });
}

/**
 * Um passo de um projétil que pode errar. Devolve false quando ele some.
 * Ordem: grudado → curvas (persegue, volta, campos que atraem) → anda → quica → campos no caminho →
 * objetos (pilar, portal) → esfera de ar, reflexo e acerto → aura → fim da vida.
 */
function moverLivre(b: EstadoBatalha, c: Conteudo, p: Projetil, ev: Evento[]): boolean {
  const R = c.regras;
  const A = R.arena;
  const ef = p.def;
  const autor = lutadorPorUid(b, p.autor);
  const rival = rivalEmCampo(b, autor.equipe);
  if (p.portalEspera > 0) p.portalEspera -= PASSO;

  if (p.grudado !== null) {
    const preso = lutadorPorUid(b, p.grudado);
    p.x = preso.x;
    p.y = preso.y;
    if ((p.gruda -= PASSO) <= EPS) {
      estourar(b, c, p, ev, false);
      return false;
    }
    return true;
  }

  if (p.voltando) {
    const d = distancia(p, autor);
    const v = Math.hypot(p.vx, p.vy);
    if (d > 0.001) {
      p.vx = ((autor.x - p.x) / d) * v;
      p.vy = ((autor.y - p.y) / d) * v;
    }
  } else if (ef.trajetoria === 'persegue' && rival) {
    virar(p, rival, ef.curva ?? R.projetil.curva);
  }
  for (const z of b.zonas) {
    const atrai = z.campo ? c.campos[z.campo]?.projeteis?.atrai : undefined;
    if (atrai && dentroDe(z, p)) virar(p, z, atrai);
  }

  const ritmo = b.zonas.length ? ritmoProjetil(b, c, p) : 1;
  p.x += p.vx * PASSO * ritmo;
  p.y += p.vy * PASSO * ritmo;
  p.percorrido += Math.hypot(p.vx, p.vy) * PASSO * ritmo;
  if (ef.volta && !p.voltando && p.percorrido >= ef.volta) {
    p.voltando = true;
    p.tocando = false;
  }
  if (p.voltando && distancia(p, autor) < raioDe(c, autor)) return false;

  if (ef.trajetoria === 'quica') {
    let quicou = false;
    if (p.x < A.xMin || p.x > A.xMax) {
      p.x = p.x < A.xMin ? 2 * A.xMin - p.x : 2 * A.xMax - p.x;
      p.vx = -p.vx;
      quicou = true;
    }
    if (p.y < A.yMin || p.y > A.yMax) {
      p.y = p.y < A.yMin ? 2 * A.yMin - p.y : 2 * A.yMax - p.y;
      p.vy = -p.vy;
      quicou = true;
    }
    if (quicou && ef.quicas !== undefined && ++p.quicou > ef.quicas) {
      estourar(b, c, p, ev, true);
      return false;
    }
  }
  if (p.vida !== null) p.vida -= PASSO * ritmo;

  // Campos no caminho: cada um mexe uma vez (névoa que tira dano, turbilhão que desvia, campo que alimenta).
  for (const z of [...b.zonas]) {
    if (!z.campo || p.campos.includes(z.id) || !dentroDe(z, p)) continue;
    p.campos.push(z.id);
    const pr = c.campos[z.campo]?.projeteis;
    if (pr?.dano !== undefined) p.multiplicador *= pr.dano;
    if (pr?.desvio) girar(p, (sortear(b.rng) * 2 - 1) * ((pr.desvio * Math.PI) / 180));
    if (ef.consome?.campos.includes(z.campo)) {
      b.zonas.splice(b.zonas.indexOf(z), 1);
      const teto = ef.consome.maximo !== undefined ? ef.consome.maximo - ef.poder : Infinity;
      p.poderExtra = Math.min(teto, p.poderExtra + ef.consome.poder);
      p.escala *= ef.consome.crescimento;
    }
  }

  const raio = (ef.raio ?? R.projetil.raio) * p.escala;
  for (const o of b.objetos) {
    if (o.tipo === 'pilar' && distancia(p, o) < o.raio + raio) {
      if (o.destruidoPor.includes(golpeDe(c, p.golpe).tipo)) b.objetos = b.objetos.filter((x) => x !== o);
      estourar(b, c, p, ev, true);
      return false;
    }
    if (o.tipo === 'portal' && p.portalEspera <= 0 && distancia(p, o) < o.raio) {
      const par = b.objetos.find((x) => x.id === o.par);
      if (par) {
        p.x = par.x;
        p.y = par.y;
        p.portalEspera = ESPERA_PORTAL;
        break;
      }
    }
  }

  if (rival && atingivel(b, c, rival, p.golpe)) {
    const corpo = raioCorpo(b, c, rival);
    const d = distancia(p, rival);
    const m = rival.condicoes.some((cd) => cd.tipo === 'estado') ? mods(b, c, rival) : null;
    if (m?.desvia && !p.desviado && d < corpo + raio + m.desvia.raio) {
      girar(p, (m.desvia.graus * Math.PI) / 180);
      p.desviado = true;
    }
    const encosta = distancia(p, rival) < corpo + raio;
    if (encosta && !p.tocando && p.acertos < ef.acertos) {
      if (m?.reflete) {
        // Couraça: volta para quem atirou, agora como projétil de quem foi atingido.
        p.vx = -p.vx;
        p.vy = -p.vy;
        p.autor = rival.uid;
        p.alvo = autor.uid;
        p.tocando = true;
        return true;
      }
      p.acertos++;
      const poder = ef.poder > 0 ? ef.poder + p.poderExtra : 0;
      aplicarCarga(b, c, rival, autor, p.golpe, { poder, efeitos: ef.efeitos, drena: ef.drena }, 'projetil', ev, p.multiplicador);
      const herdado = p.herda ? c.campos[p.herda] : undefined;
      if (herdado) aplicarCarga(b, c, rival, autor, p.golpe, { poder: 0, efeitos: [...herdado.efeitos, ...(herdado.aoEntrar?.efeitos ?? [])] }, 'projetil', ev);
      if (ef.gruda) {
        p.grudado = rival.uid;
        p.gruda = ef.gruda;
        return true;
      }
      if (p.acertos >= ef.acertos && !ef.atravessa) {
        estourar(b, c, p, ev, false);
        return false;
      }
    }
    p.tocando = encosta;
  }

  if (ef.aura && (p.aura -= PASSO) <= EPS) {
    p.aura += ef.aura.pulso;
    if (rival && atingivel(b, c, rival, p.golpe) && distancia(p, rival) < ef.aura.raio + raioCorpo(b, c, rival)) {
      aplicarCarga(b, c, rival, autor, p.golpe, ef.aura, 'projetil', ev, p.multiplicador);
    }
  }

  const M = MARGEM_PROJETIL;
  const fora = p.x < A.xMin - M || p.x > A.xMax + M || p.y < A.yMin - M || p.y > A.yMax + M;
  if ((p.vida !== null && p.vida <= EPS) || fora) {
    estourar(b, c, p, ev, true);
    return false;
  }
  return true;
}
