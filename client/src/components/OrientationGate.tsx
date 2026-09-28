/**
 * Tela de bloqueio do jogo.
 *
 * Aparece quando o jogo não pode rodar: celular na vertical ou janela menor
 * que a resolução mínima. Enquanto ela estiver na tela a partida é encerrada.
 */

import React from 'react';
import type { GateReason } from '@/hooks/useOrientationGate';
import { MIN_VIEWPORT_HEIGHT, MIN_VIEWPORT_WIDTH } from '@/lib/game';

interface OrientationGateProps {
  reason: GateReason;
}

const OrientationGate: React.FC<OrientationGateProps> = ({ reason }) => {
  const isPortrait = reason === 'portrait';

  return (
    <div
      className="flex h-dvh w-full flex-col items-center justify-center gap-6 bg-black px-6 text-center"
      style={{
        backgroundImage:
          'radial-gradient(circle at 20% 50%, rgba(255, 215, 0, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(0, 128, 255, 0.1) 0%, transparent 50%)',
      }}
    >
      <style>{`
        @keyframes kg-rotate-phone {
          0%   { transform: rotate(0deg); }
          35%  { transform: rotate(0deg); }
          65%  { transform: rotate(-90deg); }
          100% { transform: rotate(-90deg); }
        }

        @keyframes kg-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.35; }
        }

        .kg-phone {
          width: 84px;
          height: 148px;
          border: 5px solid #00FF00;
          border-radius: 18px;
          box-shadow: 0 0 24px #00FF00, inset 0 0 24px rgba(0, 255, 0, 0.25);
          animation: kg-rotate-phone 2.4s ease-in-out infinite;
          position: relative;
        }

        .kg-phone::after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: 8px;
          transform: translateX(-50%);
          width: 28px;
          height: 4px;
          border-radius: 2px;
          background: #00FF00;
        }

        .kg-title {
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(16px, 5vw, 28px);
          color: #FFD700;
          text-shadow: 0 0 20px #FFD700, 0 0 40px rgba(255, 215, 0, 0.5);
          line-height: 1.6;
        }

        .kg-hint {
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(9px, 2.6vw, 13px);
          color: #00FF00;
          text-shadow: 0 0 10px #00FF00;
          line-height: 2;
          animation: kg-pulse 1.6s ease-in-out infinite;
        }
      `}</style>

      <div className="kg-phone" aria-hidden="true" />

      <h1 className="kg-title">{isPortrait ? 'VIRE O CELULAR' : 'TELA MUITO PEQUENA'}</h1>

      <p className="kg-hint">
        {isPortrait ? (
          <>
            GIRE PARA A HORIZONTAL
            <br />
            PARA COMEÇAR A JOGAR
          </>
        ) : (
          <>
            O JOGO PRECISA DE NO MÍNIMO
            <br />
            {MIN_VIEWPORT_WIDTH} x {MIN_VIEWPORT_HEIGHT} PX
            <br />
            GIRE O CELULAR OU AMPLIE A JANELA
          </>
        )}
      </p>
    </div>
  );
};

export default OrientationGate;
