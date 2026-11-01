// Controlador da Arena: liga o núcleo (regras) ao desenho, ao som e às telas.
// O núcleo decide o que acontece; aqui só se traduz evento em reação visual
// (texto, partícula, tremor, aviso) e entrada (toque, teclado) em comando.

import type { Conteudo } from '../conteudo/esquema';
import { AR, CENARIO, VISTA, desprojetar, projetar } from '../desenho/arena';
import { spriteDe } from '../desenho/sprites';
import {
  PASSO,
  aplicarComandos,
  ativo,
  avancar,
  configDaBatalha,
  criarBatalha,
  especieDe,
  golpeDe,
  lutadorPorUid,
  type Atributo,
  type Comando,
  type Condicao,
  type EstadoBatalha,
  type Evento,
  type Lutador,
  type Projetil,
  type Tatica,
} from '../nucleo';
import { Preferencias } from '../plataforma/preferencias';
import { Som, type Efeito } from '../plataforma/som';

export type Tela = 'titulo' | 'pronto' | 'jogo' | 'pausa' | 'escolha' | 'fim';
export type Ajuda = null | 'como' | 'tipos';

export interface Opcoes {
  /** Id em `regras.dificuldades`. */
  dificuldade: string;
  /** Mostra os selos x2/x0.5/x0 nos golpes e as setas de vantagem no time. */
  assist: boolean;
  /** Multiplica o tempo de jogo. */
  velocidade: number;
  /** Semente fixa para repetir a mesma batalha (testes, comparação). */
  semente?: number;
  /** Id em `batalhas.json` (padrão: "treino"). */
  batalha?: string;
}

/** Estado só de apresentação de cada criatura; o núcleo não sabe que isto existe. */
export interface Visual {
  anim: number;
  flash: number;
  /** Avanço curto do sprite ao golpear. */
  cast: number;
  /** Clarão branco da entrada em campo. */
  entrada: number;
  /** Barra vermelha que desce devagar atrás do HP. */
  hpLag: number;
  lagT: number;
  hpVisto: number;
  /** Borda branca no card do golpe recém-usado. */
  disparo: number[];
}

export interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  cor: string;
  tam: number;
}

export interface TextoFlutuante {
  x: number;
  y: number;
  s: string;
  cor: string;
  esc: number;
  vida: number;
}

const SIGLA: Record<Atributo, string> = { ataque: 'ATQ', defesa: 'DEF', velocidade: 'VEL' };
const COR_BUFF: Record<Atributo, string> = { ataque: '#ef7d57', defesa: '#73eff7', velocidade: '#a7f070' };
const TEXTO_CONDICAO: Record<Condicao['tipo'], [string, string]> = {
  lentidao: ['LENTO', '#41a6f6'],
  preso: ['PRESO', '#a7f070'],
  atordoado: ['ATORDOADO', '#ffcd75'],
  'dano-continuo': ['FERIDO', '#ef7d57'],
  debuff: ['ENFRAQUECIDO', '#94b0c2'],
};

const DIRECOES: Record<string, 'u' | 'd' | 'l' | 'r'> = {
  ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd',
  ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r',
};

export class Jogo {
  b!: EstadoBatalha;
  tela: Tela = 'titulo';
  ajuda: Ajuda = null;
  tatica: Tatica = 'perseguir';
  readonly visuais = new Map<number, Visual>();
  particulas: Particula[] = [];
  textos: TextoFlutuante[] = [];
  readonly alturaProjetil = new Map<Projetil, number>();
  cam = { x: 200, y: 200, z: 1.35 };
  tremor = 0;
  msg = '';
  msgT = 0;
  msgCor = '#f4f4f4';
  prontoT = 0;
  caido = '';
  readonly prefs = new Preferencias();
  readonly som = new Som(() => this.prefs.mudo);

  private fimT = 0;
  private attT = 0;
  private hudT = 0;
  private acumulado = 0;
  private escolhaFeita = false;
  private segurando: { x: number; y: number } | null = null;
  private teclas = { u: false, d: false, l: false, r: false };
  private readonly ouvintes = new Set<() => void>();

