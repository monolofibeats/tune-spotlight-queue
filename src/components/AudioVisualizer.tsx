import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
  className?: string;
}

// We store connected elements globally to avoid creating duplicate MediaElementSourceNodes
// (the browser throws if you call createMediaElementSource twice on the same element)
const connectedElements = new WeakMap<HTMLAudioElement, { analyser: AnalyserNode; ctx: AudioContext }>();

/**
 * A reactive audio visualizer that renders soundwave lines driven by
 * Web Audio API frequency data — styled to match the Discovery page waves.
 */
export function AudioVisualizer({ audioElement, className = '' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);

  // Connect analyser to audio element
  useEffect(() => {
    if (!audioElement) {
      analyserRef.current = null;
      dataRef.current = null;
      return;
    }

    // Check if we already connected this element
    const existing = connectedElements.get(audioElement);
    if (existing) {
      analyserRef.current = existing.analyser;
      dataRef.current = new Uint8Array(existing.analyser.frequencyBinCount);
      // Make sure context is running
      if (existing.ctx.state === 'suspended') {
        existing.ctx.resume();
      }
      return;
    }

    try {
      const actx = new AudioContext();

      const analyser = actx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;

      const source = actx.createMediaElementSource(audioElement);
      source.connect(analyser);
      analyser.connect(actx.destination); // Critical: connect to destination so audio is audible

      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(analyser.frequencyBinCount);

      connectedElements.set(audioElement, { analyser, ctx: actx });

      // Resume on user interaction if needed
      const resumeCtx = () => {
        if (actx.state === 'suspended') actx.resume();
      };
      audioElement.addEventListener('play', resumeCtx);

      return () => {
        audioElement.removeEventListener('play', resumeCtx);
      };
    } catch (err) {
      console.warn('AudioVisualizer: Failed to connect analyser', err);
    }
  }, [audioElement]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Read primary colour from CSS vars
    const cssVal = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    const parts = cssVal.split(/\s+/);
    const h = parts[0] || '50';
    const s = (parts[1] || '100%').replace('%', '');
    const l = (parts[2] || '50%').replace('%', '');
    const hsla = (a: number) => `hsla(${h}, ${s}%, ${l}%, ${a})`;

    const LINE_COUNT = 7;
    const POINT_COUNT = 64;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    let time = 0;

    const draw = () => {
      time += 1 / 60;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const hh = rect.height;
      ctx.clearRect(0, 0, w, hh);

      // Get frequency data
      const analyser = analyserRef.current;
      const data = dataRef.current;
      let hasAudio = false;

      if (analyser && data) {
        analyser.getByteFrequencyData(data as Uint8Array<ArrayBuffer>);
        for (let i = 0; i < data.length; i++) {
          if (data[i] > 0) { hasAudio = true; break; }
        }
      }

      const centerY = hh / 2;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let li = 0; li < LINE_COUNT; li++) {
        const lineOffset = (li - LINE_COUNT / 2) * (hh * 0.08);
        const baseOpacity = 0.08 + (1 - Math.abs(li - LINE_COUNT / 2) / (LINE_COUNT / 2)) * 0.18;

        ctx.beginPath();
        ctx.strokeStyle = hsla(baseOpacity);
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 8;
        ctx.shadowColor = hsla(baseOpacity * 0.4);

        for (let i = 0; i < POINT_COUNT; i++) {
          const x = (i / (POINT_COUNT - 1)) * w;
          const normX = i / (POINT_COUNT - 1);

          // Base idle wave
          const idleWave = Math.sin(normX * Math.PI * 2.5 + time * 0.8 + li * 0.4) * 8
            + Math.sin(normX * Math.PI * 5 + time * 1.2 + li * 0.6) * 4;

          // Audio-reactive amplitude
          let audioAmp = 0;
          if (hasAudio && data) {
            const binIndex = Math.floor(normX * (data.length * 0.7));
            const val = data[Math.min(binIndex, data.length - 1)] / 255;
            audioAmp = val * (hh * 0.35);
          }

          // Envelope — fade edges
          const envelope = Math.sin(normX * Math.PI);
          const totalAmp = (idleWave + audioAmp * envelope) * envelope;
          const y = centerY + lineOffset + totalAmp * (hasAudio ? 1 : 0.3);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevX = ((i - 1) / (POINT_COUNT - 1)) * w;
            const cpX = (prevX + x) / 2;
            ctx.quadraticCurveTo(prevX, y, cpX, y);
          }
        }
        ctx.stroke();
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full pointer-events-none ${className}`}
      style={{ height: 80 }}
      aria-hidden="true"
    />
  );
}
