import { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'de' | 'ru';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header & Navigation
    'nav.library': 'Library',
    'nav.mySongs': 'My Songs',
    'nav.dashboard': 'Dashboard',
    'nav.signIn': 'Sign In',
    'nav.logout': 'Logout',
    'nav.liveNow': 'LIVE NOW',
    'nav.offline': 'Offline',
    
    // Hero Section
    'hero.badge.live': "We're Live!",
    'hero.badge.offline': 'Live Music Reviews',
    'hero.title': 'Get Your Music',
    'hero.titleHighlight': 'Heard',
    'hero.subtitle': 'Submit songs for live reviews. No sign-up required.',
    
    // How It Works
    'howItWorks.title': 'How It Works',
    'howItWorks.subtitle': 'Three simple steps to get your music heard',
    'howItWorks.step1.title': 'Drop Your Link',
    'howItWorks.step1.desc': 'Paste a Spotify, SoundCloud, or any music link',
    'howItWorks.step2.title': 'Join the Queue',
    'howItWorks.step2.desc': 'Submit free or pay to skip ahead',
    'howItWorks.step3.title': 'Get Reviewed',
    'howItWorks.step3.desc': 'Watch your song get played live on stream',
    
    // Pre-Stream Spots
    'spots.title': 'Pre-Stream Priority Spots',
    'spots.subtitle': 'Guarantee your spot in the next stream',
    'spots.available': 'Available',
    'spots.sold': 'Sold',
    'spots.signInRequired': 'Sign in to purchase',
    'spots.buyNow': 'Buy Now',
    'spots.spot': 'Spot',
    
    // Submission Form
    'form.title': 'Submit Your Song',
    'form.songLink': 'Song Link',
    'form.songLinkPlaceholder': 'Paste Spotify, SoundCloud, or any link...',
    'form.artistName': 'Artist',
    'form.artistPlaceholder': 'Artist name',
    'form.songTitle': 'Title',
    'form.songTitlePlaceholder': 'Song title',
    'form.email': 'Email (optional)',
    'form.emailPlaceholder': 'your@email.com',
    'form.message': 'Message (optional)',
    'form.messagePlaceholder': 'Why should we check this out?',
    'form.submit': 'Submit (Free)',
    'form.submitting': 'Submitting...',
    'form.skipLine': 'Skip the Line',
    'form.priority': 'Priority Review',
    'form.priorityTitle': 'Skip the Line - Priority Submission',
    'form.priorityDesc': 'Get your song reviewed faster by bidding for priority placement. Higher bids = higher position!',
    'form.signInForPriority': 'Sign in to use priority submissions',
    'form.currentHighest': 'Current highest bid',
    'form.yourBid': 'Your Bid',
    'form.processingPayment': 'Processing...',
    'form.proceedPayment': 'Proceed to Payment',
    
    // Watchlist / Queue
    'queue.title': 'Queue',
    'queue.empty': 'No songs yet',
    'queue.beFirst': 'Be the first!',
    'queue.position': 'Position',
    'queue.justNow': 'just now',
    'queue.minutesAgo': 'm ago',
    'queue.hoursAgo': 'h ago',
    
    // Stream
    'stream.live': 'Live Stream',
    'stream.nowReviewing': 'Now reviewing songs!',
    'stream.openIn': 'Open in',
    'stream.tiktokLive': 'TikTok Live',
    'stream.watchOnTiktok': 'Watch the stream on TikTok',
    'stream.liveScreenShare': 'Live Screen Share',
    'stream.screenShare': 'Live Screen Share',
    'stream.adminStreaming': 'Admin is streaming live',
    'stream.connecting': 'Connecting to live stream...',
    'stream.connectionLost': 'Connection lost. The stream may have ended.',
    'stream.watching': 'You\'re watching a live screen share',
    'stream.clickUnmute': 'Click the sound icon to unmute',
    'stream.audioEnabled': 'Audio enabled',
    'stream.refresh': 'Refresh Page',
    'stream.chat.title': 'Live Chat',
    'stream.chat.enterUsername': 'Enter a username to join the chat',
    'stream.chat.usernamePlaceholder': 'Your username...',
    'stream.chat.join': 'Join',
    'stream.chat.empty': 'No messages yet. Be the first to chat!',
    'stream.chat.messagePlaceholder': 'Send a message...',
    
    // Library
    'library.title': 'Stream Library',
    'library.recordings': 'Past Streams',
    'library.clips': 'Community Clips',
    'library.noRecordings': 'No recordings yet',
    'library.noClips': 'No clips yet',
    'library.createFirst': 'Watch a recording and create the first clip!',
    'library.addRecording': 'Add Recording',
    'library.views': 'views',
    'library.watch': 'Watch',
    
    // Recording Viewer
    'viewer.watch': 'Watch',
    'viewer.createClip': 'Create Clip',
    'viewer.clipTitle': 'Clip Title',
    'viewer.clipTitlePlaceholder': 'Give your clip a name...',
    'viewer.startTime': 'Start Time',
    'viewer.endTime': 'End Time',
    'viewer.clipDuration': 'Clip Duration',
    'viewer.maxDuration': 'max 2min',
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
    
    // Soundboard
    'soundboard.title': 'Soundboard',
    'soundboard.effects': 'Sound Effects',
    
    // Special Events
    'events.specialEvent': 'Special Event',
    'events.reward': 'Reward',
    'events.endsAt': 'Ends at',
    
    // Auth
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.forgotPassword': 'Forgot password?',
    'auth.orContinueWith': 'Or continue with',
    'auth.noAccount': "Don't have an account?",
    'auth.haveAccount': 'Already have an account?',
    'auth.signInWithGoogle': 'Sign in with Google',
    'auth.signInWithApple': 'Sign in with Apple',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.copied': 'Link copied!',
    'common.required': 'Required',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Manage submissions, stream settings, and special events.',
    'dashboard.submissions': 'Submissions',
    'dashboard.stream': 'Stream',
    'dashboard.events': 'Events',
    'dashboard.total': 'Total',
    'dashboard.pending': 'Pending',
    'dashboard.reviewed': 'Reviewed',
    'dashboard.revenue': 'Revenue',
    'dashboard.searchPlaceholder': 'Search songs or artists...',
    'dashboard.noSubmissions': 'No submissions found',
    'dashboard.waitingSubmissions': 'Waiting for song submissions...',
    
    // Stream Settings
    'streamSettings.title': 'Homepage Stream Settings',
    'streamSettings.type': 'Stream Type',
    'streamSettings.none': 'None (Hide stream)',
    'streamSettings.twitch': 'Twitch Live',
    'streamSettings.youtube': 'YouTube Live',
    'streamSettings.tiktok': 'TikTok Live',
    'streamSettings.video': 'Looping Video',
    'streamSettings.screenshare': 'Screen Share',
    'streamSettings.url': 'Stream URL',
    'streamSettings.videoUrl': 'Video URL',
    'streamSettings.save': 'Save Stream Settings',
    'streamSettings.saving': 'Saving...',
    
    // Screen Streamer
    'screenshare.title': 'Screen Share Stream',
    'screenshare.subtitle': 'Share your screen directly to viewers',
    'screenshare.start': 'Start Screen Share',
    'screenshare.stop': 'Stop Streaming',
    'screenshare.starting': 'Starting...',
    'screenshare.noActive': 'No active screen share',
    'screenshare.watching': 'watching',
    'screenshare.overlaySettings': 'Overlay Settings',
    'screenshare.showLogo': 'Show Logo',
    'screenshare.showBanner': 'Show Banner',
    'screenshare.bannerPlaceholder': 'Enter banner text...',
    'screenshare.browserPrompt': 'Your browser will ask which screen, window, or tab to share. Viewers will see it live on the homepage.',
    
    // Session Manager
    'session.title': 'Stream Session',
    'session.startStream': 'Start Stream',
    'session.endStream': 'End Stream',
    'session.sessionActive': 'Session Active',
    'session.noActiveSession': 'No Active Session',
    
    // Spots Manager
    'spotsManager.title': 'Pre-Stream Spots',
    'spotsManager.resetAll': 'Reset All Spots',
    'spotsManager.allAvailable': 'All spots available for next stream',
    
    // Footer
    'footer.copyright': '© 2024 UpStar ⭐',
    
    // Toasts & Messages
    'toast.songSubmitted': 'Song submitted! 🎵',
    'toast.songAddedQueue': 'Your song has been added to the watchlist.',
    'toast.paymentSuccess': 'Payment successful! 🎉',
    'toast.paymentCancelled': 'Payment cancelled',
    'toast.submissionNotProcessed': 'Your submission was not processed.',
    'toast.missingInfo': 'Missing information',
    'toast.enterSongLink': 'Please enter a song link.',
    'toast.submissionFailed': 'Submission failed',
    'toast.clipCreated': 'Clip created! ✂️',
    'toast.clipSaved': 'Your clip has been saved to the library',
    'toast.streamStarted': 'Screen share started! 📺',
    'toast.streamLive': 'Your screen is now live on the homepage',
    'toast.streamEnded': 'Stream ended',
    'toast.streamStopped': 'Screen share has stopped',
    'toast.loginRequired': 'Login required',
    'toast.signInForPriority': 'Please sign in to use priority submissions',
  },
  de: {
    // Header & Navigation
    'nav.library': 'Bibliothek',
    'nav.mySongs': 'Meine Songs',
    'nav.dashboard': 'Dashboard',
    'nav.signIn': 'Anmelden',
    'nav.logout': 'Abmelden',
    'nav.liveNow': 'JETZT LIVE',
    'nav.offline': 'Offline',
    
    // Hero Section
    'hero.badge.live': 'Wir sind Live!',
    'hero.badge.offline': 'Live-Musikbewertungen',
    'hero.title': 'Lass deine Musik',
    'hero.titleHighlight': 'hören',
    'hero.subtitle': 'Reiche Songs für Live-Bewertungen ein. Keine Anmeldung erforderlich.',
    
    // How It Works
    'howItWorks.title': 'So funktioniert es',
    'howItWorks.subtitle': 'Drei einfache Schritte, um deine Musik zu präsentieren',
    'howItWorks.step1.title': 'Link einfügen',
    'howItWorks.step1.desc': 'Füge einen Spotify-, SoundCloud- oder beliebigen Musiklink ein',
    'howItWorks.step2.title': 'In Warteschlange',
    'howItWorks.step2.desc': 'Kostenlos einreichen oder zahlen um vorzurücken',
    'howItWorks.step3.title': 'Feedback erhalten',
    'howItWorks.step3.desc': 'Sieh zu, wie dein Song live im Stream gespielt wird',
    
    // Pre-Stream Spots
    'spots.title': 'Pre-Stream Prioritätsplätze',
    'spots.subtitle': 'Sichere dir deinen Platz im nächsten Stream',
    'spots.available': 'Verfügbar',
    'spots.sold': 'Verkauft',
    'spots.signInRequired': 'Zum Kaufen anmelden',
    'spots.buyNow': 'Jetzt kaufen',
    'spots.spot': 'Platz',
    
    // Submission Form
    'form.title': 'Song einreichen',
    'form.songLink': 'Song-Link',
    'form.songLinkPlaceholder': 'Spotify, SoundCloud oder anderen Link einfügen...',
    'form.artistName': 'Künstler',
    'form.artistPlaceholder': 'Künstlername',
    'form.songTitle': 'Titel',
    'form.songTitlePlaceholder': 'Songtitel',
    'form.email': 'E-Mail (optional)',
    'form.emailPlaceholder': 'deine@email.com',
    'form.message': 'Nachricht (optional)',
    'form.messagePlaceholder': 'Warum sollten wir reinhören?',
    'form.submit': 'Einreichen (Kostenlos)',
    'form.submitting': 'Wird eingereicht...',
    'form.skipLine': 'Warteschlange überspringen',
    'form.priority': 'Prioritäts-Review',
    'form.priorityTitle': 'Warteschlange überspringen - Priorität',
    'form.priorityDesc': 'Lass deinen Song schneller reviewen durch ein höheres Gebot. Höher bieten = bessere Position!',
    'form.signInForPriority': 'Für Prioritäts-Einreichungen anmelden',
    'form.currentHighest': 'Aktuell höchstes Gebot',
    'form.yourBid': 'Dein Gebot',
    'form.processingPayment': 'Verarbeitung...',
    'form.proceedPayment': 'Zur Zahlung',
    
    // Watchlist / Queue
    'queue.title': 'Warteschlange',
    'queue.empty': 'Noch keine Songs',
    'queue.beFirst': 'Sei der Erste!',
    'queue.position': 'Position',
    'queue.justNow': 'gerade eben',
    'queue.minutesAgo': ' Min.',
    'queue.hoursAgo': ' Std.',
    
    // Stream
    'stream.live': 'Live-Stream',
    'stream.nowReviewing': 'Jetzt werden Songs bewertet!',
    'stream.openIn': 'Öffnen in',
    'stream.tiktokLive': 'TikTok Live',
    'stream.watchOnTiktok': 'Stream auf TikTok ansehen',
    'stream.liveScreenShare': 'Live-Bildschirmübertragung',
    'stream.screenShare': 'Live-Bildschirmübertragung',
    'stream.adminStreaming': 'Admin streamt live',
    'stream.connecting': 'Verbindung zum Stream...',
    'stream.connectionLost': 'Verbindung verloren. Der Stream wurde möglicherweise beendet.',
    'stream.watching': 'Du siehst eine Live-Bildschirmübertragung',
    'stream.clickUnmute': 'Klicke auf das Lautsprecher-Symbol zum Aktivieren',
    'stream.audioEnabled': 'Audio aktiviert',
    'stream.refresh': 'Seite aktualisieren',
    'stream.chat.title': 'Live-Chat',
    'stream.chat.enterUsername': 'Gib einen Benutzernamen ein, um zu chatten',
    'stream.chat.usernamePlaceholder': 'Dein Benutzername...',
    'stream.chat.join': 'Beitreten',
    'stream.chat.empty': 'Noch keine Nachrichten. Sei der Erste!',
    'stream.chat.messagePlaceholder': 'Nachricht senden...',
    
    // Library
    'library.title': 'Stream-Bibliothek',
    'library.recordings': 'Vergangene Streams',
    'library.clips': 'Community-Clips',
    'library.noRecordings': 'Noch keine Aufnahmen',
    'library.noClips': 'Noch keine Clips',
    'library.createFirst': 'Schau dir eine Aufnahme an und erstelle den ersten Clip!',
    'library.addRecording': 'Aufnahme hinzufügen',
    'library.views': 'Aufrufe',
    'library.watch': 'Ansehen',
    
    // Recording Viewer
    'viewer.watch': 'Ansehen',
    'viewer.createClip': 'Clip erstellen',
    'viewer.clipTitle': 'Clip-Titel',
    'viewer.clipTitlePlaceholder': 'Gib deinem Clip einen Namen...',
    'viewer.startTime': 'Startzeit',
    'viewer.endTime': 'Endzeit',
    'viewer.clipDuration': 'Clip-Dauer',
    'viewer.maxDuration': 'max. 2 Min.',
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
    
    // Soundboard
    'soundboard.title': 'Soundboard',
    'soundboard.effects': 'Soundeffekte',
    
    // Special Events
    'events.specialEvent': 'Sonder-Event',
    'events.reward': 'Belohnung',
    'events.endsAt': 'Endet um',
    
    // Auth
    'auth.signIn': 'Anmelden',
    'auth.signUp': 'Registrieren',
    'auth.email': 'E-Mail',
    'auth.password': 'Passwort',
    'auth.forgotPassword': 'Passwort vergessen?',
    'auth.orContinueWith': 'Oder fortfahren mit',
    'auth.noAccount': 'Noch kein Konto?',
    'auth.haveAccount': 'Bereits ein Konto?',
    'auth.signInWithGoogle': 'Mit Google anmelden',
    'auth.signInWithApple': 'Mit Apple anmelden',
    
    // Common
    'common.loading': 'Laden...',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
    'common.cancel': 'Abbrechen',
    'common.close': 'Schließen',
    'common.save': 'Speichern',
    'common.delete': 'Löschen',
    'common.edit': 'Bearbeiten',
    'common.copied': 'Link kopiert!',
    'common.required': 'Erforderlich',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Verwalte Einreichungen, Stream-Einstellungen und Events.',
    'dashboard.submissions': 'Einreichungen',
    'dashboard.stream': 'Stream',
    'dashboard.events': 'Events',
    'dashboard.total': 'Gesamt',
    'dashboard.pending': 'Ausstehend',
    'dashboard.reviewed': 'Bewertet',
    'dashboard.revenue': 'Einnahmen',
    'dashboard.searchPlaceholder': 'Songs oder Künstler suchen...',
    'dashboard.noSubmissions': 'Keine Einreichungen gefunden',
    'dashboard.waitingSubmissions': 'Warte auf Song-Einreichungen...',
    
    // Stream Settings
    'streamSettings.title': 'Homepage-Stream-Einstellungen',
    'streamSettings.type': 'Stream-Typ',
    'streamSettings.none': 'Keiner (Stream ausblenden)',
    'streamSettings.twitch': 'Twitch Live',
    'streamSettings.youtube': 'YouTube Live',
    'streamSettings.tiktok': 'TikTok Live',
    'streamSettings.video': 'Schleifenvideo',
    'streamSettings.screenshare': 'Bildschirmübertragung',
    'streamSettings.url': 'Stream-URL',
    'streamSettings.videoUrl': 'Video-URL',
    'streamSettings.save': 'Stream-Einstellungen speichern',
    'streamSettings.saving': 'Speichern...',
    
    // Screen Streamer
    'screenshare.title': 'Bildschirmübertragung',
    'screenshare.subtitle': 'Teile deinen Bildschirm direkt mit Zuschauern',
    'screenshare.start': 'Bildschirmübertragung starten',
    'screenshare.stop': 'Streaming beenden',
    'screenshare.starting': 'Starten...',
    'screenshare.noActive': 'Keine aktive Bildschirmübertragung',
    'screenshare.watching': 'schauen zu',
    'screenshare.overlaySettings': 'Overlay-Einstellungen',
    'screenshare.showLogo': 'Logo anzeigen',
    'screenshare.showBanner': 'Banner anzeigen',
    'screenshare.bannerPlaceholder': 'Bannertext eingeben...',
    'screenshare.browserPrompt': 'Dein Browser fragt, welchen Bildschirm du teilen möchtest. Zuschauer sehen ihn live auf der Homepage.',
    
    // Session Manager
    'session.title': 'Stream-Session',
    'session.startStream': 'Stream starten',
    'session.endStream': 'Stream beenden',
    'session.sessionActive': 'Session aktiv',
    'session.noActiveSession': 'Keine aktive Session',
    
    // Spots Manager
    'spotsManager.title': 'Pre-Stream-Plätze',
    'spotsManager.resetAll': 'Alle Plätze zurücksetzen',
    'spotsManager.allAvailable': 'Alle Plätze für den nächsten Stream verfügbar',
    
    // Footer
    'footer.copyright': '© 2024 UpStar ⭐',
    
    // Toasts & Messages
    'toast.songSubmitted': 'Song eingereicht! 🎵',
    'toast.songAddedQueue': 'Dein Song wurde zur Warteschlange hinzugefügt.',
    'toast.paymentSuccess': 'Zahlung erfolgreich! 🎉',
    'toast.paymentCancelled': 'Zahlung abgebrochen',
    'toast.submissionNotProcessed': 'Deine Einreichung wurde nicht verarbeitet.',
    'toast.missingInfo': 'Fehlende Informationen',
    'toast.enterSongLink': 'Bitte gib einen Song-Link ein.',
    'toast.submissionFailed': 'Einreichung fehlgeschlagen',
    'toast.clipCreated': 'Clip erstellt! ✂️',
    'toast.clipSaved': 'Dein Clip wurde in der Bibliothek gespeichert',
    'toast.streamStarted': 'Bildschirmübertragung gestartet! 📺',
    'toast.streamLive': 'Dein Bildschirm ist jetzt live auf der Homepage',
    'toast.streamEnded': 'Stream beendet',
    'toast.streamStopped': 'Bildschirmübertragung wurde beendet',
    'toast.loginRequired': 'Anmeldung erforderlich',
    'toast.signInForPriority': 'Bitte melde dich an für Prioritäts-Einreichungen',
  },
  ru: {
    // Header & Navigation
    'nav.library': 'Библиотека',
    'nav.mySongs': 'Мои песни',
    'nav.dashboard': 'Панель',
    'nav.signIn': 'Войти',
    'nav.logout': 'Выйти',
    'nav.liveNow': 'В ЭФИРЕ',
    'nav.offline': 'Не в сети',
    
    // Hero Section
    'hero.badge.live': 'Мы в эфире!',
    'hero.badge.offline': 'Живые обзоры музыки',
    'hero.title': 'Пусть вашу музыку',
    'hero.titleHighlight': 'услышат',
    'hero.subtitle': 'Отправляйте песни на живые обзоры. Регистрация не требуется.',
    
    // How It Works
    'howItWorks.title': 'Как это работает',
    'howItWorks.subtitle': 'Три простых шага, чтобы вашу музыку услышали',
    'howItWorks.step1.title': 'Вставьте ссылку',
    'howItWorks.step1.desc': 'Вставьте ссылку на Spotify, SoundCloud или другой сервис',
    'howItWorks.step2.title': 'Встаньте в очередь',
    'howItWorks.step2.desc': 'Бесплатно или заплатите, чтобы пройти вперёд',
    'howItWorks.step3.title': 'Получите отзыв',
    'howItWorks.step3.desc': 'Смотрите, как вашу песню играют в прямом эфире',
    
    // Pre-Stream Spots
    'spots.title': 'Приоритетные места',
    'spots.subtitle': 'Гарантируйте своё место в следующем стриме',
    'spots.available': 'Доступно',
    'spots.sold': 'Продано',
    'spots.signInRequired': 'Войдите для покупки',
    'spots.buyNow': 'Купить',
    'spots.spot': 'Место',
    
    // Submission Form
    'form.title': 'Отправить песню',
    'form.songLink': 'Ссылка на песню',
    'form.songLinkPlaceholder': 'Вставьте ссылку на Spotify, SoundCloud или другую...',
    'form.artistName': 'Исполнитель',
    'form.artistPlaceholder': 'Имя исполнителя',
    'form.songTitle': 'Название',
    'form.songTitlePlaceholder': 'Название песни',
    'form.email': 'Email (необязательно)',
    'form.emailPlaceholder': 'ваш@email.com',
    'form.message': 'Сообщение (необязательно)',
    'form.messagePlaceholder': 'Почему стоит послушать?',
    'form.submit': 'Отправить (Бесплатно)',
    'form.submitting': 'Отправка...',
    'form.skipLine': 'Пропустить очередь',
    'form.priority': 'Приоритетный обзор',
    'form.priorityTitle': 'Пропустить очередь - Приоритет',
    'form.priorityDesc': 'Получите обзор быстрее, сделав ставку. Выше ставка = выше позиция!',
    'form.signInForPriority': 'Войдите для приоритетных заявок',
    'form.currentHighest': 'Текущая макс. ставка',
    'form.yourBid': 'Ваша ставка',
    'form.processingPayment': 'Обработка...',
    'form.proceedPayment': 'Перейти к оплате',
    
    // Watchlist / Queue
    'queue.title': 'Очередь',
    'queue.empty': 'Пока нет песен',
    'queue.beFirst': 'Будьте первым!',
    'queue.position': 'Позиция',
    'queue.justNow': 'только что',
    'queue.minutesAgo': ' мин. назад',
    'queue.hoursAgo': ' ч. назад',
    
    // Stream
    'stream.live': 'Прямой эфир',
    'stream.nowReviewing': 'Сейчас обзор песен!',
    'stream.openIn': 'Открыть в',
    'stream.tiktokLive': 'TikTok Live',
    'stream.watchOnTiktok': 'Смотреть стрим в TikTok',
    'stream.liveScreenShare': 'Трансляция экрана',
    'stream.screenShare': 'Трансляция экрана',
    'stream.adminStreaming': 'Админ ведёт стрим',
    'stream.connecting': 'Подключение к стриму...',
    'stream.connectionLost': 'Соединение потеряно. Стрим мог закончиться.',
    'stream.watching': 'Вы смотрите трансляцию экрана',
    'stream.clickUnmute': 'Нажмите на иконку звука для включения',
    'stream.audioEnabled': 'Звук включён',
    'stream.refresh': 'Обновить страницу',
    'stream.chat.title': 'Чат',
    'stream.chat.enterUsername': 'Введите имя для чата',
    'stream.chat.usernamePlaceholder': 'Ваше имя...',
    'stream.chat.join': 'Войти',
    'stream.chat.empty': 'Пока нет сообщений. Будьте первым!',
    'stream.chat.messagePlaceholder': 'Написать сообщение...',
    
    // Library
    'library.title': 'Библиотека стримов',
    'library.recordings': 'Прошлые стримы',
    'library.clips': 'Клипы сообщества',
    'library.noRecordings': 'Пока нет записей',
    'library.noClips': 'Пока нет клипов',
    'library.createFirst': 'Посмотрите запись и создайте первый клип!',
    'library.addRecording': 'Добавить запись',
    'library.views': 'просмотров',
    'library.watch': 'Смотреть',
    
    // Recording Viewer
    'viewer.watch': 'Смотреть',
    'viewer.createClip': 'Создать клип',
    'viewer.clipTitle': 'Название клипа',
    'viewer.clipTitlePlaceholder': 'Дайте название клипу...',
    'viewer.startTime': 'Начало',
    'viewer.endTime': 'Конец',
    'viewer.clipDuration': 'Длительность',
    'viewer.maxDuration': 'макс. 2 мин.',
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
    
    // Soundboard
    'soundboard.title': 'Саундборд',
    'soundboard.effects': 'Звуковые эффекты',
    
    // Special Events
    'events.specialEvent': 'Спецсобытие',
    'events.reward': 'Награда',
    'events.endsAt': 'Заканчивается в',
    
    // Auth
    'auth.signIn': 'Войти',
    'auth.signUp': 'Регистрация',
    'auth.email': 'Email',
    'auth.password': 'Пароль',
    'auth.forgotPassword': 'Забыли пароль?',
    'auth.orContinueWith': 'Или продолжить с',
    'auth.noAccount': 'Нет аккаунта?',
    'auth.haveAccount': 'Уже есть аккаунт?',
    'auth.signInWithGoogle': 'Войти через Google',
    'auth.signInWithApple': 'Войти через Apple',
    
    // Common
    'common.loading': 'Загрузка...',
    'common.error': 'Ошибка',
    'common.success': 'Успех',
    'common.cancel': 'Отмена',
    'common.close': 'Закрыть',
    'common.save': 'Сохранить',
    'common.delete': 'Удалить',
    'common.edit': 'Изменить',
    'common.copied': 'Ссылка скопирована!',
    'common.required': 'Обязательно',
    
    // Dashboard
    'dashboard.title': 'Панель управления',
    'dashboard.subtitle': 'Управление заявками, стримом и событиями.',
    'dashboard.submissions': 'Заявки',
    'dashboard.stream': 'Стрим',
    'dashboard.events': 'События',
    'dashboard.total': 'Всего',
    'dashboard.pending': 'Ожидает',
    'dashboard.reviewed': 'Обзорено',
    'dashboard.revenue': 'Доход',
    'dashboard.searchPlaceholder': 'Поиск песен или исполнителей...',
    'dashboard.noSubmissions': 'Заявок не найдено',
    'dashboard.waitingSubmissions': 'Ожидание заявок...',
    
    // Stream Settings
    'streamSettings.title': 'Настройки стрима на главной',
    'streamSettings.type': 'Тип стрима',
    'streamSettings.none': 'Нет (скрыть стрим)',
    'streamSettings.twitch': 'Twitch Live',
    'streamSettings.youtube': 'YouTube Live',
    'streamSettings.tiktok': 'TikTok Live',
    'streamSettings.video': 'Зацикленное видео',
    'streamSettings.screenshare': 'Трансляция экрана',
    'streamSettings.url': 'URL стрима',
    'streamSettings.videoUrl': 'URL видео',
    'streamSettings.save': 'Сохранить настройки',
    'streamSettings.saving': 'Сохранение...',
    
    // Screen Streamer
    'screenshare.title': 'Трансляция экрана',
    'screenshare.subtitle': 'Транслируйте экран напрямую зрителям',
    'screenshare.start': 'Начать трансляцию',
    'screenshare.stop': 'Остановить стрим',
    'screenshare.starting': 'Запуск...',
    'screenshare.noActive': 'Нет активной трансляции',
    'screenshare.watching': 'смотрят',
    'screenshare.overlaySettings': 'Настройки оверлея',
    'screenshare.showLogo': 'Показать лого',
    'screenshare.showBanner': 'Показать баннер',
    'screenshare.bannerPlaceholder': 'Текст баннера...',
    'screenshare.browserPrompt': 'Браузер спросит, какой экран транслировать. Зрители увидят его на главной.',
    
    // Session Manager
    'session.title': 'Сессия стрима',
    'session.startStream': 'Начать стрим',
    'session.endStream': 'Завершить стрим',
    'session.sessionActive': 'Сессия активна',
    'session.noActiveSession': 'Нет активной сессии',
    
    // Spots Manager
    'spotsManager.title': 'Приоритетные места',
    'spotsManager.resetAll': 'Сбросить все места',
    'spotsManager.allAvailable': 'Все места доступны для след. стрима',
    
    // Footer
    'footer.copyright': '© 2024 UpStar ⭐',
    
    // Toasts & Messages
    'toast.songSubmitted': 'Песня отправлена! 🎵',
    'toast.songAddedQueue': 'Ваша песня добавлена в очередь.',
    'toast.paymentSuccess': 'Оплата успешна! 🎉',
    'toast.paymentCancelled': 'Оплата отменена',
    'toast.submissionNotProcessed': 'Заявка не обработана.',
    'toast.missingInfo': 'Недостаточно данных',
    'toast.enterSongLink': 'Введите ссылку на песню.',
    'toast.submissionFailed': 'Ошибка отправки',
    'toast.clipCreated': 'Клип создан! ✂️',
    'toast.clipSaved': 'Ваш клип сохранён в библиотеке',
    'toast.streamStarted': 'Трансляция началась! 📺',
    'toast.streamLive': 'Ваш экран транслируется на главной',
    'toast.streamEnded': 'Стрим окончен',
    'toast.streamStopped': 'Трансляция остановлена',
    'toast.loginRequired': 'Требуется вход',
    'toast.signInForPriority': 'Войдите для приоритетных заявок',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'de';
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
