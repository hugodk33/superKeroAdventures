/**
 * Game Controls HUD
 * 
 * Design Philosophy: Retro Arcade Vibrante
 * - Botões grandes e redondos estilo arcade
 * - Efeitos glow e pulsação
 * - Feedback visual imediato ao click
 */

import React, { useState } from 'react';

interface GameControlsProps {
  onDirectionChange?: (direction: 'up' | 'down' | 'left' | 'right', pressed: boolean) => void;
}

const GameControls: React.FC<GameControlsProps> = ({ onDirectionChange }) => {
  const [pressedButtons, setPressedButtons] = useState<Set<string>>(new Set());

  const handleMouseDown = (direction: string) => {
    setPressedButtons(prev => new Set(prev).add(direction));
    onDirectionChange?.(direction as any, true);
  };

  const handleMouseUp = (direction: string) => {
    setPressedButtons(prev => {
      const newSet = new Set(prev);
      newSet.delete(direction);
      return newSet;
    });
    onDirectionChange?.(direction as any, false);
  };

  const ButtonStyle = (direction: string) => {
    const isPressed = pressedButtons.has(direction);
    return {
      transform: isPressed ? 'scale(0.9)' : 'scale(1)',
      boxShadow: isPressed 
        ? '0 0 20px #FF1493, inset 0 0 20px rgba(255, 20, 147, 0.5)' 
        : '0 0 30px #00FF00, 0 0 60px rgba(0, 255, 0, 0.3)',
      backgroundColor: isPressed ? '#00FF00' : '#FFD700',
      color: isPressed ? '#000' : '#000',
    };
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        
        .arcade-button {
          font-family: 'Press Start 2P', monospace;
          font-size: 12px;
          font-weight: bold;
          border: 3px solid #0080FF;
          border-radius: 50%;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.05s ease;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
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
          gap: 16px;
          align-items: center;
        }

        .dpad-row {
          display: flex;
          gap: 16px;
          justify-content: center;
        }

        .vertical-buttons {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
      `}</style>

      <div className="controls-container">
        {/* Up Button */}
        <button
          className="arcade-button"
          style={ButtonStyle('up')}
          onMouseDown={() => handleMouseDown('up')}
          onMouseUp={() => handleMouseUp('up')}
          onMouseLeave={() => handleMouseUp('up')}
          onTouchStart={() => handleMouseDown('up')}
          onTouchEnd={() => handleMouseUp('up')}
        >
          ↑
        </button>

        {/* Left, Down, Right Row */}
        <div className="dpad-row">
          <button
            className="arcade-button"
            style={ButtonStyle('left')}
            onMouseDown={() => handleMouseDown('left')}
            onMouseUp={() => handleMouseUp('left')}
            onMouseLeave={() => handleMouseUp('left')}
            onTouchStart={() => handleMouseDown('left')}
            onTouchEnd={() => handleMouseUp('left')}
          >
            ←
          </button>

          <button
            className="arcade-button"
            style={ButtonStyle('down')}
            onMouseDown={() => handleMouseDown('down')}
            onMouseUp={() => handleMouseUp('down')}
            onMouseLeave={() => handleMouseUp('down')}
            onTouchStart={() => handleMouseDown('down')}
            onTouchEnd={() => handleMouseUp('down')}
          >
            ↓
          </button>

          <button
            className="arcade-button"
            style={ButtonStyle('right')}
            onMouseDown={() => handleMouseDown('right')}
            onMouseUp={() => handleMouseUp('right')}
            onMouseLeave={() => handleMouseUp('right')}
            onTouchStart={() => handleMouseDown('right')}
            onTouchEnd={() => handleMouseUp('right')}
          >
            →
          </button>
        </div>
      </div>

      <div className="text-center mt-4">
        <p style={{ color: '#00FF00', fontFamily: "'Press Start 2P', monospace", fontSize: '10px', textShadow: '0 0 10px #00FF00' }}>
          USE ARROW KEYS OR MOUSE
        </p>
      </div>
    </div>
  );
};

export default GameControls;
