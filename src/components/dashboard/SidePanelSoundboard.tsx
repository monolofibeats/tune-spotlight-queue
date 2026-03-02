import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Plus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useSoundEffects, SOUNDBOARD_EFFECTS, SoundEffect } from '@/hooks/useSoundEffects';

interface CustomSound {
  id: string;
  label: string;
  emoji: string;
  url: string;
}

export function SidePanelSoundboard() {
  const { play, setVolume } = useSoundEffects();
  const [sbVolume, setSbVolume] = useState(70);
  const [customSounds, setCustomSounds] = useState<CustomSound[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newEmoji, setNewEmoji] = useState('🔊');
  const [newUrl, setNewUrl] = useState('');
  const customAudioRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const handleVolumeChange = useCallback((val: number[]) => {
    setSbVolume(val[0]);
    setVolume(val[0] / 100);
  }, [setVolume]);

  const playCustom = useCallback((sound: CustomSound) => {
    try {
      let audio = customAudioRef.current.get(sound.id);
      if (!audio) {
        audio = new Audio(sound.url);
        customAudioRef.current.set(sound.id, audio);
      }
      audio.currentTime = 0;
      audio.volume = sbVolume / 100;
      audio.play().catch(() => {});
    } catch {}
  }, [sbVolume]);

  const addCustomSound = () => {
    if (!newLabel.trim() || !newUrl.trim()) return;
    setCustomSounds(prev => [...prev, {
      id: `custom-${Date.now()}`,
      label: newLabel.trim(),
      emoji: newEmoji || '🔊',
      url: newUrl.trim(),
    }]);
    setNewLabel('');
    setNewEmoji('🔊');
    setNewUrl('');
    setShowAddForm(false);
  };

  const removeCustom = (id: string) => {
    setCustomSounds(prev => prev.filter(s => s.id !== id));
    customAudioRef.current.delete(id);
  };

  return (
    <div className="space-y-3">
      {/* Volume */}
      <div className="flex items-center gap-2">
        <Volume2 className="w-3 h-3 text-muted-foreground shrink-0" />
        <Slider value={[sbVolume]} onValueChange={handleVolumeChange} min={0} max={100} step={1} className="flex-1" />
        <span className="text-[10px] text-muted-foreground w-8 text-right">{sbVolume}%</span>
      </div>

      {/* Built-in effects */}
      <div className="grid grid-cols-3 gap-1.5">
        {SOUNDBOARD_EFFECTS.map((effect) => (
          <motion.div key={effect.id} whileTap={{ scale: 0.9 }}>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-auto py-2 flex flex-col items-center gap-0.5 hover:bg-primary/10 hover:border-primary/50 text-[9px]"
              onClick={() => play(effect.id, sbVolume / 100)}
            >
              <span className="text-base">{effect.emoji}</span>
              <span className="text-muted-foreground truncate w-full text-center">{effect.label}</span>
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Custom sounds */}
      {customSounds.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Custom</p>
          <div className="grid grid-cols-3 gap-1.5">
            {customSounds.map((sound) => (
              <motion.div key={sound.id} whileTap={{ scale: 0.9 }} className="relative group">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-auto py-2 flex flex-col items-center gap-0.5 hover:bg-primary/10 hover:border-primary/50 text-[9px]"
                  onClick={() => playCustom(sound)}
                >
                  <span className="text-base">{sound.emoji}</span>
                  <span className="text-muted-foreground truncate w-full text-center">{sound.label}</span>
                </Button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeCustom(sound.id); }}
                  className="absolute -top-1 -right-1 p-0.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
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
        <div className="space-y-2 p-2 rounded-lg border border-border/30 bg-muted/10">
          <div className="flex gap-1.5">
            <Input
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              placeholder="🔊"
              className="w-12 h-7 text-center text-xs px-1"
            />
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Name"
              className="flex-1 h-7 text-xs"
            />
          </div>
          <Input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="Audio URL (mp3)"
            className="h-7 text-xs"
          />
          <div className="flex gap-1.5">
            <Button size="sm" className="flex-1 h-7 text-xs" onClick={addCustomSound}>Add</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Custom Sound
        </Button>
      )}
    </div>
  );
}