  constructor(
    readonly c: Conteudo,
    readonly opcoes: Opcoes,
  ) {
    this.novaBatalha();
  }

  // ---------- consultas para a interface ----------

  eu(): Lutador {
    return ativo(this.b, 0);
  }
  rival(): Lutador {
    return ativo(this.b, 1);
  }
  visual(l: Lutador): Visual {
    return this.visuais.get(l.uid)!;
  }
  nome(l: Lutador): string {
    return especieDe(this.c, l).nome;
  }
  alturaSprite(l: Lutador): number {
    return spriteDe(this.c, l.especie).h;
  }
  /** Criatura do jogador que mais causou dano (destaque da batalha). */
  destaque(): Lutador | null {
    let melhor: Lutador | null = null;
    for (const l of this.b.equipes[0].lutadores) if (l.danoCausado > 0 && (!melhor || l.danoCausado > melhor.danoCausado)) melhor = l;
    return melhor;
  }
  get dicaVisivel(): boolean {
    return this.tela === 'jogo' && !this.prefs.dicaVista && this.b.tempo < 14;
  }

  assinar(fn: () => void): () => void {
    this.ouvintes.add(fn);
    return () => this.ouvintes.delete(fn);
  }
  private avisar(): void {
    for (const fn of this.ouvintes) fn();
  }

  // ---------- ciclo de vida ----------

  private novaBatalha(): void {
    const semente = this.opcoes.semente ?? Math.floor(Math.random() * 2 ** 31);
    const batalha = this.opcoes.batalha && this.c.batalhas[this.opcoes.batalha] ? this.opcoes.batalha : 'treino';
    this.b = criarBatalha(this.c, configDaBatalha(this.c, batalha, semente, this.opcoes.dificuldade));
    this.visuais.clear();
    for (const eq of this.b.equipes) {
      for (const l of eq.lutadores) {
        this.visuais.set(l.uid, {
          anim: l.equipe * 0.3, flash: 0, cast: 0, entrada: 0,
          hpLag: l.hp, lagT: 0, hpVisto: l.hp, disparo: l.golpes.map(() => 0),
        });
      }
    }
    this.visual(this.eu()).entrada = 0.3;
    this.visual(this.rival()).entrada = 0.3;
    this.particulas = [];
    this.textos = [];
    this.alturaProjetil.clear();
    this.tremor = 0;
    this.msg = '';
    this.msgT = 0;
    this.fimT = 0;
    this.caido = '';
    this.acumulado = 0;
    this.escolhaFeita = false;
    this.segurando = null;
    aplicarComandos(this.b, this.c, [{ tipo: 'tatica', equipe: 0, tatica: this.tatica }]);
  }

  comecar(): void {
    this.som.garantir();
    this.novaBatalha();
    this.tela = 'pronto';
    this.prontoT = 1.5;
    this.cam = { x: AR.cx, y: 195, z: 1.3 };
    this.soltarTeclas();
    this.som.tocar('ready');
    this.ajuda = null;
    this.avisar();
  }

  pausar(): void {
    if (this.tela !== 'jogo') return;
    this.tela = 'pausa';
    this.segurando = null;
    this.soltarTeclas();
    this.som.tocar('tap');
    this.avisar();
  }

  continuar(): void {
    if (this.tela !== 'pausa') return;
    this.tela = 'jogo';
    this.som.tocar('tap');
    this.ajuda = null;
    this.avisar();
  }

  irParaMenu(): void {
    this.novaBatalha();
    this.tela = 'titulo';
    this.ajuda = null;
    this.avisar();
  }

  alternarSom(): void {
    this.prefs.mudo = !this.prefs.mudo;
    this.som.garantir();
    this.som.tocar('tap');
    this.avisar();
  }

  abrirAjuda(aba: 'como' | 'tipos', comSom = true): void {
    if (comSom) this.som.tocar('tap');
    this.ajuda = aba;
    this.avisar();
  }

