import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Music, 
  Settings, 
  BarChart3,
  Filter,
  Search
} from 'lucide-react';
import { Header } from '@/components/Header';
import { SubmissionCard } from '@/components/SubmissionCard';
import { PlatformConnections } from '@/components/PlatformConnections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockSubmissions, mockConnectedPlatforms } from '@/lib/mockData';
import { Submission } from '@/types/submission';
import { toast } from '@/hooks/use-toast';

const Dashboard = () => {
  const [submissions, setSubmissions] = useState<Submission[]>(mockSubmissions);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleFeedback = (id: string, feedback: string) => {
    setSubmissions(prev => prev.map(s => 
      s.id === id 
        ? { ...s, feedback, status: 'reviewed' as const }
        : s
    ));
    toast({
      title: "Feedback sent! ✨",
      description: "Your feedback has been saved.",
    });
  };

  const handleConnect = (platform: string) => {
    toast({
      title: `Connect ${platform}`,
      description: `Connecting to ${platform}...`,
    });
  };

  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = 
      s.songTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.artistName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.submitterName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    reviewed: submissions.filter(s => s.status === 'reviewed').length,
    priority: submissions.filter(s => s.isPriority).length,
  };

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
              Manage submissions, respond to songs, and connect your platforms.
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
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <BarChart3 className="w-5 h-5 text-amber-400" />
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
                  <Music className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">{stats.reviewed}</p>
                  <p className="text-sm text-muted-foreground">Reviewed</p>
                </div>
              </div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                  <Music className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">{stats.priority}</p>
                  <p className="text-sm text-muted-foreground">Priority</p>
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
              <TabsTrigger value="platforms" className="rounded-lg px-6">
                Platforms
              </TabsTrigger>
              <TabsTrigger value="settings" className="rounded-lg px-6">
                Settings
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
                    placeholder="Search songs, artists, or submitters..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  {['all', 'pending', 'reviewing', 'reviewed'].map((status) => (
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
                  >
                    <SubmissionCard
                      submission={submission}
                      onFeedback={handleFeedback}
                    />
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

            <TabsContent value="platforms">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-strong rounded-2xl p-6"
              >
                <PlatformConnections 
                  platforms={mockConnectedPlatforms}
                  onConnect={handleConnect}
                />
              </motion.div>
            </TabsContent>

            <TabsContent value="settings">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-strong rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-display font-semibold">Settings</h2>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                      Stream Name
                    </label>
                    <Input 
                      placeholder="Your stream name"
                      defaultValue="Music React Live"
                      className="max-w-md"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                      Submission Page URL
                    </label>
                    <div className="flex gap-2 max-w-md">
                      <Input 
                        value="upstar.app/submit/your-stream"
                        readOnly
                        className="bg-background/30"
                      />
                      <Button variant="outline">Copy</Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                      Priority Price
                    </label>
                    <div className="flex items-center gap-2 max-w-md">
                      <span className="text-muted-foreground">$</span>
                      <Input 
                        type="number"
                        defaultValue="5"
                        min="1"
                        max="100"
                        className="w-24"
                      />
                    </div>
                  </div>

                  <Button variant="hero">Save Settings</Button>
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
