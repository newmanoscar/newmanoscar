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
      day_entries: {
        Row: {
          breakfast: boolean
          created_at: string
          destination: string | null
          dinner: boolean
          end_time: string | null
          entry_date: string
          hours: number
          id: string
          is_arrival: boolean
          is_departure: boolean
          lunch: boolean
          note: string | null
          rate_profile_id: string | null
          receipt_path: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["day_status"]
          travel_country: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          breakfast?: boolean
          created_at?: string
          destination?: string | null
          dinner?: boolean
          end_time?: string | null
          entry_date: string
          hours?: number
          id?: string
          is_arrival?: boolean
          is_departure?: boolean
          lunch?: boolean
          note?: string | null
          rate_profile_id?: string | null
          receipt_path?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["day_status"]
          travel_country?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          breakfast?: boolean
          created_at?: string
          destination?: string | null
          dinner?: boolean
          end_time?: string | null
          entry_date?: string
          hours?: number
          id?: string
          is_arrival?: boolean
          is_departure?: boolean
          lunch?: boolean
          note?: string | null
          rate_profile_id?: string | null
          receipt_path?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["day_status"]
          travel_country?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_entries_rate_profile_id_fkey"
            columns: ["rate_profile_id"]
            isOneToOne: false
            referencedRelation: "rate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          country_code: string
          created_at: string
          display_name: string | null
          id: string
          region_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          country_code?: string
          created_at?: string
          display_name?: string | null
          id: string
          region_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          country_code?: string
          created_at?: string
          display_name?: string | null
          id?: string
          region_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_profiles: {
        Row: {
          breakfast_pct: number
          country_code: string | null
          created_at: string
          dinner_pct: number
          full_day: number
          id: string
          is_default: boolean
          lunch_pct: number
          min_hours: number
          name: string
          partial_day: number
          travel_day: number
          updated_at: string
          user_id: string
        }
        Insert: {
          breakfast_pct?: number
          country_code?: string | null
          created_at?: string
          dinner_pct?: number
          full_day?: number
          id?: string
          is_default?: boolean
          lunch_pct?: number
          min_hours?: number
          name: string
          partial_day?: number
          travel_day?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          breakfast_pct?: number
          country_code?: string | null
          created_at?: string
          dinner_pct?: number
          full_day?: number
          id?: string
          is_default?: boolean
          lunch_pct?: number
          min_hours?: number
          name?: string
          partial_day?: number
          travel_day?: number
          updated_at?: string
          user_id?: string
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
      day_status: "travel" | "vacation" | "holiday" | "sick" | "office" | "off"
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
      day_status: ["travel", "vacation", "holiday", "sick", "office", "off"],
    },
  },
} as const
