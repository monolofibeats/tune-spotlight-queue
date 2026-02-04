import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Crown, Star, Zap, Loader2, Lock, Check, Shield, Upload, X, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useStreamSession } from '@/hooks/useStreamSession';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface PreStreamSpot {
  id: string;
  spot_number: number;
  price_cents: number;
  is_available: boolean;
  purchased_by: string | null;
  submission_id: string | null;
}

const SPOT_COLORS = [
  { number: 1, label: 'First', color: 'from-yellow-400 to-amber-500' },
  { number: 2, label: 'Second', color: 'from-gray-300 to-gray-400' },
  { number: 3, label: 'Third', color: 'from-amber-600 to-amber-700' },
  { number: 4, label: 'Fourth', color: 'from-zinc-400 to-zinc-500' },
  { number: 5, label: 'Fifth', color: 'from-zinc-500 to-zinc-600' },
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function PreStreamSpots() {
  const { user, isAdmin } = useAuth();
  const { isLive } = useStreamSession();
  const { play } = useSoundEffects();
  const [searchParams] = useSearchParams();
  const [spots, setSpots] = useState<PreStreamSpot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<number | null>(null);
  const [songUrl, setSongUrl] = useState('');
  const [artistName, setArtistName] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSpots = async () => {
    const { data, error } = await (supabase
      .from('pre_stream_spots' as any)
      .select('*')
      .is('session_id', null)
      .order('spot_number', { ascending: true })) as any;

    if (!error && data) {
      setSpots(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSpots();

    const channel = supabase
      .channel('prestream_spots')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pre_stream_spots' }, fetchSpots)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handle payment verification
  useEffect(() => {
    const verifyPayment = async () => {
      const spotPayment = searchParams.get('spot_payment');
      const sessionId = searchParams.get('session_id');
      const spotId = searchParams.get('spot_id');

      if (spotPayment === 'success' && sessionId) {
        try {
          const { data, error } = await supabase.functions.invoke('verify-spot-payment', {
            body: { sessionId, spotId },
          });

          if (error) throw error;

          if (data.success) {
            play('success');
            toast({
              title: `Spot #${data.spotNumber} Purchased! 🎉`,
              description: data.message,
            });
            fetchSpots();
          }
        } catch (error) {
          console.error('Spot payment verification error:', error);
        }

        window.history.replaceState({}, '', '/');
      } else if (spotPayment === 'cancelled') {
        toast({
          title: "Payment cancelled",
          description: "Your spot purchase was not processed.",
          variant: "destructive",
        });
        window.history.replaceState({}, '', '/');
      }
    };

    verifyPayment();
  }, [searchParams, play]);

  const uploadAudioFile = async (): Promise<string | null> => {
    if (!audioFile) return null;
    
    setIsUploadingFile(true);
    try {
      const fileExt = audioFile.name.split('.').pop()?.toLowerCase();
      const fileName = `spots/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('song-files')
        .upload(fileName, audioFile, {
          cacheControl: '3600',
          upsert: false,
        });
      
      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(uploadError.message || 'Failed to upload audio file');
      }
      
      // Return just the file path - signed URLs will be generated on demand for playback
      return fileName;
    } catch (error) {
      console.error('File upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload audio file';
      throw new Error(errorMessage);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum file size is 50MB",
        variant: "destructive",
      });
      return;
    }
    
    setAudioFile(file);
  };

  const removeAudioFile = () => {
    setAudioFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetForm = () => {
    setSelectedSpot(null);
    setSongUrl('');
    setArtistName('');
    setSongTitle('');
    setMessage('');
    setEmail('');
    setAudioFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Admin bypass: claim spot without payment
  const handleAdminClaimSpot = async () => {
    const spot = spots.find(s => s.spot_number === selectedSpot);
    if (!spot) return;

    setIsPurchasing(true);

    try {
      // Upload audio file if present
      const audioFileUrl = await uploadAudioFile();

      // Create submission first
      const { data: submission, error: submissionError } = await supabase
        .from('submissions')
        .insert({
          song_url: songUrl,
          platform: songUrl.includes('spotify') ? 'spotify' : 
                   songUrl.includes('soundcloud') ? 'soundcloud' : 'other',
          artist_name: artistName || 'Unknown Artist',
          song_title: songTitle || 'Untitled',
          message: message || null,
          amount_paid: spot.price_cents / 100,
          is_priority: true,
          user_id: user?.id || null,
          audio_file_url: audioFileUrl,
        })
        .select()
        .single();

      if (submissionError) throw submissionError;

      // Update the spot
      const { error: spotError } = await supabase
        .from('pre_stream_spots' as any)
        .update({
          is_available: false,
          purchased_by: user?.id,
          purchased_at: new Date().toISOString(),
          submission_id: submission.id,
        })
        .eq('id', spot.id);

      if (spotError) throw spotError;

      play('success');
      toast({
        title: `Spot #${selectedSpot} Claimed! 🎉`,
        description: "Admin bypass: No payment required",
      });
      
      resetForm();
      fetchSpots();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to claim spot';
      toast({
        title: "Claim failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  const handlePurchase = async () => {
    if (!songUrl) {
      toast({
        title: "Missing information",
        description: "Please enter your song link",
        variant: "destructive",
      });
      return;
    }

    // Require email if not logged in
    if (!user && !email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    const spot = spots.find(s => s.spot_number === selectedSpot);
    if (!spot || !spot.is_available) {
      toast({
        title: "Spot unavailable",
        description: "This spot has already been purchased",
        variant: "destructive",
      });
      return;
    }

    // Admin bypass - no payment required
    if (isAdmin) {
      await handleAdminClaimSpot();
      return;
    }

    setIsPurchasing(true);

    try {
      // Upload audio file first if present
      const audioFileUrl = await uploadAudioFile();

      const { data, error } = await supabase.functions.invoke('purchase-prestream-spot', {
        body: {
          spotNumber: selectedSpot,
          spotId: spot.id,
          priceCents: spot.price_cents,
          songUrl,
          artistName: artistName || 'Unknown Artist',
          songTitle: songTitle || 'Untitled',
          message,
          email: user?.email || email,
          audioFileUrl,
          platform: songUrl.includes('spotify') ? 'spotify' : 
                   songUrl.includes('soundcloud') ? 'soundcloud' : 'other',
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('Failed to create checkout session');

      play('click');
      window.location.href = data.url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process';
      toast({
        title: "Purchase failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  // Don't show when live
  if (isLive || isLoading) return null;

  // If no spots exist, show nothing
  if (spots.length === 0) return null;

  const selectedSpotData = spots.find(s => s.spot_number === selectedSpot);
  const selectedSpotColor = SPOT_COLORS.find(c => c.number === selectedSpot);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border/50 bg-card/50 p-4 md:p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/20">
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Pre-Stream Priority Spots</h3>
            <p className="text-xs text-muted-foreground">
              Secure your spot at the start of the next stream
            </p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2 md:gap-3">
          {SPOT_COLORS.map((config) => {
            const spot = spots.find(s => s.spot_number === config.number);
            const isAvailable = spot?.is_available ?? false;
            const priceEuros = spot ? spot.price_cents / 100 : 0;

            return (
              <motion.button
                key={config.number}
                whileHover={isAvailable ? { scale: 1.05 } : undefined}
                whileTap={isAvailable ? { scale: 0.95 } : undefined}
                onClick={() => isAvailable && setSelectedSpot(config.number)}
                disabled={!isAvailable}
                className={`relative flex flex-col items-center justify-center p-2 md:p-3 rounded-xl border transition-all ${
                  isAvailable 
                    ? 'border-primary/30 bg-gradient-to-br hover:border-primary cursor-pointer ' + config.color 
                    : 'border-border/30 bg-muted/30 cursor-not-allowed opacity-50'
                }`}
              >
                <span className="text-lg md:text-2xl font-display font-bold text-black">
                  #{config.number}
                </span>
                <span className="text-xs font-semibold text-black/80">
                  €{priceEuros}
                </span>
                {!isAvailable && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl">
                    <Check className="w-5 h-5 text-emerald-500" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-3">
          {spots.filter(s => s.is_available).length} spots available • Resets each stream
        </p>
      </motion.div>

      {/* Purchase Dialog */}
      <Dialog open={selectedSpot !== null} onOpenChange={() => resetForm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Purchase Spot #{selectedSpot}
            </DialogTitle>
            <DialogDescription>
              Your song will be reviewed {selectedSpotColor?.label?.toLowerCase()} 
              {' '}when the stream starts
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Admin Mode Banner */}
            {isAdmin && (
              <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300 font-medium">
                  Admin Mode: No payment required
                </span>
              </div>
            )}

            {/* Email field for guests */}
            {!user && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  Email Address *
                </label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Song Link *
              </label>
              <Input
                placeholder="Spotify, SoundCloud, or any link..."
                value={songUrl}
                onChange={(e) => setSongUrl(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Artist</label>
                <Input
                  placeholder="Artist name"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Title</label>
                <Input
                  placeholder="Song title"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Message (optional)</label>
              <Input
                placeholder="Anything you want us to know?"
                value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              {/* Audio File Upload */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  File Upload (optional, max 50MB)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="spot-audio-file-input"
                />
                {audioFile ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <Music2 className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{audioFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeAudioFile}
                      className="shrink-0 h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-10 text-sm border-dashed"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Audio File
                  </Button>
                )}
              </div>

              <div className={`flex items-center justify-between p-3 rounded-lg ${
                isAdmin 
                  ? 'bg-emerald-500/10 border border-emerald-500/30' 
                  : 'bg-primary/10 border border-primary/30'
              }`}>
                <span className="font-medium">{isAdmin ? 'Cost' : 'Total'}</span>
                <span className={`text-xl font-display font-bold ${isAdmin ? 'text-emerald-400' : 'text-primary'}`}>
                  {isAdmin ? 'FREE' : `€${selectedSpotData ? selectedSpotData.price_cents / 100 : 0}`}
                </span>
              </div>

              <Button
                onClick={handlePurchase}
                disabled={isPurchasing || isUploadingFile || !songUrl}
                className={`w-full ${isAdmin 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600' 
                  : ''
                }`}
                size="lg"
              >
                {isPurchasing || isUploadingFile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isUploadingFile ? 'Uploading file...' : isAdmin ? 'Claiming...' : 'Processing...'}
                  </>
                ) : isAdmin ? (
                  <>
                    <Shield className="w-4 h-4" />
                    Claim Spot #{selectedSpot} (Admin)
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Purchase Spot #{selectedSpot}
                  </>
                )}
              </Button>
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
