import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MessageSquare, HelpCircle } from 'lucide-react';
import { AdminStreamerChat } from '@/components/AdminStreamerChat';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

const faqs = [
  {
    q: "How do I submit a song to a streamer?",
    a: "Visit the streamer's profile page and click on 'Submit a Song'. Fill in the required details including the song link, artist name, and any optional message. Once submitted, your song will appear in the streamer's queue."
  },
  {
    q: "How does the queue system work?",
    a: "Songs are played in the order they are submitted. Priority submissions and boosted songs may move higher in the queue. The streamer decides when to play each song during their live session."
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept all major credit and debit cards through our secure payment provider Stripe. Payments are processed in the currency configured by each streamer."
  },
  {
    q: "Can I get a refund?",
    a: "Refund policies vary by streamer. If your song was not played during the session, please reach out via the support chat and we'll help resolve the situation."
  },
  {
    q: "How do I become a streamer on UpStar?",
    a: "You can apply to become a streamer through the application form on the Discovery page. Once approved by our admin team, you'll get access to your own dashboard and customisable submission page."
  },
  {
    q: "How do payouts work for streamers?",
    a: "Streamers can request payouts from their Payments page. We support PayPal and bank transfers. A small platform fee is deducted from each transaction."
  },
  {
    q: "Is there a minimum payout amount?",
    a: "Yes, the minimum payout threshold is displayed on your Payments page and depends on your chosen payout method and currency."
  },
  {
    q: "How can I change my account settings?",
    a: "Navigate to Settings from the gear icon in the header. There you can update your profile, display name, and other preferences."
  },
];

export default function Support() {
  const { user, isStreamer } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);
  const [streamerId, setStreamerId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isStreamer) return;
    const fetch = async () => {
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
    fetch();
  }, [user, isStreamer]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-16 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <HelpCircle className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Support Center</h1>
        </div>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
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
          <h2 className="text-xl font-semibold mb-2">Still need help?</h2>
          <p className="text-muted-foreground mb-4">
            {user
              ? "Start a live chat with our support team and we'll get back to you as soon as possible."
              : "Sign in to start a live chat with our support team."}
          </p>
          {user && isStreamer && streamerId ? (
            <Button onClick={() => setChatOpen(prev => !prev)} className="gap-2">
              <MessageSquare className="w-4 h-4" />
              {chatOpen ? 'Close Chat' : 'Start Chat'}
            </Button>
          ) : user ? (
            <Button disabled className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat coming soon for all users
            </Button>
          ) : (
            <Button asChild className="gap-2">
              <a href="/auth">Sign in to chat</a>
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
