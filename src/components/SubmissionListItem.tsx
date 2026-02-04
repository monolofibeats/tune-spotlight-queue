import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Zap,
  Link as LinkIcon,
  Mail,
  MessageSquare,
  Copy,
  Check,
  FileAudio,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { getSignedAudioUrl } from '@/lib/storage';
import { AudioPlayer } from '@/components/AudioPlayer';

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

interface SubmissionListItemProps {
  submission: Submission;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}

export function SubmissionListItem({ 
  submission, 
  onStatusChange, 
  onDelete 
}: SubmissionListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [copiedContact, setCopiedContact] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch signed URL when expanded and has audio file
  useEffect(() => {
    const fetchAudioUrl = async () => {
      if (isExpanded && submission.audio_file_url && !audioUrl) {
        setIsLoadingAudio(true);
        try {
          const signedUrl = await getSignedAudioUrl(submission.audio_file_url);
          setAudioUrl(signedUrl);
        } catch (error) {
          console.error('Failed to get audio URL:', error);
        } finally {
          setIsLoadingAudio(false);
        }
      }
    };
    fetchAudioUrl();
  }, [isExpanded, submission.audio_file_url, audioUrl]);

  const handleCopyContact = async () => {
    if (submission.email) {
      await navigator.clipboard.writeText(submission.email);
      setCopiedContact(true);
      toast({
        title: "Copied!",
        description: "Contact email copied to clipboard",
      });
      setTimeout(() => setCopiedContact(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(submission.song_url);
    toast({
      title: "Copied!",
      description: "Song link copied to clipboard",
    });
  };

  const toggleAudioPlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDownloadFile = async () => {
    if (!submission.audio_file_url) return;
    
    try {
      // Get a fresh signed URL for download
      const downloadUrl = await getSignedAudioUrl(submission.audio_file_url);
      if (downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${submission.artist_name} - ${submission.song_title}`;
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`rounded-lg border transition-colors ${
        submission.is_priority 
          ? 'border-primary/40 bg-primary/5' 
          : 'border-border/50 bg-card/30'
      } ${isExpanded ? 'bg-card/50' : 'hover:bg-card/40'}`}
    >
      {/* Compact Header Row */}
      <div 
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Priority indicator - no amount shown */}
        {submission.is_priority && (
          <Badge variant="premium" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5">
            <Zap className="w-2.5 h-2.5" />
            Priority
          </Badge>
        )}

        {/* Artist - Title */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            <span className="text-muted-foreground">{submission.artist_name}</span>
            <span className="mx-1.5 text-muted-foreground/50">•</span>
            <span>{submission.song_title}</span>
          </p>
        </div>

        {/* Status Badge */}
        <Badge 
          variant={
            submission.status === 'reviewed' ? 'default' :
            submission.status === 'pending' ? 'queue' : 
            submission.status === 'reviewing' ? 'warning' : 'secondary'
          }
          className="text-[10px] shrink-0"
        >
          {submission.status}
        </Badge>

        {/* Expand Icon */}
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-border/30 space-y-3">
              {/* Song Link */}
              <div className="flex items-center gap-2">
                <a 
                  href={submission.song_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline truncate flex-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <LinkIcon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{submission.song_url}</span>
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyLink();
                  }}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>

              {/* Audio File - if uploaded */}
              {submission.audio_file_url && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 border border-border/30">
                  <FileAudio className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    {audioUrl && (
                      <audio 
                        ref={audioRef} 
                        src={audioUrl}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                      />
                    )}
                    <p className="text-xs text-muted-foreground truncate">Hochgeladene Audio Datei</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAudioPlayback();
                    }}
                    disabled={isLoadingAudio || !audioUrl}
                  >
                    {isLoadingAudio ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadFile();
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              {/* Message if exists */}
              {submission.message && (
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <MessageSquare className="w-3 h-3 shrink-0 mt-0.5" />
                  <p className="italic">"{submission.message}"</p>
                </div>
              )}

              {/* Contact - Hidden by default */}
              {submission.email && (
                <div className="flex items-center gap-2">
                  {!showContact ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowContact(true);
                      }}
                    >
                      <Mail className="w-3 h-3 mr-1" />
                      Kontaktinformation
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyContact();
                      }}
                    >
                      {copiedContact ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Kopiert!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" />
                          Kontaktinformation kopieren
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(submission.id, 'reviewing');
                  }}
                  disabled={submission.status === 'reviewing'}
                >
                  <Eye className="w-3 h-3" />
                  Überprüfen
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(submission.id, 'reviewed');
                  }}
                  disabled={submission.status === 'reviewed'}
                >
                  <CheckCircle className="w-3 h-3" />
                  Erledigt
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(submission.id, 'skipped');
                  }}
                >
                  <XCircle className="w-3 h-3" />
                  Überspringen
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(submission.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
