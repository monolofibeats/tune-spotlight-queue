import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Menu, X, LayoutDashboard, User, Settings, Wallet, BarChart3, HelpCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LiveIndicator } from './LiveIndicator';
import { BidNotificationBell } from './BidNotificationBell';
import { PerformanceToggle } from './PerformanceToggle';
import { SignOutDialog } from './SignOutDialog';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import upstarLogo from '@/assets/upstar-logo.png';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAdmin, isStreamer } = useAuth();
  const { t } = useLanguage();

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
            
            {/* Streamer Dropdown Menu */}
            {isStreamer && !isAdmin && (
              <>
                <Link to="/streamer/dashboard">
                  <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    My Dashboard
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs">
                      <Settings className="w-3.5 h-3.5" />
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/streamer/payments" className="flex items-center gap-2 cursor-pointer">
                        <Wallet className="w-4 h-4" />
                        Payments
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/streamer/dashboard" className="flex items-center gap-2 cursor-pointer">
                        <BarChart3 className="w-4 h-4" />
                        Statistics
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/streamer/settings" className="flex items-center gap-2 cursor-pointer">
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <a href="mailto:support@upstar.gg" className="flex items-center gap-2 cursor-pointer">
                        <HelpCircle className="w-4 h-4" />
                        Support
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            
            {/* Regular User Links */}
            {user && !isAdmin && !isStreamer && (
              <>
                <Link to="/user/dashboard">
                  <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs">
                    <User className="w-3.5 h-3.5" />
                    {t('nav.mySongs')}
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs">
                    <Settings className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </>
            )}
            
            {isAdmin ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    {t('nav.dashboard')}
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs">
                    <Settings className="w-3.5 h-3.5" />
                  </Button>
                </Link>
                <SignOutDialog variant="icon" />
              </>
            ) : user ? (
              <SignOutDialog variant="icon" />
            ) : (
              <Link to="/auth">
                <Button size="sm" className="h-8 text-xs px-3">
                  {t('nav.signIn')}
                </Button>
              </Link>
            )}
            
            {/* Performance toggle - always visible at the end */}
            <div className="border-l border-border/30 pl-3 ml-1">
              <PerformanceToggle />
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
              <PerformanceToggle />
            </div>
            
            {/* Streamer Mobile Menu */}
            {isStreamer && !isAdmin && (
              <>
                <Link to="/streamer/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
                    <LayoutDashboard className="w-4 h-4" />
                    My Dashboard
                  </Button>
                </Link>
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
                    <User className="w-4 h-4" />
                    Profile
                  </Button>
                </Link>
                <Link to="/streamer/payments" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
                    <Wallet className="w-4 h-4" />
                    Payments
                  </Button>
                </Link>
                <Link to="/streamer/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
                    <BarChart3 className="w-4 h-4" />
                    Statistics
                  </Button>
                </Link>
                <Link to="/streamer/settings" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>
                </Link>
                <a href="mailto:support@upstar.gg" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
                    <HelpCircle className="w-4 h-4" />
                    Support
                  </Button>
                </a>
              </>
            )}
            
            {/* Regular User Links - Mobile */}
            {user && !isAdmin && !isStreamer && (
              <>
                <Link to="/user/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
                    <User className="w-4 h-4" />
                    {t('nav.mySongs')}
                  </Button>
                </Link>
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
                    <Settings className="w-4 h-4" />
                    Profile Settings
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
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
                    <Settings className="w-4 h-4" />
                    Profile Settings
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
    </header>
  );
}
