import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'de' | 'ru';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header
    'nav.library': 'Library',
    'nav.mySongs': 'My Songs',
    'nav.dashboard': 'Dashboard',
    'nav.signIn': 'Sign In',
    'nav.logout': 'Logout',
    
    // Hero
    'hero.badge.live': "We're Live!",
    'hero.badge.offline': 'Live Music Reviews',
    'hero.title': 'Get Your Music',
    'hero.titleHighlight': 'Heard',
    'hero.subtitle': 'Submit songs for live reviews. No sign-up required.',
    
    // How It Works
    'howItWorks.title': 'How It Works',
    'howItWorks.step1.title': 'Submit',
    'howItWorks.step1.desc': 'Share your song link',
    'howItWorks.step2.title': 'Watch',
    'howItWorks.step2.desc': 'Tune in live',
    'howItWorks.step3.title': 'Feedback',
    'howItWorks.step3.desc': 'Get real reactions',
    
    // Pre-Stream Spots
    'spots.title': 'Pre-Stream Priority Spots',
    'spots.subtitle': 'Guarantee your spot in the next stream',
    'spots.available': 'Available',
    'spots.sold': 'Sold',
    'spots.signInRequired': 'Sign in to purchase',
    'spots.buyNow': 'Buy Now',
    
    // Submission Form
    'form.title': 'Submit Your Song',
    'form.artistName': 'Artist Name',
    'form.songTitle': 'Song Title',
    'form.songUrl': 'Song URL',
    'form.platform': 'Platform',
    'form.message': 'Message (optional)',
    'form.email': 'Email (optional)',
    'form.submit': 'Submit Song',
    'form.priority': 'Priority Review',
    
    // Watchlist
    'watchlist.title': 'Queue',
    'watchlist.empty': 'No songs in queue yet',
    'watchlist.position': 'Position',
    
    // Library
    'library.title': 'Stream Library',
    'library.recordings': 'Past Streams',
    'library.clips': 'Community Clips',
    'library.noRecordings': 'No recordings yet',
    'library.noClips': 'No clips yet',
    'library.createFirst': 'Watch a recording and create the first clip!',
    
    // Recording Viewer
    'viewer.watch': 'Watch',
    'viewer.createClip': 'Create Clip',
    'viewer.clipTitle': 'Clip Title',
    'viewer.startTime': 'Start Time',
    'viewer.endTime': 'End Time',
    'viewer.clipDuration': 'Clip Duration',
    'viewer.saveClip': 'Save Clip',
    'viewer.download': 'Download',
    'viewer.openOriginal': 'Open Original',
    'viewer.share': 'Share',
    'viewer.views': 'views',
    'viewer.signInToSave': 'Sign in to save clips to your account',
    'viewer.watermarkInfo': 'Clips include the Upstar watermark',
    
    // Clip Viewer
    'clipViewer.title': 'Clip',
    'clipViewer.from': 'From',
    'clipViewer.watchFull': 'Watch Full Recording',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.copied': 'Link copied!',
  },
  de: {
    // Header
    'nav.library': 'Bibliothek',
    'nav.mySongs': 'Meine Songs',
    'nav.dashboard': 'Dashboard',
    'nav.signIn': 'Anmelden',
    'nav.logout': 'Abmelden',
    
    // Hero
    'hero.badge.live': 'Wir sind Live!',
    'hero.badge.offline': 'Live-Musikbewertungen',
    'hero.title': 'Lass deine Musik',
    'hero.titleHighlight': 'hören',
    'hero.subtitle': 'Reiche Songs für Live-Bewertungen ein. Keine Anmeldung erforderlich.',
    
    // How It Works
    'howItWorks.title': 'So funktioniert es',
    'howItWorks.step1.title': 'Einreichen',
    'howItWorks.step1.desc': 'Teile deinen Song-Link',
    'howItWorks.step2.title': 'Zuschauen',
    'howItWorks.step2.desc': 'Schalte live ein',
    'howItWorks.step3.title': 'Feedback',
    'howItWorks.step3.desc': 'Echte Reaktionen erhalten',
    
    // Pre-Stream Spots
    'spots.title': 'Pre-Stream Prioritätsplätze',
    'spots.subtitle': 'Sichere dir deinen Platz im nächsten Stream',
    'spots.available': 'Verfügbar',
    'spots.sold': 'Verkauft',
    'spots.signInRequired': 'Zum Kaufen anmelden',
    'spots.buyNow': 'Jetzt kaufen',
    
    // Submission Form
    'form.title': 'Song einreichen',
    'form.artistName': 'Künstlername',
    'form.songTitle': 'Songtitel',
    'form.songUrl': 'Song-URL',
    'form.platform': 'Plattform',
    'form.message': 'Nachricht (optional)',
    'form.email': 'E-Mail (optional)',
    'form.submit': 'Song einreichen',
    'form.priority': 'Prioritäts-Review',
    
    // Watchlist
    'watchlist.title': 'Warteschlange',
    'watchlist.empty': 'Noch keine Songs in der Warteschlange',
    'watchlist.position': 'Position',
    
    // Library
    'library.title': 'Stream-Bibliothek',
    'library.recordings': 'Vergangene Streams',
    'library.clips': 'Community-Clips',
    'library.noRecordings': 'Noch keine Aufnahmen',
    'library.noClips': 'Noch keine Clips',
    'library.createFirst': 'Schau dir eine Aufnahme an und erstelle den ersten Clip!',
    
    // Recording Viewer
    'viewer.watch': 'Ansehen',
    'viewer.createClip': 'Clip erstellen',
    'viewer.clipTitle': 'Clip-Titel',
    'viewer.startTime': 'Startzeit',
    'viewer.endTime': 'Endzeit',
    'viewer.clipDuration': 'Clip-Dauer',
    'viewer.saveClip': 'Clip speichern',
    'viewer.download': 'Herunterladen',
    'viewer.openOriginal': 'Original öffnen',
    'viewer.share': 'Teilen',
    'viewer.views': 'Aufrufe',
    'viewer.signInToSave': 'Melde dich an, um Clips zu speichern',
    'viewer.watermarkInfo': 'Clips enthalten das Upstar-Wasserzeichen',
    
    // Clip Viewer
    'clipViewer.title': 'Clip',
    'clipViewer.from': 'Von',
    'clipViewer.watchFull': 'Vollständige Aufnahme ansehen',
    
    // Common
    'common.loading': 'Laden...',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
    'common.cancel': 'Abbrechen',
    'common.close': 'Schließen',
    'common.copied': 'Link kopiert!',
  },
  ru: {
    // Header
    'nav.library': 'Библиотека',
    'nav.mySongs': 'Мои песни',
    'nav.dashboard': 'Панель',
    'nav.signIn': 'Войти',
    'nav.logout': 'Выйти',
    
    // Hero
    'hero.badge.live': 'Мы в эфире!',
    'hero.badge.offline': 'Живые обзоры музыки',
    'hero.title': 'Пусть вашу музыку',
    'hero.titleHighlight': 'услышат',
    'hero.subtitle': 'Отправляйте песни на живые обзоры. Регистрация не требуется.',
    
    // How It Works
    'howItWorks.title': 'Как это работает',
    'howItWorks.step1.title': 'Отправить',
    'howItWorks.step1.desc': 'Поделитесь ссылкой на песню',
    'howItWorks.step2.title': 'Смотреть',
    'howItWorks.step2.desc': 'Включите прямой эфир',
    'howItWorks.step3.title': 'Отзыв',
    'howItWorks.step3.desc': 'Получите реакции',
    
    // Pre-Stream Spots
    'spots.title': 'Приоритетные места',
    'spots.subtitle': 'Гарантируйте своё место в следующем стриме',
    'spots.available': 'Доступно',
    'spots.sold': 'Продано',
    'spots.signInRequired': 'Войдите для покупки',
    'spots.buyNow': 'Купить',
    
    // Submission Form
    'form.title': 'Отправить песню',
    'form.artistName': 'Имя исполнителя',
    'form.songTitle': 'Название песни',
    'form.songUrl': 'Ссылка на песню',
    'form.platform': 'Платформа',
    'form.message': 'Сообщение (необязательно)',
    'form.email': 'Email (необязательно)',
    'form.submit': 'Отправить песню',
    'form.priority': 'Приоритетный обзор',
    
    // Watchlist
    'watchlist.title': 'Очередь',
    'watchlist.empty': 'В очереди пока нет песен',
    'watchlist.position': 'Позиция',
    
    // Library
    'library.title': 'Библиотека стримов',
    'library.recordings': 'Прошлые стримы',
    'library.clips': 'Клипы сообщества',
    'library.noRecordings': 'Пока нет записей',
    'library.noClips': 'Пока нет клипов',
    'library.createFirst': 'Посмотрите запись и создайте первый клип!',
    
    // Recording Viewer
    'viewer.watch': 'Смотреть',
    'viewer.createClip': 'Создать клип',
    'viewer.clipTitle': 'Название клипа',
    'viewer.startTime': 'Начало',
    'viewer.endTime': 'Конец',
    'viewer.clipDuration': 'Длительность',
    'viewer.saveClip': 'Сохранить клип',
    'viewer.download': 'Скачать',
    'viewer.openOriginal': 'Открыть оригинал',
    'viewer.share': 'Поделиться',
    'viewer.views': 'просмотров',
    'viewer.signInToSave': 'Войдите, чтобы сохранять клипы',
    'viewer.watermarkInfo': 'Клипы содержат водяной знак Upstar',
    
    // Clip Viewer
    'clipViewer.title': 'Клип',
    'clipViewer.from': 'Из',
    'clipViewer.watchFull': 'Смотреть полную запись',
    
    // Common
    'common.loading': 'Загрузка...',
    'common.error': 'Ошибка',
    'common.success': 'Успех',
    'common.cancel': 'Отмена',
    'common.close': 'Закрыть',
    'common.copied': 'Ссылка скопирована!',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
