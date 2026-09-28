import React, { useEffect, useRef, useState } from 'react';
import { EMPTY_CONTROLS, type ControlState } from '@/lib/game';

/**
 * Raio do deslocamento do knob (em px). A deflexão do stick é normalizada
 * por esse valor antes de virar direção.
 */
const RADIUS = 36;
/**
 * Deflexão mínima (normalizada -1..1) a partir da qual uma direção conta.
 * É "digital": o movimento vira liga/desliga (igual ao teclado), sem
 * velocidade proporcional à inclinação.
 */
const THRESHOLD = 0.2;
/** Deflexão "cheia" usada pelo teclado para o knob visual. */
const KEY_FORCE = 0.75;

const KEY_MAP: Record<string, string> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
};

interface AnalogStickProps {
  controlsRef: React.RefObject<ControlState>;
  onRestart?: () => void;
}

/**
 * Joystick analógico digital: substitui o D-pad de botões.
 *
 * Funciona por toque (celular), arrastando com o mouse (desktop) e também
 * pelas setas/WASD do teclado — qualquer entrada se reflete no knob e
 * escreve as direções digitais no controlsRef compartilhado.
 */
export default function AnalogStick({ controlsRef, onRestart }: AnalogStickProps) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const keysRef = useRef<Set<string>>(new Set());

  const reset = () => {
    Object.assign(controlsRef.current, EMPTY_CONTROLS);
    setKnob({ x: 0, y: 0 });
  };

  const applyVector = (nx: number, ny: number, vx: number, vy: number) => {
    const controls = controlsRef.current;
    controls.up = ny < -THRESHOLD;
    controls.down = ny > THRESHOLD;
    controls.left = nx < -THRESHOLD;
    controls.right = nx > THRESHOLD;
    setKnob({ x: vx, y: vy });
  };

  useEffect(() => {
    const keyboardVector = () => {
      const k = keysRef.current;
      const right = k.has('ArrowRight') || k.has('d') || k.has('D');
      const left = k.has('ArrowLeft') || k.has('a') || k.has('A');
      const up = k.has('ArrowUp') || k.has('w') || k.has('W');
      const down = k.has('ArrowDown') || k.has('s') || k.has('S');
      const x = Math.max(-1, Math.min(1, Number(right) - Number(left)));
      const y = Math.max(-1, Math.min(1, Number(down) - Number(up)));
      return { x, y, vx: x * RADIUS * KEY_FORCE, vy: y * RADIUS * KEY_FORCE };
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Ignora modificadores e teclas que não são direção (R, Enter, Espaço...)
      if (!(e.key in KEY_MAP)) return;
      // Com o dedo/mouse no stick, o teclado não briga com o toque
      if (originRef.current) return;
      keysRef.current.add(e.key);
      const { x, y, vx, vy } = keyboardVector();
      applyVector(x, y, vx, vy);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!keysRef.current.delete(e.key)) return;
      if (originRef.current) return;
      const { x, y, vx, vy } = keyboardVector();
      if (!x && !y) reset();
      else applyVector(x, y, vx, vy);
    };

    const clearAll = () => {
      keysRef.current.clear();
      originRef.current = null;
      pointerIdRef.current = null;
      reset();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearAll);
    document.addEventListener('visibilitychange', clearAll);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearAll);
      document.removeEventListener('visibilitychange', clearAll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const root = rootRef.current;
    if (!root) return;
    root.setPointerCapture?.(e.pointerId);
    pointerIdRef.current = e.pointerId;
    originRef.current = { x: e.clientX, y: e.clientY };
    reset();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pointerIdRef.current || !originRef.current) return;
    let dx = e.clientX - originRef.current.x;
    let dy = e.clientY - originRef.current.y;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    applyVector(dx / RADIUS, dy / RADIUS, dx, dy);
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pointerIdRef.current) return;
    originRef.current = null;
    pointerIdRef.current = null;
    reset();
  };

  return (
    <div className="analog-stick">
      <style>{`
        .analog-stick {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(6px, 1.2vh, 12px);
          padding: clamp(4px, 0.8vh, 10px);
          border: 2px solid #0080FF;
          border-radius: 10px;
          box-shadow: 0 0 12px #0080FF, inset 0 0 14px rgba(0, 128, 255, 0.2);
          background-color: rgba(10, 14, 39, 0.8);
          border-radius: 14px;
          touch-action: none;
        }

        .analog-base {
          position: relative;
          width: 78px;
          height: 78px;
          border-radius: 50%;
          border: 2px solid rgba(0, 255, 0, 0.6);
          background: rgba(255, 255, 255, 0.05);
          box-shadow: inset 0 0 18px rgba(0, 255, 0, 0.12), 0 0 12px rgba(0, 255, 0, 0.25);
        }

        .analog-knob {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(0, 255, 0, 0.7);
          border: 2px solid #fff;
          box-shadow: 0 0 10px rgba(0, 255, 0, 0.8), inset 0 0 6px rgba(255, 255, 255, 0.4);
          pointer-events: none;
          transform: translate(-50%, -50%) translate(${knob.x}px, ${knob.y}px);
        }

        .analog-restart {
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(6px, 1.3vh, 9px);
          padding: clamp(5px, 1vh, 9px) clamp(8px, 1.4vw, 14px);
          color: #000;
          background: #FF1493;
          border: 2px solid #FFD700;
          border-radius: 8px;
          box-shadow: 0 0 12px #FF1493, 0 0 24px rgba(255, 20, 147, 0.35);
          white-space: nowrap;
          touch-action: manipulation;
        }

        .analog-restart:hover { filter: brightness(1.1); }
        .analog-restart:active { transform: scale(0.94); }

        /* Celular: o stick vira o único controle, flutuando sobre o canvas
           cheio no canto inferior direito, sem a moldura/barra do desktop. */
        @media (pointer: coarse) {
          .analog-stick {
            position: fixed;
            right: max(18px, env(safe-area-inset-right, 0px));
            bottom: max(18px, env(safe-area-inset-bottom, 0px));
            padding: 10px;
            border-radius: 50%;
            border-width: 2px;
            z-index: 20;
            background-color: rgba(10, 14, 39, 0.45);
          }

          .analog-restart { display: none; }
        }
      `}</style>

      <div
        ref={rootRef}
        className="analog-base"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onContextMenu={(e) => e.preventDefault()}
        role="application"
        aria-label="Joystick de direção"
      >
        <div className="analog-knob" />
      </div>

      {onRestart && (
        <button type="button" className="analog-restart" onClick={onRestart}>
          REINICIAR
        </button>
      )}
    </div>
  );
}