// Peças pequenas reaproveitadas pelas telas: ícone de pixel, selo de tipo, retrato e barra de HP.

import { useEffect, useRef } from 'preact/hooks';
import type { Conteudo } from '../conteudo/esquema';
import { pintarRetrato } from '../desenho/sprites';
import { ICONE_PADRAO, sombraIcone } from './estilo';

export function IconePixel(p: { linhas: readonly string[]; escala: number; cor: string; left: number; top: number }) {
  return (
    <span
      style={`position: absolute; left: ${p.left}px; top: ${p.top}px; width: ${p.escala}px; height: ${p.escala}px; box-shadow: ${sombraIcone(p.linhas, p.escala, p.cor)}`}
    />
  );
}

/** Selos de tipo de uma criatura. `tam` 16 (cartões) ou 14 (time, listas); `anel` é a cor do contorno. */
export function Selos(p: { c: Conteudo; tipos: readonly string[]; apagado: boolean; tam: 14 | 16; anel?: string }) {
  const off = p.tam === 16 ? 3 : 2;
  return (
    <>
      {p.tipos.map((t) => {
        const tipo = p.c.tipos[t];
        const fundo = p.apagado ? '#566c86' : (tipo?.cor ?? '#94b0c2');
        const anel = p.anel ? `; box-shadow: 0 0 0 2px ${p.anel}` : '';
        return (
          <span key={t} style={`flex: none; position: relative; display: block; width: ${p.tam}px; height: ${p.tam}px; background: ${fundo}${anel}`}>
            <IconePixel linhas={tipo?.icone ?? ICONE_PADRAO} escala={1} cor="#1a1c2c" left={off} top={off} />
          </span>
        );
      })}
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
