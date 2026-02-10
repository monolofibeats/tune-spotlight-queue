import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  Drum, 
  Guitar, 
  Piano,
  Music2, 
  Wind,
  Loader2,
  CheckCircle,
  XCircle,
  Wand2,
  Play,
  Download,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AudioPlayer } from '@/components/AudioPlayer';
import { supabase } from '@/integrations/supabase/client';
import { getSignedAudioUrl } from '@/lib/storage';
import { toast } from '@/hooks/use-toast';

interface StemJob {
  id: string;
  submission_id: string;
  stem_type: string;
  status: string;
  progress: number;
  stem_url: string | null;
  back_url: string | null;
  error_message: string | null;
  created_at: string;
}

interface StemSeparationPanelProps {
  submissionId: string;
  hasAudioFile: boolean;
}

const STEM_OPTIONS = [
  { type: 'vocals', label: 'Vocals', icon: Mic, color: 'text-pink-400' },
  { type: 'drums', label: 'Drums', icon: Drum, color: 'text-orange-400' },
  { type: 'bass', label: 'Bass', icon: Guitar, color: 'text-blue-400' },
  { type: 'electric_guitar', label: 'E-Guitar', icon: Guitar, color: 'text-red-400' },
  { type: 'acoustic_guitar', label: 'A-Guitar', icon: Guitar, color: 'text-amber-400' },
  { type: 'piano', label: 'Piano', icon: Piano, color: 'text-purple-400' },
  { type: 'synthesizer', label: 'Synth', icon: Music2, color: 'text-cyan-400' },
  { type: 'strings', label: 'Strings', icon: Music2, color: 'text-emerald-400' },
  { type: 'wind', label: 'Wind', icon: Wind, color: 'text-teal-400' },
];

