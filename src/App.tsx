/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Trophy, Play, RotateCcw } from 'lucide-react';

// --- Constants ---
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const BIRD_X = 50;
const BIRD_SIZE = 34;
const GRAVITY = 0.6;
const JUMP_STRENGTH = -8;
const PIPE_WIDTH = 60;
const PIPE_GAP = 160;
const PIPE_SPEED = 3;
const PIPE_SPAWN_RATE = 100; // frames

type GameState = 'START' | 'PLAYING' | 'GAME_OVER';

interface Pipe {
  x: number;
  topHeight: number;
  passed: boolean;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  // Game variables (refs to avoid re-renders during loop)
  const birdY = useRef(CANVAS_HEIGHT / 2);
  const birdVelocity = useRef(0);
  const pipes = useRef<Pipe[]>([]);
  const frameCount = useRef(0);
  const requestRef = useRef<number>(null);

  // --- Game Logic ---
  
  const resetGame = useCallback(() => {
    birdY.current = CANVAS_HEIGHT / 2;
    birdVelocity.current = 0;
    pipes.current = [];
    frameCount.current = 0;
    setScore(0);
    setGameState('PLAYING');
  }, []);

  const jump = useCallback(() => {
    if (gameState === 'PLAYING') {
      birdVelocity.current = JUMP_STRENGTH;
    } else if (gameState === 'START' || gameState === 'GAME_OVER') {
      resetGame();
    }
  }, [gameState, resetGame]);

  const update = useCallback(() => {
    if (gameState !== 'PLAYING') return;

    // Bird physics
    birdVelocity.current += GRAVITY;
    birdY.current += birdVelocity.current;

    // Ground/Ceiling collision
    if (birdY.current + BIRD_SIZE / 2 > CANVAS_HEIGHT || birdY.current - BIRD_SIZE / 2 < 0) {
      setGameState('GAME_OVER');
    }

    // Pipe logic
    frameCount.current++;
    if (frameCount.current % PIPE_SPAWN_RATE === 0) {
      const minPipeHeight = 50;
      const maxPipeHeight = CANVAS_HEIGHT - PIPE_GAP - minPipeHeight;
      const topHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;
      pipes.current.push({ x: CANVAS_WIDTH, topHeight, passed: false });
    }

    pipes.current.forEach((pipe, index) => {
      pipe.x -= PIPE_SPEED;

      // Collision detection
      const birdLeft = BIRD_X - BIRD_SIZE / 2 + 5;
      const birdRight = BIRD_X + BIRD_SIZE / 2 - 5;
      const birdTop = birdY.current - BIRD_SIZE / 2 + 5;
      const birdBottom = birdY.current + BIRD_SIZE / 2 - 5;

      if (
        birdRight > pipe.x &&
        birdLeft < pipe.x + PIPE_WIDTH &&
        (birdTop < pipe.topHeight || birdBottom > pipe.topHeight + PIPE_GAP)
      ) {
        setGameState('GAME_OVER');
      }

      // Scoring
      if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
        pipe.passed = true;
        setScore((s) => s + 1);
      }
    });

    // Remove off-screen pipes
    pipes.current = pipes.current.filter((pipe) => pipe.x + PIPE_WIDTH > 0);
  }, [gameState]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background (Sky)
    ctx.fillStyle = '#70c5ce';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Pipes
    pipes.current.forEach((pipe) => {
      // Top pipe
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      ctx.strokeStyle = '#27ae60';
      ctx.lineWidth = 4;
      ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);

      // Bottom pipe
      ctx.fillStyle = '#2ecc71';
      const bottomY = pipe.topHeight + PIPE_GAP;
      ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, CANVAS_HEIGHT - bottomY);
      ctx.strokeRect(pipe.x, bottomY, PIPE_WIDTH, CANVAS_HEIGHT - bottomY);
    });

    // Draw Bird
    ctx.save();
    ctx.translate(BIRD_X, birdY.current);
    // Rotate bird based on velocity
    const rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, birdVelocity.current * 0.1));
    ctx.rotate(rotation);
    
    // Bird body
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(8, -5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(10, -5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Wing
    ctx.fillStyle = '#e67e22';
    ctx.beginPath();
    ctx.ellipse(-5, 2, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }, []);

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      update();
      draw(ctx);
    }
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  // --- Effects ---

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
    }
  }, [score, highScore]);

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4 font-sans overflow-hidden select-none">
      <div className="relative shadow-2xl rounded-xl overflow-hidden border-4 border-neutral-800 bg-white">
        {/* Canvas Game Area */}
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={jump}
          className="cursor-pointer"
        />

        {/* Score Overlay */}
        {gameState === 'PLAYING' && (
          <div className="absolute top-8 left-0 right-0 text-center pointer-events-none">
            <h1 className="text-6xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
              {score}
            </h1>
          </div>
        )}

        {/* Start Screen */}
        {gameState === 'START' && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6">
            <div className="bg-yellow-400 p-4 rounded-full mb-6 animate-bounce shadow-lg">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                <div className="w-12 h-12 bg-yellow-400 rounded-full border-4 border-black" />
              </div>
            </div>
            <h2 className="text-4xl font-black mb-2 tracking-tighter uppercase">Flappy Bird</h2>
            <p className="text-neutral-200 mb-8 font-medium">Press SPACE or Click to jump</p>
            <button
              onClick={resetGame}
              className="bg-green-500 hover:bg-green-400 text-white px-8 py-4 rounded-2xl font-bold text-xl transition-all active:scale-95 flex items-center gap-2 shadow-[0_6px_0_rgb(21,128,61)] hover:shadow-[0_4px_0_rgb(21,128,61)] hover:translate-y-[2px] active:shadow-none active:translate-y-[6px]"
            >
              <Play fill="currentColor" size={24} />
              START GAME
            </button>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-white text-neutral-900 p-8 rounded-3xl shadow-2xl w-full max-w-[280px] text-center border-b-8 border-neutral-200">
              <h2 className="text-3xl font-black mb-6 uppercase tracking-tight text-red-500">Game Over</h2>
              
              <div className="flex justify-between items-center mb-4 bg-neutral-50 p-4 rounded-xl">
                <div className="text-left">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Score</p>
                  <p className="text-3xl font-black">{score}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Best</p>
                  <p className="text-3xl font-black text-yellow-500">{highScore}</p>
                </div>
              </div>

              {score >= highScore && score > 0 && (
                <div className="flex items-center justify-center gap-2 text-yellow-500 font-bold mb-6 animate-pulse">
                  <Trophy size={20} />
                  <span>NEW RECORD!</span>
                </div>
              )}

              <button
                onClick={resetGame}
                className="w-full bg-green-500 hover:bg-green-400 text-white py-4 rounded-2xl font-bold text-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_6px_0_rgb(21,128,61)] hover:shadow-[0_4px_0_rgb(21,128,61)] hover:translate-y-[2px] active:shadow-none active:translate-y-[6px]"
              >
                <RotateCcw size={24} />
                RETRY
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="mt-8 text-neutral-500 flex flex-col items-center gap-2">
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 rounded-lg text-xs font-mono">
            <span className="bg-neutral-700 px-1.5 py-0.5 rounded">SPACE</span>
            <span>JUMP</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 rounded-lg text-xs font-mono">
            <span className="bg-neutral-700 px-1.5 py-0.5 rounded">CLICK</span>
            <span>JUMP</span>
          </div>
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-50">Built with React & Canvas</p>
      </div>
    </div>
  );
}
