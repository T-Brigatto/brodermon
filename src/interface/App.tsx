// A tela da Arena (390×844), porte do template de `design/Arena.dc.html`.
// Lê o estado do `Jogo` e manda as ações de volta para ele; não guarda regra nenhuma.

import { useEffect, useState } from 'preact/hooks';
import type { Jogo } from '../app/jogo';
import { confronto, eficacia, especieDe, golpeDe, perfilDoGolpe, recargaDe, type Lutador, type Tatica } from '../nucleo';
import { descricaoGolpe } from './descricao';
import { aoApertar, corHp, moldura } from './estilo';
import { GLIFOS } from './glifos';
import { BarraHp, IconePixel, Retrato, SeloTipo, Selos } from './pecas';
import { Telas } from './telas';

const SIGLA = { ataque: 'ATQ', defesa: 'DEF', velocidade: 'VEL' } as const;

const TATICAS: [Tatica, string, string][] = [
  ['perseguir', 'AVANÇAR', 'Vai pra cima e luta de perto.'],
  ['manter', 'DISTÂNCIA', 'Fica a meia distância e ataca de longe.'],
  ['parado', 'FIRME', 'Não se move; ataca o que estiver ao alcance.'],
  ['evasivo', 'ESQUIVAR', 'Foge do rival e ataca quando dá.'],
];

/** Escala inteira (ou de meio em meio) quando sobra espaço, para o pixel art não borrar. */
function medirTela(): { escala: number; K: number } {
  const w = innerWidth;
  const h = innerHeight;
  let s = Math.min(w / 390, h / 844);
  s = s >= 1 ? Math.max(1, Math.floor(s * 2) / 2) : s;
  const K = Math.max(2, Math.min(4, Math.ceil((devicePixelRatio || 1) * s - 0.01)));
  return { escala: s, K };
}

