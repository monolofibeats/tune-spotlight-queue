import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Menu, X, LayoutDashboard, Settings, Wallet, BarChart3, MessageSquare, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { LiveIndicator } from './LiveIndicator';
import { BidNotificationBell } from './BidNotificationBell';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SignOutDialog } from './SignOutDialog';
import { AdminStreamerChat } from './AdminStreamerChat';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import upstarLogo from '@/assets/upstar-logo.png';

interface AccessibleStreamer {
  id: string;
  slug: string;
  display_name: string;
  isOwner: boolean;
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [supportChatOpen, setSupportChatOpen] = useState(false);
  const [streamerId, setStreamerId] = useState<string | null>(null);
  const [isStreamerOwner, setIsStreamerOwner] = useState(false);
  const [accessibleStreamers, setAccessibleStreamers] = useState<AccessibleStreamer[]>([]);
  const { user, isAdmin, isStreamer } = useAuth();
  const { t } = useLanguage();

  // Fetch all accessible streamers (owned + team memberships)
  useEffect(() => {
    if (!user || !isStreamer) {
      setAccessibleStreamers([]);
      return;
    }
    const fetchAccessible = async () => {
      const streamers: AccessibleStreamer[] = [];

      // Own streamer
      const { data: own } = await supabase
        .from('streamers')
        .select('id, slug, display_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (own) {
        streamers.push({ ...own, isOwner: true });
        setStreamerId(own.id);
        setIsStreamerOwner(true);
      }

      // Team memberships
      const { data: teams } = await supabase
        .from('streamer_team_members')
        .select('streamer_id')
        .eq('user_id', user.id)
        .eq('invitation_status', 'accepted');
      
      if (teams && teams.length > 0) {
        const teamIds = teams.map(t => t.streamer_id);
        const { data: teamStreamers } = await supabase
          .from('streamers')
          .select('id, slug, display_name')
          .in('id', teamIds);
        if (teamStreamers) {
          for (const ts of teamStreamers) {
            // Don't duplicate if already added as owner
            if (!streamers.find(s => s.id === ts.id)) {
              streamers.push({ ...ts, isOwner: false });
            }
          }
        }
        // If no own streamer, set first team streamer for chat
        if (!own && teamStreamers && teamStreamers.length > 0) {
          setStreamerId(teamStreamers[0].id);
        }
      }

      setAccessibleStreamers(streamers);
    };
    fetchAccessible();
  }, [user, isStreamer]);

  // Helper: get dashboard link for a streamer
  const getDashboardLink = (s: AccessibleStreamer) => `/streamer/${s.slug}/dashboard`;
  const getPaymentsLink = (s: AccessibleStreamer) => `/streamer/${s.slug}/payments`;
  const getStatisticsLink = (s: AccessibleStreamer) => `/streamer/${s.slug}/statistics`;

  // Primary streamer for simple nav (when only 1)
  const primaryStreamer = accessibleStreamers[0];
  const hasMultipleStreamers = accessibleStreamers.length > 1;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center">
              <img 
                src={upstarLogo}
                alt="UpStar"
                className="h-20 w-auto"
              />
            </Link>
            <LiveIndicator />
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-3">
            
            {user && <BidNotificationBell />}
            
