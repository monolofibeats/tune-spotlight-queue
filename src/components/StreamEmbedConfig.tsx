import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tv2, Twitch, Youtube, Video, Link, Loader2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type StreamType = 'none' | 'twitch' | 'youtube' | 'tiktok' | 'video';

interface StreamConfig {
  id: string;
  stream_type: string;
  stream_url: string | null;
  video_url: string | null;
  is_active: boolean;
}

const STREAM_TYPES: { id: StreamType; label: string; icon: React.ComponentType<{ className?: string }>; placeholder: string; description: string }[] = [
  { id: 'none', label: 'None', icon: X, placeholder: '', description: 'No embed shown' },
  { id: 'twitch', label: 'Twitch', icon: Twitch, placeholder: 'https://twitch.tv/yourchannel', description: 'Embed your Twitch live stream' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/watch?v=...', description: 'Embed a YouTube live or video' },
  { id: 'tiktok', label: 'TikTok', icon: Tv2, placeholder: 'https://tiktok.com/@username/live', description: 'Show a TikTok live link' },
  { id: 'video', label: 'Looping Video', icon: Video, placeholder: 'https://...mp4 or storage URL', description: 'Loop a background/highlight video' },
];

export function StreamEmbedConfig() {
  const [config, setConfig] = useState<StreamConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedType, setSelectedType] = useState<StreamType>('none');
  const [streamUrl, setStreamUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('stream_config')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig(data);
        setSelectedType((data.stream_type as StreamType) || 'none');
        setStreamUrl(data.stream_url || '');
        setVideoUrl(data.video_url || '');
      }
    } catch (err) {
      console.error('Error fetching stream config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        stream_type: selectedType,
        stream_url: selectedType !== 'video' && selectedType !== 'none' ? streamUrl || null : null,
        video_url: selectedType === 'video' ? videoUrl || null : null,
      };

      if (config) {
        const { error } = await supabase
          .from('stream_config')
          .update(payload)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('stream_config')
          .insert({ ...payload, is_active: true })
          .select()
          .single();
        if (error) throw error;
        setConfig(data);
      }

      toast({ title: 'Embed saved!', description: 'Stream embed updated on your page.' });
      fetchConfig();
    } catch (err: any) {
      console.error('Error saving stream config:', err);
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeTypeDef = STREAM_TYPES.find(t => t.id === selectedType);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-5"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Link className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Stream Embed Widget</h3>
          <p className="text-sm text-muted-foreground">Configure what appears in the live embed on your page</p>
        </div>
      </div>

      {/* Type Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {STREAM_TYPES.map((type) => {
          const Icon = type.icon;
          const isActive = selectedType === type.id;
          return (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                isActive
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {type.label}
            </button>
          );
        })}
      </div>

      {activeTypeDef && selectedType !== 'none' && (
        <div className="space-y-3 pt-1">
          <p className="text-sm text-muted-foreground">{activeTypeDef.description}</p>

          {selectedType === 'video' ? (
            <div className="space-y-2">
              <Label htmlFor="video-url">Video URL (.mp4)</Label>
              <Input
                id="video-url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder={activeTypeDef.placeholder}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="stream-url">
                {selectedType === 'twitch' ? 'Twitch URL' :
                 selectedType === 'youtube' ? 'YouTube URL' :
                 'TikTok URL'}
              </Label>
              <Input
                id="stream-url"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder={activeTypeDef.placeholder}
              />
            </div>
          )}
        </div>
      )}

      {selectedType === 'none' && (
        <p className="text-sm text-muted-foreground italic">
          The stream embed section will be hidden on your page.
        </p>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Embed Settings
      </Button>
    </motion.div>
  );
}
