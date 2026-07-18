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
          match_id: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean
          match_id?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean
          match_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "awards_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_artifacts: {
        Row: {
          artifact_type: string
          backup_id: string
          checksum: string | null
          checksum_algorithm: string | null
          created_at: string
          created_by_player_id: string | null
          format_version: number
          id: string
          payload: Json
          row_count: number
          source_cutoff_at: string
        }
        Insert: {
          artifact_type: string
          backup_id: string
          checksum?: string | null
          checksum_algorithm?: string | null
          created_at?: string
          created_by_player_id?: string | null
          format_version: number
          id?: string
          payload: Json
          row_count: number
          source_cutoff_at: string
        }
        Update: {
          artifact_type?: string
          backup_id?: string
          checksum?: string | null
          checksum_algorithm?: string | null
          created_at?: string
          created_by_player_id?: string | null
          format_version?: number
          id?: string
          payload?: Json
          row_count?: number
          source_cutoff_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_artifacts_backup_id_fkey"
            columns: ["backup_id"]
            isOneToOne: false
            referencedRelation: "backups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_artifacts_created_by_player_id_fkey"
            columns: ["created_by_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      backups: {
        Row: {
          active_season_id: string | null
          active_season_name: string | null
          application_commit: string | null
          backup_type: string | null
          checksum: string | null
          checksum_algorithm: string | null
          created_at: string
          created_by_context: string | null
          created_by_player_id: string | null
          database_schema_version: string | null
          exclusion_reasons: Json | null
          format_version: number | null
          id: string
          label: string
          protected: boolean | null
          snapshot: Json
          table_counts: Json
          tables_excluded: string[] | null
          tables_included: string[] | null
          trigger_reason: string
        }
        Insert: {
          active_season_id?: string | null
          active_season_name?: string | null
          application_commit?: string | null
          backup_type?: string | null
          checksum?: string | null
          checksum_algorithm?: string | null
          created_at?: string
          created_by_context?: string | null
          created_by_player_id?: string | null
          database_schema_version?: string | null
          exclusion_reasons?: Json | null
          format_version?: number | null
          id?: string
          label: string
          protected?: boolean | null
          snapshot: Json
          table_counts: Json
          tables_excluded?: string[] | null
          tables_included?: string[] | null
          trigger_reason: string
        }
        Update: {
          active_season_id?: string | null
          active_season_name?: string | null
          application_commit?: string | null
          backup_type?: string | null
          checksum?: string | null
          checksum_algorithm?: string | null
          created_at?: string
          created_by_context?: string | null
          created_by_player_id?: string | null
          database_schema_version?: string | null
          exclusion_reasons?: Json | null
          format_version?: number | null
          id?: string
          label?: string
          protected?: boolean | null
          snapshot?: Json
          table_counts?: Json
          tables_excluded?: string[] | null
          tables_included?: string[] | null
          trigger_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "backups_active_season_id_fkey"
            columns: ["active_season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backups_created_by_player_id_fkey"
            columns: ["created_by_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
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
      club_quotes: {
        Row: {
          author_label: string | null
          created_at: string
          id: string
          player_id: string | null
          quote_text: string
        }
        Insert: {
          author_label?: string | null
          created_at?: string
          id?: string
          player_id?: string | null
          quote_text: string
        }
        Update: {
          author_label?: string | null
          created_at?: string
          id?: string
          player_id?: string | null
          quote_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_quotes_player_id_fkey"
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
      hall_of_fame_entries: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_name: string | null
          id: string
          inducted_at: string
          player_id: string | null
          retired_number: number | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          display_name?: string | null
          id?: string
          inducted_at?: string
          player_id?: string | null
          retired_number?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_name?: string | null
          id?: string
          inducted_at?: string
          player_id?: string | null
          retired_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hall_of_fame_entries_player_id_fkey"
            columns: ["player_id"]
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
      jersey_history_entries: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          season_label: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          season_label: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          season_label?: string
        }
        Relationships: []
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
      monthly_mvp_votes: {
        Row: {
          created_at: string
          id: string
          month: number
          voted_player_id: string
          voter_player_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          voted_player_id: string
          voter_player_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          voted_player_id?: string
          voter_player_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_mvp_votes_voted_player_id_fkey"
            columns: ["voted_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_mvp_votes_voter_player_id_fkey"
            columns: ["voter_player_id"]
            isOneToOne: false
            referencedRelation: "players"
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
      player_goals: {
        Row: {
          achieved: boolean
          achieved_at: string | null
          created_at: string
          description: string | null
          id: string
          player_id: string
          target_date: string | null
          title: string
          visibility: string
        }
        Insert: {
          achieved?: boolean
          achieved_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          player_id: string
          target_date?: string | null
          title: string
          visibility?: string
        }
        Update: {
          achieved?: boolean
          achieved_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          player_id?: string
          target_date?: string | null
          title?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_goals_player_id_fkey"
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
          birthday: string | null
          birthday_visibility: string
          calendar_token: string
          created_at: string | null
          failed_pin_attempts: number
          first_name: string
          id: string
          is_guest: boolean
          last_name: string | null
          locked_until: string | null
          measurements_visibility: string
          nickname: string | null
          photo_url: string | null
          photo_visibility: string
          pin_hash: string | null
          pin_length: number
          primary_position: string | null
          public_profile_enabled: boolean
          public_token: string
          quote: string | null
          role: string
          session_version: number
          shirt_number: number | null
          status: string
          strong_foot: string | null
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          birthday?: string | null
          birthday_visibility?: string
          calendar_token?: string
          created_at?: string | null
          failed_pin_attempts?: number
          first_name: string
          id?: string
          is_guest?: boolean
          last_name?: string | null
          locked_until?: string | null
          measurements_visibility?: string
          nickname?: string | null
          photo_url?: string | null
          photo_visibility?: string
          pin_hash?: string | null
          pin_length: number
          primary_position?: string | null
          public_profile_enabled?: boolean
          public_token?: string
          quote?: string | null
          role?: string
          session_version?: number
          shirt_number?: number | null
          status?: string
          strong_foot?: string | null
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          birthday?: string | null
          birthday_visibility?: string
          calendar_token?: string
          created_at?: string | null
          failed_pin_attempts?: number
          first_name?: string
          id?: string
          is_guest?: boolean
          last_name?: string | null
          locked_until?: string | null
          measurements_visibility?: string
          nickname?: string | null
          photo_url?: string | null
          photo_visibility?: string
          pin_hash?: string | null
          pin_length?: number
          primary_position?: string | null
          public_profile_enabled?: boolean
          public_token?: string
          quote?: string | null
          role?: string
          session_version?: number
          shirt_number?: number | null
          status?: string
          strong_foot?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reinforcement_calls: {
        Row: {
          created_at: string
          created_by_player_id: string | null
          expires_at: string | null
          id: string
          match_id: string
          message: string | null
          position_needed: string
          revoked_at: string | null
          token: string
        }
        Insert: {
          created_at?: string
          created_by_player_id?: string | null
          expires_at?: string | null
          id?: string
          match_id: string
          message?: string | null
          position_needed: string
          revoked_at?: string | null
          token?: string
        }
        Update: {
          created_at?: string
          created_by_player_id?: string | null
          expires_at?: string | null
          id?: string
          match_id?: string
          message?: string | null
          position_needed?: string
          revoked_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "reinforcement_calls_created_by_player_id_fkey"
            columns: ["created_by_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reinforcement_calls_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      season_trophies: {
        Row: {
          awarded_at: string
          category: string
          created_at: string
          description: string | null
          display_name: string | null
          id: string
          player_id: string | null
          season_id: string
        }
        Insert: {
          awarded_at?: string
          category: string
          created_at?: string
          description?: string | null
          display_name?: string | null
          id?: string
          player_id?: string | null
          season_id: string
        }
        Update: {
          awarded_at?: string
          category?: string
          created_at?: string
          description?: string | null
          display_name?: string | null
          id?: string
          player_id?: string | null
          season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_trophies_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_trophies_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean
          is_locked: boolean
          locked_at: string | null
          name: string
          start_date: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          is_locked?: boolean
          locked_at?: string | null
          name: string
          start_date?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          is_locked?: boolean
          locked_at?: string | null
          name?: string
          start_date?: string | null
        }
        Relationships: []
      }
      team_settings: {
        Row: {
          access_code: string | null
          created_at: string | null
          founded_date: string | null
          founding_note: string | null
          gold_color: string
          id: number
          name: string
          owner_player_id: string | null
          primary_color: string
          short_name: string
          updated_at: string | null
        }
        Insert: {
          access_code?: string | null
          created_at?: string | null
          founded_date?: string | null
          founding_note?: string | null
          gold_color?: string
          id?: number
          name?: string
          owner_player_id?: string | null
          primary_color?: string
          short_name?: string
          updated_at?: string | null
        }
        Update: {
          access_code?: string | null
          created_at?: string | null
          founded_date?: string | null
          founding_note?: string | null
          gold_color?: string
          id?: number
          name?: string
          owner_player_id?: string | null
          primary_color?: string
          short_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_settings_owner_player_id_fkey"
            columns: ["owner_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
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
      confirm_match_roster: {
        Args: { p_match_id: string; p_player_ids: string[] }
        Returns: undefined
      }
      create_sensitive_backup_with_audit_artifact: {
        Args: {
          p_active_season_id: string
          p_active_season_name: string
          p_application_commit: string
          p_backup_type: string
          p_created_by_context: string
          p_created_by_player_id: string
          p_database_schema_version: string
          p_label: string
          p_protected: boolean
          p_trigger_reason: string
        }
        Returns: {
          artifact_id: string
          artifact_payload: Json
          artifact_row_count: number
          backup_created_at: string
          backup_id: string
          backup_snapshot: Json
        }[]
      }
      export_audit_log_snapshot: { Args: { p_cutoff: string }; Returns: Json }
      export_backup_snapshot: { Args: never; Returns: Json }
      finalize_sensitive_backup_checksums: {
        Args: {
          p_artifact_checksum: string
          p_backup_checksum: string
          p_backup_id: string
        }
        Returns: {
          artifact_id: string
          backup_id: string
          finalized: boolean
        }[]
      }
      get_latest_applied_migration: { Args: never; Returns: string }
      list_public_base_tables: { Args: never; Returns: string[] }
      transfer_ownership: {
        Args: { p_new_owner_id: string }
        Returns: undefined
      }
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
