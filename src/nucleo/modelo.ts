// Estado, comandos e eventos da batalha. Tudo aqui é dado puro e serializável
// (dá para clonar com structuredClone, salvar em JSON e mandar pela rede).

import type { Campo, EfeitoNoAlvo, EfeitoPosicionado, EfeitoProjetil, Piloto } from '../conteudo/esquema';

export type { Piloto };
export type Equipe = 0 | 1;
export type Tatica = 'perseguir' | 'manter' | 'parado' | 'evasivo';
export type Atributo = 'ataque' | 'defesa' | 'velocidade';

/** Efeito que dura sobre uma criatura. Some quando ela sai de campo. */
export type Condicao =
  | { tipo: 'lentidao'; fator: number; restante: number }
  | { tipo: 'preso'; restante: number }
  | { tipo: 'atordoado'; restante: number }
  | { tipo: 'dano-continuo'; porSegundo: number; restante: number; acumulado: number; autor: number; golpe: string; nome?: string }
  | { tipo: 'debuff'; atributo: Atributo; valor: number; restante: number }
  /** Estado de `estados.json`. `alvo`: o rival do golpe que o aplicou (caçada). `cargas`/`andado`: estática. */
  | { tipo: 'estado'; estado: string; restante: number; autor: number; alvo: number | null; cargas: number; andado: number }
  /** Presa a `autor`: a distância entre os dois não passa de `distancia`. */
  | { tipo: 'acorrentado'; autor: number; distancia: number; restante: number }
  /** Ela e `autor` são puxados um para o outro; ao encostarem, ela leva `aoEncostar` de poder do golpe. */
  | { tipo: 'atraido'; autor: number; velocidade: number; aoEncostar: number; golpe: string; restante: number };

/** Campo deixado no caminho de um avanço ou de uma forma que anda. */
export interface Rastro {
  campo: string;
  largura: number;
  duracao: number;
  golpe: string;
  /** Onde o caminho começou. */
  x: number;
  y: number;
}

/** Movimento forçado (avanço, recuo, empurrão, puxão, arrasto): ignora a entrada do jogador e a tática. */
export interface Deslocamento {
  vx: number;
  vy: number;
  restante: number;
  /** Avanço que acerta o rival ao passar por ele (uma vez). */
  carga?: { golpe: string; poder: number; efeitos: EfeitoNoAlvo[]; atingiu: boolean };
  rastro?: Rastro;
}

/** Para onde o golpe foi apontado quando começou: onde o rival estava e a direção até ele. */
export interface Mira extends Ponto {
  ux: number;
  uy: number;
}

/** Golpe em andamento: conjurando ou executando os efeitos, um após o outro. */
export interface Acao {
  golpe: string;
  indice: number;
  alvo: number;
  /** Segundos de conjuração que faltam; com 0, os efeitos já estão rodando. */
  conjuracao: number;
  /** Próximo efeito da lista. */
  passo: number;
  /** Espera até o próximo efeito (um avanço, um recuo, uma canalização ou um `esperar`). */
  espera: number;
  /** A espera é uma canalização ou um `esperar`: vale o `durante` do golpe. */
  canal: boolean;
  /** Fator de velocidade de quem usa enquanto conjura ou canaliza: 0 parado, 1 livre. */
  movimento: number;
  /** Zona canalizada por esta ação; some se a ação acabar antes. */
  zona: number | null;
  mira: Mira;
  /** Ponta da última forma (o cone com `origem: "ponta"` sai dela). */
  ponta: Mira | null;
  /** O rival mirou numa cópia falsa: os efeitos diretos erram e os projéteis vão para a mira. */
  enganado: boolean;
  /** Multiplicador de dano do golpe (cargas da estática). */
  bonus: number;
  /** Já avisou que errou (o aviso sai uma vez por golpe). */
  errou: boolean;
}

export interface Ponto {
  x: number;
  y: number;
}

export interface GolpeEmUso {
  id: string;
  /** Segundos até poder usar de novo; 0 = pronto. */
  recarga: number;
}

export interface Lutador {
  /** Identificador único dentro da batalha. Os eventos citam lutadores por ele. */
  uid: number;
  especie: string;
  equipe: Equipe;
  hp: number;
  hpMax: number;
  ataque: number;
  defesa: number;
  velocidade: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  olhando: 1 | -1;
  golpes: GolpeEmUso[];
  /** Espera depois de qualquer golpe antes do próximo. */
  recargaGlobal: number;
  recargaGlobalMax: number;
  /** Segundos da animação de entrada; enquanto > 0 não anda nem ataca. */
  entrando: number;
  buff: { atributo: Atributo; valor: number; restante: number } | null;
  condicoes: Condicao[];
  deslocamento: Deslocamento | null;
  acao: Acao | null;
  /** Fator de velocidade dos estados e dos campos, recalculado a cada passo (1 = nenhum). */
  fatorEstados: number;
  /** Fração de HP da cura por segundo que ainda não fechou um ponto inteiro. */
  curaAcumulada: number;
  /** Último golpe usado (o Espelho Arcano do rival copia). */
  ultimoGolpe: string | null;
  /** Segundos até poder entrar num portal de novo. */
  portalEspera: number;
  /** Tempo de vida em campo; dá o ritmo do zigue-zague da esquiva. */
  relogio: number;
  desmaiado: boolean;
  danoCausado: number;
}

