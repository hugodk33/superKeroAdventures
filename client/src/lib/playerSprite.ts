/**
 * Trilha de sprint do Kero: 8 PNGs individuais em client/src/assets/sprint.
 *
 * Cada quadro tem 322x210 e o personagem e desenhado sempre na mesma posicao
 * dentro da caixa, entao a animacao nao treme. As medidas abaixo vieram do
 * alpha real dos 8 arquivos:
 *
 * - x 0-98   : espaco reservado para a capa balancar (vazio na maioria dos
 *              quadros) -> fica FORA da colisao, senao morre no "nada"
 * - x 99-320 : regiao que esta preenchida nos 8 quadros
 * - x 298+   : pontinha fina da frente -> fora da colisao
 * - y 2-205  : regiao preenchida; o corpo denso fica entre y 16 e 179
 */

const frameFiles = import.meta.glob('../assets/sprint/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** URLs dos 8 quadros em ordem (sprint-1 ... sprint-8). */
export const PLAYER_FRAME_URLS: string[] = Object.keys(frameFiles)
  .sort((a, b) => a.localeCompare(b, 'pt', { numeric: true }))
  .map((key) => frameFiles[key]);

/** Tamanho de cada PNG (constante para nao depender do carregamento). */
export const PLAYER_FRAME_WIDTH = 322;
export const PLAYER_FRAME_HEIGHT = 210;

export const PLAYER_FPS = 14;
export const PLAYER_HOVER_FPS = 8;

/**
 * Caixa de colisao em fracao do quadro (medida na arte, encolhida 15%).
 * Cobre so o corpo solido: ignora a capa, a pontinha da frente e a borda
 * transparente dos 8 quadros.
 */
export const PLAYER_HITBOX = {
  x: 0.41,
  y: 0.16,
  width: 0.44,
  height: 0.69,
} as const;
