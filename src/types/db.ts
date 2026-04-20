export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      interaction_events: {
        Row: {
          action: string
          created_at: string
          id: string
          media_type: string
          metadata: Json
          session_id: string | null
          source: string
          source_watchlist_id: string | null
          tmdb_id: number
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          media_type: string
          metadata?: Json
          session_id?: string | null
          source?: string
          source_watchlist_id?: string | null
          tmdb_id: number
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          media_type?: string
          metadata?: Json
          session_id?: string | null
          source?: string
          source_watchlist_id?: string | null
          tmdb_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interaction_events_source_watchlist_fk"
            columns: ["source_watchlist_id"]
            isOneToOne: false
            referencedRelation: "watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          onboarding_completed: boolean
          taste_tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          onboarding_completed?: boolean
          taste_tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          onboarding_completed?: boolean
          taste_tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recommendation_batches: {
        Row: {
          algorithm_version: string
          created_at: string
          id: string
          seed: number | null
          source: string
          user_id: string
          watchlist_id: string | null
        }
        Insert: {
          algorithm_version?: string
          created_at?: string
          id?: string
          seed?: number | null
          source?: string
          user_id: string
          watchlist_id?: string | null
        }
        Update: {
          algorithm_version?: string
          created_at?: string
          id?: string
          seed?: number | null
          source?: string
          user_id?: string
          watchlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_batches_watchlist_fk"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_items: {
        Row: {
          added_to_watchlist_id: string | null
          batch_id: string
          created_at: string
          feedback: string | null
          id: string
          media_type: string
          metadata: Json
          position: number
          reason: string
          score: number | null
          status: string
          tmdb_id: number
          user_id: string
          watchlist_id: string | null
        }
        Insert: {
          added_to_watchlist_id?: string | null
          batch_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          media_type: string
          metadata?: Json
          position?: number
          reason: string
          score?: number | null
          status?: string
          tmdb_id: number
          user_id: string
          watchlist_id?: string | null
        }
        Update: {
          added_to_watchlist_id?: string | null
          batch_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          media_type?: string
          metadata?: Json
          position?: number
          reason?: string
          score?: number | null
          status?: string
          tmdb_id?: number
          user_id?: string
          watchlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_items_added_to_watchlist_fk"
            columns: ["added_to_watchlist_id"]
            isOneToOne: false
            referencedRelation: "watchlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_items_batch_user_fk"
            columns: ["batch_id", "user_id"]
            isOneToOne: false
            referencedRelation: "recommendation_batches"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "recommendation_items_watchlist_fk"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist_items: {
        Row: {
          added_at: string
          added_from: string
          id: string
          media_type: string
          metadata: Json
          note: string
          tmdb_id: number
          user_id: string
          watchlist_id: string
        }
        Insert: {
          added_at?: string
          added_from?: string
          id?: string
          media_type: string
          metadata?: Json
          note?: string
          tmdb_id: number
          user_id: string
          watchlist_id: string
        }
        Update: {
          added_at?: string
          added_from?: string
          id?: string
          media_type?: string
          metadata?: Json
          note?: string
          tmdb_id?: number
          user_id?: string
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_items_watchlist_user_fkey"
            columns: ["watchlist_id", "user_id"]
            isOneToOne: false
            referencedRelation: "watchlists"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      watchlists: {
        Row: {
          accent: string
          aesthetic: string
          created_at: string
          default_type: string | null
          description: string
          emoji: string
          genre_focus: string[]
          id: string
          is_default: boolean
          layout_size: string
          mood: string
          name: string
          slug: string
          updated_at: string
          user_id: string
          vibe_summary: string
        }
        Insert: {
          accent?: string
          aesthetic?: string
          created_at?: string
          default_type?: string | null
          description?: string
          emoji?: string
          genre_focus?: string[]
          id?: string
          is_default?: boolean
          layout_size?: string
          mood?: string
          name: string
          slug: string
          updated_at?: string
          user_id: string
          vibe_summary?: string
        }
        Update: {
          accent?: string
          aesthetic?: string
          created_at?: string
          default_type?: string | null
          description?: string
          emoji?: string
          genre_focus?: string[]
          id?: string
          is_default?: boolean
          layout_size?: string
          mood?: string
          name?: string
          slug?: string
          updated_at?: string
          user_id?: string
          vibe_summary?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

