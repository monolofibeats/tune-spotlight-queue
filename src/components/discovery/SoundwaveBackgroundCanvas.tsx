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
  baseYOffset: number;
  currentYOffset: number;
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
    case 0: return { x: Math.random(), y: -0.08 };
    case 1: return { x: 1.08, y: Math.random() };
    case 2: return { x: Math.random(), y: 1.08 };
    case 3: return { x: -0.08, y: Math.random() };
    default: return { x: Math.random(), y: -0.08 };
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
    size: Math.random() * 3 + 2,
    opacity: 0,
    targetOpacity: Math.random() * 0.5 + 0.3,
    orbitAngle: Math.random() * Math.PI * 2,
    orbitSpeed: (Math.random() * 0.006 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
    orbitRadius: Math.random() * 0.012 + 0.006,
    driftAngle: Math.random() * Math.PI * 2,
    driftSpeed: Math.random() * 0.00015 + 0.00005,
    life: 1,
    maxLife: 18 + Math.random() * 25,
    spawnEdge,
  };
}

function createWaveLines(): WaveLine[] {
  const lines: WaveLine[] = [];
  const lineCount = 14;
  
  for (let i = 0; i < lineCount; i++) {
    const pointCount = 100;
    const points: number[] = [];
    
    for (let j = 0; j < pointCount; j++) {
      const x = j / pointCount;
      const baseWave = Math.sin(x * Math.PI * 2.5 + i * 0.25) * 0.6;
      const harmonic1 = Math.sin(x * Math.PI * 5 + i * 0.4) * 0.3;
      const harmonic2 = Math.sin(x * Math.PI * 7.5 + i * 0.6) * 0.15;
      points.push(baseWave + harmonic1 + harmonic2);
    }
    
    const baseYOffset = (i - lineCount / 2) * 0.01;
    
    lines.push({
      points,
      phase: i * 0.35,
      speed: 0.25 + Math.random() * 0.35,
      amplitude: 0.055 + (i % 5) * 0.018,
      baseYOffset,
      currentYOffset: baseYOffset,
      opacity: 0.06 + (1 - Math.abs(i - lineCount / 2) / (lineCount / 2)) * 0.14,
    });
  }
  
  return lines;
}

