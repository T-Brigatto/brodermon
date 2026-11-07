// Tela de batalha "chapada": a direção visual aprovada em `docs/direcao-visual.md`, implementada a partir da prova
// `design/provas/batalha-f.html`. Vale para os pacotes com `regras.interface = "chapada"` (o vale); o protótipo continua
// com a HUD da Arena original, em `App.tsx`. Lê o estado do `Jogo` e manda as ações de volta; não guarda regra nenhuma.

import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { Jogo } from '../app/jogo';
import type { Conteudo } from '../conteudo/esquema';
import { pintarRetratoCaixa } from '../desenho/sprites';
import { confronto, eficacia, especieDe, golpeDe, perfilDoGolpe, recargaDe, type Lutador, type Tatica } from '../nucleo';
import { SELO, aoApertar } from './estilo';
import { IconeCategoria, SeloTipo } from './pecas';

/** A régua: cores com papel fixo, fonte e degrau. */
export const CHAPADA = {
  fundo: '#171c2c',
  faixa: '#1a1c2c',
  painel: '#242b3d',
  card: '#2b3347',
  espera: '#1d2233',
  neutro: '#3a4458',
  neutroDegrau: '#262d3d',
  degrau: '#0f1320',
  acento: '#ffc14d',
  acentoDegrau: '#c48f1f',
  vida: '#5fd17f',
  perigo: '#ff5f6d',
  texto: '#fff',
  secundario: '#9aa5bd',
  apagado: '#5e6880',
  fonte: "'Outfit', system-ui, sans-serif",
} as const;

const C = CHAPADA;
const DEGRAU = `0 4px 0 ${C.degrau}`;
const SIGLA = { ataque: 'ATQ', defesa: 'DEF', velocidade: 'VEL' } as const;

const TATICAS: [Tatica, string][] = [
  ['perseguir', 'Avançar'],
  ['manter', 'Distância'],
  ['parado', 'Firme'],
  ['evasivo', 'Esquivar'],
];

/** Verde cheio, âmbar abaixo da metade, vermelho abaixo de um quarto. */
const corVida = (p: number): string => (p > 0.5 ? C.vida : p > 0.25 ? C.acento : C.perigo);

/** `#rrggbb` com opacidade. */
function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** URL do retrato ilustrado da espécie, se o pacote tiver um. */
function retratoDe(c: Conteudo, especie: string | null): string | null {
  if (!especie) return null;
  const s = c.sprites[especie];
  return s && 'retrato' in s && typeof s.retrato === 'string' ? s.retrato : null;
}

/**
 * Retrato quadrado de `caixa` px: a arte ilustrada preenchendo o quadro ou, sem ela, o sprite centrado na maior ampliação
 * inteira que cabe. Desmaiado: a arte apaga.
 */
function RetratoChapado(p: { c: Conteudo; especie: string | null; paraDireita: boolean; desmaiado: boolean; caixa: number; raio: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const retrato = retratoDe(p.c, p.especie);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!p.especie) el.getContext('2d')?.clearRect(0, 0, el.width, el.height);
    else pintarRetratoCaixa(el, p.c, p.especie, p.paraDireita, p.desmaiado, p.caixa);
  }, [p.c, p.especie, p.paraDireita, p.desmaiado, p.caixa, retrato]);
  const filtro = p.desmaiado ? '; filter: saturate(0) brightness(0.45)' : '';
  if (retrato) {
    return <span aria-hidden="true" style={`display: block; width: ${p.caixa}px; height: ${p.caixa}px; border-radius: ${p.raio}px; background: url('${retrato}') center / cover no-repeat${filtro}`} />;
  }
  return <canvas ref={ref} width={p.caixa} height={p.caixa} aria-hidden="true" style={`display: block; width: ${p.caixa}px; height: ${p.caixa}px; image-rendering: pixelated${filtro}`} />;
}

