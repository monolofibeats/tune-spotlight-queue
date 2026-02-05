import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Save, 
  Loader2, 
  User, 
  Palette, 
  Layout, 
  Link as LinkIcon,
  Image,
  Eye
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { Streamer } from '@/types/streamer';

const StreamerSettings = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [streamer, setStreamer] = useState<Streamer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const [showHowItWorks, setShowHowItWorks] = useState(true);
  const [showStreamEmbed, setShowStreamEmbed] = useState(true);
  const [customCss, setCustomCss] = useState('');
  const [twitchUrl, setTwitchUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchStreamer = async () => {
      const { data, error } = await supabase
        .from('streamers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast({
            title: "No streamer profile",
            description: "You don't have a streamer profile yet. Please apply first.",
            variant: "destructive",
          });
          navigate('/');
        } else {
          console.error('Error fetching streamer:', error);
        }
        setIsLoading(false);
        return;
      }

      const s = data as Streamer;
      setStreamer(s);
      
      // Populate form
      setDisplayName(s.display_name || '');
      setBio(s.bio || '');
      setAvatarUrl(s.avatar_url || '');
      setBannerUrl(s.banner_url || '');
      setHeroTitle(s.hero_title || '');
      setHeroSubtitle(s.hero_subtitle || '');
      setWelcomeMessage(s.welcome_message || '');
      setPrimaryColor(s.primary_color || '');
      setAccentColor(s.accent_color || '');
      setShowHowItWorks(s.show_how_it_works ?? true);
      setShowStreamEmbed(s.show_stream_embed ?? true);
      setCustomCss(s.custom_css || '');
      setTwitchUrl(s.twitch_url || '');
      setYoutubeUrl(s.youtube_url || '');
      setTiktokUrl(s.tiktok_url || '');
      setInstagramUrl(s.instagram_url || '');
      setTwitterUrl(s.twitter_url || '');
      
      setIsLoading(false);
    };

    fetchStreamer();
  }, [user, authLoading, navigate]);

  const handleSave = async () => {
    if (!streamer) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('streamers')
        .update({
          display_name: displayName,
          bio: bio || null,
          avatar_url: avatarUrl || null,
          banner_url: bannerUrl || null,
          hero_title: heroTitle || 'Submit Your Music',
          hero_subtitle: heroSubtitle || 'Get your tracks reviewed live on stream',
          welcome_message: welcomeMessage || null,
          primary_color: primaryColor || '142 76% 36%',
          accent_color: accentColor || '142 76% 36%',
          show_how_it_works: showHowItWorks,
          show_stream_embed: showStreamEmbed,
          custom_css: customCss || null,
          twitch_url: twitchUrl || null,
          youtube_url: youtubeUrl || null,
          tiktok_url: tiktokUrl || null,
          instagram_url: instagramUrl || null,
          twitter_url: twitterUrl || null,
        })
        .eq('id', streamer.id);

      if (error) throw error;

      toast({
        title: "Settings saved! ✨",
        description: "Your profile has been updated.",
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save failed",
        description: "Could not save your settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!streamer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-display font-bold">Streamer Settings</h1>
                  <p className="text-muted-foreground">
                    Customize your profile at <span className="text-primary">/{streamer.slug}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <a href={`/${streamer.slug}`} target="_blank" rel="noopener noreferrer" className="gap-2">
                    <Eye className="w-4 h-4" />
                    Preview
                  </a>
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </motion.div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="glass p-1 rounded-xl">
              <TabsTrigger value="profile" className="rounded-lg px-6 gap-2">
                <User className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="appearance" className="rounded-lg px-6 gap-2">
                <Palette className="w-4 h-4" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="layout" className="rounded-lg px-6 gap-2">
                <Layout className="w-4 h-4" />
                Layout
              </TabsTrigger>
              <TabsTrigger value="social" className="rounded-lg px-6 gap-2">
                <LinkIcon className="w-4 h-4" />
                Social
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-4">
                <h2 className="font-semibold text-lg">Basic Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your streamer name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Profile URL</Label>
                    <div className="flex items-center h-10 px-3 bg-muted rounded-md text-muted-foreground text-sm">
                      upstar.gg/{streamer.slug}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell viewers about yourself..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-4">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Images
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="avatarUrl">Avatar URL</Label>
                    <Input
                      id="avatarUrl"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://..."
                    />
                    {avatarUrl && (
                      <img src={avatarUrl} alt="Avatar preview" className="w-16 h-16 rounded-full object-cover" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bannerUrl">Banner URL</Label>
                    <Input
                      id="bannerUrl"
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      placeholder="https://..."
                    />
                    {bannerUrl && (
                      <img src={bannerUrl} alt="Banner preview" className="w-full h-20 rounded-lg object-cover" />
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6">
              <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-4">
                <h2 className="font-semibold text-lg">Hero Section</h2>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="heroTitle">Hero Title</Label>
                    <Input
                      id="heroTitle"
                      value={heroTitle}
                      onChange={(e) => setHeroTitle(e.target.value)}
                      placeholder="Submit Your Music"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
                    <Input
                      id="heroSubtitle"
                      value={heroSubtitle}
                      onChange={(e) => setHeroSubtitle(e.target.value)}
                      placeholder="Get your tracks reviewed live on stream"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="welcomeMessage">Welcome Message</Label>
                    <Textarea
                      id="welcomeMessage"
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      placeholder="A personal message shown below the hero (optional)"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-4">
                <h2 className="font-semibold text-lg">Colors (HSL format)</h2>
                <p className="text-sm text-muted-foreground">
                  Enter colors in HSL format, e.g., "142 76% 36%" for green
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <Input
                      id="primaryColor"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="142 76% 36%"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accentColor">Accent Color</Label>
                    <Input
                      id="accentColor"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      placeholder="142 76% 36%"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-4">
                <h2 className="font-semibold text-lg">Custom CSS (Advanced)</h2>
                <p className="text-sm text-muted-foreground">
                  Add custom CSS to further customize your page
                </p>
                <Textarea
                  value={customCss}
                  onChange={(e) => setCustomCss(e.target.value)}
                  placeholder=".my-class { color: red; }"
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>

            {/* Layout Tab */}
            <TabsContent value="layout" className="space-y-6">
              <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-6">
                <h2 className="font-semibold text-lg">Page Sections</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show "How It Works" Section</Label>
                      <p className="text-sm text-muted-foreground">
                        Display the 3-step tutorial for new visitors
                      </p>
                    </div>
                    <Switch
                      checked={showHowItWorks}
                      onCheckedChange={setShowHowItWorks}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Stream Embed</Label>
                      <p className="text-sm text-muted-foreground">
                        Display your live stream on the page
                      </p>
                    </div>
                    <Switch
                      checked={showStreamEmbed}
                      onCheckedChange={setShowStreamEmbed}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Social Tab */}
            <TabsContent value="social" className="space-y-6">
              <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-4">
                <h2 className="font-semibold text-lg">Streaming Platforms</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="twitchUrl">Twitch</Label>
                    <Input
                      id="twitchUrl"
                      value={twitchUrl}
                      onChange={(e) => setTwitchUrl(e.target.value)}
                      placeholder="https://twitch.tv/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="youtubeUrl">YouTube</Label>
                    <Input
                      id="youtubeUrl"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://youtube.com/..."
                    />
                  </div>
                </div>
              </div>

              <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-4">
                <h2 className="font-semibold text-lg">Social Media</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tiktokUrl">TikTok</Label>
                    <Input
                      id="tiktokUrl"
                      value={tiktokUrl}
                      onChange={(e) => setTiktokUrl(e.target.value)}
                      placeholder="https://tiktok.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instagramUrl">Instagram</Label>
                    <Input
                      id="instagramUrl"
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitterUrl">Twitter/X</Label>
                    <Input
                      id="twitterUrl"
                      value={twitterUrl}
                      onChange={(e) => setTwitterUrl(e.target.value)}
                      placeholder="https://twitter.com/..."
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default StreamerSettings;
