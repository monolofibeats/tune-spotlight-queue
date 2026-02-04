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
          updated_at?: string
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
          title?: string
        }
        Relationships: []
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
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          stream_type?: string
          stream_url?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          stream_type?: string
          stream_url?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
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
          title: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean
          started_at?: string
          title?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean
          started_at?: string
          title?: string | null
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
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
        }
        Relationships: []
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
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
