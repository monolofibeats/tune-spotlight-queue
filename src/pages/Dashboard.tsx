import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Loader2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AdminStreamerManager } from '@/components/AdminStreamerManager';
import { AdminChatPanel } from '@/components/AdminChatPanel';
import { AdminPayoutRequests } from '@/components/AdminPayoutRequests';

const Dashboard = () => {
  useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Quick session check to confirm admin access
    const check = async () => {
      await supabase.auth.getSession();
      setIsLoading(false);
    };
    check();
  }, []);

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
              <h1 className="text-3xl font-display font-bold">Admin Dashboard</h1>
            </div>
          </motion.div>

          {/* Tabs */}
          <Tabs defaultValue="streamers" className="space-y-6">
            <TabsList className="glass p-1 rounded-xl">
              <TabsTrigger value="streamers" className="rounded-lg px-6">
                Support
              </TabsTrigger>
              <TabsTrigger value="payouts" className="rounded-lg px-6">
                Payouts
              </TabsTrigger>
            </TabsList>

            {/* Streamers Tab */}
            <TabsContent value="streamers">
              <AdminStreamerManager />
            </TabsContent>

            {/* Payouts Tab */}
            <TabsContent value="payouts">
              <AdminPayoutRequests />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <AdminChatPanel />
    </div>
  );
};

export default Dashboard;