export interface Destino extends Ponto {
  /** true enquanto o dedo está na tela: a criatura fica no ponto em vez de liberar o destino ao chegar. */
  fixo: boolean;
}

export interface EstadoEquipe {
  piloto: Piloto;
  lutadores: Lutador[];
  ativo: number;
  tatica: Tatica;
  /** Índice do golpe na fila, ou -1. */
  proximoGolpe: number;
  /** Direção contínua do teclado ou joystick; (0, 0) = solto. */
  direcao: Ponto;
  destino: Destino | null;
  troca: { para: number; restante: number } | null;
  esperaTroca: number;
  /** > 0: contagem até mandar a próxima criatura depois de um desmaio. */
  substituicao: number;
}

export interface Projetil {
  x: number;
  y: number;
  /** Velocidade própria (unidades/s). O `guiado` não usa: anda sempre direto para o alvo. */
  vx: number;
  vy: number;
  /** Rival quando saiu. O `guiado` só acerta ele; os outros acertam quem estiver em campo. */
  alvo: number;
  autor: number;
  golpe: string;
  /** O efeito `projetil` que o criou (dá o poder, a trajetória e os efeitos ao acertar). */
  def: EfeitoProjetil;
  /** Segundos até sumir; null no `guiado`. */
  vida: number | null;
  acertos: number;
  /** Estava encostado no rival no passo anterior (um acerto novo exige sair e voltar). */
  tocando: boolean;
  quicou: number;
  /** Grudado nesta criatura, estourando quando `gruda` chegar a 0. */
  grudado: number | null;
  gruda: number;
  /** Distância percorrida e se já está voltando (bumerangue). */
  percorrido: number;
  voltando: boolean;
  /** Poder ganho consumindo campos, fator do raio e multiplicador de dano (névoas que tiram dano). */
  poderExtra: number;
  escala: number;
  multiplicador: number;
  /** Campos que já mexeram nele (cada um mexe uma vez). */
  campos: number[];
  /** Terreno herdado de onde saiu. */
  herda: string | null;
  /** Segundos até o próximo pulso da aura. */
  aura: number;
  /** Já foi desviado por uma esfera de ar. */
  desviado: boolean;
  portalEspera: number;
}

/** Geometria de uma forma no chão. */
export type Geometria =
  | { forma: 'area'; raio: number }
  | { forma: 'cone'; alcance: number; angulo: number }
  | { forma: 'linha'; alcance: number; largura: number }
  | { forma: 'parede'; largura: number; espessura: number };

/**
 * Forma no campo: marca que vai acertar (`atraso`), forma que dura e acerta a cada pulso, forma que anda,
 * terreno ou névoa (`campo`). Tudo o que ela faz fica copiado aqui, para o estado não depender do índice do efeito.
 */
export interface Zona {
  id: number;
  autor: number;
  golpe: string;
  geo: Geometria;
  /** Centro da área e da parede, ou origem do cone e da linha. */
  x: number;
  y: number;
  ux: number;
  uy: number;
  /** Segundos que faltam para a marca virar golpe; 0 = já está valendo. */
  atraso: number;
  /** Segundos desde que passou a valer; a zona acaba em `duracao` (0 = acerta uma vez e some). */
  tempo: number;
  duracao: number;
  pulso: number | null;
  pulsos: number;
  poder: number;
  efeitos: EfeitoNoAlvo[];
  drena: number;
  /** Efeitos que se revezam a cada pulso. */
  alterna: EfeitoNoAlvo[][] | null;
  /** Canalizada: anda com quem usa e acaba se a ação dele acabar antes. */
  canal: boolean;
  /** Terreno ou névoa (`campos.json`). */
  campo: string | null;
  /** Quem a zona atinge: só o rival de quem criou ou todos (menos os imunes do campo). */
  afeta: Campo['afeta'];
  /** Cada criatura é atingida uma vez só. */
  umaVez: boolean;
  atingidos: number[];
  /** Quem estava dentro no passo anterior e há quanto tempo (entrada e permanência). */
  dentro: { uid: number; tempo: number }[];
  /** Velocidade (unidades/s), distância que falta (null = até o fim) e se vira para o rival. */
  move: { v: number; restante: number | null; persegue: boolean } | null;
  /** Raio inicial e final da área que cresce. */
  cresce: { de: number; ate: number } | null;
  arrasta: boolean;
  puxa: number;
  rastro: Rastro | null;
  deixa: {
    campo: string;
    duracao: number;
    raio?: number;
    largura?: number;
    pulso?: number;
    poder?: number;
    efeitos?: EfeitoNoAlvo[];
    aoEntrar?: { poder: number; efeitos: EfeitoNoAlvo[] };
  } | null;
  /** Dano e efeitos ao entrar no campo, no lugar dos de `campos.json`. */
  aoEntrar: { poder: number; efeitos: EfeitoNoAlvo[] } | null;
  apaga: { camadas?: ('terreno' | 'nevoa')[]; tipos?: string[]; converteEm?: string; objetos: boolean } | null;
  /** Segundos até o próximo disparo (campo que dispara). */
  disparo: number;
}

