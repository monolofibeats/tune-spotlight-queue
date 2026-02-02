import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Menu, X, LayoutDashboard, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { SocialLinks } from './SocialLinks';
import { useAuth } from '@/hooks/useAuth';
import upstarLogo from '@/assets/upstar-logo.png';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAdmin, signOut } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center">
            <motion.img 
              src={upstarLogo}
              alt="UpStar"
              className="h-14 w-auto drop-shadow-lg"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
            <SocialLinks />
            
            {isAdmin ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" className="gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Button>
                </Link>
                <Button variant="ghost" className="gap-2" onClick={signOut}>
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="hero" size="sm" className="gap-2">
                  Sign In
                </Button>
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden glass-strong border-t border-border/50 p-4"
        >
          <nav className="flex flex-col gap-3">
            <div className="flex justify-center pb-3 border-b border-border/50">
              <SocialLinks />
            </div>
            
            {isAdmin ? (
              <>
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2" 
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="hero" className="w-full">
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
