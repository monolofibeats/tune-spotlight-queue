import { useState } from 'react';
import { Radio, Power, Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Streamer } from '@/types/streamer';

interface QuickSettingsWidgetProps {
  streamer: Streamer;
  onUpdate: (s: Streamer) => void;
}

export function QuickSettingsWidget({ streamer, onUpdate }: QuickSettingsWidgetProps) {
  const [isLive, setIsLive] = useState(streamer.is_live);
  const [showEmbed, setShowEmbed] = useState(streamer.show_stream_embed);

  const toggle = async (field: string, value: boolean) => {
    const { error } = await supabase
      .from('streamers')
      .update({ [field]: value })
      .eq('id', streamer.id);

    if (error) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    } else {
      onUpdate({ ...streamer, [field]: value } as Streamer);
    }
  };

  return (
    <div className="widget-quick-settings space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary" />
          <Label className="text-xs">Go Live</Label>
        </div>
        <Switch
          checked={isLive}
          onCheckedChange={(v) => {
            setIsLive(v);
            toggle('is_live', v);
          }}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showEmbed ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
          <Label className="text-xs">Show Stream Embed</Label>
        </div>
        <Switch
          checked={showEmbed}
          onCheckedChange={(v) => {
            setShowEmbed(v);
            toggle('show_stream_embed', v);
          }}
        />
      </div>
    </div>
  );
}
