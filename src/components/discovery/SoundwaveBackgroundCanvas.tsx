import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  targetOpacity: number;
  orbitAngle: number;
  orbitSpeed: number;
  orbitRadius: number;
  waveX: number;
  waveIndex: number;
  waveLayer: number; // 0-2 for multiple wave lines
  isWaveParticle: boolean;
  driftAngle: number;
  driftSpeed: number;
  life: number;
  maxLife: number;
  spawnEdge: number; // 0=top, 1=right, 2=bottom, 3=left
}

function parseHslTriplet(input: string) {
  const parts = input.trim().split(/\s+/);
  if (parts.length < 3) return null;
  const h = Number(parts[0]);
  const s = Number(parts[1].replace("%", ""));
  const l = Number(parts[2].replace("%", ""));
  if (![h, s, l].every(Number.isFinite)) return null;
  return { h, s, l };
}

function makeHslaFromCssVar(varName: string) {
  const css = getComputedStyle(document.documentElement).getPropertyValue(varName);
  const parsed = parseHslTriplet(css);
  if (!parsed) return (a: number) => `hsla(50, 100%, 50%, ${a})`;
  return (a: number) => `hsla(${parsed.h}, ${parsed.s}%, ${parsed.l}%, ${a})`;
}

function generateWaveAmplitudes(count: number): number[] {
  const amplitudes: number[] = [];
  for (let i = 0; i < count; i++) {
    const base = Math.sin(i * 0.2) * 0.4 + 0.5;
    const noise = Math.random() * 0.3;
    const envelope = Math.sin((i / count) * Math.PI);
    amplitudes.push((base + noise) * envelope * 0.25 + 0.05);
  }
  return amplitudes;
}

function spawnFromEdge(edge: number): { x: number; y: number } {
  switch (edge) {
    case 0: return { x: Math.random(), y: -0.05 }; // top
    case 1: return { x: 1.05, y: Math.random() }; // right
    case 2: return { x: Math.random(), y: 1.05 }; // bottom
    case 3: return { x: -0.05, y: Math.random() }; // left
    default: return { x: Math.random(), y: -0.05 };
  }
}

function createParticle(id: number, isWave: boolean, waveIndex: number, waveX: number, waveLayer: number): Particle {
  const spawnEdge = Math.floor(Math.random() * 4);
  const spawn = isWave ? { x: waveX, y: Math.random() * 0.4 + 0.3 } : spawnFromEdge(spawnEdge);
  
  return {
    id,
    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
    size: Math.random() * 3 + (isWave ? 2 : 1.5),
    opacity: 0,
    targetOpacity: Math.random() * 0.3 + (isWave ? 0.2 : 0.1),
    orbitAngle: Math.random() * Math.PI * 2,
    orbitSpeed: (Math.random() * 0.012 + 0.004) * (Math.random() > 0.5 ? 1 : -1),
    orbitRadius: Math.random() * 0.02 + 0.01,
    waveX,
    waveIndex,
    waveLayer,
    isWaveParticle: isWave,
    driftAngle: Math.random() * Math.PI * 2,
    driftSpeed: Math.random() * 0.0004 + 0.0001,
    life: 1,
    maxLife: isWave ? 18 + Math.random() * 25 : 10 + Math.random() * 15,
    spawnEdge,
  };
}

