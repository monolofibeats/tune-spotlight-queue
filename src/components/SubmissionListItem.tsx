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
  Download,
  Play,
  ExternalLink,
  Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { getSignedAudioUrl } from '@/lib/storage';
import { AudioPlayer } from '@/components/AudioPlayer';
import { PositionBadge } from '@/components/queue/PositionBadge';
import { SubmissionEditForm } from '@/components/submission/SubmissionEditForm';

// Check if URL is a playable embed (Spotify, SoundCloud)
const isPlayableEmbed = (url: string) => {
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('spotify.com') || lowerUrl.includes('soundcloud.com');
};

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

// Get size styling based on position (1-3 are progressively larger)
const getPositionStyles = (position: number | undefined) => {
  if (position === 1) {
    return {
      container: 'py-4 px-4 border-2 border-yellow-500/40 bg-gradient-to-r from-yellow-500/15 via-amber-500/10 to-transparent shadow-lg shadow-yellow-500/10',
      positionBadge: 'w-14 h-10 text-base px-2',
      title: 'text-base',
    };
  }
  if (position === 2) {
    return {
      container: 'py-3.5 px-4 border border-slate-400/30 bg-gradient-to-r from-slate-400/10 to-transparent',
      positionBadge: 'w-12 h-9 text-sm px-1.5',
      title: 'text-sm',
    };
  }
  if (position === 3) {
    return {
      container: 'py-3 px-3 border border-amber-600/25 bg-gradient-to-r from-amber-600/8 to-transparent',
      positionBadge: 'w-11 h-8 text-sm px-1.5',
      title: 'text-sm',
    };
  }
  return {
    container: 'py-2.5 px-3',
    positionBadge: 'w-8 h-7 text-xs px-1',
    title: 'text-sm',
  };
};

interface SubmissionListItemProps {
  submission: Submission;
  position?: number;
  isAdmin?: boolean;
  isTrashView?: boolean;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onToggleSelect?: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string, permanent?: boolean) => void;
  onRestore?: (id: string) => void;
  onUpdate?: (id: string, updates: {
    song_url: string;
    artist_name: string;
    song_title: string;
    message: string | null;
    email: string | null;
  }) => Promise<void>;
  onPlayAudio?: (submission: Submission, audioUrl: string | null, isLoading: boolean) => void;
  showPriorityBadge?: boolean;
}

export function SubmissionListItem({ 
  submission, 
  position,
  isAdmin = false,
  isTrashView = false,
  isSelected = false,
  isSelectionMode = false,
  onToggleSelect,
  onStatusChange, 
  onDelete,
  onRestore,
  onUpdate,
  onPlayAudio,
  showPriorityBadge = true,
}: SubmissionListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [copiedContact, setCopiedContact] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  
  const styles = getPositionStyles(position);

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

  const handleOpenNowPlaying = async () => {
    if (!onPlayAudio) return;
    
    // For audio files, fetch signed URL
    if (submission.audio_file_url) {
      if (audioUrl) {
        onPlayAudio(submission, audioUrl, false);
        return;
      }
      
      setIsLoadingAudio(true);
      try {
        const signedUrl = await getSignedAudioUrl(submission.audio_file_url);
        setAudioUrl(signedUrl);
        onPlayAudio(submission, signedUrl, false);
      } catch (error) {
        console.error('Failed to get audio URL:', error);
      } finally {
        setIsLoadingAudio(false);
      }
    } else {
      // For links (Spotify, SoundCloud, etc.), just open the panel
      onPlayAudio(submission, null, false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`rounded-lg border transition-all duration-300 ${styles.container} ${
        submission.is_priority 
          ? 'border-primary/40 bg-primary/5' 
          : 'border-border/50 bg-card/30'
      } ${isExpanded ? 'bg-card/50' : 'hover:bg-card/40'}`}
    >
      {/* Compact Header Row */}
      <div 
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => {
          if (isSelectionMode) {
            onToggleSelect?.(submission.id);
          } else {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        {/* Selection dot */}
        <button
          className={`w-5 h-5 rounded-full border-2 shrink-0 transition-all duration-200 flex items-center justify-center ${
            isSelected 
              ? 'bg-primary border-primary scale-110' 
              : 'border-muted-foreground/30 hover:border-primary/60'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(submission.id);
          }}
          aria-label={isSelected ? 'Deselect' : 'Select'}
        >
          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
        </button>
        {/* Position number - Star overlay for #1 */}
        {position && (
          <PositionBadge position={position} badgeClassName={styles.positionBadge} showGlow={position === 1} />
        )}

        {/* Priority indicator */}
        {showPriorityBadge && submission.is_priority && (
          <Badge variant="premium" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5">
            <Zap className="w-2.5 h-2.5" />
            Priority
          </Badge>
        )}

        {/* Artist - Title */}
        <div className="flex-1 min-w-0">
          <p className={`font-medium truncate scalable-text ${styles.title}`}>
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
                {isPlayableEmbed(submission.song_url) ? (
                  // For Spotify/SoundCloud: open in Now Playing panel
                  <button 
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline truncate flex-1 text-left"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenNowPlaying();
                    }}
                  >
                    <Play className="w-3 h-3 shrink-0" />
                    <span className="truncate">{submission.song_url}</span>
                  </button>
                ) : (
                  // For other links: open in new tab
                  <a 
                    href={submission.song_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline truncate flex-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">{submission.song_url}</span>
                  </a>
                )}
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
                <div className="p-3 rounded-lg bg-secondary/50 border border-border/30 space-y-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileAudio className="w-4 h-4 text-primary shrink-0" />
                      <p className="text-xs text-muted-foreground">Hochgeladene Audio Datei</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenNowPlaying();
                        }}
                      >
                        <Play className="w-3.5 h-3.5 mr-1" />
                        Play
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
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
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

              {/* Admin Edit Mode */}
              {isAdmin && isEditing && onUpdate ? (
                <SubmissionEditForm
                  submission={submission}
                  onSave={async (id, updates) => {
                    await onUpdate(id, updates);
                    setIsEditing(false);
                    toast({
                      title: "Saved!",
                      description: "Submission updated successfully",
                    });
                  }}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                /* Actions */
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  {isTrashView ? (
                    // Trash view: restore or permanently delete
                    <>
                      {onRestore && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRestore(submission.id);
                          }}
                        >
                          <Eye className="w-3 h-3" />
                          Restore
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(submission.id, true);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete Forever
                      </Button>
                    </>
                  ) : (
                    // Normal view actions
                    <>
                      {isAdmin && onUpdate && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditing(true);
                          }}
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </Button>
                      )}
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
                        Done
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
                        Skip
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="glass-strong" onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will move "{submission.artist_name} – {submission.song_title}" to the trash. You can restore it within 7 days.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(submission.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Move to Trash
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
