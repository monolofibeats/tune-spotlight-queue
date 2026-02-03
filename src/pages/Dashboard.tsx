import { useState, useEffect } from 'react';
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
  XCircle,
  Loader2,
  Tv,
  Video,
  Link as LinkIcon,
  Upload,
  Radio
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
import { MusicEmbed } from '@/components/MusicEmbed';
import { SessionManager } from '@/components/SessionManager';
import { AdminSpotManager } from '@/components/AdminSpotManager';

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
      .order('created_at', { ascending: true });

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
    revenue: submissions.reduce((acc, s) => acc + (s.amount_paid || 0), 0),
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
              <h1 className="text-3xl font-display font-bold">Dashboard</h1>
            </div>
            <p className="text-muted-foreground">
              Manage submissions, stream settings, and special events.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
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
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">{stats.reviewed}</p>
                  <p className="text-sm text-muted-foreground">Reviewed</p>
                </div>
              </div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">${stats.revenue}</p>
                  <p className="text-sm text-muted-foreground">Revenue</p>
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
              <TabsTrigger value="stream" className="rounded-lg px-6">
                Stream
              </TabsTrigger>
              <TabsTrigger value="events" className="rounded-lg px-6">
                Events
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
                    placeholder="Search songs or artists..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {['all', 'pending', 'reviewing', 'reviewed', 'skipped'].map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                      className="capitalize"
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </motion.div>

              {/* Submissions List */}
              <div className="space-y-4">
                {filteredSubmissions.map((submission, index) => (
                  <motion.div
                    key={submission.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`glass-strong rounded-2xl p-6 ${
                      submission.amount_paid > 0 ? 'border border-primary/30' : ''
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Song Info */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg">{submission.song_title}</h3>
                              {submission.amount_paid > 0 && (
                                <Badge variant="premium" className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  {submission.amount_paid}
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground">{submission.artist_name}</p>
                          </div>
                          <Badge variant={
                            submission.status === 'reviewed' ? 'default' :
                            submission.status === 'pending' ? 'queue' : 'secondary'
                          }>
                            {submission.status}
                          </Badge>
                        </div>

                        {/* Embed or Link */}
                        {(submission.platform === 'spotify' || submission.platform === 'soundcloud') ? (
                          <MusicEmbed url={submission.song_url} platform={submission.platform as 'spotify' | 'soundcloud'} />
                        ) : (
                          <a 
                            href={submission.song_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                            <LinkIcon className="w-4 h-4" />
                            {submission.song_url.length > 50 
                              ? `${submission.song_url.substring(0, 50)}...` 
                              : submission.song_url}
                          </a>
                        )}

                        {submission.message && (
                          <p className="text-sm text-muted-foreground italic">
                            "{submission.message}"
                          </p>
                        )}

                        {submission.email && (
                          <p className="text-xs text-muted-foreground">
                            Contact: {submission.email}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-row lg:flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(submission.id, 'reviewing')}
                          disabled={submission.status === 'reviewing'}
                        >
                          <Eye className="w-4 h-4" />
                          Review
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleStatusChange(submission.id, 'reviewed')}
                          disabled={submission.status === 'reviewed'}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Done
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(submission.id, 'skipped')}
                        >
                          <XCircle className="w-4 h-4" />
                          Skip
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSubmission(submission.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
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
              
              {/* Pre-Stream Spots Manager */}
              <AdminSpotManager />
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-strong rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Tv className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-display font-semibold">Homepage Stream Settings</h2>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Stream Type</Label>
                    <Select value={streamType} onValueChange={setStreamType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stream type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Hide stream)</SelectItem>
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
                        Save Stream Settings
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
                  <h2 className="text-xl font-display font-semibold">Create Special Event</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="mb-2 block">Event Title *</Label>
                    <Input
                      placeholder="e.g., Highest Bidder Gets Playlist Add"
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">Reward *</Label>
                    <Input
                      placeholder="e.g., Added to Spotify playlist with 10k followers"
                      value={newEventReward}
                      onChange={(e) => setNewEventReward(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <Label className="mb-2 block">Description (optional)</Label>
                  <Textarea
                    placeholder="Describe the event..."
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
                      Create Event
                    </>
                  )}
                </Button>
              </motion.div>

              {/* Events List */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Active Events</h3>
                {events.length === 0 ? (
                  <div className="glass rounded-2xl p-8 text-center">
                    <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No events created yet</p>
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
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
