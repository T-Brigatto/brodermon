// Pacotes de conteúdo prontos para uso. Para criar outro, copie uma pasta de
// `conteudo/`, edite os dicionários e registre-o aqui.

import { carregarConteudo, type Conteudo } from './esquema';
import tipos from '../../conteudo/prototipo/tipos.json';
import categorias from '../../conteudo/prototipo/categorias.json';
import golpes from '../../conteudo/prototipo/golpes.json';
import especies from '../../conteudo/prototipo/especies.json';
import batalhas from '../../conteudo/prototipo/batalhas.json';
import regras from '../../conteudo/prototipo/regras.json';
import sprites from '../../conteudo/prototipo/sprites.json';
import valeTipos from '../../conteudo/vale/tipos.json';
import valeCategorias from '../../conteudo/vale/categorias.json';
import valeGolpes from '../../conteudo/vale/golpes.json';
import valeEspecies from '../../conteudo/vale/especies.json';
import valeBatalhas from '../../conteudo/vale/batalhas.json';
import valeRegras from '../../conteudo/vale/regras.json';
import valeSprites from '../../conteudo/vale/sprites.json';
import valeEstados from '../../conteudo/vale/estados.json';
import valeCampos from '../../conteudo/vale/campos.json';

/** Tiras de sprite (PNG) de cada pacote, pelo caminho do arquivo; o Vite troca pela URL (ou embute, no build único). */
const imagens = import.meta.glob('../../conteudo/*/sprites/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/** Troca o caminho `imagem` de cada sprite do pacote pela URL do arquivo. */
function comImagens(pasta: string, sprites: Record<string, object>): Record<string, object> {
  return Object.fromEntries(
    Object.entries(sprites).map(([id, s]) => {
      if (!('imagem' in s) || typeof s.imagem !== 'string') return [id, s];
      const url = imagens[`../../conteudo/${pasta}/${s.imagem}`];
      if (!url) throw new Error(`sprite "${id}" do pacote ${pasta}: não achei conteudo/${pasta}/${s.imagem}`);
      return [id, { ...s, imagem: url }];
    }),
  );
}

/** Os 7 tipos e as 6 criaturas da Arena original (`design/Arena.dc.html`). */
export const prototipo = carregarConteudo({ tipos, categorias, golpes, especies, batalhas, regras, sprites });

/**
 * Os 10 elementos e os 103 golpes do guia de golpes (`origem/Guia_de_formulacao_de_golpes_Arena_Vale_das_Criaturas.md`),
 * com terrenos, névoas e estados. As criaturas são provisórias, de laboratório.
 */
export const vale = carregarConteudo({
  tipos: valeTipos,
  categorias: valeCategorias,
  golpes: valeGolpes,
  especies: valeEspecies,
  batalhas: valeBatalhas,
  regras: valeRegras,
  sprites: comImagens('vale', valeSprites),
  estados: valeEstados,
  campos: valeCampos,
});

export const pacotes: Record<string, Conteudo> = { prototipo, vale };
