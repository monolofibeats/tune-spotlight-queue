import { ReactNode, useEffect } from 'react';
import { useStreamSession } from '@/hooks/useStreamSession';

interface ThemeWrapperProps {
  children: ReactNode;
}

export function ThemeWrapper({ children }: ThemeWrapperProps) {
  const { isLive } = useStreamSession();

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    // Don't apply global theme if a streamer-specific theme is active
    // StreamerThemeProvider sets data-streamer-theme="active" when applied
    if (body.dataset.streamerTheme === "active") {
      return;
    }
    
    if (isLive) {
      // Active/Live theme - yellow colors, pulsing effects
      root.classList.add('stream-active');
      root.classList.remove('stream-inactive');
    } else {
      // Inactive theme - muted, no colors
      root.classList.add('stream-inactive');
      root.classList.remove('stream-active');
    }
  }, [isLive]);

  return (
    <div className={`transition-all duration-700 ${isLive ? 'stream-live' : 'stream-offline'}`}>
      {children}
    </div>
  );
}