function Coracao(p: { aceso: boolean }) {
  return (
    <svg viewBox="0 0 24 24" style="width: 11px; height: 11px; display: block; flex: none">
      <path d="M12 21s-8.5-5.2-8.5-11.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8.5 2.5C20.5 15.8 12 21 12 21z" fill={p.aceso ? C.perigo : C.neutro} />
    </svg>
  );
}

/** Placa de criatura: retrato à esquerda; nome, selo de tipo e o que vier à direita em cima; barra de HP com o número embaixo. */
function Placa(p: { jogo: Jogo; l: Lutador; altura: 56 | 48; retrato: 40 | 36; paraDireita: boolean; direita?: ComponentChildren }) {
  const j = p.jogo;
  const c = j.c;
  const l = p.l;
  const pct = Math.max(0, l.hp / l.hpMax);
  const atraso = Math.max(pct, j.visual(l).hpLag / l.hpMax);
  const tipos = especieDe(c, l).tipos;
  const buff = l.buff && !l.desmaiado ? `${SIGLA[l.buff.atributo]}+${l.buff.valor}` : null;
  return (
    <div style={`flex: none; height: ${p.altura}px; padding: 0 12px 0 ${p.altura === 56 ? 8 : 6}px; border-radius: 12px; background: ${C.painel}; box-shadow: ${DEGRAU}; display: flex; align-items: center; gap: 10px; min-width: 0`}>
      <span style={`flex: none; width: ${p.retrato}px; height: ${p.retrato}px; border-radius: 8px; background: ${C.fundo}; overflow: hidden`}>
        <RetratoChapado c={c} especie={l.especie} paraDireita={p.paraDireita} desmaiado={l.desmaiado} caixa={p.retrato} raio={8} />
      </span>
      <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px">
        <div style="height: 16px; display: flex; align-items: center; gap: 6px">
          <span style="font-weight: 700; font-size: 15px; line-height: 16px; letter-spacing: 0.3px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{j.nome(l)}</span>
          {tipos.map((t) => (
            <SeloTipo key={t} c={c} tipo={t} tam={SELO.lista} apagado={l.desmaiado} />
          ))}
          {buff && <span style={`flex: none; height: 16px; padding: 0 5px; border-radius: 4px; background: ${C.acento}; color: ${C.fundo}; font-size: 10px; line-height: 16px; font-weight: 700; letter-spacing: 0.5px`}>{buff}</span>}
          <span style="flex: 1" />
          {p.direita}
        </div>
        <div style="height: 12px; display: flex; align-items: center; gap: 8px">
          <span style={`position: relative; flex: 1; height: 8px; border-radius: 4px; background: ${C.degrau}; overflow: hidden`}>
            <span style={`position: absolute; left: 0; top: 0; bottom: 0; width: ${(atraso * 100).toFixed(1)}%; border-radius: 4px; background: ${rgba(C.perigo, 0.45)}`} />
            <span style={`position: absolute; left: 0; top: 0; bottom: 0; width: ${(pct * 100).toFixed(1)}%; border-radius: 4px; background: ${corVida(pct)}`} />
          </span>
          <span style={`flex: none; font-weight: 600; font-size: 12px; line-height: 12px; color: ${C.secundario}; font-variant-numeric: tabular-nums; white-space: nowrap`}>
            <b style={`font-weight: 700; color: ${C.texto}`}>{l.hp}</b>
            {`/${l.hpMax}`}
          </span>
        </div>
      </div>
    </div>
  );
}