export function SoundwaveBackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, smoothX: 0.5, smoothY: 0.5, lastMoveTime: 0 });
  const timeRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const waveLinesRef = useRef<WaveLine[]>([]);
  const waveExpansionRef = useRef(0);

  useEffect(() => {
    const particleCount = 80;
    const particles: Particle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
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
      mouseRef.current.x = (e.clientX - rect.left) / rect.width;
      mouseRef.current.y = (e.clientY - rect.top) / rect.height;
      mouseRef.current.lastMoveTime = Date.now();
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

      // Smooth mouse position for wave interaction - very slow for ultra smooth effect
      mouse.smoothX += (mouse.x - mouse.smoothX) * 0.02;
      mouse.smoothY += (mouse.y - mouse.smoothY) * 0.02;

      // Cursor is always active when on the canvas (no timeout)
      const cursorActive = true;
      const cursorInfluenceRadius = 0.3;
      
      // Check if cursor is near wave center area (wider detection zone)
      const cursorNearWave = Math.abs(mouse.smoothY - 0.5) < 0.35;
      
      // Very smooth wave expansion (waves spread apart when cursor is near)
      const targetExpansion = cursorNearWave ? 2.2 : 1;
      waveExpansionRef.current += (targetExpansion - waveExpansionRef.current) * 0.008;

      // Draw flowing wave lines with smooth cursor interaction
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      for (let wi = 0; wi < waves.length; wi++) {
        const wave = waves[wi];
        
        // Smoothly expand wave offset based on cursor proximity
        const targetOffset = wave.baseYOffset * waveExpansionRef.current;
        wave.currentYOffset += (targetOffset - wave.currentYOffset) * 0.03;
        
        ctx.beginPath();
        ctx.strokeStyle = hsla(wave.opacity);
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = hsla(wave.opacity * 0.5);
        
        const points = wave.points;
        const centerY = 0.5 + wave.currentYOffset;
        
        for (let i = 0; i < points.length; i++) {
          const x = i / (points.length - 1);
          const animatedY = points[i] * Math.sin(t * wave.speed + wave.phase + i * 0.04);
          let y = centerY + animatedY * wave.amplitude;
          
          // Smooth cursor wave distortion - gentle pull toward/away from cursor
          // Always apply cursor influence when near
          const dx = x - mouse.smoothX;
          const dy = y - mouse.smoothY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < cursorInfluenceRadius) {
            // Quartic falloff for even smoother transition
            const influence = Math.pow(1 - dist / cursorInfluenceRadius, 4);
            // Expand up/down from cursor position - gentler effect
              const expandDirection = y > mouse.smoothY ? 1 : -1;
              y += expandDirection * influence * 0.06;
            }
          }
          
          if (i === 0) {
            ctx.moveTo(x * width, y * height);
          } else {
            const prevX = (i - 1) / (points.length - 1);
            let prevAnimatedY = points[i - 1] * Math.sin(t * wave.speed + wave.phase + (i - 1) * 0.04);
            let prevY = centerY + prevAnimatedY * wave.amplitude;
            
            if (cursorActive) {
              const pdx = prevX - mouse.smoothX;
              const pdy = prevY - mouse.smoothY;
              const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
              if (pDist < cursorInfluenceRadius) {
                const influence = Math.pow(1 - pDist / cursorInfluenceRadius, 3);
                const expandDirection = prevY > mouse.smoothY ? 1 : -1;
                prevY += expandDirection * influence * 0.06;
              }
            }
            
            const cpX = (prevX + x) / 2 * width;
            const cpY = (prevY + y) / 2 * height;
            ctx.quadraticCurveTo(prevX * width, prevY * height, cpX, cpY);
          }
        }
        ctx.stroke();
      }
      ctx.restore();

      // Update particles
      for (const p of ps) {
        p.life -= dt / p.maxLife;
        
        if (p.life <= 0) {
          p.spawnEdge = Math.floor(Math.random() * 4);
          const spawn = spawnFromEdge(p.spawnEdge);
          p.x = spawn.x;
          p.y = spawn.y;
          p.life = 1;
          p.maxLife = 18 + Math.random() * 25;
          p.opacity = 0;
          p.vx = 0;
          p.vy = 0;
        }

        const lifeFade = p.life > 0.85 ? (1 - p.life) / 0.15 : p.life < 0.15 ? p.life / 0.15 : 1;
        const targetOp = p.targetOpacity * lifeFade;
        p.opacity += (targetOp - p.opacity) * 0.02;

        let targetX = p.x;
        let targetY = p.y;
        
        // Gentle drift
        p.driftAngle += p.driftSpeed * 0.25;
        targetX = p.x + Math.cos(p.driftAngle) * 0.0003;
        targetY = p.y + Math.sin(p.driftAngle * 0.4) * 0.00025;
        
        // Pull toward wave center band
        const centerPull = (0.5 - p.y) * 0.00015;
        targetY += centerPull;

        // Cursor interaction
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const attractionRadius = 0.18;
        const orbitDistance = 0.04;

        if (cursorActive && dist < attractionRadius) {
          const influence = Math.pow(1 - dist / attractionRadius, 2.5);
          
          if (dist > orbitDistance) {
            const attractStrength = 0.00008 * influence;
            targetX = p.x + dx * attractStrength * 60;
            targetY = p.y + dy * attractStrength * 60;
          } else {
            p.orbitAngle += p.orbitSpeed * (0.25 + influence * 0.75);
            const orbitX = Math.cos(p.orbitAngle) * p.orbitRadius * (1 + influence * 0.5);
            const orbitY = Math.sin(p.orbitAngle) * p.orbitRadius * (1 + influence * 0.5);
            targetX = mouse.x + orbitX;
            targetY = mouse.y + orbitY;
          }
        }

        const cursorStrength = cursorActive && dist < attractionRadius ? 0.01 : 0.001;
        
        const targetVx = (targetX - p.x) * cursorStrength;
        const targetVy = (targetY - p.y) * cursorStrength;
        
        p.vx += (targetVx - p.vx) * 0.015;
        p.vy += (targetVy - p.vy) * 0.015;
        p.vx *= 0.994;
        p.vy *= 0.994;

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -0.1) p.x = 1.1;
        if (p.x > 1.1) p.x = -0.1;
        if (p.y < -0.1) p.y = 1.1;
        if (p.y > 1.1) p.y = -0.1;
      }

      // Draw particles (small sprinkles)
      ctx.save();
      ctx.shadowBlur = 6;
      ctx.shadowColor = hsla(0.2);
      
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
