export type StreamerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface Streamer {
  id: string;
  user_id: string;
  slug: string;
  display_name: string;
  email: string;
  
  // Profile info
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  
  // Social links
  twitch_url?: string;
  youtube_url?: string;
  tiktok_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  
  // Customization - Text
  hero_title: string;
  hero_subtitle: string;
  welcome_message?: string;
  
  // Customization - Colors (HSL format)
  primary_color: string;
  accent_color: string;
  background_style: string;
  
  // Customization - Layout
  show_how_it_works: boolean;
  show_stream_embed: boolean;
  custom_css?: string;
  
  // Status & timestamps
  status: StreamerStatus;
  is_live: boolean;
  application_message?: string;
  rejection_reason?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface StreamerApplication {
  id: string;
  email: string;
  display_name: string;
  desired_slug: string;
  twitch_url?: string;
  youtube_url?: string;
  application_message?: string;
  status: StreamerStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface StreamerContextType {
  streamer: Streamer | null;
  isLoading: boolean;
  error: string | null;
}