/** A HUD por cima da arena: botão de pausa e placa do rival, com os corações das vidas dele. */
export function HudChapada({ jogo: j }: { jogo: Jogo }) {
  const rival = j.rival();
  const rivais = j.b.equipes[1].lutadores;
  const jogando = j.tela === 'jogo';
  const dePe = rivais.filter((l) => !l.desmaiado).length;
  return (
    <div style="position: absolute; left: 12px; right: 12px; top: 12px; display: flex; gap: 12px">
      <button
        type="button"
        aria-label="Pausar (Esc)"
        class="desce"
        onClick={() => j.pausar()}
        style={`flex: none; width: 56px; height: 56px; padding: 0; border: 0; border-radius: 12px; background: ${C.neutro}; box-shadow: 0 4px 0 ${C.neutroDegrau}; cursor: pointer; opacity: ${jogando ? 1 : 0.4}; display: flex; align-items: center; justify-content: center`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill={C.texto} aria-hidden="true">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      </button>
      <div style="flex: 1; min-width: 0; display: flex">
        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column">
          <Placa
            jogo={j}
            l={rival}
            altura={56}
            retrato={40}
            paraDireita={false}
            direita={
              <span role="img" aria-label={`Rival: ${dePe} de ${rivais.length} criaturas de pé`} style="flex: none; display: flex; gap: 2px; height: 16px; align-items: center">
                {rivais.map((l) => (
                  <Coracao key={l.uid} aceso={!l.desmaiado} />
                ))}
              </span>
            }
          />
        </div>
      </div>
    </div>
  );
}

/** Avisos por cima do campo: o nome do golpe, a dica de toque e a contagem "PRONTO?/JÁ!". */
export function AvisosChapados({ jogo: j }: { jogo: Jogo }) {
  const jogando = j.tela === 'jogo';
  return (
    <>
      {j.msgT > 0 && j.msg && jogando && (
        <div aria-live="polite" style="position: absolute; left: 0; right: 0; top: 76px; display: flex; justify-content: center; pointer-events: none">
          <span style={`padding: 8px 12px; border-radius: 8px; background: ${C.painel}; color: ${j.msgCor}; font-size: 14px; line-height: 14px; font-weight: 700; letter-spacing: 0.5px; box-shadow: ${DEGRAU}`}>{j.msg}</span>
        </div>
      )}
      {j.dicaVisivel && (
        <div style="position: absolute; left: 0; right: 0; bottom: 14px; display: flex; justify-content: center; pointer-events: none">
          <span style={`padding: 8px 12px; border-radius: 8px; background: ${rgba(C.painel, 0.92)}; color: ${C.texto}; font-size: 13px; line-height: 13px; font-weight: 600; box-shadow: 0 0 0 2px ${C.acento}`}>Toque na arena para mover</span>
        </div>
      )}
      {j.tela === 'pronto' && (
        <div style={`position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; background: ${rgba(C.fundo, 0.35)}`}>
          <span style={`font-size: 44px; line-height: 44px; font-weight: 700; letter-spacing: 2px; color: ${C.acento}; text-shadow: 0 4px 0 ${C.acentoDegrau}, 0 8px 0 ${C.degrau}`}>
            {j.prontoT > 0.55 ? 'PRONTO?' : 'JÁ!'}
          </span>
        </div>
      )}
    </>
  );
}

/** O painel de baixo: placa do jogador, time, táticas e golpes, separados por divisores. */
export function PainelChapado({ jogo: j }: { jogo: Jogo }) {
  const divisor = <div style={`flex: none; height: 1px; background: ${C.card}`} />;
  return (
    <div style="flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 12px 12px 24px">
      <Placa jogo={j} l={j.eu()} altura={48} retrato={36} paraDireita />
      {divisor}
      <Time jogo={j} />
      {divisor}
      <Taticas jogo={j} />
      {divisor}
      <Golpes jogo={j} />
    </div>
  );
}

function Taticas({ jogo: j }: { jogo: Jogo }) {
  return (
    <div role="radiogroup" aria-label="Tática de movimento" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px">
      {TATICAS.map(([id, rotulo]) => {
        const on = j.tatica === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on ? 'true' : 'false'}
            {...aoApertar(() => j.mudarTatica(id))}
            style={`height: 40px; padding: 0; border: 0; border-radius: 12px; background: ${on ? C.acento : C.neutro}; box-shadow: 0 4px 0 ${on ? C.acentoDegrau : C.neutroDegrau}; color: ${on ? C.fundo : C.texto}; font-family: inherit; font-weight: 700; font-size: 12px; line-height: 12px; letter-spacing: 0.5px; text-transform: uppercase; cursor: pointer; touch-action: none`}
          >
            {rotulo}
          </button>
        );
      })}
    </div>
  );
}

