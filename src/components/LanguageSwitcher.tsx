import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, X, Search } from 'lucide-react';
import { useLanguage, Language } from '@/hooks/useLanguage';

const FLAG_MAP: Record<string, string> = {
  en: 'gb',
  de: 'de',
};

const manualLanguages: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: 'gb' },
  { code: 'de', label: 'Deutsch', flag: 'de' },
];

const POPULAR_LANGUAGES = [
  { code: 'ru', label: 'Русский', flag: 'ru' },
  { code: 'es', label: 'Español', flag: 'es' },
  { code: 'fr', label: 'Français', flag: 'fr' },
  { code: 'pt', label: 'Português', flag: 'br' },
  { code: 'it', label: 'Italiano', flag: 'it' },
  { code: 'ja', label: '日本語', flag: 'jp' },
  { code: 'ko', label: '한국어', flag: 'kr' },
  { code: 'zh-CN', label: '中文', flag: 'cn' },
  { code: 'ar', label: 'العربية', flag: 'sa' },
  { code: 'hi', label: 'हिन्दी', flag: 'in' },
  { code: 'tr', label: 'Türkçe', flag: 'tr' },
  { code: 'pl', label: 'Polski', flag: 'pl' },
  { code: 'nl', label: 'Nederlands', flag: 'nl' },
  { code: 'sv', label: 'Svenska', flag: 'se' },
  { code: 'uk', label: 'Українська', flag: 'ua' },
  { code: 'th', label: 'ไทย', flag: 'th' },
  { code: 'vi', label: 'Tiếng Việt', flag: 'vn' },
  { code: 'id', label: 'Bahasa Indonesia', flag: 'id' },
  { code: 'ro', label: 'Română', flag: 'ro' },
  { code: 'cs', label: 'Čeština', flag: 'cz' },
  { code: 'el', label: 'Ελληνικά', flag: 'gr' },
  { code: 'hu', label: 'Magyar', flag: 'hu' },
  { code: 'da', label: 'Dansk', flag: 'dk' },
  { code: 'fi', label: 'Suomi', flag: 'fi' },
  { code: 'no', label: 'Norsk', flag: 'no' },
  { code: 'bg', label: 'Български', flag: 'bg' },
  { code: 'he', label: 'עברית', flag: 'il' },
  { code: 'ms', label: 'Bahasa Melayu', flag: 'my' },
  { code: 'sk', label: 'Slovenčina', flag: 'sk' },
  { code: 'hr', label: 'Hrvatski', flag: 'hr' },
];

const FlagIcon = ({ countryCode, className = "w-4 h-3" }: { countryCode: string; className?: string }) => (
  <img 
    src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`} 
    alt=""
    className={`object-cover rounded-sm shadow-sm ${className}`}
    loading="lazy"
  />
);

interface LanguageSwitcherProps {
  variant?: 'floating' | 'header';
}

export function LanguageSwitcher({ variant = 'floating' }: LanguageSwitcherProps) {
  const { language, setLanguage, showTranslatePicker, setShowTranslatePicker, translateTo, resetTranslation, isTranslated } = useLanguage();
  const [search, setSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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

  const currentFlagCode = FLAG_MAP[language] || 'gb';

  if (variant === 'header') {
    return (
      <div ref={pickerRef} className="relative">
        {/* Dropdown */}
        <AnimatePresence>
          {showTranslatePicker && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 mt-2 w-56 max-h-72 rounded-lg bg-card border border-border/50 shadow-xl overflow-hidden z-[60]"
            >
              <div className="p-2 border-b border-border/30">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/50 border-none rounded-md outline-none placeholder:text-muted-foreground/50 text-foreground"
                  />
                </div>
              </div>
              <div className="overflow-y-auto max-h-52 p-1">
                {filteredLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      translateTo(lang.code, lang.label);
                      setSearch('');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs text-foreground hover:bg-primary/10 transition-colors text-left"
                  >
                    <span className="text-sm">{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
                {filteredLanguages.length === 0 && (
                  <p className="text-center text-muted-foreground text-xs py-3">No languages found</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header buttons */}
        <div className="flex items-center gap-1">
          {manualLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                if (isTranslated) resetTranslation();
                setLanguage(lang.code);
              }}
              className={`flex items-center justify-center w-7 h-7 rounded-md text-sm transition-all ${
                language === lang.code && !isTranslated
                  ? 'bg-primary/15 ring-1 ring-primary/30'
                  : 'hover:bg-muted/50'
              }`}
              title={lang.label}
            >
              {lang.flag}
            </button>
          ))}
          <button
            onClick={() => setShowTranslatePicker(!showTranslatePicker)}
            className={`flex items-center justify-center w-7 h-7 rounded-md transition-all ${
              isTranslated || showTranslatePicker
                ? 'bg-primary/15 ring-1 ring-primary/30'
                : 'hover:bg-muted/50 text-muted-foreground'
            }`}
            title="More languages"
          >
            {showTranslatePicker ? <X className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    );
  }

  // Floating variant (bottom-right)
  return (
    <div ref={pickerRef} className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {showTranslatePicker && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-14 right-0 w-64 max-h-80 rounded-lg bg-card border border-border/50 shadow-xl overflow-hidden"
          >
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

      <div className="flex gap-1 p-1 rounded-full bg-card/90 backdrop-blur-lg border border-border/50 shadow-lg">
        {manualLanguages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => {
              if (isTranslated) resetTranslation();
              setLanguage(lang.code);
            }}
            className={`relative flex items-center justify-center w-9 h-9 rounded-full text-sm transition-all ${
              language === lang.code && !isTranslated
                ? 'bg-primary/15 ring-1 ring-primary/30'
                : 'hover:bg-muted/50'
            }`}
          >
            {lang.flag}
          </button>
        ))}
        <button
          onClick={() => setShowTranslatePicker(!showTranslatePicker)}
          className={`relative flex items-center justify-center w-9 h-9 rounded-full text-sm transition-all ${
            isTranslated || showTranslatePicker
              ? 'bg-primary/15 ring-1 ring-primary/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
          title="Translate to any language"
        >
          {showTranslatePicker ? <X className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
