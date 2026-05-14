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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_context_entries: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          structured_summary: string
          user_id: string
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          structured_summary?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          structured_summary?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_quota_settings: {
        Row: {
          id: string
          monthly_limit: number
          updated_at: string
          updated_by: string | null
          warning_threshold_pct: number
        }
        Insert: {
          id?: string
          monthly_limit?: number
          updated_at?: string
          updated_by?: string | null
          warning_threshold_pct?: number
        }
        Update: {
          id?: string
          monthly_limit?: number
          updated_at?: string
          updated_by?: string | null
          warning_threshold_pct?: number
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          call_count: number
          created_at: string
          id: string
          updated_at: string
          year_month: string
        }
        Insert: {
          call_count?: number
          created_at?: string
          id?: string
          updated_at?: string
          year_month: string
        }
        Update: {
          call_count?: number
          created_at?: string
          id?: string
          updated_at?: string
          year_month?: string
        }
        Relationships: []
      }
      pending_activities: {
        Row: {
          assigned_to: string | null
          client_name: string
          created_at: string
          created_by: string
          deadline: string
          description: string
          id: string
          priority: string
          status: string
          store_name: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_name?: string
          created_at?: string
          created_by: string
          deadline?: string
          description?: string
          id?: string
          priority?: string
          status?: string
          store_name?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_name?: string
          created_at?: string
          created_by?: string
          deadline?: string
          description?: string
          id?: string
          priority?: string
          status?: string
          store_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved: boolean
          avatar_url: string
          cover_url: string
          created_at: string
          display_name: string
          email: string
          id: string
          platforms: string[]
          status_text: string
          store_count: number
          store_limit: number
          updated_at: string
          user_id: string
          whatsapp: string
        }
        Insert: {
          approved?: boolean
          avatar_url?: string
          cover_url?: string
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          platforms?: string[]
          status_text?: string
          store_count?: number
          store_limit?: number
          updated_at?: string
          user_id: string
          whatsapp?: string
        }
        Update: {
          approved?: boolean
          avatar_url?: string
          cover_url?: string
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          platforms?: string[]
          status_text?: string
          store_count?: number
          store_limit?: number
          updated_at?: string
          user_id?: string
          whatsapp?: string
        }
        Relationships: []
      }
      store_requests: {
        Row: {
          assigned_to: string | null
          client_name: string
          created_at: string
          created_by: string
          id: string
          meeting_date: string
          observation: string
          platform: string
          platform_access_confirmed: boolean
          status: string
          store_created_at: string | null
          store_creation_status: string
          store_name: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_name?: string
          created_at?: string
          created_by: string
          id?: string
          meeting_date?: string
          observation?: string
          platform?: string
          platform_access_confirmed?: boolean
          status?: string
          store_created_at?: string | null
          store_creation_status?: string
          store_name?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_name?: string
          created_at?: string
          created_by?: string
          id?: string
          meeting_date?: string
          observation?: string
          platform?: string
          platform_access_confirmed?: boolean
          status?: string
          store_created_at?: string | null
          store_creation_status?: string
          store_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      strategic_assistant_links: {
        Row: {
          assistant_user_id: string
          created_at: string
          id: string
          strategic_user_id: string
          updated_at: string
        }
        Insert: {
          assistant_user_id: string
          created_at?: string
          id?: string
          strategic_user_id: string
          updated_at?: string
        }
        Update: {
          assistant_user_id?: string
          created_at?: string
          id?: string
          strategic_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      strategies: {
        Row: {
          admin_approved: boolean
          admin_return_reason: string
          assigned_to: string | null
          categories: Json
          completed_at: string | null
          created_at: string
          deadline: string
          deleted_at: string | null
          id: string
          manager_name: string
          observation: string
          operational_manager: string
          planned_start_date: string
          platform: string
          returned: boolean
          started_at: string | null
          status: string
          store_access_confirmed: boolean
          store_name: string
          store_request_id: string | null
          strategy_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_approved?: boolean
          admin_return_reason?: string
          assigned_to?: string | null
          categories?: Json
          completed_at?: string | null
          created_at?: string
          deadline?: string
          deleted_at?: string | null
          id?: string
          manager_name?: string
          observation?: string
          operational_manager?: string
          planned_start_date?: string
          platform?: string
          returned?: boolean
          started_at?: string | null
          status?: string
          store_access_confirmed?: boolean
          store_name?: string
          store_request_id?: string | null
          strategy_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_approved?: boolean
          admin_return_reason?: string
          assigned_to?: string | null
          categories?: Json
          completed_at?: string | null
          created_at?: string
          deadline?: string
          deleted_at?: string | null
          id?: string
          manager_name?: string
          observation?: string
          operational_manager?: string
          planned_start_date?: string
          platform?: string
          returned?: boolean
          started_at?: string | null
          status?: string
          store_access_confirmed?: boolean
          store_name?: string
          store_request_id?: string | null
          strategy_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategies_store_request_id_fkey"
            columns: ["store_request_id"]
            isOneToOne: false
            referencedRelation: "store_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_history: {
        Row: {
          action: string
          created_at: string
          field_changed: string
          id: string
          new_value: string
          old_value: string
          strategy_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          action?: string
          created_at?: string
          field_changed?: string
          id?: string
          new_value?: string
          old_value?: string
          strategy_id: string
          user_id: string
          user_name?: string
        }
        Update: {
          action?: string
          created_at?: string
          field_changed?: string
          id?: string
          new_value?: string
          old_value?: string
          strategy_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_history_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      strategy_save_attempts: {
        Row: {
          created_at: string
          id: string
          is_new: boolean
          operational_manager: string
          outcome: string
          payload: Json
          reason: string
          store_name: string
          strategy_id: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_new?: boolean
          operational_manager?: string
          outcome: string
          payload?: Json
          reason?: string
          store_name?: string
          strategy_id?: string | null
          user_id: string
          user_name?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_new?: boolean
          operational_manager?: string
          outcome?: string
          payload?: Json
          reason?: string
          store_name?: string
          strategy_id?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      training_courses: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string
          id: string
          images: Json
          order_index: number
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          created_by: string
          id?: string
          images?: Json
          order_index?: number
          published?: boolean
          title?: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          images?: Json
          order_index?: number
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_increment_ai_usage: { Args: never; Returns: Json }
      get_ai_usage_status: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operational" | "strategic" | "strategic_assistant"
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
      app_role: ["admin", "operational", "strategic", "strategic_assistant"],
    },
  },
} as const