function Time({ jogo: j }: { jogo: Jogo }) {
  const c = j.c;
  const eq = j.b.equipes[0];
  const eu = j.eu();
  const rival = j.rival();
  const tiposRival = especieDe(c, rival).tipos;
  const podeTrocar = j.tela === 'jogo' && !eq.troca && eq.esperaTroca <= 0 && j.b.vencedor === null && eq.substituicao <= 0 && !eu.desmaiado;
  const dePe = eq.lutadores.filter((l) => !l.desmaiado).length;
  const estado = eq.troca ? 'Trocando…' : eq.esperaTroca > 0 ? `Troca em ${eq.esperaTroca.toFixed(1)}s` : '';
  return (
    <div style="display: flex; flex-direction: column; gap: 8px">
      <div style={`height: 12px; display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 11px; line-height: 12px; letter-spacing: 1px; color: ${C.secundario}; text-transform: uppercase`}>
        <span>Seu time · {dePe}{`/${eq.lutadores.length}`}</span>
        <span style={`color: ${eq.troca ? C.acento : C.secundario}`}>{estado}</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px">
        {eq.lutadores.map((l, i) => {
          const emCampo = i === eq.ativo;
          const pct = Math.max(0, l.hp / l.hpMax);
          const tipos = especieDe(c, l).tipos;
          const tipo = tipos[0] ?? '';
          const cor = c.tipos[tipo]?.cor ?? C.secundario;
          const vant = j.opcoes.assist && !l.desmaiado && !emCampo && !rival.desmaiado ? confronto(c, tipos, tiposRival) : 0;
          const nomeTipos = tipos.map((t) => c.tipos[t]?.nome.toUpperCase() ?? t).join('/');
          const aria = `${j.nome(l)} (${nomeTipos})${l.desmaiado ? ', desmaiado' : emCampo ? ', em campo' : `, HP ${l.hp} de ${l.hpMax}${vant > 0 ? ', vantagem' : vant < 0 ? ', desvantagem' : ''}`}`;
          const moldura = emCampo ? C.acento : C.neutro;
          const halo = emCampo ? `, 0 0 0 1px ${rgba(C.acento, 0.25)}` : '';
          return (
            <button
              key={l.uid}
              type="button"
              aria-label={aria}
              aria-pressed={emCampo ? 'true' : 'false'}
              aria-disabled={!l.desmaiado && !emCampo && podeTrocar ? undefined : 'true'}
              {...aoApertar(() => j.trocar(i))}
              style={`position: relative; height: 54px; padding: 0; border: 0; border-radius: 10px; background: #1f2537; box-shadow: ${DEGRAU}${halo}; overflow: hidden; cursor: pointer; touch-action: none`}
            >
              {!l.desmaiado && <span aria-hidden="true" style={`position: absolute; inset: 0; background: radial-gradient(circle at 50% 60%, ${rgba(cor, 0.38)} 0%, ${rgba(cor, 0)} 62%)`} />}
              <span aria-hidden="true" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center">
                <RetratoChapado c={c} especie={l.especie} paraDireita desmaiado={l.desmaiado} caixa={54} raio={0} />
              </span>
              <span aria-hidden="true" style="position: absolute; inset: 0; border-radius: 10px; box-shadow: inset 0 0 14px rgba(8,10,20,.75), inset 0 1px 0 rgba(255,255,255,.10)" />
              <span aria-hidden="true" style={`position: absolute; inset: 0; border-radius: 10px; box-shadow: inset 0 0 0 2px ${moldura}`} />
              {l.desmaiado && (
                <span aria-hidden="true" style={`position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; line-height: 11px; font-weight: 700; letter-spacing: 1px; color: ${C.perigo}`}>KO</span>
              )}
              <span aria-hidden="true" style="position: absolute; left: 6px; right: 6px; bottom: 5px; height: 4px; border-radius: 2px; background: rgba(15,19,32,.85); overflow: hidden">
                <span style={`display: block; height: 100%; width: ${(pct * 100).toFixed(0)}%; border-radius: 2px; background: ${corVida(pct)}`} />
              </span>
              <span aria-hidden="true" style="position: absolute; left: 4px; top: 4px; width: 14px; height: 14px; border-radius: 3px; box-shadow: 0 0 0 1.5px rgba(15,19,32,.6)">
                <SeloTipo c={c} tipo={tipo} tam={14} apagado={l.desmaiado} />
              </span>
              {vant !== 0 && (
                <span aria-hidden="true" style={`position: absolute; top: 3px; right: 3px; width: 14px; height: 14px; border-radius: 50%; background: ${vant > 0 ? C.vida : C.perigo}; box-shadow: 0 0 0 2px ${C.card}; display: flex; align-items: center; justify-content: center`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={C.fundo} stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="width: 8px; height: 8px; display: block">
                    <path d={vant > 0 ? 'M12 20V4M5 11l7-7 7 7' : 'M12 4v16M5 13l7 7 7-7'} />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Ícone do alcance do golpe: espada para corpo a corpo, alvo para golpe à distância. */
function IconeAlcance(p: { contato: boolean }) {
  return p.contato ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e6ebf5" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display: block">
      <path d="M4.5 19.5 19 5V3.5h-1.5L3 18M7 13.5l3.5 3.5M3.5 20.5l2-2" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" style="display: block">
      <path d="M12 9.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8z" fill="#e6ebf5" />
      <path d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17z" fill="none" stroke="#e6ebf5" stroke-width="2.6" />
    </svg>
  );
}

function IconeRecarga(p: { cor: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={p.cor} stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width: 10px; height: 10px; display: block; flex: none">
      <path d="M20 12a8 8 0 1 1-2.4-5.7M20.5 3.5v4.5H16" />
    </svg>
  );
}

const PASTILHA = `position: relative; flex: none; width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; overflow: hidden`;

function Golpes({ jogo: j }: { jogo: Jogo }) {
  const c = j.c;
  const eu = j.eu();
  const rival = j.rival();
  const eq = j.b.equipes[0];
  const v = j.visual(eu);
  return (
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">
      {eu.golpes.map((uso, i) => {
        const g = golpeDe(c, uso.id);
        const tipo = c.tipos[g.tipo];
        const cor = tipo?.cor ?? C.secundario;
        const escura = tipo?.projetil?.[0] ?? cor;
        const perfil = perfilDoGolpe(g);
        const recarregando = uso.recarga > 0;
        const naFila = eq.proximoGolpe === i;
        const recemUsado = (v.disparo[i] ?? 0) > 0;
        const total = recargaDe(c, g);
        const progresso = recarregando ? 1 - uso.recarga / total : 1;
        // Assistência: a eficácia contra o rival vira a mesma marca de vantagem (seta verde) ou desvantagem (seta
        // vermelha) das pastilhas do time, no canto do selo de tipo; o número exato fica no rótulo de acessibilidade.
        let ef: number | null = null;
        if (j.opcoes.assist && perfil.causaDano && !rival.desmaiado) {
          const valor = eficacia(c, g.tipo, especieDe(c, rival).tipos);
          if (valor !== 1) ef = valor;
        }
        const categoria = g.categoria ? c.categorias[g.categoria]?.nome : undefined;
        const alcance = perfil.contato ? 'perto' : 'longe';
        const aria = `Golpe ${i + 1}: ${g.nome}, ${tipo?.nome ?? g.tipo}${categoria ? `, ${categoria}` : ''}, ${perfil.causaDano ? `poder ${perfil.poder}` : 'defesa'}, ${alcance}, recarga ${total} s${ef !== null ? `, efeito x${ef}` : ''}${naFila ? ', próximo da fila' : recarregando ? `, recarregando, ${uso.recarga.toFixed(1)} s` : ', pronto'}`;
        const anel = recemUsado ? 'rgba(255,255,255,.7)' : naFila ? C.acento : 'rgba(255,255,255,.06)';
        return (
          <button
            key={i}
            type="button"
            class="desce"
            aria-label={aria}
            {...aoApertar(() => j.filaGolpe(i))}
            style={`position: relative; height: 72px; margin: 0; padding: 12px; border: 0; border-radius: 12px; background: #20233a; color: ${C.texto}; font-family: inherit; text-align: left; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; cursor: pointer; touch-action: none; box-shadow: 0 0 0 2px ${anel}, ${DEGRAU}`}
          >
            <span aria-hidden="true" style={`position: absolute; inset: 0; background: radial-gradient(110% 130% at 0% 100%, ${rgba(cor, 0.42)} 0%, ${rgba(escura, 0.18)} 52%, ${rgba(escura, 0)} 100%), linear-gradient(180deg, #2f384e 0%, #252c3f 100%)`} />
            {recarregando && <span aria-hidden="true" style={`position: absolute; inset: 0; background: ${C.espera}`} />}
            <span style={`position: relative; height: 20px; display: flex; align-items: center; gap: 8px; opacity: ${recarregando ? 0.42 : 1}`}>
              <span style="flex: 1; min-width: 0; font-size: 13.5px; line-height: 20px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{g.nome}</span>
              {perfil.causaDano ? (
                <span style={`flex: none; font-size: 20px; line-height: 20px; font-weight: 700; color: ${C.acento}; font-variant-numeric: tabular-nums`}>{perfil.poder}</span>
              ) : (
                <span style={`flex: none; font-size: 14px; line-height: 20px; font-weight: 700; letter-spacing: 1px; color: ${C.vida}`}>DEF</span>
              )}
            </span>
            <span style="position: relative; height: 22px; display: flex; align-items: center; gap: 4px">
              <span style="position: relative; flex: none; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center">
                <SeloTipo c={c} tipo={g.tipo} tam={SELO.card} />
                {recarregando && <span aria-hidden="true" style={`position: absolute; inset: 0; border-radius: ${(SELO.card * SELO.raio) / SELO.caixa}px; background: conic-gradient(rgba(8,9,16,.78) ${(360 * (1 - progresso)).toFixed(0)}deg, transparent 0)`} />}
                {ef !== null && (
                  <span aria-hidden="true" style={`position: absolute; top: -5px; right: -5px; width: 14px; height: 14px; border-radius: 50%; background: ${ef > 1 ? C.vida : C.perigo}; box-shadow: 0 0 0 2px #262c3f; display: flex; align-items: center; justify-content: center; opacity: ${recarregando ? 0.42 : 1}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={C.fundo} stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="width: 8px; height: 8px; display: block">
                      <path d={ef > 1 ? 'M12 20V4M5 11l7-7 7 7' : 'M12 4v16M5 13l7 7 7-7'} />
                    </svg>
                  </span>
                )}
              </span>
              {g.categoria && (
                <span style={`${PASTILHA}; background: rgba(15,19,32,.55); opacity: ${recarregando ? 0.42 : 1}`}>
                  <IconeCategoria categoria={g.categoria} tam={14} cor="#e6ebf5" />
                </span>
              )}
              <span style={`${PASTILHA}; background: rgba(15,19,32,.55); opacity: ${recarregando ? 0.42 : 1}`}>
                <IconeAlcance contato={perfil.contato} />
              </span>
              <span style="flex: 1" />
              <span style={`flex: none; display: flex; align-items: center; gap: 3px; font-size: 13px; line-height: 13px; font-weight: 700; font-variant-numeric: tabular-nums; color: ${recarregando ? C.acento : C.texto}`}>
                <IconeRecarga cor={recarregando ? C.acento : C.texto} />
                {recarregando ? `${uso.recarga.toFixed(1)}s` : `${total.toFixed(1)}s`}
              </span>
            </span>
            {recarregando && (
              <span aria-hidden="true" style={`position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: ${C.degrau}`}>
                <span style={`display: block; height: 100%; width: ${(progresso * 100).toFixed(1)}%; background: ${C.acento}`} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
