import { useRef, useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface PlatformOpenButtonProps {
  url: string;
  platform: string;
}

const platformConfigs: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  spotify: {
    color: '#1DB954', label: 'Open in Spotify',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#1DB954]"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>,
  },
  soundcloud: {
    color: '#FF5500', label: 'Open in SoundCloud',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#FF5500]"><path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.05-.1-.1-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.165 1.308c.014.062.045.094.09.094s.089-.032.099-.094l.226-1.308-.226-1.332c-.01-.06-.044-.094-.09-.094m1.83-1.229c-.063 0-.109.048-.116.109l-.217 2.546.217 2.456c.007.066.053.112.116.112.063 0 .109-.046.12-.112l.244-2.456-.244-2.546c-.011-.064-.057-.109-.12-.109m.862-.086c-.069 0-.12.053-.127.119l-.199 2.632.199 2.492c.007.069.058.122.127.122s.12-.053.131-.122l.222-2.492-.222-2.632c-.011-.066-.062-.119-.131-.119m.882-.141c-.074 0-.131.058-.139.13l-.181 2.773.181 2.523c.008.074.065.133.139.133.074 0 .131-.059.142-.133l.203-2.523-.203-2.773c-.011-.072-.068-.13-.142-.13m.881-.189c-.08 0-.142.063-.15.142l-.163 2.962.163 2.546c.008.08.07.145.15.145.08 0 .142-.065.153-.145l.183-2.546-.183-2.962c-.011-.079-.073-.142-.153-.142m.932-.243c-.063 0-.137.068-.144.153l-.145 3.205.145 2.561c.007.086.081.157.144.157.086 0 .148-.071.159-.157l.163-2.561-.163-3.205c-.011-.085-.073-.153-.159-.153m.88-.085c-.092 0-.161.074-.168.165l-.127 3.29.127 2.563c.007.092.076.168.168.168s.161-.076.172-.168l.142-2.563-.142-3.29c-.011-.091-.08-.165-.172-.165m.93-.128c-.097 0-.172.079-.178.176l-.115 3.418.115 2.563c.006.098.081.18.178.18.097 0 .172-.082.183-.18l.128-2.563-.128-3.418c-.011-.097-.086-.176-.183-.176m.882-.058c-.104 0-.183.085-.189.189l-.098 3.476.098 2.558c.006.104.085.193.189.193.104 0 .183-.089.194-.193l.11-2.558-.11-3.476c-.011-.104-.09-.189-.194-.189m.93-.031c-.109 0-.194.09-.199.199l-.08 3.507.08 2.55c.005.109.09.203.199.203.109 0 .194-.094.205-.203l.09-2.55-.09-3.507c-.011-.109-.096-.199-.205-.199m.93 0c-.115 0-.204.095-.21.21l-.062 3.507.062 2.539c.006.115.095.214.21.214.115 0 .204-.099.215-.214l.07-2.539-.07-3.507c-.011-.115-.1-.21-.215-.21m.93.072c-.12 0-.214.1-.219.219l-.044 3.435.044 2.527c.005.12.099.222.219.222.12 0 .214-.102.225-.222l.049-2.527-.049-3.435c-.011-.119-.105-.219-.225-.219m1.86-2.063c-.06 0-.12.01-.178.029-.12-.891-.96-1.577-1.975-1.577-.27 0-.54.054-.795.158-.105.043-.133.087-.133.17v7.319c0 .087.068.163.155.17h2.926c.96 0 1.74-.78 1.74-1.74s-.78-1.74-1.74-1.74"/></svg>,
  },
  youtube: {
    color: '#FF0000', label: 'Open on YouTube',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#FF0000]"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  },
  'apple-music': {
    color: '#FC3C44', label: 'Open in Apple Music',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#FC3C44]"><path d="M23.994 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043A5.022 5.022 0 0 0 19.7.28C18.96.094 18.202.035 17.44.01c-.108-.005-.216-.008-.324-.01H6.884c-.108.002-.216.005-.324.01-.762.025-1.52.084-2.26.27a5.022 5.022 0 0 0-1.874.611C1.308 1.624.563 2.624.246 3.934a9.23 9.23 0 0 0-.24 2.19C.002 6.232 0 6.34 0 6.45v11.1c0 .11.002.218.006.326a9.23 9.23 0 0 0 .24 2.19c.317 1.31 1.062 2.31 2.18 3.043a5.022 5.022 0 0 0 1.874.611c.74.186 1.498.245 2.26.27.108.005.216.008.324.01h10.232c.108-.002.216-.005.324-.01.762-.025 1.52-.084 2.26-.27a5.022 5.022 0 0 0 1.874-.611c1.118-.733 1.863-1.733 2.18-3.043a9.23 9.23 0 0 0 .24-2.19c.004-.108.006-.216.006-.326V6.45c0-.11-.002-.218-.006-.326zM16.94 17.486c0 .36-.065.713-.192 1.053a2.78 2.78 0 0 1-.575.914 2.666 2.666 0 0 1-.896.637 2.553 2.553 0 0 1-1.086.247c-.38.007-.747-.08-1.086-.257a2.119 2.119 0 0 1-.794-.724c-.207-.32-.32-.693-.33-1.084a2.07 2.07 0 0 1 .257-1.072c.176-.338.424-.63.73-.856.306-.227.656-.38 1.028-.453l1.19-.248a.675.675 0 0 0 .39-.196.493.493 0 0 0 .163-.381V9.29a.386.386 0 0 0-.108-.287.459.459 0 0 0-.282-.138l-5.317 1.14a.429.429 0 0 0-.234.138.386.386 0 0 0-.09.262v7.233c0 .36-.065.713-.192 1.053a2.78 2.78 0 0 1-.575.914 2.666 2.666 0 0 1-.896.637 2.553 2.553 0 0 1-1.086.247 2.44 2.44 0 0 1-1.086-.257 2.119 2.119 0 0 1-.794-.724 2.07 2.07 0 0 1-.33-1.084 2.07 2.07 0 0 1 .257-1.072c.176-.338.424-.63.73-.856.306-.227.656-.38 1.028-.453l1.19-.248a.675.675 0 0 0 .39-.196.493.493 0 0 0 .163-.381V7.07c0-.2.04-.395.116-.578a1.37 1.37 0 0 1 .338-.483 1.67 1.67 0 0 1 .508-.332c.192-.082.4-.13.612-.144l5.85-1.26a.517.517 0 0 1 .262.008.517.517 0 0 1 .23.124.52.52 0 0 1 .152.22c.034.088.05.18.048.273v11.588z"/></svg>,
  },
};

export function PlatformOpenButton({ url, platform }: PlatformOpenButtonProps) {
  const { t } = useLanguage();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [proximity, setProximity] = useState(0); // 0 = far, 1 = at button
  const rafRef = useRef<number | null>(null);

  const cfg = platformConfigs[platform] || {
    color: '#ffffff', label: t('nowPlaying.openLink'),
    icon: <ExternalLink className="w-5 h-5 text-foreground" />,
  };

  // Global cursor tracking — glow follows cursor from anywhere on page
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const rect = btnRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Clamp cursor position to nearest point on button edge
        const nearX = Math.max(rect.left, Math.min(e.clientX, rect.right));
        const nearY = Math.max(rect.top, Math.min(e.clientY, rect.bottom));
        const dist = Math.hypot(e.clientX - nearX, e.clientY - nearY);

        const maxDist = 600;
        const p = Math.max(0, 1 - dist / maxDist);
        setProximity(p);

        // Convert nearest-edge point to percentage within button
        const px = ((nearX - rect.left) / rect.width) * 100;
        const py = ((nearY - rect.top) / rect.height) * 100;
        setGlowPos({ x: px, y: py });
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const edgeGlowOpacity = isHovered ? 0 : proximity * 0.6;
  const edgeGlowSize = 60 + proximity * 80; // 60-140px

  return (
    <div className="w-full py-1">
      <button
        ref={btnRef}
        onClick={() => window.open(url, 'upstar-song-tab', 'noopener,noreferrer')}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative flex items-center justify-center gap-2.5 rounded-lg border backdrop-blur-md transition-all duration-300 py-3 px-5 cursor-pointer w-full overflow-hidden group"
        style={{
          borderColor: isHovered
            ? `${cfg.color}88`
            : proximity > 0.3
              ? `${cfg.color}${Math.round(25 + proximity * 40).toString(16).padStart(2, '0')}`
              : `${cfg.color}25`,
          background: isHovered
            ? `${cfg.color}20`
            : `${cfg.color}08`,
        }}
      >
        {/* Edge glow — tracks cursor from anywhere, hugs the outline */}
        <span
          className="absolute pointer-events-none rounded-lg transition-opacity duration-200"
          style={{
            inset: -2,
            opacity: edgeGlowOpacity,
            background: `radial-gradient(circle ${edgeGlowSize}px at ${glowPos.x}% ${glowPos.y}%, ${cfg.color}50, ${cfg.color}15 40%, transparent 70%)`,
            maskImage: `linear-gradient(#fff, #fff), linear-gradient(#fff, #fff)`,
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            maskClip: 'border-box, content-box',
            WebkitMaskClip: 'border-box, content-box',
            padding: 6,
            borderRadius: 'inherit',
          }}
        />

        {/* Interior hover glow — fills button when hovered */}
        <span
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(circle 300px at ${glowPos.x}% ${glowPos.y}%, ${cfg.color}35, transparent 70%)`,
          }}
        />
        <span
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            opacity: isHovered ? 0.12 : 0,
            background: cfg.color,
          }}
        />

        {/* Content */}
        <span className="relative z-10 shrink-0 group-hover:scale-110 transition-transform duration-200">{cfg.icon}</span>
        <span className="relative z-10 text-sm font-semibold transition-colors duration-200" style={{ color: cfg.color }}>{cfg.label}</span>
        <ExternalLink className="relative z-10 w-3.5 h-3.5 opacity-40 transition-opacity group-hover:opacity-70" style={{ color: cfg.color }} />
      </button>
    </div>
  );
}
