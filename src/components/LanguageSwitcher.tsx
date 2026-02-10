import { motion } from 'framer-motion';
import { Globe, X } from 'lucide-react';
import { useLanguage, Language } from '@/hooks/useLanguage';

const languages: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
];

export function LanguageSwitcher() {
  const { language, setLanguage, activateGoogleTranslate, isGoogleTranslateActive, deactivateGoogleTranslate } = useLanguage();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex gap-1 p-1 rounded-full bg-card/90 backdrop-blur-lg border border-border/50 shadow-lg">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={`relative flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium transition-all ${
            language === lang.code && !isGoogleTranslateActive
              ? 'text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {language === lang.code && !isGoogleTranslateActive && (
            <motion.div
              layoutId="language-indicator"
              className="absolute inset-0 rounded-full bg-primary"
              transition={{ type: 'spring', duration: 0.3 }}
            />
          )}
          <span className="relative z-10">{lang.label}</span>
        </button>
      ))}
      
      {/* Google Translate button */}
      <button
        onClick={() => {
          if (isGoogleTranslateActive) {
            deactivateGoogleTranslate();
          } else {
            activateGoogleTranslate();
          }
        }}
        className={`relative flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium transition-all ${
          isGoogleTranslateActive
            ? 'text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Translate to any language"
      >
        {isGoogleTranslateActive && (
          <motion.div
            layoutId="language-indicator"
            className="absolute inset-0 rounded-full bg-primary"
            transition={{ type: 'spring', duration: 0.3 }}
          />
        )}
        <span className="relative z-10">
          {isGoogleTranslateActive ? <X className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
        </span>
      </button>
    </div>
  );
}
