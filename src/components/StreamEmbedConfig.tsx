import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { Tv2, Twitch, Youtube, Video, Link, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';

type StreamType = 'none' | 'twitch' | 'youtube' | 'tiktok' | 'video';

interface StreamConfig {
  id: string;
  stream_type: string;
  stream_url: string | null;
  video_url: string | null;
  is_active: boolean;
  streamer_id: string | null;
}

export interface StreamEmbedConfigHandle {
  save: () => Promise<void>;
  discard: () => void;
  hasChanges: boolean;
}

interface StreamEmbedConfigProps {
  streamerId: string;
  onChangeStatus?: (hasChanges: boolean) => void;
}

export const StreamEmbedConfig = forwardRef<StreamEmbedConfigHandle, StreamEmbedConfigProps>(function StreamEmbedConfig({ streamerId, onChangeStatus }, ref) {
  const { t } = useLanguage();
  const [config, setConfig] = useState<StreamConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedType, setSelectedType] = useState<StreamType>('none');
  const [streamUrl, setStreamUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  // Saved state for change detection
  const [savedType, setSavedType] = useState<StreamType>('none');
  const [savedStreamUrl, setSavedStreamUrl] = useState('');
  const [savedVideoUrl, setSavedVideoUrl] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (streamerId) fetchConfig();
  }, [streamerId]);

  // Track changes
  useEffect(() => {
    const changed = selectedType !== savedType || streamUrl !== savedStreamUrl || videoUrl !== savedVideoUrl;
    setHasChanges(changed);
    onChangeStatus?.(changed);
  }, [selectedType, streamUrl, videoUrl, savedType, savedStreamUrl, savedVideoUrl, onChangeStatus]);

  const syncFromConfig = (data: StreamConfig | null) => {
    const type = (data?.stream_type as StreamType) || 'none';
    const sUrl = data?.stream_url || '';
    const vUrl = data?.video_url || '';
    setSelectedType(type);
    setStreamUrl(sUrl);
    setVideoUrl(vUrl);
    setSavedType(type);
    setSavedStreamUrl(sUrl);
    setSavedVideoUrl(vUrl);
  };

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('stream_config')
        .select('*')
        .eq('streamer_id', streamerId)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setConfig(data);
      syncFromConfig(data);
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
        streamer_id: streamerId,
        is_active: true,
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
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setConfig(data);
      }

      // Update saved state
      setSavedType(selectedType);
      setSavedStreamUrl(streamUrl);
      setSavedVideoUrl(videoUrl);

      toast({ title: t('streamEmbed.saved'), description: t('streamEmbed.savedDesc') });
    } catch (err: any) {
      console.error('Error saving stream config:', err);
      toast({ title: t('streamEmbed.saveFailed'), description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setSelectedType(savedType);
    setStreamUrl(savedStreamUrl);
    setVideoUrl(savedVideoUrl);
  };

  useImperativeHandle(ref, () => ({
    save: handleSave,
    discard: handleDiscard,
    hasChanges,
  }), [hasChanges, selectedType, streamUrl, videoUrl, savedType, savedStreamUrl, savedVideoUrl, config]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const STREAM_TYPES: { id: StreamType; label: string; icon: React.ComponentType<{ className?: string }>; description: string; placeholder: string }[] = [
    { id: 'none', label: t('streamSettings.none'), icon: X, description: t('streamEmbed.desc.none'), placeholder: '' },
    { id: 'twitch', label: 'Twitch', icon: Twitch, description: t('streamEmbed.desc.twitch'), placeholder: 'https://twitch.tv/yourchannel' },
    { id: 'youtube', label: 'YouTube', icon: Youtube, description: t('streamEmbed.desc.youtube'), placeholder: 'https://youtube.com/watch?v=...' },
    { id: 'tiktok', label: 'TikTok', icon: Tv2, description: t('streamEmbed.desc.tiktok'), placeholder: 'https://tiktok.com/@username/live' },
    { id: 'video', label: t('streamSettings.video'), icon: Video, description: t('streamEmbed.desc.video'), placeholder: 'https://...mp4 or storage URL' },
  ];

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
          <h3 className="font-semibold">{t('streamEmbed.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('streamEmbed.subtitle')}</p>
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
              <Label htmlFor="video-url">{t('streamEmbed.videoUrl')}</Label>
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
          {t('streamEmbed.noEmbed')}
        </p>
      )}
    </motion.div>
  );
});
