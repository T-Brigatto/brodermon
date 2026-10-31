// Pacotes de conteúdo prontos para uso. Para criar outro, copie a pasta
// `conteudo/prototipo/`, edite os dicionários e registre-o aqui.

import { carregarConteudo } from './esquema';
import tipos from '../../conteudo/prototipo/tipos.json';
import categorias from '../../conteudo/prototipo/categorias.json';
import golpes from '../../conteudo/prototipo/golpes.json';
import especies from '../../conteudo/prototipo/especies.json';
import batalhas from '../../conteudo/prototipo/batalhas.json';
import regras from '../../conteudo/prototipo/regras.json';

/** Os 7 tipos e as 6 criaturas da Arena original (`design/Arena.dc.html`). */
export const prototipo = carregarConteudo({ tipos, categorias, golpes, especies, batalhas, regras });
