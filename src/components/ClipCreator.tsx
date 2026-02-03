import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Scissors, Play, Clock, Share2, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface Clip {
  id: string;
  recording_id: string;
  title: string;
  start_time_seconds: number;
  end_time_seconds: number;
  clip_url: string | null;
  view_count: number;
  created_at: string;
  created_by: string | null;
}

interface Recording {
  id: string;
  title: string;
  video_url: string;
  duration_seconds: number | null;
}

interface ClipCreatorProps {
  recording: Recording;
  onClose: () => void;
}

export function ClipCreator({ recording, onClose }: ClipCreatorProps) {
  const { user } = useAuth();
  const { play } = useSoundEffects();
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(30);
  const [isCreating, setIsCreating] = useState(false);

  const maxDuration = recording.duration_seconds || 3600;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCreate = async () => {
    if (!title) {
      toast({
        title: "Title required",
        description: "Please give your clip a title",
        variant: "destructive",
      });
      return;
    }

    if (endTime <= startTime) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    const { error } = await (supabase
      .from('stream_clips' as any)
      .insert({
        recording_id: recording.id,
        title,
        start_time_seconds: startTime,
        end_time_seconds: endTime,
        created_by: user?.id,
      })) as any;

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create clip",
        variant: "destructive",
      });
    } else {
      play('success');
      toast({
        title: "Clip created! ✂️",
        description: "Your clip has been saved",
      });
      onClose();
    }

    setIsCreating(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary" />
            Create Clip
          </DialogTitle>
          <DialogDescription>
            Create a clip from "{recording.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Clip Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My awesome clip"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Start Time</Label>
              <span className="text-sm text-muted-foreground">{formatTime(startTime)}</span>
            </div>
            <Slider
              value={[startTime]}
              onValueChange={([val]) => setStartTime(val)}
              max={maxDuration}
              step={1}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>End Time</Label>
              <span className="text-sm text-muted-foreground">{formatTime(endTime)}</span>
            </div>
            <Slider
              value={[endTime]}
              onValueChange={([val]) => setEndTime(val)}
              max={maxDuration}
              step={1}
            />
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Clip Duration</span>
              <Badge>{formatTime(endTime - startTime)}</Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCreate}
              disabled={isCreating}
              className="flex-1"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Scissors className="w-4 h-4 mr-2" />
                  Create Clip
                </>
              )}
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ClipsGallery() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClips = async () => {
    const { data, error } = await (supabase
      .from('stream_clips' as any)
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(20)) as any;

    if (!error && data) {
      setClips(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchClips();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <div className="text-center py-8 rounded-xl border border-border/50 bg-card/50">
        <Scissors className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No clips yet</p>
        <p className="text-xs text-muted-foreground">Watch a recording and create the first clip!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Scissors className="w-4 h-4 text-primary" />
        Community Clips
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {clips.map((clip) => (
          <motion.div
            key={clip.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg border border-border/50 bg-card/50 p-3 hover:border-primary/30 transition-all"
          >
            <div className="flex items-center gap-2 mb-2">
              <Play className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium truncate">{clip.title}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {Math.floor((clip.end_time_seconds - clip.start_time_seconds) / 60)}:
              {((clip.end_time_seconds - clip.start_time_seconds) % 60).toString().padStart(2, '0')}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
