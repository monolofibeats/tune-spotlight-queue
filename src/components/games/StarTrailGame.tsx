import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Trophy, X, RotateCcw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSoundEffects } from '@/hooks/useSoundEffects';

// --- Shape generation ---
type Point = { x: number; y: number };
type ShapeDef = { name: string; icon: string; difficulty: Difficulty; generate: (n?: number) => Point[] };
type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; emoji: string; time: number; color: string }> = {
  easy:   { label: 'Easy',   emoji: '🟢', time: 15, color: 'text-green-400' },
  medium: { label: 'Medium', emoji: '🟡', time: 10, color: 'text-primary' },
  hard:   { label: 'Hard',   emoji: '🔴', time: 7,  color: 'text-destructive' },
};

const SHAPES: ShapeDef[] = [
  {
    name: 'Circle', icon: '⭕', difficulty: 'easy',
    generate: (n = 120) => Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 2;
      return { x: 0.5 + 0.35 * Math.cos(t), y: 0.5 + 0.35 * Math.sin(t) };
    }),
  },
  {
    name: 'Triangle', icon: '🔺', difficulty: 'easy',
    generate: (n = 120) => {
      const verts: Point[] = [{ x: 0.5, y: 0.12 }, { x: 0.87, y: 0.82 }, { x: 0.13, y: 0.82 }];
      const pts: Point[] = [];
      const perSide = Math.floor(n / 3);
      for (let s = 0; s < 3; s++) {
        const a = verts[s], b = verts[(s + 1) % 3];
        for (let i = 0; i < perSide; i++) {
          const t = i / perSide;
          pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        }
      }
      return pts;
    },
  },
  {
    name: 'Wave', icon: '🌊', difficulty: 'medium',
    generate: (n = 120) => Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      return { x: 0.1 + t * 0.8, y: 0.5 + 0.25 * Math.sin(t * Math.PI * 4) };
    }),
  },
  {
    name: 'Figure 8', icon: '♾️', difficulty: 'medium',
    generate: (n = 140) => Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 2;
      return { x: 0.5 + 0.3 * Math.sin(t), y: 0.5 + 0.25 * Math.sin(2 * t) };
    }),
  },
  {
    name: 'Spiral', icon: '🌀', difficulty: 'hard',
    generate: (n = 150) => Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 4;
      const r = 0.08 + (i / n) * 0.3;
      return { x: 0.5 + r * Math.cos(t), y: 0.5 + r * Math.sin(t) };
    }),
  },
  {
    name: 'Star', icon: '⭐', difficulty: 'hard',
    generate: (n = 150) => {
      const pts: Point[] = [];
      const spikes = 5;
      const outerR = 0.38, innerR = 0.15;
      const totalVerts = spikes * 2;
      const perSeg = Math.floor(n / totalVerts);
      const verts: Point[] = [];
      for (let i = 0; i < totalVerts; i++) {
        const angle = (i / totalVerts) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        verts.push({ x: 0.5 + r * Math.cos(angle), y: 0.5 + r * Math.sin(angle) });
      }
      for (let s = 0; s < totalVerts; s++) {
        const a = verts[s], b = verts[(s + 1) % totalVerts];
        for (let i = 0; i < perSeg; i++) {
          const t = i / perSeg;
          pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        }
      }
      return pts;
    },
  },
  {
    name: 'Heart', icon: '❤️', difficulty: 'hard',
    generate: (n = 140) => Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      return { x: 0.5 + x / 50, y: 0.48 + y / 50 };
    }),
  },
];