export function App({ jogo, aoCanvas }: { jogo: Jogo; aoCanvas: (el: HTMLCanvasElement | null) => void }) {
  const [, redesenhar] = useState(0);
  const [tela, setTela] = useState(medirTela);
  useEffect(() => jogo.assinar(() => redesenhar((n) => n + 1)), [jogo]);
  useEffect(() => {
    const aoMudar = () => setTela(medirTela());
    addEventListener('resize', aoMudar);
    return () => removeEventListener('resize', aoMudar);
  }, []);

  const j = jogo;
  const c = j.c;
  const eu = j.eu();
  const rival = j.rival();
  const eq = j.b.equipes[0];
  const rivais = j.b.equipes[1].lutadores;
  const jogando = j.tela === 'jogo';

  const cartao = (l: Lutador) => {
    const pct = Math.max(0, l.hp / l.hpMax);
    return {
      nome: j.nome(l).toUpperCase(),
      tipos: especieDe(c, l).tipos,
      pct,
      atraso: Math.max(pct, j.visual(l).hpLag / l.hpMax),
      cor: corHp(pct),
      texto: `${l.hp}/${l.hpMax}`,
      buff: l.buff && !l.desmaiado ? `${SIGLA[l.buff.atributo]}+${l.buff.valor}` : null,
    };
  };
  const E = cartao(rival);
  const P = cartao(eu);
  const rivaisDePe = rivais.filter((l) => !l.desmaiado).length;
  const tatica = TATICAS.find((t) => t[0] === j.tatica) ?? TATICAS[0]!;

  return (
    <div style="position: relative; width: 100vw; height: 100dvh; background: #0c0d16; display: flex; align-items: center; justify-content: center; overflow: hidden">
      <div
        data-screen-label="Arena"
        style={`position: relative; flex: none; width: 390px; height: 844px; overflow: hidden; background: #141625; display: flex; flex-direction: column; font-family: 'Pixelify Sans', monospace; color: #f4f4f4; -webkit-font-smoothing: none; user-select: none; -webkit-user-select: none; touch-action: manipulation; transform: scale(${tela.escala}); transform-origin: center center`}
      >
        {/* Rival */}
        <div style="height: 72px; flex: none; box-sizing: border-box; padding: 0 12px; display: flex; align-items: center; gap: 12px; background: #141625; box-shadow: inset 0 -2px 0 0 #262b44">
          <button
            type="button"
            aria-label="Pausar (Esc)"
            class="desce"
            onClick={() => j.pausar()}
            style={`flex: none; width: 40px; height: 40px; margin: 2px; padding: 0; border: 0; border-radius: 0; background: #262b44; cursor: pointer; opacity: ${jogando ? 1 : 0.4}; display: flex; align-items: center; justify-content: center; gap: 4px; box-shadow: ${moldura('#333c57', 'inset 0 -4px 0 0 #1d2035')}`}
          >
            <span style="display: block; width: 4px; height: 14px; background: #f4f4f4" />
            <span style="display: block; width: 4px; height: 14px; background: #f4f4f4" />
          </button>
          <span style={`flex: none; width: 48px; height: 48px; margin: 2px; background: #40203f; box-shadow: ${moldura('#5d275d')}`}>
            <Retrato c={c} especie={rival.especie} paraDireita={false} desmaiado={rival.desmaiado} tam={24} />
          </span>
          <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 9px">
            <div style="display: flex; align-items: center; gap: 6px; height: 18px">
              <span style="font-size: 16px; line-height: 16px; font-weight: 700; letter-spacing: .5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{E.nome}</span>
              <Selos c={c} tipos={E.tipos} apagado={rival.desmaiado} tamPixel={16} />
              {E.buff && <span style="flex: none; font-size: 12px; line-height: 12px; font-weight: 700; padding: 2px 4px; background: #ffcd75; color: #1a1c2c">{E.buff}</span>}
              <span style="flex: 1" />
              <span role="img" aria-label={`Rival: ${rivaisDePe} de ${rivais.length} criaturas de pé`} style="flex: none; display: flex; gap: 4px">
                {rivais.map((l, i) => {
                  const fundo = l.desmaiado ? '#262b44' : (c.tipos[especieDe(c, l).tipos[0]!]?.cor ?? '#94b0c2');
                  const borda = i === j.b.equipes[1].ativo && !l.desmaiado ? '#ffcd75' : '#10121e';
                  return (
                    <span
                      key={l.uid}
                      style={`display: block; width: 10px; height: 10px; margin: 1px; background: ${fundo}; box-shadow: 0 0 0 1px ${borda}, inset -2px -2px 0 0 rgba(26,28,44,.35), inset 2px 2px 0 0 rgba(244,244,244,.35)`}
                    />
                  );
                })}
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px">
              <BarraHp pct={E.pct} atraso={E.atraso} cor={E.cor} />
              <span style="flex: none; min-width: 52px; text-align: right; font-size: 12px; line-height: 12px; color: #c0cbdc">{E.texto}</span>
            </div>
          </div>
        </div>

        {/* Arena */}
        <div style="position: relative; flex: none; width: 390px; height: 336px">
          <canvas
            ref={aoCanvas}
            width={390 * tela.K}
            height={336 * tela.K}
            role="img"
            aria-label="Arena de batalha. Toque para mover sua criatura."
            onPointerDown={(ev) => {
              if (j.tela !== 'jogo') return;
              ev.preventDefault();
              const el = ev.currentTarget;
              try {
                el.setPointerCapture(ev.pointerId);
              } catch {
                // o ponteiro já foi solto
              }
              j.tocarArena(ev.clientX, ev.clientY, el.getBoundingClientRect(), true);
            }}
            onPointerMove={(ev) => {
              if (j.tocando) j.tocarArena(ev.clientX, ev.clientY, ev.currentTarget.getBoundingClientRect(), false);
            }}
            onPointerUp={() => j.soltarArena()}
            onPointerCancel={() => j.soltarArena()}
            style="display: block; width: 390px; height: 336px; touch-action: none; cursor: crosshair"
          />
          {j.msgT > 0 && j.msg && jogando && (
            <div aria-live="polite" style="position: absolute; left: 0; right: 0; top: 14px; display: flex; justify-content: center; pointer-events: none">
              <span style={`margin: 2px; padding: 8px 12px; background: #1a1c2c; color: ${j.msgCor}; font-size: 14px; line-height: 14px; font-weight: 700; letter-spacing: .5px; box-shadow: ${moldura('#333c57')}`}>{j.msg}</span>
            </div>
          )}
          {j.dicaVisivel && (
            <div style="position: absolute; left: 0; right: 0; bottom: 14px; display: flex; justify-content: center; pointer-events: none">
              <span style={`margin: 2px; padding: 8px 12px 8px 10px; display: flex; align-items: center; gap: 8px; background: rgba(26,28,44,.9); color: #f4f4f4; font-size: 13px; line-height: 13px; font-weight: 600; box-shadow: ${moldura('#ffcd75')}`}>
                <span style="position: relative; display: block; width: 16px; height: 16px">
                  <IconePixel linhas={GLIFOS['target']!} escala={2} cor="#ffcd75" left={-2} top={-2} />
                </span>
                Toque na arena para mover
              </span>
            </div>
          )}
          {j.tela === 'pronto' && (
            <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; background: rgba(20,22,37,.35)">
              <span style="font-size: 44px; line-height: 44px; font-weight: 700; letter-spacing: 2px; color: #ffcd75; text-shadow: 0 4px 0 #b13e53, 4px 4px 0 #b13e53, 0 8px 0 #1a1c2c, 4px 8px 0 #1a1c2c">
                {j.prontoT > 0.55 ? 'PRONTO?' : 'JÁ!'}
              </span>
            </div>
          )}
        </div>

        {/* Painel do jogador */}
        <div style="flex: 1; min-height: 0; display: flex; flex-direction: column; background: #1a1c2c; box-shadow: inset 0 2px 0 0 #2a2f4a">
          <div style="height: 72px; flex: none; box-sizing: border-box; padding: 0 12px; display: flex; align-items: center; gap: 12px">
            <span style={`flex: none; width: 48px; height: 48px; margin: 2px; background: #2f3d7a; box-shadow: ${moldura('#3b5dc9')}`}>
              <Retrato c={c} especie={eu.especie} paraDireita desmaiado={eu.desmaiado} tam={24} />
            </span>
            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 9px">
              <div style="display: flex; align-items: center; gap: 6px; height: 18px">
                <span style="font-size: 16px; line-height: 16px; font-weight: 700; letter-spacing: .5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{P.nome}</span>
                <Selos c={c} tipos={P.tipos} apagado={eu.desmaiado} tamPixel={16} />
                {P.buff && <span style="flex: none; font-size: 12px; line-height: 12px; font-weight: 700; padding: 2px 4px; background: #ffcd75; color: #1a1c2c">{P.buff}</span>}
                <span style="flex: 1" />
                <span style="flex: none; font-size: 12px; line-height: 12px; letter-spacing: 1px; color: #ffcd75">VOCÊ</span>
              </div>
              <div style="display: flex; align-items: center; gap: 10px">
                <BarraHp pct={P.pct} atraso={P.atraso} cor={P.cor} />
                <span style="flex: none; min-width: 52px; text-align: right; font-size: 12px; line-height: 12px; color: #c0cbdc">{P.texto}</span>
              </div>
            </div>
          </div>

          <div style="flex: 1; min-height: 0; box-sizing: border-box; padding: 4px 12px 18px; display: flex; flex-direction: column; justify-content: space-between">
            <Golpes jogo={j} />
            <Time jogo={j} />
            <div style="display: flex; flex-direction: column; gap: 12px">
              <div style="display: flex; gap: 10px; align-items: center; height: 12px; font-size: 12px; line-height: 12px">
                <span style="flex: none; color: #94b0c2; letter-spacing: 1px">TÁTICA</span>
                <span style="min-width: 0; color: #c0cbdc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{tatica[2]}</span>
              </div>
              <div role="radiogroup" aria-label="Tática de movimento" style={`margin: 2px; height: 40px; display: flex; background: #141625; box-shadow: ${moldura('#2a2f4a')}`}>
                {TATICAS.map(([id, rotulo]) => {
                  const on = j.tatica === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={on ? 'true' : 'false'}
                      {...aoApertar(() => j.mudarTatica(id))}
                      style={`flex: 1; min-width: 0; padding: 0; border: 0; border-radius: 0; display: flex; align-items: center; justify-content: center; gap: 6px; font-family: inherit; font-size: 12px; line-height: 12px; font-weight: 700; letter-spacing: .5px; color: ${on ? '#1a1c2c' : '#c0cbdc'}; background: ${on ? '#73eff7' : 'transparent'}; cursor: pointer; touch-action: none`}
                    >
                      <span style="position: relative; flex: none; display: block; width: 8px; height: 8px">
                        <IconePixel linhas={GLIFOS[id]!} escala={1} cor={on ? '#1a1c2c' : '#94b0c2'} left={-1} top={-1} />
                      </span>
                      {rotulo}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <Telas jogo={j} />
      </div>
    </div>
  );
}

function Golpes({ jogo: j }: { jogo: Jogo }) {
  const c = j.c;
  const eu = j.eu();
  const rival = j.rival();
  const eq = j.b.equipes[0];
  const v = j.visual(eu);
  return (
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 2px">
      {eu.golpes.map((uso, i) => {
        const g = golpeDe(c, uso.id);
        const tipo = c.tipos[g.tipo];
        const cor = tipo?.cor ?? '#94b0c2';
        const recarregando = uso.recarga > 0;
        const naFila = eq.proximoGolpe === i;
        let selo: [string, string, string] | null = null;
        if (j.opcoes.assist && perfilDoGolpe(g).causaDano && !rival.desmaiado) {
          const ef = eficacia(c, g.tipo, especieDe(c, rival).tipos);
          if (ef >= 4) selo = ['x4', '#ffcd75', '#1a1c2c'];
          else if (ef >= 2) selo = ['x2', '#ffcd75', '#1a1c2c'];
          else if (ef === 0) selo = ['x0', '#b13e53', '#f4f4f4'];
          else if (ef < 1) selo = [`x${ef}`, '#333c57', '#c0cbdc'];
        }
        const meta = descricaoGolpe(g, c);
        // Tipo de cor branca (normal) usaria a mesma borda do "golpe recém-usado"; vira cinza.
        const bordaTipo = cor === '#f4f4f4' ? '#94b0c2' : cor;
        const borda = (v.disparo[i] ?? 0) > 0 ? '#f4f4f4' : naFila ? '#ffcd75' : recarregando ? '#333c57' : bordaTipo;
        const estado = naFila ? 'PRÓXIMO' : recarregando ? `${uso.recarga.toFixed(1)}s` : '';
        const progresso = recarregando ? (1 - uso.recarga / recargaDe(c, g)) * 100 : 100;
        const categoria = g.categoria ? c.categorias[g.categoria]?.nome : undefined;
        const aria = `Golpe ${i + 1}: ${g.nome}, ${tipo?.nome ?? g.tipo}${categoria ? `, ${categoria}` : ''}, ${meta}${selo ? `, efeito ${selo[0]}` : ''}${naFila ? ', próximo da fila' : recarregando ? ', recarregando' : ', pronto'}`;
        return (
          <button
            key={i}
            type="button"
            class="desce"
            aria-label={aria}
            {...aoApertar(() => j.filaGolpe(i))}
            style={`position: relative; height: 66px; margin: 0; padding: 10px 10px 0; border: 0; border-radius: 0; background: ${recarregando ? '#1d2035' : (tipo?.fundo ?? '#30344d')}; color: #f4f4f4; font-family: inherit; text-align: left; display: flex; flex-direction: column; gap: 9px; cursor: pointer; touch-action: none; box-shadow: ${moldura(borda)}`}
          >
            <span style="display: flex; align-items: center; gap: 10px; height: 22px; width: 100%">
              <SeloTipo c={c} tipo={g.tipo} tam={22} apagado={recarregando} categoria={g.categoria} filete={recarregando ? '#1d2035' : (tipo?.fundo ?? '#30344d')} />
              <span style={`flex: 1; min-width: 0; font-size: 15px; line-height: 16px; font-weight: 700; letter-spacing: .5px; color: ${recarregando ? '#94b0c2' : '#f4f4f4'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis`}>
                {g.nome.toUpperCase()}
              </span>
              {selo && <span style={`flex: none; font-size: 12px; line-height: 12px; font-weight: 700; padding: 3px 4px; background: ${selo[1]}; color: ${selo[2]}`}>{selo[0]}</span>}
            </span>
            <span style="display: flex; align-items: center; justify-content: space-between; gap: 6px; width: 100%; font-size: 12px; line-height: 12px">
              <span style={`color: ${recarregando ? '#94b0c2' : '#c0cbdc'}; white-space: nowrap`}>{meta}</span>
              <span style={`color: ${naFila ? '#ffcd75' : '#f4f4f4'}; font-weight: 700; white-space: nowrap`}>{estado}</span>
            </span>
            <span style="position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: #10121e">
              <span style={`display: block; height: 4px; width: ${progresso.toFixed(1)}%; background: ${recarregando ? '#566c86' : naFila ? '#ffcd75' : cor}`} />
            </span>
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
  let aviso = 'TOQUE PARA TROCAR';
  let corAviso = '#c0cbdc';
  if (eq.troca) {
    aviso = 'TROCANDO…';
    corAviso = '#ffcd75';
  } else if (eq.esperaTroca > 0) {
    aviso = `TROCA EM ${eq.esperaTroca.toFixed(1)}s`;
    corAviso = '#94b0c2';
  }
  return (
    <div style="display: flex; flex-direction: column; gap: 12px">
      <div style="display: flex; justify-content: space-between; align-items: center; height: 12px; font-size: 12px; line-height: 12px">
        {/* Pedaços de texto iguais aos do template original ("SEU TIME · ", n, "/6"): a divisão muda o espaçamento entre letras */}
        <span style="color: #94b0c2; letter-spacing: 1px">SEU TIME · {dePe}{`/${eq.lutadores.length}`}</span>
        <span style={`color: ${corAviso}; letter-spacing: .5px`}>{aviso}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 2px 2px 6px">
        {eq.lutadores.map((l, i) => {
          const emCampo = i === eq.ativo;
          const pct = Math.max(0, l.hp / l.hpMax);
          const pode = !l.desmaiado && !emCampo && podeTrocar;
          const tipos = especieDe(c, l).tipos;
          const vant = j.opcoes.assist && !l.desmaiado && !emCampo && !rival.desmaiado ? confronto(c, tipos, tiposRival) : 0;
          const borda = emCampo ? '#ffcd75' : l.desmaiado ? '#262b44' : '#333c57';
          const nomeTipos = tipos.map((t) => c.tipos[t]?.nome.toUpperCase() ?? t).join('/');
          const aria = `${j.nome(l)} (${nomeTipos})${l.desmaiado ? ', desmaiado' : emCampo ? ', em campo' : `, HP ${l.hp} de ${l.hpMax}${vant > 0 ? ', vantagem' : vant < 0 ? ', desvantagem' : ''}`}`;
          return (
            <button
              key={l.uid}
              type="button"
              aria-label={aria}
              {...aoApertar(() => j.trocar(i))}
              style={`display: flex; flex-direction: column; gap: 8px; width: 52px; padding: 0; border: 0; border-radius: 0; background: transparent; cursor: pointer; touch-action: none; opacity: ${l.desmaiado ? '0.55' : emCampo || pode || j.tela !== 'jogo' ? '1' : '0.6'}; transform: translateY(${emCampo ? '-4px' : '0px'})`}
            >
              <span style={`position: relative; display: block; width: 52px; height: 52px; background: ${l.desmaiado ? '#1d2035' : emCampo ? '#2f3d7a' : '#252c52'}; box-shadow: ${moldura(borda, '0 6px 0 0 #10121e')}`}>
                <Retrato c={c} especie={l.especie} paraDireita desmaiado={l.desmaiado} tam={26} />
                <span style="position: absolute; right: -4px; bottom: -4px; display: flex; gap: 2px">
                  <Selos c={c} tipos={tipos} apagado={l.desmaiado} tamPixel={14} anel="#1a1c2c" />
                </span>
                {vant !== 0 && (
                  <span aria-hidden="true" style={`position: absolute; left: -4px; top: -4px; width: 16px; height: 12px; background: #1a1c2c; box-shadow: 0 0 0 2px ${vant > 0 ? '#38b764' : '#b13e53'}`}>
                    <IconePixel linhas={GLIFOS[vant > 0 ? 'up' : 'down']!} escala={2} cor={vant > 0 ? '#a7f070' : '#ef7d57'} left={1} top={1} />
                  </span>
                )}
                {l.desmaiado && (
                  <span style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 13px; line-height: 13px; font-weight: 700; color: #ef7d57">KO</span>
                )}
              </span>
              <span style="display: block; width: 52px; height: 4px; background: #262b44">
                <span style={`display: block; height: 4px; width: ${(pct * 100).toFixed(0)}%; background: ${corHp(pct)}`} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
