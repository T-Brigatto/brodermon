// Peças pequenas reaproveitadas pelas telas: ícone de pixel, selo de tipo, retrato e barra de HP.

import { useEffect, useRef } from 'preact/hooks';
import type { Conteudo } from '../conteudo/esquema';
import { pintarRetrato } from '../desenho/sprites';
import { ICONE_PADRAO, SELO, SELO_CATEGORIA, sombraIcone } from './estilo';
import { GLIFOS_TIPOS } from './glifos-tipos';

export function IconePixel(p: { linhas: readonly string[]; escala: number; cor: string; left: number; top: number }) {
  return (
    <span
      style={`position: absolute; left: ${p.left}px; top: ${p.top}px; width: ${p.escala}px; height: ${p.escala}px; box-shadow: ${sombraIcone(p.linhas, p.escala, p.cor)}`}
    />
  );
}

/** Glifo 5a de um tipo (`design/icones/tipos/`), com `tam` px de lado, centrado no pai; null se o tipo não tiver SVG. */
/**
 * Ícones de categoria do golpe, opção 6b do Claude Design (`design/icones/categorias/`): Físico = garras,
 * Mágico = projétil, Especial = chevrons. Os traçados são os mesmos dos SVGs, numa caixa de 24×24.
 */
const CATEGORIAS_6B: Record<string, { cheio?: string; traco?: string; largura?: number }> = {
  fisico: { traco: 'M8 3C7 8 5.5 12 3 16M14 3c-1 6-2.5 11-5.5 16M20 3c-1 5-2.5 9-5 13', largura: 3.2 },
  magico: { cheio: 'M16.5 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z', traco: 'M2 12h8M4 7.5h6.5M4 16.5h6.5', largura: 2.6 },
  especial: { cheio: 'M3 10.5 12 3l9 7.5V15L12 7.5 3 15zM3 18.5 12 11l9 7.5V23L12 15.5 3 23z' },
};

/** Os `<path>` do ícone 6b, na caixa de 24×24, na cor dada. */
function CaminhosCategoria(p: { categoria: string; cor: string }) {
  const d = CATEGORIAS_6B[p.categoria];
  if (!d) return null;
  return (
    <>
      {d.cheio && <path d={d.cheio} fill={p.cor} fill-rule="evenodd" />}
      {d.traco && <path d={d.traco} fill="none" stroke={p.cor} stroke-width={d.largura} stroke-linecap="round" stroke-linejoin="round" />}
    </>
  );
}

/** Ícone 6b da categoria, em `tam` px e na cor dada; categoria sem ícone não desenha nada. */
export function IconeCategoria(p: { categoria: string; tam: number; cor: string }) {
  if (!CATEGORIAS_6B[p.categoria]) return null;
  return (
    <svg viewBox="0 0 24 24" width={p.tam} height={p.tam} aria-hidden="true" style="flex: none; display: block">
      <CaminhosCategoria categoria={p.categoria} cor={p.cor} />
    </svg>
  );
}

/**
 * Selo de tipo: com o glifo 5a do tipo, um SVG só com a geometria do `TIPO.svg` do design (`SELO` em `estilo.ts`),
 * escalado para `tam` (px, ou `"100%"` para preencher o pai), de modo que raio, margem e glifo fiquem sempre na mesma
 * proporção. Com `categoria`, o selo 6b entra encaixado no canto inferior direito, no mesmo SVG (`filete` é a cor do
 * card em volta dele). Sem glifo (tipos do protótipo), o selo de pixel da Arena, com o ícone 8×8 de `tipos.json` nas
 * medidas originais (`tamPixel` 14, 16 ou 22).
 */
