import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, Loader2, ArrowLeft, Zap, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import upstarLogo from '@/assets/upstar-logo.png';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(72),
});

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Redirect if already logged in - role-based
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);

        const roles = roleData?.map(r => r.role) || [];

        if (roles.includes('admin')) {
          navigate('/dashboard');
        } else if (roles.includes('streamer')) {
          navigate('/streamer/dashboard');
        } else {
          navigate('/user/dashboard');
        }
      }
    };
    checkSession();
  }, [navigate]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast({
        title: t('common.error'),
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      // Check user roles for redirect
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id);

      const roles = roleData?.map(r => r.role) || [];

      toast({
        title: t('auth.welcomeBack'),
        description: t('auth.loginSuccess'),
      });

      if (roles.includes('admin')) {
        navigate('/dashboard');
      } else if (roles.includes('streamer')) {
        navigate('/streamer/dashboard');
      } else {
        navigate('/user/dashboard');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      toast({
        title: t('auth.loginFailed'),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast({
        title: t('common.error'),
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: t('auth.passwordMismatch'),
        description: t('auth.passwordMismatchDesc'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          throw new Error(t('auth.alreadyRegistered'));
        }
        throw error;
      }

      toast({
        title: t('auth.accountCreated'),
        description: t('auth.checkEmail'),
      });

      setIsSignUp(false);
      setPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      toast({
        title: t('auth.signUpFailed'),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setIsSocialLoading(provider);
    
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Social login error:', error);
      toast({
        title: t('auth.loginFailed'),
        description: t('auth.socialLoginError'),
        variant: "destructive",
      });
      setIsSocialLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-mesh noise flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-strong rounded-2xl p-8 space-y-6">
          <div className="text-center">
            <Link to="/">
              <img 
                src={upstarLogo} 
                alt="UpStar" 
                className="h-16 w-auto mx-auto mb-4 drop-shadow-lg"
              />
            </Link>
            <h1 className="text-2xl font-display font-bold mb-2">
              {isSignUp ? t('auth.createAccount') : t('auth.signIn')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSignUp ? t('auth.joinUpstar') : t('auth.accessAccount')}
            </p>
          </div>

          <Tabs defaultValue="quick" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="quick" className="gap-2">
                <Zap className="w-4 h-4" />
                {t('auth.quickAccess')}
              </TabsTrigger>
              <TabsTrigger value="admin" className="gap-2">
                <Lock className="w-4 h-4" />
                {t('auth.emailLogin')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="quick" className="space-y-4">
              <p className="text-sm text-muted-foreground text-center mb-4">
                {t('auth.quickAccessDesc')}
              </p>
              
              <Button
                onClick={() => handleSocialLogin('google')}
                variant="outline"
                size="lg"
                className="w-full gap-3"
                disabled={isSocialLoading !== null}
              >
                {isSocialLoading === 'google' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path 
                      fill="currentColor" 
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path 
                      fill="currentColor" 
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path 
                      fill="currentColor" 
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path 
                      fill="currentColor" 
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                {t('auth.continueGoogle')}
              </Button>
              
              <Button
                onClick={() => handleSocialLogin('apple')}
                variant="outline"
                size="lg"
                className="w-full gap-3"
                disabled={isSocialLoading !== null}
              >
                {isSocialLoading === 'apple' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                )}
                {t('auth.continueApple')}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">{t('auth.secureLogin')}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {t('auth.quickAccessNote')}
              </p>
            </TabsContent>

            <TabsContent value="admin" className="space-y-4">
              <form onSubmit={isSignUp ? handleSignUp : handleAdminLogin} className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    {t('auth.email')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    {t('auth.password')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {isSignUp && (
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                      {t('auth.confirmPassword')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isSignUp ? t('auth.creatingAccount') : t('auth.signingIn')}
                    </>
                  ) : isSignUp ? (
                    <>
                      <UserPlus className="w-5 h-5" />
                      {t('auth.createAccount')}
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      {t('auth.signIn')}
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  {isSignUp ? t('auth.haveAccount') : t('auth.noAccount')}
                </button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {isSignUp 
                  ? t('auth.createAccountNote')
                  : t('auth.emailLoginNote')}
              </p>
            </TabsContent>
          </Tabs>

          <Link 
            to="/" 
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('auth.backToHome')}
          </Link>
        </div>
      </motion.div>
      <LanguageSwitcher />
    </div>
  );
}