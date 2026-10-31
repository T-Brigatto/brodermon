// Preferências guardadas no navegador. O acesso pode falhar (aba anônima, site bloqueado),
// então tudo tem valor padrão e nenhum erro sobe.

const ler = (chave: string): string | null => {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
};

const gravar = (chave: string, valor: string): void => {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    // sem armazenamento: a preferência vale só nesta sessão
  }
};

export class Preferencias {
  private _mudo = ler('vdc-arena-mute') === '1';
  private _dicaVista = ler('vdc-arena-hint') === '1';

  get mudo(): boolean {
    return this._mudo;
  }
  set mudo(v: boolean) {
    this._mudo = v;
    gravar('vdc-arena-mute', v ? '1' : '0');
  }

  /** O aviso "Toque na arena para mover" some depois do primeiro toque. */
  get dicaVista(): boolean {
    return this._dicaVista;
  }
  set dicaVista(v: boolean) {
    this._dicaVista = v;
    if (v) gravar('vdc-arena-hint', '1');
  }
}
