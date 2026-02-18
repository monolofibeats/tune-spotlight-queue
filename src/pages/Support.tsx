import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MessageSquare, HelpCircle } from 'lucide-react';
import { AdminStreamerChat } from '@/components/AdminStreamerChat';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';


const FAQ_COUNT = 10;

export default function Support() {
  const { user, isStreamer } = useAuth();
  const { t } = useLanguage();
  const [chatOpen, setChatOpen] = useState(false);
  const [streamerId, setStreamerId] = useState<string | null>(null);

  const faqs = Array.from({ length: FAQ_COUNT }, (_, i) => ({
    q: t(`support.faq.${i}.q`),
    a: t(`support.faq.${i}.a`),
  }));


  useEffect(() => {
    if (!user || !isStreamer) return;
    const fetchId = async () => {
      const { data: own } = await supabase.from('streamers').select('id').eq('user_id', user.id).maybeSingle();
      if (own) { setStreamerId(own.id); return; }
      const { data: team } = await supabase
        .from('streamer_team_members')
        .select('streamer_id')
        .eq('user_id', user.id)
        .eq('invitation_status', 'accepted')
        .limit(1)
        .maybeSingle();
      if (team) setStreamerId(team.streamer_id);
    };
    fetchId();
  }, [user, isStreamer]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-16 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <HelpCircle className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">{t('support.title')}</h1>
        </div>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">{t('support.faqTitle')}</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">{t('support.needHelp')}</h2>
          <p className="text-muted-foreground mb-4">
            {user && isStreamer
              ? t('support.chatDesc')
              : user
              ? t('support.chatStreamerOnly')
              : t('support.signInRequired')}
          </p>
          {user && isStreamer && streamerId ? (
            <Button onClick={() => setChatOpen(prev => !prev)} className="gap-2">
              <MessageSquare className="w-4 h-4" />
              {chatOpen ? t('support.closeChat') : t('support.openChat')}
            </Button>
          ) : user ? (
            <Button disabled className="gap-2">
              <MessageSquare className="w-4 h-4" />
              {t('support.chatComingSoon')}
            </Button>
          ) : (
            <Button asChild className="gap-2">
              <a href="/auth">{t('support.signInToChat')}</a>
            </Button>
          )}
        </section>
      </main>
      <Footer />

      {chatOpen && streamerId && (
        <AdminStreamerChat streamerId={streamerId} role="streamer" />
      )}
    </div>
  );
}
