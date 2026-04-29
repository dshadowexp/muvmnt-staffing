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
      availability: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          start_time: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_accounts: {
        Row: {
          created_at: string
          facility_id: string
          id: string
          stripe_customer_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          facility_id: string
          id?: string
          stripe_customer_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          facility_id?: string
          id?: string
          stripe_customer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_accounts_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: true
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_periods: {
        Row: {
          created_at: string
          facility_id: string
          id: string
          period_end: string
          period_start: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          facility_id: string
          id?: string
          period_end: string
          period_start: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          facility_id?: string
          id?: string
          period_end?: string
          period_start?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_periods_client_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          approval_window_hours: number
          billing_mode: string
          created_at: string
          id: string
          name: string
          net_terms_days: number
          stripe_customer_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_window_hours?: number
          billing_mode?: string
          created_at?: string
          id?: string
          name: string
          net_terms_days?: number
          stripe_customer_id?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_window_hours?: number
          billing_mode?: string
          created_at?: string
          id?: string
          name?: string
          net_terms_days?: number
          stripe_customer_id?: string | null
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
      compliances: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          is_verified: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          is_verified?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
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
      demo_leads: {
        Row: {
          cal_booking_uid: string | null
          company_name: string
          company_size: string
          country: string
          created_at: string
          email: string
          first_name: string
          id: string
          job_title: string
          last_name: string
          product_interest: string
        }
        Insert: {
          cal_booking_uid?: string | null
          company_name: string
          company_size: string
          country: string
          created_at?: string
          email: string
          first_name: string
          id?: string
          job_title: string
          last_name: string
          product_interest: string
        }
        Update: {
          cal_booking_uid?: string | null
          company_name?: string
          company_size?: string
          country?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          job_title?: string
          last_name?: string
          product_interest?: string
        }
        Relationships: []
      }
      facilities: {
        Row: {
          address: Json | null
          approval_window_hours: number
          billing_mode: string
          created_at: string
          domains: string[] | null
          id: string
          name: string
          net_terms_days: number
          plan: Database["public"]["Enums"]["subscription_plan"]
          stripe_customer_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          address?: Json | null
          approval_window_hours?: number
          billing_mode?: string
          created_at?: string
          domains?: string[] | null
          id?: string
          name: string
          net_terms_days?: number
          plan?: Database["public"]["Enums"]["subscription_plan"]
          stripe_customer_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          address?: Json | null
          approval_window_hours?: number
          billing_mode?: string
          created_at?: string
          domains?: string[] | null
          id?: string
          name?: string
          net_terms_days?: number
          plan?: Database["public"]["Enums"]["subscription_plan"]
          stripe_customer_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      facility_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          facility_id: string
          id: string
          invited_by: string
          permission: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          facility_id: string
          id?: string
          invited_by: string
          permission?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          facility_id?: string
          id?: string
          invited_by?: string
          permission?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_invites_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feedbacks: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          rating: number | null
          role: string
          screenshot_key: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          message: string
          rating?: number | null
          role: string
          screenshot_key?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          rating?: number | null
          role?: string
          screenshot_key?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_verification: {
        Row: {
          created_at: string
          id: string
          session_id: string
          user_id: string
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          user_id: string
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "identity_verification_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          chat_group_id: string | null
          completed_at: string | null
          created_at: string
          duration: string | null
          feedback: Json | null
          hume_chat_id: string | null
          id: string
          language: string | null
          recording_url: string | null
          result: string | null
          reviewed: boolean
          screening_id: string | null
          subject: string
          subject_ref: Json | null
          survey: Json | null
          updated_at: string
          user_id: string
          video_feedback: Json | null
          video_feedback_status: string | null
        }
        Insert: {
          chat_group_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration?: string | null
          feedback?: Json | null
          hume_chat_id?: string | null
          id?: string
          language?: string | null
          recording_url?: string | null
          result?: string | null
          reviewed?: boolean
          screening_id?: string | null
          subject: string
          subject_ref?: Json | null
          survey?: Json | null
          updated_at?: string
          user_id: string
          video_feedback?: Json | null
          video_feedback_status?: string | null
        }
        Update: {
          chat_group_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration?: string | null
          feedback?: Json | null
          hume_chat_id?: string | null
          id?: string
          language?: string | null
          recording_url?: string | null
          result?: string | null
          reviewed?: boolean
          screening_id?: string | null
          subject?: string
          subject_ref?: Json | null
          survey?: Json | null
          updated_at?: string
          user_id?: string
          video_feedback?: Json | null
          video_feedback_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interviews_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screenings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          billing_period_id: string
          client_id: string
          collection_method: string
          created_at: string
          currency: string
          due_date: string | null
          id: string
          period_end: string
          period_start: string
          status: string
          stripe_customer_id: string
          stripe_invoice_id: string
          total_amount_cents: number
          updated_at: string
        }
        Insert: {
          billing_period_id: string
          client_id: string
          collection_method: string
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          period_end: string
          period_start: string
          status?: string
          stripe_customer_id: string
          stripe_invoice_id: string
          total_amount_cents?: number
          updated_at?: string
        }
        Update: {
          billing_period_id?: string
          client_id?: string
          collection_method?: string
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          period_end?: string
          period_start?: string
          status?: string
          stripe_customer_id?: string
          stripe_invoice_id?: string
          total_amount_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_billing_period_id_fkey"
            columns: ["billing_period_id"]
            isOneToOne: false
            referencedRelation: "billing_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
          city: string | null
          country_code: string | null
          created_at: string
          id: string
          instructions: string | null
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
          city?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
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
          city?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
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
      operators: {
        Row: {
          created_at: string
          email: string | null
          facility_id: string | null
          first_name: string | null
          id: string
          invited_by: string | null
          last_name: string | null
          permission: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          facility_id?: string | null
          first_name?: string | null
          id?: string
          invited_by?: string | null
          last_name?: string | null
          permission?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          facility_id?: string | null
          first_name?: string | null
          id?: string
          invited_by?: string | null
          last_name?: string | null
          permission?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operators_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operators_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number | null
          created_at: string
          currency: string
          id: string
          request_id: string
          status: string
          stripe_payment_id: string
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          currency?: string
          id?: string
          request_id: string
          status?: string
          stripe_payment_id: string
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          currency?: string
          id?: string
          request_id?: string
          status?: string
          stripe_payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "staff_requests"
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
      quizzes: {
        Row: {
          answers: Json | null
          completed_at: string | null
          created_at: string
          duration_seconds: number
          generation: Json | null
          id: string
          pass_threshold: number
          passed: boolean | null
          questions: Json
          score: number | null
          skill_id: string
          total_questions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number
          generation?: Json | null
          id?: string
          pass_threshold?: number
          passed?: boolean | null
          questions: Json
          score?: number | null
          skill_id: string
          total_questions: number
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number
          generation?: Json | null
          id?: string
          pass_threshold?: number
          passed?: boolean | null
          questions?: Json
          score?: number | null
          skill_id?: string
          total_questions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizes_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          free_hours: number | null
          id: string
          referred_id: string
          referrer_id: string
          referrer_role: string
          reward_cents: number | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          free_hours?: number | null
          id?: string
          referred_id: string
          referrer_id: string
          referrer_role: string
          reward_cents?: number | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          free_hours?: number | null
          id?: string
          referred_id?: string
          referrer_id?: string
          referrer_role?: string
          reward_cents?: number | null
          status?: string
        }
        Relationships: []
      }
      screening_candidates: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          identity_verification: Json
          invite_id: string | null
          last_name: string | null
          photo_url: string | null
          screening_id: string
          stage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          identity_verification?: Json
          invite_id?: string | null
          last_name?: string | null
          photo_url?: string | null
          screening_id: string
          stage?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          identity_verification?: Json
          invite_id?: string | null
          last_name?: string | null
          photo_url?: string | null
          screening_id?: string
          stage?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_candidates_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "screening_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_candidates_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          revoked_at: string | null
          revoked_by: string | null
          screening_id: string
          sent_at: string | null
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          screening_id: string
          sent_at?: string | null
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          screening_id?: string
          sent_at?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_invites_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_invites_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      screenings: {
        Row: {
          allowed_languages: string[]
          created_at: string
          deadline_days: number
          description: string
          facility_id: string
          id: string
          interview_duration: number
          operator_id: string
          require_identity: boolean
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          allowed_languages?: string[]
          created_at?: string
          deadline_days?: number
          description: string
          facility_id: string
          id?: string
          interview_duration?: number
          operator_id: string
          require_identity?: boolean
          status: string
          title: string
          updated_at?: string
        }
        Update: {
          allowed_languages?: string[]
          created_at?: string
          deadline_days?: number
          description?: string
          facility_id?: string
          id?: string
          interview_duration?: number
          operator_id?: string
          require_identity?: boolean
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "screenings_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_ratings: {
        Row: {
          client_user_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          shift_id: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          client_user_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          shift_id: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          client_user_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          shift_id?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_ratings_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_ratings_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_ratings_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_response_tokens: {
        Row: {
          action: string
          created_at: string
          expires_at: string
          id: string
          request_id: string
          token: string
          used_at: string | null
          worker_id: string
        }
        Insert: {
          action: string
          created_at?: string
          expires_at: string
          id?: string
          request_id: string
          token: string
          used_at?: string | null
          worker_id: string
        }
        Update: {
          action?: string
          created_at?: string
          expires_at?: string
          id?: string
          request_id?: string
          token?: string
          used_at?: string | null
          worker_id?: string
        }
        Relationships: []
      }
      shift_tips: {
        Row: {
          amount_cents: number
          client_user_id: string
          created_at: string
          currency: string
          id: string
          shift_id: string
          status: string
          stripe_destination_account_id: string
          stripe_payment_intent_id: string
          worker_id: string
        }
        Insert: {
          amount_cents: number
          client_user_id: string
          created_at?: string
          currency?: string
          id?: string
          shift_id: string
          status?: string
          stripe_destination_account_id: string
          stripe_payment_intent_id: string
          worker_id: string
        }
        Update: {
          amount_cents?: number
          client_user_id?: string
          created_at?: string
          currency?: string
          id?: string
          shift_id?: string
          status?: string
          stripe_destination_account_id?: string
          stripe_payment_intent_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_tips_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_tips_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_tips_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approver_id: string | null
          billing_period_id: string | null
          checkin_time: string | null
          checkout_time: string | null
          complete_time: string | null
          confirm_time: string | null
          created_at: string
          end_time: string
          facility_id: string
          hourly_rate: number | null
          id: string
          location: Json | null
          offered_worker_ids: string[] | null
          request_id: string
          start_time: string
          status: string | null
          timesheet_status: string | null
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approver_id?: string | null
          billing_period_id?: string | null
          checkin_time?: string | null
          checkout_time?: string | null
          complete_time?: string | null
          confirm_time?: string | null
          created_at?: string
          end_time: string
          facility_id: string
          hourly_rate?: number | null
          id?: string
          location?: Json | null
          offered_worker_ids?: string[] | null
          request_id: string
          start_time: string
          status?: string | null
          timesheet_status?: string | null
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approver_id?: string | null
          billing_period_id?: string | null
          checkin_time?: string | null
          checkout_time?: string | null
          complete_time?: string | null
          confirm_time?: string | null
          created_at?: string
          end_time?: string
          facility_id?: string
          hourly_rate?: number | null
          id?: string
          location?: Json | null
          offered_worker_ids?: string[] | null
          request_id?: string
          start_time?: string
          status?: string | null
          timesheet_status?: string | null
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_client_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "staff_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          assessed: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assessed?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assessed?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_user_id_fkey"
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
          charge_frequency: string | null
          coverage_data: Json | null
          coverage_data_at: string | null
          created_at: string
          daily_time_windows: Json
          end_date: string | null
          facility_id: string
          id: string
          location: Json
          notes: string | null
          operator_id: string
          positions: number
          pricing_rate: number | null
          pricing_tier: string | null
          profession: string
          requirements: string[]
          start_date: string
          status: string
          tasks: string[]
          update_at: string
        }
        Insert: {
          cell_id: string
          charge_frequency?: string | null
          coverage_data?: Json | null
          coverage_data_at?: string | null
          created_at?: string
          daily_time_windows?: Json
          end_date?: string | null
          facility_id: string
          id?: string
          location: Json
          notes?: string | null
          operator_id: string
          positions?: number
          pricing_rate?: number | null
          pricing_tier?: string | null
          profession: string
          requirements?: string[]
          start_date: string
          status?: string
          tasks?: string[]
          update_at?: string
        }
        Update: {
          cell_id?: string
          charge_frequency?: string | null
          coverage_data?: Json | null
          coverage_data_at?: string | null
          created_at?: string
          daily_time_windows?: Json
          end_date?: string | null
          facility_id?: string
          id?: string
          location?: Json
          notes?: string | null
          operator_id?: string
          positions?: number
          pricing_rate?: number | null
          pricing_tier?: string | null
          profession?: string
          requirements?: string[]
          start_date?: string
          status?: string
          tasks?: string[]
          update_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_requests_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_requests_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          facility_id: string
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          screening_invites_limit: number | null
          screenings_limit: number | null
          seats_limit: number | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          facility_id: string
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          screening_invites_limit?: number | null
          screenings_limit?: number | null
          seats_limit?: number | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          facility_id?: string
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          screening_invites_limit?: number | null
          screenings_limit?: number | null
          seats_limit?: number | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: true
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          shift_id: string
          status: string
          stripe_transfer_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          shift_id: string
          status?: string
          stripe_transfer_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          shift_id?: string
          status?: string
          stripe_transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
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
          is_active: boolean
          is_email_verified: boolean
          is_phone_verified: boolean
          phone_number: string | null
          push_token: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          auth_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_email_verified?: boolean
          is_phone_verified?: boolean
          phone_number?: string | null
          push_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_email_verified?: boolean
          is_phone_verified?: boolean
          phone_number?: string | null
          push_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      work_authorizations: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          is_verified: boolean
          social_number: string | null
          social_number_expiry: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          is_verified?: boolean
          social_number?: string | null
          social_number_expiry?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          is_verified?: boolean
          social_number?: string | null
          social_number_expiry?: string | null
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
          address: Json | null
          auto_confirm: boolean
          availability_timezone: string | null
          calendar_token: string | null
          cell_id: string | null
          created_at: string
          date_of_birth: string
          first_name: string
          gender: string
          id: string
          last_name: string
          photo_url: string | null
          profession: string
          rating_avg: number | null
          rating_count: number | null
          stage: string
          user_id: string
          years_exp: number
        }
        Insert: {
          address?: Json | null
          auto_confirm?: boolean
          availability_timezone?: string | null
          calendar_token?: string | null
          cell_id?: string | null
          created_at?: string
          date_of_birth: string
          first_name: string
          gender?: string
          id?: string
          last_name: string
          photo_url?: string | null
          profession: string
          rating_avg?: number | null
          rating_count?: number | null
          stage?: string
          user_id: string
          years_exp: number
        }
        Update: {
          address?: Json | null
          auto_confirm?: boolean
          availability_timezone?: string | null
          calendar_token?: string | null
          cell_id?: string | null
          created_at?: string
          date_of_birth?: string
          first_name?: string
          gender?: string
          id?: string
          last_name?: string
          photo_url?: string | null
          profession?: string
          rating_avg?: number | null
          rating_count?: number | null
          stage?: string
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
      append_quiz_answer: {
        Args: { p_answer: Json; p_quiz_id: string }
        Returns: undefined
      }
      append_quiz_batch: {
        Args: { p_generation: Json; p_questions: Json; p_quiz_id: string }
        Returns: undefined
      }
    }
    Enums: {
      subscription_plan: "starter" | "pro" | "enterprise"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
        | "unpaid"
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
      subscription_plan: ["starter", "pro", "enterprise"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "incomplete",
        "unpaid",
      ],
    },
  },
} as const
