// Catálogo de golpes (golpes.html): cada golpe do pacote numa animação em loop, com o motor e o
// desenho do próprio jogo, e a ficha lida do dicionário. A criatura do elemento usa o golpe num
// boneco parado (que não cai: tem 999 de HP). Como tudo sai dos JSON, mudar o dicionário muda a página.
//
// Opções na URL: ?pacote=prototipo (padrão: vale), &tipo=fogo (filtro inicial), &busca=raio.

import { render } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Conteudo, Golpe } from '../conteudo/esquema';
import { pacotes, vale } from '../conteudo/pacotes';
import { desenharCena } from '../desenho/cena';
import { carregarSprites } from '../desenho/sprites';
import { VISTA } from '../desenho/arena';
import { duracaoDe, fichaDoGolpe } from '../interface/ficha';
import { aplicarComandos, criarCampo, golpeDe, perfilDoGolpe, type ConfigBatalha, type EstadoBatalha, type Lutador } from '../nucleo';
import { Jogo } from './jogo';
import './golpes.css';

const q = new URLSearchParams(location.search);
const nomeDoPacote = q.get('pacote') && pacotes[q.get('pacote')!] ? q.get('pacote')! : 'vale';
const c: Conteudo = pacotes[nomeDoPacote] ?? vale;

/** A primeira espécie de cada tipo usa os golpes dele. */
const ESPECIE_DO_TIPO: Record<string, string> = {};
for (const [id, e] of Object.entries(c.especies)) ESPECIE_DO_TIPO[e.tipos[0]!] ??= id;
/** O alvo: o Boneco Arcano, que não resiste a nada (ou a última espécie, em outro pacote). */
const ALVO = c.especies['boneco-arcano'] ? 'boneco-arcano' : Object.keys(c.especies).at(-1)!;

/** Escala do canvas de cada card (1 = 390 × 336). */
const K = 1.5;

// ---------- Palco: a batalha de demonstração de um golpe ----------

type Lado = { b: EstadoBatalha; A: Lutador; B: Lutador };

/** Campo posto à mão, de quem e onde, para os golpes que precisam de um (munição, terreno de onde sai…). */
function campo(l: Lado, dono: Lutador, id: string, x: number, y: number, raio: number): void {
  const golpe = Object.keys(c.golpes).find((g) => golpeDe(c, g).tipo === c.campos[id]?.tipo) ?? dono.golpes[0]!.id;
  if (c.campos[id]) criarCampo(l.b, c, dono, golpe, id, { forma: 'area', raio }, { x, y, ux: 1, uy: 0 }, 30);
}

/** O rival passa a disparar este golpe (para mostrar desvio, reflexo e cópia falsa). */
function rivalAtira(l: Lado, golpe: string, depois = 1): void {
  if (c.golpes[golpe]) l.B.golpes = [{ id: golpe, recarga: depois }];
}

/** Preparos de golpes que precisam de cena montada antes. */
const PREPAROS: Record<string, (l: Lado) => void> = {
  recolher: (l) => {
    campo(l, l.A, 'poca', l.A.x + 22, 50, 12);
    campo(l, l.A, 'poca', l.A.x + 22, 90, 12);
  },
  ressonancia: (l) => campo(l, l.A, 'cristais', l.B.x - 10, l.B.y, 8),
  'espelho-arcano': (l) => (l.B.ultimoGolpe = c.golpes['folha-navalha'] ? 'folha-navalha' : null),
  estilhacar: (l) => l.B.condicoes.push({ tipo: 'estado', estado: 'congelado', restante: 2, autor: l.A.uid, alvo: null, cargas: 0, andado: 0 }),
  fonte: (l) => {
    campo(l, l.A, 'poca', l.A.x, l.A.y, 16);
    l.A.hp = Math.round(l.A.hpMax * 0.3);
  },
  fotossintese: (l) => (l.A.hp = Math.round(l.A.hpMax * 0.3)),
  'sangue-antigo': (l) => (l.A.hp = Math.round(l.A.hpMax * 0.15)),
  'fome-do-fogo': (l) => campo(l, l.B, 'raizes', (l.A.x + l.B.x) / 2, l.A.y, 14),
  'arrancar-chao': (l) => campo(l, l.B, 'raizes', l.A.x, l.A.y, 16),
  decomposicao: (l) => campo(l, l.B, 'poca', l.B.x, l.B.y, 18),
  vacuo: (l) => campo(l, l.B, 'fumaca-quente', l.B.x, l.B.y, 22),
  ruptura: (l) => {
    campo(l, l.B, 'chamas', (l.A.x + l.B.x) / 2, l.A.y, 10);
    l.b.objetos.push({ id: 9999, tipo: 'pilar', autor: l.B.uid, golpe: l.B.golpes[0]!.id, x: (l.A.x + l.B.x) / 2 + 14, y: l.A.y, raio: 6, restante: 30, par: null, chance: 1, destruidoPor: [], dentro: [] });
  },
  miragem: (l) => rivalAtira(l, 'folha-navalha', 1.2),
  'esfera-de-ar': (l) => rivalAtira(l, 'folha-navalha', 0.8),
  'couraca-cristalina': (l) => rivalAtira(l, 'folha-navalha', 0.8),
};

