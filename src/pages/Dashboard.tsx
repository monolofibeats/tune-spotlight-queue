import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Music, 
  Search,
  Eye,
  CheckCircle,
  Loader2,
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
import { AdminStreamerManager } from '@/components/AdminStreamerManager';
import { AdminChatPanel } from '@/components/AdminChatPanel';
import { AdminPayoutRequests } from '@/components/AdminPayoutRequests';
import { getSignedAudioUrl } from '@/lib/storage';
import { BulkActionBar } from '@/components/submission/BulkActionBar';

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

const Dashboard = () => {
  useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Ref for scrolling to Now Playing panel
  const nowPlayingRef = useRef<HTMLDivElement>(null);
  
  // Now Playing panel state
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
  

  const fetchSubmissions = async () => {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('is_priority', { ascending: false })
      .order('amount_paid', { ascending: false })
      .order('created_at', { ascending: true }); // FIFO: oldest first

    if (!error && data) {
      setSubmissions(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSubmissions();

    const submissionsChannel = supabase
      .channel('dashboard_submissions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, fetchSubmissions)
      .subscribe();

    return () => {
      supabase.removeChannel(submissionsChannel);
    };
  }, []);

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
    }
  };

  const handleDeleteSubmission = async (id: string, permanent = false) => {
    if (permanent) {
      const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to permanently delete submission",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Deleted",
          description: "Submission permanently removed",
        });
      }
    } else {
      const { error } = await supabase
        .from('submissions')
        .update({ status: 'deleted' })
        .eq('id', id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to move to trash",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Moved to trash",
          description: "Submission moved to trash",
        });
      }
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


  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = 
      s.song_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.artist_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    
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
    const { error } = await supabase.from('submissions').update({ status }).in('id', ids);
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
    
    // Scroll to Now Playing panel after a brief delay for render
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
            <div className="flex items-center gap-3 mb-2">
              <LayoutDashboard className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-display font-bold">Live Review</h1>
            </div>
          </motion.div>

          {/* Stats */}
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
                  <p className="text-sm text-muted-foreground">Insgesamt</p>
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
                  <p className="text-sm text-muted-foreground">Ausstehend</p>
                </div>
              </div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">{stats.reviewed}</p>
                  <p className="text-sm text-muted-foreground">Erledigt</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <Tabs defaultValue="submissions" className="space-y-6">
            <TabsList className="glass p-1 rounded-xl">
              <TabsTrigger value="submissions" className="rounded-lg px-6">
                Submissions
              </TabsTrigger>
              <TabsTrigger value="streamers" className="rounded-lg px-6">
                Support
              </TabsTrigger>
              <TabsTrigger value="payouts" className="rounded-lg px-6">
                Payouts
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
                    placeholder="Suche nach Tracks oder Künstlern..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: 'all', label: 'Alle' },
                    { key: 'pending', label: 'Ausstehend' },
                    { key: 'reviewing', label: 'Überprüfen' },
                    { key: 'reviewed', label: 'Erledigt' },
                    { key: 'skipped', label: 'Übersprungen' }
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

              {/* Now Playing Panel - Above the list */}
              <div ref={nowPlayingRef}>
                <NowPlayingPanel
                  submission={nowPlaying.submission}
                  audioUrl={nowPlaying.audioUrl}
                  isLoadingAudio={nowPlaying.isLoading}
                  position={nowPlaying.position}
                  onClose={handleCloseNowPlaying}
                  onDownload={handleNowPlayingDownload}
                />
              </div>

              {/* Submissions List - Stacked sizing */}
              <div className="space-y-2">
                {filteredSubmissions.map((submission, index) => (
                  <SubmissionListItem
                    key={submission.id}
                    submission={submission}
                    position={index + 1}
                    isAdmin={true}
                    isSelected={selectedIds.has(submission.id)}
                    isSelectionMode={isSelectionMode}
                    onToggleSelect={handleToggleSelect}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteSubmission}
                    onUpdate={handleUpdateSubmission}
                    onPlayAudio={(sub, audioUrl, isLoading) => handleOpenNowPlaying(sub, audioUrl, isLoading, index + 1)}
                  />
                ))}

                {filteredSubmissions.length === 0 && (
                  <div className="glass rounded-2xl p-12 text-center">
                    <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No submissions found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery ? 'Try a different search term' : 'Waiting for song submissions...'}
                    </p>
                  </div>
                )}
              </div>

              {/* Bulk Action Bar */}
              <BulkActionBar
                selectedCount={selectedIds.size}
                totalCount={filteredSubmissions.length}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onBulkStatusChange={handleBulkStatusChange}
                onBulkDelete={handleBulkDelete}
                onBulkRestore={handleBulkRestore}
              />
            </TabsContent>


            {/* Streamers Tab */}
            <TabsContent value="streamers">
              <AdminStreamerManager />
            </TabsContent>

            {/* Payouts Tab */}
            <TabsContent value="payouts">
              <AdminPayoutRequests />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <AdminChatPanel />
    </div>
  );
};

export default Dashboard;
