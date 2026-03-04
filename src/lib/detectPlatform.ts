export interface SocialLink {
  url: string;
  platform: string;
}

const PLATFORM_PATTERNS: Array<{ pattern: RegExp; platform: string }> = [
  { pattern: /twitch\.tv/i, platform: 'twitch' },
  { pattern: /youtube\.com|youtu\.be/i, platform: 'youtube' },
  { pattern: /tiktok\.com/i, platform: 'tiktok' },
  { pattern: /instagram\.com/i, platform: 'instagram' },
  { pattern: /twitter\.com|x\.com/i, platform: 'twitter' },
  { pattern: /spotify\.com/i, platform: 'spotify' },
  { pattern: /soundcloud\.com/i, platform: 'soundcloud' },
];

export function detectPlatform(url: string): string {
  for (const { pattern, platform } of PLATFORM_PATTERNS) {
    if (pattern.test(url)) return platform;
  }
  return 'link';
}

export function migrateLegacySocials(
  value: unknown,
  streamer?: { twitch_url?: string | null; youtube_url?: string | null; tiktok_url?: string | null; instagram_url?: string | null; twitter_url?: string | null }
): SocialLink[] {
  if (!value) return [];
  if (Array.isArray(value) && value.length > 0) {
    // New format: [{url, platform}]
    if (typeof value[0] === 'object' && value[0] !== null && 'url' in value[0]) {
      return value as SocialLink[];
    }
    // Legacy format: ["twitch", "instagram", ...]
    if (typeof value[0] === 'string' && streamer) {
      const urlMap: Record<string, string | null | undefined> = {
        twitch: streamer.twitch_url,
        youtube: streamer.youtube_url,
        tiktok: streamer.tiktok_url,
        instagram: streamer.instagram_url,
        twitter: streamer.twitter_url,
      };
      return (value as string[])
        .filter(key => urlMap[key])
        .map(key => ({ url: urlMap[key]!, platform: key }));
    }
  }
  return [];
}
