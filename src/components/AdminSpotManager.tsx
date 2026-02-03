import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, RefreshCw, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PreStreamSpot {
  id: string;
  spot_number: number;
  price_cents: number;
  is_available: boolean;
  purchased_by: string | null;
  submission_id: string | null;
  purchased_at: string | null;
}

const SPOT_PRICES = [
  { number: 1, price_cents: 10000 },
  { number: 2, price_cents: 7500 },
  { number: 3, price_cents: 5000 },
  { number: 4, price_cents: 3000 },
  { number: 5, price_cents: 1500 },
];

export function AdminSpotManager() {
  const [spots, setSpots] = useState<PreStreamSpot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

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
      .channel('admin_spots')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pre_stream_spots' }, fetchSpots)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const initializeSpots = async () => {
    setIsResetting(true);

    try {
      // Delete existing unassigned spots
      await (supabase
        .from('pre_stream_spots' as any)
        .delete()
        .is('session_id', null)) as any;

      // Create fresh spots
      const spotsToInsert = SPOT_PRICES.map(spot => ({
        spot_number: spot.number,
        price_cents: spot.price_cents,
        is_available: true,
        session_id: null,
      }));

      const { error } = await (supabase
        .from('pre_stream_spots' as any)
        .insert(spotsToInsert)) as any;

      if (error) throw error;

      toast({
        title: "Spots reset! 🎯",
        description: "All 5 pre-stream spots are now available",
      });

      fetchSpots();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset spots",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crown className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Pre-Stream Spots</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={initializeSpots}
          disabled={isResetting}
        >
          {isResetting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-1" />
              Reset All Spots
            </>
          )}
        </Button>
      </div>

      {spots.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-3">
            No spots initialized for this stream
          </p>
          <Button onClick={initializeSpots} disabled={isResetting}>
            Initialize Spots
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {spots.map((spot) => (
            <motion.div
              key={spot.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                spot.is_available 
                  ? 'border-emerald-500/30 bg-emerald-500/5' 
                  : 'border-red-500/30 bg-red-500/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Badge variant={spot.is_available ? 'default' : 'secondary'}>
                  #{spot.spot_number}
                </Badge>
                <span className="font-medium">
                  €{spot.price_cents / 100}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {spot.is_available ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm text-emerald-500">Available</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-500">Sold</span>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Click "Reset All Spots" before each stream to make all spots available again
      </p>
    </div>
  );
}
