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
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          title: string
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          title: string
          type?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          title?: string
          type?: string
        }
        Relationships: []
      }
      approved_users: {
        Row: {
          approved_by_discord: string | null
          approved_by_email: string | null
          created_at: string
          discord_username: string
          email: string
          id: string
          last_login: string | null
          password_hash: string
        }
        Insert: {
          approved_by_discord?: string | null
          approved_by_email?: string | null
          created_at?: string
          discord_username: string
          email: string
          id?: string
          last_login?: string | null
          password_hash: string
        }
        Update: {
          approved_by_discord?: string | null
          approved_by_email?: string | null
          created_at?: string
          discord_username?: string
          email?: string
          id?: string
          last_login?: string | null
          password_hash?: string
        }
        Relationships: []
      }
      custom_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          permissions: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          permissions?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          permissions?: Json
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          account_name: string
          assigned_role_id: string | null
          character_name: string
          created_at: string
          discord_username: string
          game_id: string
          handled_by_discord: string | null
          handled_by_email: string | null
          id: string
          level: string
          processed_at: string | null
          rejection_reason: string | null
          status: string
        }
        Insert: {
          account_name: string
          assigned_role_id?: string | null
          character_name: string
          created_at?: string
          discord_username: string
          game_id: string
          handled_by_discord?: string | null
          handled_by_email?: string | null
          id?: string
          level: string
          processed_at?: string | null
          rejection_reason?: string | null
          status?: string
        }
        Update: {
          account_name?: string
          assigned_role_id?: string | null
          character_name?: string
          created_at?: string
          discord_username?: string
          game_id?: string
          handled_by_discord?: string | null
          handled_by_email?: string | null
          id?: string
          level?: string
          processed_at?: string | null
          rejection_reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_assigned_role_id_fkey"
            columns: ["assigned_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          account_name: string
          character_name: string
          created_at: string
          discord_username: string
          game_id: string
          handled_by_discord: string | null
          handled_by_email: string | null
          id: string
          items: Json
          order_number: string
          rejection_reason: string | null
          status: string
          total: number
          user_id: string
        }
        Insert: {
          account_name: string
          character_name: string
          created_at?: string
          discord_username: string
          game_id: string
          handled_by_discord?: string | null
          handled_by_email?: string | null
          id?: string
          items: Json
          order_number: string
          rejection_reason?: string | null
          status?: string
          total: number
          user_id: string
        }
        Update: {
          account_name?: string
          character_name?: string
          created_at?: string
          discord_username?: string
          game_id?: string
          handled_by_discord?: string | null
          handled_by_email?: string | null
          id?: string
          items?: Json
          order_number?: string
          rejection_reason?: string | null
          status?: string
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "approved_users"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_users: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          deactivated_by_discord: string | null
          deactivated_by_email: string | null
          deactivation_reason: string | null
          discord_username: string
          email: string
          id: string
          password_hash: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          deactivated_by_discord?: string | null
          deactivated_by_email?: string | null
          deactivation_reason?: string | null
          discord_username: string
          email: string
          id?: string
          password_hash: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          deactivated_by_discord?: string | null
          deactivated_by_email?: string | null
          deactivation_reason?: string | null
          discord_username?: string
          email?: string
          id?: string
          password_hash?: string
          status?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          description: string
          id: string
          image: string
          name: string
          price: number
          quantity: number
          rating: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          image: string
          name: string
          price: number
          quantity?: number
          rating?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image?: string
          name?: string
          price?: number
          quantity?: number
          rating?: number
          updated_at?: string
        }
        Relationships: []
      }
      rule_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      rules: {
        Row: {
          category_id: string
          content: string
          created_at: string
          id: string
          sort_order: number
        }
        Insert: {
          category_id: string
          content: string
          created_at?: string
          id?: string
          sort_order?: number
        }
        Update: {
          category_id?: string
          content?: string
          created_at?: string
          id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "rule_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      staff_checkins: {
        Row: {
          checked_in_at: string
          checked_out_at: string | null
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          checked_in_at?: string
          checked_out_at?: string | null
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          checked_in_at?: string
          checked_out_at?: string | null
          id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "approved_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_custom_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_custom_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_custom_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "approved_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          added_by_discord: string | null
          added_by_email: string | null
          created_at: string
          id: string
          removal_reason: string | null
          removed_at: string | null
          removed_by_discord: string | null
          removed_by_email: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          added_by_discord?: string | null
          added_by_email?: string | null
          created_at?: string
          id?: string
          removal_reason?: string | null
          removed_at?: string | null
          removed_by_discord?: string | null
          removed_by_email?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          added_by_discord?: string | null
          added_by_email?: string | null
          created_at?: string
          id?: string
          removal_reason?: string | null
          removed_at?: string | null
          removed_by_discord?: string | null
          removed_by_email?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "approved_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
