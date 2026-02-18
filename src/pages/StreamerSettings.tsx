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
  Eye,
  FileText,
  DollarSign,
  Globe,
  Flag,
  Sparkles
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  FormFieldBuilder, 
  DesignCustomizer, 
  BannerEditor, 
  PricingSettings,
  LanguageSettings,
  PresetManager,
} from '@/components/streamer-settings';
import { ImageUploadInput } from '@/components/streamer-settings/ImageUploadInput';
import type { Streamer } from '@/types/streamer';

interface ExtendedStreamer extends Streamer {
  page_language?: string;
  font_family?: string;
  button_style?: string;
  background_type?: string;
  background_image_url?: string;
  background_gradient?: string;
  animation_style?: string;
  card_style?: string;
  banner_enabled?: boolean;
  banner_text?: string;
  banner_link?: string;
  banner_color?: string;
  submission_type?: string;
}

const StreamerSettings = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [streamer, setStreamer] = useState<ExtendedStreamer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Form state - Profile
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  
  // Form state - Content
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  
  // Form state - Design
  const [primaryColor, setPrimaryColor] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const [fontFamily, setFontFamily] = useState('system');
  const [buttonStyle, setButtonStyle] = useState('rounded');
  const [backgroundType, setBackgroundType] = useState('solid');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [backgroundGradient, setBackgroundGradient] = useState('');
  const [animationStyle, setAnimationStyle] = useState('subtle');
  const [cardStyle, setCardStyle] = useState('glass');
  
  // Form state - Banner
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerText, setBannerText] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [bannerColor, setBannerColor] = useState('45 90% 50%');
  
  // Form state - Layout
  const [showHowItWorks, setShowHowItWorks] = useState(true);
  const [showStreamEmbed, setShowStreamEmbed] = useState(true);
  const [customCss, setCustomCss] = useState('');
  
  // Form state - Social
  const [twitchUrl, setTwitchUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  
  // Form state - Language
  const [pageLanguage, setPageLanguage] = useState('de');

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

      const s = data as ExtendedStreamer;
      setStreamer(s);
      
      // Populate form - Profile
      setDisplayName(s.display_name || '');
      setBio(s.bio || '');
      setAvatarUrl(s.avatar_url || '');
      setBannerUrl(s.banner_url || '');
      
      // Content
      setHeroTitle(s.hero_title || '');
      setHeroSubtitle(s.hero_subtitle || '');
      setWelcomeMessage(s.welcome_message || '');
      
      // Design
      setPrimaryColor(s.primary_color || '45 90% 50%');
      setAccentColor(s.accent_color || '45 90% 50%');
      setFontFamily(s.font_family || 'system');
      setButtonStyle(s.button_style || 'rounded');
      setBackgroundType(s.background_type || 'solid');
      setBackgroundImageUrl(s.background_image_url || '');
      setBackgroundGradient(s.background_gradient || '');
      setAnimationStyle(s.animation_style || 'subtle');
      setCardStyle(s.card_style || 'glass');
      
      // Banner
      setBannerEnabled(s.banner_enabled || false);
      setBannerText(s.banner_text || '');
      setBannerLink(s.banner_link || '');
      setBannerColor(s.banner_color || '45 90% 50%');
      
      // Layout
      setShowHowItWorks(s.show_how_it_works ?? true);
      setShowStreamEmbed(s.show_stream_embed ?? true);
      setCustomCss(s.custom_css || '');
      
      // Social
      setTwitchUrl(s.twitch_url || '');
      setYoutubeUrl(s.youtube_url || '');
      setTiktokUrl(s.tiktok_url || '');
      setInstagramUrl(s.instagram_url || '');
      setTwitterUrl(s.twitter_url || '');
      
      // Language
      setPageLanguage(s.page_language || 'de');
      
      setIsLoading(false);
    };

    fetchStreamer();
  }, [user, authLoading, navigate]);

  const logContentChange = async (fieldName: string, oldValue: string, newValue: string) => {
    if (!streamer || oldValue === newValue) return;
    
    try {
      await supabase
        .from('streamer_content_changes')
        .insert({
          streamer_id: streamer.id,
          field_name: fieldName,
          old_value: oldValue,
          new_value: newValue,
        });
    } catch (e) {
      console.log('Failed to log content change:', e);
    }
  };

  const handleSave = async () => {
    if (!streamer) return;

    setIsSaving(true);

    // Log text content changes for admin review
    if (heroTitle !== streamer.hero_title) {
      await logContentChange('hero_title', streamer.hero_title || '', heroTitle);
    }
    if (heroSubtitle !== streamer.hero_subtitle) {
      await logContentChange('hero_subtitle', streamer.hero_subtitle || '', heroSubtitle);
    }
    if (welcomeMessage !== streamer.welcome_message) {
      await logContentChange('welcome_message', streamer.welcome_message || '', welcomeMessage);
    }
    if (bannerText !== streamer.banner_text) {
      await logContentChange('banner_text', streamer.banner_text || '', bannerText);
    }

    try {
      const { data, error } = await supabase
        .from('streamers')
        .update({
          // Profile
          display_name: displayName,
          bio: bio || null,
          avatar_url: avatarUrl || null,
          banner_url: bannerUrl || null,
          
          // Content
          hero_title: heroTitle || 'Submit Your Music',
          hero_subtitle: heroSubtitle || 'Get your tracks reviewed live on stream',
          welcome_message: welcomeMessage || null,
          
          // Design
          primary_color: primaryColor || '45 90% 50%',
          accent_color: accentColor || '45 90% 50%',
          font_family: fontFamily,
          button_style: buttonStyle,
          background_type: backgroundType,
          background_image_url: backgroundImageUrl || null,
          background_gradient: backgroundGradient || null,
          animation_style: animationStyle,
          card_style: cardStyle,
          
          // Banner
          banner_enabled: bannerEnabled,
          banner_text: bannerText || null,
          banner_link: bannerLink || null,
          banner_color: bannerColor,
          
          // Layout
          show_how_it_works: showHowItWorks,
          show_stream_embed: showStreamEmbed,
          custom_css: customCss || null,
          
          // Social
          twitch_url: twitchUrl || null,
          youtube_url: youtubeUrl || null,
          tiktok_url: tiktokUrl || null,
          instagram_url: instagramUrl || null,
          twitter_url: twitterUrl || null,
          
          // Language
          page_language: pageLanguage,
        })
        .eq('id', streamer.id)
        .select('*')
        .single();

      if (error) throw error;

      if (data) {
        setStreamer(data as ExtendedStreamer);
      }

      toast({
        title: "Settings saved! ✨",
        description: "Your profile has been updated. Changes are live now.",
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

  const tabs = [
    { id: 'presets', label: 'Presets', icon: Palette },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'form', label: 'Form', icon: Layout },
    { id: 'design', label: 'Design', icon: Palette },
    { id: 'banner', label: 'Banner', icon: Flag },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'language', label: 'Language', icon: Globe },
    { id: 'social', label: 'Social', icon: LinkIcon },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Settings className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-display font-bold">Customize Your Page</h1>
                  <p className="text-muted-foreground">
                    <span className="text-primary font-medium">upstar.gg/{streamer.slug}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <a href={`/${streamer.slug}/submit`} target="_blank" rel="noopener noreferrer" className="gap-2">
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <ScrollArea className="w-full">
              <TabsList className="glass p-1 rounded-xl inline-flex w-auto min-w-full">
                {tabs.map((tab) => (
                  <TabsTrigger 
                    key={tab.id}
                    value={tab.id} 
                    className="rounded-lg px-4 gap-2 whitespace-nowrap"
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>

            {/* Presets Tab */}
            <TabsContent value="presets" className="space-y-6">
              {streamer && <PresetManager streamerId={streamer.id} />}
            </TabsContent>

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
                    <div className="flex items-center h-12 px-4 bg-muted rounded-lg text-muted-foreground">
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <ImageUploadInput
                      streamerId={streamer.id}
                      variant="avatar"
                      value={avatarUrl}
                      onChange={setAvatarUrl}
                    />
                  </div>
                  <div className="space-y-3">
                    <ImageUploadInput
                      streamerId={streamer.id}
                      variant="banner"
                      value={bannerUrl}
                      onChange={setBannerUrl}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-6">
              <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-4">
                <h2 className="font-semibold text-lg">Hero Section Text</h2>
                <p className="text-sm text-muted-foreground">
                  These texts appear prominently on your page. Changes go live immediately but are logged for admin review.
                </p>
                
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

            {/* Form Builder Tab */}
            <TabsContent value="form" className="space-y-6">
              <FormFieldBuilder streamerId={streamer.id} />
            </TabsContent>

            {/* Design Tab */}
            <TabsContent value="design" className="space-y-6">
              <DesignCustomizer
                settings={{
                  primaryColor,
                  fontFamily,
                  buttonStyle,
                  backgroundType,
                  backgroundImageUrl,
                  backgroundGradient,
                  animationStyle,
                  cardStyle,
                  streamerId: streamer.id,
                }}
                onChange={(updates) => {
                  if (updates.primaryColor !== undefined) setPrimaryColor(updates.primaryColor);
                  if (updates.fontFamily !== undefined) setFontFamily(updates.fontFamily);
                  if (updates.buttonStyle !== undefined) setButtonStyle(updates.buttonStyle);
                  if (updates.backgroundType !== undefined) setBackgroundType(updates.backgroundType);
                  if (updates.backgroundImageUrl !== undefined) setBackgroundImageUrl(updates.backgroundImageUrl);
                  if (updates.backgroundGradient !== undefined) setBackgroundGradient(updates.backgroundGradient);
                  if (updates.animationStyle !== undefined) setAnimationStyle(updates.animationStyle);
                  if (updates.cardStyle !== undefined) setCardStyle(updates.cardStyle);
                }}
              />
              
              {/* Custom CSS */}
              <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-4">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Custom CSS (Advanced)
                </h2>
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

            {/* Banner Tab */}
            <TabsContent value="banner" className="space-y-6">
              <BannerEditor
                settings={{
                  bannerEnabled,
                  bannerText,
                  bannerLink,
                  bannerColor,
                }}
                onChange={(updates) => {
                  if (updates.bannerEnabled !== undefined) setBannerEnabled(updates.bannerEnabled);
                  if (updates.bannerText !== undefined) setBannerText(updates.bannerText);
                  if (updates.bannerLink !== undefined) setBannerLink(updates.bannerLink);
                  if (updates.bannerColor !== undefined) setBannerColor(updates.bannerColor);
                }}
              />
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="space-y-6">
              <PricingSettings streamerId={streamer.id} />
            </TabsContent>

            {/* Language Tab */}
            <TabsContent value="language" className="space-y-6">
              <LanguageSettings
                language={pageLanguage}
                onChange={setPageLanguage}
              />
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
                    <Label htmlFor="twitterUrl">Twitter / X</Label>
                    <Input
                      id="twitterUrl"
                      value={twitterUrl}
                      onChange={(e) => setTwitterUrl(e.target.value)}
                      placeholder="https://x.com/..."
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
