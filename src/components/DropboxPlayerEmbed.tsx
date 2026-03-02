import { useState, useCallback } from 'react';
import { AudioPlayer } from '@/components/AudioPlayer';
import { AudioVisualizer } from '@/components/AudioVisualizer';

interface DropboxPlayerEmbedProps {
  url: string;
  compact?: boolean;
}

// Dropbox blue HSL for the visualizer idle animation
const DROPBOX_COLOR_HSL = '210 70% 62%';

export function DropboxPlayerEmbed({ url, compact }: DropboxPlayerEmbedProps) {
  return (
    <div className="rounded-lg overflow-hidden border border-[#3a3f47] bg-[#1e1e1e]">
      {/* Dropbox-style header */}
      <div className="px-3 py-2 flex items-center gap-2 bg-[#252a30] border-b border-[#3a3f47]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M6 2L0 6l6 4-6 4 6 4 6-4-6-4 6-4-6-4z" fill="#0061FF"/>
          <path d="M18 2l-6 4 6 4-6 4 6 4 6-4-6-4 6-4-6-4z" fill="#0061FF"/>
          <path d="M12 14l-6 4 6 4 6-4-6-4z" fill="#0061FF" opacity="0.7"/>
        </svg>
        <span className="text-xs font-medium text-[#9aa5b4]">Dropbox Audio</span>
      </div>

      {/* Audio player controls — Dropbox-styled */}
      <div className="p-3 dropbox-player">
        <AudioPlayer
          src={url}
          isLoading={false}
        />
      </div>

      {/* Decorative visualizer — idle animated waves, no audio connection (CORS blocked) */}
      {url && (
        <div className="px-3 pb-3">
          <AudioVisualizer
            key={url}
            audioElement={null}
            className="rounded-md"
            showLUFS={false}
            showDBFS={false}
            showKeyFinder={false}
            height={compact ? 100 : 140}
            colorHsl={DROPBOX_COLOR_HSL}
          />
        </div>
      )}
    </div>
  );
}
