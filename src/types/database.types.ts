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
      contracts: {
        Row: {
          agreed_amount: number
          completed_at: string | null
          created_at: string
          currency: string
          freelancer_id: string
          id: string
          project_id: string
          proposal_id: string
          started_at: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          agreed_amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          freelancer_id: string
          id?: string
          project_id: string
          proposal_id: string
          started_at?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          agreed_amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          freelancer_id?: string
          id?: string
          project_id?: string
          proposal_id?: string
          started_at?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          freelancer_id: string
          id: string
          project_id: string
          proposal_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          freelancer_id: string
          id?: string
          project_id: string
          proposal_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          freelancer_id?: string
          id?: string
          project_id?: string
          proposal_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          freelancer_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          freelancer_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          freelancer_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_profiles: {
        Row: {
          availability: string
          created_at: string
          github_url: string | null
          headline: string | null
          hourly_rate: number | null
          is_verified: boolean
          updated_at: string
          user_id: string
          website_url: string | null
          years_experience: number | null
        }
        Insert: {
          availability?: string
          created_at?: string
          github_url?: string | null
          headline?: string | null
          hourly_rate?: number | null
          is_verified?: boolean
          updated_at?: string
          user_id: string
          website_url?: string | null
          years_experience?: number | null
        }
        Update: {
          availability?: string
          created_at?: string
          github_url?: string | null
          headline?: string | null
          hourly_rate?: number | null
          is_verified?: boolean
          updated_at?: string
          user_id?: string
          website_url?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_url: string | null
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          media_url: string | null
          project_url: string | null
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          media_url?: string | null
          project_url?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          media_url?: string | null
          project_url?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_skills: {
        Row: {
          proficiency: number | null
          skill_id: string
          user_id: string
        }
        Insert: {
          proficiency?: number | null
          skill_id: string
          user_id: string
        }
        Update: {
          proficiency?: number | null
          skill_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          location: string | null
          role: string
          school_name: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          location?: string | null
          role?: string
          school_name?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          location?: string | null
          role?: string
          school_name?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      project_engagements: {
        Row: {
          agreed_amount: number
          agreed_deadline: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          currency: string
          dispute_notes: string | null
          id: string
          internal_notes: string | null
          payment_status: string
          provider_feedback: string | null
          referral_signal: string | null
          repeat_intent: string | null
          request_candidate_id: string
          started_at: string | null
          status: string
          student_feedback: string | null
          updated_at: string
        }
        Insert: {
          agreed_amount: number
          agreed_deadline?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          currency: string
          dispute_notes?: string | null
          id?: string
          internal_notes?: string | null
          payment_status?: string
          provider_feedback?: string | null
          referral_signal?: string | null
          repeat_intent?: string | null
          request_candidate_id: string
          started_at?: string | null
          status?: string
          student_feedback?: string | null
          updated_at?: string
        }
        Update: {
          agreed_amount?: number
          agreed_deadline?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          dispute_notes?: string | null
          id?: string
          internal_notes?: string | null
          payment_status?: string
          provider_feedback?: string | null
          referral_signal?: string | null
          repeat_intent?: string | null
          request_candidate_id?: string
          started_at?: string | null
          status?: string
          student_feedback?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_engagements_request_candidate_id_fkey"
            columns: ["request_candidate_id"]
            isOneToOne: true
            referencedRelation: "request_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_requests: {
        Row: {
          age_eligible_confirmed: boolean
          asset_links: string[]
          budget_range: string
          cancellation_reason: string | null
          category: string
          contact_method: string
          contact_permission_confirmed: boolean
          contact_value: string
          created_at: string
          currency: string
          deadline: string | null
          deadline_flexible: boolean
          description: string
          desired_deliverables: string | null
          id: string
          integrity_attested: boolean
          integrity_review_status: string
          internal_notes: string | null
          linked_student_profile_id: string | null
          rejection_reason: string | null
          requester_name: string
          reviewed_at: string | null
          reviewed_by: string | null
          school_or_context: string | null
          source_channel: string | null
          status: string
          updated_at: string
        }
        Insert: {
          age_eligible_confirmed?: boolean
          asset_links?: string[]
          budget_range: string
          cancellation_reason?: string | null
          category: string
          contact_method: string
          contact_permission_confirmed?: boolean
          contact_value: string
          created_at?: string
          currency: string
          deadline?: string | null
          deadline_flexible?: boolean
          description: string
          desired_deliverables?: string | null
          id?: string
          integrity_attested?: boolean
          integrity_review_status?: string
          internal_notes?: string | null
          linked_student_profile_id?: string | null
          rejection_reason?: string | null
          requester_name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_or_context?: string | null
          source_channel?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          age_eligible_confirmed?: boolean
          asset_links?: string[]
          budget_range?: string
          cancellation_reason?: string | null
          category?: string
          contact_method?: string
          contact_permission_confirmed?: boolean
          contact_value?: string
          created_at?: string
          currency?: string
          deadline?: string | null
          deadline_flexible?: boolean
          description?: string
          desired_deliverables?: string | null
          id?: string
          integrity_attested?: boolean
          integrity_review_status?: string
          internal_notes?: string | null
          linked_student_profile_id?: string | null
          rejection_reason?: string | null
          requester_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_or_context?: string | null
          source_channel?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_requests_linked_student_profile_id_fkey"
            columns: ["linked_student_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_skills: {
        Row: {
          project_id: string
          skill_id: string
        }
        Insert: {
          project_id: string
          skill_id: string
        }
        Update: {
          project_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_skills_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          budget_type: string
          category: string
          created_at: string
          currency: string
          deadline: string | null
          description: string
          id: string
          status: string
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          budget_type?: string
          category: string
          created_at?: string
          currency?: string
          deadline?: string | null
          description: string
          id?: string
          status?: string
          student_id: string
          title: string
          updated_at?: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          budget_type?: string
          category?: string
          created_at?: string
          currency?: string
          deadline?: string | null
          description?: string
          id?: string
          status?: string
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          cover_letter: string
          created_at: string
          currency: string
          estimated_days: number | null
          freelancer_id: string
          id: string
          project_id: string
          proposed_price: number
          status: string
          updated_at: string
        }
        Insert: {
          cover_letter: string
          created_at?: string
          currency?: string
          estimated_days?: number | null
          freelancer_id: string
          id?: string
          project_id: string
          proposed_price: number
          status?: string
          updated_at?: string
        }
        Update: {
          cover_letter?: string
          created_at?: string
          currency?: string
          estimated_days?: number | null
          freelancer_id?: string
          id?: string
          project_id?: string
          proposed_price?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_applications: {
        Row: {
          age_eligible_confirmed: boolean
          applicant_name: string
          availability: string
          contact_method: string
          contact_value: string
          created_at: string
          id: string
          internal_notes: string | null
          linked_provider_profile_id: string | null
          policy_accepted_at: string | null
          portfolio_urls: string[]
          preferred_project_types: string[]
          privacy_acknowledged_at: string | null
          rate_expectations: string
          reviewed_at: string | null
          reviewed_by: string | null
          skills: string[]
          source_channel: string | null
          status: string
          updated_at: string
        }
        Insert: {
          age_eligible_confirmed?: boolean
          applicant_name: string
          availability: string
          contact_method: string
          contact_value: string
          created_at?: string
          id?: string
          internal_notes?: string | null
          linked_provider_profile_id?: string | null
          policy_accepted_at?: string | null
          portfolio_urls?: string[]
          preferred_project_types?: string[]
          privacy_acknowledged_at?: string | null
          rate_expectations: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          skills?: string[]
          source_channel?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          age_eligible_confirmed?: boolean
          applicant_name?: string
          availability?: string
          contact_method?: string
          contact_value?: string
          created_at?: string
          id?: string
          internal_notes?: string | null
          linked_provider_profile_id?: string | null
          policy_accepted_at?: string | null
          portfolio_urls?: string[]
          preferred_project_types?: string[]
          privacy_acknowledged_at?: string | null
          rate_expectations?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          skills?: string[]
          source_channel?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_applications_linked_provider_profile_id_fkey"
            columns: ["linked_provider_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      request_candidates: {
        Row: {
          agreed_deadline: string | null
          agreed_price: number | null
          candidate_rank: number | null
          created_at: string
          curated_at: string
          curated_by: string | null
          currency: string
          decline_reason: string | null
          declined_by: string | null
          id: string
          internal_notes: string | null
          linked_provider_profile_id: string | null
          project_request_id: string
          proposed_price: number | null
          provider_application_id: string | null
          provider_responded_at: string | null
          provider_response_status: string
          scope_summary: string | null
          student_decision_at: string | null
          student_decision_status: string
          updated_at: string
        }
        Insert: {
          agreed_deadline?: string | null
          agreed_price?: number | null
          candidate_rank?: number | null
          created_at?: string
          curated_at?: string
          curated_by?: string | null
          currency: string
          decline_reason?: string | null
          declined_by?: string | null
          id?: string
          internal_notes?: string | null
          linked_provider_profile_id?: string | null
          project_request_id: string
          proposed_price?: number | null
          provider_application_id?: string | null
          provider_responded_at?: string | null
          provider_response_status?: string
          scope_summary?: string | null
          student_decision_at?: string | null
          student_decision_status?: string
          updated_at?: string
        }
        Update: {
          agreed_deadline?: string | null
          agreed_price?: number | null
          candidate_rank?: number | null
          created_at?: string
          curated_at?: string
          curated_by?: string | null
          currency?: string
          decline_reason?: string | null
          declined_by?: string | null
          id?: string
          internal_notes?: string | null
          linked_provider_profile_id?: string | null
          project_request_id?: string
          proposed_price?: number | null
          provider_application_id?: string | null
          provider_responded_at?: string | null
          provider_response_status?: string
          scope_summary?: string | null
          student_decision_at?: string | null
          student_decision_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_candidates_curated_by_fkey"
            columns: ["curated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_candidates_linked_provider_profile_id_fkey"
            columns: ["linked_provider_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_candidates_project_request_id_fkey"
            columns: ["project_request_id"]
            isOneToOne: false
            referencedRelation: "project_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_candidates_provider_application_id_fkey"
            columns: ["provider_application_id"]
            isOneToOne: false
            referencedRelation: "provider_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          contract_id: string
          created_at: string
          id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          contract_id: string
          created_at?: string
          id?: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
