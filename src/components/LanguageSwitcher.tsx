import { motion } from 'framer-motion';
import { useLanguage, Language } from '@/hooks/useLanguage';

const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'EN', flag: 'EN' },
  { code: 'de', label: 'DE', flag: 'DE' },
  { code: 'ru', label: 'RU', flag: 'RU' },
];

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex gap-1 p-1 rounded-full bg-card/90 backdrop-blur-lg border border-border/50 shadow-lg">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={`relative flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium transition-all ${
            language === lang.code
              ? 'text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {language === lang.code && (
            <motion.div
              layoutId="language-indicator"
              className="absolute inset-0 rounded-full bg-primary"
              transition={{ type: 'spring', duration: 0.3 }}
            />
          )}
          <span className="relative z-10">{lang.flag}</span>
        </button>
      ))}
    </div>
  );
}
