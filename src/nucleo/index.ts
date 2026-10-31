// Núcleo da batalha: regras puras, sem tela, relógio ou sorteio global.
// Roda igual no navegador, nos testes e (no futuro) no servidor.

export * from './modelo';
export { PASSO, aplicarComandos, avancar, configDaBatalha, criarBatalha, type ConfigBatalha } from './batalha';
export { ativo, combatente, distancia, especieDe, golpeDe, lutadorPorUid, outra } from './consulta';
export { calcularDano, type Combatente } from './dano';
export { confronto, eficacia } from './eficacia';
export { escolherGolpe, taticaDaIa } from './ia';
export { sortear } from './aleatorio';
