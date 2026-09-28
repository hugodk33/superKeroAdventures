/**
 * Game Controls HUD
 *
 * Design Philosophy: Retro Arcade Vibrante
 * - Botões grandes e redondos estilo arcade
 * - Efeitos glow e pulsação
 * - Feedback visual imediato ao click
 *
 * Funciona igual no desktop e no celular: o D-pad usa pointer events (mouse e
 * toque) escrevendo no mesmo `controlsRef` usado pelo teclado, e o botão
 * REINICIAR substitui a tecla R (que não existe no celular).
 */

import React, { useEffect, useRef, useState } from 'react';
import { EMPTY_CONTROLS, type ControlState, type Direction } from '@/lib/game';

interface GameControlsProps {
  /** Mesmo estado de direção usado pelo teclado dentro do canvas. */
  controlsRef: React.RefObject<ControlState>;
  /** Reinicia a partida (substitui a tecla R). */
  onRestart: () => void;
}

const DIRECTIONS: { direction: Direction; label: string }[] = [
  { direction: 'up', label: '↑' },
  { direction: 'left', label: '←' },
  { direction: 'down', label: '↓' },
  { direction: 'right', label: '→' },
];

const GameControls: React.FC<GameControlsProps> = ({ controlsRef, onRestart }) => {
  const [pressedButtons, setPressedButtons] = useState<Set<string>>(new Set());
  // Guarda os pointers ativos por botão: com dois dedos dá para andar na diagonal
  const pointersRef = useRef(new Map<number, Direction>());

  const release = (direction: Direction, pointerId?: number) => {
    if (pointerId !== undefined) {
      pointersRef.current.delete(pointerId);
    }
    setPressedButtons((prev) => {
      if (!prev.has(direction)) return prev;
      const next = new Set(prev);
      next.delete(direction);
      return next;
    });

    // Solta a direção somente quando nenhum outro dedo está segurando ela
    const stillHeld = Array.from(pointersRef.current.values()).includes(direction);
    if (!stillHeld && controlsRef.current) {
      controlsRef.current[direction] = false;
    }
  };

  const press = (direction: Direction, pointerId: number) => {
    pointersRef.current.set(pointerId, direction);
    if (controlsRef.current) {
      controlsRef.current[direction] = true;
    }
    setPressedButtons((prev) => new Set(prev).add(direction));
  };

  // Rede de segurança: se o dedo sair da tela (ou a aba perder o foco) o
  // personagem não fica andando sozinho para sempre.
  useEffect(() => {
    const clearAll = () => {
      pointersRef.current.clear();
      setPressedButtons(new Set());
      if (controlsRef.current) {
        Object.assign(controlsRef.current, EMPTY_CONTROLS);
      }
    };

    // Só solta tudo quando não sobrou nenhum dedo segurando (permite diagonal)
    const releaseFinishedPointers = () => {
      if (pointersRef.current.size > 0) return;
      setPressedButtons(new Set());
      if (controlsRef.current) {
        Object.assign(controlsRef.current, EMPTY_CONTROLS);
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) clearAll();
    };

    window.addEventListener('pointerup', releaseFinishedPointers);
    window.addEventListener('pointercancel', releaseFinishedPointers);
    window.addEventListener('blur', clearAll);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('pointerup', releaseFinishedPointers);
      window.removeEventListener('pointercancel', releaseFinishedPointers);
      window.removeEventListener('blur', clearAll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [controlsRef]);

  const buttonStyle = (direction: Direction) => {
    const isPressed = pressedButtons.has(direction);
    return {
      transform: isPressed ? 'scale(0.9)' : 'scale(1)',
      boxShadow: isPressed
        ? '0 0 10px #FF1493, inset 0 0 12px rgba(255, 20, 147, 0.5)'
        : '0 0 12px #00FF00, 0 0 24px rgba(0, 255, 0, 0.25)',
      backgroundColor: isPressed ? '#00FF00' : '#FFD700',
    };
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <style>{`
        .arcade-button {
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(10px, 2.2vh, 14px);
          font-weight: bold;
          border: 2px solid #0080FF;
          border-radius: 50%;
          width: clamp(40px, 7.5vh, 44px);
          height: clamp(40px, 7.5vh, 44px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000;
          transition: transform 0.05s ease;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          touch-action: none;
        }

        .arcade-button:active {
          transform: scale(0.9);
        }

        .arcade-button:hover {
          filter: brightness(1.2);
        }

        .controls-container {
          display: flex;
          flex-direction: column;
          gap: clamp(4px, 1vh, 8px);
          align-items: center;
        }

        .dpad-row {
          display: flex;
          gap: clamp(4px, 1vh, 8px);
          justify-content: center;
        }

        .restart-button {
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(6px, 1.3vh, 9px);
          padding: clamp(5px, 1vh, 9px) clamp(8px, 1.4vw, 14px);
          color: #000;
          background: #FF1493;
          border: 2px solid #FFD700;
          border-radius: 8px;
          box-shadow: 0 0 12px #FF1493, 0 0 24px rgba(255, 20, 147, 0.35);
          white-space: nowrap;
          transition: transform 0.05s ease;
          touch-action: manipulation;
        }

        .restart-button:hover { filter: brightness(1.1); }
        .restart-button:active { transform: scale(0.94); }
      `}</style>

      <div className="controls-container">
        {/* Up Button */}
        <button
          type="button"
          className="arcade-button"
          aria-label="Mover para cima"
          style={buttonStyle('up')}
          onPointerDown={(e) => {
            e.preventDefault();
            press('up', e.pointerId);
          }}
          onPointerUp={(e) => release('up', e.pointerId)}
          onPointerCancel={(e) => release('up', e.pointerId)}
          onPointerLeave={(e) => release('up', e.pointerId)}
          onContextMenu={(e) => e.preventDefault()}
        >
          ↑
        </button>

        {/* Left, Down, Right Row */}
        <div className="dpad-row">
          {DIRECTIONS.filter(({ direction }) => direction !== 'up').map(({ direction, label }) => (
            <button
              key={direction}
              type="button"
              className="arcade-button"
              aria-label={`Mover para ${direction}`}
              style={buttonStyle(direction)}
              onPointerDown={(e) => {
                e.preventDefault();
                press(direction, e.pointerId);
              }}
              onPointerUp={(e) => release(direction, e.pointerId)}
              onPointerCancel={(e) => release(direction, e.pointerId)}
              onPointerLeave={(e) => release(direction, e.pointerId)}
              onContextMenu={(e) => e.preventDefault()}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Substitui a tecla R: funciona no desktop e no celular */}
      <button type="button" className="restart-button" onClick={onRestart}>
        REINICIAR
      </button>
    </div>
  );
};

export default GameControls;
