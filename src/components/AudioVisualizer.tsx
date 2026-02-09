import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  /** The audio element to visualize. We listen to its timeupdate/play/pause
   *  but do NOT use createMediaElementSource (which hijacks audio output). 
   *  Instead we fetch the audio URL separately and decode it for analysis. */
  audioElement: HTMLAudioElement | null;
  className?: string;
}

/**
 * A reactive audio visualizer that renders soundwave lines.
 * 
 * Instead of using createMediaElementSource (which reroutes audio through
 * Web Audio API and breaks playback with cross-origin sources), this component
 * monitors the audio element's state and uses an AnalyserNode fed by a
 * separately-fetched copy of the audio data.
 */
export function AudioVisualizer({ audioElement, className = '' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bufferSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isPlayingRef = useRef(false);
  const lastSrcRef = useRef<string>('');

  // Set up a shadow audio pipeline: fetch the audio, decode it, play through an
  // AnalyserNode with gain=0 (inaudible) so we get frequency data without
  // touching the main <audio> element's output.
  useEffect(() => {
    if (!audioElement) {
      analyserRef.current = null;
      dataRef.current = null;
      return;
    }

    const setupAnalyser = async () => {
      const src = audioElement.src;
      if (!src || src === lastSrcRef.current) return;
      lastSrcRef.current = src;

      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContext();
        }
        const actx = audioCtxRef.current;
        if (actx.state === 'suspended') await actx.resume();

        // Fetch the audio file
        const response = await fetch(src);
        if (!response.ok) return;
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await actx.decodeAudioData(arrayBuffer);

        const analyser = actx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.65;

        // Connect: source -> analyser -> gain(0) -> destination
        // Gain=0 means this shadow pipeline is silent
        const gainNode = actx.createGain();
        gainNode.gain.value = 0;
        analyser.connect(gainNode);
        gainNode.connect(actx.destination);

        analyserRef.current = analyser;
        dataRef.current = new Uint8Array(analyser.frequencyBinCount);

        // Store buffer for synced playback
        const startShadowPlayback = () => {
          // Stop previous
          if (bufferSourceRef.current) {
            try { bufferSourceRef.current.stop(); } catch {}
          }

          const bufferSource = actx.createBufferSource();
          bufferSource.buffer = audioBuffer;
          bufferSource.connect(analyser);
          bufferSourceRef.current = bufferSource;

          // Sync to audio element's current time
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

        // Sync with main audio element
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

        // If already playing, start immediately
        if (!audioElement.paused) {
          startShadowPlayback();
        }

        return () => {
          audioElement.removeEventListener('play', onPlay);
          audioElement.removeEventListener('pause', onPause);
          audioElement.removeEventListener('ended', onEnded);
          audioElement.removeEventListener('seeked', onSeeked);
          stopShadowPlayback();
        };
      } catch (err) {
        console.warn('AudioVisualizer: Could not set up analyser', err);
      }
    };

    // Wait a tick for the audio element to have its src set
    const timer = setTimeout(setupAnalyser, 200);
    return () => clearTimeout(timer);
  }, [audioElement, audioElement?.src]);

  // Animation loop
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

    const LINE_COUNT = 9;
    const POINT_COUNT = 80;

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

          const idleWave = Math.sin(normX * Math.PI * 2.5 + time * 0.8 + li * 0.4) * 8
            + Math.sin(normX * Math.PI * 5 + time * 1.2 + li * 0.6) * 4;

          let audioAmp = 0;
          if (hasAudio && data) {
            const binIndex = Math.floor(normX * (data.length * 0.7));
            const val = data[Math.min(binIndex, data.length - 1)] / 255;
            audioAmp = val * (hh * 0.35);
          }

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
