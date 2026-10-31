// Efeitos sonoros sintetizados (WebAudio), os mesmos da Arena original.

export type Efeito =
  | 'tap' | 'shoot' | 'hit' | 'super' | 'weak' | 'buff' | 'switch'
  | 'faint' | 'ready' | 'go' | 'win' | 'lose';

type Janela = typeof globalThis & { webkitAudioContext?: typeof AudioContext };

export class Som {
  private ac: AudioContext | null = null;

  constructor(private readonly mudo: () => boolean) {}

  /** O navegador só libera áudio depois de um gesto do usuário; chame isto num toque ou tecla. */
  garantir(): void {
    if (this.ac) {
      if (this.ac.state === 'suspended') void this.ac.resume();
      return;
    }
    const AC = globalThis.AudioContext ?? (globalThis as Janela).webkitAudioContext;
    if (!AC) return;
    try {
      this.ac = new AC();
    } catch {
      this.ac = null;
    }
  }

  private tom(f1: number, f2: number, dur: number, forma: OscillatorType, vol: number, atraso = 0): void {
    const A = this.ac;
    if (!A) return;
    const t0 = A.currentTime + atraso;
    const o = A.createOscillator();
    const g = A.createGain();
    o.type = forma;
    o.frequency.setValueAtTime(f1, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(A.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  tocar(nome: Efeito): void {
    if (this.mudo() || !this.ac) return;
    const T = this.tom.bind(this);
    switch (nome) {
      case 'tap': return T(880, 0, 0.035, 'square', 0.025);
      case 'shoot': return T(760, 420, 0.06, 'square', 0.015);
      case 'hit': return T(220, 70, 0.1, 'square', 0.045);
      case 'super':
        T(320, 80, 0.16, 'sawtooth', 0.05);
        return T(1250, 620, 0.1, 'square', 0.025, 0.02);
      case 'weak': return T(160, 120, 0.08, 'triangle', 0.05);
      case 'buff': return T(520, 1040, 0.16, 'triangle', 0.05);
      case 'switch': return T(400, 800, 0.1, 'square', 0.03);
      case 'faint': return T(440, 60, 0.45, 'square', 0.045);
      case 'ready': return T(440, 0, 0.08, 'square', 0.035);
      case 'go':
        T(660, 0, 0.08, 'square', 0.035);
        return T(990, 0, 0.16, 'square', 0.035, 0.09);
      case 'win':
        return [523, 659, 784, 1047].forEach((f, i) => T(f, 0, 0.16, 'square', 0.04, i * 0.11));
      case 'lose':
        return [392, 330, 262, 196].forEach((f, i) => T(f, 0, 0.2, 'triangle', 0.06, i * 0.16));
    }
  }
}
