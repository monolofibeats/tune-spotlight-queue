import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Music, 
  Search,
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
import { BulkActionBar } from '@/components/submission/BulkActionBar';
import { DashboardBuilder } from '@/components/dashboard/DashboardBuilder';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { EarningsWidget } from '@/components/dashboard/widgets/EarningsWidget';
import { QuickSettingsWidget } from '@/components/dashboard/widgets/QuickSettingsWidget';
import { getDefaultLayout } from '@/components/dashboard/LayoutTemplates';
import { useStreamerPresets } from '@/hooks/useStreamerPresets';
import type { Layout } from 'react-grid-layout';
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
  const { slug } = useParams<{ slug: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const [streamer, setStreamer] = useState<Streamer | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBuilderEditing, setIsBuilderEditing] = useState(false);

  // Dashboard layout state
  const [dashboardLayout, setDashboardLayout] = useState<Layout[]>(getDefaultLayout());
  
  const nowPlayingRef = useRef<HTMLDivElement>(null);
  
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

  // Load saved layout from preset
  const { activePreset, updatePreset, createPreset } = useStreamerPresets(streamer?.id);
  
  useEffect(() => {
    if (activePreset?.dashboard_layout) {
      const saved = activePreset.dashboard_layout as unknown as { grid_layout?: Layout[]; widgets?: string[] };
      if (saved.grid_layout && Array.isArray(saved.grid_layout)) {
        setDashboardLayout(saved.grid_layout);
      }
    }
  }, [activePreset]);

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchStreamer = async () => {
      let query = supabase.from('streamers').select('*');
      
      if (slug) {
        query = query.eq('slug', slug);
      } else {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query.single();

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
  }, [user, authLoading, slug]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('submissions')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } else {
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
      toast({ title: "Status updated", description: `Submission marked as ${newStatus}` });
      if (nowPlaying.submission?.id === id && ['reviewed', 'skipped'].includes(newStatus)) {
        advanceToNext(id);
      }
    }
  };

  const handleDeleteSubmission = async (id: string, permanent = false) => {
    const wasPlaying = nowPlaying.submission?.id === id;
    
    if (permanent) {
      const { error } = await supabase.from('submissions').delete().eq('id', id);
      if (error) {
        toast({ title: "Error", description: "Failed to permanently delete", variant: "destructive" });
      } else {
        setSubmissions(prev => prev.filter(s => s.id !== id));
        toast({ title: "Permanently deleted", description: "Submission removed forever" });
      }
    } else {
      const { error } = await supabase.from('submissions').update({ status: 'deleted' }).eq('id', id);
      if (error) {
        toast({ title: "Error", description: "Failed to delete submission", variant: "destructive" });
      } else {
        setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'deleted' } : s));
        toast({ title: "Moved to trash", description: "Submission will be permanently deleted in 7 days" });
        if (wasPlaying) advanceToNext(id);
      }
    }
  };

  const handleRestoreSubmission = async (id: string) => {
    const { error } = await supabase.from('submissions').update({ status: 'pending' }).eq('id', id);
    if (error) {
      toast({ title: "Error", description: "Failed to restore", variant: "destructive" });
    } else {
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'pending' } : s));
      toast({ title: "Restored", description: "Submission moved back to pending" });
    }
  };

  const advanceToNext = (excludeId: string) => {
    const pendingQueue = submissions
      .filter(s => s.status === 'pending' && s.id !== excludeId)
      .sort((a, b) => {
        if (a.is_priority && !b.is_priority) return -1;
        if (!a.is_priority && b.is_priority) return 1;
        if (a.is_priority && b.is_priority) {
          const aTotal = a.amount_paid || 0;
          const bTotal = b.amount_paid || 0;
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
    const { error } = await supabase.from('submissions').update(updates).eq('id', id);
    if (error) {
      toast({ title: "Error", description: "Failed to update submission", variant: "destructive" });
      throw error;
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    if (nowPlaying.submission && s.id === nowPlaying.submission.id) return false;
    const matchesSearch = 
      s.song_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.artist_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' 
      ? s.status !== 'deleted'
      : s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => { setSelectedIds(new Set()); }, [statusFilter]);

  const isSelectionMode = selectedIds.size > 0;

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filteredSubmissions.map(s => s.id)));
  }, [filteredSubmissions]);

  const handleDeselectAll = useCallback(() => { setSelectedIds(new Set()); }, []);

  const handleBulkStatusChange = useCallback(async (status: string) => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('submissions').update({ status }).in('id', ids);
    if (error) {
      toast({ title: "Error", description: "Failed to update submissions", variant: "destructive" });
    } else {
      setSubmissions(prev => prev.map(s => ids.includes(s.id) ? { ...s, status } : s));
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
        setSubmissions(prev => prev.filter(s => !ids.includes(s.id)));
        toast({ title: "Deleted", description: `${ids.length} permanently deleted` });
      }
    } else {
      const { error } = await supabase.from('submissions').update({ status: 'deleted' }).in('id', ids);
      if (error) {
        toast({ title: "Error", description: "Failed to move to trash", variant: "destructive" });
      } else {
        setSubmissions(prev => prev.map(s => ids.includes(s.id) ? { ...s, status: 'deleted' } : s));
        toast({ title: "Moved to trash", description: `${ids.length} moved to trash` });
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
      setSubmissions(prev => prev.map(s => ids.includes(s.id) ? { ...s, status: 'pending' } : s));
      toast({ title: "Restored", description: `${ids.length} restored` });
    }
    setSelectedIds(new Set());
  }, [selectedIds]);

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    reviewed: submissions.filter(s => s.status === 'reviewed').length,
  };

  const handleOpenNowPlaying = (submission: Submission, audioUrl: string | null, isLoadingAudio: boolean, position: number) => {
    setNowPlaying({ submission, audioUrl, isLoading: isLoadingAudio, position });
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
      toast({ title: "Download failed", description: "Could not download the audio file", variant: "destructive" });
    }
  };

  // Save layout to preset
  const handleSaveLayout = async (layout: Layout[]) => {
    if (!streamer) return;
    const layoutData = { grid_layout: layout, version: 2 };
    
    if (activePreset) {
      await updatePreset(activePreset.id, {
        dashboard_layout: layoutData as unknown as { widgets: string[] },
      });
    } else {
      await createPreset();
      // Will be saved on next render cycle
    }
  };

  const widgetRenderers = useMemo(() => {
    if (!streamer) return {};

    return {
      stats: (
        <div className="grid grid-cols-3 gap-3 h-full">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
            <div className="p-2 rounded-lg bg-primary/20">
              <Music className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-display font-bold">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
            <div className="p-2 rounded-lg bg-primary/20">
              <Eye className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-display font-bold">{stats.pending}</p>
              <p className="text-[10px] text-muted-foreground">Pending</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
            <div className="p-2 rounded-lg bg-primary/20">
              <CheckCircle className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-display font-bold">{stats.reviewed}</p>
              <p className="text-[10px] text-muted-foreground">Reviewed</p>
            </div>
          </div>
        </div>
      ),

      now_playing: (
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
      ),

      search_filters: (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tracks or artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
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
                className="h-7 text-xs px-2.5"
                onClick={() => setStatusFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      ),

      queue: (
        <div className="space-y-2">
          {filteredSubmissions.map((submission, index) => (
            <SubmissionListItem
              key={submission.id}
              submission={submission}
              position={statusFilter === 'deleted' ? undefined : index + 1}
              isAdmin={true}
              isTrashView={statusFilter === 'deleted'}
              isSelected={selectedIds.has(submission.id)}
              isSelectionMode={isSelectionMode}
              onToggleSelect={handleToggleSelect}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteSubmission}
              onRestore={handleRestoreSubmission}
              onUpdate={handleUpdateSubmission}
              onPlayAudio={statusFilter === 'deleted' ? undefined : (sub, audioUrl, isLoading) => handleOpenNowPlaying(sub, audioUrl, isLoading, index + 1)}
            />
          ))}

          {filteredSubmissions.length === 0 && (
            <div className="rounded-2xl p-8 text-center bg-muted/10">
              <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-sm mb-1">No submissions found</h3>
              <p className="text-xs text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'Waiting for submissions...'}
              </p>
            </div>
          )}

          <BulkActionBar
            selectedCount={selectedIds.size}
            totalCount={filteredSubmissions.length}
            isTrashView={statusFilter === 'deleted'}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onBulkStatusChange={handleBulkStatusChange}
            onBulkDelete={handleBulkDelete}
            onBulkRestore={handleBulkRestore}
          />
        </div>
      ),

      earnings: <EarningsWidget streamerId={streamer.id} />,

      quick_settings: <QuickSettingsWidget streamer={streamer} onUpdate={setStreamer} />,

      chat: (
        <div className="h-full min-h-[200px]">
          <AdminStreamerChat streamerId={streamer.id} role="streamer" />
        </div>
      ),
    };
  }, [streamer, stats, nowPlaying, searchQuery, statusFilter, filteredSubmissions, selectedIds, isSelectionMode]);

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
    <div className={`min-h-screen bg-background bg-mesh noise relative transition-all ${isBuilderEditing ? 'mr-80' : ''}`}>
      <Header />
      
      <main className="pt-24 pb-12 px-4">
        <div className="w-full">
          {/* Dashboard Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
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
                <DashboardBuilder
                  isEditing={isBuilderEditing}
                  onToggleEditing={setIsBuilderEditing}
                  currentLayout={dashboardLayout}
                  onLayoutChange={setDashboardLayout}
                  onSave={handleSaveLayout}
                />
                <Button variant="outline" asChild className="gap-2">
                  <a href={`/${streamer.slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    View My Page
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>

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

            <TabsContent value="submissions">
              <DashboardGrid
                layout={dashboardLayout}
                isEditing={isBuilderEditing}
                onLayoutChange={setDashboardLayout}
                onRemoveWidget={(id) => setDashboardLayout(prev => prev.filter(l => l.i !== id))}
                widgetRenderers={widgetRenderers}
              />
            </TabsContent>

            <TabsContent value="settings">
              <StreamerSettingsPanel streamer={streamer} onUpdate={setStreamer} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Only show floating chat if not embedded in grid */}
      {!dashboardLayout.some(l => l.i === 'chat') && (
        <AdminStreamerChat streamerId={streamer.id} role="streamer" />
      )}
    </div>
  );
};

export default StreamerDashboard;