// --- Scoring ---
function calculateScore(playerPath: Point[], targetPoints: Point[], size: number): { accuracy: number; completion: number; score: number } {
  if (playerPath.length < 5) return { accuracy: 0, completion: 0, score: 0 };
  const threshold = 0.06;
  let totalDist = 0;
  for (const pp of playerPath) {
    const np = { x: pp.x / size, y: pp.y / size };
    let minD = Infinity;
    for (const tp of targetPoints) {
      const d = Math.hypot(np.x - tp.x, np.y - tp.y);
      if (d < minD) minD = d;
    }
    totalDist += minD;
  }
  const avgDist = totalDist / playerPath.length;
  const accuracy = Math.max(0, Math.min(100, Math.round((1 - avgDist / 0.3) * 100)));
  let covered = 0;
  for (const tp of targetPoints) {
    for (const pp of playerPath) {
      const np = { x: pp.x / size, y: pp.y / size };
      if (Math.hypot(np.x - tp.x, np.y - tp.y) < threshold) { covered++; break; }
    }
  }
  const completion = Math.round((covered / targetPoints.length) * 100);
  const score = Math.round(accuracy * 0.6 + completion * 0.4);
  return { accuracy, completion, score };
}

// --- Leaderboard ---
interface LeaderboardEntry {
  id: string;
  streamer_name: string;
  score: number;
  shape: string;
  created_at: string;
}

// --- Main Component ---
interface StarTrailGameProps {
  streamerId: string;
  streamerName: string;
  onClose?: () => void;
  readOnly?: boolean; // for public display
}

type GameState = 'idle' | 'playing' | 'finished';

