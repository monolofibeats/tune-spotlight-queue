import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, RefreshCw, Loader2, Check, X, Save, Euro } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const DEFAULT_SPOT_PRICES = [
  { number: 1, price_cents: 10000 },
  { number: 2, price_cents: 7500 },
  { number: 3, price_cents: 5000 },
  { number: 4, price_cents: 3000 },
  { number: 5, price_cents: 1500 },
];

export function AdminSpotManager() {
  const [spots, setSpots] = useState<PreStreamSpot[]>([]);
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchSpots = async () => {
    const { data, error } = await (supabase
      .from('pre_stream_spots' as any)
      .select('*')
      .is('session_id', null)
      .order('spot_number', { ascending: true })) as any;

    if (!error && data) {
      setSpots(data);
      // Initialize edited prices with current values
      const prices: Record<string, number> = {};
      data.forEach((spot: PreStreamSpot) => {
        prices[spot.id] = spot.price_cents / 100; // Convert to euros for display
      });
      setEditedPrices(prices);
      setHasChanges(false);
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

  const handlePriceChange = (spotId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    // Clamp between 0.50 and 500
    const clampedValue = Math.max(0.5, Math.min(500, numValue));
    setEditedPrices(prev => ({ ...prev, [spotId]: clampedValue }));
    setHasChanges(true);
  };

  const savePrices = async () => {
    setIsSaving(true);

    try {
      // Update each spot's price
      for (const spot of spots) {
        const newPriceCents = Math.round((editedPrices[spot.id] || 0) * 100);
        
        const { error } = await (supabase
          .from('pre_stream_spots' as any)
          .update({ price_cents: newPriceCents })
          .eq('id', spot.id)) as any;

        if (error) throw error;
      }

      toast({
        title: "Prices updated! 💰",
        description: "Spot prices have been saved",
      });
      
      setHasChanges(false);
      fetchSpots();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save prices",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const initializeSpots = async () => {
    setIsResetting(true);

    try {
      // Delete existing unassigned spots
      await (supabase
        .from('pre_stream_spots' as any)
        .delete()
        .is('session_id', null)) as any;

      // Create fresh spots with default or last used prices
      const spotsToInsert = DEFAULT_SPOT_PRICES.map(spot => {
        // Try to use the edited price if available
        const existingSpot = spots.find(s => s.spot_number === spot.number);
        const priceCents = existingSpot ? existingSpot.price_cents : spot.price_cents;
        
        return {
          spot_number: spot.number,
          price_cents: priceCents,
          is_available: true,
          session_id: null,
        };
      });

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
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button
              variant="default"
              size="sm"
              onClick={savePrices}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  Save Prices
                </>
              )}
            </Button>
          )}
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
                <div className="flex items-center gap-2">
                  <Euro className="w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min={0.5}
                    max={500}
                    step={0.5}
                    value={editedPrices[spot.id] || 0}
                    onChange={(e) => handlePriceChange(spot.id, e.target.value)}
                    className="w-24 h-8 text-sm"
                    disabled={!spot.is_available}
                  />
                </div>
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
        Adjust prices (€0.50 - €500) and click "Save Prices". Click "Reset All Spots" before each stream to make all spots available again.
      </p>
    </div>
  );
}
