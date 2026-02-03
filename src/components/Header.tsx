import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Menu, X, LayoutDashboard, LogOut, User, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { SocialLinks } from './SocialLinks';
import { LiveIndicator } from './LiveIndicator';
import { useAuth } from '@/hooks/useAuth';
import upstarLogo from '@/assets/upstar-logo.png';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center">
              <img 
                src={upstarLogo}
                alt="UpStar"
                className="h-10 w-auto"
              />
            </Link>
            <LiveIndicator />
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-3">
            <Link to="/library">
              <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs">
                <Film className="w-3.5 h-3.5" />
                Library
              </Button>
            </Link>
            
            <SocialLinks />
            
            {user && !isAdmin && (
              <Link to="/my-dashboard">
                <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs">
                  <User className="w-3.5 h-3.5" />
                  My Songs
                </Button>
              </Link>
            )}
            
            {isAdmin ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Dashboard
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={signOut}>
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              </>
            ) : user ? (
              <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={signOut}>
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="h-8 text-xs px-3">
                  Sign In
                </Button>
              </Link>
            )}
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
            <Link to="/library" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
                <Film className="w-4 h-4" />
                Library
              </Button>
            </Link>
            
            <div className="flex justify-center pb-2 border-b border-border/30">
              <SocialLinks />
            </div>
            
            {user && !isAdmin && (
              <Link to="/my-dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
                  <User className="w-4 h-4" />
                  My Songs
                </Button>
              </Link>
            )}
            
            {isAdmin ? (
              <>
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Button>
                </Link>
                <Button 
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-9 text-sm" 
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </>
            ) : user ? (
              <Button 
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-9 text-sm" 
                onClick={() => {
                  signOut();
                  setMobileMenuOpen(false);
                }}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            ) : (
              <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                <Button size="sm" className="w-full h-9 text-sm">
                  Sign In
                </Button>
              </Link>
            )}
          </nav>
        </motion.div>
      )}
    </header>
  );
}
