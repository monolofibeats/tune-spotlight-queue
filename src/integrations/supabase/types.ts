export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_streamer_chat: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          sender_id: string
          sender_role: string
          streamer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          sender_id: string
          sender_role: string
          streamer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_id?: string
          sender_role?: string
          streamer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_streamer_chat_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_notifications: {
        Row: {
          created_at: string
          email: string
          id: string
          is_email_sent: boolean
          is_read: boolean
          notification_type: string
          offer_amount_cents: number | null
          submission_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_email_sent?: boolean
          is_read?: boolean
          notification_type: string
          offer_amount_cents?: number | null
          submission_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_email_sent?: boolean
          is_read?: boolean
          notification_type?: string
          offer_amount_cents?: number | null
          submission_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_notifications_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "public_submissions_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_notifications_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_stream_spots: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          price_cents: number
          purchased_at: string | null
          purchased_by: string | null
          session_id: string | null
          spot_number: number
          streamer_id: string | null
          submission_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          price_cents: number
          purchased_at?: string | null
          purchased_by?: string | null
          session_id?: string | null
          spot_number: number
          streamer_id?: string | null
          submission_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          price_cents?: number
          purchased_at?: string | null
          purchased_by?: string | null
          session_id?: string | null
          spot_number?: number
          streamer_id?: string | null
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pre_stream_spots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "stream_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_stream_spots_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_stream_spots_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "public_submissions_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_stream_spots_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_config: {
        Row: {
          config_type: string
          created_at: string
          id: string
          is_active: boolean
          max_amount_cents: number
          min_amount_cents: number
          step_cents: number
          streamer_id: string | null
          updated_at: string
        }
        Insert: {
          config_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_amount_cents?: number
          min_amount_cents?: number
          step_cents?: number
          streamer_id?: string | null
          updated_at?: string
        }
        Update: {
          config_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_amount_cents?: number
          min_amount_cents?: number
          step_cents?: number
          streamer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_config_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_email: string | null
          id: string
          preferred_payment_method: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_email?: string | null
          id?: string
          preferred_payment_method?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_email?: string | null
          id?: string
          preferred_payment_method?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      site_feedback: {
        Row: {
          contact_info: string | null
          created_at: string
          id: string
          message: string
        }
        Insert: {
          contact_info?: string | null
          created_at?: string
          id?: string
          message: string
        }
        Update: {
          contact_info?: string | null
          created_at?: string
          id?: string
          message?: string
        }
        Relationships: []
      }
      special_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string | null
          id: string
          is_active: boolean
          reward: string
          start_time: string
          streamer_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean
          reward: string
          start_time?: string
          streamer_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean
          reward?: string
          start_time?: string
          streamer_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_events_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_clips: {
        Row: {
          clip_url: string | null
          created_at: string
          created_by: string | null
          end_time_seconds: number
          id: string
          is_public: boolean
          recording_id: string
          start_time_seconds: number
          thumbnail_url: string | null
          title: string
          view_count: number
        }
        Insert: {
          clip_url?: string | null
          created_at?: string
          created_by?: string | null
          end_time_seconds: number
          id?: string
          is_public?: boolean
          recording_id: string
          start_time_seconds: number
          thumbnail_url?: string | null
          title: string
          view_count?: number
        }
        Update: {
          clip_url?: string | null
          created_at?: string
          created_by?: string | null
          end_time_seconds?: number
          id?: string
          is_public?: boolean
          recording_id?: string
          start_time_seconds?: number
          thumbnail_url?: string | null
          title?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "stream_clips_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "stream_recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_config: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          stream_type: string
          stream_url: string | null
          streamer_id: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          stream_type?: string
          stream_url?: string | null
          streamer_id?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          stream_type?: string
          stream_url?: string | null
          streamer_id?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stream_config_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_recordings: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          is_public: boolean
          recorded_at: string
          session_id: string | null
          thumbnail_url: string | null
          title: string
          video_url: string
          view_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_public?: boolean
          recorded_at?: string
          session_id?: string | null
          thumbnail_url?: string | null
          title: string
          video_url: string
          view_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_public?: boolean
          recorded_at?: string
          session_id?: string | null
          thumbnail_url?: string | null
          title?: string
          video_url?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "stream_recordings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "stream_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          ended_at: string | null
          id: string
          is_active: boolean
          started_at: string
          streamer_id: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean
          started_at?: string
          streamer_id?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean
          started_at?: string
          streamer_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stream_sessions_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
        ]
      }
      streamer_applications: {
        Row: {
          application_message: string | null
          created_at: string
          desired_slug: string
          display_name: string
          email: string
          id: string
          instagram_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          spotify_url: string | null
          status: Database["public"]["Enums"]["streamer_status"]
          tiktok_url: string | null
          twitch_url: string | null
          twitter_url: string | null
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          application_message?: string | null
          created_at?: string
          desired_slug: string
          display_name: string
          email: string
          id?: string
          instagram_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          spotify_url?: string | null
          status?: Database["public"]["Enums"]["streamer_status"]
          tiktok_url?: string | null
          twitch_url?: string | null
          twitter_url?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          application_message?: string | null
          created_at?: string
          desired_slug?: string
          display_name?: string
          email?: string
          id?: string
          instagram_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          spotify_url?: string | null
          status?: Database["public"]["Enums"]["streamer_status"]
          tiktok_url?: string | null
          twitch_url?: string | null
          twitter_url?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      streamer_content_changes: {
        Row: {
          created_at: string
          field_name: string
          id: string
          is_reviewed: boolean | null
          new_value: string | null
          old_value: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          streamer_id: string
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: string
          is_reviewed?: boolean | null
          new_value?: string | null
          old_value?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          streamer_id: string
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          is_reviewed?: boolean | null
          new_value?: string | null
          old_value?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          streamer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streamer_content_changes_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
        ]
      }
      streamer_form_fields: {
        Row: {
          created_at: string
          field_label: string
          field_name: string
          field_order: number | null
          field_type: string
          id: string
          is_enabled: boolean | null
          is_required: boolean | null
          options: Json | null
          placeholder: string | null
          streamer_id: string
          updated_at: string
          validation_regex: string | null
        }
        Insert: {
          created_at?: string
          field_label: string
          field_name: string
          field_order?: number | null
          field_type?: string
          id?: string
          is_enabled?: boolean | null
          is_required?: boolean | null
          options?: Json | null
          placeholder?: string | null
          streamer_id: string
          updated_at?: string
          validation_regex?: string | null
        }
        Update: {
          created_at?: string
          field_label?: string
          field_name?: string
          field_order?: number | null
          field_type?: string
          id?: string
          is_enabled?: boolean | null
          is_required?: boolean | null
          options?: Json | null
          placeholder?: string | null
          streamer_id?: string
          updated_at?: string
          validation_regex?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "streamer_form_fields_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
        ]
      }
      streamer_presets: {
        Row: {
          created_at: string
          dashboard_layout: Json
          form_template: string | null
          id: string
          is_active: boolean
          name: string
          occasion_type: string
          platform_type: string
          streamer_id: string
          theme_config: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          dashboard_layout?: Json
          form_template?: string | null
          id?: string
          is_active?: boolean
          name?: string
          occasion_type?: string
          platform_type?: string
          streamer_id: string
          theme_config?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          dashboard_layout?: Json
          form_template?: string | null
          id?: string
          is_active?: boolean
          name?: string
          occasion_type?: string
          platform_type?: string
          streamer_id?: string
          theme_config?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "streamer_presets_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
        ]
      }
      streamers: {
        Row: {
          accent_color: string | null
          animation_style: string | null
          application_message: string | null
          approved_at: string | null
          avatar_url: string | null
          background_gradient: string | null
          background_image_url: string | null
          background_style: string | null
          background_type: string | null
          banner_color: string | null
          banner_enabled: boolean | null
          banner_link: string | null
          banner_text: string | null
          banner_url: string | null
          bio: string | null
          button_style: string | null
          card_style: string | null
          created_at: string
          custom_css: string | null
          display_name: string
          email: string
          font_family: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          instagram_url: string | null
          is_live: boolean | null
          page_language: string | null
          primary_color: string | null
          rejection_reason: string | null
          show_how_it_works: boolean | null
          show_stream_embed: boolean | null
          slug: string
          status: Database["public"]["Enums"]["streamer_status"]
          submission_type: string | null
          tiktok_url: string | null
          twitch_url: string | null
          twitter_url: string | null
          updated_at: string
          user_id: string
          welcome_message: string | null
          youtube_url: string | null
        }
        Insert: {
          accent_color?: string | null
          animation_style?: string | null
          application_message?: string | null
          approved_at?: string | null
          avatar_url?: string | null
          background_gradient?: string | null
          background_image_url?: string | null
          background_style?: string | null
          background_type?: string | null
          banner_color?: string | null
          banner_enabled?: boolean | null
          banner_link?: string | null
          banner_text?: string | null
          banner_url?: string | null
          bio?: string | null
          button_style?: string | null
          card_style?: string | null
          created_at?: string
          custom_css?: string | null
          display_name: string
          email: string
          font_family?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          instagram_url?: string | null
          is_live?: boolean | null
          page_language?: string | null
          primary_color?: string | null
          rejection_reason?: string | null
          show_how_it_works?: boolean | null
          show_stream_embed?: boolean | null
          slug: string
          status?: Database["public"]["Enums"]["streamer_status"]
          submission_type?: string | null
          tiktok_url?: string | null
          twitch_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_id: string
          welcome_message?: string | null
          youtube_url?: string | null
        }
        Update: {
          accent_color?: string | null
          animation_style?: string | null
          application_message?: string | null
          approved_at?: string | null
          avatar_url?: string | null
          background_gradient?: string | null
          background_image_url?: string | null
          background_style?: string | null
          background_type?: string | null
          banner_color?: string | null
          banner_enabled?: boolean | null
          banner_link?: string | null
          banner_text?: string | null
          banner_url?: string | null
          bio?: string | null
          button_style?: string | null
          card_style?: string | null
          created_at?: string
          custom_css?: string | null
          display_name?: string
          email?: string
          font_family?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          instagram_url?: string | null
          is_live?: boolean | null
          page_language?: string | null
          primary_color?: string | null
          rejection_reason?: string | null
          show_how_it_works?: boolean | null
          show_stream_embed?: boolean | null
          slug?: string
          status?: Database["public"]["Enums"]["streamer_status"]
          submission_type?: string | null
          tiktok_url?: string | null
          twitch_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_id?: string
          welcome_message?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      submission_bids: {
        Row: {
          bid_amount_cents: number
          created_at: string
          email: string
          id: string
          submission_id: string
          total_paid_cents: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bid_amount_cents?: number
          created_at?: string
          email: string
          id?: string
          submission_id: string
          total_paid_cents?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bid_amount_cents?: number
          created_at?: string
          email?: string
          id?: string
          submission_id?: string
          total_paid_cents?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_bids_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "public_submissions_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_bids_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          amount_paid: number
          artist_name: string
          audio_file_url: string | null
          boost_amount: number
          created_at: string
          email: string | null
          feedback: string | null
          id: string
          is_priority: boolean
          message: string | null
          platform: string
          song_title: string
          song_url: string
          status: string
          streamer_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_paid?: number
          artist_name?: string
          audio_file_url?: string | null
          boost_amount?: number
          created_at?: string
          email?: string | null
          feedback?: string | null
          id?: string
          is_priority?: boolean
          message?: string | null
          platform: string
          song_title?: string
          song_url: string
          status?: string
          streamer_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_paid?: number
          artist_name?: string
          audio_file_url?: string | null
          boost_amount?: number
          created_at?: string
          email?: string | null
          feedback?: string | null
          id?: string
          is_priority?: boolean
          message?: string | null
          platform?: string
          song_title?: string
          song_url?: string
          status?: string
          streamer_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_submissions_queue: {
        Row: {
          amount_paid: number | null
          artist_name: string | null
          boost_amount: number | null
          created_at: string | null
          id: string | null
          is_priority: boolean | null
          platform: string | null
          song_title: string | null
          status: string | null
          streamer_id: string | null
        }
        Insert: {
          amount_paid?: number | null
          artist_name?: string | null
          boost_amount?: number | null
          created_at?: string | null
          id?: string | null
          is_priority?: boolean | null
          platform?: string | null
          song_title?: string | null
          status?: string | null
          streamer_id?: string | null
        }
        Update: {
          amount_paid?: number | null
          artist_name?: string | null
          boost_amount?: number | null
          created_at?: string | null
          id?: string | null
          is_priority?: boolean | null
          platform?: string | null
          song_title?: string | null
          status?: string | null
          streamer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "streamer"
      streamer_status: "pending" | "approved" | "rejected" | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "streamer"],
      streamer_status: ["pending", "approved", "rejected", "suspended"],
    },
  },
} as const
