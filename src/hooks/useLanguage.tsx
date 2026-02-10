import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Language = 'en' | 'de';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  showTranslatePicker: boolean;
  setShowTranslatePicker: (show: boolean) => void;
  translateTo: (langCode: string, langLabel?: string) => void;
  resetTranslation: () => void;
  isTranslated: boolean;
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
    
    // Submission Form (new keys)
    'submission.title': 'Show us what you got!',
    'submission.linkLabel': 'Link to your track',
    'submission.linkPlaceholder': 'your music link?',
    'submission.artistLabel': 'Artist',
    'submission.artistPlaceholder': 'Artist Name',
    'submission.titleLabel': 'Title',
    'submission.titlePlaceholder': 'Song Title',
    'submission.emailLabel': 'Email (optional)',
    'submission.emailPlaceholder': 'your@email.com',
    'submission.messageLabel': 'Message (optional)',
    'submission.messagePlaceholder': 'Tell us what\'s special about this track!',
    'submission.audioFileLabel': 'Audio File (optional)',
    'submission.uploadFile': 'Upload File',
    'submission.submitFree': 'Send Track (free)',
    'submission.submitAdminFree': 'Send Track (Admin - free)',
    'submission.skipWaitingList': 'Skip Waiting List',
    
    // Watchlist / Queue
    'queue.title': 'Waiting List',
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
    'dashboard.status.pending': 'Pending',
    'dashboard.status.reviewed': 'Reviewed',
    'dashboard.status.reviewing': 'Reviewing',
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
    
    // Discovery Page
    'discovery.badge': 'Creator Review Platform',
    'discovery.heroTitle': 'From Upload to UpStar?',
    'discovery.heroHighlight': 'Let the Stream decide.',
    'discovery.heroSubtitle': 'We connect creators with streamers (experts) who review content live, unfiltered and on repeat.',
    'discovery.heroJoin': 'Join',
    'discovery.heroThousands': 'thousands of creators',
    'discovery.heroGetting': 'getting',
    'discovery.heroDiscovered': 'discovered',
    'discovery.browseStreamers': 'Browse Streamers',
    'discovery.becomeStreamer': 'Become a Streamer',
    'discovery.becomeStreamerInvite': 'Become a Streamer (Invite Only for Now)',
    'discovery.songsReviewed': 'Submissions Reviewed',
    'discovery.livePerSecond': '+1 every second (live)',
    'discovery.activeStreamers': 'Active Streamers',
    'discovery.liveNow': 'Live Now',
    'discovery.weeklyViews': 'Weekly Views',
    'discovery.sectionStreamers': 'Active Streamers',
    'discovery.sectionStreamersSubtitle': 'Find a streamer to review',
    'discovery.yourWork': 'your work',
    'discovery.allStreamers': 'All Streamers',
    'discovery.loadingStreamers': 'Loading streamers...',
    'discovery.noStreamersYet': 'No streamers yet',
    'discovery.beFirstStreamer': 'Be the first to join as a streamer!',
    'discovery.applyNow': 'Apply Now',
    'discovery.howItWorksTitle': 'How It Works',
    'discovery.howItWorksSubtitle': 'Three simple steps to get your work reviewed',
    'discovery.step1Title': 'Choose a Streamer',
    'discovery.step1Desc': 'Browse our active streamers and find one that matches your niche and style.',
    'discovery.step2Title': 'Submit Your Work',
    'discovery.step2Desc': 'Paste a link or upload a file. Add details and optionally skip the queue.',
    'discovery.step3Title': 'Get Reviewed Live',
    'discovery.step3Desc': 'Watch the stream as your work gets featured and receive real-time feedback.',
    'discovery.forStreamers': 'For Streamers',
    'discovery.streamerFeaturesTitle': 'Built for Underground Creators',
    'discovery.streamerFeaturesSubtitle': 'UpStar gives independent streamers and creators the tools they need to build real communities — no compromises.',
    'discovery.feat1': 'Fully customizable profile & submission page',
    'discovery.feat2': 'Real-time queue management dashboard',
    'discovery.feat3': 'Built-in live stream integration',
    'discovery.feat4': 'Advanced analytics and audience insights',
    'discovery.feat5': 'Custom form fields & submission types',
    'discovery.streamerCTA': 'Interested in monetization? We take less % than other platforms. Contact our sales team for details.',
    'discovery.applyToJoin': 'Apply to Join',
    'discovery.applyDialogTitle': 'Apply to Become a Streamer',
    'discovery.platformHighlightTitle': 'The Creator\'s Platform',
    'discovery.platformHighlightDesc': 'Purpose-built for underground creators and streamers who want full control over their review experience.',
    'discovery.lowestFees': 'Lowest platform fees in the industry — contact sales for details',
    'discovery.rosterTitle': 'All Streamers',
    'discovery.rosterSearch': 'Search streamers...',
    'discovery.noResults': 'No streamers found',
    'discovery.ctaTitle': 'Ready to Get Started?',
    'discovery.ctaSubtitle': 'Whether you\'re a creator looking for feedback or a viewer looking for the next big thing — we\'ve got you.',
    'discovery.ctaSubmit': 'Submit Your Work',
    'discovery.ctaWatch': 'Watch the Next Stream',
    'discovery.ctaReview': 'Review Work',
    'discovery.contactSales': 'Contact Sales',
    'discovery.faqTitle': 'Frequently Asked Questions',
    'discovery.faqSubtitle': 'Everything you need to know about UpStar',
    'discovery.faq1q': 'What is UpStar?',
    'discovery.faq1a': 'UpStar is a platform that connects creators with streamers who review and react to submissions live on stream. Get real-time feedback from content creators and their audiences.',
    'discovery.faq2q': 'How do I submit my work?',
    'discovery.faq2a': "Simply visit a streamer's page, paste your link (Spotify, YouTube, SoundCloud, etc.) or upload a file, and submit. You can optionally pay to skip the queue for priority review.",
    'discovery.faq3q': 'How do streamers join?',
    'discovery.faq3a': 'Streamers join by invitation. If you\'re interested, reach out to us and we\'ll review your profile.',
    'discovery.faq4q': 'Is it free to submit?',
    'discovery.faq4a': "Each streamer sets their own pricing. Some offer free submissions, while others may charge for submissions or priority queue placement. Check each streamer's page for their specific rates.",
    'discovery.faq5q': 'What platforms are supported?',
    'discovery.faq5a': 'We support Spotify, Apple Music, SoundCloud, YouTube, and direct file uploads (up to 100MB). If your content is hosted elsewhere, you can paste any link or upload the file directly.',
    'discovery.contentReviewer': 'Content reviewer',
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
    'hero.title': 'Show us what you',
    'hero.titleHighlight': 'got!',
    'hero.subtitle': 'Schick uns deine Tracks und wir werden sie live im Stream bewerten! Keine Anmeldung erforderlich.',
    
    // How It Works
    'howItWorks.title': "So geht's",
    'howItWorks.subtitle': 'Mach einfach nur diese 3 simplen Schritte:',
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
    
    // Submission Form (new keys)
    'submission.title': 'Schick uns deinen Track!',
    'submission.linkLabel': 'Musiklink',
    'submission.linkPlaceholder': 'dein Musiklink?',
    'submission.artistLabel': 'Künstler',
    'submission.artistPlaceholder': 'Künstler Name',
    'submission.titleLabel': 'Titel',
    'submission.titlePlaceholder': 'Song Titel',
    'submission.emailLabel': 'Email (optional)',
    'submission.emailPlaceholder': 'deine@email.com',
    'submission.messageLabel': 'Bemerkungen (optional)',
    'submission.messagePlaceholder': 'was ist besonders an diesem Track?',
    'submission.audioFileLabel': 'Musik Datei (optional)',
    'submission.uploadFile': 'Datei hochladen',
    'submission.submitFree': 'Abschicken (gratis)',
    'submission.submitAdminFree': 'Abschicken (Admin - gratis)',
    'submission.skipWaitingList': 'Warteliste überspringen',
    
    // Watchlist / Queue
    'queue.title': 'Warteliste',
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
    'dashboard.status.pending': 'Ausstehend',
    'dashboard.status.reviewed': 'Bewertet',
    'dashboard.status.reviewing': 'In Bearbeitung',
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
    
    // Discovery Page
    'discovery.badge': 'Musik-Review Plattform',
    'discovery.heroTitle': 'Lass deine Musik',
    'discovery.heroHighlight': 'live reviewen',
    'discovery.heroSubtitle': 'Schick deine Tracks an Streamer und bekomme Echtzeit-Feedback von Creatorn und ihrem Publikum.',
    'discovery.heroJoin': 'Schließe dich',
    'discovery.heroThousands': 'tausenden Künstlern',
    'discovery.heroGetting': 'an, die',
    'discovery.heroDiscovered': 'entdeckt werden',
    'discovery.browseStreamers': 'Streamer durchsuchen',
    'discovery.becomeStreamer': 'Streamer werden',
    'discovery.songsReviewed': 'Songs Reviewed',
    'discovery.livePerSecond': '+1 jede Sekunde (live)',
    'discovery.activeStreamers': 'Aktive Streamer',
    'discovery.liveNow': 'Jetzt Live',
    'discovery.weeklyViews': 'Wöchentliche Views',
    'discovery.sectionStreamers': 'Aktive Streamer',
    'discovery.sectionStreamersSubtitle': 'Finde einen Streamer für',
    'discovery.yourMusic': 'deine Musik',
    'discovery.allStreamers': 'Alle Streamer',
    'discovery.loadingStreamers': 'Streamer werden geladen...',
    'discovery.noStreamersYet': 'Noch keine Streamer',
    'discovery.beFirstStreamer': 'Sei der Erste, der als Streamer beitritt!',
    'discovery.applyNow': 'Jetzt bewerben',
    'discovery.howItWorksTitle': 'So funktioniert es',
    'discovery.howItWorksSubtitle': 'Drei einfache Schritte um deine Musik reviewen zu lassen',
    'discovery.step1Title': 'Wähle einen Streamer',
    'discovery.step1Desc': 'Durchsuche unsere aktiven Streamer und finde einen, der zu deinem Genre und Stil passt.',
    'discovery.step2Title': 'Track einreichen',
    'discovery.step2Desc': 'Füge deinen Song-Link ein oder lade eine Datei hoch. Füge Details hinzu und überspringe optional die Warteschlange.',
    'discovery.step3Title': 'Live Reviewed werden',
    'discovery.step3Desc': 'Schau den Stream, während deine Musik gespielt wird und erhalte Echtzeit-Feedback.',
    'discovery.forStreamers': 'Für Streamer',
    'discovery.monetizeTitle': 'Monetarisiere deine Musik-Reviews',
    'discovery.monetizeSubtitle': 'Werde UpStar Streamer und erschließe neue Einnahmequellen. Setze deine eigenen Preise, passe deine Seite an und connecte mit',
    'discovery.artistsWorldwide': 'Künstlern weltweit',
    'discovery.feature1': 'Eigene Einreichungspreise festlegen',
    'discovery.feature2': 'Voll anpassbare Profilseite',
    'discovery.feature3': 'Echtzeit-Warteschlangen-Management',
    'discovery.feature4': 'Integrierte Zahlungsabwicklung',
    'discovery.feature5': 'Analytics und Insights',
    'discovery.applyToJoin': 'Jetzt bewerben',
    'discovery.applyDialogTitle': 'Als Streamer bewerben',
    'discovery.avgMonthlyEarnings': 'Durchschnittliche monatliche Einnahmen',
    'discovery.topStreamersEarn': 'Top-Streamer verdienen',
    'discovery.perMonth': '/Monat mit Musik-Reviews',
    'discovery.faqTitle': 'Häufig gestellte Fragen',
    'discovery.faqSubtitle': 'Alles was du über UpStar wissen musst',
    'discovery.faq1q': 'Was ist UpStar?',
    'discovery.faq1a': 'UpStar ist eine Plattform, die Musikkünstler mit Streamern verbindet, die Songs live reviewen und darauf reagieren. Erhalte Echtzeit-Feedback von Content-Creatorn und ihrem Publikum.',
    'discovery.faq2q': 'Wie reiche ich meine Musik ein?',
    'discovery.faq2a': 'Besuche einfach die Seite eines Streamers, füge deinen Song-Link ein (Spotify, YouTube, SoundCloud, etc.) oder lade eine Audio-Datei hoch und sende ab. Du kannst optional zahlen, um die Warteschlange zu überspringen.',
    'discovery.faq3q': 'Wie können Streamer beitreten?',
    'discovery.faq3a': 'Streamer können sich bewerben, indem sie unten auf "Streamer werden" klicken. Bewerbungen werden innerhalb von 24-48 Stunden geprüft. Nach der Genehmigung bekommst du deine eigene anpassbare Seite.',
    'discovery.faq4q': 'Ist das Einreichen von Musik kostenlos?',
    'discovery.faq4a': 'Jeder Streamer legt seine eigenen Preise fest. Manche bieten kostenlose Einreichungen an, andere verlangen Gebühren für Einreichungen oder Prioritätsplätze. Schau auf der Seite jedes Streamers nach seinen spezifischen Preisen.',
    'discovery.faq5q': 'Welche Plattformen werden unterstützt?',
    'discovery.faq5a': 'Wir unterstützen Spotify, Apple Music, SoundCloud, YouTube und direkte Datei-Uploads (bis zu 100MB). Wenn deine Musik woanders gehostet ist, kannst du jeden Link einfügen oder die Datei direkt hochladen.',
    'discovery.musicReviewer': 'Musik-Reviewer',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Cache translations in memory and localStorage
