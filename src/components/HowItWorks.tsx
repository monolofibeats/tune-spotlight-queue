import { motion } from 'framer-motion';
import { Link2, Zap, Headphones } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export function HowItWorks() {
  const { t } = useLanguage();

  const steps = [
    {
      icon: Link2,
      step: '01',
      title: t('howItWorks.step1.title'),
      description: t('howItWorks.step1.desc'),
    },
    {
      icon: Zap,
      step: '02',
      title: t('howItWorks.step2.title'),
      description: t('howItWorks.step2.desc'),
    },
    {
      icon: Headphones,
      step: '03',
      title: t('howItWorks.step3.title'),
      description: t('howItWorks.step3.desc'),
    },
  ];

  return (
    <section className="py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            {t('howItWorks.title')}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t('howItWorks.subtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {steps.map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.03, y: -4 }}
              className="relative p-5 rounded-xl bg-card/50 border border-border/50 text-center cursor-default transition-shadow hover:shadow-lg hover:shadow-primary/10"
            >
              <span className="absolute top-3 left-3 text-xs font-mono text-muted-foreground/50">
                {item.step}
              </span>
              <motion.div 
                className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.4 }}
              >
                <item.icon className="w-5 h-5 text-primary" />
              </motion.div>
              <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
