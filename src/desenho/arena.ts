// Geometria da arena vista em perspectiva, igual à da Arena original.
// O núcleo trabalha no plano do chão (x de 0 a 320, y de 0 a 130); aqui esse
// plano vira coordenada do cenário (400×310), que a câmera depois amplia.

export const CENARIO = { largura: 400, altura: 310 } as const;
export const VISTA = { largura: 390, altura: 336 } as const;

/** cx/yb/yf: centro e linhas de fundo e frente; wb/wf: larguras; X/Z: tamanho do chão; hb/hf: altura dos muros. */
export const AR = { cx: 200, yb: 150, yf: 280, wb: 270, wf: 350, X: 320, Z: 130, hb: 70, hf: 90, zMin: 1.3, zMax: 2.4 } as const;

export interface PontoCenario {
  x: number;
  y: number;
  /** Largura da arena nessa profundidade. */
  w: number;
}

export function projetar(X: number, Z: number): PontoCenario {
  const t = Math.max(-0.3, Math.min(1.3, Z / AR.Z));
  const w = AR.wb / (1 - (1 - AR.wb / AR.wf) * t);
  return {
    x: AR.cx + (X / AR.X - 0.5) * w,
    y: AR.yb + ((AR.yf - AR.yb) * (w - AR.wb)) / (AR.wf - AR.wb),
    w,
  };
}

export function desprojetar(sx: number, sy: number): { x: number; y: number } {
  const w = Math.max(AR.wb * 0.9, AR.wb + ((sy - AR.yb) / (AR.yf - AR.yb)) * (AR.wf - AR.wb));
  const t = (1 - AR.wb / w) / (1 - AR.wb / AR.wf);
  return { x: ((sx - AR.cx) / w + 0.5) * AR.X, y: t * AR.Z };
}
