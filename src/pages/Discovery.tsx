import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Radio, Users, Music, TrendingUp, ArrowRight, Sparkles, ChevronDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useActiveStreamers } from '@/hooks/useStreamer';
import { useLanguage } from '@/hooks/useLanguage';
import { Footer } from '@/components/Footer';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { StreamerApplicationForm } from '@/components/StreamerApplicationForm';
import upstarLogo from '@/assets/upstar-logo.png';
import { useState } from 'react';

const Discovery = () => {
  const { streamers, isLoading } = useActiveStreamers();
  const { t } = useLanguage();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  const liveStreamers = streamers.filter(s => s.is_live);
  const offlineStreamers = streamers.filter(s => !s.is_live);

  const stats = [
    { label: 'Active Streamers', value: streamers.length, icon: Users },
    { label: 'Songs Reviewed', value: '10K+', icon: Music },
    { label: 'Live Now', value: liveStreamers.length, icon: Radio },
    { label: 'Weekly Views', value: '50K+', icon: TrendingUp },
  ];

  const faqs = [
    {
      question: 'What is UpStar?',
      answer: 'UpStar is a platform that connects music artists with streamers who review and react to songs live on stream. Get real-time feedback from content creators and their audiences.',
    },
    {
      question: 'How do I submit my music?',
      answer: 'Simply visit a streamer\'s page, paste your song link (Spotify, YouTube, SoundCloud, etc.) or upload an audio file, and submit. You can optionally pay to skip the queue for priority review.',
    },
    {
      question: 'How do streamers join?',
      answer: 'Streamers can apply to join the platform by clicking "Become a Streamer" below. Applications are reviewed within 24-48 hours. Once approved, you\'ll get your own customizable page.',
    },
    {
      question: 'Is it free to submit music?',
      answer: 'Each streamer sets their own pricing. Some offer free submissions, while others may charge for submissions or priority queue placement. Check each streamer\'s page for their specific rates.',
    },
    {
      question: 'What platforms are supported?',
      answer: 'We support Spotify, Apple Music, SoundCloud, YouTube, and direct file uploads (up to 100MB). If your music is hosted elsewhere, you can paste any link or upload the file directly.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center">
              <img src={upstarLogo} alt="UpStar" className="h-20 w-auto" />
            </Link>
            <nav className="flex items-center gap-3">
              <Link to="/library">
                <Button variant="ghost" size="sm" className="h-8 text-xs">
                  Library
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="h-8 text-xs px-3">
                  Sign In
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-28 pb-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="mb-4 gap-1.5 px-3 py-1">
              <Sparkles className="w-3 h-3" />
              Music Review Platform
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-4 leading-tight">
              Get Your Music{' '}
              <span className="text-primary">Reviewed Live</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Submit your tracks to streamers and get real-time feedback from creators and their audiences. Join thousands of artists getting discovered.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="gap-2" asChild>
                <a href="#streamers">
                  <Radio className="w-4 h-4" />
                  Browse Streamers
                </a>
              </Button>
              <Button variant="outline" size="lg" className="gap-2" asChild>
                <a href="#for-streamers">
                  Become a Streamer
                  <ArrowRight className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-4 border-y border-border/30 bg-card/30">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <stat.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <div className="text-2xl md:text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Active Streamers Section */}
      <section id="streamers" className="py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">
              Active Streamers
            </h2>
            <p className="text-muted-foreground">
              Find a streamer to review your music
            </p>
          </motion.div>

          {/* Live Streamers */}
          {liveStreamers.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <h3 className="font-semibold text-lg">Live Now</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveStreamers.map((streamer, index) => (
                  <StreamerCard key={streamer.id} streamer={streamer} index={index} isLive />
                ))}
              </div>
            </div>
          )}

          {/* Offline Streamers */}
          {offlineStreamers.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-4 text-muted-foreground">All Streamers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {offlineStreamers.map((streamer, index) => (
                  <StreamerCard key={streamer.id} streamer={streamer} index={index} />
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground">Loading streamers...</p>
            </div>
          )}

          {!isLoading && streamers.length === 0 && (
            <div className="text-center py-12 bg-card/50 rounded-xl border border-border/50">
              <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No streamers yet</h3>
              <p className="text-muted-foreground mb-4">Be the first to join as a streamer!</p>
              <Button asChild>
                <a href="#for-streamers">Apply Now</a>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-card/30 border-y border-border/30">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">
              How It Works
            </h2>
            <p className="text-muted-foreground">
              Three simple steps to get your music reviewed
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Choose a Streamer', desc: 'Browse our active streamers and find one that matches your genre and style.' },
              { step: '02', title: 'Submit Your Track', desc: 'Paste your song link or upload a file. Add details and optionally skip the queue.' },
              { step: '03', title: 'Get Reviewed Live', desc: 'Watch the stream as your music gets played and receive real-time feedback.' },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative p-6 rounded-xl bg-background border border-border/50 text-center"
              >
                <span className="absolute top-4 left-4 text-xs font-mono text-muted-foreground/50">
                  {item.step}
                </span>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary">{index + 1}</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* For Streamers Section */}
      <section id="for-streamers" className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Badge variant="outline" className="mb-4">For Streamers</Badge>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                Monetize Your Music Reviews
              </h2>
              <p className="text-muted-foreground mb-6">
                Join UpStar as a streamer and create a new revenue stream. Set your own prices, customize your page, and engage with artists worldwide.
              </p>
              <ul className="space-y-3 mb-6">
                {[
                  'Set your own submission prices',
                  'Fully customizable profile page',
                  'Real-time queue management',
                  'Built-in payment processing',
                  'Analytics and insights',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button size="lg" className="gap-2">
                Apply to Join
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-8 border border-primary/20"
            >
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">$500+</div>
                <div className="text-muted-foreground mb-4">Average monthly earnings</div>
                <div className="text-sm text-muted-foreground">
                  Top streamers earn $2,000+/month from music reviews
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-card/30 border-t border-border/30">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground">
              Everything you need to know about UpStar
            </p>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="border border-border/50 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-card/50 transition-colors"
                >
                  <span className="font-medium">{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${
                      expandedFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expandedFaq === index && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground">
                    {faq.answer}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <LanguageSwitcher />
      <Footer />
    </div>
  );
};

// Streamer Card Component
function StreamerCard({ streamer, index, isLive = false }: { streamer: any; index: number; isLive?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        to={`/${streamer.slug}`}
        className={`block p-4 rounded-xl border transition-all hover:shadow-lg hover:-translate-y-1 ${
          isLive
            ? 'bg-gradient-to-br from-primary/10 to-transparent border-primary/30 hover:border-primary/50'
            : 'bg-card/50 border-border/50 hover:border-border'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="relative">
            {streamer.avatar_url ? (
              <img
                src={streamer.avatar_url}
                alt={streamer.display_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">
                  {streamer.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {isLive && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-background flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{streamer.display_name}</h3>
              {isLive && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  LIVE
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {streamer.bio || 'Music reviewer'}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {streamer.twitch_url && (
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground">
                /{streamer.slug}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default Discovery;