          {/* Dashboard Link */}
            {isStreamer && !hasMultipleStreamers && primaryStreamer && (
              <Link to={getDashboardLink(primaryStreamer)}>
                <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  {primaryStreamer.isOwner ? t('nav.myDashboard') : t('nav.teamDashboard')}
                </Button>
              </Link>
            )}
            {isStreamer && hasMultipleStreamers && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    {t('nav.myDashboard')}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-popover z-[60]">
                  {accessibleStreamers.map(s => (
                    <DropdownMenuItem key={s.id} asChild>
                      <Link to={getDashboardLink(s)} className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="w-4 h-4" />
                        {s.display_name}
                        {s.isOwner && <span className="text-xs text-muted-foreground ml-auto">{t('nav.owner') || 'Owner'}</span>}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {isAdmin && !isStreamer && (
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  {t('nav.dashboard')}
                </Button>
              </Link>
            )}
            {user && !isAdmin && !isStreamer && (
              <Link to="/user/dashboard">
                <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  {t('nav.mySongs')}
                </Button>
              </Link>
            )}

            {/* Gear icon — ALWAYS a dropdown for logged-in users */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs">
                    <Settings className="w-3.5 h-3.5" />
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-popover z-[60]">
                  {isStreamer && (
                    <>
                      {!hasMultipleStreamers && primaryStreamer ? (
                        <>
                          <DropdownMenuItem asChild>
                            <Link to={getPaymentsLink(primaryStreamer)} className="flex items-center gap-2 cursor-pointer">
                              <Wallet className="w-4 h-4" />
                              {t('nav.payments')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={getStatisticsLink(primaryStreamer)} className="flex items-center gap-2 cursor-pointer">
                              <BarChart3 className="w-4 h-4" />
                              {t('nav.statistics')}
                            </Link>
                          </DropdownMenuItem>
                        </>
                      ) : hasMultipleStreamers ? (
                        <>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="flex items-center gap-2 cursor-pointer">
                              <Wallet className="w-4 h-4" />
                              {t('nav.payments')}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="bg-popover z-[60]">
                              {accessibleStreamers.map(s => (
                                <DropdownMenuItem key={s.id} asChild>
                                  <Link to={getPaymentsLink(s)} className="cursor-pointer">
                                    {s.display_name}
                                  </Link>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="flex items-center gap-2 cursor-pointer">
                              <BarChart3 className="w-4 h-4" />
                              {t('nav.statistics')}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="bg-popover z-[60]">
                              {accessibleStreamers.map(s => (
                                <DropdownMenuItem key={s.id} asChild>
                                  <Link to={getStatisticsLink(s)} className="cursor-pointer">
                                    {s.display_name}
                                  </Link>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        </>
                      ) : null}
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="w-4 h-4" />
                      {t('nav.settings')}
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="w-4 h-4" />
                        {t('nav.adminPanel')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/support" className="flex items-center gap-2 cursor-pointer">
                      <MessageSquare className="w-4 h-4" />
                      {t('nav.support')}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {user ? (
              <SignOutDialog variant="icon" />
            ) : (
              <Link to="/auth">
                <Button size="sm" className="h-8 text-xs px-3">
                  {t('nav.signIn')}
                </Button>
              </Link>
            )}
            
            <div className="border-l border-border/30 pl-3 ml-1">
              <LanguageSwitcher variant="header" />
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-background/95 backdrop-blur-lg border-t border-border/30 p-3"
        >
          <nav className="flex flex-col gap-2">
            <div className="flex items-center justify-end pb-2 border-b border-border/30">
              <LanguageSwitcher variant="header" />
            </div>
            
            {/* Streamer Mobile Menu */}
            {isStreamer && !isAdmin && (
              <>
                {accessibleStreamers.map(s => (
                  <Link key={s.id} to={getDashboardLink(s)} onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
                      <LayoutDashboard className="w-4 h-4" />
                      {hasMultipleStreamers ? s.display_name : t('nav.myDashboard')}
                    </Button>
                  </Link>
                ))}
                {primaryStreamer && (
                  <>
                    <Link to={getPaymentsLink(primaryStreamer)} onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
                        <Wallet className="w-4 h-4" />
                        {t('nav.payments')}
                      </Button>
                    </Link>
                    <Link to={getStatisticsLink(primaryStreamer)} onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
                        <BarChart3 className="w-4 h-4" />
                        {t('nav.statistics')}
                      </Button>
                    </Link>
                  </>
                )}
                <Link to="/settings" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
                    <Settings className="w-4 h-4" />
                    {t('nav.settings')}
                  </Button>
                </Link>
                <Link to="/support" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
                    <MessageSquare className="w-4 h-4" />
                    {t('nav.support')}
                  </Button>
                </Link>
              </>
            )}
            
            {/* Regular User Links - Mobile */}
            {user && !isAdmin && !isStreamer && (
              <>
                <Link to="/user/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
                    <LayoutDashboard className="w-4 h-4" />
                    {t('nav.mySongs')}
                  </Button>
                </Link>
                <Link to="/settings" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
                    <Settings className="w-4 h-4" />
                    {t('nav.settings')}
                  </Button>
                </Link>
              </>
            )}
            
            {isAdmin ? (
              <>
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
                    <LayoutDashboard className="w-4 h-4" />
                    {t('nav.dashboard')}
                  </Button>
                </Link>
                <Link to="/settings" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
                    <Settings className="w-4 h-4" />
                    {t('nav.settings')}
                  </Button>
                </Link>
                <SignOutDialog variant="full" onSignOut={() => setMobileMenuOpen(false)} />
              </>
            ) : user ? (
              <SignOutDialog variant="full" onSignOut={() => setMobileMenuOpen(false)} />
            ) : (
              <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                <Button size="sm" className="w-full h-9 text-sm">
                  {t('nav.signIn')}
                </Button>
              </Link>
            )}
          </nav>
        </motion.div>
      )}

      {/* Support Chat for Streamers */}
      {isStreamer && streamerId && supportChatOpen && (
        <AdminStreamerChat streamerId={streamerId} role="streamer" />
      )}
    </header>
  );
}
