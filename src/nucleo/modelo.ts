// Estado, comandos e eventos da batalha. Tudo aqui é dado puro e serializável
// (dá para clonar com structuredClone, salvar em JSON e mandar pela rede).

import type { Piloto } from '../conteudo/esquema';

export type { Piloto };
export type Equipe = 0 | 1;
export type Tatica = 'perseguir' | 'manter' | 'parado' | 'evasivo';
export type Atributo = 'ataque' | 'defesa' | 'velocidade';

/** Efeito que dura sobre uma criatura. Some quando ela sai de campo. */
export type Condicao =
  | { tipo: 'lentidao'; fator: number; restante: number }
  | { tipo: 'preso'; restante: number }
  | { tipo: 'atordoado'; restante: number }
  | { tipo: 'dano-continuo'; porSegundo: number; restante: number; acumulado: number; autor: number; golpe: string }
  | { tipo: 'debuff'; atributo: Atributo; valor: number; restante: number };

/** Movimento forçado (avanço, recuo, empurrão, puxão): ignora a entrada do jogador e a tática. */
export interface Deslocamento {
  vx: number;
  vy: number;
  restante: number;
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
  /** Espera até o próximo efeito (um avanço ou recuo em andamento). */
  espera: number;
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
  alvo: number;
  autor: number;
  golpe: string;
  /** Posição do efeito `projetil` na lista do golpe (dá o poder, a velocidade e os efeitos ao acertar). */
  efeito: number;
}

export interface EstadoBatalha {
  tick: number;
  tempo: number;
  rng: { estado: number };
  equipes: [EstadoEquipe, EstadoEquipe];
  projeteis: Projetil[];
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

export type OrigemDano = 'contato' | 'projetil' | 'continuo';
export type MotivoDeslocamento = 'avancar' | 'recuar' | 'empurrar' | 'puxar';

export type Evento =
  /** Golpe usado. Com `conjuracao` > 0, os efeitos só começam depois desse tempo. */
  | { tipo: 'golpe'; autor: number; golpe: string; indice: number; conjuracao: number }
  | { tipo: 'projetil'; autor: number; alvo: number; golpe: string }
  | { tipo: 'projetilPerdido'; x: number; y: number; golpe: string }
  | { tipo: 'dano'; alvo: number; autor: number; golpe: string; valor: number; eficacia: number; origem: OrigemDano }
  | { tipo: 'buff'; lutador: number; atributo: Atributo; valor: number }
  | { tipo: 'cura'; lutador: number; valor: number }
  | { tipo: 'deslocamento'; lutador: number; motivo: MotivoDeslocamento }
  | { tipo: 'condicao'; lutador: number; condicao: Condicao['tipo']; duracao: number }
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
