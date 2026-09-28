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
 * O personagem é animado com 8 PNGs (assets/sprint), um por quadro do voo. A
 * colisão usa só o corpo desenhado (medido na arte, sem a capa), nunca o
 * quadrado do quadro, e a pedra é comparada como elipse para não matar nas
 * bordas.
 *
 * Responsividade:
 * - O mundo do jogo tem resolução lógica fixa (1000x600), então a lógica
 *   (colisão, spawn, placar) é idêntica em qualquer dispositivo.
 * - O quadro do canvas é calculado em JS para caber em qualquer viewport
 *   (celular na horizontal, tablet, desktop) sem distorcer a proporção.
 * - O buffer do canvas nunca fica abaixo da resolução mínima interna, então
 *   o jogo não fica desfocado quando é reduzido para caber na tela.
 * - O input aceita teclado, mouse e toque (pointer events).
 * - "Começar" e "Jogar de novo" são botões na tela (não existe tecla R no
 *   celular), e o botão de reiniciar funciona em desktop e mobile.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  CANVAS_HEIGHT,
  CANVAS_RATIO,
  CANVAS_WIDTH,
  MIN_CANVAS_WIDTH,
  type ControlState,
  type Direction,
  type GameStatus,
} from '@/lib/game';
import {
  PLAYER_FRAME_HEIGHT,
  PLAYER_FRAME_URLS,
  PLAYER_FRAME_WIDTH,
  PLAYER_FPS,
  PLAYER_HITBOX,
  PLAYER_HOVER_FPS,
} from '@/lib/playerSprite';

interface KeroGameProps {
  /** Direções pressionadas (teclado + D-pad na tela compartilham o mesmo estado). */
  controlsRef: React.RefObject<ControlState>;
  /** Estado da partida. O canvas só roda a lógica quando está 'playing'. */
  status: GameStatus;
  /** Pontuação da última partida, mostrada no fim de jogo. */
  finalScore: number;
  /** Avisa o pai quando a partida termina por colisão. */
  onGameOver: (score: number) => void;
  /** Inicia/reinicia a partida (chamado pelo botão COMEÇAR / REINICIAR). */
  onRun: () => void;
  /** Muda a cada partida iniciada, usado para zerar o mundo do jogo. */
  runId: number;
}