  fecharAjuda(): void {
    this.ajuda = null;
    this.avisar();
  }

  // ---------- comandos do jogador ----------

  private comandar(...cmds: Comando[]): void {
    this.processar(aplicarComandos(this.b, this.c, cmds));
  }

  filaGolpe(i: number): void {
    if (this.tela !== 'jogo') return;
    this.comandar({ tipo: 'proximoGolpe', equipe: 0, indice: i });
    this.som.tocar('tap');
    this.avisar();
  }

  mudarTatica(t: Tatica): void {
    if (this.tatica !== t) {
      this.tatica = t;
      this.comandar({ tipo: 'tatica', equipe: 0, tatica: t });
      this.som.tocar('tap');
    }
    this.avisar();
  }

  trocar(i: number): void {
    if (this.tela === 'escolha') {
      this.escolhaFeita = true;
      this.comandar({ tipo: 'trocar', equipe: 0, indice: i });
      if (this.b.aguardandoEscolha === null) {
        this.tela = 'jogo';
        this.segurando = null;
      }
    } else if (this.tela === 'jogo') {
      this.comandar({ tipo: 'trocar', equipe: 0, indice: i });
    }
    this.avisar();
  }

  /** Toque na arena: converte a posição na tela em ponto do chão, levando a câmera em conta. */
  tocarArena(clienteX: number, clienteY: number, caixa: DOMRect, primeiro: boolean): void {
    if (this.tela !== 'jogo' || !caixa.width) return;
    const cssX = ((clienteX - caixa.left) / caixa.width) * VISTA.largura;
    const cssY = ((clienteY - caixa.top) / caixa.height) * VISTA.altura;
    const tx = this.cam.x + (cssX - VISTA.largura / 2) / this.cam.z;
    const ty = this.cam.y + (cssY - VISTA.altura / 2) / this.cam.z;
    const A = this.c.regras.arena;
    const w = desprojetar(tx, ty + 4);
    const ponto = { x: Math.max(A.xMin, Math.min(A.xMax, w.x)), y: Math.max(A.yMin, Math.min(A.yMax, w.y)) };
    this.segurando = ponto;
    this.comandar({ tipo: 'destino', equipe: 0, ponto, fixo: true });
    if (primeiro && !this.prefs.dicaVista) this.prefs.dicaVista = true;
  }

  get tocando(): boolean {
    return this.segurando !== null;
  }

  soltarArena(): void {
    if (!this.segurando) return;
    this.comandar({ tipo: 'destino', equipe: 0, ponto: this.segurando, fixo: false });
    this.segurando = null;
  }

  private soltarTeclas(): void {
    this.teclas = { u: false, d: false, l: false, r: false };
    if (this.tela === 'jogo' || this.tela === 'pausa' || this.tela === 'escolha' || this.tela === 'fim') {
      aplicarComandos(this.b, this.c, [{ tipo: 'direcao', equipe: 0, x: 0, y: 0 }]);
    }
  }

