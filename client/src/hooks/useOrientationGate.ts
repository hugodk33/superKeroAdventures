import { useEffect, useState } from 'react';
import { MIN_VIEWPORT_HEIGHT, MIN_VIEWPORT_WIDTH } from '@/lib/game';

export type GateReason = 'portrait' | 'too-small';

function evaluate(): GateReason | null {
  if (typeof window === 'undefined') return null;

  const width = window.innerWidth;
  const height = window.innerHeight;

  if (width < MIN_VIEWPORT_WIDTH || height < MIN_VIEWPORT_HEIGHT) {
    return 'too-small';
  }

  // A trava de orientação só vale para telas de toque (celular/tablet).
  // No desktop uma janela estreita apenas mostra o aviso de tela pequena.
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  if (isTouch && height > width) {
    return 'portrait';
  }

  return null;
}

/**
 * Impede o jogo de rodar fora das condições suportadas.
 *
 * - 'portrait': celular na vertical -> mostra a tela "vire o celular".
 * - 'too-small': viewport abaixo da resolução mínima -> avisa para girar/ampliar.
 *
 * Sempre que o valor muda (girar o aparelho, redimensionar a janela) o jogo
 * é pausado e o jogador precisa apertar começar de novo.
 */
export function useOrientationGate(): GateReason | null {
  const [reason, setReason] = useState<GateReason | null>(evaluate);

  useEffect(() => {
    const update = () => setReason(evaluate());

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    const portrait = window.matchMedia('(orientation: portrait)');
    const landscape = window.matchMedia('(orientation: landscape)');
    portrait.addEventListener('change', update);
    landscape.addEventListener('change', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      portrait.removeEventListener('change', update);
      landscape.removeEventListener('change', update);
    };
  }, []);

  return reason;
}