// Estado do jogo - armazena todas as informações necessárias para a lógica
interface GameState {
  playerY: number;  // Posição Y do personagem (vertical)
  playerX: number;  // Posição X do personagem (horizontal)
  playerTilt: number; // Inclinação do personagem conforme a subida/descida
  animTime: number; // Tempo acumulado da animação de voo
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

const KeroGame: React.FC<KeroGameProps> = ({ controlsRef, status, finalScore, onGameOver, onRun, runId }) => {
  // Referência para o elemento canvas onde o jogo é renderizado
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Área disponível para o canvas (o pai dimensiona o quadro)
  const stageRef = useRef<HTMLDivElement>(null);

  // Tamanho do quadro em pixels de CSS, sempre no mesmo aspecto do mundo
  const [frame, setFrame] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

  // Referência para o estado do jogo (usa ref para evitar re-renders desnecessários)
  const gameStateRef = useRef<GameState>({
    playerY: 300,   // Posição inicial Y do personagem
    playerX: 80,    // Posição inicial X do personagem
    playerTilt: 0,  // Começa sem inclinação
    animTime: 0,    // Animação de voo começa no primeiro quadro
    score: 0,       // Pontuação inicial
    gameActive: false,   // Jogo só começa ao apertar COMEÇAR
    gameOver: false,    // Jogo não terminou inicialmente
    speed: 5,       // Velocidade inicial
    obstacles: [],   // Nenhum obstáculo no início
    particles: [],   // Nenhuma partícula no início
  });

  // Espelha o status do pai para o game loop ler sem recriar o efeito
  const statusRef = useRef<GameStatus>(status);
  // Callbacks em ref: o loop continua estável mesmo se o pai recriar as funções
  const onGameOverRef = useRef(onGameOver);
  // Direções pressionadas no teclado (independentes do joystick na tela)
  const keysRef = useRef<Set<Direction>>(new Set());
  // Escala entre coordenadas do mundo (1000x600) e o buffer do canvas
  const renderScaleRef = useRef(1);
  // Último runId processado, para zerar o mundo só uma vez por partida
  const lastRunRef = useRef(runId);

  // Referência para os quadros da animação carregados
  const playerFramesRef = useRef<HTMLImageElement[]>([]);
  // Referência para o ID do game loop (para poder cancelar depois)
  const gameLoopRef = useRef<number | null>(null);

  // Constantes do jogo - definem tamanhos, velocidades e proporções
  // O quadro do PNG é 322x210; em tela ele vira 141x92 (mesma proporção,
  // ~2x mais nitido que o necessario nos celulares)
  const PLAYER_HEIGHT = 92;
  const PLAYER_WIDTH = Math.round(PLAYER_HEIGHT * (PLAYER_FRAME_WIDTH / PLAYER_FRAME_HEIGHT));
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

  // Zera o mundo do jogo para uma nova partida
  const resetGame = () => {
    gameStateRef.current = {
      playerY: CANVAS_HEIGHT / 2 - PLAYER_HEIGHT / 2,
      playerX: 80,
      playerTilt: 0,
      animTime: 0,
      score: 0,
      gameActive: true,
      gameOver: false,
      speed: 5,
      obstacles: [],
      particles: [],
    };
  };

  // Caixa de colisão real do personagem: só o corpo desenhado, nunca o
  // quadrado inteiro do quadro (evita morrer quando a pedra ainda está longe)
  const playerHitBox = (state: GameState) => ({
    x: state.playerX + PLAYER_HITBOX.x * PLAYER_WIDTH,
    y: state.playerY + PLAYER_HITBOX.y * PLAYER_HEIGHT,
    width: PLAYER_HITBOX.width * PLAYER_WIDTH,
    height: PLAYER_HITBOX.height * PLAYER_HEIGHT,
  });

  // Mantém as refs em dia sem precisar recriar o game loop
  useEffect(() => {
    statusRef.current = status;
    onGameOverRef.current = onGameOver;
  }, [status, onGameOver]);

  // Zera o mundo quando uma nova partida é iniciada (botão COMEÇAR/REINICIAR)
  useEffect(() => {
    if (status !== 'playing' || lastRunRef.current === runId) return;
    lastRunRef.current = runId;
    resetGame();
  }, [status, runId]);

  // Calcula o tamanho do quadro: o menor retângulo 1000x600 que cabe na área
  // disponível. É isso que faz o canvas abrir no celular sem distorcer.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const update = () => {
      const { width, height } = stage.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const scale = Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT);
      const nextWidth = Math.max(1, Math.floor(CANVAS_WIDTH * scale));
      setFrame((current) => {
        const nextHeight = Math.round(nextWidth / CANVAS_RATIO);
        if (current.width === nextWidth && current.height === nextHeight) return current;
        return { width: nextWidth, height: nextHeight };
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    window.addEventListener('orientationchange', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  // Buffer de alta resolução: o canvas desenha em pelo menos MIN_CANVAS_WIDTH
  // de largura real, independente do tamanho exibido (nunca fica borrado).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateBuffer = () => {
      const cssWidth = canvas.clientWidth || CANVAS_WIDTH;
      const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 3);
      const scale = Math.max(
        (dpr * cssWidth) / CANVAS_WIDTH,
        MIN_CANVAS_WIDTH / CANVAS_WIDTH
      );
      const width = Math.round(CANVAS_WIDTH * scale);
      const height = Math.round(CANVAS_HEIGHT * scale);

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      renderScaleRef.current = scale;
    };

    updateBuffer();
    const observer = new ResizeObserver(updateBuffer);
    observer.observe(canvas);
    window.addEventListener('resize', updateBuffer);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateBuffer);
    };
  }, []);

  // Carrega os 8 quadros da sprint. Só publica a lista quando todos carregaram,
  // para a animação nunca piscar com um quadro faltando.
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      PLAYER_FRAME_URLS.map(
        (src) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`falha ao carregar ${src}`));
            img.src = src;
          })
      )
    )
      .then((frames) => {
        if (!cancelled) playerFramesRef.current = frames;
      })
      .catch(() => {
        /* fallback amarelo continua valendo */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Handle keyboard controls
  useEffect(() => {
    // O teclado tem estado próprio: soltar a tecla não cancela o D-pad
    // (e vice-versa), então dá para misturar os dois controles
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          keysRef.current.add('up');
          e.preventDefault();
          break;
        case 'arrowdown':
        case 's':
          keysRef.current.add('down');
          e.preventDefault();
          break;
        case 'arrowleft':
        case 'a':
          keysRef.current.add('left');
          e.preventDefault();
          break;
        case 'arrowright':
        case 'd':
          keysRef.current.add('right');
          e.preventDefault();
          break;
        case 'r':
        case 'enter':
        case ' ':
          // Atalho de desktop: o botão na tela cobre teclado e celular
          if (statusRef.current !== 'playing') {
            e.preventDefault();
            onRun();
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          keysRef.current.delete('up');
          break;
        case 'arrowdown':
        case 's':
          keysRef.current.delete('down');
          break;
        case 'arrowleft':
        case 'a':
          keysRef.current.delete('left');
          break;
        case 'arrowright':
        case 'd':
          keysRef.current.delete('right');
          break;
      }
    };

    // Se a aba perder o foco com a tecla pressionada, o personagem não foge
    const releaseKeys = () => keysRef.current.clear();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', releaseKeys);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', releaseKeys);
    };
  }, [onRun]);

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
    // O borrão acompanha o tamanho da fonte: se ficasse fixo, o texto
    // estourado no celular (ver hudScale) perderia a leitura.
    const glow = size * 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);

    // Add a brighter inner glow
    ctx.shadowBlur = glow * 0.4;
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
  // A pedra é desenhada como uma elipse (não um retângulo), então a colisão
  // usa o ponto da hitbox mais perto do centro da elipse: nos cantos o
  // personagem passa raspando em vez de morrer "no vazio" do retângulo.
  const checkCollision = (hitBox: { x: number; y: number; width: number; height: number }, obstacle: Obstacle): boolean => {
    const ellipseX = obstacle.x + obstacle.width / 2;
    const ellipseY = obstacle.y + obstacle.height / 2;
    const radiusX = (obstacle.width / 2) * 0.95;
    const radiusY = (obstacle.height / 2) * 0.95;

    const closestX = Math.max(hitBox.x, Math.min(ellipseX, hitBox.x + hitBox.width));
    const closestY = Math.max(hitBox.y, Math.min(ellipseY, hitBox.y + hitBox.height));
    const dx = (closestX - ellipseX) / radiusX;
    const dy = (closestY - ellipseY) / radiusY;

    return dx * dx + dy * dy <= 1;
  };

  // Game loop principal - executado a cada frame (~60fps)
  // Usa requestAnimationFrame para sincronizar com a taxa de atualização da tela
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Tempo do quadro em segundos (limitado para não pular a animação se a
    // aba travar por um instante)
    let lastTime = performance.now();

    const gameLoop = (now: number) => {
      const state = gameStateRef.current;
      const controls = controlsRef.current;
      const keys = keysRef.current;
      const scale = renderScaleRef.current;
      const delta = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      // Teclado + D-pad da tela contam como uma direção só
      const isPressed = (direction: Direction) => controls[direction] || keys.has(direction);

      // Desenha sempre na resolução lógica 1000x600, independente do buffer
      ctx.setTransform(scale, 0, 0, scale, 0, 0);

      // O HUD é desenhado em unidades do mundo, então um texto de tamanho fixo
      // vira pixel de borra no celular (o canvas aparece com ~500px em vez de
      // 1000px). Escala o HUD pela largura realmente visível para manter o
      // mesmo tamanho aparente na tela, com piso (não cresce no desktop) e
      // teto (não estoura em tela muito pequena).
      const visibleWidth = canvas.clientWidth || MIN_CANVAS_WIDTH;
      const hudScale = Math.max(1, Math.min(2.2, 875 / visibleWidth));

      // A lógica só roda com a partida ativa (botão COMEÇAR já pressionado)
      if (statusRef.current === 'playing' && state.gameActive && !state.gameOver) {
        const moveSpeed = 6; // Velocidade de movimento do personagem
        const previousX = state.playerX;
        const previousY = state.playerY;
        if (isPressed('up')) state.playerY = Math.max(0, state.playerY - moveSpeed);
        if (isPressed('down')) state.playerY = Math.min(CANVAS_HEIGHT - PLAYER_HEIGHT, state.playerY + moveSpeed);
        if (isPressed('left')) state.playerX = Math.max(0, state.playerX - moveSpeed);
        if (isPressed('right')) state.playerX = Math.min(CANVAS_WIDTH - PLAYER_WIDTH, state.playerX + moveSpeed);

        // Inclinação segue a subida/descida e volta ao nível sozinha
        const verticalDelta = state.playerY - previousY;
        state.playerTilt = Math.max(
          -14,
          Math.min(14, state.playerTilt * 0.88 + verticalDelta * 0.9)
        );

        // Animação de voo acelera enquanto o personagem se move
        const moving =
          verticalDelta !== 0 ||
          state.playerX !== previousX ||
          isPressed('left') ||
          isPressed('right');
        state.animTime += delta * (moving ? PLAYER_FPS : PLAYER_HOVER_FPS);

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
        const hitBox = playerHitBox(state);
        state.obstacles = state.obstacles.filter(obstacle => {
          obstacle.x -= state.speed; // Move o obstáculo para a esquerda baseado na velocidade

          // Verifica colisão entre personagem e obstáculo
          if (checkCollision(hitBox, obstacle)) {
            createParticles(state.playerX + PLAYER_WIDTH / 2, state.playerY + PLAYER_HEIGHT / 2);
            state.gameOver = true; // Termina o jogo em caso de colisão
            state.gameActive = false;
            statusRef.current = 'gameover';
            onGameOverRef.current(Math.floor(state.score));
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
      } else {
        // Fora da partida o personagem só paira (loop lento, sem inclinação)
        state.animTime += delta * PLAYER_HOVER_FPS;
        state.playerTilt *= 0.9;
      }

      // Update particles
      updateParticles();

      // Clear canvas
      ctx.fillStyle = COLORS.background;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw scan lines
      drawScanLines(ctx);

      // Desenha o personagem (sem brilho amarelo)
      const frames = playerFramesRef.current;
      const frame = frames.length
        ? frames[Math.floor(state.animTime) % frames.length]
        : null;
      if (frame) {
        ctx.save();
        // Inclina em torno do centro do quadro (a hitbox continua em pé)
        ctx.translate(state.playerX + PLAYER_WIDTH / 2, state.playerY + PLAYER_HEIGHT / 2);
        ctx.rotate((state.playerTilt * Math.PI) / 180);
        ctx.drawImage(
          frame,
          -PLAYER_WIDTH / 2,
          -PLAYER_HEIGHT / 2,
          PLAYER_WIDTH,
          PLAYER_HEIGHT
        );
        ctx.restore();
      } else {
        // Fallback: desenha um quadrado amarelo se a imagem não carregar
        ctx.fillStyle = COLORS.player;
        ctx.fillRect(state.playerX, state.playerY, PLAYER_WIDTH, PLAYER_HEIGHT);
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
      drawGlowText(
        ctx,
        `PONTOS: ${Math.floor(state.score)}`,
        20 * hudScale,
        20 * hudScale,
        16 * hudScale,
        COLORS.text
      );
      drawGlowText(
        ctx,
        `VELOCIDADE: ${state.speed.toFixed(1)}x`,
        20 * hudScale,
        52 * hudScale,
        14 * hudScale,
        COLORS.accent1
      );

      // Draw combo/streak indicator
      const comboText = `SEQUÊNCIA: ${Math.floor(state.score / 10)}`;
      ctx.font = `bold ${12 * hudScale}px "Press Start 2P", monospace`;
      ctx.textAlign = 'right';
      ctx.shadowColor = COLORS.accent2;
      ctx.shadowBlur = 15 * hudScale;
      ctx.fillStyle = COLORS.accent2;
      ctx.fillText(comboText, CANVAS_WIDTH - 20 * hudScale, 20 * hudScale);
      ctx.shadowBlur = 0;

      // Game over: só o efeito de glitch no canvas, o texto e o botão ficam
      // no overlay da DOM (assim funcionam no toque e escalam com a tela)
      if (state.gameOver) {
        const glitchOffset = Math.sin(Date.now() * 0.01) * 3;
        ctx.fillStyle = 'rgba(255, 20, 147, 0.1)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = 'rgba(255, 20, 147, 0.25)';
        ctx.fillRect(glitchOffset, CANVAS_HEIGHT / 2 - 40, CANVAS_WIDTH, 4);
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [controlsRef]);

  // O quadro é preenchido com o tamanho exato do canvas, então o texto do
  // overlay escala junto com o jogo (em vez de usar tamanho fixo de tela).
  const overlayFontSize = Math.max(9, Math.min(26, frame.width / 40));

  return (
    <div
      ref={stageRef}
      className="kg-stage flex min-h-0 min-w-0 w-full flex-1 items-center justify-center"
    >
      <style>{`
        .kg-frame {
          position: relative;
          flex: 0 0 auto;
        }

        .kg-canvas {
          display: block;
          width: 100%;
          height: 100%;
          border: 3px solid #00FF00;
          box-shadow: 0 0 20px #00FF00, inset 0 0 20px rgba(0, 255, 0, 0.2);
          /* Sem pixelated de propósito: o buffer já é desenhado em alta
             resolução e o redimensionamento suave evita serrilhado/piscar
             no texto e nas pedras quando o jogo é reduzido na tela. */
          touch-action: none;
        }

        .kg-overlay {
          position: absolute;
          inset: 0;
          z-index: 30;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1em;
          padding: 4%;
          text-align: center;
          background: rgba(10, 14, 39, 0.75);
        }

        .kg-overlay-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 2.1em;
          line-height: 1.5;
          color: #FFD700;
          text-shadow: 0 0 20px #FFD700, 0 0 40px rgba(255, 215, 0, 0.5);
        }

        .kg-overlay-sub {
          font-family: 'Press Start 2P', monospace;
          font-size: 1em;
          line-height: 1.8;
          color: #00FF00;
          text-shadow: 0 0 10px #00FF00;
        }

        .kg-button {
          font-family: 'Press Start 2P', monospace;
          font-size: 1.1em;
          line-height: 1.4;
          padding: 0.9em 1.2em;
          color: #000;
          background: #FFD700;
          border: 3px solid #FF1493;
          border-radius: 14px;
          box-shadow: 0 0 20px #FF1493, 0 0 40px rgba(255, 20, 147, 0.35);
          transition: transform 0.05s ease, filter 0.05s ease;
          touch-action: manipulation;
        }

        .kg-button:hover { filter: brightness(1.1); }
        .kg-button:active { transform: scale(0.94); }

        /* Celular: o jogo assume a tela toda (sem moldura), o canvas ocupa o
           maior retângulo 1000x600 possível e o joystick flutua por cima.
           O tamanho inline do frame (px) é anulado por !important. */
        @media (pointer: coarse) {
          .kg-stage {
            position: fixed;
            inset: 0;
            height: 100dvh;
            z-index: 10;
          }

          .kg-frame {
            width: 100% !important;
            height: 100% !important;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .kg-canvas {
            width: auto !important;
            height: auto !important;
            max-width: 100%;
            max-height: 100%;
            aspect-ratio: 5 / 3;
            border-width: 0;
            box-shadow: none;
          }
        }
      `}</style>

      <div className="kg-frame" style={{ width: frame.width, height: frame.height }}>
        <canvas ref={canvasRef} className="kg-canvas" />

        {status !== 'playing' && (
          <div className="kg-overlay" style={{ fontSize: `${overlayFontSize}px` }}>
            {status === 'gameover' ? (
              <>
                <h2 className="kg-overlay-title">FIM DE JOGO</h2>
                <p className="kg-overlay-sub">PONTUAÇÃO FINAL: {finalScore}</p>
                <button type="button" className="kg-button" onClick={onRun}>
                  JOGAR DE NOVO
                </button>
              </>
            ) : (
              <>
                <h2 className="kg-overlay-title">KERO MAIS</h2>
                <p className="kg-overlay-sub">
                  DESVIE DAS PEDRAS
                  <br />
                  O QUANTO MAIS VIVE, MAIS PONTOS
                </p>
                <button type="button" className="kg-button" onClick={onRun}>
                  COMEÇAR
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KeroGame;
