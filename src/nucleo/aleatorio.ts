// Sorteio com semente (mulberry32). O estado fica dentro da batalha,
// então a mesma semente com os mesmos comandos sempre dá a mesma luta.

export function sortear(rng: { estado: number }): number {
  let t = (rng.estado = (rng.estado + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
