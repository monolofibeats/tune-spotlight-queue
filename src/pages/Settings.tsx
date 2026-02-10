import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  User,
  Mail,
  Camera,
  Save,
  Loader2,
  ArrowLeft,
  Bell,
  Globe,
  Moon,
  Sun,
  Phone,
  Mic,
  Video,
  Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  preferred_payment_method: string | null;
  display_email: string | null;
  bio: string | null;
}

export default function Settings() {
  const { user, isLoading: authLoading } = useAuth();
  const { language: currentLanguage, setLanguage: setAppLanguage } = useLanguage();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState('profile');

  // Profile
  const [username, setUsername] = useState('');
  const [displayEmail, setDisplayEmail] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Appearance
  const [darkMode, setDarkMode] = useState(true);

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [bidNotifications, setBidNotifications] = useState(true);
  const [statusNotifications, setStatusNotifications] = useState(true);

  // Language
  const [language, setLanguage] = useState(currentLanguage || 'de');

  // Voice & Video
  const [selectedMicrophone, setSelectedMicrophone] = useState('default');
  const [selectedCamera, setSelectedCamera] = useState('default');
  const [selectedSpeaker, setSelectedSpeaker] = useState('default');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [speakerDevices, setSpeakerDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) fetchProfile();
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(() => {});
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
        setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
        setSpeakerDevices(devices.filter(d => d.kind === 'audiooutput'));
      } catch {
        // Devices not available
      }
    };
    loadDevices();
  }, []);

  // Load saved preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('upstar_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDarkMode(parsed.darkMode ?? true);
        setEmailNotifications(parsed.emailNotifications ?? true);
        setPushNotifications(parsed.pushNotifications ?? false);
        setBidNotifications(parsed.bidNotifications ?? true);
        setStatusNotifications(parsed.statusNotifications ?? true);
        setSelectedMicrophone(parsed.selectedMicrophone ?? 'default');
        setSelectedCamera(parsed.selectedCamera ?? 'default');
        setSelectedSpeaker(parsed.selectedSpeaker ?? 'default');
        setPhoneNumber(parsed.phoneNumber ?? '');
      } catch {}
    }
  }, []);

  // Apply dark mode changes immediately
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Apply language changes immediately
  useEffect(() => {
    if ((language === 'en' || language === 'de') && language !== currentLanguage) {
      setAppLanguage(language as 'en' | 'de');
    }
  }, [language]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile(data);
        setUsername(data.username || '');
        setDisplayEmail(data.display_email || user.email || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || '');
      } else {
        setDisplayEmail(user.email || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const profileData = {
        user_id: user.id,
        username: username || null,
        display_email: displayEmail || null,
        bio: bio || null,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      };

      if (profile) {
        const { error } = await supabase.from('profiles').update(profileData).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('profiles').insert(profileData);
        if (error) throw error;
      }

      localStorage.setItem('upstar_settings', JSON.stringify({
        darkMode,
        emailNotifications,
        pushNotifications,
        bidNotifications,
        statusNotifications,
        selectedMicrophone,
        selectedCamera,
        selectedSpeaker,
        phoneNumber,
      }));

      toast({ title: 'Settings saved! ✨', description: 'Your preferences have been updated.' });
      fetchProfile();
    } catch (error) {
      console.error('Error saving:', error);
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 2MB', variant: 'destructive' });
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('stream-media').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('stream-media').getPublicUrl(filePath);
      setAvatarUrl(urlData.publicUrl);
      toast({ title: 'Avatar uploaded!', description: 'Click Save to keep your changes.' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: 'Failed to upload avatar', variant: 'destructive' });
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Moon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'language', label: 'Language', icon: Globe },
    { id: 'devices', label: 'Voice & Video', icon: Mic },
  ];

  return (
    <div className="min-h-screen bg-background bg-mesh noise">
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-display font-bold">Settings</h1>
                <p className="text-muted-foreground text-sm">Manage your account and preferences</p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="glass p-1 rounded-xl w-full flex flex-wrap">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="rounded-lg px-4 gap-2 flex-1 min-w-0">
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-6">
                <h2 className="font-semibold text-lg">Profile Information</h2>

                <div className="flex items-center gap-6">
                  <Avatar className="w-20 h-20 border-2 border-primary/30">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="bg-secondary text-xl">
                      {username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    <div className="inline-flex items-center gap-2 rounded-md text-sm font-medium border border-border bg-transparent hover:bg-secondary h-9 px-3 transition-colors cursor-pointer">
                      <Camera className="w-4 h-4" />
                      Change Avatar
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" placeholder="Your display name" value={username} onChange={(e) => setUsername(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayEmail">Display Email</Label>
                    <Input id="displayEmail" type="email" placeholder="your@email.com" value={displayEmail} onChange={(e) => setDisplayEmail(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Login: {user?.email}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="+49 123 456789" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" placeholder="Tell us about yourself..." value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
                </div>
              </div>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6">
              <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-6">
                <h2 className="font-semibold text-lg">Appearance</h2>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {darkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
                    <div>
                      <Label>{darkMode ? 'Dark Mode' : 'Light Mode'}</Label>
                      <p className="text-sm text-muted-foreground">
                        {darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
                      </p>
                    </div>
                  </div>
                  <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                </div>
              </div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-6">
                <h2 className="font-semibold text-lg">Notifications</h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive updates via email</p>
                    </div>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">Browser push notifications</p>
                    </div>
                    <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Bid Notifications</Label>
                      <p className="text-sm text-muted-foreground">When someone outbids you</p>
                    </div>
                    <Switch checked={bidNotifications} onCheckedChange={setBidNotifications} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Status Updates</Label>
                      <p className="text-sm text-muted-foreground">When your submission is reviewed</p>
                    </div>
                    <Switch checked={statusNotifications} onCheckedChange={setStatusNotifications} />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Language Tab */}
            <TabsContent value="language" className="space-y-6">
              <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-6">
                <h2 className="font-semibold text-lg">Language & Region</h2>

                <div className="space-y-2">
                  <Label>Platform Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="pt">Português</SelectItem>
                      <SelectItem value="tr">Türkçe</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Changes apply immediately across the platform.</p>
                </div>
              </div>
            </TabsContent>

            {/* Voice & Video Tab */}
            <TabsContent value="devices" className="space-y-6">
              <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-6">
                <h2 className="font-semibold text-lg">Voice & Video</h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mic className="w-4 h-4" />
                      Microphone
                    </Label>
                    <Select value={selectedMicrophone} onValueChange={setSelectedMicrophone}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select microphone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">System Default</SelectItem>
                        {audioDevices.filter(d => d.deviceId).map((d) => (
                          <SelectItem key={d.deviceId} value={d.deviceId}>
                            {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      Speaker
                    </Label>
                    <Select value={selectedSpeaker} onValueChange={setSelectedSpeaker}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select speaker" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">System Default</SelectItem>
                        {speakerDevices.filter(d => d.deviceId).map((d) => (
                          <SelectItem key={d.deviceId} value={d.deviceId}>
                            {d.label || `Speaker ${d.deviceId.slice(0, 8)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Camera
                    </Label>
                    <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select camera" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">System Default</SelectItem>
                        {videoDevices.filter(d => d.deviceId).map((d) => (
                          <SelectItem key={d.deviceId} value={d.deviceId}>
                            {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
