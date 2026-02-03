import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Play, Clock, Eye, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { RecordingViewer } from './RecordingViewer';

interface Recording {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  recorded_at: string;
  view_count: number;
}

export function StreamLibrary() {
  const { isAdmin } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);

  // Admin form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newThumbnailUrl, setNewThumbnailUrl] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fetchRecordings = async () => {
    const { data, error } = await supabase
      .from('stream_recordings')
      .select('*')
      .eq('is_public', true)
      .order('recorded_at', { ascending: false });

    if (!error && data) {
      setRecordings(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const parseDuration = (durationStr: string): number | null => {
    if (!durationStr) return null;
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parseInt(durationStr) || null;
  };

  const handleAddRecording = async () => {
    if (!newTitle || !newVideoUrl) {
      toast({
        title: "Missing fields",
        description: "Please fill in title and video URL",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);

    const { error } = await supabase
      .from('stream_recordings')
      .insert({
        title: newTitle,
        description: newDescription || null,
        video_url: newVideoUrl,
        thumbnail_url: newThumbnailUrl || null,
        duration_seconds: parseDuration(newDuration),
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add recording",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Recording added! 🎬",
        description: "Stream recording is now in the library",
      });
      setNewTitle('');
      setNewDescription('');
      setNewVideoUrl('');
      setNewThumbnailUrl('');
      setNewDuration('');
      setShowAddForm(false);
      fetchRecordings();
    }

    setIsAdding(false);
  };

  const handleDeleteRecording = async (id: string) => {
    const { error } = await supabase
      .from('stream_recordings')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete recording",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Deleted",
        description: "Recording removed from library",
      });
      fetchRecordings();
      if (selectedRecording?.id === id) {
        setSelectedRecording(null);
      }
    }
  };

  const incrementViewCount = async (recording: Recording) => {
    await supabase
      .from('stream_recordings')
      .update({ view_count: recording.view_count + 1 })
      .eq('id', recording.id);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <Film className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold">Stream Library</h2>
            <p className="text-sm text-muted-foreground">Watch past livestreams</p>
          </div>
        </div>

        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Recording
          </Button>
        )}
      </div>

      {/* Admin Add Form */}
      {isAdmin && showAddForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-4"
        >
          <h3 className="font-semibold">Add Stream Recording</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Stream title"
              />
            </div>
            <div className="space-y-2">
              <Label>Video URL *</Label>
              <Input
                value={newVideoUrl}
                onChange={(e) => setNewVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <div className="space-y-2">
              <Label>Thumbnail URL</Label>
              <Input
                value={newThumbnailUrl}
                onChange={(e) => setNewThumbnailUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (HH:MM:SS or MM:SS)</Label>
              <Input
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                placeholder="1:30:00"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="About this stream..."
                className="min-h-[80px]"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddRecording} disabled={isAdding}>
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Recording'}
            </Button>
            <Button variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </div>
        </motion.div>
      )}

      {/* Recordings Grid */}
      {recordings.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-border/50 bg-card/50">
          <Film className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No recordings yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recordings.map((recording, index) => (
            <motion.div
              key={recording.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group rounded-xl border border-border/50 bg-card/50 overflow-hidden hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => {
                setSelectedRecording(recording);
                incrementViewCount(recording);
              }}
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-muted relative">
                {recording.thumbnail_url ? (
                  <img
                    src={recording.thumbnail_url}
                    alt={recording.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="w-12 h-12 text-white" />
                </div>
                {recording.duration_seconds && (
                  <Badge className="absolute bottom-2 right-2 bg-black/80">
                    {formatDuration(recording.duration_seconds)}
                  </Badge>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="font-semibold text-sm truncate">{recording.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {recording.view_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(recording.recorded_at).toLocaleDateString()}
                  </span>
                </div>

                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRecording(recording.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Recording Viewer Modal */}
      <AnimatePresence>
        {selectedRecording && (
          <RecordingViewer
            recording={selectedRecording}
            onClose={() => setSelectedRecording(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}