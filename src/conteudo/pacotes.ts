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
  sprites: valeSprites,
  estados: valeEstados,
  campos: valeCampos,
});

export const pacotes: Record<string, Conteudo> = { prototipo, vale };
