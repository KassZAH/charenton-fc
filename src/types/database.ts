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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          changed_by_name: string
          changed_by_player_id: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          restored_at: string | null
          table_name: string
        }
        Insert: {
          action: string
          changed_by_name: string
          changed_by_player_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          restored_at?: string | null
          table_name: string
        }
        Update: {
          action?: string
          changed_by_name?: string
          changed_by_player_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          restored_at?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_changed_by_player_id_fkey"
            columns: ["changed_by_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      availability: {
        Row: {
          available_seats: number | null
          can_drive: boolean | null
          comment: string | null
          goalkeeper_available: boolean | null
          id: string
          injury_id: string | null
          match_id: string
          needs_ride: boolean | null
          player_id: string
          status: string
          updated_at: string | null
          will_be_late: boolean | null
        }
        Insert: {
          available_seats?: number | null
          can_drive?: boolean | null
          comment?: string | null
          goalkeeper_available?: boolean | null
          id?: string
          injury_id?: string | null
          match_id: string
          needs_ride?: boolean | null
          player_id: string
          status?: string
          updated_at?: string | null
          will_be_late?: boolean | null
        }
        Update: {
          available_seats?: number | null
          can_drive?: boolean | null
          comment?: string | null
          goalkeeper_available?: boolean | null
          id?: string
          injury_id?: string | null
          match_id?: string
          needs_ride?: boolean | null
          player_id?: string
          status?: string
          updated_at?: string | null
          will_be_late?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_injury_id_fkey"
            columns: ["injury_id"]
            isOneToOne: false
            referencedRelation: "injuries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      awards: {
        Row: {
          created_at: string | null
          emoji: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          card_type: string
          comment: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          match_id: string
          minute: number | null
          player_id: string | null
        }
        Insert: {
          card_type: string
          comment?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          match_id: string
          minute?: number | null
          player_id?: string | null
        }
        Update: {
          card_type?: string
          comment?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          match_id?: string
          minute?: number | null
          player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      dues: {
        Row: {
          amount_due: number
          amount_paid: number
          created_at: string
          id: string
          player_id: string
          season_id: string
          updated_at: string
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          id?: string
          player_id: string
          season_id: string
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          id?: string
          player_id?: string
          season_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dues_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dues_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          assist_player_id: string | null
          created_at: string | null
          credited_to: string
          deleted_at: string | null
          goal_type: string | null
          id: string
          is_unknown_scorer: boolean | null
          match_id: string
          minute: number | null
          scorer_player_id: string | null
        }
        Insert: {
          assist_player_id?: string | null
          created_at?: string | null
          credited_to?: string
          deleted_at?: string | null
          goal_type?: string | null
          id?: string
          is_unknown_scorer?: boolean | null
          match_id: string
          minute?: number | null
          scorer_player_id?: string | null
        }
        Update: {
          assist_player_id?: string | null
          created_at?: string | null
          credited_to?: string
          deleted_at?: string | null
          goal_type?: string | null
          id?: string
          is_unknown_scorer?: boolean | null
          match_id?: string
          minute?: number | null
          scorer_player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_assist_player_id_fkey"
            columns: ["assist_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_scorer_player_id_fkey"
            columns: ["scorer_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      injuries: {
        Row: {
          actual_return_date: string | null
          comment: string | null
          comment_visibility: string
          created_at: string
          estimated_return_date: string | null
          id: string
          player_id: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          actual_return_date?: string | null
          comment?: string | null
          comment_visibility?: string
          created_at?: string
          estimated_return_date?: string | null
          id?: string
          player_id: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          actual_return_date?: string | null
          comment?: string | null
          comment_visibility?: string
          created_at?: string
          estimated_return_date?: string | null
          id?: string
          player_id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "injuries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      match_awards: {
        Row: {
          assigned_directly: boolean | null
          award_id: string
          created_at: string | null
          id: string
          match_id: string
          player_id: string | null
        }
        Insert: {
          assigned_directly?: boolean | null
          award_id: string
          created_at?: string | null
          id?: string
          match_id: string
          player_id?: string | null
        }
        Update: {
          assigned_directly?: boolean | null
          award_id?: string
          created_at?: string | null
          id?: string
          match_id?: string
          player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_awards_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_awards_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_awards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      match_equipment_items: {
        Row: {
          assigned_player_id: string | null
          brought: boolean
          created_at: string
          id: string
          label: string
          match_id: string
        }
        Insert: {
          assigned_player_id?: string | null
          brought?: boolean
          created_at?: string
          id?: string
          label: string
          match_id: string
        }
        Update: {
          assigned_player_id?: string | null
          brought?: boolean
          created_at?: string
          id?: string
          label?: string
          match_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_equipment_items_assigned_player_id_fkey"
            columns: ["assigned_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_equipment_items_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_lineups: {
        Row: {
          formation: string
          id: string
          match_id: string
          positions: Json
          updated_at: string
        }
        Insert: {
          formation: string
          id?: string
          match_id: string
          positions?: Json
          updated_at?: string
        }
        Update: {
          formation?: string
          id?: string
          match_id?: string
          positions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_lineups_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players: {
        Row: {
          created_at: string | null
          goalkeeper: boolean
          guest_name: string | null
          id: string
          match_id: string
          player_id: string | null
          was_present: boolean
        }
        Insert: {
          created_at?: string | null
          goalkeeper?: boolean
          guest_name?: string | null
          id?: string
          match_id: string
          player_id?: string | null
          was_present?: boolean
        }
        Update: {
          created_at?: string | null
          goalkeeper?: boolean
          guest_name?: string | null
          id?: string
          match_id?: string
          player_id?: string | null
          was_present?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          address: string | null
          captain_player_id: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          home_or_away: string | null
          id: string
          kickoff_time: string | null
          location: string | null
          maps_url: string | null
          match_date: string
          match_type: string | null
          meeting_time: string | null
          opponent_id: string | null
          opponent_score: number | null
          season_id: string | null
          shirt: string | null
          status: string
          team_score: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          captain_player_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          home_or_away?: string | null
          id?: string
          kickoff_time?: string | null
          location?: string | null
          maps_url?: string | null
          match_date: string
          match_type?: string | null
          meeting_time?: string | null
          opponent_id?: string | null
          opponent_score?: number | null
          season_id?: string | null
          shirt?: string | null
          status?: string
          team_score?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          captain_player_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          home_or_away?: string | null
          id?: string
          kickoff_time?: string | null
          location?: string | null
          maps_url?: string | null
          match_date?: string
          match_type?: string | null
          meeting_time?: string | null
          opponent_id?: string | null
          opponent_score?: number | null
          season_id?: string | null
          shirt?: string | null
          status?: string
          team_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_captain_player_id_fkey"
            columns: ["captain_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "opponents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      opponents: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      player_badges: {
        Row: {
          badge_key: string
          earned_at: string
          id: string
          match_id: string | null
          player_id: string
        }
        Insert: {
          badge_key: string
          earned_at?: string
          id?: string
          match_id?: string | null
          player_id: string
        }
        Update: {
          badge_key?: string
          earned_at?: string
          id?: string
          match_id?: string | null
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_badges_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_badges_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_measurements: {
        Row: {
          height_cm: number | null
          id: string
          player_id: string
          recorded_at: string
          weight_kg: number | null
        }
        Insert: {
          height_cm?: number | null
          id?: string
          player_id: string
          recorded_at?: string
          weight_kg?: number | null
        }
        Update: {
          height_cm?: number | null
          id?: string
          player_id?: string
          recorded_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_measurements_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          archived_at: string | null
          calendar_token: string
          created_at: string | null
          first_name: string
          id: string
          is_guest: boolean
          last_name: string | null
          nickname: string | null
          pin_hash: string | null
          primary_position: string | null
          quote: string | null
          role: string
          share_measurements: boolean
          shirt_number: number | null
          status: string
          strong_foot: string | null
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          calendar_token?: string
          created_at?: string | null
          first_name: string
          id?: string
          is_guest?: boolean
          last_name?: string | null
          nickname?: string | null
          pin_hash?: string | null
          primary_position?: string | null
          quote?: string | null
          role?: string
          share_measurements?: boolean
          shirt_number?: number | null
          status?: string
          strong_foot?: string | null
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          calendar_token?: string
          created_at?: string | null
          first_name?: string
          id?: string
          is_guest?: boolean
          last_name?: string | null
          nickname?: string | null
          pin_hash?: string | null
          primary_position?: string | null
          quote?: string | null
          role?: string
          share_measurements?: boolean
          shirt_number?: number | null
          status?: string
          strong_foot?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          start_date: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          start_date?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string | null
        }
        Relationships: []
      }
      team_settings: {
        Row: {
          access_code: string | null
          created_at: string | null
          gold_color: string
          id: number
          name: string
          primary_color: string
          short_name: string
          updated_at: string | null
        }
        Insert: {
          access_code?: string | null
          created_at?: string | null
          gold_color?: string
          id?: number
          name?: string
          primary_color?: string
          short_name?: string
          updated_at?: string | null
        }
        Update: {
          access_code?: string | null
          created_at?: string | null
          gold_color?: string
          id?: number
          name?: string
          primary_color?: string
          short_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      votes: {
        Row: {
          award_id: string
          created_at: string | null
          id: string
          match_id: string
          voted_player_id: string | null
          voter_player_id: string
        }
        Insert: {
          award_id: string
          created_at?: string | null
          id?: string
          match_id: string
          voted_player_id?: string | null
          voter_player_id: string
        }
        Update: {
          award_id?: string
          created_at?: string | null
          id?: string
          match_id?: string
          voted_player_id?: string | null
          voter_player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voted_player_id_fkey"
            columns: ["voted_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voter_player_id_fkey"
            columns: ["voter_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
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
  public: {
    Enums: {},
  },
} as const
