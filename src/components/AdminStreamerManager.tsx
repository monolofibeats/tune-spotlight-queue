import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Check, 
  X, 
  Clock, 
  ExternalLink, 
  Loader2,
  ChevronDown,
  ChevronUp,
  Mail,
  Link as LinkIcon,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { StreamerApplication, StreamerStatus } from '@/types/streamer';

interface SiteFeedback {
  id: string;
  message: string;
  contact_info: string | null;
  created_at: string;
}

export function AdminStreamerManager() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<StreamerApplication[]>([]);
  const [feedback, setFeedback] = useState<SiteFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchFeedback = async () => {
    const { data, error } = await supabase
      .from('site_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFeedback(data as SiteFeedback[]);
    }
  };

  const fetchApplications = async () => {
    const { data, error } = await supabase
      .from('streamer_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setApplications(data as StreamerApplication[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchApplications();

    const channel = supabase
      .channel('streamer_applications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'streamer_applications' }, fetchApplications)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApprove = async (application: StreamerApplication) => {
    setProcessingId(application.id);

    try {
      // First, create a user account for the streamer if they don't have one
      // For now, we'll create the streamer profile directly
      // The streamer will need to sign up with the same email to claim their profile

      // Create the streamer profile
      const { data: streamerData, error: streamerError } = await supabase
        .from('streamers')
        .insert({
          user_id: crypto.randomUUID(), // Placeholder - will be updated when streamer signs up
          slug: application.desired_slug,
          display_name: application.display_name,
          email: application.email,
          twitch_url: application.twitch_url,
          youtube_url: application.youtube_url,
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (streamerError) {
        if (streamerError.code === '23505') {
          throw new Error('This slug is already taken. Please ask the applicant to choose a different one.');
        }
        throw streamerError;
      }

      // Update the application status
      const { error: updateError } = await supabase
        .from('streamer_applications')
        .update({
          status: 'approved' as StreamerStatus,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', application.id);

      if (updateError) throw updateError;

      toast({
        title: "Streamer approved! 🎉",
        description: `${application.display_name} can now access their page at /${application.desired_slug}`,
      });

      fetchApplications();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve application';
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (application: StreamerApplication) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }

    setProcessingId(application.id);

    try {
      const { error } = await supabase
        .from('streamer_applications')
        .update({
          status: 'rejected' as StreamerStatus,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason.trim(),
        })
        .eq('id', application.id);

      if (error) throw error;

      toast({
        title: "Application rejected",
        description: `${application.display_name}'s application has been rejected.`,
      });

      setRejectionReason('');
      setExpandedId(null);
      fetchApplications();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject application",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: StreamerStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="gap-1 bg-emerald-500"><Check className="w-3 h-3" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><X className="w-3 h-3" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Streamer Applications</h2>
          {pendingCount > 0 && (
            <Badge variant="destructive">{pendingCount} pending</Badge>
          )}
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-12 bg-card/50 rounded-xl border border-border/50">
          <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
          <p className="text-muted-foreground">Streamer applications will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((application) => (
            <motion.div
              key={application.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card/50 border border-border/50 rounded-xl overflow-hidden"
            >
              {/* Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-card/80 transition-colors"
                onClick={() => setExpandedId(expandedId === application.id ? null : application.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {application.display_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{application.display_name}</h3>
                      {getStatusBadge(application.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      /{application.desired_slug} • {new Date(application.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {expandedId === application.id ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              {/* Expanded Content */}
              {expandedId === application.id && (
                <div className="px-4 pb-4 border-t border-border/50 pt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <a href={`mailto:${application.email}`} className="text-primary hover:underline">
                          {application.email}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <LinkIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">upstar.gg/{application.desired_slug}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {application.twitch_url && (
                        <a
                          href={application.twitch_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-purple-400 hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Twitch
                        </a>
                      )}
                      {application.youtube_url && (
                        <a
                          href={application.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-red-400 hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" />
                          YouTube
                        </a>
                      )}
                    </div>
                  </div>

                  {application.application_message && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {application.application_message}
                      </p>
                    </div>
                  )}

                  {application.status === 'rejected' && application.rejection_reason && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                      <p className="text-sm text-destructive">
                        <strong>Rejection reason:</strong> {application.rejection_reason}
                      </p>
                    </div>
                  )}

                  {application.status === 'pending' && (
                    <div className="space-y-3 pt-2">
                      <Textarea
                        placeholder="Rejection reason (required if rejecting)"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApprove(application)}
                          disabled={processingId === application.id}
                          className="flex-1 gap-2"
                        >
                          {processingId === application.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleReject(application)}
                          disabled={processingId === application.id}
                          className="flex-1 gap-2"
                        >
                          {processingId === application.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
