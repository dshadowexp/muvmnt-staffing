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
      billing_accounts: {
        Row: {
          created_at: string
          default_payment_method_id: string | null
          id: string
          stripe_current_period_end: string | null
          stripe_customer_id: string
          stripe_price_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          default_payment_method_id?: string | null
          id?: string
          stripe_current_period_end?: string | null
          stripe_customer_id: string
          stripe_price_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          default_payment_method_id?: string | null
          id?: string
          stripe_current_period_end?: string | null
          stripe_customer_id?: string
          stripe_price_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          created_at: string
          file_url: string
          id: number
          is_verified: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: number
          is_verified?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: number
          is_verified?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string
          address_line_1: string | null
          address_line_2: string | null
          admin_area: string | null
          cell_id: string
          city: string | null
          country_code: string | null
          created_at: string
          id: string
          lat: number
          lng: number
          postal_code: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address: string
          address_line_1?: string | null
          address_line_2?: string | null
          admin_area?: string | null
          cell_id: string
          city?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          lat: number
          lng: number
          postal_code?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string
          address_line_1?: string | null
          address_line_2?: string | null
          admin_area?: string | null
          cell_id?: string
          city?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          postal_code?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean
          steps: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean
          steps?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean
          steps?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboariding_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_accounts: {
        Row: {
          charges_enabled: boolean
          created_at: string
          details_submitted: boolean
          id: string
          payouts_enabled: boolean
          stripe_account_id: string
          user_id: string
        }
        Insert: {
          charges_enabled?: boolean
          created_at?: string
          details_submitted?: boolean
          id?: string
          payouts_enabled?: boolean
          stripe_account_id: string
          user_id: string
        }
        Update: {
          charges_enabled?: boolean
          created_at?: string
          details_submitted?: boolean
          id?: string
          payouts_enabled?: boolean
          stripe_account_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_requests: {
        Row: {
          cell_id: string
          client_id: string
          created_at: string
          end_date: string | null
          end_time: string
          hourly_rate: number | null
          id: string
          notes: string | null
          positions: number
          profession: string
          requirements: string[]
          start_date: string
          start_time: string
          tasks: string[]
          update_at: string
        }
        Insert: {
          cell_id: string
          client_id: string
          created_at?: string
          end_date?: string | null
          end_time: string
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          positions?: number
          profession: string
          requirements?: string[]
          start_date: string
          start_time: string
          tasks?: string[]
          update_at?: string
        }
        Update: {
          cell_id?: string
          client_id?: string
          created_at?: string
          end_date?: string | null
          end_time?: string
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          positions?: number
          profession?: string
          requirements?: string[]
          start_date?: string
          start_time?: string
          tasks?: string[]
          update_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_infos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_id: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          is_email_verified: boolean
          is_phone_verified: boolean
          phone_number: string | null
          plan: string
          push_token: string | null
          role: string | null
        }
        Insert: {
          auth_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_email_verified?: boolean
          is_phone_verified?: boolean
          phone_number?: string | null
          plan?: string
          push_token?: string | null
          role?: string | null
        }
        Update: {
          auth_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_email_verified?: boolean
          is_phone_verified?: boolean
          phone_number?: string | null
          plan?: string
          push_token?: string | null
          role?: string | null
        }
        Relationships: []
      }
      work_authorizations: {
        Row: {
          created_at: string
          file_url: string
          id: number
          is_verified: boolean
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: number
          is_verified?: boolean
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: number
          is_verified?: boolean
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_authorization_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          created_at: string
          date_of_birth: string
          first_name: string
          gender: string
          id: string
          last_name: string
          photo_url: string | null
          profession: string
          status: string | null
          user_id: string
          years_exp: number
        }
        Insert: {
          created_at?: string
          date_of_birth: string
          first_name: string
          gender?: string
          id?: string
          last_name: string
          photo_url?: string | null
          profession: string
          status?: string | null
          user_id: string
          years_exp: number
        }
        Update: {
          created_at?: string
          date_of_birth?: string
          first_name?: string
          gender?: string
          id?: string
          last_name?: string
          photo_url?: string | null
          profession?: string
          status?: string | null
          user_id?: string
          years_exp?: number
        }
        Relationships: [
          {
            foreignKeyName: "workers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
