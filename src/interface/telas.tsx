// Telas por cima da arena: escolha, título, pausa, fim de batalha e ajuda.

import type { Jogo } from '../app/jogo';
import { confronto, eficacia, especieDe, type Lutador } from '../nucleo';
import { corHp, moldura } from './estilo';
import { GLIFOS } from './glifos';
import { IconePixel, IconeTipo, Retrato, Selos } from './pecas';

const BOTAO_VERDE = `border: 0; border-radius: 0; background: #a7f070; color: #1a1c2c; font-family: 'Press Start 2P', monospace; cursor: pointer; box-shadow: ${moldura('#f4f4f4', 'inset 0 -5px 0 0 #38b764')}`;
const BOTAO_VERDE_BRILHO = `border: 0; border-radius: 0; background: #a7f070; color: #1a1c2c; font-family: 'Press Start 2P', monospace; cursor: pointer; box-shadow: ${moldura('#f4f4f4', 'inset 0 -5px 0 0 #38b764, inset 0 2px 0 0 rgba(244,244,244,.5)')}`;
const BOTAO_CINZA = `border: 0; border-radius: 0; background: #262b44; color: #f4f4f4; font-family: inherit; font-size: 14px; line-height: 14px; font-weight: 700; letter-spacing: 1px; cursor: pointer; box-shadow: ${moldura('#333c57', 'inset 0 -4px 0 0 #1d2035')}`;
const BOTAO_VAZADO = `border: 0; border-radius: 0; background: transparent; color: #c0cbdc; font-family: inherit; font-size: 13px; line-height: 13px; font-weight: 700; letter-spacing: 1px; cursor: pointer; box-shadow: ${moldura('#333c57')}`;

export function Telas({ jogo: j }: { jogo: Jogo }) {
  const semAjuda = !j.ajuda;
  return (
    <>
      {j.tela === 'escolha' && semAjuda && <Escolha jogo={j} />}
      {j.tela === 'titulo' && semAjuda && <Titulo jogo={j} />}
      {j.tela === 'pausa' && semAjuda && <Pausa jogo={j} />}
      {j.tela === 'fim' && semAjuda && <Fim jogo={j} />}
      {j.ajuda && <Ajuda jogo={j} />}
    </>
  );
}

const nomeDosTipos = (j: Jogo, l: Lutador) =>
  especieDe(j.c, l).tipos.map((t) => j.c.tipos[t]?.nome.toUpperCase() ?? t).join('/');

