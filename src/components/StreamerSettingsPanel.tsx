import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  Loader2, 
  Palette, 
  Layout, 
  FileText,
  DollarSign,
  Eye,
  Radio,
  RefreshCw,
  AlertTriangle,
  Undo2,
  Monitor,
  Tablet,
  Smartphone,
  User,
  Globe,
  Image,
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
  LanguageSettings,
} from '@/components/streamer-settings';
import type { PricingSettingsHandle, FormFieldBuilderHandle } from '@/components/streamer-settings';
import { ImageUploadInput } from '@/components/streamer-settings/ImageUploadInput';
import { SessionManager } from '@/components/SessionManager';
import { StreamEmbedConfig } from '@/components/StreamEmbedConfig';
import type { StreamEmbedConfigHandle } from '@/components/StreamEmbedConfig';
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
  phoneOptimized?: boolean;
  onPhoneOptimizedChange?: (value: boolean) => void;
  onUnsavedChange?: (hasUnsaved: boolean) => void;
}

export function StreamerSettingsPanel({ streamer: initialStreamer, onUpdate, phoneOptimized, onPhoneOptimizedChange, onUnsavedChange }: StreamerSettingsPanelProps) {
  const { t } = useLanguage();
  const [streamer, setStreamer] = useState<ExtendedStreamer>(initialStreamer as ExtendedStreamer);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const pricingRef = useRef<PricingSettingsHandle>(null);
  const formFieldRef = useRef<FormFieldBuilderHandle>(null);
  const streamEmbedRef = useRef<StreamEmbedConfigHandle>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [pricingHasChanges, setPricingHasChanges] = useState(false);
  const [formFieldHasChanges, setFormFieldHasChanges] = useState(false);
  const [streamEmbedHasChanges, setStreamEmbedHasChanges] = useState(false);

  // Profile fields
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  // Content fields
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  
  // Design fields
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
  const [showTopSongs, setShowTopSongs] = useState(false);
  const [showPublicQueue, setShowPublicQueue] = useState(true);
  const [customCss, setCustomCss] = useState('');

  // Language
  const [pageLanguage, setPageLanguage] = useState('de');

  const syncFromStreamer = useCallback((s: ExtendedStreamer) => {
    setDisplayName(s.display_name || '');
    setBio(s.bio || '');
    setAvatarUrl(s.avatar_url || '');
    setBannerUrl(s.banner_url || '');
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
    setShowTopSongs(s.show_top_songs ?? false);
    setShowPublicQueue((s as any).show_public_queue ?? true);
    setCustomCss(s.custom_css || '');
    setPageLanguage(s.page_language || 'de');
  }, []);

  useEffect(() => {
    setStreamer(initialStreamer as ExtendedStreamer);
  }, [initialStreamer]);

  useEffect(() => {
    syncFromStreamer(streamer);
  }, [streamer, syncFromStreamer]);

  // Detect unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    const s = streamer;
    return (
      displayName !== (s.display_name || '') ||
      bio !== (s.bio || '') ||
      avatarUrl !== (s.avatar_url || '') ||
      bannerUrl !== (s.banner_url || '') ||
      heroTitle !== (s.hero_title || '') ||
      heroSubtitle !== (s.hero_subtitle || '') ||
      welcomeMessage !== (s.welcome_message || '') ||
      primaryColor !== (s.primary_color || '45 90% 50%') ||
      accentColor !== (s.accent_color || '45 90% 50%') ||
      fontFamily !== (s.font_family || 'system') ||
      buttonStyle !== (s.button_style || 'rounded') ||
      backgroundType !== (s.background_type || 'solid') ||
      backgroundImageUrl !== (s.background_image_url || '') ||
      backgroundGradient !== (s.background_gradient || '') ||
      animationStyle !== (s.animation_style || 'subtle') ||
      cardStyle !== (s.card_style || 'glass') ||
      bannerEnabled !== (s.banner_enabled || false) ||
      bannerText !== (s.banner_text || '') ||
      bannerLink !== (s.banner_link || '') ||
      bannerColor !== (s.banner_color || '45 90% 50%') ||
      showHowItWorks !== (s.show_how_it_works ?? true) ||
      showStreamEmbed !== (s.show_stream_embed ?? true) ||
      showTopSongs !== (s.show_top_songs ?? false) ||
      showPublicQueue !== ((s as any).show_public_queue ?? true) ||
      customCss !== (s.custom_css || '') ||
      pageLanguage !== (s.page_language || 'de')
    );
  }, [streamer, displayName, bio, avatarUrl, bannerUrl, heroTitle, heroSubtitle, welcomeMessage, primaryColor, accentColor, fontFamily, buttonStyle, backgroundType, backgroundImageUrl, backgroundGradient, animationStyle, cardStyle, bannerEnabled, bannerText, bannerLink, bannerColor, showHowItWorks, showStreamEmbed, showTopSongs, showPublicQueue, customCss, pageLanguage]);

  const anyUnsaved = hasUnsavedChanges || pricingHasChanges || formFieldHasChanges || streamEmbedHasChanges;

  useEffect(() => {
    onUnsavedChange?.(anyUnsaved);
  }, [anyUnsaved, onUnsavedChange]);

  const triggerShake = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  }, []);

  const handleDiscard = useCallback(() => {
    syncFromStreamer(streamer);
    pricingRef.current?.discard();
    formFieldRef.current?.discard();
    streamEmbedRef.current?.discard();
    toast({ title: 'Changes discarded', description: 'All changes have been reverted.' });
  }, [streamer, syncFromStreamer]);

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

      // Send email notification for important field changes
      const notifiableFields = ['display_name', 'email', 'slug'];
      if (notifiableFields.includes(fieldName)) {
        const { sendNotification } = await import('@/lib/notifications');
        sendNotification({
          type: 'profile_change',
          streamer_email: streamer.email,
          streamer_name: streamer.display_name,
          field_name: fieldName,
          old_value: oldValue,
          new_value: newValue,
        });
      }
    } catch (e) {
      console.log('Failed to log content change:', e);
    }
  };

  const handleSaveAll = async () => {
    if (!streamer) return;
    setIsSaving(true);

    try {
      if (pricingRef.current?.hasChanges) {
        await pricingRef.current.save();
      }
    } catch (e) {
      console.error('Pricing save error:', e);
    }

    try {
      if (formFieldRef.current?.hasChanges) {
        await formFieldRef.current.save();
      }
    } catch (e) {
      console.error('Form fields save error:', e);
    }

    try {
      if (streamEmbedRef.current?.hasChanges) {
        await streamEmbedRef.current.save();
      }
    } catch (e) {
      console.error('Stream embed save error:', e);
    }

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
          display_name: displayName,
          bio: bio || null,
          avatar_url: avatarUrl || null,
          banner_url: bannerUrl || null,
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
          show_top_songs: showTopSongs,
          show_public_queue: showPublicQueue,
          custom_css: customCss || null,
          page_language: pageLanguage,
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
      refreshPreview();
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

  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'phone'>('desktop');

  const refreshPreview = () => {
    setPreviewKey((k) => k + 1);
  };

  const previewDimensions = {
    desktop: { width: '133.33%', height: '133.33%', scale: 0.75 },
    tablet: { width: '768px', height: '133.33%', scale: 0.65 },
    phone: { width: '375px', height: '133.33%', scale: 0.55 },
  };

  const currentPreview = previewDimensions[previewDevice];

  const tabs = [
    { id: 'profile', label: t('pageSettings.tab.profile') || 'Profile', icon: User },
    { id: 'form', label: t('pageSettings.tab.form'), icon: Layout },
    { id: 'content', label: t('pageSettings.tab.content'), icon: FileText },
    { id: 'pricing', label: t('pageSettings.tab.pricing'), icon: DollarSign },
    { id: 'design', label: t('pageSettings.tab.design'), icon: Palette },
    { id: 'language', label: t('pageSettings.tab.language') || 'Language', icon: Globe },
    { id: 'stream', label: t('pageSettings.tab.stream'), icon: Radio },
  ];

  return (
    <motion.div
      animate={isShaking ? { x: [0, -4, 4, -3, 3, -1, 1, 0] } : { x: 0 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div className="flex items-center gap-3 order-2 sm:order-1">
          <Button variant="outline" asChild>
            <a href={`/${streamer.slug}/submit`} target="_blank" rel="noopener noreferrer" className="gap-2">
              <Eye className="w-4 h-4" />
              {t('pageSettings.preview')}
            </a>
          </Button>
          <Button onClick={handleSaveAll} disabled={isSaving} size="lg" className="gap-2 min-w-[220px] text-base font-bold shadow-lg shadow-primary/20">
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {t('pageSettings.saveChanges')}
          </Button>
          <AnimatePresence>
            {anyUnsaved && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card/20 border border-primary/30 shadow-md backdrop-blur-md"
              >
                <AlertTriangle className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-medium whitespace-nowrap">Unsaved changes</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDiscard}
                  className="gap-1.5 text-muted-foreground hover:text-foreground h-8 px-3 text-sm"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Discard
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="order-1 sm:order-2 sm:text-right">
          <h2 className="text-xl font-semibold">{t('pageSettings.customizePage')}</h2>
          <p className="text-muted-foreground text-sm">
            upstar.gg/{streamer.slug}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left side: Settings */}
        <div className="w-full lg:w-1/2">
          <Tabs value={activeTab} onValueChange={(tab) => {
            if (anyUnsaved) {
              triggerShake();
              return;
            }
            setActiveTab(tab);
          }} className="space-y-6">
            <ScrollArea className="w-full">
              <TabsList className="backdrop-blur-md bg-card/20 border border-border/30 p-1 rounded-xl inline-flex w-auto min-w-full">
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

            {/* Profile Tab */}
            <TabsContent value="profile" forceMount className={`space-y-6 ${activeTab !== 'profile' ? 'hidden' : ''}`}>
              <div className="backdrop-blur-md bg-card/20 border border-border/30 rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-lg">{t('pageSettings.profile.title') || 'Basic Information'}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('pageSettings.profile.desc') || 'Your public streamer profile information.'}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">{t('pageSettings.profile.displayName') || 'Display Name'}</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t('pageSettings.profile.displayNamePlaceholder') || 'Your streamer name'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('pageSettings.profile.profileUrl') || 'Profile URL'}</Label>
                    <div className="flex items-center h-10 px-3 bg-card/20 backdrop-blur-md border border-border/30 rounded-lg text-sm text-muted-foreground">
                      upstar.gg/{streamer.slug}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">{t('pageSettings.profile.bio') || 'Bio'}</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={t('pageSettings.profile.bioPlaceholder') || 'Tell viewers about yourself...'}
                    rows={3}
                  />
                </div>
              </div>

              <div className="backdrop-blur-md bg-card/20 border border-border/30 rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  {t('pageSettings.profile.images') || 'Images'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ImageUploadInput
                    streamerId={streamer.id}
                    variant="avatar"
                    value={avatarUrl}
                    onChange={setAvatarUrl}
                  />
                  <ImageUploadInput
                    streamerId={streamer.id}
                    variant="banner"
                    value={bannerUrl}
                    onChange={setBannerUrl}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Form Tab */}
            <TabsContent value="form" forceMount className={`space-y-6 ${activeTab !== 'form' ? 'hidden' : ''}`}>
              <FormFieldBuilder ref={formFieldRef} streamerId={streamer.id} onChangeStatus={setFormFieldHasChanges} />
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" forceMount className={`space-y-6 ${activeTab !== 'content' ? 'hidden' : ''}`}>
              <div className="backdrop-blur-md bg-card/20 border border-border/30 rounded-xl p-6 space-y-4">
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

              {/* Section Visibility Toggles */}
              <div className="backdrop-blur-md bg-card/20 border border-border/30 rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-lg">Section Visibility</h3>
                <p className="text-sm text-muted-foreground">Choose which sections are visible on your submit page.</p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>How It Works</Label>
                      <p className="text-xs text-muted-foreground">Step-by-step guide for submitters</p>
                    </div>
                    <Switch checked={showHowItWorks} onCheckedChange={setShowHowItWorks} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Top Songs Pedestal</Label>
                      <p className="text-xs text-muted-foreground">Showcase your top 3 favorite submissions</p>
                    </div>
                    <Switch checked={showTopSongs} onCheckedChange={setShowTopSongs} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Public Waiting List</Label>
                      <p className="text-xs text-muted-foreground">Show pending submissions queue publicly</p>
                    </div>
                    <Switch checked={showPublicQueue} onCheckedChange={setShowPublicQueue} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Stream Embed</Label>
                      <p className="text-xs text-muted-foreground">Show your live stream embed on the page</p>
                    </div>
                    <Switch checked={showStreamEmbed} onCheckedChange={setShowStreamEmbed} />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" forceMount className={`space-y-6 ${activeTab !== 'pricing' ? 'hidden' : ''}`}>
              <PricingSettings ref={pricingRef} streamerId={streamer.id} onChangeStatus={setPricingHasChanges} />
            </TabsContent>

            {/* Design Tab */}
            <TabsContent value="design" forceMount className={`space-y-6 ${activeTab !== 'design' ? 'hidden' : ''}`}>
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

            {/* Language Tab */}
            <TabsContent value="language" forceMount className={`space-y-6 ${activeTab !== 'language' ? 'hidden' : ''}`}>
              <LanguageSettings
                language={pageLanguage}
                onChange={setPageLanguage}
              />
            </TabsContent>

            {/* Stream Tab */}
            <TabsContent value="stream" forceMount className={`space-y-6 ${activeTab !== 'stream' ? 'hidden' : ''}`}>
              <SessionManager streamerId={initialStreamer.id} phoneOptimized={phoneOptimized} onPhoneOptimizedChange={onPhoneOptimizedChange} />
              <StreamEmbedConfig ref={streamEmbedRef} streamerId={initialStreamer.id} onChangeStatus={setStreamEmbedHasChanges} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right side: Live Preview */}
        <div className="hidden lg:block w-1/2 sticky top-24 self-start">
          <div className="backdrop-blur-md bg-card/20 border border-border/30 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-card/10">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Live Preview</span>
              </div>
              <div className="flex items-center gap-1">
                {([
                  { id: 'desktop' as const, icon: Monitor, label: 'Desktop' },
                  { id: 'tablet' as const, icon: Tablet, label: 'Tablet' },
                  { id: 'phone' as const, icon: Smartphone, label: 'Phone' },
                ]).map(({ id, icon: DeviceIcon, label }) => (
                  <Button
                    key={id}
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${previewDevice === id ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                    onClick={() => setPreviewDevice(id)}
                    title={label}
                  >
                    <DeviceIcon className="w-3.5 h-3.5" />
                  </Button>
                ))}
                <div className="w-px h-4 bg-border/50 mx-1" />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={refreshPreview}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div className="relative flex justify-center bg-card/10" style={{ height: 'calc(100vh - 200px)' }}>
              <iframe
                ref={previewIframeRef}
                key={`${previewKey}-${previewDevice}`}
                src={`/${streamer.slug}/submit?preview=true`}
                className="border-0"
                title="Live Preview"
                style={{
                  transform: `scale(${currentPreview.scale})`,
                  transformOrigin: 'top center',
                  width: currentPreview.width,
                  height: currentPreview.height,
                  maxWidth: previewDevice === 'desktop' ? '133.33%' : undefined,
                }}
              />
            </div>
          </div>
        </div>
      </div>

    </motion.div>
  );
}
