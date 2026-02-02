import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Music2, Menu, X, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <motion.div 
              className="p-2 rounded-xl bg-gradient-to-br from-primary to-cyan-400"
              whileHover={{ rotate: 10 }}
            >
              <Music2 className="w-6 h-6 text-primary-foreground" />
            </motion.div>
            <span className="font-display font-bold text-xl">SongReact</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" className="gap-2">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
            <Link to="/">
              <Button variant="hero" className="gap-2">
                Submit Song
              </Button>
            </Link>
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
            <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
            <Link to="/" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="hero" className="w-full gap-2">
                Submit Song
              </Button>
            </Link>
          </nav>
        </motion.div>
      )}
    </header>
  );
}
