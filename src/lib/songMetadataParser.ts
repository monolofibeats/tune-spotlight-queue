/**
 * Extracts artist name and song title from various music platform URLs and filenames
 */

interface SongMetadata {
  artistName?: string;
  songTitle?: string;
}

/**
 * Parse Spotify URL to extract track info from the URL path
 * Spotify URLs don't contain metadata in URL, but we can detect the platform
 */
const parseSpotifyUrl = (url: string): SongMetadata => {
  // Spotify URLs are like: https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh
  // We can't extract metadata from URL alone, but we return empty to indicate it's Spotify
  return {};
};

/**
 * Parse SoundCloud URL - often contains artist and track in the path
 * Format: https://soundcloud.com/artist-name/track-title
 */
const parseSoundCloudUrl = (url: string): SongMetadata => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    if (pathParts.length >= 2) {
      // First part is usually the artist, second is the track
      const artistSlug = pathParts[0];
      const trackSlug = pathParts[1];
      
      // Convert slugs to readable names (replace hyphens with spaces, title case)
      const formatSlug = (slug: string) => {
        return slug
          .replace(/-/g, ' ')
          .replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      };
      
      return {
        artistName: formatSlug(artistSlug),
        songTitle: formatSlug(trackSlug),
      };
    }
  } catch (e) {
    // Invalid URL
  }
  return {};
};

/**
 * Parse YouTube URL - try to extract from video title patterns
 * Format varies, but often: Artist - Song Title or Song Title by Artist
 */
const parseYouTubeUrl = (url: string): SongMetadata => {
  // YouTube URLs don't contain metadata in the URL itself
  // Would need API call to fetch video title
  return {};
};

/**
 * Parse Apple Music URL
 * Format: https://music.apple.com/us/album/song-name/1234567890?i=1234567890
 */
const parseAppleMusicUrl = (url: string): SongMetadata => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    // Path is like: /us/album/album-or-song-name/id
    if (pathParts.length >= 3) {
      const songOrAlbumSlug = pathParts[2];
      
      const formatSlug = (slug: string) => {
        return slug
          .replace(/-/g, ' ')
          .replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      };
      
      return {
        songTitle: formatSlug(songOrAlbumSlug),
      };
    }
  } catch (e) {
    // Invalid URL
  }
  return {};
};

/**
 * Parse filename to extract artist and song title
 * Common formats:
 * - Artist - Song Title.mp3
 * - Artist_-_Song_Title.mp3
 * - Song Title (Artist).mp3
 * - Artist - Song Title (feat. Other).mp3
 */
export const parseFilename = (filename: string): SongMetadata => {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  // Try common separator patterns
  const separators = [' - ', ' – ', ' — ', '_-_', ' _ ', '_'];
  
  for (const sep of separators) {
    if (nameWithoutExt.includes(sep)) {
      const parts = nameWithoutExt.split(sep);
      if (parts.length >= 2) {
        const artistName = parts[0].trim().replace(/_/g, ' ');
        // Join remaining parts as song title (in case there are multiple separators)
        let songTitle = parts.slice(1).join(sep).trim().replace(/_/g, ' ');
        
        // Remove common suffixes like (Official Audio), [Lyric Video], etc.
        songTitle = songTitle
          .replace(/\s*\(?(official\s*(audio|video|music\s*video|lyric\s*video)?|lyric\s*video|audio|hq|hd)\)?$/i, '')
          .replace(/\s*\[?(official\s*(audio|video|music\s*video|lyric\s*video)?|lyric\s*video|audio|hq|hd)\]?$/i, '')
          .trim();
        
        return {
          artistName: artistName || undefined,
          songTitle: songTitle || undefined,
        };
      }
    }
  }
  
  // No separator found - use the whole name as song title
  return {
    songTitle: nameWithoutExt.replace(/_/g, ' ').trim() || undefined,
  };
};

/**
 * Parse a music platform URL to extract metadata
 */
export const parseUrlMetadata = (url: string): SongMetadata => {
  if (!url) return {};
  
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('soundcloud.com')) {
    return parseSoundCloudUrl(url);
  }
  
  if (lowerUrl.includes('music.apple.com')) {
    return parseAppleMusicUrl(url);
  }
  
  if (lowerUrl.includes('spotify.com')) {
    return parseSpotifyUrl(url);
  }
  
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return parseYouTubeUrl(url);
  }
  
  return {};
};

/**
 * Detect which platform a URL is from
 */
export const detectPlatformFromUrl = (url: string): string => {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('spotify.com')) return 'Spotify';
  if (lowerUrl.includes('soundcloud.com')) return 'SoundCloud';
  if (lowerUrl.includes('music.apple.com')) return 'Apple Music';
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'YouTube';
  if (lowerUrl.includes('bandcamp.com')) return 'Bandcamp';
  if (lowerUrl.includes('tidal.com')) return 'Tidal';
  if (lowerUrl.includes('deezer.com')) return 'Deezer';
  
  return 'other';
};
