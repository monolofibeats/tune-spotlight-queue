import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { StreamSessionProvider } from '@/hooks/useStreamSession';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Music, 
  Search,
  Loader2,
  Eye,
  CheckCircle,
  Settings,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { SubmissionListItem } from '@/components/SubmissionListItem';
import { NowPlayingPanel } from '@/components/NowPlayingPanel';
import { StreamerSettingsPanel } from '@/components/StreamerSettingsPanel';
import { getSignedAudioUrl } from '@/lib/storage';
import { AdminStreamerChat } from '@/components/AdminStreamerChat';
import { BulkActionBar } from '@/components/submission/BulkActionBar';
import { DashboardBuilder, type DashboardViewOptions, type PopOutOptions } from '@/components/dashboard/DashboardBuilder';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { EarningsWidget } from '@/components/dashboard/widgets/EarningsWidget';
import { QuickSettingsWidget } from '@/components/dashboard/widgets/QuickSettingsWidget';
import { PopOutPortal } from '@/components/dashboard/PopOutPortal';
import { getDefaultLayout } from '@/components/dashboard/LayoutTemplates';
import { getWidgetDef, type WidgetConfigs, getDefaultWidgetConfig } from '@/components/dashboard/WidgetRegistry';
import { useStreamerPresets, type StreamerPreset } from '@/hooks/useStreamerPresets';
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
  const { t } = useLanguage();
  const [streamer, setStreamer] = useState<Streamer | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBuilderEditing, setIsBuilderEditing] = useState(false);
  const [poppedOutWidgets, setPoppedOutWidgets] = useState<Set<string>>(new Set());
  const [pendingPopOuts, setPendingPopOuts] = useState<string[]>([]);
  const preOpenedWindowsRef = useRef<Map<string, Window>>(new Map());

  // View options for header/title visibility
  const [viewOptions, setViewOptions] = useState<DashboardViewOptions>({
    showHeader: true,
    showDashboardTitle: true,
  });

  // Widget sub-element configs
  const [widgetConfigs, setWidgetConfigs] = useState<WidgetConfigs>({});

  // Pop-out display options
  const [popOutOptions, setPopOutOptions] = useState<PopOutOptions>({
    showWhenPoppedOut: new Set(),
  });

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
  const { presets, activePreset, updatePreset, deletePreset, refetch: refetchPresets } = useStreamerPresets(streamer?.id);
  
  useEffect(() => {
    if (activePreset?.dashboard_layout) {
      const saved = activePreset.dashboard_layout as unknown as {
        grid_layout?: Layout[];
        widgets?: string[];
        view_options?: DashboardViewOptions;
        widget_configs?: WidgetConfigs;
        show_when_popped_out?: string[];
        popped_out_widgets?: string[];
      };
      if (saved.grid_layout && Array.isArray(saved.grid_layout)) {
        setDashboardLayout(saved.grid_layout);
      }
      if (saved.view_options) {
        setViewOptions(saved.view_options);
      }
      if (saved.widget_configs) {
        setWidgetConfigs(saved.widget_configs);
      }
      if (saved.show_when_popped_out) {
        setPopOutOptions({ showWhenPoppedOut: new Set(saved.show_when_popped_out) });
      }
      if (saved.popped_out_widgets && Array.isArray(saved.popped_out_widgets) && saved.popped_out_widgets.length > 0) {
        setPendingPopOuts(saved.popped_out_widgets);
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
      const { data, error } = await query.maybeSingle();
      
      // If no owned streamer profile, check team membership
      if (!data && !slug) {
        const { data: team } = await supabase
          .from('streamer_team_members')
          .select('streamer_id')
          .eq('user_id', user.id)
          .eq('invitation_status', 'accepted')
          .limit(1)
          .maybeSingle();
        if (team) {
          const { data: teamStreamer } = await supabase
            .from('streamers')
            .select('*')
            .eq('id', team.streamer_id)
            .single();
          if (teamStreamer) {
            setStreamer(teamStreamer as Streamer);
            return teamStreamer;
          }
        }
        setIsLoading(false);
        return null;
      }
      
      if (error || !data) {
        console.error('Error fetching streamer:', error);
        setIsLoading(false);
        return null;
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
            event: '*', schema: 'public', table: 'submissions',
            filter: `streamer_id=eq.${streamerData.id}`
          }, () => fetchSubmissions(streamerData.id))
          .subscribe();
        return () => { supabase.removeChannel(submissionsChannel); };
      }
      setIsLoading(false);
    };

    init().then(() => setIsLoading(false));
  }, [user, authLoading, slug]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('submissions').update({ status: newStatus }).eq('id', id);
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
          const diff = (b.amount_paid || 0) - (a.amount_paid || 0);
          if (diff !== 0) return diff;
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
    song_url: string; artist_name: string; song_title: string;
    message: string | null; email: string | null;
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
  const handleSelectAll = useCallback(() => { setSelectedIds(new Set(filteredSubmissions.map(s => s.id))); }, [filteredSubmissions]);
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
      if (error) { toast({ title: "Error", description: "Failed to delete", variant: "destructive" }); }
      else { setSubmissions(prev => prev.filter(s => !ids.includes(s.id))); toast({ title: "Deleted", description: `${ids.length} permanently deleted` }); }
    } else {
      const { error } = await supabase.from('submissions').update({ status: 'deleted' }).in('id', ids);
      if (error) { toast({ title: "Error", description: "Failed to move to trash", variant: "destructive" }); }
      else { setSubmissions(prev => prev.map(s => ids.includes(s.id) ? { ...s, status: 'deleted' } : s)); toast({ title: "Moved to trash", description: `${ids.length} moved to trash` }); }
    }
    setSelectedIds(new Set());
  }, [selectedIds]);

  const handleBulkRestore = useCallback(async () => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('submissions').update({ status: 'pending' }).in('id', ids);
    if (error) { toast({ title: "Error", description: "Failed to restore", variant: "destructive" }); }
    else { setSubmissions(prev => prev.map(s => ids.includes(s.id) ? { ...s, status: 'pending' } : s)); toast({ title: "Restored", description: `${ids.length} restored` }); }
    setSelectedIds(new Set());
  }, [selectedIds]);

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    reviewed: submissions.filter(s => s.status === 'reviewed').length,
  };

  const handleOpenNowPlaying = (submission: Submission, audioUrl: string | null, isLoadingAudio: boolean, position: number) => {
    setNowPlaying({ submission, audioUrl, isLoading: isLoadingAudio, position });
    setTimeout(() => { nowPlayingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
  };

  const handleCloseNowPlaying = () => { setNowPlaying(prev => ({ ...prev, submission: null })); };

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

  // Pop-out handler — when popping out, the widget is removed from main grid display
  const handlePopOut = useCallback((widgetId: string) => {
    setPoppedOutWidgets(prev => {
      const next = new Set(prev);
      next.add(widgetId);
      return next;
    });
  }, []);

  const handlePopOutClose = useCallback((widgetId: string) => {
    setPoppedOutWidgets(prev => {
      const next = new Set(prev);
      next.delete(widgetId);
      return next;
    });
  }, []);

  // Helper to get resolved config for a widget
  const getWidgetConfig = useCallback((widgetId: string) => {
    return { ...getDefaultWidgetConfig(widgetId), ...(widgetConfigs[widgetId] || {}) };
  }, [widgetConfigs]);

  // Save layout to preset
  const handleSaveLayout = async (layout: Layout[]) => {
    if (!streamer) return;
    const layoutData = {
      grid_layout: layout,
      view_options: viewOptions,
      widget_configs: widgetConfigs,
      show_when_popped_out: Array.from(popOutOptions.showWhenPoppedOut),
      popped_out_widgets: Array.from(poppedOutWidgets),
      version: 3,
    };
    if (activePreset) {
      await updatePreset(activePreset.id, {
        dashboard_layout: layoutData as unknown as { widgets: string[] },
      });
    } else {
      // Create an initial active preset with the current layout
      const { error } = await supabase
        .from('streamer_presets')
        .insert({
          streamer_id: streamer.id,
          name: 'Default',
          platform_type: 'custom',
          occasion_type: 'custom',
          is_active: true,
          theme_config: {} as unknown as Record<string, never>,
          dashboard_layout: layoutData as unknown as Record<string, never>,
          form_template: null,
        });
      if (error) {
        toast({ title: 'Failed to save', variant: 'destructive' });
      }
      refetchPresets();
    }
  };

  const widgetRenderers = useMemo(() => {
    if (!streamer) return {};

    const npConfig = getWidgetConfig('now_playing');
    const statsConfig = getWidgetConfig('stats');
    const searchConfig = getWidgetConfig('search_filters');
    const queueConfig = getWidgetConfig('queue');
    const earningsConfig = getWidgetConfig('earnings');

    return {
      stats: (
        <div className="widget-stats-grid grid grid-cols-3 gap-3 h-full">
          {statsConfig.showTotal !== false && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
              <div className="p-2 rounded-lg bg-primary/20"><Music className="w-4 h-4 text-primary" /></div>
              <div><p className="text-xl font-display font-bold scalable-text">{stats.total}</p><p className="text-[10px] text-muted-foreground scalable-text">{t('dashboard.total')}</p></div>
            </div>
          )}
          {statsConfig.showPending !== false && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
              <div className="p-2 rounded-lg bg-primary/20"><Eye className="w-4 h-4 text-primary" /></div>
              <div><p className="text-xl font-display font-bold scalable-text">{stats.pending}</p><p className="text-[10px] text-muted-foreground scalable-text">{t('dashboard.pending')}</p></div>
            </div>
          )}
          {statsConfig.showReviewed !== false && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
              <div className="p-2 rounded-lg bg-primary/20"><CheckCircle className="w-4 h-4 text-primary" /></div>
              <div><p className="text-xl font-display font-bold scalable-text">{stats.reviewed}</p><p className="text-[10px] text-muted-foreground scalable-text">{t('dashboard.reviewed')}</p></div>
            </div>
          )}
        </div>
      ),
      now_playing: (
        <div ref={nowPlayingRef}>
          <NowPlayingPanel
            submission={nowPlaying.submission} audioUrl={nowPlaying.audioUrl}
            isLoadingAudio={nowPlaying.isLoading} position={nowPlaying.position}
            onClose={handleCloseNowPlaying} onDownload={handleNowPlayingDownload}
            onStatusChange={npConfig.showActionButtons !== false ? handleStatusChange : undefined}
            onDelete={npConfig.showActionButtons !== false ? handleDeleteSubmission : undefined}
            config={npConfig}
          />
        </div>
      ),
      search_filters: (
        <div className="widget-search-filters flex flex-col sm:flex-row gap-3">
          {searchConfig.showSearchBar !== false && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t('dashboard.searchTracksArtists')} value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-8 text-sm" />
            </div>
          )}
          {searchConfig.showStatusFilters !== false && (
            <div className="flex gap-1.5 flex-wrap">
              {[
                { key: 'all', label: t('dashboard.filterAll') },
                { key: 'pending', label: t('dashboard.filterPending') },
                { key: 'reviewed', label: t('dashboard.filterDone') },
                { key: 'skipped', label: t('dashboard.filterSkipped') },
                ...(searchConfig.showTrashFilter !== false ? [{ key: 'deleted', label: t('dashboard.filterTrash') }] : []),
              ].map(({ key, label }) => (
                <Button key={key} variant={statusFilter === key ? 'default' : 'outline'}
                  size="sm" className="h-7 text-xs px-2.5" onClick={() => setStatusFilter(key)}>
                  {label}
                </Button>
              ))}
            </div>
          )}
        </div>
      ),
      queue: (
        <div className="widget-queue space-y-2">
          {filteredSubmissions.map((submission, index) => (
            <SubmissionListItem
              key={submission.id} submission={submission}
              position={statusFilter === 'deleted' || queueConfig.showPosition === false ? undefined : index + 1}
              isAdmin={true} isTrashView={statusFilter === 'deleted'}
              isSelected={selectedIds.has(submission.id)} isSelectionMode={isSelectionMode}
              onToggleSelect={handleToggleSelect} onStatusChange={handleStatusChange}
              onDelete={handleDeleteSubmission} onRestore={handleRestoreSubmission}
              onUpdate={handleUpdateSubmission}
              showPriorityBadge={queueConfig.showPriorityBadge !== false}
              onPlayAudio={statusFilter === 'deleted' ? undefined : (sub, audioUrl, isLoading) => handleOpenNowPlaying(sub, audioUrl, isLoading, index + 1)}
            />
          ))}
          {filteredSubmissions.length === 0 && (
            <div className="rounded-2xl p-8 text-center bg-muted/10">
              <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-sm mb-1">{t('dashboard.noSubmissions')}</h3>
              <p className="text-xs text-muted-foreground">
                {searchQuery ? t('dashboard.tryDifferentSearch') : t('dashboard.waitingSubmissions')}
              </p>
            </div>
          )}
          {queueConfig.showBulkActions !== false && (
            <BulkActionBar selectedCount={selectedIds.size} totalCount={filteredSubmissions.length}
              isTrashView={statusFilter === 'deleted'} onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll} onBulkStatusChange={handleBulkStatusChange}
              onBulkDelete={handleBulkDelete} onBulkRestore={handleBulkRestore}
            />
          )}
        </div>
      ),
      earnings: <EarningsWidget streamerId={streamer.id} config={earningsConfig} />,
      quick_settings: <QuickSettingsWidget streamer={streamer} onUpdate={setStreamer} />,
      chat: (
        <div className="widget-chat h-full min-h-[200px] overflow-hidden">
          <AdminStreamerChat streamerId={streamer.id} role="streamer" />
        </div>
      ),
    };
  }, [streamer, stats, nowPlaying, searchQuery, statusFilter, filteredSubmissions, selectedIds, isSelectionMode, widgetConfigs, getWidgetConfig]);

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
            <h1 className="text-2xl font-bold mb-4">{t('dashboard.noProfileFound')}</h1>
            <p className="text-muted-foreground mb-6">{t('dashboard.noProfileDesc')}</p>
            <Button asChild><a href="/">{t('dashboard.applyNow')}</a></Button>
          </div>
        </main>
      </div>
    );
  }

  const handleSaveAsPreset = async (name: string) => {
    if (!streamer) return;
    const layoutData = {
      grid_layout: dashboardLayout,
      view_options: viewOptions,
      widget_configs: widgetConfigs,
      show_when_popped_out: Array.from(popOutOptions.showWhenPoppedOut),
      popped_out_widgets: Array.from(poppedOutWidgets),
      version: 3,
    };
    const { error } = await supabase
      .from('streamer_presets')
      .insert({
        streamer_id: streamer.id,
        name,
        platform_type: 'custom',
        occasion_type: 'custom',
        is_active: false,
        theme_config: {} as unknown as Record<string, never>,
        dashboard_layout: layoutData as unknown as Record<string, never>,
        form_template: null,
      });
    if (error) {
      toast({ title: 'Failed to save preset', variant: 'destructive' });
      throw error;
    }
    await refetchPresets();
  };

  const handleLoadPreset = (preset: StreamerPreset) => {
    const saved = preset.dashboard_layout as unknown as {
      grid_layout?: Layout[];
      view_options?: DashboardViewOptions;
      widget_configs?: WidgetConfigs;
      show_when_popped_out?: string[];
      popped_out_widgets?: string[];
    };
    if (saved.grid_layout && Array.isArray(saved.grid_layout)) {
      setDashboardLayout(saved.grid_layout);
    }
    if (saved.view_options) {
      setViewOptions(saved.view_options);
    }
    if (saved.widget_configs) {
      setWidgetConfigs(saved.widget_configs);
    }
    if (saved.show_when_popped_out) {
      setPopOutOptions({ showWhenPoppedOut: new Set(saved.show_when_popped_out) });
    }
    if (saved.popped_out_widgets && Array.isArray(saved.popped_out_widgets) && saved.popped_out_widgets.length > 0) {
      setPoppedOutWidgets(new Set());
      setPendingPopOuts(saved.popped_out_widgets);
    } else {
      setPoppedOutWidgets(new Set());
      setPendingPopOuts([]);
    }
    toast({ title: `Loaded "${preset.name}"` });
  };

  const handleDeletePreset = async (presetId: string) => {
    await deletePreset(presetId);
  };

  const handleRenamePreset = async (presetId: string, newName: string) => {
    await updatePreset(presetId, { name: newName });
    toast({ title: `Renamed to "${newName}"` });
  };

  // Filter out the active preset from user presets list (it's the "current" one)
  const savedUserPresets = presets.filter(p => !p.is_active);

  const builderProps = {
    isEditing: isBuilderEditing,
    onToggleEditing: setIsBuilderEditing,
    currentLayout: dashboardLayout,
    onLayoutChange: setDashboardLayout,
    onSave: handleSaveLayout,
    onPopOut: handlePopOut,
    poppedOutWidgets,
    onPoppedOutWidgetsChange: (newSet: Set<string>) => {
      // Route through pendingPopOuts so user gets click-to-open buttons
      const newIds = [...newSet];
      if (newIds.length > 0) {
        setPoppedOutWidgets(new Set());
        setPendingPopOuts(newIds);
      } else {
        setPoppedOutWidgets(new Set());
        setPendingPopOuts([]);
      }
    },
    viewOptions,
    onViewOptionsChange: setViewOptions,
    widgetConfigs,
    onWidgetConfigsChange: setWidgetConfigs,
    popOutOptions,
    onPopOutOptionsChange: setPopOutOptions,
    userPresets: savedUserPresets,
    onSaveAsPreset: handleSaveAsPreset,
    onLoadPreset: handleLoadPreset,
    onDeletePreset: handleDeletePreset,
    onRenamePreset: handleRenamePreset,
  };

  return (
    <StreamSessionProvider streamerId={streamer.id}>
      <div className="min-h-screen bg-background bg-mesh noise relative transition-all">
        {/* Collapsible Header */}
            {viewOptions.showHeader ? (
          <Header />
        ) : (
          <div className="fixed top-2 left-2 z-50">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-card/80 backdrop-blur-sm"
              onClick={() => setViewOptions(prev => ({ ...prev, showHeader: true }))}
              title={t('dashboard.showHeader')}
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        <main className={`${viewOptions.showHeader ? 'pt-24' : 'pt-4'} pb-12 px-4`}>
          <div className="w-full">
            <div className="flex items-center justify-end gap-2 mb-4">
              <DashboardBuilder {...builderProps} />
              <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
                <a href={`/${streamer.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3" />
                  {t('dashboard.viewPage')}
                </a>
              </Button>
            </div>

            {/* Collapsible Dashboard Header */}
            {viewOptions.showDashboardTitle && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-8 h-8 text-primary" />
                  <div>
                    <h1 className="text-3xl font-display font-bold">{t('dashboard.streamerDashboard')}</h1>
                    <p className="text-muted-foreground">
                      {t('dashboard.managePageAt')} <span className="text-primary font-medium">upstar.gg/{streamer.slug}</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <Tabs defaultValue="submissions" className="space-y-6">
              <TabsList className="glass p-1 rounded-xl">
                <TabsTrigger value="submissions" className="rounded-lg px-6 gap-2">
                  <Music className="w-4 h-4" />
                  {t('dashboard.submissions')}
                </TabsTrigger>
                <TabsTrigger value="settings" className="rounded-lg px-6 gap-2">
                  <Settings className="w-4 h-4" />
                  {t('dashboard.myPageSettings')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="submissions">
                <DashboardGrid
                  layout={dashboardLayout}
                  isEditing={isBuilderEditing}
                  onLayoutChange={setDashboardLayout}
                  onRemoveWidget={(id) => setDashboardLayout(prev => prev.filter(l => l.i !== id))}
                  widgetRenderers={widgetRenderers}
                  poppedOutWidgets={poppedOutWidgets}
                  showWhenPoppedOut={popOutOptions.showWhenPoppedOut}
                  onPopOut={handlePopOut}
                  widgetConfigs={widgetConfigs}
                />
              </TabsContent>

              <TabsContent value="settings">
                <StreamerSettingsPanel streamer={streamer} onUpdate={setStreamer} />
              </TabsContent>
            </Tabs>
          </div>
        </main>

        {/* Pending pop-out placeholders — one button per widget, each click = one user gesture = one popup */}
        {pendingPopOuts.length > 0 && (
          <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {pendingPopOuts.map((widgetId) => {
              const def = getWidgetDef(widgetId);
              if (!def) return null;
              const IconComp = def.icon;
              return (
                <button
                  key={widgetId}
                  onClick={() => {
                    // Single window.open in direct click handler — bypasses popup blocker
                    const popup = window.open('', `widget_${widgetId}`, 'width=600,height=500,menubar=no,toolbar=no,location=no,status=no');
                    if (popup) {
                      preOpenedWindowsRef.current.set(widgetId, popup);
                    }
                    setPendingPopOuts(prev => prev.filter(id => id !== widgetId));
                    setPoppedOutWidgets(prev => {
                      const next = new Set(prev);
                      next.add(widgetId);
                      return next;
                    });
                  }}
                  className="bg-card border border-border text-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm font-medium hover:bg-accent transition-colors min-w-[220px]"
                >
                  <IconComp className="w-4 h-4 text-primary" />
                  <span>Open {def.label}</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}

        {/* Pop-out portals */}
        {Array.from(poppedOutWidgets).map((widgetId) => {
          const def = getWidgetDef(widgetId);
          const content = widgetRenderers[widgetId];
          if (!def || !content) return null;
          return (
            <PopOutPortal
              key={widgetId}
              widgetId={widgetId}
              title={def.label}
              onClose={() => {
                preOpenedWindowsRef.current.delete(widgetId);
                handlePopOutClose(widgetId);
              }}
              preOpenedWindow={preOpenedWindowsRef.current.get(widgetId)}
            >
              <div className="min-h-[200px]">
                {content}
              </div>
            </PopOutPortal>
          );
        })}
      </div>
    </StreamSessionProvider>
  );
};

export default StreamerDashboard;