/** Objeto na arena. */
export interface Objeto {
  id: number;
  tipo: 'pilar' | 'portal' | 'copia' | 'pino';
  autor: number;
  golpe: string;
  x: number;
  y: number;
  raio: number;
  restante: number;
  /** O outro portal do par. */
  par: number | null;
  /** Chance de a cópia enganar cada golpe do rival. */
  chance: number;
  destruidoPor: string[];
  /** Criaturas que já estavam dentro (o portal só leva quem entra nele). */
  dentro: number[];
}

/** Forma ou projétil marcado para acontecer daqui a `espera` segundos (golpes com `varias` e `intervalo`). */
export interface Agendado {
  espera: number;
  autor: number;
  golpe: string;
  efeito: EfeitoPosicionado;
  x: number;
  y: number;
  ux: number;
  uy: number;
}

export interface EstadoBatalha {
  tick: number;
  tempo: number;
  rng: { estado: number };
  equipes: [EstadoEquipe, EstadoEquipe];
  projeteis: Projetil[];
  zonas: Zona[];
  objetos: Objeto[];
  agendados: Agendado[];
  /** Próximo id de zona ou objeto. */
  proximoId: number;
  /** Equipe de um jogador que precisa escolher a próxima criatura; a batalha fica parada até o comando `trocar`. */
  aguardandoEscolha: Equipe | null;
  vencedor: Equipe | null;
}

export type Comando =
  | { tipo: 'direcao'; equipe: Equipe; x: number; y: number }
  | { tipo: 'destino'; equipe: Equipe; ponto: Ponto | null; fixo?: boolean }
  | { tipo: 'proximoGolpe'; equipe: Equipe; indice: number }
  | { tipo: 'trocar'; equipe: Equipe; indice: number }
  | { tipo: 'tatica'; equipe: Equipe; tatica: Tatica };

export type MotivoEntrada = 'troca' | 'substituicao';

export type OrigemDano = 'contato' | 'projetil' | 'forma' | 'campo' | 'continuo';
export type MotivoDeslocamento = 'avancar' | 'recuar' | 'empurrar' | 'puxar' | 'teleporte';

export type Evento =
  /** Golpe usado. Com `conjuracao` > 0, os efeitos só começam depois desse tempo. */
  | { tipo: 'golpe'; autor: number; golpe: string; indice: number; conjuracao: number }
  | { tipo: 'projetil'; autor: number; alvo: number; golpe: string }
  | { tipo: 'projetilPerdido'; x: number; y: number; golpe: string }
  /** Forma acertando o campo (na hora, ou quando a marca vira golpe). */
  | { tipo: 'forma'; autor: number; golpe: string; geo: Geometria; x: number; y: number; ux: number; uy: number }
  /** Golpe que saltou de um pino para o alvo. */
  | { tipo: 'salto'; autor: number; golpe: string; x: number; y: number; alvo: number }
  | { tipo: 'dano'; alvo: number; autor: number; golpe: string; valor: number; eficacia: number; origem: OrigemDano }
  | { tipo: 'buff'; lutador: number; atributo: Atributo; valor: number }
  | { tipo: 'cura'; lutador: number; valor: number }
  | { tipo: 'deslocamento'; lutador: number; motivo: MotivoDeslocamento }
  | { tipo: 'condicao'; lutador: number; condicao: Condicao['tipo']; duracao: number; estado?: string }
  /** Efeito direto que não achou o rival ao alcance na hora de acontecer. */
  | { tipo: 'errou'; autor: number; golpe: string }
  /** Conjuração ou sequência de efeitos cortada por atordoamento ou empurrão. */
  | { tipo: 'interrompido'; lutador: number; golpe: string }
  | { tipo: 'trocaIniciada'; equipe: Equipe; saindo: number; entrando: number }
  | { tipo: 'entrou'; equipe: Equipe; lutador: number; motivo: MotivoEntrada }
  | { tipo: 'desmaio'; lutador: number }
  | { tipo: 'aguardandoEscolha'; equipe: Equipe }
  | { tipo: 'fim'; vencedor: Equipe }
  | { tipo: 'comandoRecusado'; comando: Comando; motivo: string };
