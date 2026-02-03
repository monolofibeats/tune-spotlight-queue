import { useCallback, useRef } from 'react';

// Pre-made sound effect URLs (using royalty-free sounds)
const SOUNDS = {
  // UI Interactions
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  hover: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  success: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  error: 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3',
  notification: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
  
  // Stream/Music
  submit: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  boost: 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3',
  live: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',
  
  // Soundboard effects
  airhorn: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  applause: 'https://assets.mixkit.co/active_storage/sfx/477/477-preview.mp3',
  drumroll: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  tada: 'https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3',
  woosh: 'https://assets.mixkit.co/active_storage/sfx/2067/2067-preview.mp3',
  pop: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
  ding: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  magic: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
};

export type SoundEffect = keyof typeof SOUNDS;

// Audio cache to prevent re-loading
const audioCache = new Map<string, HTMLAudioElement>();

function getAudio(sound: SoundEffect): HTMLAudioElement {
  const url = SOUNDS[sound];
  if (!audioCache.has(url)) {
    const audio = new Audio(url);
    audio.preload = 'auto';
    audioCache.set(url, audio);
  }
  return audioCache.get(url)!;
}

// Preload commonly used sounds
if (typeof window !== 'undefined') {
  ['click', 'success', 'submit', 'pop'].forEach(sound => {
    getAudio(sound as SoundEffect);
  });
}

export function useSoundEffects() {
  const enabledRef = useRef(true);
  const volumeRef = useRef(0.5);

  const play = useCallback((sound: SoundEffect, volume?: number) => {
    if (!enabledRef.current) return;
    
    try {
      const audio = getAudio(sound);
      audio.currentTime = 0;
      audio.volume = volume ?? volumeRef.current;
      audio.play().catch(() => {
        // Ignore autoplay errors
      });
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
  }, []);

  const setVolume = useCallback((volume: number) => {
    volumeRef.current = Math.max(0, Math.min(1, volume));
  }, []);

  return {
    play,
    setEnabled,
    setVolume,
    sounds: Object.keys(SOUNDS) as SoundEffect[],
  };
}

// Soundboard sounds for livestream
export const SOUNDBOARD_EFFECTS: { id: SoundEffect; label: string; emoji: string }[] = [
  { id: 'airhorn', label: 'Air Horn', emoji: '📢' },
  { id: 'applause', label: 'Applause', emoji: '👏' },
  { id: 'drumroll', label: 'Drum Roll', emoji: '🥁' },
  { id: 'tada', label: 'Ta-da!', emoji: '🎉' },
  { id: 'woosh', label: 'Woosh', emoji: '💨' },
  { id: 'pop', label: 'Pop', emoji: '💥' },
  { id: 'magic', label: 'Magic', emoji: '✨' },
];
