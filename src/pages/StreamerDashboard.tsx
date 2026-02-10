import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Music, 
  Search,
  Plus,
  Loader2,
  Eye,
  CheckCircle,
  Settings,
  ExternalLink
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { SubmissionListItem } from '@/components/SubmissionListItem';
import { NowPlayingPanel } from '@/components/NowPlayingPanel';
import { StreamerSettingsPanel } from '@/components/StreamerSettingsPanel';
import { getSignedAudioUrl } from '@/lib/storage';
import { AdminStreamerChat } from '@/components/AdminStreamerChat';
import { DashboardEditor, useDashboardLayout } from '@/components/DashboardEditor';
import { BulkActionBar } from '@/components/submission/BulkActionBar';
import type { Streamer } from '@/types/streamer';

interface Submission {
  id: string;
  song_url: string;
  platform: string;
  artist_name: string;
  song_title: string;
  message: string | null;
  email: string | null;
  amount_paid: number;
  is_priority: boolean;
  status: string;
  feedback: string | null;
  created_at: string;
  audio_file_url: string | null;
}

const StreamerDashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [streamer, setStreamer] = useState<Streamer | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const nowPlayingRef = useRef<HTMLDivElement>(null);
  const { visibleWidgets } = useDashboardLayout(streamer?.id);
  
  const [nowPlaying, setNowPlaying] = useState<{
    submission: Submission | null;
    audioUrl: string | null;
    isLoading: boolean;
    position: number;
  }>({
    submission: null,
    audioUrl: null,
    isLoading: false,
    position: 0,
  });

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchStreamer = async () => {
      const { data, error } = await supabase
        .from('streamers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching streamer:', error);
        setIsLoading(false);
        return;
      }

      setStreamer(data as Streamer);
      return data;
    };

    const fetchSubmissions = async (streamerId: string) => {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('streamer_id', streamerId)
        .order('is_priority', { ascending: false })
        .order('amount_paid', { ascending: false })
        .order('created_at', { ascending: true });

      if (!error && data) {
        setSubmissions(data);
      }
    };

    const init = async () => {
      const streamerData = await fetchStreamer();
      if (streamerData) {
        await fetchSubmissions(streamerData.id);
        
        // Subscribe to realtime changes for this streamer's submissions
        const submissionsChannel = supabase
          .channel('streamer_submissions')
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'submissions',
            filter: `streamer_id=eq.${streamerData.id}`
          }, () => fetchSubmissions(streamerData.id))
          .subscribe();

        return () => {
          supabase.removeChannel(submissionsChannel);
        };
      }
      setIsLoading(false);
    };

    init().then(() => setIsLoading(false));
  }, [user, authLoading]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('submissions')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Status updated",
        description: `Submission marked as ${newStatus}`,
      });
      // If this was the now-playing submission and a final action was taken, auto-advance
      if (nowPlaying.submission?.id === id && ['reviewed', 'skipped'].includes(newStatus)) {
        advanceToNext(id);
      }
    }
  };

  // Soft-delete: move to "deleted" status (trash). Permanently delete only from trash.
  const handleDeleteSubmission = async (id: string, permanent = false) => {
    const wasPlaying = nowPlaying.submission?.id === id;
    
    if (permanent) {
      const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('id', id);
      if (error) {
        toast({ title: "Error", description: "Failed to permanently delete", variant: "destructive" });
      } else {
        toast({ title: "Permanently deleted", description: "Submission removed forever" });
      }
    } else {
      const { error } = await supabase
        .from('submissions')
        .update({ status: 'deleted' })
        .eq('id', id);
      if (error) {
        toast({ title: "Error", description: "Failed to delete submission", variant: "destructive" });
      } else {
        toast({ title: "Moved to trash", description: "Submission will be permanently deleted in 7 days" });
        if (wasPlaying) {
          advanceToNext(id);
        }
      }
    }
  };

  // Restore from trash
  const handleRestoreSubmission = async (id: string) => {
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'pending' })
      .eq('id', id);
    if (error) {
      toast({ title: "Error", description: "Failed to restore", variant: "destructive" });
    } else {
      toast({ title: "Restored", description: "Submission moved back to pending" });
    }
  };

  // Auto-advance: load the next #1 submission into now playing
  const advanceToNext = (excludeId: string) => {
    // Find the next top submission from the sorted pending list
    const pendingQueue = submissions
      .filter(s => s.status === 'pending' && s.id !== excludeId)
      .sort((a, b) => {
        if (a.is_priority && !b.is_priority) return -1;
        if (!a.is_priority && b.is_priority) return 1;
        if (a.is_priority && b.is_priority) {
          const aTotal = (a.amount_paid || 0);
          const bTotal = (b.amount_paid || 0);
          if (aTotal !== bTotal) return bTotal - aTotal;
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

    const next = pendingQueue[0];
    if (next) {
      handleOpenNowPlaying(next, null, false, 1);
    } else {
      setNowPlaying({ submission: null, audioUrl: null, isLoading: false, position: 0 });
    }
  };

  const handleUpdateSubmission = async (id: string, updates: {
    song_url: string;
    artist_name: string;
    song_title: string;
    message: string | null;
    email: string | null;
  }) => {
    const { error } = await supabase
      .from('submissions')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update submission",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Hide the currently playing submission from the list
  const filteredSubmissions = submissions.filter(s => {
    // Hide submission that's currently in Now Playing
    if (nowPlaying.submission && s.id === nowPlaying.submission.id) return false;
    
    const matchesSearch = 
      s.song_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.artist_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // "all" shows everything except deleted/trash
    const matchesStatus = statusFilter === 'all' 
      ? s.status !== 'deleted'
      : s.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Clear selection when filter changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [statusFilter]);

  const isSelectionMode = selectedIds.size > 0;

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filteredSubmissions.map(s => s.id)));
  }, [filteredSubmissions]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkStatusChange = useCallback(async (status: string) => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from('submissions')
      .update({ status })
      .in('id', ids);
    if (error) {
      toast({ title: "Error", description: "Failed to update submissions", variant: "destructive" });
    } else {
      toast({ title: "Updated", description: `${ids.length} submission${ids.length > 1 ? 's' : ''} moved to ${status}` });
      setSelectedIds(new Set());
    }
  }, [selectedIds]);

  const handleBulkDelete = useCallback(async (permanent = false) => {
    const ids = Array.from(selectedIds);
    if (permanent) {
      const { error } = await supabase.from('submissions').delete().in('id', ids);
      if (error) {
        toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
      } else {
        toast({ title: "Deleted", description: `${ids.length} submission${ids.length > 1 ? 's' : ''} permanently deleted` });
      }
    } else {
      const { error } = await supabase.from('submissions').update({ status: 'deleted' }).in('id', ids);
      if (error) {
        toast({ title: "Error", description: "Failed to move to trash", variant: "destructive" });
      } else {
        toast({ title: "Moved to trash", description: `${ids.length} submission${ids.length > 1 ? 's' : ''} moved to trash` });
      }
    }
    setSelectedIds(new Set());
  }, [selectedIds]);

  const handleBulkRestore = useCallback(async () => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('submissions').update({ status: 'pending' }).in('id', ids);
    if (error) {
      toast({ title: "Error", description: "Failed to restore", variant: "destructive" });
    } else {
      toast({ title: "Restored", description: `${ids.length} submission${ids.length > 1 ? 's' : ''} restored` });
    }
    setSelectedIds(new Set());
  }, [selectedIds]);

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    reviewed: submissions.filter(s => s.status === 'reviewed').length,
  };

  const handleOpenNowPlaying = (submission: Submission, audioUrl: string | null, isLoadingAudio: boolean, position: number) => {
    setNowPlaying({
      submission,
      audioUrl,
      isLoading: isLoadingAudio,
      position,
    });
    
    setTimeout(() => {
      nowPlayingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleCloseNowPlaying = () => {
    setNowPlaying(prev => ({ ...prev, submission: null }));
  };

  const handleNowPlayingDownload = async () => {
    if (!nowPlaying.submission?.audio_file_url) return;
    
    try {
      const downloadUrl = await getSignedAudioUrl(nowPlaying.submission.audio_file_url);
      if (downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${nowPlaying.submission.artist_name} - ${nowPlaying.submission.song_title}`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download failed",
        description: "Could not download the audio file",
        variant: "destructive",
      });
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!streamer) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-2xl text-center">
            <h1 className="text-2xl font-bold mb-4">No Streamer Profile Found</h1>
            <p className="text-muted-foreground mb-6">
              You don't have a streamer profile yet. Please apply to become a streamer.
            </p>
            <Button asChild>
              <a href="/">Apply Now</a>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-mesh noise relative">
      <Header />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Dashboard Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-display font-bold">Streamer Dashboard</h1>
                  <p className="text-muted-foreground">
                    Manage your page at <span className="text-primary font-medium">upstar.gg/{streamer.slug}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DashboardEditor streamerId={streamer.id} />
                <Button variant="outline" asChild className="gap-2">
                  <a href={`/${streamer.slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    View My Page
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Stats - conditionally rendered */}
          {visibleWidgets.includes('stats') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-3 gap-4 mb-8"
            >
              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Music className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold">{stats.total}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                </div>
              </div>
              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Eye className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold">{stats.pending}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </div>
              </div>
              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold">{stats.reviewed}</p>
                    <p className="text-sm text-muted-foreground">Reviewed</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="submissions" className="space-y-6">
            <TabsList className="glass p-1 rounded-xl">
              <TabsTrigger value="submissions" className="rounded-lg px-6 gap-2">
                <Music className="w-4 h-4" />
                Submissions
              </TabsTrigger>
              <TabsTrigger value="settings" className="rounded-lg px-6 gap-2">
                <Settings className="w-4 h-4" />
                My Page Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="submissions" className="space-y-6">
              {/* Filters */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search for tracks or artists..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'pending', label: 'Pending' },
                    { key: 'reviewed', label: 'Done' },
                    { key: 'skipped', label: 'Skipped' },
                    { key: 'deleted', label: '🗑 Trash' }
                  ].map(({ key, label }) => (
                    <Button
                      key={key}
                      variant={statusFilter === key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter(key)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </motion.div>

              {/* Now Playing Panel - conditionally rendered */}
              {visibleWidgets.includes('now_playing') && (
                <div ref={nowPlayingRef}>
                  <NowPlayingPanel
                    submission={nowPlaying.submission}
                    audioUrl={nowPlaying.audioUrl}
                    isLoadingAudio={nowPlaying.isLoading}
                    position={nowPlaying.position}
                    onClose={handleCloseNowPlaying}
                    onDownload={handleNowPlayingDownload}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteSubmission}
                  />
                </div>
              )}

              {/* Submissions List */}
              <div className="space-y-2">
                {filteredSubmissions.map((submission, index) => (
                  <SubmissionListItem
                    key={submission.id}
                    submission={submission}
                    position={statusFilter === 'deleted' ? undefined : index + 1}
                    isAdmin={true}
                    isTrashView={statusFilter === 'deleted'}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteSubmission}
                    onRestore={handleRestoreSubmission}
                    onUpdate={handleUpdateSubmission}
                    onPlayAudio={statusFilter === 'deleted' ? undefined : (sub, audioUrl, isLoading) => handleOpenNowPlaying(sub, audioUrl, isLoading, index + 1)}
                  />
                ))}

                {filteredSubmissions.length === 0 && (
                  <div className="glass rounded-2xl p-12 text-center">
                    <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No submissions found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery ? 'Try a different search term' : 'Waiting for submissions...'}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="settings">
              <StreamerSettingsPanel streamer={streamer} onUpdate={setStreamer} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Private admin chat */}
      <AdminStreamerChat streamerId={streamer.id} role="streamer" />
    </div>
  );
};

export default StreamerDashboard;
