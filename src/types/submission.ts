export interface Submission {
  id: string;
  songUrl: string;
  platform: 'spotify' | 'apple-music' | 'soundcloud' | 'youtube' | 'other';
  artistName: string;
  songTitle: string;
  submitterName: string;
  submitterEmail?: string;
  message?: string;
  isPriority: boolean;
  status: 'pending' | 'reviewing' | 'reviewed';
  feedback?: string;
  createdAt: Date;
  queuePosition: number;
}

export interface StreamerProfile {
  name: string;
  avatar?: string;
  bio?: string;
  connectedPlatforms: ConnectedPlatform[];
}

export interface ConnectedPlatform {
  name: 'twitch' | 'youtube' | 'tiktok' | 'instagram' | 'kick';
  username: string;
  connected: boolean;
}