export function StemSeparationPanel({ submissionId, hasAudioFile }: StemSeparationPanelProps) {
  const [jobs, setJobs] = useState<StemJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [selectedStems, setSelectedStems] = useState<string[]>(['vocals', 'drums', 'bass']);
  const [isExpanded, setIsExpanded] = useState(false);
  const [stemAudioUrls, setStemAudioUrls] = useState<Record<string, string>>({});
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch existing jobs
  useEffect(() => {
    const fetchJobs = async () => {
      const { data } = await supabase
        .from('stem_separation_jobs')
        .select('*')
        .eq('submission_id', submissionId)
        .order('created_at', { ascending: true });
      
      if (data && data.length > 0) {
        setJobs(data as StemJob[]);
        setIsExpanded(true);
      }
    };
    fetchJobs();
  }, [submissionId]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`stem-jobs-${submissionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stem_separation_jobs',
          filter: `submission_id=eq.${submissionId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setJobs((prev) => {
              const updated = payload.new as StemJob;
              const idx = prev.findIndex((j) => j.id === updated.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = updated;
                return next;
              }
              return [...prev, updated];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [submissionId]);

  // Poll for processing jobs
  useEffect(() => {
    const hasProcessing = jobs.some((j) => j.status === 'processing');
    
    if (hasProcessing) {
      const poll = async () => {
        try {
          const resp = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stem-separation`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({ action: 'check', submission_id: submissionId }),
            }
          );
          const data = await resp.json();
          if (data.jobs) {
            setJobs(data.jobs);
          }
          if (data.all_done) {
            if (pollRef.current) clearInterval(pollRef.current);
          }
        } catch (e) {
          console.error('Poll error:', e);
        }
      };

      pollRef.current = setInterval(poll, 5000);
      // Initial poll
      poll();

      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [jobs.some((j) => j.status === 'processing'), submissionId]);

  const toggleStem = (stemType: string) => {
    setSelectedStems((prev) =>
      prev.includes(stemType) ? prev.filter((s) => s !== stemType) : [...prev, stemType]
    );
  };

  const startSeparation = async () => {
    if (selectedStems.length === 0) {
      toast({ title: 'Select at least one stem type', variant: 'destructive' });
      return;
    }

    setIsStarting(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stem-separation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: 'start',
            submission_id: submissionId,
            stem_types: selectedStems,
          }),
        }
      );

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to start separation');
      }

      toast({
        title: 'Stem separation started!',
        description: `Processing ${selectedStems.length} stem(s)...`,
      });
      setIsExpanded(true);
    } catch (e) {
      console.error('Start separation error:', e);
      toast({
        title: 'Failed to start separation',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsStarting(false);
    }
  };

  const getStemSignedUrl = async (path: string, jobId: string, urlType: 'stem' | 'back') => {
    const cacheKey = `${jobId}_${urlType}`;
    if (stemAudioUrls[cacheKey]) return stemAudioUrls[cacheKey];
    
    const url = await getSignedAudioUrl(path);
    if (url) {
      setStemAudioUrls((prev) => ({ ...prev, [cacheKey]: url }));
    }
    return url;
  };

  if (!hasAudioFile) return null;

  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const processingJobs = jobs.filter((j) => j.status === 'processing');
  const hasJobs = jobs.length > 0;

  return (
    <div className="rounded-xl border border-border/30 bg-card/50 overflow-hidden">
      {/* Header */}
      <button
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-card/80 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Wand2 className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium flex-1 text-left">Stem Separation</span>
        {processingJobs.length > 0 && (
          <Badge variant="warning" className="text-[10px]">
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
            {processingJobs.length} processing
          </Badge>
        )}
        {completedJobs.length > 0 && (
          <Badge variant="default" className="text-[10px]">
            <CheckCircle className="w-3 h-3 mr-1" />
            {completedJobs.length} ready
          </Badge>
        )}
        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-4">
              {/* Stem type selector - only show if no active jobs */}
              {!hasJobs && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {STEM_OPTIONS.map((stem) => {
                      const Icon = stem.icon;
                      const isSelected = selectedStems.includes(stem.type);
                      return (
                        <button
                          key={stem.type}
                          onClick={() => toggleStem(stem.type)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                            isSelected
                              ? 'bg-primary/20 border-primary/40 text-primary'
                              : 'bg-secondary/30 border-border/50 text-muted-foreground hover:border-primary/30'
                          }`}
                        >
                          <Icon className={`w-3 h-3 ${isSelected ? stem.color : ''}`} />
                          {stem.label}
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    onClick={startSeparation}
                    disabled={isStarting || selectedStems.length === 0}
                    className="w-full"
                    size="sm"
                  >
                    {isStarting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Uploading & Processing...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Extract {selectedStems.length} Stem{selectedStems.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </>
              )}

              {/* Job results */}
              {hasJobs && (
                <div className="space-y-3">
                  {jobs.map((job) => {
                    const stemOption = STEM_OPTIONS.find((s) => s.type === job.stem_type);
                    const Icon = stemOption?.icon || Music2;

                    return (
                      <div
                        key={job.id}
                        className="rounded-lg border border-border/30 bg-secondary/20 p-3 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${stemOption?.color || 'text-primary'}`} />
                          <span className="text-sm font-medium flex-1">
                            {stemOption?.label || job.stem_type}
                          </span>

                          {job.status === 'processing' && (
                            <Badge variant="warning" className="text-[10px]">
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              {job.progress}%
                            </Badge>
                          )}
                          {job.status === 'completed' && (
                            <Badge variant="default" className="text-[10px]">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Done
                            </Badge>
                          )}
                          {job.status === 'error' && (
                            <Badge variant="destructive" className="text-[10px]">
                              <XCircle className="w-3 h-3 mr-1" />
                              Error
                            </Badge>
                          )}
                        </div>

                        {job.status === 'processing' && (
                          <Progress value={job.progress} className="h-1.5" />
                        )}

                        {job.status === 'error' && job.error_message && (
                          <p className="text-xs text-destructive">{job.error_message}</p>
                        )}

                        {job.status === 'completed' && (
                          <div className="space-y-2">
                            {/* Stem track player */}
                            {job.stem_url && (
                              <StemPlayer
                                label={`${stemOption?.label || job.stem_type} (Isolated)`}
                                path={job.stem_url}
                                jobId={job.id}
                                urlType="stem"
                                getStemSignedUrl={getStemSignedUrl}
                              />
                            )}
                            {/* Back track player */}
                            {job.back_url && (
                              <StemPlayer
                                label={`Without ${stemOption?.label || job.stem_type}`}
                                path={job.back_url}
                                jobId={job.id}
                                urlType="back"
                                getStemSignedUrl={getStemSignedUrl}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Option to extract more stems */}
                  {completedJobs.length > 0 && (
                    <div className="pt-2 border-t border-border/30">
                      <p className="text-xs text-muted-foreground mb-2">Extract additional stems:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {STEM_OPTIONS
                          .filter((s) => !jobs.some((j) => j.stem_type === s.type))
                          .map((stem) => {
                            const Icon = stem.icon;
                            const isSelected = selectedStems.includes(stem.type);
                            return (
                              <button
                                key={stem.type}
                                onClick={() => toggleStem(stem.type)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all border ${
                                  isSelected
                                    ? 'bg-primary/20 border-primary/40 text-primary'
                                    : 'bg-secondary/30 border-border/50 text-muted-foreground hover:border-primary/30'
                                }`}
                              >
                                <Icon className={`w-2.5 h-2.5 ${isSelected ? stem.color : ''}`} />
                                {stem.label}
                              </button>
                            );
                          })}
                      </div>
                      {selectedStems.filter((s) => !jobs.some((j) => j.stem_type === s)).length > 0 && (
                        <Button
                          onClick={startSeparation}
                          disabled={isStarting}
                          size="sm"
                          variant="outline"
                          className="mt-2 w-full"
                        >
                          {isStarting ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <Wand2 className="w-3 h-3 mr-1" />
                          )}
                          Extract More Stems
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Individual stem player component
function StemPlayer({
  label,
  path,
  jobId,
  urlType,
  getStemSignedUrl,
}: {
  label: string;
  path: string;
  jobId: string;
  urlType: 'stem' | 'back';
  getStemSignedUrl: (path: string, jobId: string, urlType: 'stem' | 'back') => Promise<string | null>;
}) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const loadAndPlay = async () => {
    if (audioUrl) {
      setIsVisible(!isVisible);
      return;
    }
    setIsLoading(true);
    try {
      const url = await getStemSignedUrl(path, jobId, urlType);
      setAudioUrl(url);
      setIsVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    const url = audioUrl || (await getStemSignedUrl(path, jobId, urlType));
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `${label}.mp3`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="rounded-md bg-card/50 border border-border/20 p-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <button
          onClick={loadAndPlay}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline flex-1"
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          {label}
        </button>
        <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={handleDownload}>
          <Download className="w-3 h-3" />
        </Button>
      </div>
      {isVisible && audioUrl && (
        <AudioPlayer src={audioUrl} isLoading={false} />
      )}
    </div>
  );
}
