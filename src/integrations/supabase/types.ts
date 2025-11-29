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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          id: string
          user_id: string
          origin: string
          destination: string
          origin_coords: Json | null
          destination_coords: Json | null
          date: string
          time: string
          type: string
          duration: string
          distance: number | null
          fare: number
          status: string
          route_details: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          origin: string
          destination: string
          origin_coords?: Json | null
          destination_coords?: Json | null
          date: string
          time: string
          type: string
          duration: string
          distance?: number | null
          fare?: number
          status?: string
          route_details?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          origin?: string
          destination?: string
          origin_coords?: Json | null
          destination_coords?: Json | null
          date?: string
          time?: string
          type?: string
          duration?: string
          distance?: number | null
          fare?: number
          status?: string
          route_details?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_places: {
        Row: {
          id: string
          user_id: string
          name: string
          address: string
          type: string
          coordinates: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          address: string
          type: string
          coordinates?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          address?: string
          type?: string
          coordinates?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      wallet: {
        Row: {
          id: string
          user_id: string
          balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          balance?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          id: string
          wallet_id: string
          user_id: string
          type: string
          amount: number
          description: string
          reference_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          wallet_id: string
          user_id: string
          type: string
          amount: number
          description: string
          reference_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          wallet_id?: string
          user_id?: string
          type?: string
          amount?: number
          description?: string
          reference_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          id: string
          title: string
          description: string
          code: string
          discount: string
          discount_amount: number | null
          discount_percentage: number | null
          valid_until: string
          type: string
          is_active: boolean
          max_uses: number | null
          current_uses: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          code: string
          discount: string
          discount_amount?: number | null
          discount_percentage?: number | null
          valid_until: string
          type: string
          is_active?: boolean
          max_uses?: number | null
          current_uses?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          code?: string
          discount?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          valid_until?: string
          type?: string
          is_active?: boolean
          max_uses?: number | null
          current_uses?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          notifications: boolean
          email_updates: boolean
          sms_alerts: boolean
          location_tracking: boolean
          dark_mode: boolean
          auto_refresh: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          notifications?: boolean
          email_updates?: boolean
          sms_alerts?: boolean
          location_tracking?: boolean
          dark_mode?: boolean
          auto_refresh?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          notifications?: boolean
          email_updates?: boolean
          sms_alerts?: boolean
          location_tracking?: boolean
          dark_mode?: boolean
          auto_refresh?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          id: string
          user_id: string
          type: string
          last_four: string | null
          card_type: string | null
          expiry_month: number | null
          expiry_year: number | null
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          last_four?: string | null
          card_type?: string | null
          expiry_month?: number | null
          expiry_year?: number | null
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          last_four?: string | null
          card_type?: string | null
          expiry_month?: number | null
          expiry_year?: number | null
          is_default?: boolean
          created_at?: string
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
  public: {
    Enums: {},
  },
} as const