export function SoundwaveBackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, lastMoveTime: 0 });
  const timeRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const waveAmplitudesRef = useRef<number[][]>([]);

  useEffect(() => {
    const waveLayers = 3;
    const waveCountPerLayer = 40;
    const ambientCount = 50;
    
    // Generate different amplitudes for each wave layer
    const allAmplitudes: number[][] = [];
    for (let layer = 0; layer < waveLayers; layer++) {
      allAmplitudes.push(generateWaveAmplitudes(waveCountPerLayer));
    }
    waveAmplitudesRef.current = allAmplitudes;

    const particles: Particle[] = [];
    
    // Wave particles for each layer
    for (let layer = 0; layer < waveLayers; layer++) {
      for (let i = 0; i < waveCountPerLayer; i++) {
        const waveX = 0.05 + (i / waveCountPerLayer) * 0.9;
        particles.push(createParticle(layer * waveCountPerLayer + i, true, i, waveX, layer));
      }
    }
    
    // Ambient floating particles
    for (let i = 0; i < ambientCount; i++) {
      particles.push(createParticle(waveLayers * waveCountPerLayer + i, false, -1, Math.random(), -1));
    }

    particlesRef.current = particles;

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const hsla = makeHslaFromCssVar("--primary");

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
        lastMoveTime: Date.now(),
      };
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);

    const draw = () => {
      timeRef.current += 1 / 60;
      const t = timeRef.current;
      const dt = 1 / 60;

      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;
      const ps = particlesRef.current;
      const allAmps = waveAmplitudesRef.current;

      const timeSinceMove = Date.now() - mouse.lastMoveTime;
      const cursorActive = timeSinceMove < 1000;

      for (const p of ps) {
        p.life -= dt / p.maxLife;
        
        if (p.life <= 0) {
          // Respawn from edges
          p.spawnEdge = Math.floor(Math.random() * 4);
          const spawn = p.isWaveParticle 
            ? { x: p.waveX + (Math.random() - 0.5) * 0.1, y: Math.random() > 0.5 ? -0.05 : 1.05 }
            : spawnFromEdge(p.spawnEdge);
          p.x = spawn.x;
          p.y = spawn.y;
          p.life = 1;
          p.maxLife = p.isWaveParticle ? 18 + Math.random() * 25 : 10 + Math.random() * 15;
          p.opacity = 0;
          p.vx = 0;
          p.vy = 0;
        }

        const lifeFade = p.life > 0.85 ? (1 - p.life) / 0.15 : p.life < 0.15 ? p.life / 0.15 : 1;
        const targetOp = p.targetOpacity * lifeFade;
        p.opacity += (targetOp - p.opacity) * 0.025;

        let targetX = p.x;
        let targetY = p.y;

        if (p.isWaveParticle && p.waveLayer >= 0) {
          const amps = allAmps[p.waveLayer] || [];
          const amplitude = amps[p.waveIndex] || 0.12;
          // Each layer has different phase and y-offset
          const layerOffset = (p.waveLayer - 1) * 0.08;
          const phaseOffset = p.waveLayer * 0.8;
          const waveY = 0.5 + layerOffset + Math.sin(t * 1.2 + p.waveIndex * 0.12 + phaseOffset) * amplitude;
          targetX = p.waveX;
          targetY = waveY;
        } else {
          p.driftAngle += p.driftSpeed * 0.4;
          targetX = p.x + Math.cos(p.driftAngle) * 0.0006;
          targetY = p.y + Math.sin(p.driftAngle * 0.6) * 0.0005;
        }

        // Cursor interaction
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const attractionRadius = 0.22;
        const orbitDistance = 0.06;

        if (cursorActive && dist < attractionRadius) {
          const influence = Math.pow(1 - dist / attractionRadius, 2.5);
          
          if (dist > orbitDistance) {
            const attractStrength = 0.00015 * influence;
            targetX = p.x + dx * attractStrength * 60;
            targetY = p.y + dy * attractStrength * 60;
          } else {
            p.orbitAngle += p.orbitSpeed * (0.4 + influence * 0.6);
            const orbitX = Math.cos(p.orbitAngle) * p.orbitRadius * (1 + influence * 0.5);
            const orbitY = Math.sin(p.orbitAngle) * p.orbitRadius * (1 + influence * 0.5);
            targetX = mouse.x + orbitX;
            targetY = mouse.y + orbitY;
          }
        }

        const returnStrength = p.isWaveParticle ? 0.006 : 0.002;
        const cursorStrength = cursorActive && dist < attractionRadius ? 0.018 : returnStrength;
        
        const targetVx = (targetX - p.x) * cursorStrength;
        const targetVy = (targetY - p.y) * cursorStrength;
        
        p.vx += (targetVx - p.vx) * 0.025;
        p.vy += (targetVy - p.vy) * 0.025;
        p.vx *= 0.988;
        p.vy *= 0.988;

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -0.15) p.x = 1.15;
        if (p.x > 1.15) p.x = -0.15;
        if (p.y < -0.15) p.y = 1.15;
        if (p.y > 1.15) p.y = -0.15;
      }

      // Draw particles
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = hsla(0.35);
      
      for (const p of ps) {
        if (p.opacity < 0.01) continue;
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = hsla(1);
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();

      if (!prefersReducedMotion) {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
      {/* Blurry yellow rays */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-[200%] h-[200%] -left-1/2 -top-1/2"
          style={{
            background: `
              conic-gradient(from 0deg at 50% 50%, 
                transparent 0deg, 
                hsl(50 100% 50% / 0.03) 15deg, 
                transparent 30deg,
                transparent 60deg,
                hsl(50 100% 50% / 0.04) 75deg,
                transparent 90deg,
                transparent 120deg,
                hsl(50 100% 50% / 0.025) 135deg,
                transparent 150deg,
                transparent 180deg,
                hsl(50 100% 50% / 0.035) 195deg,
                transparent 210deg,
                transparent 240deg,
                hsl(50 100% 50% / 0.03) 255deg,
                transparent 270deg,
                transparent 300deg,
                hsl(50 100% 50% / 0.04) 315deg,
                transparent 330deg,
                transparent 360deg
              )
            `,
            filter: 'blur(60px)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Central glow */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 50%, hsl(50 100% 50% / 0.06) 0%, transparent 60%)',
        }}
      />

      {/* Side glows */}
      <div 
        className="absolute top-1/4 -left-20 w-80 h-80 rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(50 100% 50% / 0.04) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div 
        className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(50 100% 50% / 0.035) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      {/* Canvas particles */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