  /** Teclado, com as mesmas regras da Arena original. */
  tecla(ev: KeyboardEvent, apertou: boolean): void {
    const k = ev.key;
    const code = ev.code;
    const dir = DIRECOES[code];
    if (dir) {
      if (this.tela === 'jogo' && !this.ajuda) {
        if (this.teclas[dir] !== apertou) {
          this.teclas[dir] = apertou;
          const t = this.teclas;
          this.comandar({ tipo: 'direcao', equipe: 0, x: (t.r ? 1 : 0) - (t.l ? 1 : 0), y: (t.d ? 1 : 0) - (t.u ? 1 : 0) });
        }
        ev.preventDefault();
      } else if (!apertou) {
        this.teclas[dir] = false;
      }
      return;
    }
    if (!apertou || ev.repeat) return;
    const noBotao = (ev.target as HTMLElement | null)?.tagName === 'BUTTON';
    if ((k === 'Enter' || code === 'Space') && noBotao) return;
    if (this.ajuda) {
      if (k === 'Escape') {
        ev.preventDefault();
        this.fecharAjuda();
      }
      return;
    }
    const n = /^Digit([1-6])$/.exec(code);
    const num = n ? Number(n[1]) : 0;
    const confirmar = k === 'Enter' || code === 'Space';
    switch (this.tela) {
      case 'titulo':
      case 'fim':
        if (confirmar) {
          ev.preventDefault();
          this.comecar();
        }
        return;
      case 'jogo':
        if (k === 'Escape' || code === 'KeyP') {
          ev.preventDefault();
          this.pausar();
        } else if (num) {
          ev.preventDefault();
          if (ev.shiftKey) this.trocar(num - 1);
          else if (num <= 4) this.filaGolpe(num - 1);
        }
        return;
      case 'pausa':
        if (k === 'Escape' || code === 'KeyP') {
          ev.preventDefault();
          this.continuar();
        }
        return;
      case 'escolha':
        if (num) {
          ev.preventDefault();
          this.trocar(num - 1);
        }
        return;
    }
  }

  // ---------- tempo ----------

  /** Um quadro de animação; `dt` em segundos reais. */
  quadro(dt: number): void {
    if (this.tela === 'jogo') {
      this.atualizar(dt * this.opcoes.velocidade);
    } else if (this.tela === 'pronto') {
      this.prontoT -= dt;
      this.efeitos(dt);
      if (this.prontoT <= 0) {
        this.tela = 'jogo';
        this.dizer(`VAI, ${this.nome(this.eu()).toUpperCase()}!`, '#a7f070');
        this.som.tocar('go');
        this.avisar();
      }
    } else if (this.tela !== 'pausa') {
      this.efeitos(dt);
    }
    if (this.tela !== 'pausa') this.camera(dt);
    this.hudT += dt;
    if ((this.tela === 'jogo' || this.tela === 'pronto') && this.hudT > 0.08) {
      this.hudT = 0;
      this.avisar();
    }
  }

  private atualizar(dt: number): void {
    this.acumulado += dt;
    while (this.acumulado >= PASSO) {
      this.acumulado -= PASSO;
      this.processar(avancar(this.b, this.c));
      if (this.tela !== 'jogo') {
        this.acumulado = 0;
        break;
      }
    }
    if (this.msgT > 0) this.msgT -= dt;
    for (const l of this.b.equipes[0].lutadores) {
      const v = this.visual(l);
      v.disparo = v.disparo.map((t) => (t > 0 ? t - dt : 0));
    }
    for (const l of [this.eu(), this.rival()]) {
      const v = this.visual(l);
      v.anim += dt;
      if (v.flash > 0) v.flash -= dt;
      if (v.cast > 0) v.cast = Math.max(0, v.cast - dt);
      if (v.entrada > 0) v.entrada = Math.max(0, v.entrada - dt);
    }
    this.atualizarProjeteis(dt);
    this.efeitos(dt);
    if (this.b.vencedor !== null && this.tela === 'jogo') {
      this.fimT -= dt;
      if (this.fimT <= 0) {
        this.tela = 'fim';
        this.segurando = null;
        this.soltarTeclas();
        this.som.tocar(this.b.vencedor === 0 ? 'win' : 'lose');
        this.avisar();
      }
    }
  }

  /** Altura visual dos projéteis: sai do meio de quem atacou e mira o meio do alvo. */
  private atualizarProjeteis(dt: number): void {
    for (const p of this.alturaProjetil.keys()) if (!this.b.projeteis.includes(p)) this.alturaProjetil.delete(p);
    for (const p of this.b.projeteis) {
      const alvo = lutadorPorUid(this.b, p.alvo);
      const th = this.alturaSprite(alvo) / 2;
      const h = this.alturaProjetil.get(p) ?? th;
      const d = Math.hypot(alvo.x - p.x, alvo.y - p.y) || 1;
      this.alturaProjetil.set(p, h + (th - h) * Math.min(1, (this.c.regras.projetil.velocidade * dt) / d));
    }
  }

