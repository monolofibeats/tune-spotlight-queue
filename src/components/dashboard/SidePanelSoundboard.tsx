import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Plus, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { SOUNDBOARD_EFFECTS, SoundEffect } from '@/hooks/useSoundEffects';

interface CustomSound {
  id: string;
  label: string;
  emoji: string;
  url: string;
}

// Keep a local audio cache for playback
const audioCache = new Map<string, HTMLAudioElement>();

function playSound(url: string, volume: number) {
  try {
    let audio = audioCache.get(url);
    if (!audio) {
      audio = new Audio(url);
      audioCache.set(url, audio);
    }
    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {}
}

export function SidePanelSoundboard() {
  const [sbVolume, setSbVolume] = useState(70);
  const [customSounds, setCustomSounds] = useState<CustomSound[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newEmoji, setNewEmoji] = useState('🔊');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track which built-in effects are hidden
  const [hiddenBuiltins, setHiddenBuiltins] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('upstar-hidden-soundboard');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const saveHidden = (next: Set<string>) => {
    setHiddenBuiltins(next);
    localStorage.setItem('upstar-hidden-soundboard', JSON.stringify([...next]));
  };

  const hideBuiltin = (id: string) => {
    const next = new Set(hiddenBuiltins);
    next.add(id);
    saveHidden(next);
  };

  const restoreAll = () => saveHidden(new Set());

  const visibleEffects = SOUNDBOARD_EFFECTS.filter(e => !hiddenBuiltins.has(e.id));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      if (!newLabel.trim()) setNewLabel(file.name.replace(/\.[^.]+$/, ''));
    }
  };

  const addCustomSound = () => {
    if (!newLabel.trim() || !pendingFile) return;
    const url = URL.createObjectURL(pendingFile);
    setCustomSounds(prev => [...prev, {
      id: `custom-${Date.now()}`,
      label: newLabel.trim(),
      emoji: newEmoji || '🔊',
      url,
    }]);
    setNewLabel('');
    setNewEmoji('🔊');
    setPendingFile(null);
    setShowAddForm(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeCustom = (id: string) => {
    const sound = customSounds.find(s => s.id === id);
    if (sound) URL.revokeObjectURL(sound.url);
    setCustomSounds(prev => prev.filter(s => s.id !== id));
    audioCache.delete(id);
  };

  // Built-in sound URLs from the hook's SOUNDS map
  const BUILTIN_URLS: Record<string, string> = {
    airhorn: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
    applause: 'https://assets.mixkit.co/active_storage/sfx/477/477-preview.mp3',
    drumroll: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
    tada: 'https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3',
    woosh: 'https://assets.mixkit.co/active_storage/sfx/2067/2067-preview.mp3',
    pop: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
    magic: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
  };

  return (
    <div className="space-y-3">
      {/* Volume */}
      <div className="flex items-center gap-2">
        <Volume2 className="w-3 h-3 text-neutral-400 shrink-0" />
        <Slider value={[sbVolume]} onValueChange={([v]) => setSbVolume(v)} min={0} max={100} step={1} className="flex-1 side-panel-slider" />
        <span className="text-[10px] text-neutral-500 w-8 text-right">{sbVolume}%</span>
      </div>

      {/* Built-in effects */}
      {visibleEffects.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {visibleEffects.map((effect) => (
            <motion.div key={effect.id} whileTap={{ scale: 0.9 }} className="relative group">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-auto py-2 flex flex-col items-center gap-0.5 text-[9px] border-white/10 bg-white/5 hover:bg-white/10"
                onClick={() => playSound(BUILTIN_URLS[effect.id], sbVolume / 100)}
              >
                <span className="text-base">{effect.emoji}</span>
                <span className="text-neutral-400 truncate w-full text-center">{effect.label}</span>
              </Button>
              <button
                onClick={(e) => { e.stopPropagation(); hideBuiltin(effect.id); }}
                className="absolute -top-1 -right-1 p-0.5 rounded-full bg-neutral-700 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {hiddenBuiltins.size > 0 && (
        <button
          onClick={restoreAll}
          className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          Restore {hiddenBuiltins.size} hidden sound{hiddenBuiltins.size > 1 ? 's' : ''}
        </button>
      )}

      {/* Custom sounds */}
      {customSounds.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Custom</p>
          <div className="grid grid-cols-3 gap-1.5">
            {customSounds.map((sound) => (
              <motion.div key={sound.id} whileTap={{ scale: 0.9 }} className="relative group">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-auto py-2 flex flex-col items-center gap-0.5 text-[9px] border-white/10 bg-white/5 hover:bg-white/10"
                  onClick={() => playSound(sound.url, sbVolume / 100)}
                >
                  <span className="text-base">{sound.emoji}</span>
                  <span className="text-neutral-400 truncate w-full text-center">{sound.label}</span>
                </Button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeCustom(sound.id); }}
                  className="absolute -top-1 -right-1 p-0.5 rounded-full bg-neutral-700 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Add custom */}
      {showAddForm ? (
        <div className="space-y-2 p-2 rounded-lg border border-white/10 bg-white/5">
          <div className="flex gap-1.5">
            <Input
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              placeholder="🔊"
              className="w-12 h-7 text-center text-xs px-1 bg-transparent border-white/10"
            />
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Name"
              className="flex-1 h-7 text-xs bg-transparent border-white/10"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs border-white/10 bg-white/5"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-3 h-3 mr-1" />
              {pendingFile ? pendingFile.name.slice(0, 20) : 'Upload Audio'}
            </Button>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" className="flex-1 h-7 text-xs" onClick={addCustomSound} disabled={!pendingFile || !newLabel.trim()}>
              Add
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowAddForm(false); setPendingFile(null); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs text-neutral-500 hover:text-white"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Custom Sound
        </Button>
      )}
    </div>
  );
}
