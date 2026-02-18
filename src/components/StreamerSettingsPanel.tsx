import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Save, 
  Loader2, 
  Palette, 
  Layout, 
  FileText,
  DollarSign,
  Eye,
  Radio,
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
import { useLanguage } from '@/hooks/useLanguage';
import { 
  FormFieldBuilder, 
  DesignCustomizer, 
  PricingSettings,
  PresetManager,
} from '@/components/streamer-settings';
import { SessionManager } from '@/components/SessionManager';
import { ScreenStreamer } from '@/components/ScreenStreamer';
import { StreamEmbedConfig } from '@/components/StreamEmbedConfig';
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
  const { t } = useLanguage();
  const [streamer, setStreamer] = useState<ExtendedStreamer>(initialStreamer as ExtendedStreamer);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('form');

  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  
  const [primaryColor, setPrimaryColor] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const [fontFamily, setFontFamily] = useState('system');
  const [buttonStyle, setButtonStyle] = useState('rounded');
  const [backgroundType, setBackgroundType] = useState('solid');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [backgroundGradient, setBackgroundGradient] = useState('');
  const [animationStyle, setAnimationStyle] = useState('subtle');
  const [cardStyle, setCardStyle] = useState('glass');
  
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerText, setBannerText] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [bannerColor, setBannerColor] = useState('45 90% 50%');
  
  const [showHowItWorks, setShowHowItWorks] = useState(true);
  const [showStreamEmbed, setShowStreamEmbed] = useState(true);
  const [customCss, setCustomCss] = useState('');

  useEffect(() => {
    const s = streamer;
    setHeroTitle(s.hero_title || '');
    setHeroSubtitle(s.hero_subtitle || '');
    setWelcomeMessage(s.welcome_message || '');
    setPrimaryColor(s.primary_color || '45 90% 50%');
    setAccentColor(s.accent_color || '45 90% 50%');
    setFontFamily(s.font_family || 'system');
    setButtonStyle(s.button_style || 'rounded');
    setBackgroundType(s.background_type || 'solid');
    setBackgroundImageUrl(s.background_image_url || '');
    setBackgroundGradient(s.background_gradient || '');
    setAnimationStyle(s.animation_style || 'subtle');
    setCardStyle(s.card_style || 'glass');
    setBannerEnabled(s.banner_enabled || false);
    setBannerText(s.banner_text || '');
    setBannerLink(s.banner_link || '');
    setBannerColor(s.banner_color || '45 90% 50%');
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

    try {
      if (heroTitle !== streamer.hero_title) await logContentChange('hero_title', streamer.hero_title || '', heroTitle);
      if (heroSubtitle !== streamer.hero_subtitle) await logContentChange('hero_subtitle', streamer.hero_subtitle || '', heroSubtitle);
      if (welcomeMessage !== streamer.welcome_message) await logContentChange('welcome_message', streamer.welcome_message || '', welcomeMessage);
      if (bannerText !== streamer.banner_text) await logContentChange('banner_text', streamer.banner_text || '', bannerText);
    } catch (e) {
      console.log('Content change logging skipped:', e);
    }

    try {
      const { data, error } = await supabase
        .from('streamers')
        .update({
          hero_title: heroTitle || 'Submit Your Music',
          hero_subtitle: heroSubtitle || 'Get your tracks reviewed live on stream',
          welcome_message: welcomeMessage || null,
          primary_color: primaryColor || '45 90% 50%',
          accent_color: accentColor || '45 90% 50%',
          font_family: fontFamily,
          button_style: buttonStyle,
          background_type: backgroundType,
          background_image_url: backgroundImageUrl || null,
          background_gradient: backgroundGradient || null,
          animation_style: animationStyle,
          card_style: cardStyle,
          banner_enabled: bannerEnabled,
          banner_text: bannerText || null,
          banner_link: bannerLink || null,
          banner_color: bannerColor,
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
        title: t('pageSettings.saved'),
        description: t('pageSettings.savedDesc'),
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: t('pageSettings.saveFailed'),
        description: t('pageSettings.saveFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'form', label: t('pageSettings.tab.form'), icon: Layout },
    { id: 'content', label: t('pageSettings.tab.content'), icon: FileText },
    { id: 'pricing', label: t('pageSettings.tab.pricing'), icon: DollarSign },
    { id: 'design', label: t('pageSettings.tab.design'), icon: Palette },
    { id: 'presets', label: t('pageSettings.tab.presets'), icon: Palette },
    { id: 'stream', label: t('pageSettings.tab.stream'), icon: Radio },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div>
          <h2 className="text-xl font-semibold">{t('pageSettings.customizePage')}</h2>
          <p className="text-muted-foreground text-sm">
            upstar.gg/{streamer.slug}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={`/${streamer.slug}/submit`} target="_blank" rel="noopener noreferrer" className="gap-2">
              <Eye className="w-4 h-4" />
              {t('pageSettings.preview')}
            </a>
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {t('pageSettings.saveChanges')}
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

        <TabsContent value="form" className="space-y-6">
          <FormFieldBuilder streamerId={streamer.id} />
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-lg">{t('pageSettings.hero.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('pageSettings.hero.desc')}</p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="heroTitle">{t('pageSettings.hero.titleLabel')}</Label>
                <Input id="heroTitle" value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} placeholder={t('pageSettings.hero.titlePlaceholder')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heroSubtitle">{t('pageSettings.hero.subtitleLabel')}</Label>
                <Input id="heroSubtitle" value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} placeholder={t('pageSettings.hero.subtitlePlaceholder')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">{t('pageSettings.hero.welcomeLabel')}</Label>
                <Textarea id="welcomeMessage" value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} placeholder={t('pageSettings.hero.welcomePlaceholder')} rows={2} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          <PricingSettings streamerId={streamer.id} />
        </TabsContent>

        <TabsContent value="design" className="space-y-6">
          <DesignCustomizer
            settings={{ primaryColor, fontFamily, buttonStyle, backgroundType, backgroundImageUrl, backgroundGradient, animationStyle, cardStyle, streamerId: streamer.id }}
            onChange={(newSettings) => {
              if (newSettings.primaryColor !== undefined) setPrimaryColor(newSettings.primaryColor);
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

        <TabsContent value="presets" className="space-y-6">
          <PresetManager streamerId={streamer.id} />
        </TabsContent>

        <TabsContent value="stream" className="space-y-6">
          <SessionManager streamerId={initialStreamer.id} />
          <StreamEmbedConfig streamerId={initialStreamer.id} />
          <ScreenStreamer />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
