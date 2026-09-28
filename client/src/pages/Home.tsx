import { useCallback, useEffect, useRef, useState } from 'react';
import GameControls from '@/components/GameControls';
import KeroGame from '@/components/KeroGame';
import OrientationGate from '@/components/OrientationGate';
import { useOrientationGate } from '@/hooks/useOrientationGate';
import { EMPTY_CONTROLS, type ControlState, type GameStatus } from '@/lib/game';

/**
 * Kero Mais Adventure - Main Game Page
 *
 * Design Philosophy: Retro Arcade Vibrante
 * - Cores neon vibrantes
 * - Efeitos glow e scan lines
 * - Animações arcade responsivas
 *
 * Layout: o jogo vive num quadro único que preenche a tela. Se o celular estiver
 * na vertical (ou a janela for menor que a resolução mínima) a partida é
 * encerrada e aparece a tela "vire o celular". Depois de girar, o jogador vê o
 * canvas e o botão COMEÇAR.
 */
export default function Home() {
  const gate = useOrientationGate();
  // Compartilhado entre teclado e D-pad da tela
  const controlsRef = useRef<ControlState>({ ...EMPTY_CONTROLS });
  const [status, setStatus] = useState<GameStatus>('idle');
  const [runId, setRunId] = useState(0);
  const [finalScore, setFinalScore] = useState(0);

  // Girar o celular (ou redimensionar a janela) encerra a partida
  useEffect(() => {
    if (gate) {
      setStatus('idle');
      Object.assign(controlsRef.current, EMPTY_CONTROLS);
    }
  }, [gate]);

  // Botão COMEÇAR / REINICIAR / JOGAR DE NOVO: zera e começa uma partida nova
  const handleRun = useCallback(() => {
    setFinalScore(0);
    setStatus('playing');
    setRunId((current) => current + 1);
  }, []);

  const handleGameOver = useCallback((score: number) => {
    setFinalScore(score);
    setStatus('gameover');
  }, []);

  if (gate) {
    return <OrientationGate reason={gate} />;
  }

  return (
    <div
      className="game-layout"
      style={{
        backgroundImage:
          'radial-gradient(circle at 20% 50%, rgba(255, 215, 0, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(0, 128, 255, 0.1) 0%, transparent 50%)',
      }}
    >
      <style>{`
        .game-layout {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          width: 100%;
          height: 100dvh;
          background-color: #0A0E27;
          overflow: hidden;
          padding: clamp(4px, 0.8vh, 10px);
          gap: clamp(2px, 0.6vh, 8px);
        }

        /* Cabeçalho discreto: o canvas é o dono do espaço da tela */
        .brand {
          flex: 0 0 auto;
          text-align: center;
        }

        .brand h1 {
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(10px, 1.5vw, 16px);
          color: #FFD700;
          text-shadow: 0 0 12px #FFD700, 0 0 24px rgba(255, 215, 0, 0.5);
        }

        .brand h1 span {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6em;
          color: #00FF00;
          text-shadow: 0 0 8px #00FF00;
        }

        .controls-bar {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(4px, 0.8vh, 10px);
          border: 2px solid #0080FF;
          border-radius: 10px;
          box-shadow: 0 0 12px #0080FF, inset 0 0 14px rgba(0, 128, 255, 0.2);
          background-color: rgba(10, 14, 39, 0.8);
        }

        .instructions {
          flex: 0 0 auto;
          color: #00FF00;
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(6px, 0.9vw, 9px);
          text-align: center;
          text-shadow: 0 0 8px #00FF00;
        }

        /* Tela baixa (celular deitado): some o que não é essencial para o jogo */
        @media (max-height: 560px) {
          .instructions {
            display: none;
          }

          .brand h1 {
            font-size: clamp(9px, 1.3vw, 13px);
          }
        }

        /* Tela baixa: aperta o envelope para o canvas ficar com o espaço */
        @media (max-height: 460px) {
          .game-layout {
            padding: 2px;
            gap: 2px;
          }

          .brand h1 {
            font-size: 8px;
          }

          .controls-bar {
            padding: 2px;
            border-width: 1px;
          }
        }
      `}</style>

      <header className="brand">
        <h1>
          KERO MAIS <span>ADVENTURE</span>
        </h1>
      </header>

      <KeroGame
        controlsRef={controlsRef}
        status={status}
        finalScore={finalScore}
        onGameOver={handleGameOver}
        onRun={handleRun}
        runId={runId}
      />

      <div className="controls-bar">
        <GameControls controlsRef={controlsRef} onRestart={handleRun} />
      </div>

      <footer className="instructions">
        MOVER: SETAS, WASD ou ARRASTE A TELA
      </footer>
    </div>
  );
}