const translationCache: Record<string, Record<string, string>> = {};

function getCachedTranslation(langCode: string): Record<string, string> | null {
  if (translationCache[langCode]) return translationCache[langCode];
  try {
    const cached = localStorage.getItem(`translations_${langCode}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      translationCache[langCode] = parsed;
      return parsed;
    }
  } catch {}
  return null;
}

function setCachedTranslation(langCode: string, data: Record<string, string>) {
  translationCache[langCode] = data;
  try {
    localStorage.setItem(`translations_${langCode}`, JSON.stringify(data));
  } catch {}
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    if (saved === 'ru') return 'de';
    return (saved as Language) || 'de';
  });
  const [showTranslatePicker, setShowTranslatePicker] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [translatedStrings, setTranslatedStrings] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedLangCode, setTranslatedLangCode] = useState('');

  const setLanguage = useCallback((lang: Language) => {
    setIsTranslated(false);
    setTranslatedStrings({});
    setTranslatedLangCode('');
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    setShowTranslatePicker(false);
  }, []);

  const translateTo = useCallback(async (langCode: string, langLabel?: string) => {
    setShowTranslatePicker(false);
    
    // Check cache first
    const cached = getCachedTranslation(langCode);
    if (cached) {
      setTranslatedStrings(cached);
      setIsTranslated(true);
      setTranslatedLangCode(langCode);
      return;
    }

    setIsTranslating(true);
    
    try {
      // Use English strings as the source
      const sourceStrings = translations['en'];
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-ui`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            strings: sourceStrings,
            targetLanguage: langCode,
            targetLanguageLabel: langLabel || langCode,
          }),
        }
      );

      if (!response.ok) throw new Error('Translation failed');
      
      const data = await response.json();
      if (data.translations) {
        setCachedTranslation(langCode, data.translations);
        setTranslatedStrings(data.translations);
        setIsTranslated(true);
        setTranslatedLangCode(langCode);
      }
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const resetTranslation = useCallback(() => {
    setIsTranslated(false);
    setTranslatedStrings({});
    setTranslatedLangCode('');
    setShowTranslatePicker(false);
  }, []);

  const t = useCallback((key: string): string => {
    // If we have AI-translated strings, use those first
    if (isTranslated && translatedStrings[key]) {
      return translatedStrings[key];
    }
    return translations[language]?.[key] || translations['en']?.[key] || key;
  }, [language, isTranslated, translatedStrings]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, showTranslatePicker, setShowTranslatePicker, translateTo, resetTranslation, isTranslated }}>
      {isTranslating && (
        <div className="fixed bottom-20 right-4 z-50 px-4 py-2 rounded-full bg-card/90 backdrop-blur-lg border border-border/50 shadow-lg text-sm text-foreground animate-pulse">
          Translating...
        </div>
      )}
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
