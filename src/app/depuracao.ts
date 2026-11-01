// Visualizador provisório do núcleo: círculos no lugar das criaturas e botões
// simples no lugar do HUD. Serve para ver as regras rodando enquanto o desenho
// e a interface de verdade não existem.

import { pacotes, vale } from '../conteudo/pacotes';
import { contornoDaForma } from '../desenho/formas';
import {
  PASSO,
  ativo,
  avancar,
  configDaBatalha,
  criarBatalha,
  especieDe,
  geometriaDe,
  golpeDe,
  lutadorPorUid,
  posicaoDaForma,
  raioDe,
  type Posicao,
  type Comando,
  type EstadoBatalha,
  type Evento,
  type Geometria,
  type Lutador,
  type Tatica,
} from '../nucleo';

const c = pacotes[new URLSearchParams(location.search).get('pacote') ?? ''] ?? vale;
const ESCALA = 1.15;
const MARGEM = { x: 15, y: 10 };
const TATICAS: [Tatica, string][] = [
  ['perseguir', 'AVANÇAR'],
  ['manter', 'DISTÂNCIA'],
  ['parado', 'FIRME'],
  ['evasivo', 'ESQUIVAR'],
];
const SETAS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
};

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `
  <header><h1>Núcleo da batalha · depuração</h1><p id="status"></p></header>
  <canvas id="arena" width="390" height="165"></canvas>
  <section><h2>Golpes <small>toque ou 1–4 põe na fila</small></h2><div id="golpes" class="grade"></div></section>
  <section><h2>Tática</h2><div id="taticas" class="grade"></div></section>
  <section id="secao-time"><h2>Time <small>Shift + 1–6</small></h2><div id="time" class="grade"></div></section>
  <section><h2>Eventos</h2><ol id="log"></ol></section>
  <footer>
    <button id="nova">Nova batalha</button>
    <label>Velocidade <select id="vel"><option>0.5</option><option selected>1</option><option>2</option><option>4</option></select></label>
  </footer>`;

const $ = <T extends HTMLElement>(sel: string) => app.querySelector<T>(sel)!;
const canvas = $<HTMLCanvasElement>('#arena');
const ctx = canvas.getContext('2d')!;

let b: EstadoBatalha;
let semente = 0;
let pendentes: Comando[] = [];
let log: string[] = [];
let textos: { x: number; y: number; txt: string; cor: string; vida: number }[] = [];
let velocidade = 1;

function nova(): void {
  semente = Math.floor(Math.random() * 2 ** 31);
  const id = new URLSearchParams(location.search).get('batalha') ?? '';
  const padrao = Object.keys(c.batalhas)[0]!; // a primeira batalha do pacote
  b = criarBatalha(c, configDaBatalha(c, c.batalhas[id] ? id : padrao, semente));
  pendentes = [];
  log = [`Semente ${semente}. Vai, ${nome(ativo(b, 0))}!`];
  textos = [];
  hud();
}

const nome = (l: Lutador) => especieDe(c, l).nome + (l.equipe === 1 ? ' (rival)' : '');
const corDoTipo = (tipo: string) => c.tipos[tipo]?.cor ?? '#f4f4f4';
const tela = (x: number, y: number) => ({ x: MARGEM.x + x * ESCALA, y: MARGEM.y + y * ESCALA });

