import KeroGame from '@/components/KeroGame';
import GameControls from '@/components/GameControls';

/**
 * Kero Mais Adventure - Main Game Page
 * 
 * Design Philosophy: Retro Arcade Vibrante
 * - Cores neon vibrantes
 * - Efeitos glow e scan lines
 * - Animações arcade responsivas
 */
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black" style={{
      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255, 215, 0, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(0, 128, 255, 0.1) 0%, transparent 50%)',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        
        body {
          background-color: #0A0E27;
          overflow: hidden;
        }
      `}</style>
      
      <main className="flex flex-col items-center justify-center w-full">
        <div className="mb-8 text-center">
          <h1 style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '32px',
            color: '#FFD700',
            textShadow: '0 0 20px #FFD700, 0 0 40px rgba(255, 215, 0, 0.5)',
            marginBottom: '8px',
          }}>
            KERO MAIS
          </h1>
          <p style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '12px',
            color: '#00FF00',
            textShadow: '0 0 10px #00FF00',
          }}>
            ADVENTURE
          </p>
        </div>

        {/* Game Canvas */}
        <div className="flex flex-col items-center gap-8">
          <KeroGame />
          
          {/* Controls */}
          <div style={{
            border: '3px solid #0080FF',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 0 20px #0080FF, inset 0 0 20px rgba(0, 128, 255, 0.2)',
            backgroundColor: 'rgba(10, 14, 39, 0.8)',
          }}>
            <GameControls />
          </div>

          {/* Instructions */}
          <div style={{
            color: '#00FF00',
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '10px',
            textAlign: 'center',
            textShadow: '0 0 10px #00FF00',
            maxWidth: '600px',
            lineHeight: '1.8',
          }}>
            <p>MOVE: ARROW KEYS or MOUSE</p>
            <p>AVOID OBSTACLES</p>
            <p>SCORE = TIME SURVIVED</p>
            <p>SPEED INCREASES OVER TIME</p>
            <p>PRESS R TO RESTART</p>
          </div>
        </div>
      </main>
    </div>
  );
}
