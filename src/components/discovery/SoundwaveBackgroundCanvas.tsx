import { useEffect, useRef } from "react";

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
  isWaveParticle: boolean;
  driftAngle: number;
  driftSpeed: number;
  life: number; // 0-1, when 0 respawns
  maxLife: number;
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
    const base = Math.sin(i * 0.25) * 0.35 + 0.5;
    const noise = Math.random() * 0.25;
    const envelope = Math.sin((i / count) * Math.PI);
    amplitudes.push((base + noise) * envelope * 0.3 + 0.08);
  }
  return amplitudes;
}

function createParticle(id: number, isWave: boolean, waveIndex: number, waveX: number): Particle {
  return {
    id,
    x: isWave ? waveX : Math.random(),
    y: Math.random() * 0.6 + 0.2,
    vx: 0,
    vy: 0,
    size: Math.random() * 3 + (isWave ? 2.5 : 1.5),
    opacity: 0,
    targetOpacity: Math.random() * 0.35 + (isWave ? 0.25 : 0.12),
    orbitAngle: Math.random() * Math.PI * 2,
    orbitSpeed: (Math.random() * 0.015 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
    orbitRadius: Math.random() * 0.025 + 0.015,
    waveX,
    waveIndex,
    isWaveParticle: isWave,
    driftAngle: Math.random() * Math.PI * 2,
    driftSpeed: Math.random() * 0.0003 + 0.0001,
    life: 1,
    maxLife: isWave ? 15 + Math.random() * 20 : 8 + Math.random() * 12,
  };
}

export function SoundwaveBackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, lastMoveTime: 0 });
  const timeRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const waveAmplitudesRef = useRef<number[]>([]);

  useEffect(() => {
    const waveCount = 60;
    const ambientCount = 40;
    const waveAmplitudes = generateWaveAmplitudes(waveCount);
    waveAmplitudesRef.current = waveAmplitudes;

    const particles: Particle[] = [];
    
    // Wave particles
    for (let i = 0; i < waveCount; i++) {
      const waveX = 0.08 + (i / waveCount) * 0.84;
      particles.push(createParticle(i, true, i, waveX));
    }
    
    // Ambient floating particles
    for (let i = 0; i < ambientCount; i++) {
      particles.push(createParticle(waveCount + i, false, -1, Math.random()));
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
      const waveAmps = waveAmplitudesRef.current;

      const timeSinceMove = Date.now() - mouse.lastMoveTime;
      const cursorActive = timeSinceMove < 800;

      for (const p of ps) {
        // Life cycle - fade in/out
        p.life -= dt / p.maxLife;
        
        if (p.life <= 0) {
          // Respawn particle
          if (p.isWaveParticle) {
            p.x = p.waveX + (Math.random() - 0.5) * 0.1;
            p.y = Math.random() > 0.5 ? 0.1 : 0.9;
          } else {
            p.x = Math.random();
            p.y = Math.random() > 0.5 ? -0.05 : 1.05;
          }
          p.life = 1;
          p.maxLife = p.isWaveParticle ? 15 + Math.random() * 20 : 8 + Math.random() * 12;
          p.opacity = 0;
          p.vx = 0;
          p.vy = 0;
        }

        // Smooth opacity based on life (fade in first 20%, fade out last 20%)
        const lifeFade = p.life > 0.8 ? (1 - p.life) / 0.2 : p.life < 0.2 ? p.life / 0.2 : 1;
        const targetOp = p.targetOpacity * lifeFade;
        p.opacity += (targetOp - p.opacity) * 0.02;

        let targetX = p.x;
        let targetY = p.y;

        if (p.isWaveParticle) {
          // Wave target position
          const amplitude = waveAmps[p.waveIndex] || 0.15;
          const waveY = 0.5 + Math.sin(t * 1.5 + p.waveIndex * 0.15) * amplitude;
          targetX = p.waveX;
          targetY = waveY;
        } else {
          // Ambient drift
          p.driftAngle += p.driftSpeed * 0.5;
          targetX = p.x + Math.cos(p.driftAngle) * 0.0008;
          targetY = p.y + Math.sin(p.driftAngle * 0.7) * 0.0006;
        }

        // Cursor interaction - ultra smooth
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const attractionRadius = 0.25;
        const orbitDistance = 0.07;

        if (cursorActive && dist < attractionRadius) {
          const influence = Math.pow(1 - dist / attractionRadius, 2); // quadratic falloff
          
          if (dist > orbitDistance) {
            // Gentle attraction
            const attractStrength = 0.0002 * influence;
            targetX = p.x + dx * attractStrength * 60;
            targetY = p.y + dy * attractStrength * 60;
          } else {
            // Smooth orbit
            p.orbitAngle += p.orbitSpeed * (0.5 + influence * 0.5);
            const orbitX = Math.cos(p.orbitAngle) * p.orbitRadius * (1 + influence);
            const orbitY = Math.sin(p.orbitAngle) * p.orbitRadius * (1 + influence);
            targetX = mouse.x + orbitX;
            targetY = mouse.y + orbitY;
          }
        }

        // Ultra smooth velocity interpolation
        const returnStrength = p.isWaveParticle ? 0.008 : 0.003;
        const cursorStrength = cursorActive && dist < attractionRadius ? 0.025 : returnStrength;
        
        const targetVx = (targetX - p.x) * cursorStrength;
        const targetVy = (targetY - p.y) * cursorStrength;
        
        // Very smooth easing
        p.vx += (targetVx - p.vx) * 0.03;
        p.vy += (targetVy - p.vy) * 0.03;
        
        // Gentle damping
        p.vx *= 0.985;
        p.vy *= 0.985;

        p.x += p.vx;
        p.y += p.vy;

        // Soft bounds with wrap
        if (p.x < -0.1) p.x = 1.1;
        if (p.x > 1.1) p.x = -0.1;
        if (p.y < -0.1) p.y = 1.1;
        if (p.y > 1.1) p.y = -0.1;
      }

      // Draw particles with glow
      ctx.save();
      ctx.shadowBlur = 12;
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
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
