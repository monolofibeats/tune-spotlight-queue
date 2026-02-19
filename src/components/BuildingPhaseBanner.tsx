import { useState } from 'react';
import { motion } from 'framer-motion';
import { Construction, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';

export function BuildingPhaseBanner() {
  const { t } = useLanguage();
  const [message, setMessage] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    const { error } = await supabase
      .from('site_feedback')
      .insert({ message: message.trim(), contact_info: contactInfo.trim() || null });

    setIsSubmitting(false);

    if (error) {
      toast({ title: 'Error', description: 'Could not send feedback. Please try again.', variant: 'destructive' });
      return;
    }

    setSubmitted(true);
    setMessage('');
    setContactInfo('');
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-20 mx-4 mt-20 mb-4"
    >
      <div className="container mx-auto max-w-2xl">
        <div className="rounded-xl border border-primary/30 bg-primary/5 backdrop-blur-sm p-6 md:p-8">
          <div className="flex items-center gap-3 mb-3">
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Construction className="w-6 h-6 text-primary" />
            </motion.div>
            <h2 className="text-lg md:text-xl font-bold text-foreground">
              {t('building.title')}
            </h2>
          </div>

          <p className="text-sm md:text-base text-muted-foreground mb-6">
            {t('building.description')}
          </p>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20"
            >
              <CheckCircle className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-foreground">{t('building.thanks')}</span>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <Textarea
                placeholder={t('building.placeholder')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                maxLength={1000}
                className="min-h-[80px] resize-none"
              />
              <Input
                placeholder={t('building.contactPlaceholder')}
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                maxLength={255}
              />
              <Button type="submit" disabled={isSubmitting || !message.trim()} className="w-full sm:w-auto">
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting ? t('building.submitting') : t('building.submit')}
              </Button>
            </form>
          )}
        </div>
      </div>
    </motion.div>
  );
}