export function SeloTipo(p: {
  c: Conteudo;
  tipo: string;
  tam: number | '100%';
  tamPixel?: 14 | 16 | 22;
  apagado?: boolean;
  anel?: string;
  categoria?: string;
  filete?: string;
}) {
  const tipo = p.c.tipos[p.tipo];
  const fundo = p.apagado ? '#566c86' : (tipo?.cor ?? '#94b0c2');
  const g = GLIFOS_TIPOS[p.tipo];
  if (g) {
    const S = SELO;
    const C = SELO_CATEGORIA;
    const canto = !!p.categoria && !!CATEGORIAS_6B[p.categoria];
    const raioPx = typeof p.tam === 'number' ? `${(p.tam * S.raio) / S.caixa}px` : `${(100 * S.raio) / S.caixa}%`;
    const anel = p.anel ? `; border-radius: ${raioPx}; box-shadow: 0 0 0 2px ${p.anel}` : '';
    const lado = typeof p.tam === 'number' ? `${p.tam}px` : p.tam;
    // Canto: quadrado de `lado` unidades, saindo `deslocamento` para fora da caixa; o ícone de 24 reduzido para `icone` do lado.
    const x0 = S.caixa - C.lado + C.deslocamento;
    const icone = C.lado * C.icone;
    const escalaIcone = icone / 24;
    return (
      <span style={`flex: none; position: relative; display: block; width: ${lado}; height: ${lado}${anel}`}>
        <svg viewBox={`0 0 ${S.caixa} ${S.caixa}`} width="100%" height="100%" aria-hidden="true" style="display: block; overflow: visible">
          <rect width={S.caixa} height={S.caixa} rx={S.raio} fill={fundo} />
          <g transform={`translate(${S.glifoDeslocamento} ${S.glifoDeslocamento}) scale(${S.glifoEscala})`} style={`color: ${g.cor}`} dangerouslySetInnerHTML={{ __html: g.svg }} />
          {canto && (
            <g>
              <rect x={x0} y={x0} width={C.lado} height={C.lado} rx={C.lado * C.raio} fill={p.apagado ? '#94b0c2' : C.fundo} stroke={p.filete ?? '#1a1c2c'} stroke-width={C.filete * 2} />
              <rect x={x0} y={x0} width={C.lado} height={C.lado} rx={C.lado * C.raio} fill={p.apagado ? '#94b0c2' : C.fundo} />
              <g transform={`translate(${x0 + (C.lado - icone) / 2} ${x0 + (C.lado - icone) / 2}) scale(${escalaIcone})`}>
                <CaminhosCategoria categoria={p.categoria!} cor={C.tinta} />
              </g>
            </g>
          )}
        </svg>
      </span>
    );
  }
  const tam = p.tamPixel ?? (typeof p.tam === 'number' ? p.tam : 16);
  const escala = tam === 22 ? 2 : 1;
  const off = tam === 22 ? 1 : tam === 16 ? 3 : 2;
  const anel = p.anel ? `; box-shadow: 0 0 0 2px ${p.anel}` : '';
  return (
    <span style={`flex: none; position: relative; display: block; width: ${tam}px; height: ${tam}px; background: ${fundo}${anel}`}>
      <IconePixel linhas={tipo?.icone ?? ICONE_PADRAO} escala={escala} cor="#1a1c2c" left={off} top={off} />
    </span>
  );
}

/** Selos de tipo de uma criatura, em 16 px; `tamPixel` é a medida do selo de pixel do protótipo (14 no time e nas listas). */
export function Selos(p: { c: Conteudo; tipos: readonly string[]; apagado: boolean; tamPixel: 14 | 16; anel?: string }) {
  return (
    <>
      {p.tipos.map((t) => (
        <SeloTipo key={t} c={p.c} tipo={t} tam={SELO.lista} tamPixel={p.tamPixel} apagado={p.apagado} anel={p.anel} />
      ))}
    </>
  );
}


/** Retrato em pixel (canvas de 24 ou 26 px mostrado em dobro). Só repinta quando muda a espécie, o lado ou o desmaio. */
export function Retrato(p: { c: Conteudo; especie: string | null; paraDireita: boolean; desmaiado?: boolean; tam: 24 | 26 }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const desmaiado = p.desmaiado ?? false;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!p.especie) el.getContext('2d')?.clearRect(0, 0, el.width, el.height);
    else pintarRetrato(el, p.c, p.especie, p.paraDireita, desmaiado, p.tam);
  }, [p.c, p.especie, p.paraDireita, desmaiado, p.tam]);
  return (
    <canvas
      ref={ref}
      width={p.tam}
      height={p.tam}
      aria-hidden="true"
      style={`display: block; width: ${p.tam * 2}px; height: ${p.tam * 2}px; image-rendering: pixelated`}
    />
  );
}

/** Barra de HP dos cartões: vermelho atrasado por baixo, cor do HP por cima e marcas a cada 16 px. */
export function BarraHp(p: { pct: number; atraso: number; cor: string }) {
  return (
    <span style="position: relative; flex: 1; display: block; height: 8px; background: #10121e; box-shadow: 0 0 0 2px #333c57">
      <span style={`position: absolute; left: 0; top: 0; bottom: 0; width: ${(p.atraso * 100).toFixed(1)}%; background: #b13e53`} />
      <span
        style={`position: absolute; left: 0; top: 0; bottom: 0; width: ${(p.pct * 100).toFixed(1)}%; background: ${p.cor}; box-shadow: inset 0 2px 0 0 rgba(244,244,244,.35)`}
      />
      <span style="position: absolute; inset: 0; background: repeating-linear-gradient(90deg, transparent 0 15px, rgba(16,18,30,.55) 15px 16px)" />
    </span>
  );
}