function Escolha({ jogo: j }: { jogo: Jogo }) {
  const c = j.c;
  const eq = j.b.equipes[0];
  const rival = j.rival();
  const tiposRival = especieDe(c, rival).tipos;
  return (
    <>
      <div style="position: absolute; left: 0; right: 0; top: 0; height: 408px; background: rgba(12,13,22,.45); pointer-events: none" />
      <div role="dialog" aria-label="Escolha a próxima criatura" style="position: absolute; left: 0; right: 0; top: 408px; bottom: 0; box-sizing: border-box; padding: 18px 14px 16px; background: #141625; box-shadow: inset 0 2px 0 0 #ffcd75; display: flex; flex-direction: column; gap: 14px">
        <div style="display: flex; flex-direction: column; gap: 8px; padding: 0 2px">
          {/* Os textos são divididos em pedaços igual ao template original: a divisão muda o espaçamento entre letras. */}
          <span style="font-size: 12px; line-height: 12px; letter-spacing: 1px; color: #ef7d57">{j.caido} DESMAIOU</span>
          <span style="font-size: 18px; line-height: 18px; font-weight: 700">Quem entra contra {j.nome(rival).toUpperCase()}?</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px">
          {eq.lutadores.map((l, i) => {
            if (l.desmaiado || i === eq.ativo) return null;
            const pct = Math.max(0, l.hp / l.hpMax);
            const tipos = especieDe(c, l).tipos;
            const vant = rival.desmaiado ? 0 : confronto(c, tipos, tiposRival);
            const rotulo = vant > 0 ? 'VANTAGEM' : vant < 0 ? 'DESVANTAGEM' : 'NEUTRO';
            return (
              <button
                key={l.uid}
                type="button"
                class="desce hover-noite"
                onClick={() => j.trocar(i)}
                aria-label={`${j.nome(l)}, HP ${l.hp} de ${l.hpMax}, ${rotulo.toLowerCase()}`}
                style={`margin: 2px; height: 56px; padding: 0 12px 0 4px; border: 0; border-radius: 0; background: #1d2035; color: #f4f4f4; font-family: inherit; text-align: left; display: flex; align-items: center; gap: 12px; cursor: pointer; box-shadow: ${moldura('#333c57')}`}
              >
                <span style="flex: none; width: 48px; height: 48px; background: #252c52">
                  <Retrato c={c} especie={l.especie} paraDireita tam={24} />
                </span>
                <span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 9px">
                  <span style="display: flex; align-items: center; gap: 6px">
                    <span style="font-size: 15px; line-height: 15px; font-weight: 700; letter-spacing: .5px">{j.nome(l).toUpperCase()}</span>
                    <Selos c={c} tipos={tipos} apagado={false} tam={14} />
                  </span>
                  <span style="display: flex; align-items: center; gap: 8px">
                    <span style="flex: 1; display: block; height: 6px; background: #10121e">
                      <span style={`display: block; height: 6px; width: ${(pct * 100).toFixed(0)}%; background: ${corHp(pct)}`} />
                    </span>
                    <span style="flex: none; font-size: 12px; line-height: 12px; color: #c0cbdc">{`${l.hp}/${l.hpMax}`}</span>
                  </span>
                </span>
                <span style={`flex: none; width: 92px; text-align: center; padding: 4px 0; font-size: 12px; line-height: 12px; font-weight: 700; background: ${vant > 0 ? '#38b764' : vant < 0 ? '#b13e53' : '#262b44'}; color: ${vant > 0 ? '#1a1c2c' : vant < 0 ? '#f4f4f4' : '#c0cbdc'}`}>
                  {rotulo}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function Titulo({ jogo: j }: { jogo: Jogo }) {
  const c = j.c;
  const [time, rivais] = j.b.equipes;
  const quadro = (l: Lutador, rival: boolean) => (
    <span
      key={l.uid}
      role="img"
      aria-label={`${j.nome(l)} (${nomeDosTipos(j, l)})`}
      style={`position: relative; display: block; width: 52px; height: 52px; background: ${rival ? '#40203f' : '#252c52'}; box-shadow: ${moldura(rival ? '#5d275d' : '#333c57')}`}
    >
      <Retrato c={c} especie={l.especie} paraDireita={!rival} tam={26} />
      <span style="position: absolute; right: -4px; bottom: -4px; display: flex; gap: 2px">
        <Selos c={c} tipos={especieDe(c, l).tipos} apagado={false} tam={14} anel="#141625" />
      </span>
    </span>
  );
  return (
    <div style="position: absolute; inset: 0; display: flex; flex-direction: column">
      <div style="height: 72px; flex: none; background: #141625; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 -2px 0 0 #262b44">
        <span style="font-size: 13px; line-height: 13px; font-weight: 600; letter-spacing: 4px; color: #94b0c2">BRODERMON</span>
      </div>
      <div style="height: 336px; flex: none; box-sizing: border-box; padding-top: 24px; display: flex; flex-direction: column; align-items: center; gap: 12px; background: linear-gradient(180deg, rgba(20,22,37,.25) 0%, rgba(20,22,37,0) 45%, rgba(20,22,37,.75) 100%); pointer-events: none">
        <span style="font-family: 'Press Start 2P', monospace; font-size: 44px; line-height: 44px; color: #ffcd75; text-shadow: 0 4px 0 #b13e53, 4px 4px 0 #b13e53, 0 8px 0 #1a1c2c, 4px 8px 0 #1a1c2c">ARENA</span>
        <span style="padding: 7px 10px; background: #1a1c2c; font-size: 13px; line-height: 13px; font-weight: 700; letter-spacing: 2px; color: #f4f4f4">BATALHA EM TEMPO REAL</span>
      </div>
      <div style="flex: 1; box-sizing: border-box; padding: 22px 16px 20px; background: #141625; box-shadow: inset 0 2px 0 0 #2a2f4a; display: flex; flex-direction: column; justify-content: space-between">
        <div style="display: flex; flex-direction: column; gap: 22px">
          <div style="display: flex; flex-direction: column; gap: 12px">
            <div style="display: flex; justify-content: space-between; font-size: 12px; line-height: 12px; letter-spacing: 1px">
              <span style="color: #94b0c2">SEU TIME</span>
              <span style="color: #c0cbdc">{`${time.lutadores.length} CRIATURAS`}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px">{time.lutadores.map((l) => quadro(l, false))}</div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px">
            <div style="display: flex; justify-content: space-between; font-size: 12px; line-height: 12px; letter-spacing: 1px">
              <span style="color: #94b0c2">RIVAL</span>
              <span style="color: #c0cbdc">{rivais.lutadores.length} CRIATURAS</span>
            </div>
            <div style="display: flex; gap: 10px; padding: 2px">{rivais.lutadores.map((l) => quadro(l, true))}</div>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 14px">
          <button type="button" class="desce hover-brilho" onClick={() => j.comecar()} style={`margin: 2px; height: 58px; padding: 0 20px; font-size: 16px; line-height: 16px; ${BOTAO_VERDE_BRILHO}`}>
            BATALHAR
          </button>
          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">
            <button type="button" class="desce hover-ardosia" onClick={() => j.abrirAjuda('como')} style={`margin: 2px; height: 46px; padding: 0 12px; ${BOTAO_CINZA}`}>
              COMO JOGAR
            </button>
            <button type="button" class="desce hover-ardosia" onClick={() => j.abrirAjuda('tipos')} style={`margin: 2px; height: 46px; padding: 0 12px; ${BOTAO_CINZA}`}>
              TABELA DE TIPOS
            </button>
          </div>
          <span style="text-align: center; font-size: 12px; line-height: 16px; color: #94b0c2">Teclado: WASD move · 1–4 golpes · Esc pausa</span>
        </div>
      </div>
    </div>
  );
}

function Pausa({ jogo: j }: { jogo: Jogo }) {
  const [time, rivais] = j.b.equipes;
  const meus = time.lutadores.filter((l) => !l.desmaiado).length;
  const deles = rivais.lutadores.filter((l) => !l.desmaiado).length;
  return (
    <div role="dialog" aria-label="Pausa" style="position: absolute; inset: 0; background: rgba(12,13,22,.88); display: flex; align-items: center; justify-content: center">
      <div style={`width: 300px; margin: 2px; box-sizing: border-box; padding: 26px 20px 20px; background: #1a1c2c; box-shadow: ${moldura('#333c57')}; display: flex; flex-direction: column; gap: 12px`}>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; padding-bottom: 10px">
          <span style="font-family: 'Press Start 2P', monospace; font-size: 22px; line-height: 22px; color: #f4f4f4; text-shadow: 3px 3px 0 #333c57">PAUSA</span>
          <span style="font-size: 13px; line-height: 13px; color: #94b0c2">
            {`Seu time ${meus}/${time.lutadores.length} · Rival ${deles}/${rivais.lutadores.length}`}
          </span>
        </div>
        <button type="button" class="desce" onClick={() => j.continuar()} style={`margin: 2px; height: 52px; font-size: 14px; line-height: 14px; ${BOTAO_VERDE}`}>
          CONTINUAR
        </button>
        <button type="button" class="desce hover-ardosia" onClick={() => j.abrirAjuda('como')} style={`margin: 2px; height: 44px; ${BOTAO_CINZA}`}>
          COMO JOGAR
        </button>
        <button type="button" class="desce hover-ardosia" onClick={() => j.abrirAjuda('tipos')} style={`margin: 2px; height: 44px; ${BOTAO_CINZA}`}>
          TABELA DE TIPOS
        </button>
        <button type="button" class="desce hover-ardosia" onClick={() => j.alternarSom()} aria-pressed={j.prefs.mudo ? 'false' : 'true'} style={`margin: 2px; height: 44px; ${BOTAO_CINZA}`}>
          {j.prefs.mudo ? 'SOM: DESLIGADO' : 'SOM: LIGADO'}
        </button>
        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">
          <button type="button" class="desce hover-claro" onClick={() => j.comecar()} style={`margin: 2px; height: 44px; ${BOTAO_VAZADO}`}>
            RECOMEÇAR
          </button>
          <button type="button" class="desce hover-claro" onClick={() => j.irParaMenu()} style={`margin: 2px; height: 44px; ${BOTAO_VAZADO}`}>
            SAIR
          </button>
        </div>
      </div>
    </div>
  );
}

function Fim({ jogo: j }: { jogo: Jogo }) {
  const c = j.c;
  const [time, rivais] = j.b.equipes;
  const venceu = j.b.vencedor === 0;
  const meus = time.lutadores.filter((l) => !l.desmaiado).length;
  const deles = rivais.lutadores.filter((l) => !l.desmaiado).length;
  const seg = Math.floor(j.b.tempo);
  const dano = time.lutadores.reduce((s, l) => s + l.danoCausado, 0);
  const destaque = j.destaque();
  const numero = (rotulo: string, valor: string) => (
    <div style={`margin: 2px; padding: 14px 12px; background: #1a1c2c; box-shadow: ${moldura('#333c57')}; display: flex; flex-direction: column; gap: 10px`}>
      <span style="font-size: 12px; line-height: 12px; letter-spacing: 1px; color: #94b0c2">{rotulo}</span>
      <span style="font-size: 22px; line-height: 22px; font-weight: 700">{valor}</span>
    </div>
  );
  return (
    <div role="dialog" aria-label="Fim da batalha" style="position: absolute; inset: 0; box-sizing: border-box; padding: 40px 20px 28px; background: #141625; display: flex; flex-direction: column; justify-content: space-between">
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 30px; padding-bottom: 24px">
        <div style="display: flex; flex-direction: column; align-items: center; gap: 18px; padding-bottom: 4px">
          <span style={`font-size: 48px; line-height: 48px; font-weight: 700; letter-spacing: 2px; color: ${venceu ? '#a7f070' : '#ef7d57'}; text-shadow: 0 4px 0 #333c57, 4px 4px 0 #333c57, 0 8px 0 #10121e, 4px 8px 0 #10121e`}>
            {venceu ? 'VITÓRIA!' : 'DERROTA'}
          </span>
          <span style="font-size: 15px; line-height: 15px; color: #c0cbdc">
            {venceu ? `${meus} de ${time.lutadores.length} criaturas ainda de pé` : 'Seu time inteiro desmaiou'}
          </span>
        </div>
        <div style="width: 100%; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px">
          {numero('TEMPO', `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`)}
          {numero('NOCAUTES', `${rivais.lutadores.length - deles}/${rivais.lutadores.length}`)}
          {numero('DANO', String(dano))}
        </div>
        <div style="width: 100%; display: flex; flex-direction: column; gap: 12px">
          <span style="font-size: 12px; line-height: 12px; letter-spacing: 1px; color: #94b0c2">SEU TIME</span>
          <div style="display: flex; justify-content: space-between; padding: 2px">
            {time.lutadores.map((l) => (
              <span
                key={l.uid}
                role="img"
                aria-label={`${j.nome(l)}${l.desmaiado ? ', desmaiado' : ', de pé'}`}
                style={`position: relative; display: block; width: 52px; height: 52px; background: ${l.desmaiado ? '#1d2035' : '#252c52'}; opacity: ${l.desmaiado ? '0.5' : '1'}; box-shadow: ${moldura(destaque === l ? '#ffcd75' : '#333c57')}`}
              >
                <Retrato c={c} especie={l.especie} paraDireita desmaiado={l.desmaiado} tam={26} />
              </span>
            ))}
          </div>
        </div>
        {destaque && (
          <div style={`width: 100%; box-sizing: border-box; margin: 2px; padding: 10px 14px 10px 10px; background: #1a1c2c; box-shadow: ${moldura('#ffcd75')}; display: flex; align-items: center; gap: 14px`}>
            <span style="flex: none; width: 48px; height: 48px; background: #2f3d7a">
              <Retrato c={c} especie={destaque.especie} paraDireita tam={24} />
            </span>
            <span style="flex: 1; display: flex; flex-direction: column; gap: 8px">
              <span style="font-size: 12px; line-height: 12px; letter-spacing: 1px; color: #ffcd75">DESTAQUE DA BATALHA</span>
              <span style="font-size: 16px; line-height: 16px; font-weight: 700">{j.nome(destaque).toUpperCase()}</span>
            </span>
            <span style="flex: none; font-size: 13px; line-height: 13px; color: #c0cbdc">{`${destaque.danoCausado} de dano`}</span>
          </div>
        )}
      </div>
      <div style="display: flex; flex-direction: column; gap: 12px">
        <button type="button" class="desce hover-brilho" onClick={() => j.comecar()} style={`margin: 2px; height: 58px; font-size: 16px; line-height: 16px; ${BOTAO_VERDE_BRILHO}`}>
          REVANCHE
        </button>
        <button type="button" class="desce hover-ardosia" onClick={() => j.irParaMenu()} style={`margin: 2px; height: 46px; ${BOTAO_CINZA}`}>
          MENU INICIAL
        </button>
      </div>
    </div>
  );
}

function Dica(p: { glifo: readonly string[]; cor: string; escala?: number; titulo: string; texto: string }) {
  return (
    <div style="display: flex; gap: 14px; align-items: flex-start">
      <span style={`flex: none; position: relative; width: 40px; height: 40px; margin: 2px; background: #262b44; box-shadow: ${moldura('#333c57')}`}>
        <IconePixel linhas={p.glifo} escala={p.escala ?? 3} cor={p.cor} left={5} top={5} />
      </span>
      <span style="display: flex; flex-direction: column; gap: 7px; padding-top: 2px">
        <span style="font-size: 15px; line-height: 15px; font-weight: 700; letter-spacing: .5px; color: #ffcd75">{p.titulo}</span>
        <span style="font-size: 14px; line-height: 19px; color: #c0cbdc; text-wrap: pretty">{p.texto}</span>
      </span>
    </div>
  );
}

/**
 * Rodapé da tabela de tipos. Com uma criatura de dois tipos no pacote, dá o exemplo de um golpe que faz 2x num
 * e 0.5x no outro (no protótipo: Pedrisco e fogo, como na Arena original). Sai num texto só, porque dividir o
 * texto muda o espaçamento entre as letras.
 */
function exemploDoisTipos(c: Jogo['c']): string {
  const base = 'Criaturas com dois tipos multiplicam os valores.';
  for (const e of Object.values(c.especies)) {
    const [a, b] = e.tipos;
    if (!a || !b) continue;
    for (const [id, t] of Object.entries(c.tipos)) {
      const fa = eficacia(c, id, [a]);
      const fb = eficacia(c, id, [b]);
      if (fa * fb !== 1 || fa === 1) continue;
      const nome = (x: string) => c.tipos[x]!.nome.toLowerCase();
      return `${base} ${e.nome} é ${nome(a)} e ${nome(b)}: ${t.nome.toLowerCase()} faz ${fa}x em ${nome(a)} e ${fb}x em ${nome(b)}, então causa dano normal (1x).`;
    }
  }
  return base;
}

function Ajuda({ jogo: j }: { jogo: Jogo }) {
  const c = j.c;
  const como = j.ajuda === 'como';
  const aba = (ativa: boolean) =>
    `margin: 2px; height: 36px; padding: 0 12px; border: 0; border-radius: 0; background: ${ativa ? '#f4f4f4' : 'transparent'}; color: ${ativa ? '#1a1c2c' : '#c0cbdc'}; font-family: inherit; font-size: 13px; line-height: 13px; font-weight: 700; letter-spacing: 1px; cursor: pointer; box-shadow: ${moldura('#333c57')}`;
  const tipos = Object.keys(c.tipos);
  return (
    <div role="dialog" aria-label="Ajuda" style="position: absolute; inset: 0; background: #141625; display: flex; flex-direction: column">
      <div style="height: 72px; flex: none; box-sizing: border-box; padding: 0 14px; display: flex; align-items: center; gap: 10px; box-shadow: inset 0 -2px 0 0 #262b44">
        <div role="tablist" style="flex: 1; display: flex; gap: 10px">
          <button type="button" role="tab" aria-selected={como ? 'true' : 'false'} onClick={() => j.abrirAjuda('como', false)} style={aba(como)}>
            COMO JOGAR
          </button>
          <button type="button" role="tab" aria-selected={como ? 'false' : 'true'} onClick={() => j.abrirAjuda('tipos', false)} style={aba(!como)}>
            TIPOS
          </button>
        </div>
        <button
          type="button"
          aria-label="Fechar (Esc)"
          class="desce"
          onClick={() => j.fecharAjuda()}
          style={`flex: none; position: relative; width: 40px; height: 40px; margin: 2px; padding: 0; border: 0; border-radius: 0; background: #262b44; cursor: pointer; box-shadow: ${moldura('#333c57', 'inset 0 -4px 0 0 #1d2035')}`}
        >
          <IconePixel linhas={GLIFOS['close']!} escala={2} cor="#f4f4f4" left={10} top={10} />
        </button>
      </div>

      <div style="flex: 1; min-height: 0; overflow-y: auto; box-sizing: border-box; padding: 20px 18px">
        {como ? (
          <div style="display: flex; flex-direction: column; gap: 18px">
            <Dica glifo={GLIFOS['target']!} cor="#ffcd75" escala={j.tela === 'jogo' ? 2 : 3} titulo="MOVA-SE" texto="Toque num ponto da arena e sua criatura vai até lá. Segure e arraste para guiar." />
            <Dica glifo={GLIFOS['golpe']!} cor="#73eff7" titulo="OS GOLPES SAEM SOZINHOS" texto="Cada golpe dispara quando recarrega e o rival está ao alcance. Toque num golpe para que ele seja o próximo." />
            <Dica glifo={GLIFOS['raio']!} cor="#ffcd75" titulo="TIPOS FAZEM DIFERENÇA" texto="O selo no golpe mostra o efeito contra o rival em campo: x2 é o dobro de dano, x0.5 a metade, x0 nada. Golpe do mesmo tipo da criatura causa 50% a mais." />
            <Dica glifo={GLIFOS['troca']!} cor="#a7f070" titulo="TROQUE NA HORA CERTA" texto="Toque numa criatura do time para trocar. Seta verde: vantagem contra o rival em campo; seta vermelha: desvantagem. Entre trocas, espere 3 segundos." />
            <Dica glifo={GLIFOS['perseguir']!} cor="#73eff7" titulo="ESCOLHA A TÁTICA" texto="Define como sua criatura se move quando você não está guiando: avançar, manter distância, ficar firme ou esquivar." />
            <div style={`margin: 2px; padding: 14px; background: #1a1c2c; box-shadow: ${moldura('#262b44')}; display: flex; flex-direction: column; gap: 10px`}>
              <span style="font-size: 12px; line-height: 12px; letter-spacing: 1px; color: #94b0c2">NO TECLADO</span>
              <span style="font-size: 14px; line-height: 20px; color: #c0cbdc">WASD ou setas movem · 1 a 4 escolhem o golpe · Shift + 1 a 6 troca · Esc pausa</span>
            </div>
          </div>
        ) : (
          <div style="display: flex; flex-direction: column; gap: 16px">
            <span style="font-size: 14px; line-height: 19px; color: #c0cbdc; text-wrap: pretty">Linha: tipo do golpe. Coluna: tipo de quem recebe.</span>
            <div style="display: flex; flex-direction: column; gap: 3px">
              <div style="display: flex; gap: 3px">
                <span style="flex: none; width: 86px" />
                {tipos.map((t) => (
                  <span key={t} role="img" aria-label={c.tipos[t]!.nome.toUpperCase()} style={`flex: 1; height: 30px; display: flex; align-items: center; justify-content: center; background: ${c.tipos[t]!.cor}`}>
                    <span style="position: relative; display: block; width: 18px; height: 18px">
                      <IconeTipo c={c} tipo={t} tam={18} escala={2} off={-1} />
                    </span>
                  </span>
                ))}
              </div>
              {tipos.map((a) => (
                <div key={a} style="display: flex; gap: 3px">
                  <span style={`flex: none; width: 86px; height: 30px; box-sizing: border-box; padding: 0 6px; display: flex; align-items: center; gap: 5px; background: ${c.tipos[a]!.cor}; color: #1a1c2c; font-size: 12px; line-height: 12px; font-weight: 700`}>
                    <span style="position: relative; flex: none; display: block; width: 12px; height: 12px">
                      <IconeTipo c={c} tipo={a} tam={12} escala={1} off={1} />
                    </span>
                    {c.tipos[a]!.nome.toUpperCase()}
                  </span>
                  {tipos.map((d) => {
                    const v = eficacia(c, a, [d]);
                    const [txt, fundo, cor] = v >= 2 ? ['2x', '#ffcd75', '#1a1c2c'] : v === 0 ? ['0x', '#b13e53', '#f4f4f4'] : v < 1 ? ['.5x', '#333c57', '#c0cbdc'] : ['', '#1d2035', '#1d2035'];
                    return (
                      <span key={d} style={`flex: 1; height: 30px; display: flex; align-items: center; justify-content: center; background: ${fundo}; color: ${cor}; font-size: 12px; line-height: 12px; font-weight: 700`}>
                        {txt}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
            <div style="display: flex; gap: 14px; flex-wrap: wrap; font-size: 13px; line-height: 13px; color: #c0cbdc">
              <span style="display: flex; align-items: center; gap: 6px">
                <span style="padding: 3px 4px; background: #ffcd75; color: #1a1c2c; font-weight: 700; font-size: 12px; line-height: 12px">2x</span>super eficaz
              </span>
              <span style="display: flex; align-items: center; gap: 6px">
                <span style="padding: 3px 4px; background: #333c57; color: #c0cbdc; font-weight: 700; font-size: 12px; line-height: 12px">.5x</span>pouco eficaz
              </span>
              <span style="display: flex; align-items: center; gap: 6px">
                <span style="padding: 3px 4px; background: #b13e53; color: #f4f4f4; font-weight: 700; font-size: 12px; line-height: 12px">0x</span>sem efeito
              </span>
            </div>
            <span style="font-size: 14px; line-height: 19px; color: #c0cbdc; text-wrap: pretty">
              {exemploDoisTipos(c)}
            </span>
          </div>
        )}
      </div>

      <div style="flex: none; padding: 14px 16px 18px; box-shadow: inset 0 2px 0 0 #262b44">
        <button type="button" class="desce" onClick={() => j.fecharAjuda()} style={`width: calc(100% - 4px); margin: 2px; height: 52px; font-size: 14px; line-height: 14px; ${BOTAO_VERDE}`}>
          ENTENDI
        </button>
      </div>
    </div>
  );
}