export function StarTrailGame({ streamerId, streamerName, onClose, readOnly }: StarTrailGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
  const [currentShape, setCurrentShape] = useState<ShapeDef>(SHAPES[0]);
  const [timeLeft, setTimeLeft] = useState(10);
  const [result, setResult] = useState<{ accuracy: number; completion: number; score: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [scoreSaved, setScoreSaved] = useState(false);
  const { play } = useSoundEffects();

  const playerPathRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);
  const animFrameRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const particlesRef = useRef<{ x: number; y: number; life: number; vx: number; vy: number }[]>([]);
  const sizeRef = useRef(360);
  const lastSoundRef = useRef(0);
  // Chime sound – crossfade-looping the best section of the audio
  const audioCtxRef = useRef<AudioContext | null>(null);
  const chimeMasterRef = useRef<GainNode | null>(null);
  const chimeBufferRef = useRef<AudioBuffer | null>(null);
  const chimeTimerRef = useRef<ReturnType<typeof setInterval>>();
  const chimeActiveRef = useRef(false);

  // Preload the chime audio buffer once
  useEffect(() => {
    fetch('/sfx/chimes.wav')
      .then(r => r.arrayBuffer())
      .then(buf => {
        const ctx = new AudioContext();
        return ctx.decodeAudioData(buf).then(decoded => {
          chimeBufferRef.current = decoded;
          ctx.close();
        });
      })
      .catch(() => {});
    return () => { stopChimeSound(); };
  }, []);

  // Spawn one looping voice that fades in, plays the sweet spot, then fades out
  const spawnVoice = useCallback((ctx: AudioContext, buffer: AudioBuffer, master: GainNode) => {
    const duration = buffer.duration;
    // Use the middle ~40% as the "best part"
    const loopLen = Math.min(duration * 0.4, 3);  // max 3s loop segment
    const start = Math.max(0, (duration - loopLen) / 2);
    const fadeTime = Math.min(loopLen * 0.35, 0.8); // crossfade duration

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const voiceGain = ctx.createGain();
    voiceGain.gain.value = 0;
    source.connect(voiceGain);
    voiceGain.connect(master);

    const now = ctx.currentTime;
    source.start(now, start, loopLen);

    // Fade in
    voiceGain.gain.setTargetAtTime(1, now, fadeTime * 0.3);
    // Fade out before end
    voiceGain.gain.setTargetAtTime(0, now + loopLen - fadeTime, fadeTime * 0.3);

    // Auto-cleanup
    source.onended = () => {
      try { source.disconnect(); voiceGain.disconnect(); } catch {}
    };

    return loopLen;
  }, []);

  const startChimeSound = useCallback(() => {
    stopChimeSound();
    const buffer = chimeBufferRef.current;
    if (!buffer) return;

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    chimeActiveRef.current = true;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(ctx.destination);
    chimeMasterRef.current = masterGain;

    // Fade master in
    masterGain.gain.setTargetAtTime(0.22, ctx.currentTime, 0.1);

    // Calculate loop timing
    const duration = buffer.duration;
    const loopLen = Math.min(duration * 0.4, 3);
    const overlap = Math.min(loopLen * 0.35, 0.8);
    const interval = (loopLen - overlap) * 1000; // ms between spawns

    // Spawn first voice immediately
    spawnVoice(ctx, buffer, masterGain);

    // Keep spawning overlapping voices for seamless crossfade loop
    chimeTimerRef.current = setInterval(() => {
      if (!chimeActiveRef.current) return;
      const c = audioCtxRef.current;
      const b = chimeBufferRef.current;
      const m = chimeMasterRef.current;
      if (c && b && m) spawnVoice(c, b, m);
    }, interval);
  }, [spawnVoice]);

  const stopChimeSound = useCallback(() => {
    chimeActiveRef.current = false;
    clearInterval(chimeTimerRef.current);
    const ctx = audioCtxRef.current;
    const master = chimeMasterRef.current;
    if (ctx && master) {
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.18);
      setTimeout(() => {
        try { ctx.close(); } catch {}
      }, 500);
    }
    audioCtxRef.current = null;
    chimeMasterRef.current = null;
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabase
      .from('star_trail_scores')
      .select('id, streamer_name, score, shape, created_at')
      .order('score', { ascending: false })
      .limit(10);
    if (data) setLeaderboard(data);
  }, []);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  // Canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;
    const s = Math.min(container.clientWidth, container.clientHeight, 400);
    sizeRef.current = s;
    canvas.width = s * 2;
    canvas.height = s * 2;
    canvas.style.width = `${s}px`;
    canvas.style.height = `${s}px`;
  }, [gameState]);

  // Render loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = sizeRef.current;
    const scale = 2;
    const targetPts = currentShape.generate();

    const render = () => {
      ctx.clearRect(0, 0, size * scale, size * scale);

      // Background
      const bg = ctx.createRadialGradient(size, size, 0, size, size, size);
      bg.addColorStop(0, 'hsl(240 15% 8%)');
      bg.addColorStop(1, 'hsl(240 15% 4%)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size * scale, size * scale);

      // Subtle grid
      ctx.strokeStyle = 'hsla(0 0% 100% / 0.03)';
      ctx.lineWidth = 1;
      const gs = 30 * scale;
      for (let x = 0; x < size * scale; x += gs) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size * scale); ctx.stroke();
      }
      for (let y = 0; y < size * scale; y += gs) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size * scale, y); ctx.stroke();
      }

      // Target shape
      ctx.save();
      ctx.strokeStyle = 'hsla(45 90% 50% / 0.15)';
      ctx.lineWidth = 3 * scale;
      ctx.setLineDash([8 * scale, 6 * scale]);
      ctx.beginPath();
      targetPts.forEach((p, i) => {
        const px = p.x * size * scale, py = p.y * size * scale;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.restore();

      // Player trail
      const path = playerPathRef.current;
      if (path.length > 1) {
        for (let i = 1; i < path.length; i++) {
          const age = 1 - (i / path.length) * 0.7;
          const alpha = Math.max(0.05, age);
          const glow = 4 + age * 8;
          ctx.save();
          ctx.shadowColor = `hsla(45 90% 60% / ${alpha})`;
          ctx.shadowBlur = glow * scale;
          ctx.strokeStyle = `hsla(45 90% 50% / ${alpha})`;
          ctx.lineWidth = (2 + age * 2) * scale;
          ctx.beginPath();
          ctx.moveTo(path[i - 1].x * scale, path[i - 1].y * scale);
          ctx.lineTo(path[i].x * scale, path[i].y * scale);
          ctx.stroke();
          ctx.restore();
        }
        const tip = path[path.length - 1];
        ctx.save();
        ctx.shadowColor = 'hsla(45 95% 65% / 0.9)';
        ctx.shadowBlur = 20 * scale;
        ctx.fillStyle = 'hsla(45 95% 70% / 0.95)';
        ctx.beginPath();
        ctx.arc(tip.x * scale, tip.y * scale, 4 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Particles
      const parts = particlesRef.current;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.02;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.shadowColor = 'hsla(45 90% 70% / 0.8)';
        ctx.shadowBlur = 6 * scale;
        ctx.fillStyle = 'hsla(45 90% 70% / 1)';
        ctx.beginPath();
        ctx.arc(p.x * scale, p.y * scale, (1 + p.life * 2) * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [gameState, currentShape]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    const totalTime = DIFFICULTY_CONFIG[selectedDifficulty].time;
    setTimeLeft(totalTime);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 4 && prev > 1) play('pop', 0.15);
        if (prev <= 1) { endRound(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gameState, selectedDifficulty]);

  const endRound = useCallback(() => {
    clearInterval(timerRef.current);
    // Stop chime sound
    stopChimeSound();
    const size = sizeRef.current;
    const targetPts = currentShape.generate();
    const r = calculateScore(playerPathRef.current, targetPts, size);
    setResult(r);
    setGameState('finished');
    setScoreSaved(false);
    // Score reveal sound
    if (r.score >= 80) play('tada', 0.3);
    else if (r.score >= 50) play('success', 0.25);
    else play('ding', 0.2);
  }, [currentShape, play]);

  const startRound = () => {
    const shapesForDiff = SHAPES.filter(s => s.difficulty === selectedDifficulty);
    const pool = shapesForDiff.length > 0 ? shapesForDiff : SHAPES;
    const shape = pool[Math.floor(Math.random() * pool.length)];
    setCurrentShape(shape);
    playerPathRef.current = [];
    particlesRef.current = [];
    setResult(null);
    setGameState('playing');
    play('woosh', 0.2);
  };

  const saveScore = async () => {
    if (!result || scoreSaved) return;
    await supabase.from('star_trail_scores').insert({
      streamer_id: streamerId,
      streamer_name: streamerName,
      score: result.score,
      accuracy: result.accuracy,
      completion: result.completion,
      shape: currentShape.name,
    });
    setScoreSaved(true);
    play('success', 0.3);
    fetchLeaderboard();
  };

  // Input handlers
  const getPos = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const addPoint = (pos: Point) => {
    playerPathRef.current.push(pos);
    for (let i = 0; i < 2; i++) {
      particlesRef.current.push({
        x: pos.x, y: pos.y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 0.5 + Math.random() * 0.5,
      });
    }
    // Keep sparkle audio playing while drawing (started on pointer down)
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== 'playing') return;
    e.preventDefault();
    isDrawingRef.current = true;
    const pos = getPos(e);
    if (pos) addPoint(pos);
    // Start continuous chime synth
    startChimeSound();
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || gameState !== 'playing') return;
    e.preventDefault();
    const pos = getPos(e);
    if (pos) addPoint(pos);
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    // Stop chime synth
    stopChimeSound();
  };

  // Read-only leaderboard mode for public page
  if (readOnly) {
    return (
      <div className="w-full">
        {leaderboard.length > 0 ? (
          <div className="space-y-1">
            {leaderboard.slice(0, 5).map((entry, i) => (
              <div
                key={entry.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-card/20 backdrop-blur-sm border border-border/20"
              >
                <span className={`w-5 text-right font-bold ${i < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </span>
                <span className="flex-1 truncate font-medium text-foreground">{entry.streamer_name}</span>
                <span className="text-muted-foreground text-[10px]">{entry.shape}</span>
                <span className="font-bold text-primary tabular-nums">{entry.score}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3">No scores yet — be the first!</p>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-card/20 backdrop-blur-xl border border-border/30 w-full max-w-[520px] mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-primary fill-primary" />
          <h3 className="text-sm font-bold text-foreground">Star Trail</h3>
        </div>
        <div className="flex items-center gap-2">
          {gameState === 'playing' && (
            <span className={`text-xs font-mono font-bold tabular-nums ${timeLeft <= 3 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
              {timeLeft}s
            </span>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1 rounded-full hover:bg-card/40 transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Difficulty selector - shown in idle state */}
      {gameState === 'idle' && (
        <div className="flex gap-1.5 w-full">
          {(Object.entries(DIFFICULTY_CONFIG) as [Difficulty, typeof DIFFICULTY_CONFIG.easy][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setSelectedDifficulty(key)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                selectedDifficulty === key
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border/20 bg-card/10 text-muted-foreground hover:bg-card/20'
              }`}
            >
              <span>{cfg.emoji}</span>
              <span>{cfg.label}</span>
              <span className="text-[9px] opacity-60">{cfg.time}s</span>
            </button>
          ))}
        </div>
      )}

      {/* Shape indicator */}
      {gameState === 'playing' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Zap className={`w-3 h-3 ${DIFFICULTY_CONFIG[currentShape.difficulty].color}`} />
          Trace the <span className="text-primary font-semibold">{currentShape.icon} {currentShape.name}</span>
        </div>
      )}

      {/* Canvas */}
      <div className="relative w-full aspect-square max-w-[400px] rounded-xl overflow-hidden border border-border/20">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none"
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />

        {/* Idle overlay */}
        <AnimatePresence>
          {gameState === 'idle' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm"
            >
              <Star className="w-12 h-12 text-primary fill-primary animate-pulse" />
              <p className="text-sm text-muted-foreground text-center px-6">
                Trace glowing shapes with your cursor.<br />
                How accurate can you get?
              </p>
              <Button onClick={startRound} variant="hero" size="lg">
                Start Round
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Finished overlay */}
        <AnimatePresence>
          {gameState === 'finished' && result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/85 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
                className="text-5xl font-black text-primary"
              >
                {result.score}
              </motion.div>
              <div className="text-xs text-muted-foreground mb-1">
                {currentShape.icon} {currentShape.name} · {DIFFICULTY_CONFIG[currentShape.difficulty].emoji} {DIFFICULTY_CONFIG[currentShape.difficulty].label}
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <div className="text-center">
                  <div className="text-foreground font-bold">{result.accuracy}%</div>
                  <div>Accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-foreground font-bold">{result.completion}%</div>
                  <div>Completion</div>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                {!scoreSaved ? (
                  <Button onClick={saveScore} variant="hero" size="sm">
                    <Trophy className="w-3.5 h-3.5" /> Save Score
                  </Button>
                ) : (
                  <span className="text-xs text-primary font-semibold">✓ Saved!</span>
                )}
                <Button onClick={startRound} variant="secondary" size="sm">
                  <RotateCcw className="w-3.5 h-3.5" /> Again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && gameState !== 'playing' && (
        <div className="w-full mt-1">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Trophy className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Top Star Tracers</span>
          </div>
          <div className="space-y-0.5 max-h-[160px] overflow-y-auto">
            {leaderboard.map((entry, i) => (
              <div
                key={entry.id}
                className="flex items-center gap-2 px-2 py-1 rounded-md text-[11px] bg-card/10 border border-border/10"
              >
                <span className={`w-4 text-right font-bold ${i < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </span>
                <span className="flex-1 truncate text-foreground">{entry.streamer_name}</span>
                <span className="text-muted-foreground">{entry.shape}</span>
                <span className="font-bold text-primary tabular-nums">{entry.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
