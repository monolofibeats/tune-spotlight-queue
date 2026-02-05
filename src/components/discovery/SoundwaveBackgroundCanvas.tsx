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
  isWaveParticle: boolean;
  driftAngle: number;
  driftSpeed: number;
  life: number;
  maxLife: number;
  spawnEdge: number;
}

interface WaveLine {
  points: number[];
  phase: number;
  speed: number;
  amplitude: number;
  yOffset: number;
  opacity: number;
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

function spawnFromEdge(edge: number): { x: number; y: number } {
  switch (edge) {
    case 0: return { x: Math.random(), y: -0.05 };
    case 1: return { x: 1.05, y: Math.random() };
    case 2: return { x: Math.random(), y: 1.05 };
    case 3: return { x: -0.05, y: Math.random() };
    default: return { x: Math.random(), y: -0.05 };
  }
}

function createParticle(id: number): Particle {
  const spawnEdge = Math.floor(Math.random() * 4);
  const spawn = spawnFromEdge(spawnEdge);
  
  return {
    id,
    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
    size: Math.random() * 2.5 + 1,
    opacity: 0,
    targetOpacity: Math.random() * 0.25 + 0.08,
    orbitAngle: Math.random() * Math.PI * 2,
    orbitSpeed: (Math.random() * 0.01 + 0.003) * (Math.random() > 0.5 ? 1 : -1),
    orbitRadius: Math.random() * 0.018 + 0.008,
    isWaveParticle: false,
    driftAngle: Math.random() * Math.PI * 2,
    driftSpeed: Math.random() * 0.0003 + 0.0001,
    life: 1,
    maxLife: 12 + Math.random() * 18,
    spawnEdge,
  };
}

function createWaveLines(): WaveLine[] {
  const lines: WaveLine[] = [];
  const lineCount = 12;
  
  for (let i = 0; i < lineCount; i++) {
    const pointCount = 80;
    const points: number[] = [];
    
    // Generate smooth wave with multiple frequencies
    for (let j = 0; j < pointCount; j++) {
      const x = j / pointCount;
      // Combine multiple sine waves for organic shape
      const baseWave = Math.sin(x * Math.PI * 2 + i * 0.3) * 0.5;
      const harmonic1 = Math.sin(x * Math.PI * 4 + i * 0.5) * 0.25;
      const harmonic2 = Math.sin(x * Math.PI * 6 + i * 0.7) * 0.15;
      const envelope = Math.sin(x * Math.PI); // Fade at edges
      points.push((baseWave + harmonic1 + harmonic2) * envelope);
    }
    
    lines.push({
      points,
      phase: i * 0.4,
      speed: 0.3 + Math.random() * 0.4,
      amplitude: 0.06 + (i % 4) * 0.025,
      yOffset: (i - lineCount / 2) * 0.012,
      opacity: 0.08 + (1 - Math.abs(i - lineCount / 2) / (lineCount / 2)) * 0.15,
    });
  }
  
  return lines;
}

export function SoundwaveBackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, lastMoveTime: 0 });
  const timeRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const waveLinesRef = useRef<WaveLine[]>([]);

  useEffect(() => {
    const ambientCount = 60;
    const particles: Particle[] = [];
    
    for (let i = 0; i < ambientCount; i++) {
      particles.push(createParticle(i));
    }
    particlesRef.current = particles;
    waveLinesRef.current = createWaveLines();

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
      const waves = waveLinesRef.current;

      const timeSinceMove = Date.now() - mouse.lastMoveTime;
      const cursorActive = timeSinceMove < 1000;

      // Draw flowing wave lines
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      for (const wave of waves) {
        ctx.beginPath();
        ctx.strokeStyle = hsla(wave.opacity);
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 8;
        ctx.shadowColor = hsla(wave.opacity * 0.6);
        
        const points = wave.points;
        const centerY = 0.5 + wave.yOffset;
        
        for (let i = 0; i < points.length; i++) {
          const x = 0.05 + (i / points.length) * 0.9;
          // Animate the wave with time
          const animatedY = points[i] * Math.sin(t * wave.speed + wave.phase + i * 0.05);
          const y = centerY + animatedY * wave.amplitude;
          
          if (i === 0) {
            ctx.moveTo(x * width, y * height);
          } else {
            // Use quadratic curves for smoothness
            const prevX = 0.05 + ((i - 1) / points.length) * 0.9;
            const prevAnimatedY = points[i - 1] * Math.sin(t * wave.speed + wave.phase + (i - 1) * 0.05);
            const prevY = centerY + prevAnimatedY * wave.amplitude;
            
            const cpX = (prevX + x) / 2 * width;
            const cpY = (prevY + y) / 2 * height;
            ctx.quadraticCurveTo(prevX * width, prevY * height, cpX, cpY);
          }
        }
        ctx.stroke();
      }
      ctx.restore();

      // Update and draw particles
      for (const p of ps) {
        p.life -= dt / p.maxLife;
        
        if (p.life <= 0) {
          p.spawnEdge = Math.floor(Math.random() * 4);
          const spawn = spawnFromEdge(p.spawnEdge);
          p.x = spawn.x;
          p.y = spawn.y;
          p.life = 1;
          p.maxLife = 12 + Math.random() * 18;
          p.opacity = 0;
          p.vx = 0;
          p.vy = 0;
        }

        const lifeFade = p.life > 0.85 ? (1 - p.life) / 0.15 : p.life < 0.15 ? p.life / 0.15 : 1;
        const targetOp = p.targetOpacity * lifeFade;
        p.opacity += (targetOp - p.opacity) * 0.025;

        // Drift toward wave center area
        let targetX = p.x;
        let targetY = p.y;
        
        p.driftAngle += p.driftSpeed * 0.4;
        targetX = p.x + Math.cos(p.driftAngle) * 0.0005;
        targetY = p.y + Math.sin(p.driftAngle * 0.6) * 0.0004;
        
        // Gentle pull toward center band
        const centerPull = (0.5 - p.y) * 0.0003;
        targetY += centerPull;

        // Cursor interaction
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const attractionRadius = 0.2;
        const orbitDistance = 0.05;

        if (cursorActive && dist < attractionRadius) {
          const influence = Math.pow(1 - dist / attractionRadius, 2.5);
          
          if (dist > orbitDistance) {
            const attractStrength = 0.00012 * influence;
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

        const cursorStrength = cursorActive && dist < attractionRadius ? 0.015 : 0.002;
        
        const targetVx = (targetX - p.x) * cursorStrength;
        const targetVy = (targetY - p.y) * cursorStrength;
        
        p.vx += (targetVx - p.vx) * 0.02;
        p.vy += (targetVy - p.vy) * 0.02;
        p.vx *= 0.99;
        p.vy *= 0.99;

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -0.1) p.x = 1.1;
        if (p.x > 1.1) p.x = -0.1;
        if (p.y < -0.1) p.y = 1.1;
        if (p.y > 1.1) p.y = -0.1;
      }

      // Draw particles
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = hsla(0.3);
      
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

      {/* Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