  private efeitos(dt: number): void {
    for (let i = this.particulas.length - 1; i >= 0; i--) {
      const p = this.particulas[i]!;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.9;
      p.vy *= 0.9;
      p.vida -= dt;
      if (p.vida <= 0) this.particulas.splice(i, 1);
    }
    for (let i = this.textos.length - 1; i >= 0; i--) {
      const t = this.textos[i]!;
      t.y -= 15 * dt;
      t.vida -= dt;
      if (t.vida <= 0) this.textos.splice(i, 1);
    }
    if (this.tremor > 0) this.tremor -= dt;
    for (const eq of this.b.equipes) {
      for (const l of eq.lutadores) {
        const v = this.visual(l);
        if (v.lagT > 0) v.lagT -= dt;
        else if (v.hpLag > l.hp) v.hpLag = Math.max(l.hp, v.hpLag - l.hpMax * 0.7 * dt);
      }
    }
    if (this.tela !== 'jogo') {
      for (const l of [this.eu(), this.rival()]) {
        const v = this.visual(l);
        v.anim += dt;
        if (v.flash > 0) v.flash -= dt;
        if (v.entrada > 0) v.entrada = Math.max(0, v.entrada - dt);
      }
    }
  }

  private camera(dt: number): void {
    const cam = this.cam;
    let tx: number;
    let ty: number;
    let tz: number;
    if (this.tela === 'titulo') {
      this.attT += dt;
      tz = 1.35;
      tx = AR.cx + Math.sin(this.attT * 0.2) * 70;
      ty = 200;
    } else {
      let minX = 1e9;
      let maxX = -1e9;
      let minY = 1e9;
      let maxY = -1e9;
      for (const l of [this.eu(), this.rival()]) {
        const p = projetar(l.x, l.y);
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y - this.alturaSprite(l));
        maxY = Math.max(maxY, p.y);
      }
      const mx = 46;
      const mt = 34;
      const mb = 20;
      const cabe = Math.min(VISTA.largura / (maxX - minX + mx * 2), VISTA.altura / (maxY - minY + mt + mb));
      tz = Math.min(AR.zMax, cabe >= AR.zMin ? cabe : Math.max(0.85, cabe));
      tx = (minX + maxX) / 2;
      ty = (minY - mt + maxY + mb) / 2;
    }
    const k = 1 - Math.exp(-dt * 3);
    const kz = 1 - Math.exp(-dt * 2);
    cam.z += (tz - cam.z) * kz;
    cam.x += (tx - cam.x) * k;
    cam.y += (ty - cam.y) * k;
    const hw = VISTA.largura / 2 / cam.z;
    const hh = VISTA.altura / 2 / cam.z;
    cam.x = CENARIO.largura > hw * 2 ? Math.max(hw, Math.min(CENARIO.largura - hw, cam.x)) : CENARIO.largura / 2;
    cam.y = CENARIO.altura > hh * 2 ? Math.max(hh, Math.min(CENARIO.altura - hh, cam.y)) : CENARIO.altura / 2;
  }

  // ---------- eventos do núcleo → reações ----------

  private dizer(s: string, cor = '#f4f4f4'): void {
    this.msg = s;
    this.msgT = 1.8;
    this.msgCor = cor;
  }

  /** Posição no cenário da criatura, `acima` pixels acima dos pés. */
  em(l: Lutador, acima = 0): { x: number; y: number } {
    const s = projetar(l.x, l.y);
    return { x: s.x, y: s.y - acima };
  }

  private textoEm(l: Lutador, acima: number, s: string, cor: string, esc: number, vida = 0.9): void {
    const p = this.em(l, acima);
    this.textos.push({ x: p.x, y: p.y, s, cor, esc, vida });
  }

  private explosao(x: number, y: number, cor: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 20 + Math.random() * 30;
      this.particulas.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vida: 0.3 + Math.random() * 0.2, cor, tam: Math.random() < 0.4 ? 2 : 1 });
    }
  }

  private explosaoEm(l: Lutador, acima: number, cor: string, n: number): void {
    const p = this.em(l, acima);
    this.explosao(p.x, p.y, cor, n);
  }

  private tocar(e: Efeito): void {
    this.som.tocar(e);
  }

  private processar(eventos: Evento[]): void {
    for (const e of eventos) {
      switch (e.tipo) {
        case 'golpe': {
          const l = lutadorPorUid(this.b, e.autor);
          const v = this.visual(l);
          v.cast = 0.2;
          if (l.equipe === 0) v.disparo[e.indice] = 0.25;
          else {
            const g = golpeDe(this.c, e.golpe);
            this.textoEm(l, this.alturaSprite(l) + 22, g.nome, this.c.tipos[g.tipo]?.cor ?? '#f4f4f4', 1, 0.8);
          }
          break;
        }
        case 'buff': {
          const l = lutadorPorUid(this.b, e.lutador);
          const h = this.alturaSprite(l);
          this.textoEm(l, h + 12, `${SIGLA[e.atributo]}+`, '#ffcd75', 1);
          this.explosaoEm(l, h / 2, COR_BUFF[e.atributo], 10);
          this.tocar('buff');
          break;
        }
        case 'cura': {
          const l = lutadorPorUid(this.b, e.lutador);
          const h = this.alturaSprite(l);
          this.textoEm(l, h + 16, `+${e.valor}`, '#a7f070', 2);
          this.explosaoEm(l, h / 2, '#a7f070', 10);
          this.tocar('buff');
          break;
        }
        case 'deslocamento': {
          const l = lutadorPorUid(this.b, e.lutador);
          if (e.motivo === 'avancar' || e.motivo === 'recuar') this.explosaoEm(l, 0, '#e6b57e', 6);
          else this.explosaoEm(l, this.alturaSprite(l) / 2, '#f4f4f4', 6);
          break;
        }
        case 'condicao': {
          const l = lutadorPorUid(this.b, e.lutador);
          const debuff = l.condicoes.filter((cd) => cd.tipo === 'debuff').at(-1);
          const [texto, cor] = e.condicao === 'debuff' && debuff?.tipo === 'debuff' ? [`${SIGLA[debuff.atributo]}-`, '#94b0c2'] : TEXTO_CONDICAO[e.condicao];
          this.textoEm(l, this.alturaSprite(l) + 12, texto, cor, 1, 1.1);
          break;
        }
        case 'errou': {
          const l = lutadorPorUid(this.b, e.autor);
          this.textoEm(l, this.alturaSprite(l) + 12, 'ERROU', '#94b0c2', 1);
          break;
        }
        case 'interrompido': {
          const l = lutadorPorUid(this.b, e.lutador);
          this.textoEm(l, this.alturaSprite(l) + 12, 'INTERROMPIDO', '#94b0c2', 1);
          break;
        }
        case 'projetil': {
          const p = this.b.projeteis[this.b.projeteis.length - 1];
          if (p) this.alturaProjetil.set(p, this.alturaSprite(lutadorPorUid(this.b, e.autor)) / 2);
          this.tocar('shoot');
          break;
        }
        case 'projetilPerdido': {
          let h = 10;
          for (const [p, altura] of this.alturaProjetil) {
            if (p.x === e.x && p.y === e.y) {
              h = altura;
              this.alturaProjetil.delete(p);
              break;
            }
          }
          const s = projetar(e.x, e.y);
          this.explosao(s.x, s.y - h, '#94b0c2', 3);
          break;
        }
        case 'dano':
          this.reagirAoDano(e);
          break;
        case 'trocaIniciada': {
          const velho = lutadorPorUid(this.b, e.saindo);
          this.visual(velho).flash = 0.3;
          this.explosaoEm(velho, 6, '#f4f4f4', 8);
          this.dizer(`${this.nome(velho).toUpperCase()}, VOLTA!`);
          this.tocar('switch');
          break;
        }
        case 'entrou': {
          const l = lutadorPorUid(this.b, e.lutador);
          this.visual(l).entrada = 0.3;
          this.explosaoEm(l, 6, '#f4f4f4', 10);
          const nome = this.nome(l).toUpperCase();
          if (e.equipe === 1) {
            this.dizer(`RIVAL ENVIOU ${nome}!`, '#ffcd75');
            this.tocar('switch');
          } else if (e.motivo === 'troca') {
            this.dizer(`VAI, ${nome}!`, '#a7f070');
          } else if (this.escolhaFeita) {
            this.dizer(`VAI, ${nome}!`, '#a7f070');
            this.tocar('switch');
          } else {
            this.dizer(`ÚLTIMA CHANCE: ${nome}!`, '#ffcd75');
            this.tocar('switch');
          }
          this.escolhaFeita = false;
          break;
        }
        case 'desmaio': {
          const l = lutadorPorUid(this.b, e.lutador);
          const h = this.alturaSprite(l);
          const tipo = this.c.tipos[especieDe(this.c, l).tipos[0]!];
          this.explosaoEm(l, h / 2, tipo?.particula ?? tipo?.cor ?? '#f4f4f4', 16);
          this.explosaoEm(l, h / 2, '#f4f4f4', 8);
          this.dizer(`${this.nome(l).toUpperCase()} DESMAIOU!`, l.equipe === 0 ? '#ef7d57' : '#a7f070');
          this.tocar('faint');
          if (l.equipe === 0) {
            this.caido = this.nome(l).toUpperCase();
            this.segurando = null;
          }
          break;
        }
        case 'aguardandoEscolha':
          if (e.equipe === 0) {
            this.tela = 'escolha';
            this.segurando = null;
            this.soltarTeclas();
            this.avisar();
          }
          break;
        case 'fim':
          this.fimT = 1.4;
          break;
        case 'comandoRecusado':
          break;
      }
    }
  }

  private reagirAoDano(e: Extract<Evento, { tipo: 'dano' }>): void {
    const alvo = lutadorPorUid(this.b, e.alvo);
    const v = this.visual(alvo);
    if (v.lagT <= 0) v.hpLag = Math.max(v.hpLag, v.hpVisto);
    v.hpVisto = Math.max(0, v.hpVisto - e.valor);
    v.lagT = 0.4;
    const h = this.alturaSprite(alvo);
    if (e.origem === 'continuo') {
      // Dano contínuo: número pequeno, sem tremor nem som, para não poluir.
      this.textoEm(alvo, h + 16, String(e.valor), '#ef7d57', 1, 0.6);
      return;
    }
    v.flash = 0.2;
    const ef = e.eficacia;
    const cor = ef >= 2 ? '#ffcd75' : ef < 1 ? '#94b0c2' : '#f4f4f4';
    this.textoEm(alvo, h + 16, String(e.valor), cor, ef >= 2 ? 3 : 2);
    if (ef >= 2) {
      this.textoEm(alvo, -4, ef >= 4 ? 'SUPER EFICAZ X4!' : 'SUPER EFICAZ!', '#ffcd75', 1, 1.2);
      this.tremor = ef >= 4 ? 0.4 : 0.25;
      this.tocar('super');
    } else if (ef > 0 && ef < 1) {
      this.textoEm(alvo, -4, 'POUCO EFICAZ', '#94b0c2', 1, 1.2);
      this.tocar('weak');
    } else if (ef === 0) {
      this.textoEm(alvo, -4, 'SEM EFEITO', '#94b0c2', 1, 1.2);
      this.tocar('weak');
    } else {
      this.tocar('hit');
    }
    const g = golpeDe(this.c, e.golpe);
    this.explosaoEm(alvo, h / 2, e.origem === 'contato' ? '#f4f4f4' : (this.c.tipos[g.tipo]?.cor ?? '#f4f4f4'), 8);
  }
}