function registrar(ev: Evento[]): void {
  let mudou = false;
  for (const e of ev) {
    let linha = '';
    switch (e.tipo) {
      case 'golpe':
        linha = `${nome(lutadorPorUid(b, e.autor))} usou ${golpeDe(c, e.golpe).nome}`;
        break;
      case 'dano': {
        const alvo = lutadorPorUid(b, e.alvo);
        const extra = e.eficacia === 0 ? ' — SEM EFEITO' : e.eficacia >= 2 ? ' — SUPER EFICAZ!' : e.eficacia < 1 ? ' — pouco eficaz' : '';
        linha = `  ${e.valor} de dano em ${nome(alvo)}${extra}`;
        const p = tela(alvo.x, alvo.y);
        const cor = e.eficacia >= 2 ? '#ffcd75' : e.eficacia < 1 ? '#94b0c2' : '#f4f4f4';
        textos.push({ x: p.x, y: p.y - 22, txt: String(e.valor), cor, vida: 0.9 });
        break;
      }
      case 'buff':
        linha = `  ${nome(lutadorPorUid(b, e.lutador))} ganhou ${e.atributo}+${e.valor}`;
        break;
      case 'trocaIniciada':
        linha = `${nome(lutadorPorUid(b, e.saindo))}, volta!`;
        break;
      case 'entrou':
        linha = e.equipe === 0 ? `Vai, ${nome(lutadorPorUid(b, e.lutador))}!` : `Rival enviou ${nome(lutadorPorUid(b, e.lutador))}`;
        break;
      case 'desmaio':
        linha = `${nome(lutadorPorUid(b, e.lutador))} desmaiou!`;
        break;
      case 'aguardandoEscolha':
        linha = 'Escolha a próxima criatura no time.';
        break;
      case 'fim':
        linha = e.vencedor === 0 ? 'VITÓRIA!' : 'DERROTA';
        break;
      case 'comandoRecusado':
        linha = `  (${e.motivo})`;
        break;
    }
    if (linha) {
      log.push(linha);
      mudou = true;
    }
  }
  if (mudou) {
    log = log.slice(-12);
    hud();
  }
}

function hud(): void {
  const eu = ativo(b, 0);
  const rival = ativo(b, 1);
  const eq = b.equipes[0];
  const fim = b.vencedor === null ? '' : b.vencedor === 0 ? ' · VITÓRIA!' : ' · DERROTA';
  $('#status').textContent =
    `${b.tempo.toFixed(1)} s · ${nome(eu)} ${eu.hp}/${eu.hpMax} contra ${nome(rival)} ${rival.hp}/${rival.hpMax}${fim}`;

  $('#golpes').innerHTML = eu.golpes
    .map((uso, i) => {
      const g = golpeDe(c, uso.id);
      const estado = uso.recarga > 0 ? `${uso.recarga.toFixed(1)} s` : 'pronto';
      const detalhe = `${g.efeitos.map((e) => e.efeito).join(' → ')}${g.alcance ? ` · alc ${g.alcance}` : ''}`;
      return `<button data-golpe="${i}" class="${eq.proximoGolpe === i ? 'fila' : ''}" style="border-left-color:${corDoTipo(g.tipo)}">
        ${i + 1}. ${g.nome} ${eq.proximoGolpe === i ? '· NA FILA' : ''}<span class="linha2">${c.tipos[g.tipo]?.nome} · ${detalhe} · ${estado}</span></button>`;
    })
    .join('');

  $('#taticas').innerHTML = TATICAS.map(
    ([id, rotulo]) => `<button data-tatica="${id}" class="${eq.tatica === id ? 'ativo' : ''}">${rotulo}</button>`,
  ).join('');

  const escolhendo = b.aguardandoEscolha === 0;
  $('#secao-time').classList.toggle('escolher', escolhendo);
  $('#secao-time h2').innerHTML = escolhendo
    ? 'Escolha a próxima criatura'
    : `Time <small>Shift + 1–6${eq.esperaTroca > 0 ? ` · troca em ${eq.esperaTroca.toFixed(1)} s` : ''}</small>`;
  $('#time').innerHTML = eq.lutadores
    .map(
      (l, i) => `<button data-troca="${i}" class="${i === eq.ativo ? 'ativo' : ''}" ${l.desmaiado ? 'disabled' : ''}>
        ${especieDe(c, l).nome}<span class="linha2">${l.hp}/${l.hpMax}</span></button>`,
    )
    .join('');

  $('#log').innerHTML = log.map((l) => `<li>${l}</li>`).join('');
}

