import { useState, useCallback } from 'react';
import { AudioPlayer } from '@/components/AudioPlayer';
import { AudioVisualizer } from '@/components/AudioVisualizer';

interface DropboxPlayerEmbedProps {
  url: string;
  compact?: boolean;
}

// Dropbox blue HSL for the visualizer
const DROPBOX_COLOR_HSL = '210 70% 62%';

export function DropboxPlayerEmbed({ url, compact }: DropboxPlayerEmbedProps) {
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  const handleAudioElement = useCallback((el: HTMLAudioElement | null) => {
    setAudioEl(el);
  }, []);

  return (
    <div className="rounded-lg overflow-hidden border border-border/20 bg-[#1e1e1e]">
      {/* Dropbox-style header */}
      <div className="px-3 py-2 flex items-center gap-2 bg-[#2d2d2d] border-b border-border/10">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M6 2L0 6l6 4-6 4 6 4 6-4-6-4 6-4-6-4z" fill="#0061FF"/>
          <path d="M18 2l-6 4 6 4-6 4 6 4 6-4-6-4 6-4-6-4z" fill="#0061FF"/>
          <path d="M12 14l-6 4 6 4 6-4-6-4z" fill="#0061FF" opacity="0.7"/>
        </svg>
        <span className="text-xs font-medium text-[#b0b0b0]">Dropbox Audio</span>
      </div>

      {/* Visualizer — Dropbox-style colors */}
      {url && (
        <div className="px-3 pt-3">
          <AudioVisualizer
            key={url}
            audioElement={audioEl}
            className="rounded-md"
            showLUFS={false}
            showDBFS={false}
            showKeyFinder={false}
            height={compact ? 120 : 180}
            colorHsl={DROPBOX_COLOR_HSL}
          />
        </div>
      )}

      {/* Audio controls */}
      <div className="p-3">
        <AudioPlayer
          src={url}
          isLoading={false}
          onAudioElement={handleAudioElement}
          crossOrigin="anonymous"
        />
      </div>
    </div>
  );
}
