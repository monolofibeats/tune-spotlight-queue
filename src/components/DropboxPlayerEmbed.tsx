import { useState, useCallback } from 'react';
import { AudioPlayer } from '@/components/AudioPlayer';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { Music2 } from 'lucide-react';

interface DropboxPlayerEmbedProps {
  url: string;
  compact?: boolean;
}

export function DropboxPlayerEmbed({ url, compact }: DropboxPlayerEmbedProps) {
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  const handleAudioElement = useCallback((el: HTMLAudioElement | null) => {
    setAudioEl(el);
  }, []);

  return (
    <div className="rounded-lg overflow-hidden border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-border/10">
        <Music2 className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-xs font-medium text-blue-400">Dropbox Audio</span>
      </div>
      <div className="p-3">
        <AudioPlayer
          src={url}
          isLoading={false}
          onAudioElement={handleAudioElement}
        />
      </div>
      {url && (
        <div className="px-3 pb-3">
          <AudioVisualizer
            key={url}
            audioElement={audioEl}
            className="rounded-lg"
            showLUFS={false}
            showDBFS={false}
            showKeyFinder={false}
            height={compact ? 120 : 200}
          />
        </div>
      )}
    </div>
  );
}