function desenhar(dt: number): void {
  const A = c.regras.arena;
  ctx.fillStyle = '#141625';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const p0 = tela(A.xMin, A.yMin);
  const p1 = tela(A.xMax, A.yMax);
  ctx.fillStyle = '#1d2035';
  ctx.fillRect(p0.x, p0.y, p1.x - p0.x, p1.y - p0.y);
  ctx.strokeStyle = '#333c57';
  ctx.strokeRect(p0.x + 0.5, p0.y + 0.5, p1.x - p0.x, p1.y - p0.y);

  const eq = b.equipes[0];
  const eu = ativo(b, 0);
  if (eq.destino) {
    const d = tela(eq.destino.x, eq.destino.y);
    ctx.strokeStyle = '#ffcd75';
    ctx.beginPath();
    ctx.moveTo(d.x - 4, d.y - 4); ctx.lineTo(d.x + 4, d.y + 4);
    ctx.moveTo(d.x + 4, d.y - 4); ctx.lineTo(d.x - 4, d.y + 4);
    ctx.stroke();
  }
  const naFila = eq.proximoGolpe >= 0 ? eu.golpes[eq.proximoGolpe] : undefined;
  const alcance = naFila ? golpeDe(c, naFila.id).alcance : undefined;
  if (alcance && !eu.desmaiado) {
    const p = tela(eu.x, eu.y);
    ctx.strokeStyle = 'rgba(255, 205, 117, 0.35)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, alcance * ESCALA, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Zonas e campos (cheios; marcas que ainda vão acertar, tracejadas) e a marca das formas durante a conjuração.
  const caminho = (g: Geometria, z: Posicao) => {
    ctx.beginPath();
    contornoDaForma(g, z).forEach((q, i) => {
      const t = tela(q.x, q.y);
      if (i) ctx.lineTo(t.x, t.y);
      else ctx.moveTo(t.x, t.y);
    });
    ctx.closePath();
  };
  for (const z of b.zonas) {
    const cor = corDoTipo(z.campo ? (c.campos[z.campo]?.tipo ?? '') : golpeDe(c, z.golpe).tipo);
    caminho(z.geo, z);
    ctx.setLineDash(z.atraso > 0 ? [3, 3] : []);
    if (z.atraso <= 0) {
      ctx.globalAlpha = z.campo && c.campos[z.campo]?.camada === 'nevoa' ? 0.15 : 0.3;
      ctx.fillStyle = cor;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = cor;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const o of b.objetos) {
    const p = tela(o.x, o.y);
    ctx.strokeStyle = o.tipo === 'pilar' ? '#d6dfe8' : o.tipo === 'portal' ? '#d6a8f5' : o.tipo === 'pino' ? '#ffcd75' : '#94b0c2';
    ctx.beginPath();
    ctx.arc(p.x, p.y, o.raio * ESCALA, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const e of [0, 1] as const) {
    const l = ativo(b, e);
    const a = l.acao;
    if (l.desmaiado || !a || a.conjuracao <= 0) continue;
    for (const ef of golpeDe(c, a.golpe).efeitos) {
      if (ef.efeito !== 'area' && ef.efeito !== 'cone' && ef.efeito !== 'linha' && ef.efeito !== 'parede') continue;
      caminho(geometriaDe(ef), posicaoDaForma(l, a, ef));
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#f4f4f4';
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  for (const e of [0, 1] as const) {
    const l = ativo(b, e);
    const p = tela(l.x, l.y);
    const saindo = b.equipes[e].troca !== null || l.entrando > 0;
    // Raio de acerto do corpo, o que golpes e projéteis precisam tocar.
    ctx.strokeStyle = 'rgba(244, 244, 244, 0.2)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, raioDe(c, l) * ESCALA, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = saindo ? 0.45 : 1;
    ctx.fillStyle = l.desmaiado ? '#333c57' : corDoTipo(especieDe(c, l).tipos[0]!);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = e === 0 ? '#3b5dc9' : '#b13e53';
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(p.x + l.olhando * 4 - 1, p.y - 2, 2, 2);
    const frac = l.hp / l.hpMax;
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(p.x - 12, p.y - 15, 24, 3);
    ctx.fillStyle = frac > 0.5 ? '#a7f070' : frac > 0.25 ? '#ffcd75' : '#ef7d57';
    ctx.fillRect(p.x - 12, p.y - 15, 24 * frac, 3);
    if (l.buff) {
      ctx.fillStyle = '#ffcd75';
      ctx.font = '9px monospace';
      ctx.fillText(`${l.buff.atributo.slice(0, 3).toUpperCase()}+`, p.x + 10, p.y - 10);
    }
    ctx.globalAlpha = 1;
  }

  for (const pr of b.projeteis) {
    const p = tela(pr.x, pr.y);
    ctx.fillStyle = corDoTipo(golpeDe(c, pr.golpe).tipo);
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }

  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  for (const t of textos) {
    t.vida -= dt;
    t.y -= dt * 18;
    ctx.globalAlpha = Math.max(0, Math.min(1, t.vida * 2));
    ctx.fillStyle = t.cor;
    ctx.fillText(t.txt, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'start';
  textos = textos.filter((t) => t.vida > 0);
}

// Laço com passo fixo: o núcleo sempre avança de PASSO em PASSO, não importa a taxa de quadros.
let ultimo = performance.now();
let acumulado = 0;
let desdeHud = 0;
function quadro(agora: number): void {
  const dt = Math.min(0.1, (agora - ultimo) / 1000);
  ultimo = agora;
  acumulado += dt * velocidade;
  while (acumulado >= PASSO) {
    registrar(avancar(b, c, pendentes));
    pendentes = [];
    acumulado -= PASSO;
  }
  desenhar(dt);
  if ((desdeHud += dt) > 0.1) {
    desdeHud = 0;
    hud();
  }
  requestAnimationFrame(quadro);
}

// Entrada → comandos
const teclas = new Set<string>();
function direcao(): void {
  let x = 0;
  let y = 0;
  for (const k of teclas) {
    const s = SETAS[k];
    if (s) { x += s[0]; y += s[1]; }
  }
  pendentes.push({ tipo: 'direcao', equipe: 0, x, y });
}
addEventListener('keydown', (ev) => {
  if (SETAS[ev.code]) {
    ev.preventDefault();
    if (!teclas.has(ev.code)) { teclas.add(ev.code); direcao(); }
    return;
  }
  const n = /^Digit([1-6])$/.exec(ev.code);
  if (!n) return;
  const i = Number(n[1]) - 1;
  if (ev.shiftKey || b.aguardandoEscolha === 0) pendentes.push({ tipo: 'trocar', equipe: 0, indice: i });
  else if (i < 4) pendentes.push({ tipo: 'proximoGolpe', equipe: 0, indice: i });
});
addEventListener('keyup', (ev) => {
  if (teclas.delete(ev.code)) direcao();
});

function pontoNaArena(ev: PointerEvent) {
  const r = canvas.getBoundingClientRect();
  const px = ((ev.clientX - r.left) / r.width) * canvas.width;
  const py = ((ev.clientY - r.top) / r.height) * canvas.height;
  return { x: (px - MARGEM.x) / ESCALA, y: (py - MARGEM.y) / ESCALA };
}
let segurando = false;
canvas.addEventListener('pointerdown', (ev) => {
  segurando = true;
  canvas.setPointerCapture(ev.pointerId);
  pendentes.push({ tipo: 'destino', equipe: 0, ponto: pontoNaArena(ev), fixo: true });
});
canvas.addEventListener('pointermove', (ev) => {
  if (segurando) pendentes.push({ tipo: 'destino', equipe: 0, ponto: pontoNaArena(ev), fixo: true });
});
canvas.addEventListener('pointerup', (ev) => {
  segurando = false;
  pendentes.push({ tipo: 'destino', equipe: 0, ponto: pontoNaArena(ev), fixo: false });
});

// Os botões respondem ao apertar: o painel é redesenhado a cada 100 ms e um
// clique (apertar + soltar no mesmo elemento) se perderia no meio da troca.
app.addEventListener('pointerdown', (ev) => {
  if (ev.button === 0) tocar(ev.target as HTMLElement);
});
app.addEventListener('click', (ev) => {
  if (ev.detail === 0) tocar(ev.target as HTMLElement); // Enter ou espaço no teclado
});
function tocar(alvo: HTMLElement): void {
  const el = alvo.closest<HTMLButtonElement>('button');
  if (!el || el.disabled) return;
  const { golpe, tatica, troca } = el.dataset;
  if (golpe !== undefined) pendentes.push({ tipo: 'proximoGolpe', equipe: 0, indice: Number(golpe) });
  else if (tatica !== undefined) pendentes.push({ tipo: 'tatica', equipe: 0, tatica: tatica as Tatica });
  else if (troca !== undefined) pendentes.push({ tipo: 'trocar', equipe: 0, indice: Number(troca) });
  else if (el.id === 'nova') nova();
}
$<HTMLSelectElement>('#vel').addEventListener('change', (ev) => {
  velocidade = Number((ev.target as HTMLSelectElement).value);
});

nova();
requestAnimationFrame(quadro);
