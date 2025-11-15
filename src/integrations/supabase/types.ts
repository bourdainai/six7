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
      listing_images: {
        Row: {
          ai_analysis: Json | null
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          listing_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          listing_id: string
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          ai_confidence: Json | null
          ambitious_price: number | null
          brand: string | null
          category: string | null
          category_attributes: Json | null
          color: string | null
          condition: Database["public"]["Enums"]["condition_type"] | null
          created_at: string | null
          currency: string | null
          description: string | null
          embedding_id: string | null
          id: string
          material: string | null
          original_rrp: number | null
          published_at: string | null
          quick_sale_price: number | null
          saves: number | null
          seller_id: string
          seller_price: number
          size: string | null
          status: Database["public"]["Enums"]["listing_status"] | null
          style_tags: Json | null
          subcategory: string | null
          suggested_price: number | null
          title: string
          updated_at: string | null
          views: number | null
        }
        Insert: {
          ai_confidence?: Json | null
          ambitious_price?: number | null
          brand?: string | null
          category?: string | null
          category_attributes?: Json | null
          color?: string | null
          condition?: Database["public"]["Enums"]["condition_type"] | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          embedding_id?: string | null
          id?: string
          material?: string | null
          original_rrp?: number | null
          published_at?: string | null
          quick_sale_price?: number | null
          saves?: number | null
          seller_id: string
          seller_price: number
          size?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          style_tags?: Json | null
          subcategory?: string | null
          suggested_price?: number | null
          title: string
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          ai_confidence?: Json | null
          ambitious_price?: number | null
          brand?: string | null
          category?: string | null
          category_attributes?: Json | null
          color?: string | null
          condition?: Database["public"]["Enums"]["condition_type"] | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          embedding_id?: string | null
          id?: string
          material?: string | null
          original_rrp?: number | null
          published_at?: string | null
          quick_sale_price?: number | null
          saves?: number | null
          seller_id?: string
          seller_price?: number
          size?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          style_tags?: Json | null
          subcategory?: string | null
          suggested_price?: number | null
          title?: string
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          order_id: string
          price: number
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          order_id: string
          price: number
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          order_id?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          created_at: string
          currency: string
          id: string
          platform_fee: number
          seller_amount: number
          seller_id: string
          shipping_address: Json
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          currency?: string
          id?: string
          platform_fee: number
          seller_amount: number
          seller_id: string
          shipping_address: Json
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          currency?: string
          id?: string
          platform_fee?: number
          seller_amount?: number
          seller_id?: string
          shipping_address?: Json
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          order_id: string
          status: string
          stripe_payment_intent_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          order_id: string
          status: string
          stripe_payment_intent_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          status?: string
          stripe_payment_intent_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency: string
          id: string
          order_id: string
          scheduled_at: string | null
          seller_id: string
          status: string
          stripe_transfer_id: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          order_id: string
          scheduled_at?: string | null
          seller_id: string
          status?: string
          stripe_transfer_id?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          scheduled_at?: string | null
          seller_id?: string
          status?: string
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          can_receive_payments: boolean | null
          country: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_banned: boolean | null
          kyc_status: boolean | null
          stripe_connect_account_id: string | null
          stripe_onboarding_complete: boolean | null
          trust_score: number | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          can_receive_payments?: boolean | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_banned?: boolean | null
          kyc_status?: boolean | null
          stripe_connect_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          trust_score?: number | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          can_receive_payments?: boolean | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_banned?: boolean | null
          kyc_status?: boolean | null
          stripe_connect_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          trust_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      seller_balances: {
        Row: {
          available_balance: number
          currency: string
          id: string
          pending_balance: number
          seller_id: string
          updated_at: string
        }
        Insert: {
          available_balance?: number
          currency?: string
          id?: string
          pending_balance?: number
          seller_id: string
          updated_at?: string
        }
        Update: {
          available_balance?: number
          currency?: string
          id?: string
          pending_balance?: number
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_balances_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          brands: Json | null
          budget_max: number | null
          budget_min: number | null
          categories: Json | null
          colors: Json | null
          created_at: string | null
          distance_radius: number | null
          id: string
          sizes: Json | null
          style_tags: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brands?: Json | null
          budget_max?: number | null
          budget_min?: number | null
          categories?: Json | null
          colors?: Json | null
          created_at?: string | null
          distance_radius?: number | null
          id?: string
          sizes?: Json | null
          style_tags?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brands?: Json | null
          budget_max?: number | null
          budget_min?: number | null
          categories?: Json | null
          colors?: Json | null
          created_at?: string | null
          distance_radius?: number | null
          id?: string
          sizes?: Json | null
          style_tags?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
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
      [_ in never]: never
    }
    Enums: {
      condition_type:
        | "new_with_tags"
        | "like_new"
        | "excellent"
        | "good"
        | "fair"
      listing_status:
        | "draft"
        | "pending_review"
        | "active"
        | "reserved"
        | "sold"
        | "cancelled"
        | "disputed"
      user_role: "buyer" | "seller" | "admin" | "moderator"
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
      condition_type: [
        "new_with_tags",
        "like_new",
        "excellent",
        "good",
        "fair",
      ],
      listing_status: [
        "draft",
        "pending_review",
        "active",
        "reserved",
        "sold",
        "cancelled",
        "disputed",
      ],
      user_role: ["buyer", "seller", "admin", "moderator"],
    },
  },
} as const
