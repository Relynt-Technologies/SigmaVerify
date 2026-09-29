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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          doc_type: Database["public"]["Enums"]["doc_type"]
          employee_id: string
          file_path: string
          id: string
          uploaded_at: string
        }
        Insert: {
          doc_type: Database["public"]["Enums"]["doc_type"]
          employee_id: string
          file_path: string
          id?: string
          uploaded_at?: string
        }
        Update: {
          doc_type?: Database["public"]["Enums"]["doc_type"]
          employee_id?: string
          file_path?: string
          id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          completed_at: string | null
          created_at: string
          email: string
          full_name: string
          hr_id: string
          id: string
          invite_sent_at: string | null
          invite_token: string
          phone: string | null
          status: Database["public"]["Enums"]["employee_status"]
          submitted_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          email: string
          full_name: string
          hr_id: string
          id?: string
          invite_sent_at?: string | null
          invite_token?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          submitted_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          email?: string
          full_name?: string
          hr_id?: string
          id?: string
          invite_sent_at?: string | null
          invite_token?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_hr_id_fkey"
            columns: ["hr_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bgv_seats_total: number | null
          bgv_seats_used: number | null
          company_name: string | null
          created_at: string
          email: string | null
          email_verified: boolean
          email_verified_at: string | null
          email_verified_override: boolean
          email_verified_overridden_at: string | null
          email_verified_overridden_by: string | null
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          subscription_status: Database["public"]["Enums"]["subscription_status"]
        }
        Insert: {
          bgv_seats_total?: number | null
          bgv_seats_used?: number | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          email_verified_at?: string | null
          email_verified_override?: boolean
          email_verified_overridden_at?: string | null
          email_verified_overridden_by?: string | null
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
        }
        Update: {
          bgv_seats_total?: number | null
          bgv_seats_used?: number | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          email_verified_at?: string | null
          email_verified_override?: boolean
          email_verified_overridden_at?: string | null
          email_verified_overridden_by?: string | null
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          employee_id: string
          generated_at: string | null
          id: string
          report_url: string | null
          sent_to_employee_at: string | null
          sent_to_hr_at: string | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          generated_at?: string | null
          id?: string
          report_url?: string | null
          sent_to_employee_at?: string | null
          sent_to_hr_at?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          generated_at?: string | null
          id?: string
          report_url?: string | null
          sent_to_employee_at?: string | null
          sent_to_hr_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      verifications: {
        Row: {
          created_at: string
          doc_type: Database["public"]["Enums"]["doc_type"]
          employee_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["verification_status"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          doc_type: Database["public"]["Enums"]["doc_type"]
          employee_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: Database["public"]["Enums"]["doc_type"]
          employee_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_email_verified: {
        Args: { target_user_id: string; verified: boolean }
        Returns: undefined
      }
      get_employee_by_token: {
        Args: { p_token: string }
        Returns: {
          email: string
          full_name: string
          id: string
          phone: string
          status: Database["public"]["Enums"]["employee_status"]
        }[]
      }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      submit_employee_documents: {
        Args: { p_documents: Json; p_token: string }
        Returns: Json
      }
    }
    Enums: {
      doc_type:
        | "pan"
        | "aadhaar_court"
        | "aadhaar_address"
        | "experience_letter"
        | "education_certificate"
      employee_status:
        | "pending_initiation"
        | "invited"
        | "docs_submitted"
        | "under_review"
        | "completed"
        | "failed"
      subscription_status: "pending" | "active" | "suspended"
      user_role: "hr" | "admin" | "bgv_team"
      verification_status: "pending" | "in_progress" | "verified" | "failed"
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
    Enums: {
      doc_type: [
        "pan",
        "aadhaar_court",
        "aadhaar_address",
        "experience_letter",
        "education_certificate",
      ],
      employee_status: [
        "pending_initiation",
        "invited",
        "docs_submitted",
        "under_review",
        "completed",
        "failed",
      ],
      subscription_status: ["pending", "active", "suspended"],
      user_role: ["hr", "admin", "bgv_team"],
      verification_status: ["pending", "in_progress", "verified", "failed"],
    },
  },
} as const
