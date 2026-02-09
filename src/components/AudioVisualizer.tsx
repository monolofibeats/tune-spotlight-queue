import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
  className?: string;
}

export function AudioVisualizer({ audioElement, className = '' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bufferSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isPlayingRef = useRef(false);
  const lastSrcRef = useRef<string>('');
  const cleanupRef = useRef<(() => void) | null>(null);

  // Shadow audio pipeline for analysis without hijacking main output
  useEffect(() => {
    if (!audioElement) {
      analyserRef.current = null;
      dataRef.current = null;
      lastSrcRef.current = '';
      return;
    }

    const setupAnalyser = async () => {
      const src = audioElement.src;
      if (!src) return;

      const srcChanged = src !== lastSrcRef.current;
      lastSrcRef.current = src;

      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContext();
        }
        const actx = audioCtxRef.current;
        if (actx.state === 'suspended') await actx.resume();

        let analyser = analyserRef.current;

        if (srcChanged || !analyser) {
          const response = await fetch(src);
          if (!response.ok) return;
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await actx.decodeAudioData(arrayBuffer);

          analyser = actx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.7;

          const gainNode = actx.createGain();
          gainNode.gain.value = 0;
          analyser.connect(gainNode);
          gainNode.connect(actx.destination);

          analyserRef.current = analyser;
          dataRef.current = new Uint8Array(analyser.frequencyBinCount);

          const currentAnalyser = analyser;

          const startShadowPlayback = () => {
            if (bufferSourceRef.current) {
              try { bufferSourceRef.current.stop(); } catch {}
            }
            const bufferSource = actx.createBufferSource();
            bufferSource.buffer = audioBuffer;
            bufferSource.connect(currentAnalyser);
            bufferSourceRef.current = bufferSource;
            const offset = audioElement.currentTime || 0;
            bufferSource.start(0, offset);
            isPlayingRef.current = true;
          };

          const stopShadowPlayback = () => {
            if (bufferSourceRef.current) {
              try { bufferSourceRef.current.stop(); } catch {}
              bufferSourceRef.current = null;
            }
            isPlayingRef.current = false;
          };

          const onPlay = () => startShadowPlayback();
          const onPause = () => stopShadowPlayback();
          const onEnded = () => stopShadowPlayback();
          const onSeeked = () => {
            if (!audioElement.paused) {
              stopShadowPlayback();
              startShadowPlayback();
            }
          };

          audioElement.addEventListener('play', onPlay);
          audioElement.addEventListener('pause', onPause);
          audioElement.addEventListener('ended', onEnded);
          audioElement.addEventListener('seeked', onSeeked);

          cleanupRef.current = () => {
            audioElement.removeEventListener('play', onPlay);
            audioElement.removeEventListener('pause', onPause);
            audioElement.removeEventListener('ended', onEnded);
            audioElement.removeEventListener('seeked', onSeeked);
            stopShadowPlayback();
          };

          if (!audioElement.paused) {
            startShadowPlayback();
          }
        }
      } catch (err) {
        console.warn('AudioVisualizer: Could not set up analyser', err);
      }
    };

    const timer = setTimeout(setupAnalyser, 200);
    return () => {
      clearTimeout(timer);
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [audioElement, audioElement?.src]);

  // Animation loop — hybrid bar + wave visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cssVal = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    const parts = cssVal.split(/\s+/);
    const h = parts[0] || '50';
    const s = (parts[1] || '100%').replace('%', '');
    const l = (parts[2] || '50%').replace('%', '');
    const hsla = (a: number) => `hsla(${h}, ${s}%, ${l}%, ${a})`;

    const BAR_COUNT = 48;
    const PADDING = 16; // horizontal padding so bars don't touch edges

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
    // Smoothed values for each bar
    const smoothed = new Float32Array(BAR_COUNT);

    const draw = () => {
      time += 1 / 60;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const hh = rect.height;
      ctx.clearRect(0, 0, w, hh);

      const analyser = analyserRef.current;
      const data = dataRef.current;
      let hasAudio = false;

      if (analyser && data && isPlayingRef.current) {
        analyser.getByteFrequencyData(data as Uint8Array<ArrayBuffer>);
        for (let i = 0; i < data.length; i++) {
          if (data[i] > 0) { hasAudio = true; break; }
        }
      }

      const centerY = hh / 2;
      const usableWidth = w - PADDING * 2;
      const barWidth = usableWidth / BAR_COUNT;
      const gap = Math.max(1, barWidth * 0.25);
      const actualBarWidth = barWidth - gap;
      const maxBarHeight = (hh / 2) - 4; // leave 4px margin top/bottom

      ctx.save();

      for (let i = 0; i < BAR_COUNT; i++) {
        const normX = i / (BAR_COUNT - 1);

        // Get audio amplitude for this bar
        let targetAmp = 0;
        if (hasAudio && data) {
          const binIndex = Math.floor(normX * (data!.length * 0.8));
          const val = data![Math.min(binIndex, data!.length - 1)] / 255;
          targetAmp = Math.pow(val, 0.65);
        }

        // Smooth transition
        smoothed[i] += (targetAmp - smoothed[i]) * 0.25;
        const amp = smoothed[i];

        // Idle wave when no audio
        const idleWave = Math.sin(normX * Math.PI * 3 + time * 1.2) * 0.08
          + Math.sin(normX * Math.PI * 5 + time * 0.7) * 0.04;

        const finalAmp = hasAudio ? amp : Math.abs(idleWave) + 0.02;

        // Bar height — mirrored from center, clamped to maxBarHeight
        const barH = Math.min(finalAmp * maxBarHeight * 2, maxBarHeight);

        const x = PADDING + i * barWidth + gap / 2;

        // Envelope — bars at edges are slightly shorter
        const edgeFade = Math.sin(normX * Math.PI);
        const adjustedH = barH * (0.4 + edgeFade * 0.6);

        // Color intensity based on amplitude
        const intensity = 0.3 + finalAmp * 0.7;

        // Glow
        ctx.shadowBlur = hasAudio ? 8 + amp * 12 : 4;
        ctx.shadowColor = hsla(intensity * 0.5);

        // Draw mirrored bar (top half + bottom half from center)
        const radius = Math.min(actualBarWidth / 2, 3);

        // Top bar (goes upward from center)
        ctx.fillStyle = hsla(intensity);
        roundedRect(ctx, x, centerY - adjustedH, actualBarWidth, adjustedH, radius);
        ctx.fill();

        // Bottom bar (mirror, slightly less opaque)
        ctx.fillStyle = hsla(intensity * 0.7);
        roundedRect(ctx, x, centerY, actualBarWidth, adjustedH, radius);
        ctx.fill();

        // Wave line connecting bar tops — draw as we go
        if (i === 0) {
          ctx.beginPath();
          ctx.strokeStyle = hsla(0.4);
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = hasAudio ? 10 : 4;
          ctx.shadowColor = hsla(0.3);
          ctx.moveTo(x + actualBarWidth / 2, centerY - adjustedH);
        } else {
          ctx.lineTo(x + actualBarWidth / 2, centerY - adjustedH);
        }
      }
      // Stroke the wave line connecting bar tops
      ctx.stroke();

      // Mirror wave line on bottom
      ctx.beginPath();
      ctx.strokeStyle = hsla(0.25);
      ctx.lineWidth = 1;
      for (let i = 0; i < BAR_COUNT; i++) {
        const normX = i / (BAR_COUNT - 1);
        let targetAmp = smoothed[i];
        const idleWave = Math.sin(normX * Math.PI * 3 + time * 1.2) * 0.08
          + Math.sin(normX * Math.PI * 5 + time * 0.7) * 0.04;
        const finalAmp = hasAudio ? targetAmp : Math.abs(idleWave) + 0.02;
        const barH = Math.min(finalAmp * maxBarHeight * 2, maxBarHeight);
        const edgeFade = Math.sin(normX * Math.PI);
        const adjustedH = barH * (0.4 + edgeFade * 0.6);
        const x = PADDING + i * (usableWidth / BAR_COUNT) + (Math.max(1, (usableWidth / BAR_COUNT) * 0.25)) / 2;
        const bw = (usableWidth / BAR_COUNT) - Math.max(1, (usableWidth / BAR_COUNT) * 0.25);
        if (i === 0) {
          ctx.moveTo(x + bw / 2, centerY + adjustedH);
        } else {
          ctx.lineTo(x + bw / 2, centerY + adjustedH);
        }
      }
      ctx.stroke();

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
      style={{ height: 140 }}
      aria-hidden="true"
    />
  );
}

/** Draw a rounded rectangle path and begin fill (caller must call ctx.fill()) */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
