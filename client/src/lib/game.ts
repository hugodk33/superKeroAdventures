/**
 * Constantes e tipos compartilhados entre o canvas e os controles.
 *
 * O mundo do jogo tem resolução lógica fixa (1000x600). Dessa forma a lógica
 * (colisão, spawn de obstáculos, placar) é idêntica em qualquer dispositivo e
 * o canvas só precisa ser escalado para caber na tela.
 */

/** Resolução lógica do mundo do jogo (coordenadas usadas na lógica/draw). */
export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 600;
export const CANVAS_RATIO = CANVAS_WIDTH / CANVAS_HEIGHT;

/**
 * Resolução mínima interna do canvas.
 * Mesmo em telas pequenas o buffer não fica abaixo disso, então o jogo
 * nunca fica desfocado ao ser reduzido por CSS.
 */
export const MIN_CANVAS_WIDTH = 800;
export const MIN_CANVAS_HEIGHT = (MIN_CANVAS_WIDTH / CANVAS_WIDTH) * CANVAS_HEIGHT;

/** Abaixo disso a viewport é pequena demais para o jogo caber na horizontal. */
export const MIN_VIEWPORT_WIDTH = 480;
export const MIN_VIEWPORT_HEIGHT = 320;

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface ControlState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export const EMPTY_CONTROLS: ControlState = {
  up: false,
  down: false,
  left: false,
  right: false,
};

export type GameStatus =
  /** Tela inicial: nada se move até o jogador apertar começar. */
  | 'idle'
  /** Partida em andamento. */
  | 'playing'
  /** Bateu em uma pedra: mostra o placar final e o botão de reiniciar. */
  | 'gameover';