/** Golpes em que o rival precisa andar para o efeito aparecer (pisar na mina, cruzar a parede…). */
const RIVAL_ANDA = new Set([
  'chamas',
  'muralha-de-fogo',
  'cerca-eletrica',
  'passo-relampago',
  'vinhas-entrelacadas',
  'rastro-congelado',
  'escultor',
  'corredor-de-vento',
  'portais',
  'alagamento',
  'campo-de-cristais',
]);
/** Golpes em que o rival anda para trás (a corrente segura; a flor carnívora nasce atrás dele). */
const RIVAL_FOGE = new Set(['corrente-de-metal', 'carnivora']);

class Palco {
  readonly jogo: Jogo;
  private readonly config: ConfigBatalha;
  readonly ciclo: number;
  private readonly distancia: number;
  private t = 0;

  constructor(
    readonly id: string,
    readonly canvas: HTMLCanvasElement,
  ) {
    const g = golpeDe(c, id);
    const especie = ESPECIE_DO_TIPO[g.tipo] ?? Object.keys(c.especies)[0]!;
    this.config = {
      semente: 7,
      equipes: [
        { piloto: 'jogador', time: [{ especie, golpes: [id] }] },
        { piloto: 'jogador', time: [{ especie: ALVO, golpes: [id] }] },
      ],
    };
    const demo: Conteudo = { ...c, batalhas: { demo: { nome: 'Demonstração', equipes: this.config.equipes } } };
    this.jogo = new Jogo(demo, { dificuldade: 'normal', assist: false, velocidade: 1, semente: 7, batalha: 'demo' });
    const p = perfilDoGolpe(g);
    const alcance = g.alcance ?? 60;
    this.distancia = p.contato ? Math.max(24, Math.min(alcance - 8, 60)) : Math.min(80, Math.max(30, alcance - 12));
    const voo = g.efeitos.some((e) => e.efeito === 'projetil' || (e.efeito === 'varias' && e.faz.efeito === 'projetil')) ? 1.5 : 0;
    const andar = RIVAL_ANDA.has(id) || RIVAL_FOGE.has(id) ? 2.5 : 0;
    this.ciclo = Math.max(3, Math.min(8, g.conjuracao + Math.max(duracaoDe(g), voo, andar) + 1.8));
    this.reiniciar();
  }

  private reiniciar(): void {
    const j = this.jogo;
    j.demonstrar(this.config);
    const b = j.b;
    const A = j.eu();
    const B = j.rival();
    A.x = 160 - this.distancia / 2;
    B.x = 160 + this.distancia / 2;
    A.y = B.y = 70;
    B.hp = B.hpMax = 999;
    j.visual(B).hpVisto = j.visual(B).hpLag = 999;
    B.golpes.forEach((u) => (u.recarga = 1e9));
    aplicarComandos(b, j.c, [
      { tipo: 'tatica', equipe: 0, tatica: 'parado' },
      { tipo: 'tatica', equipe: 1, tatica: 'parado' },
    ]);
    PREPAROS[this.id]?.({ b, A, B });
    this.t = 0;
  }

  /** Um quadro: o roteiro (o rival anda ou foge), o jogo e o desenho. */
  quadro(dt: number): void {
    this.t += dt;
    if (this.t >= this.ciclo) this.reiniciar();
    const j = this.jogo;
    const anda = RIVAL_ANDA.has(this.id) && this.t > 1.1 && this.t < 3.4;
    const foge = RIVAL_FOGE.has(this.id) && this.t > 1 && this.t < 3.5;
    const dx = anda ? -1 : foge ? 1 : 0;
    if (j.b.equipes[1].direcao.x !== dx) aplicarComandos(j.b, j.c, [{ tipo: 'direcao', equipe: 1, x: dx, y: 0 }]);
    j.quadro(dt);
    desenharCena(this.canvas, j);
  }
}

// ---------- Laço: só anima os cards que estão na tela ----------

const visiveis = new Set<Palco>();
let ultimo = performance.now();
let pausado = false;
function laco(agora: number): void {
  const dt = Math.min(0.05, Math.max(0, (agora - ultimo) / 1000));
  ultimo = agora;
  if (!pausado) for (const p of visiveis) p.quadro(dt);
  requestAnimationFrame(laco);
}
requestAnimationFrame(laco);

// ---------- Interface ----------

const numero = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

