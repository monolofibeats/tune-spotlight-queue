import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, X, Search } from 'lucide-react';
import { useLanguage, Language } from '@/hooks/useLanguage';

const manualLanguages: { code: Language; label: string }[] = [
  { code: 'de', label: 'DE' },
  { code: 'en', label: 'EN' },
];

const POPULAR_LANGUAGES = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'sv', label: 'Svenska', flag: '🇸🇪' },
  { code: 'uk', label: 'Українська', flag: '🇺🇦' },
  { code: 'th', label: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ro', label: 'Română', flag: '🇷🇴' },
  { code: 'cs', label: 'Čeština', flag: '🇨🇿' },
  { code: 'el', label: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'hu', label: 'Magyar', flag: '🇭🇺' },
  { code: 'da', label: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', label: 'Suomi', flag: '🇫🇮' },
  { code: 'no', label: 'Norsk', flag: '🇳🇴' },
  { code: 'bg', label: 'Български', flag: '🇧🇬' },
  { code: 'he', label: 'עברית', flag: '🇮🇱' },
  { code: 'ms', label: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'sk', label: 'Slovenčina', flag: '🇸🇰' },
  { code: 'hr', label: 'Hrvatski', flag: '🇭🇷' },
];

export function LanguageSwitcher() {
  const { language, setLanguage, showTranslatePicker, setShowTranslatePicker, translateTo, resetTranslation, isTranslated } = useLanguage();
  const [search, setSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowTranslatePicker(false);
        setSearch('');
      }
    };
    if (showTranslatePicker) {
      document.addEventListener('mousedown', handler);
      setTimeout(() => searchRef.current?.focus(), 100);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [showTranslatePicker, setShowTranslatePicker]);

  const filteredLanguages = POPULAR_LANGUAGES.filter(
    (lang) => lang.label.toLowerCase().includes(search.toLowerCase()) || lang.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={pickerRef} className="fixed bottom-4 right-4 z-50">
      {/* Language picker dropdown */}
      <AnimatePresence>
        {showTranslatePicker && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-14 right-0 w-64 max-h-80 rounded-xl bg-card border border-border/50 shadow-xl backdrop-blur-lg overflow-hidden"
          >
            {/* Search */}
            <div className="p-2 border-b border-border/30">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search language..."
                  className="w-full pl-8 pr-3 py-2 text-sm bg-muted/50 border-none rounded-lg outline-none placeholder:text-muted-foreground/50 text-foreground"
                />
              </div>
            </div>

            {/* Language list */}
            <div className="overflow-y-auto max-h-60 p-1">
              {filteredLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    translateTo(lang.code, lang.label);
                    setSearch('');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-primary/10 transition-colors text-left"
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
              {filteredLanguages.length === 0 && (
                <p className="text-center text-muted-foreground text-xs py-4">No languages found</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Switcher bar */}
      <div className="flex gap-1 p-1 rounded-full bg-card/90 backdrop-blur-lg border border-border/50 shadow-lg">
        {manualLanguages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => {
              if (isTranslated) resetTranslation();
              setLanguage(lang.code);
            }}
            className={`relative flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium transition-all ${
              language === lang.code && !isTranslated
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {language === lang.code && !isTranslated && (
              <motion.div
                layoutId="language-indicator"
                className="absolute inset-0 rounded-full bg-primary"
                transition={{ type: 'spring', duration: 0.3 }}
              />
            )}
            <span className="relative z-10">{lang.label}</span>
          </button>
        ))}

        {/* Globe button for other languages */}
        <button
          onClick={() => setShowTranslatePicker(!showTranslatePicker)}
          className={`relative flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium transition-all ${
            isTranslated || showTranslatePicker
              ? 'text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Translate to any language"
        >
          {(isTranslated || showTranslatePicker) && (
            <motion.div
              layoutId="language-indicator"
              className="absolute inset-0 rounded-full bg-primary"
              transition={{ type: 'spring', duration: 0.3 }}
            />
          )}
          <span className="relative z-10">
            {showTranslatePicker ? <X className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
          </span>
        </button>
      </div>
    </div>
  );
}
