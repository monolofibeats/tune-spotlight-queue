import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Save, 
  Loader2, 
  Palette, 
  Layout, 
  FileText,
  DollarSign,
  Flag,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  FormFieldBuilder, 
  DesignCustomizer, 
  BannerEditor, 
  PricingSettings,
  PresetManager,
} from '@/components/streamer-settings';
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

interface StreamerSettingsPanelProps {
  streamer: Streamer;
  onUpdate: (streamer: Streamer) => void;
}

export function StreamerSettingsPanel({ streamer: initialStreamer, onUpdate }: StreamerSettingsPanelProps) {
  const [streamer, setStreamer] = useState<ExtendedStreamer>(initialStreamer as ExtendedStreamer);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('presets');

  // Form state - Content
  
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
  

  useEffect(() => {
    const s = streamer;
    
    // Content
    
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
    
  }, [streamer]);

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

    // Log text content changes for admin review (non-blocking)
    try {
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
    } catch (e) {
      console.log('Content change logging skipped:', e);
    }

    try {
      const { data, error } = await supabase
        .from('streamers')
        .update({
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
        })
        .eq('id', streamer.id)
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStreamer(data as ExtendedStreamer);
        onUpdate(data as Streamer);
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

  const tabs = [
    { id: 'presets', label: 'Presets', icon: Palette },
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'form', label: 'Form', icon: Layout },
    { id: 'design', label: 'Design', icon: Palette },
    { id: 'banner', label: 'Banner', icon: Flag },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header with Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div>
          <h2 className="text-xl font-semibold">Customize Your Page</h2>
          <p className="text-muted-foreground text-sm">
            upstar.gg/{streamer.slug}
          </p>
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
          <PresetManager streamerId={streamer.id} />
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-lg">Hero Section Text</h3>
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

          <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-lg">Layout Options</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show "How It Works" Section</Label>
                  <p className="text-sm text-muted-foreground">Display the step-by-step guide</p>
                </div>
                <Switch
                  checked={showHowItWorks}
                  onCheckedChange={setShowHowItWorks}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Stream Embed</Label>
                  <p className="text-sm text-muted-foreground">Display live stream on your page</p>
                </div>
                <Switch
                  checked={showStreamEmbed}
                  onCheckedChange={setShowStreamEmbed}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Form Tab */}
        <TabsContent value="form" className="space-y-6">
          <FormFieldBuilder streamerId={streamer.id} />
        </TabsContent>

        {/* Design Tab */}
        <TabsContent value="design" className="space-y-6">
          <DesignCustomizer
            settings={{
              primaryColor,
              accentColor,
              fontFamily,
              buttonStyle,
              backgroundType,
              backgroundImageUrl,
              backgroundGradient,
              animationStyle,
              cardStyle,
            }}
            onChange={(newSettings) => {
              if (newSettings.primaryColor !== undefined) setPrimaryColor(newSettings.primaryColor);
              if (newSettings.accentColor !== undefined) setAccentColor(newSettings.accentColor);
              if (newSettings.fontFamily !== undefined) setFontFamily(newSettings.fontFamily);
              if (newSettings.buttonStyle !== undefined) setButtonStyle(newSettings.buttonStyle);
              if (newSettings.backgroundType !== undefined) setBackgroundType(newSettings.backgroundType);
              if (newSettings.backgroundImageUrl !== undefined) setBackgroundImageUrl(newSettings.backgroundImageUrl);
              if (newSettings.backgroundGradient !== undefined) setBackgroundGradient(newSettings.backgroundGradient);
              if (newSettings.animationStyle !== undefined) setAnimationStyle(newSettings.animationStyle);
              if (newSettings.cardStyle !== undefined) setCardStyle(newSettings.cardStyle);
            }}
          />
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
            onChange={(newSettings) => {
              if (newSettings.bannerEnabled !== undefined) setBannerEnabled(newSettings.bannerEnabled);
              if (newSettings.bannerText !== undefined) setBannerText(newSettings.bannerText);
              if (newSettings.bannerLink !== undefined) setBannerLink(newSettings.bannerLink);
              if (newSettings.bannerColor !== undefined) setBannerColor(newSettings.bannerColor);
            }}
          />
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-6">
          <PricingSettings streamerId={streamer.id} />
        </TabsContent>

      </Tabs>
    </motion.div>
  );
}
