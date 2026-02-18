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


const faqs = [
  {
    q: "How do I set up my streamer page?",
    a: "Once approved, head to your Streamer Dashboard and click on Settings. You can customise your page slug, hero text, colors, background style, banner, and more. Changes are saved automatically and reflected on your public profile."
  },
  {
    q: "How do payouts work?",
    a: "Navigate to Payments from the gear menu. You can set up PayPal or bank transfer as your preferred payout method, then request a payout once your balance meets the minimum threshold. Our team processes requests manually and you'll be notified once it's completed."
  },
  {
    q: "What fees does the platform charge?",
    a: "A small platform fee is deducted from each submission payment. The exact split is visible in your Payments & Statistics pages. Stripe processing fees are also deducted before your share is calculated."
  },
  {
    q: "How do I manage my submission queue?",
    a: "Your dashboard shows all incoming submissions sorted by priority and payment amount. You can mark songs as 'playing', 'reviewed', or 'skipped'. Use the bulk action bar to manage multiple submissions at once."
  },
  {
    q: "Can I invite team members to help manage my page?",
    a: "Yes! Go to your Streamer Settings and open the Team Manager section. You can invite team members by email and assign them roles like Viewer, Editor, or Admin. Editors and Admins can manage your queue and settings."
  },
  {
    q: "How do presets work?",
    a: "Presets let you save different dashboard layouts and theme configurations for different occasions (e.g. a chill lofi session vs. a high-energy review stream). You can switch between presets from your dashboard."
  },
  {
    q: "How do I customise my submission form?",
    a: "In Streamer Settings, use the Form Field Builder to add, reorder, or remove custom fields on your submission page. You can set fields as required, add placeholders, and choose field types like text, select, or textarea."
  },
  {
    q: "What should I do if I have a payment dispute?",
    a: "Contact us via the Support chat below. Provide the submission ID and any relevant details, and our team will investigate and resolve the issue as quickly as possible."
  },
  {
    q: "How do I go live and show my stream on my page?",
    a: "Enable the stream embed in your Streamer Settings and configure the stream URL (Twitch, YouTube, etc.). When you're live, toggle your live status and viewers will see your stream directly on your profile page."
  },
  {
    q: "How can I track my earnings and performance?",
    a: "Visit the Statistics page from the gear menu. You'll find charts and breakdowns of your earnings over time, submission counts, and other performance metrics."
  },
];

export default function Support() {
  const { user, isStreamer } = useAuth();
  const { t } = useLanguage();
  const [chatOpen, setChatOpen] = useState(false);
  const [streamerId, setStreamerId] = useState<string | null>(null);


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
