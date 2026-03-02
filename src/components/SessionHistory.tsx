import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Music2, Euro, Star, ChevronDown, Calendar, ArrowRight, Play, History, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

export interface SessionFilter {
  sessionId: string;
  title: string | null;
  startedAt: string;
  endedAt: string;
}

interface Session {
  id: string;
  title: string | null;
  started_at: string;
  ended_at: string | null;
  is_active: boolean;
}

interface SessionStats {
  durationSeconds: number;
  totalSubmissions: number;
  prioritySubmissions: number;
  totalEarnings: number;
}

interface SessionSubmission {
  id: string;
  artist_name: string;
  song_title: string;
  platform: string;
  status: string;
  is_priority: boolean;
  amount_paid: number;
  boost_amount: number;
  created_at: string;
  audio_file_url: string | null;
}

interface SessionHistoryProps {
  streamerId: string;
  onLoadSessionWithTrack?: (filter: SessionFilter, submission: SessionSubmission) => void;
}

interface SessionLoadPickerProps {
  streamerId: string;
  activeSessionFilter: SessionFilter | null;
  onLoadSession: (filter: SessionFilter) => void;
  onClearSession: () => void;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function SessionCard({ session, streamerId, onClick }: {
  session: Session; streamerId: string; onClick: () => void;
}) {
  const [stats, setStats] = useState<SessionStats | null>(null);

  useEffect(() => {
    if (!session.ended_at) return;
    const fetchStats = async () => {
      const [subRes, earningsRes] = await Promise.all([
        supabase.from('submissions').select('id, is_priority')
          .eq('streamer_id', streamerId)
          .gte('created_at', session.started_at)
          .lte('created_at', session.ended_at!),
        supabase.from('streamer_earnings').select('streamer_share_cents')
          .eq('streamer_id', streamerId)
          .gte('created_at', session.started_at)
          .lte('created_at', session.ended_at!),
      ]);
      const subs = subRes.data || [];
      const earnings = earningsRes.data || [];
      setStats({
        durationSeconds: Math.max(0, Math.floor((new Date(session.ended_at!).getTime() - new Date(session.started_at).getTime()) / 1000)),
        totalSubmissions: subs.length,
        prioritySubmissions: subs.filter(s => s.is_priority).length,
        totalEarnings: earnings.reduce((sum, e) => sum + (e.streamer_share_cents || 0), 0) / 100,
      });
    };
    fetchStats();
  }, [session, streamerId]);

  const duration = session.ended_at
    ? Math.max(0, Math.floor((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000))
    : 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-border/40 bg-card/30 hover:bg-card/60 hover:border-border/60 transition-all group"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">
            {session.title || 'Untitled Session'}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>{formatDate(session.started_at)}</span>
            <span>·</span>
            <span>{formatTime(session.started_at)}</span>
            {duration > 0 && (
              <>
                <span>·</span>
                <Clock className="w-3 h-3 shrink-0" />
                <span>{formatDuration(duration)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {stats && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Music2 className="w-3 h-3" />
                {stats.totalSubmissions}
              </span>
              {stats.totalEarnings > 0 && (
                <span className="flex items-center gap-1 text-emerald-500">
                  <Euro className="w-3 h-3" />
                  {stats.totalEarnings.toFixed(2)}
                </span>
              )}
            </div>
          )}
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </button>
  );
}

function SessionDetailView({ session, streamerId, onClickSubmission }: {
  session: Session; streamerId: string; onClickSubmission?: (sub: SessionSubmission) => void;
}) {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [submissions, setSubmissions] = useState<SessionSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session.ended_at) return;
    const fetchData = async () => {
      setLoading(true);
      const [subRes, earningsRes] = await Promise.all([
        supabase.from('submissions')
          .select('id, artist_name, song_title, platform, status, is_priority, amount_paid, boost_amount, created_at, audio_file_url')
          .eq('streamer_id', streamerId)
          .gte('created_at', session.started_at)
          .lte('created_at', session.ended_at!)
          .neq('status', 'deleted')
          .order('created_at', { ascending: true }),
        supabase.from('streamer_earnings').select('streamer_share_cents')
          .eq('streamer_id', streamerId)
          .gte('created_at', session.started_at)
          .lte('created_at', session.ended_at!),
      ]);
      const subs = (subRes.data || []) as SessionSubmission[];
      const earnings = earningsRes.data || [];
      setSubmissions(subs);
      setStats({
        durationSeconds: Math.max(0, Math.floor((new Date(session.ended_at!).getTime() - new Date(session.started_at).getTime()) / 1000)),
        totalSubmissions: subs.length,
        prioritySubmissions: subs.filter(s => s.is_priority).length,
        totalEarnings: earnings.reduce((sum, e) => sum + (e.streamer_share_cents || 0), 0) / 100,
      });
      setLoading(false);
    };
    fetchData();
  }, [session, streamerId]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'approved': case 'reviewed': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'rejected': case 'skipped': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'played': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-muted text-muted-foreground border-border/50';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="font-semibold text-lg">{session.title || 'Untitled Session'}</h3>
        <p className="text-sm text-muted-foreground">
          {formatDate(session.started_at)} · {formatTime(session.started_at)}
          {session.ended_at && ` – ${formatTime(session.ended_at)}`}
        </p>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Clock, label: 'Duration', value: formatDuration(stats.durationSeconds) },
            { icon: Music2, label: 'Tracks', value: String(stats.totalSubmissions) },
            { icon: Star, label: 'Priority', value: String(stats.prioritySubmissions) },
            { icon: Euro, label: 'Revenue', value: `€${stats.totalEarnings.toFixed(2)}` },
          ].map(item => (
            <div key={item.label} className="flex flex-col items-center p-2.5 rounded-lg bg-muted/30 border border-border/30">
              <item.icon className="w-3.5 h-3.5 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-sm font-bold">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Submissions list */}
      <div>
        <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Submissions ({submissions.length})</h4>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map(i => <div key={i} className="h-12 rounded-lg bg-muted/30 animate-pulse" />)}
          </div>
        ) : submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No submissions during this session</p>
        ) : (
          <div className="space-y-1.5">
            {submissions.map((sub, i) => (
              <motion.button
                key={sub.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => onClickSubmission?.(session, sub)}
                className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg border border-border/30 bg-card/20 hover:bg-card/40 hover:border-border/50 transition-all group"
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted/30 group-hover:bg-primary/20 transition-colors shrink-0">
                  <Play className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-1 min-w-0" translate="no">
                  <p className="text-sm font-medium truncate">
                    <span className="text-muted-foreground">{sub.artist_name}</span>
                    <span className="mx-1.5 text-muted-foreground/50">·</span>
                    <span>{sub.song_title}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{formatTime(sub.created_at)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {sub.is_priority && <Star className="w-3 h-3 text-yellow-500" />}
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColor(sub.status)}`}>
                    {sub.status}
                  </Badge>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stream settings: recent sessions list ───
export function SessionHistory({ streamerId }: SessionHistoryProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllDialog, setShowAllDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    const fetchSessions = async () => {
      const { data } = await supabase
        .from('stream_sessions')
        .select('id, title, started_at, ended_at, is_active')
        .eq('streamer_id', streamerId)
        .eq('is_active', false)
        .order('started_at', { ascending: false });
      setSessions(data || []);
      setLoading(false);
    };
    fetchSessions();
  }, [streamerId]);

  const recentSessions = sessions.slice(0, 3);

  const openDetail = (session: Session) => {
    setSelectedSession(session);
    setDetailDialogOpen(true);
    setShowAllDialog(false);
  };

  if (loading) {
    return (
      <div className="space-y-2 mt-4">
        {[0, 1, 2].map(i => <div key={i} className="h-14 rounded-lg bg-muted/20 animate-pulse" />)}
      </div>
    );
  }

  if (sessions.length === 0) return null;

  return (
    <>
      <div className="space-y-2 mt-1">
        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          Recent Sessions
        </h4>
        <div className="space-y-1.5">
          {recentSessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              streamerId={streamerId}
              onClick={() => openDetail(session)}
            />
          ))}
        </div>
        {sessions.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllDialog(true)}
            className="w-full text-muted-foreground hover:text-foreground gap-2 mt-1"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            Show all {sessions.length} sessions
          </Button>
        )}
      </div>

      {/* All Sessions Dialog */}
      <Dialog open={showAllDialog} onOpenChange={setShowAllDialog}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              All Sessions ({sessions.length})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-2">
            <div className="space-y-1.5">
              {sessions.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  streamerId={streamerId}
                  onClick={() => openDetail(session)}
                />
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Session Detail Dialog — only the dialog's built-in X button */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Session Details</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <SessionDetailView
              session={selectedSession}
              streamerId={streamerId}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Dashboard submissions tab: load previous session picker ───
export function SessionLoadPicker({ streamerId, activeSessionFilter, onLoadSession, onClearSession }: SessionLoadPickerProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('stream_sessions')
      .select('id, title, started_at, ended_at, is_active')
      .eq('streamer_id', streamerId)
      .eq('is_active', false)
      .order('started_at', { ascending: false });
    setSessions(data || []);
    setLoading(false);
  };

  const handleOpen = () => {
    setDialogOpen(true);
    fetchSessions();
  };

  const handleSelect = (session: Session) => {
    if (!session.ended_at) return;
    onLoadSession({
      sessionId: session.id,
      title: session.title,
      startedAt: session.started_at,
      endedAt: session.ended_at,
    });
    setDialogOpen(false);
  };

  return (
    <>
      {activeSessionFilter ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/30 bg-primary/5">
          <History className="w-3.5 h-3.5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary truncate">
              Viewing: {activeSessionFilter.title || 'Untitled Session'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {formatDate(activeSessionFilter.startedAt)} · {formatTime(activeSessionFilter.startedAt)} – {formatTime(activeSessionFilter.endedAt)}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClearSession} className="h-6 w-6 shrink-0 hover:bg-destructive/20">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpen}
          className="gap-1.5 text-xs h-7"
        >
          <History className="w-3.5 h-3.5" />
          Load Session
        </Button>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Load Previous Session
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Select a session to view only its submissions in your dashboard.
          </p>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map(i => <div key={i} className="h-14 rounded-lg bg-muted/20 animate-pulse" />)}
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No previous sessions found</p>
          ) : (
            <ScrollArea className="max-h-[55vh] pr-2">
              <div className="space-y-1.5">
                {sessions.map(session => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    streamerId={streamerId}
                    onClick={() => handleSelect(session)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