function Card({ id }: { id: string }) {
  const g = golpeDe(c, id);
  const tipo = c.tipos[g.tipo];
  const ficha = useMemo(() => fichaDoGolpe(g, c), [g]);
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    let palco: Palco | null = null;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          // Só cria (e só ocupa memória) quando aparece; ao sair, solta o canvas.
          canvas.width = VISTA.largura * K;
          canvas.height = VISTA.altura * K;
          palco ??= new Palco(id, canvas);
          visiveis.add(palco);
        } else if (palco) {
          visiveis.delete(palco);
          canvas.width = canvas.height = 0;
        }
      },
      { rootMargin: '120px' },
    );
    obs.observe(canvas);
    return () => {
      obs.disconnect();
      if (palco) visiveis.delete(palco);
    };
  }, [id]);
  return (
    <article class="card" style={`--cor: ${tipo?.cor ?? '#94b0c2'}; --fundo: ${tipo?.fundo ?? '#262b44'}`}>
      <canvas ref={ref} class="palco" role="img" aria-label={`Animação do golpe ${g.nome}`} />
      <div class="corpo">
        <header>
          <h2>{g.nome}</h2>
          <span class="chip tipo">{tipo?.nome ?? g.tipo}</span>
          {g.categoria && <span class="chip">{c.categorias[g.categoria]?.nome ?? g.categoria}</span>}
          <code>{id}</code>
        </header>
        <dl class="numeros">
          {ficha.numeros.map((n) => (
            <div key={n.rotulo}>
              <dt>{n.rotulo}</dt>
              <dd>{n.valor}</dd>
            </div>
          ))}
        </dl>
        <ul class="efeitos">
          {ficha.efeitos.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
        {ficha.glossario.length > 0 && (
          <ul class="glossario">
            {ficha.glossario.map((x) => (
              <li key={x.nome}>
                <b>{x.nome}:</b> {x.texto}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

function Catalogo() {
  const tipos = Object.keys(c.tipos);
  const [tipo, setTipo] = useState<string>(q.get('tipo') && c.tipos[q.get('tipo')!] ? q.get('tipo')! : '');
  const [busca, setBusca] = useState(q.get('busca') ?? '');
  const [parado, setParado] = useState(false);
  const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const termo = normalizar(busca.trim());
  const achados = Object.entries(c.golpes).filter(([id, g]: [string, Golpe]) => !termo || normalizar(`${id} ${g.nome}`).includes(termo));
  const lista = achados.filter(([, g]) => !tipo || g.tipo === tipo);
  // Os números dos botões seguem a busca: mostram em que elemento ela acha golpes.
  const contagem = (t: string) => achados.filter(([, g]) => g.tipo === t).length;

  // A URL acompanha os filtros: recarregar mantém o que está na tela, e nenhuma busca antiga fica presa nela.
  // Aberto como arquivo ou dentro de outra página, o navegador pode recusar a troca; aí a URL só fica como estava.
  useEffect(() => {
    const u = new URL(location.href);
    for (const [chave, valor] of [
      ['tipo', tipo],
      ['busca', busca.trim()],
    ] as const) {
      if (valor) u.searchParams.set(chave, valor);
      else u.searchParams.delete(chave);
    }
    try {
      history.replaceState(null, '', u);
    } catch {
      // sem URL compartilhável, o filtro continua funcionando
    }
  }, [tipo, busca]);

  return (
    <>
      <header class="topo">
        <div>
          <h1>Catálogo de golpes</h1>
          <p>
            Pacote <b>{nomeDoPacote}</b> · {Object.keys(c.golpes).length} golpes · recargas ×{numero(c.regras.recargaGolpes)} · pausa entre golpes{' '}
            {numero(c.regras.recargaGlobal.ataque)} s. Tudo lido de <code>conteudo/{nomeDoPacote}/</code>: mudou o JSON, mudou aqui.
          </p>
        </div>
        <div class="controles">
          <input type="search" placeholder="Buscar golpe…" value={busca} onInput={(e) => setBusca(e.currentTarget.value)} aria-label="Buscar golpe" />
          <button
            type="button"
            onClick={() => {
              pausado = !parado;
              setParado(!parado);
            }}
          >
            {parado ? 'Continuar' : 'Pausar'}
          </button>
        </div>
        <nav class="tipos" aria-label="Filtrar por elemento">
          <button type="button" class={tipo === '' ? 'ativo' : ''} onClick={() => setTipo('')}>
            Todos <small>{achados.length}</small>
          </button>
          {tipos.map((t) => (
            <button key={t} type="button" class={tipo === t ? 'ativo' : ''} style={`--cor: ${c.tipos[t]!.cor}`} onClick={() => setTipo(t)}>
              {c.tipos[t]!.nome} <small>{contagem(t)}</small>
            </button>
          ))}
        </nav>
      </header>
      <main class="grade">
        {lista.map(([id]) => (
          <Card key={id} id={id} />
        ))}
        {lista.length === 0 && (
          <p class="vazio">
            Nenhum golpe{tipo ? ` de ${c.tipos[tipo]!.nome}` : ''}
            {termo ? ` com “${busca.trim()}”` : ''}.{' '}
            {termo && (
              <button type="button" onClick={() => setBusca('')}>
                Limpar busca
              </button>
            )}
          </p>
        )}
      </main>
    </>
  );
}

void carregarSprites(c).then(() => render(<Catalogo />, document.getElementById('app')!));

// Em desenvolvimento, o palco fica acessível no console (para conferir todos os golpes de uma vez).
if (import.meta.env.DEV) Object.assign(globalThis, { Palco, conteudoDoCatalogo: c });
