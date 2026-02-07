import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Music, 
  Search,
  Trophy,
  Plus,
  Trash2,
  DollarSign,
  Eye,
  CheckCircle,
  Loader2,
  Tv,
  Video,
  Link as LinkIcon,
  Upload
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { SessionManager } from '@/components/SessionManager';
import { AdminSpotManager } from '@/components/AdminSpotManager';
import { AdminPricingPanel } from '@/components/AdminPricingPanel';
import { AdminBidSettings } from '@/components/AdminBidSettings';
import { ScreenStreamer } from '@/components/ScreenStreamer';
import { SubmissionListItem } from '@/components/SubmissionListItem';
import { NowPlayingPanel } from '@/components/NowPlayingPanel';
import { AdminStreamerManager } from '@/components/AdminStreamerManager';
import { getSignedAudioUrl } from '@/lib/storage';

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

interface SpecialEvent {
  id: string;
  title: string;
  description: string | null;
  reward: string;
  is_active: boolean;
  start_time: string;
  end_time: string | null;
}

interface StreamConfig {
  id: string;
  stream_type: string;
  stream_url: string | null;
  video_url: string | null;
  is_active: boolean;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [streamConfig, setStreamConfig] = useState<StreamConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  
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
  
  // New event form
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventReward, setNewEventReward] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  // Stream config form
  const [streamType, setStreamType] = useState<string>('none');
  const [streamUrl, setStreamUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isSavingStream, setIsSavingStream] = useState(false);

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

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('special_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setEvents(data);
    }
  };

  const fetchStreamConfig = async () => {
    // Using type assertion since stream_config table may not be in types yet
    const { data, error } = await (supabase
      .from('stream_config' as any)
      .select('*')
      .limit(1)
      .maybeSingle()) as any;

    if (!error && data) {
      const config = data as StreamConfig;
      setStreamConfig(config);
      setStreamType(config.stream_type);
      setStreamUrl(config.stream_url || '');
      setVideoUrl(config.video_url || '');
    }
  };

  useEffect(() => {
    fetchSubmissions();
    fetchEvents();
    fetchStreamConfig();

    // Subscribe to realtime changes
    const submissionsChannel = supabase
      .channel('dashboard_submissions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, fetchSubmissions)
      .subscribe();

    const eventsChannel = supabase
      .channel('dashboard_events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'special_events' }, fetchEvents)
      .subscribe();

    return () => {
      supabase.removeChannel(submissionsChannel);
      supabase.removeChannel(eventsChannel);
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

  const handleDeleteSubmission = async (id: string) => {
    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete submission",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Deleted",
        description: "Submission removed",
      });
    }
  };

  const handleCreateEvent = async () => {
    if (!newEventTitle || !newEventReward) {
      toast({
        title: "Missing fields",
        description: "Please fill in title and reward",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingEvent(true);

    const { error } = await supabase
      .from('special_events')
      .insert({
        title: newEventTitle,
        description: newEventDescription || null,
        reward: newEventReward,
        created_by: user?.id,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Event created! 🎉",
        description: "Your special event is now live",
      });
      setNewEventTitle('');
      setNewEventDescription('');
      setNewEventReward('');
    }

    setIsCreatingEvent(false);
  };

  const handleToggleEvent = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('special_events')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const { error } = await supabase
      .from('special_events')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    }
  };

  const handleSaveStreamConfig = async () => {
    setIsSavingStream(true);

    try {
      if (streamConfig) {
        // Using type assertion since stream_config table may not be in types yet
        const { error } = await (supabase
          .from('stream_config' as any)
          .update({
            stream_type: streamType,
            stream_url: streamUrl || null,
            video_url: videoUrl || null,
          } as any)
          .eq('id', streamConfig.id)) as any;

        if (error) throw error;
      } else {
        // Using type assertion since stream_config table may not be in types yet
        const { error } = await (supabase
          .from('stream_config' as any)
          .insert({
            stream_type: streamType,
            stream_url: streamUrl || null,
            video_url: videoUrl || null,
            is_active: true,
          } as any)) as any;

        if (error) throw error;
      }

      toast({
        title: "Stream updated! 📺",
        description: "Homepage stream settings have been saved",
      });

      fetchStreamConfig();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save stream settings",
        variant: "destructive",
      });
    } finally {
      setIsSavingStream(false);
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = 
      s.song_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.artist_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
                Tracks
              </TabsTrigger>
              <TabsTrigger value="stream" className="rounded-lg px-6">
                Livestream
              </TabsTrigger>
              <TabsTrigger value="events" className="rounded-lg px-6">
                Events
              </TabsTrigger>
              <TabsTrigger value="streamers" className="rounded-lg px-6">
                Streamers
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
              <NowPlayingPanel
                submission={nowPlaying.submission}
                audioUrl={nowPlaying.audioUrl}
                isLoadingAudio={nowPlaying.isLoading}
                position={nowPlaying.position}
                onClose={handleCloseNowPlaying}
                onDownload={handleNowPlayingDownload}
              />

              {/* Submissions List - Stacked sizing */}
              <div className="space-y-2">
                {filteredSubmissions.map((submission, index) => (
                  <SubmissionListItem
                    key={submission.id}
                    submission={submission}
                    position={index + 1}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteSubmission}
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
            </TabsContent>

            <TabsContent value="stream" className="space-y-6">
              {/* Session Manager */}
              <SessionManager />
              
              {/* Screen Streamer */}
              <ScreenStreamer />
              
              {/* Pricing Configuration */}
              <AdminPricingPanel />
              
              {/* Bid Increment Settings */}
              <AdminBidSettings />
              
              {/* Pre-Stream Spots Manager */}
              <AdminSpotManager />
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-strong rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Tv className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-display font-semibold">Startseite Einstellungen</h2>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Art des Streams</Label>
                    <Select value={streamType} onValueChange={setStreamType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Stream Typ auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nichts (Livestream ist off)</SelectItem>
                        <SelectItem value="twitch">Twitch Live</SelectItem>
                        <SelectItem value="youtube">YouTube Live</SelectItem>
                        <SelectItem value="tiktok">TikTok Live</SelectItem>
                        <SelectItem value="video">Looping Video</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(streamType === 'twitch' || streamType === 'youtube' || streamType === 'tiktok') && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" />
                        Stream URL
                      </Label>
                      <Input
                        placeholder={
                          streamType === 'twitch' 
                            ? 'https://twitch.tv/yourchannel'
                            : streamType === 'youtube'
                            ? 'https://youtube.com/watch?v=... or https://youtube.com/live/...'
                            : 'https://tiktok.com/@username/live'
                        }
                        value={streamUrl}
                        onChange={(e) => setStreamUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {streamType === 'twitch' && 'Enter your Twitch channel URL'}
                        {streamType === 'youtube' && 'Enter the YouTube live stream or video URL'}
                        {streamType === 'tiktok' && 'Enter your TikTok live URL (will show a link to watch)'}
                      </p>
                    </div>
                  )}

                  {streamType === 'video' && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        Video URL
                      </Label>
                      <Input
                        placeholder="https://example.com/video.mp4"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter a direct link to an MP4 video file. It will loop automatically.
                      </p>
                    </div>
                  )}

                  <Button 
                    onClick={handleSaveStreamConfig} 
                    disabled={isSavingStream}
                    className="w-full"
                  >
                    {isSavingStream ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Livestream Einstellungen speichern
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="events" className="space-y-6">
              {/* Create Event Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-strong rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Trophy className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-display font-semibold">Event erstellen</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="mb-2 block">Titel des Events *</Label>
                    <Input
                      placeholder="z.B. der höchste Bieter bekommt einen Playlist Add"
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">Belohnung *</Label>
                    <Input
                      placeholder="z.B. du wirst zu einer Spotify Playlist mit 10K Followern hinzugefügt"
                      value={newEventReward}
                      onChange={(e) => setNewEventReward(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <Label className="mb-2 block">Beschreibung (optional)</Label>
                  <Textarea
                    placeholder="Beschreibe dein Event..."
                    value={newEventDescription}
                    onChange={(e) => setNewEventDescription(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                <Button 
                  onClick={handleCreateEvent} 
                  disabled={isCreatingEvent}
                  className="w-full"
                >
                  {isCreatingEvent ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Event erstellen
                    </>
                  )}
                </Button>
              </motion.div>

              {/* Events List */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Aktive Events</h3>
                {events.length === 0 ? (
                  <div className="glass rounded-2xl p-8 text-center">
                    <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Noch keine Events</p>
                  </div>
                ) : (
                  events.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`glass rounded-xl p-4 ${!event.is_active ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{event.title}</h4>
                            <Badge variant={event.is_active ? 'default' : 'secondary'}>
                              {event.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          )}
                          <p className="text-sm">
                            <span className="text-muted-foreground">Reward:</span>{' '}
                            <span className="text-primary">{event.reward}</span>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleEvent(event.id, event.is_active)}
                          >
                            {event.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Streamers Tab */}
            <TabsContent value="streamers">
              <AdminStreamerManager />
            </TabsContent>
          </Tabs>
        </div>
      </main>

    </div>
  );
};

export default Dashboard;
