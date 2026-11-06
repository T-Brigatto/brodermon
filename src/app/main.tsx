// Entrada do jogo no navegador: lê as opções da URL, monta a interface e roda o laço de quadros.
//
// Opções na URL (todas opcionais), equivalentes às props da Arena no Claude Design:
//   ?dificuldade=facil|normal|dificil  &assist=0  &velocidade=1.25  &semente=123
//   &pacote=prototipo     (pacote de conteúdo; padrão "vale", com os 103 golpes do guia; "prototipo" é a Arena original)
//   &batalha=lab-fogo     (qualquer id de batalhas.json do pacote; padrão: a primeira, "torneio" no vale e "treino" no protótipo)

import { render } from 'preact';
import { pacotes, vale } from '../conteudo/pacotes';
import { desenharCena } from '../desenho/cena';
import { carregarSprites } from '../desenho/sprites';
import { App } from '../interface/App';
import '../interface/arena.css';
import { Jogo, type Opcoes } from './jogo';

const q = new URLSearchParams(location.search);
const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const opcoes: Opcoes = {
  dificuldade: semAcento(q.get('dificuldade') ?? 'normal'),
  assist: q.get('assist') !== '0',
  velocidade: Math.min(1.5, Math.max(0.75, Number(q.get('velocidade') ?? 1) || 1)),
  semente: q.has('semente') ? Number(q.get('semente')) : undefined,
  batalha: q.get('batalha') ?? undefined,
};
const conteudo = pacotes[q.get('pacote') ?? ''] ?? vale;
const jogo = new Jogo(conteudo, opcoes);

let canvas: HTMLCanvasElement | null = null;
let ultimo = performance.now();
function quadro(agora: number): void {
  const dt = Math.min(0.05, Math.max(0, (agora - ultimo) / 1000));
  ultimo = agora;
  jogo.quadro(dt);
  if (canvas) desenharCena(canvas, jogo);
  requestAnimationFrame(quadro);
}
// As tiras de sprite carregam antes da primeira tela.
void carregarSprites(conteudo).then(() => {
  render(<App jogo={jogo} aoCanvas={(el) => (canvas = el)} />, document.getElementById('app')!);
  ultimo = performance.now();
  requestAnimationFrame(quadro);
});

addEventListener('keydown', (ev) => jogo.tecla(ev, true));
addEventListener('keyup', (ev) => jogo.tecla(ev, false));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) jogo.pausar();
});

// Em desenvolvimento, o jogo fica acessível no console (inspeção e comparações com a Arena original).
if (import.meta.env.DEV) Object.assign(globalThis, { jogo });
