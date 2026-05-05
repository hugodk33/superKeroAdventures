/**
 * Kero Mais Adventure - Game Component
 * 
 * Design Philosophy: Retro Arcade Vibrante
 * - Cores neon vibrantes (amarelo, verde, rosa, azul)
 * - Efeitos glow e scan lines
 * - Animações arcade responsivas
 * - Feedback visual imediato
 * 
 * O jogo usa Canvas 2D para renderização do personagem, obstáculos e partículas.
 * O personagem agora usa a imagem da pasta assets em vez da imagem padrão.
 */

import React, { useEffect, useRef, useState } from 'react';
// Importa a imagem do personagem da pasta assets
import playerImageSrc from '@/assets/a5d65872-63f2-4c21-a5df-3ab1a147386c.png';

// Estado do jogo - armazena todas as informações necessárias para a lógica
interface GameState {
  playerY: number;  // Posição Y do personagem (vertical)
  playerX: number;  // Posição X do personagem (horizontal)
  score: number;    // Pontuação atual do jogador
  gameActive: boolean;  // Indica se o jogo está em andamento
  gameOver: boolean;    // Indica se o jogo terminou
  speed: number;    // Velocidade atual do jogo (aumenta com o tempo)
  obstacles: Obstacle[];  // Lista de obstáculos ativos na tela
  particles: Particle[]; // Lista de partículas (efeitos visuais)
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  passed: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface ControlState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

const KeroGame: React.FC = () => {
  // Referência para o elemento canvas onde o jogo é renderizado
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Referência para o estado do jogo (usa ref para evitar re-renders desnecessários)
  const gameStateRef = useRef<GameState>({
    playerY: 300,   // Posição inicial Y do personagem
    playerX: 80,    // Posição inicial X do personagem
    score: 0,       // Pontuação inicial
    gameActive: true,   // Jogo começa ativo
    gameOver: false,    // Jogo não terminou inicialmente
    speed: 5,       // Velocidade inicial
    obstacles: [],   // Nenhum obstáculo no início
    particles: [],   // Nenhuma partícula no início
  });

  // Referência para os controles (teclas pressionadas)
  const controlsRef = useRef<ControlState>({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  // Referência para a imagem do personagem carregada
  const playerImageRef = useRef<HTMLImageElement | null>(null);
  // Referência para o ID do game loop (para poder cancelar depois)
  const gameLoopRef = useRef<number | null>(null);

  // Constantes do jogo - definem tamanhos, velocidades e proporções
  const CANVAS_WIDTH = 1000;    // Largura do canvas
  const CANVAS_HEIGHT = 600;    // Altura do canvas
  const PLAYER_SIZE = 100;      // Tamanho do personagem (dobrado de 50 para 100)
  const OBSTACLE_WIDTH = 60;    // Largura dos obstáculos
  const OBSTACLE_HEIGHT = 80;   // Altura dos obstáculos
  const MAX_SPEED = 15;         // Velocidade máxima do jogo
  const BASE_SPAWN_RATE = 0.015; // Taxa base de spawn de obstáculos

  // Cores no estilo Arcade Vibrante com céu claro
  const COLORS = {
    background: '#87CEEB', // Azul céu claro
    player: '#FFD700',
    playerGlow: '#FFD700',
    obstacle: '#8B7355', // Marrom rochoso
    obstacleGlow: '#A0522D', // Marrom mais escuro para sombra
    rockHighlight: '#D2B48C', // Destaque da rocha (bege)
    rockShadow: '#654321', // Sombra da rocha
    accent1: '#00FF00',
    accent2: '#0080FF',
    scanLine: 'rgba(255, 255, 255, 0.03)',
    text: '#2F4F4F', // Texto escuro para contrastar com o céu
    textGlow: '#2F4F4F',
    warning: '#FF6600',
  };

  // Carrega a imagem do personagem da pasta assets
  // A imagem é importada via webpack/Vite e armazenada na ref quando carregada
  useEffect(() => {
    const img = new Image();
    img.src = playerImageSrc;
    img.onload = () => {
      playerImageRef.current = img;
    };
  }, []);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          controlsRef.current.up = true;
          e.preventDefault();
          break;
        case 'arrowdown':
        case 's':
          controlsRef.current.down = true;
          e.preventDefault();
          break;
        case 'arrowleft':
        case 'a':
          controlsRef.current.left = true;
          e.preventDefault();
          break;
        case 'arrowright':
        case 'd':
          controlsRef.current.right = true;
          e.preventDefault();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          controlsRef.current.up = false;
          break;
        case 'arrowdown':
        case 's':
          controlsRef.current.down = false;
          break;
        case 'arrowleft':
        case 'a':
          controlsRef.current.left = false;
          break;
        case 'arrowright':
        case 'd':
          controlsRef.current.right = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Handle canvas click and drag
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isMouseDown = false;

    const handleMouseDown = () => {
      isMouseDown = true;
    };

    const handleMouseUp = () => {
      isMouseDown = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;

      const rect = canvas.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      const mouseX = e.clientX - rect.left;

      // Smooth movement towards mouse position
      const state = gameStateRef.current;
      if (state.gameActive && !state.gameOver) {
        const dx = mouseX - (state.playerX + PLAYER_SIZE / 2);
        const dy = mouseY - (state.playerY + PLAYER_SIZE / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 10) {
          const speed = 7;
          state.playerX += (dx / distance) * speed;
          state.playerY += (dy / distance) * speed;

          // Clamp player position
          state.playerX = Math.max(0, Math.min(CANVAS_WIDTH - PLAYER_SIZE, state.playerX));
          state.playerY = Math.max(0, Math.min(CANVAS_HEIGHT - PLAYER_SIZE, state.playerY));
        }
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseUp);
    };
  }, []);

  // Desenha efeito de brilho (glow) ao redor de um elemento
  // Usa gradiente radial para criar o efeito neon
  const drawGlow = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string,
    glowSize: number = 20
  ) => {
    const gradient = ctx.createRadialGradient(x + size / 2, y + size / 2, 0, x + size / 2, y + size / 2, glowSize);
    gradient.addColorStop(0, color + '60');
    gradient.addColorStop(0.5, color + '30');
    gradient.addColorStop(1, color + '00');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - glowSize, y - glowSize, size + glowSize * 2, size + glowSize * 2);
  };

  // Draw scan lines effect - mais sutil para fundo de céu claro
  const drawScanLines = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(135, 206, 235, 0.1)'; // Cor do céu com baixa opacidade
    ctx.lineWidth = 1;
    for (let i = 0; i < CANVAS_HEIGHT; i += 4) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_WIDTH, i);
      ctx.stroke();
    }
  };

  // Draw text with glow
  const drawGlowText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    size: number,
    color: string
  ) => {
    ctx.font = `bold ${size}px "Press Start 2P", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Glow effect with multiple layers
    ctx.shadowColor = color;
    ctx.shadowBlur = 25;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    
    // Add a brighter inner glow
    ctx.shadowBlur = 10;
    ctx.fillText(text, x, y);

    ctx.shadowBlur = 0;
  };

  // Create particles on collision
  const createParticles = (x: number, y: number, count: number = 12) => {
    const state = gameStateRef.current;
    const colors = [COLORS.accent1, COLORS.accent2, COLORS.obstacle, COLORS.warning];
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 5;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  };

  // Update particles
  const updateParticles = () => {
    const state = gameStateRef.current;
    state.particles = state.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2; // gravity
      p.life -= 0.02;
      return p.life > 0;
    });
  };

  // Draw particles
  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    const state = gameStateRef.current;
    state.particles.forEach(p => {
      ctx.globalAlpha = p.life * 0.8;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(p.x, p.y, 5, 5);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    });
  };

  // Check collision
  const checkCollision = (playerX: number, playerY: number, obstacle: Obstacle): boolean => {
    return !(
      playerX + PLAYER_SIZE < obstacle.x ||
      playerX > obstacle.x + obstacle.width ||
      playerY + PLAYER_SIZE < obstacle.y ||
      playerY > obstacle.y + obstacle.height
    );
  };

  // Game loop principal - executado a cada frame (~60fps)
  // Usa requestAnimationFrame para sincronizar com a taxa de atualização da tela
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      const state = gameStateRef.current;
      const controls = controlsRef.current;

      // Atualiza a posição do personagem baseado nas teclas pressionadas
      if (state.gameActive && !state.gameOver) {
        const moveSpeed = 6; // Velocidade de movimento do personagem
        if (controls.up) state.playerY = Math.max(0, state.playerY - moveSpeed);
        if (controls.down) state.playerY = Math.min(CANVAS_HEIGHT - PLAYER_SIZE, state.playerY + moveSpeed);
        if (controls.left) state.playerX = Math.max(0, state.playerX - moveSpeed);
        if (controls.right) state.playerX = Math.min(CANVAS_WIDTH - PLAYER_SIZE, state.playerX + moveSpeed);

        // Aumenta a velocidade gradualmente conforme o jogador pontua
        state.speed = Math.min(MAX_SPEED, 5 + state.score * 0.002);

        // Spawn de obstáculos - probabilidade aumenta com a pontuação
        // Novos obstáculos aparecem do lado direito e se movem para a esquerda
        if (Math.random() < BASE_SPAWN_RATE + state.score * 0.0001) {
          state.obstacles.push({
            x: CANVAS_WIDTH,  // Começa fora da tela à direita
            y: Math.random() * (CANVAS_HEIGHT - OBSTACLE_HEIGHT), // Posição Y aleatória
            width: OBSTACLE_WIDTH,
            height: OBSTACLE_HEIGHT,
            passed: false, // Indica se o jogador já passou por este obstáculo
          });
        }

        // Atualiza a posição dos obstáculos (movem da direita para a esquerda)
        state.obstacles = state.obstacles.filter(obstacle => {
          obstacle.x -= state.speed; // Move o obstáculo para a esquerda baseado na velocidade

          // Verifica colisão entre personagem e obstáculo
          if (checkCollision(state.playerX, state.playerY, obstacle)) {
            createParticles(state.playerX + PLAYER_SIZE / 2, state.playerY + PLAYER_SIZE / 2);
            state.gameOver = true; // Termina o jogo em caso de colisão
            state.gameActive = false;
            return false; // Remove o obstáculo que causou a colisão
          }

          // Pontua quando o personagem passa pelo obstáculo
          if (!obstacle.passed && obstacle.x + obstacle.width < state.playerX) {
            obstacle.passed = true;
            state.score += 1; // Incrementa a pontuação
          }

          // Mantém apenas obstáculos que ainda estão visíveis na tela
          return obstacle.x > -OBSTACLE_WIDTH;
        });

      // Increase score based on time (more points as speed increases)
      state.score += 0.016 * (1 + state.speed * 0.1); // ~60fps with speed multiplier
      }

      // Update particles
      updateParticles();

      // Clear canvas
      ctx.fillStyle = COLORS.background;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw scan lines
      drawScanLines(ctx);

      // Desenha o personagem (sem brilho amarelo)
      if (playerImageRef.current) {
        // Desenha a imagem do personagem carregada da pasta assets
        ctx.drawImage(playerImageRef.current, state.playerX, state.playerY, PLAYER_SIZE, PLAYER_SIZE);
      } else {
        // Fallback: desenha um quadrado amarelo se a imagem não carregar
        ctx.fillStyle = COLORS.player;
        ctx.fillRect(state.playerX, state.playerY, PLAYER_SIZE, PLAYER_SIZE);
      }

      // Desenha obstáculos no estilo rochas
      state.obstacles.forEach((obstacle, index) => {
        // Efeito de brilho pulsante para as rochas
        const pulseAmount = Math.sin(Date.now() * 0.005 + index) * 5 + 15;
        drawGlow(ctx, obstacle.x, obstacle.y, obstacle.width, COLORS.obstacleGlow, pulseAmount);

        // Desenha a rocha como um polígono irregular para parecer uma rocha
        ctx.beginPath();
        
        // Cria uma forma irregular para a rocha
        const centerX = obstacle.x + obstacle.width / 2;
        const centerY = obstacle.y + obstacle.height / 2;
        const radiusX = obstacle.width / 2;
        const radiusY = obstacle.height / 2;
        
        // Desenha uma forma oval irregular (rocha)
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          // Adiciona variação aleatória baseada no índice para forma única
          const variation = 0.85 + 0.15 * Math.sin(angle * 3 + index);
          const x = centerX + Math.cos(angle) * radiusX * variation;
          const y = centerY + Math.sin(angle) * radiusY * variation;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        
        // Preenche com gradiente marrom rochoso
        const rockGradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, Math.max(radiusX, radiusY)
        );
        rockGradient.addColorStop(0, COLORS.rockHighlight);
        rockGradient.addColorStop(0.7, COLORS.obstacle);
        rockGradient.addColorStop(1, COLORS.rockShadow);
        ctx.fillStyle = rockGradient;
        ctx.fill();
        
        // Adiciona detalhes na rocha (linhas para textura)
        ctx.strokeStyle = COLORS.rockShadow;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Adiciona algumas linhas de textura para parecer rocha
        ctx.beginPath();
        ctx.moveTo(obstacle.x + obstacle.width * 0.3, obstacle.y + obstacle.height * 0.2);
        ctx.lineTo(obstacle.x + obstacle.width * 0.5, obstacle.y + obstacle.height * 0.4);
        ctx.lineTo(obstacle.x + obstacle.width * 0.7, obstacle.y + obstacle.height * 0.3);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(obstacle.x + obstacle.width * 0.4, obstacle.y + obstacle.height * 0.6);
        ctx.lineTo(obstacle.x + obstacle.width * 0.6, obstacle.y + obstacle.height * 0.8);
        ctx.stroke();
      });

      // Draw particles
      drawParticles(ctx);

      // Draw HUD
      drawGlowText(ctx, `SCORE: ${Math.floor(state.score)}`, 20, 20, 16, COLORS.text);
      drawGlowText(ctx, `SPEED: ${state.speed.toFixed(1)}x`, 20, 50, 14, COLORS.accent1);
      
      // Draw combo/streak indicator
      const comboText = `STREAK: ${Math.floor(state.score / 10)}`;
      ctx.font = 'bold 12px "Press Start 2P", monospace';
      ctx.textAlign = 'right';
      ctx.shadowColor = COLORS.accent2;
      ctx.shadowBlur = 15;
      ctx.fillStyle = COLORS.accent2;
      ctx.fillText(comboText, CANVAS_WIDTH - 20, 20);
      ctx.shadowBlur = 0;

      // Draw game over screen
      if (state.gameOver) {
        // Glitch effect background
        ctx.fillStyle = 'rgba(255, 20, 147, 0.1)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Glitch effect with multiple offsets
        const glitchOffset = Math.sin(Date.now() * 0.01) * 3;
        drawGlowText(ctx, 'GAME OVER', CANVAS_WIDTH / 2 - 180 + glitchOffset, CANVAS_HEIGHT / 2 - 80, 28, COLORS.obstacle);
        
        // Draw final score with emphasis
        ctx.font = 'bold 16px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = COLORS.text;
        ctx.shadowBlur = 20;
        ctx.fillStyle = COLORS.text;
        ctx.fillText(`FINAL SCORE: ${Math.floor(state.score)}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
        ctx.shadowBlur = 0;
        
        // Restart instruction
        ctx.font = 'bold 12px "Press Start 2P", monospace';
        ctx.shadowColor = COLORS.accent2;
        ctx.shadowBlur = 15;
        ctx.fillStyle = COLORS.accent2;
        ctx.fillText('PRESS R TO RESTART', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
        ctx.shadowBlur = 0;
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  // Handle restart
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r' && gameStateRef.current.gameOver) {
        gameStateRef.current = {
          playerY: 300,
          playerX: 80,
          score: 0,
          gameActive: true,
          gameOver: false,
          speed: 5,
          obstacles: [],
          particles: [],
        };
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        
        canvas {
          border: 4px solid #00FF00;
          box-shadow: 0 0 20px #00FF00, inset 0 0 20px rgba(0, 255, 0, 0.2);
          image-rendering: pixelated;
          image-rendering: -moz-crisp-edges;
          image-rendering: crisp-edges;
        }
      `}</style>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="mb-8"
      />
    </div>
  );
};

export default KeroGame;
