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
      api_key_usage_logs: {
        Row: {
          api_key_id: string
          created_at: string | null
          endpoint: string
          id: string
          method: string
          response_time_ms: number | null
          status_code: number | null
        }
        Insert: {
          api_key_id: string
          created_at?: string | null
          endpoint: string
          id?: string
          method: string
          response_time_ms?: number | null
          status_code?: number | null
        }
        Update: {
          api_key_id?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          method?: string
          response_time_ms?: number | null
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_key_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          label: string | null
          last_used_at: string | null
          rate_limit_per_day: number | null
          rate_limit_per_hour: number | null
          scopes: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          label?: string | null
          last_used_at?: string | null
          rate_limit_per_day?: number | null
          rate_limit_per_hour?: number | null
          scopes?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          label?: string | null
          last_used_at?: string | null
          rate_limit_per_day?: number | null
          rate_limit_per_hour?: number | null
          scopes?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bundle_items: {
        Row: {
          bundle_id: string
          created_at: string | null
          id: string
          listing_id: string
        }
        Insert: {
          bundle_id: string
          created_at?: string | null
          id?: string
          listing_id: string
        }
        Update: {
          bundle_id?: string
          created_at?: string | null
          id?: string
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          created_at: string | null
          description: string | null
          discount_percentage: number | null
          id: string
          seller_id: string
          status: string
          title: string
          total_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          id?: string
          seller_id: string
          status?: string
          title: string
          total_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          id?: string
          seller_id?: string
          status?: string
          title?: string
          total_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bundles_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_agent_activities: {
        Row: {
          actioned_at: string | null
          activity_type: string
          created_at: string | null
          fit_score: number | null
          id: string
          listing_ids: Json
          notified_at: string | null
          reasoning: string | null
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          actioned_at?: string | null
          activity_type: string
          created_at?: string | null
          fit_score?: number | null
          id?: string
          listing_ids: Json
          notified_at?: string | null
          reasoning?: string | null
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          actioned_at?: string | null
          activity_type?: string
          created_at?: string | null
          fit_score?: number | null
          id?: string
          listing_ids?: Json
          notified_at?: string | null
          reasoning?: string | null
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_agent_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_agent_feedback: {
        Row: {
          created_at: string | null
          feedback_type: string
          id: string
          listing_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feedback_type: string
          id?: string
          listing_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          feedback_type?: string
          id?: string
          listing_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_agent_feedback_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_agent_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string | null
          id: string
          listing_id: string
          seller_id: string
          updated_at: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          id?: string
          listing_id: string
          seller_id: string
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          id?: string
          listing_id?: string
          seller_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          admin_notes: string | null
          ai_confidence_score: number | null
          ai_recommended_outcome: string | null
          ai_summary: string | null
          buyer_evidence: Json | null
          buyer_id: string
          created_at: string | null
          dispute_type: string
          id: string
          listing_id: string
          order_id: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          seller_evidence: Json | null
          seller_id: string
          seller_response: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          ai_confidence_score?: number | null
          ai_recommended_outcome?: string | null
          ai_summary?: string | null
          buyer_evidence?: Json | null
          buyer_id: string
          created_at?: string | null
          dispute_type: string
          id?: string
          listing_id: string
          order_id: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          seller_evidence?: Json | null
          seller_id: string
          seller_response?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          ai_confidence_score?: number | null
          ai_recommended_outcome?: string | null
          ai_summary?: string | null
          buyer_evidence?: Json | null
          buyer_id?: string
          created_at?: string | null
          dispute_type?: string
          id?: string
          listing_id?: string
          order_id?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          seller_evidence?: Json | null
          seller_id?: string
          seller_response?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_flags: {
        Row: {
          created_at: string | null
          details: Json | null
          flag_type: string
          id: string
          listing_id: string | null
          order_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_score: number
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          flag_type: string
          id?: string
          listing_id?: string | null
          order_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_score: number
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          flag_type?: string
          id?: string
          listing_id?: string | null
          order_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_score?: number
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_flags_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_flags_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_flags_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          failed_items: number
          id: string
          metadata: Json | null
          processed_items: number
          source: string
          status: string
          total_items: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          failed_items?: number
          id?: string
          metadata?: Json | null
          processed_items?: number
          source: string
          status?: string
          total_items?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          failed_items?: number
          id?: string
          metadata?: Json | null
          processed_items?: number
          source?: string
          status?: string
          total_items?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_embeddings: {
        Row: {
          created_at: string | null
          embedding: string | null
          id: string
          listing_id: string | null
          model_used: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          embedding?: string | null
          id?: string
          listing_id?: string | null
          model_used?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          embedding?: string | null
          id?: string
          listing_id?: string | null
          model_used?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_embeddings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_images: {
        Row: {
          ai_analysis: Json | null
          angle_score: number | null
          background_score: number | null
          counterfeit_risk_score: number | null
          created_at: string | null
          damage_detected: Json | null
          display_order: number | null
          id: string
          image_url: string
          is_stock_photo: boolean | null
          item_segmented: boolean | null
          lighting_score: number | null
          listing_id: string
          logo_detected: Json | null
          quality_score: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          angle_score?: number | null
          background_score?: number | null
          counterfeit_risk_score?: number | null
          created_at?: string | null
          damage_detected?: Json | null
          display_order?: number | null
          id?: string
          image_url: string
          is_stock_photo?: boolean | null
          item_segmented?: boolean | null
          lighting_score?: number | null
          listing_id: string
          logo_detected?: Json | null
          quality_score?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          angle_score?: number | null
          background_score?: number | null
          counterfeit_risk_score?: number | null
          created_at?: string | null
          damage_detected?: Json | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_stock_photo?: boolean | null
          item_segmented?: boolean | null
          lighting_score?: number | null
          listing_id?: string
          logo_detected?: Json | null
          quality_score?: number | null
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
          ai_answer_engines_enabled: boolean | null
          ai_confidence: Json | null
          ambitious_price: number | null
          brand: string | null
          card_id: string | null
          card_number: string | null
          category: string | null
          category_attributes: Json | null
          color: string | null
          condition: Database["public"]["Enums"]["condition_type"] | null
          created_at: string | null
          currency: string | null
          description: string | null
          embedding_id: string | null
          estimated_delivery_days: number | null
          free_shipping: boolean | null
          id: string
          import_job_id: string | null
          import_metadata: Json | null
          last_view_at: string | null
          material: string | null
          original_rrp: number | null
          package_dimensions: Json | null
          package_weight: number | null
          portfolio_name: string | null
          published_at: string | null
          quick_sale_price: number | null
          saves: number | null
          search_vector: unknown
          seller_id: string
          seller_price: number
          set_code: string | null
          shipping_cost_europe: number | null
          shipping_cost_international: number | null
          shipping_cost_uk: number | null
          short_id: string | null
          size: string | null
          stale_risk_score: number | null
          status: Database["public"]["Enums"]["listing_status"] | null
          style_tags: Json | null
          subcategory: string | null
          suggested_price: number | null
          title: string
          trade_enabled: boolean | null
          updated_at: string | null
          video_url: string | null
          views: number | null
        }
        Insert: {
          ai_answer_engines_enabled?: boolean | null
          ai_confidence?: Json | null
          ambitious_price?: number | null
          brand?: string | null
          card_id?: string | null
          card_number?: string | null
          category?: string | null
          category_attributes?: Json | null
          color?: string | null
          condition?: Database["public"]["Enums"]["condition_type"] | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          embedding_id?: string | null
          estimated_delivery_days?: number | null
          free_shipping?: boolean | null
          id?: string
          import_job_id?: string | null
          import_metadata?: Json | null
          last_view_at?: string | null
          material?: string | null
          original_rrp?: number | null
          package_dimensions?: Json | null
          package_weight?: number | null
          portfolio_name?: string | null
          published_at?: string | null
          quick_sale_price?: number | null
          saves?: number | null
          search_vector?: unknown
          seller_id: string
          seller_price: number
          set_code?: string | null
          shipping_cost_europe?: number | null
          shipping_cost_international?: number | null
          shipping_cost_uk?: number | null
          short_id?: string | null
          size?: string | null
          stale_risk_score?: number | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          style_tags?: Json | null
          subcategory?: string | null
          suggested_price?: number | null
          title: string
          trade_enabled?: boolean | null
          updated_at?: string | null
          video_url?: string | null
          views?: number | null
        }
        Update: {
          ai_answer_engines_enabled?: boolean | null
          ai_confidence?: Json | null
          ambitious_price?: number | null
          brand?: string | null
          card_id?: string | null
          card_number?: string | null
          category?: string | null
          category_attributes?: Json | null
          color?: string | null
          condition?: Database["public"]["Enums"]["condition_type"] | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          embedding_id?: string | null
          estimated_delivery_days?: number | null
          free_shipping?: boolean | null
          id?: string
          import_job_id?: string | null
          import_metadata?: Json | null
          last_view_at?: string | null
          material?: string | null
          original_rrp?: number | null
          package_dimensions?: Json | null
          package_weight?: number | null
          portfolio_name?: string | null
          published_at?: string | null
          quick_sale_price?: number | null
          saves?: number | null
          search_vector?: unknown
          seller_id?: string
          seller_price?: number
          set_code?: string | null
          shipping_cost_europe?: number | null
          shipping_cost_international?: number | null
          shipping_cost_uk?: number | null
          short_id?: string | null
          size?: string | null
          stale_risk_score?: number | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          style_tags?: Json | null
          subcategory?: string | null
          suggested_price?: number | null
          title?: string
          trade_enabled?: boolean | null
          updated_at?: string | null
          video_url?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "pokemon_card_attributes"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "listings_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          read: boolean | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          read?: boolean | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          read?: boolean | null
          read_at?: string | null
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
        ]
      }
      moderation_queue: {
        Row: {
          ai_classification: string | null
          ai_reason: string | null
          assigned_to: string | null
          created_at: string | null
          id: string
          item_id: string
          item_type: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          ai_classification?: string | null
          ai_reason?: string | null
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          item_id: string
          item_type: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_classification?: string | null
          ai_reason?: string | null
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          item_id?: string
          item_type?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_queue_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
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
      offer_history: {
        Row: {
          action: string
          actor_id: string
          created_at: string | null
          id: string
          new_amount: number | null
          notes: string | null
          offer_id: string
          previous_amount: number | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string | null
          id?: string
          new_amount?: number | null
          notes?: string | null
          offer_id: string
          previous_amount?: number | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string | null
          id?: string
          new_amount?: number | null
          notes?: string | null
          offer_id?: string
          previous_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_history_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          amount: number
          buyer_id: string
          conversation_id: string
          counter_offer_to: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          listing_id: string
          message: string | null
          seller_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          buyer_id: string
          conversation_id: string
          counter_offer_to?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          listing_id: string
          message?: string | null
          seller_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          buyer_id?: string
          conversation_id?: string
          counter_offer_to?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          listing_id?: string
          message?: string | null
          seller_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_counter_offer_to_fkey"
            columns: ["counter_offer_to"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
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
          address_validated: boolean | null
          address_validation_details: Json | null
          buyer_id: string
          carrier: string | null
          created_at: string
          currency: string
          delivered_at: string | null
          id: string
          platform_fee: number
          seller_amount: number
          seller_id: string
          shipped_at: string | null
          shipping_address: Json
          shipping_cost: number | null
          shipping_status: string | null
          status: string
          total_amount: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          address_validated?: boolean | null
          address_validation_details?: Json | null
          buyer_id: string
          carrier?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          id?: string
          platform_fee: number
          seller_amount: number
          seller_id: string
          shipped_at?: string | null
          shipping_address: Json
          shipping_cost?: number | null
          shipping_status?: string | null
          status?: string
          total_amount: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          address_validated?: boolean | null
          address_validation_details?: Json | null
          buyer_id?: string
          carrier?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          id?: string
          platform_fee?: number
          seller_amount?: number
          seller_id?: string
          shipped_at?: string | null
          shipping_address?: Json
          shipping_cost?: number | null
          shipping_status?: string | null
          status?: string
          total_amount?: number
          tracking_number?: string | null
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
      pokemon_card_attributes: {
        Row: {
          artist: string | null
          card_id: string
          cardmarket_id: string | null
          cardmarket_prices: Json | null
          created_at: string | null
          display_number: string | null
          id: string
          images: Json | null
          last_price_update: string | null
          last_searched_at: string | null
          metadata: Json | null
          name: string
          number: string | null
          popularity_score: number | null
          printed_total: number | null
          rarity: string | null
          search_number: string | null
          search_vector: unknown
          set_code: string | null
          set_name: string
          subtypes: string[] | null
          supertype: string | null
          sync_source: Database["public"]["Enums"]["sync_source_type"] | null
          synced_at: string | null
          tcgplayer_id: string | null
          tcgplayer_prices: Json | null
          types: string[] | null
          updated_at: string | null
        }
        Insert: {
          artist?: string | null
          card_id: string
          cardmarket_id?: string | null
          cardmarket_prices?: Json | null
          created_at?: string | null
          display_number?: string | null
          id?: string
          images?: Json | null
          last_price_update?: string | null
          last_searched_at?: string | null
          metadata?: Json | null
          name: string
          number?: string | null
          popularity_score?: number | null
          printed_total?: number | null
          rarity?: string | null
          search_number?: string | null
          search_vector?: unknown
          set_code?: string | null
          set_name: string
          subtypes?: string[] | null
          supertype?: string | null
          sync_source?: Database["public"]["Enums"]["sync_source_type"] | null
          synced_at?: string | null
          tcgplayer_id?: string | null
          tcgplayer_prices?: Json | null
          types?: string[] | null
          updated_at?: string | null
        }
        Update: {
          artist?: string | null
          card_id?: string
          cardmarket_id?: string | null
          cardmarket_prices?: Json | null
          created_at?: string | null
          display_number?: string | null
          id?: string
          images?: Json | null
          last_price_update?: string | null
          last_searched_at?: string | null
          metadata?: Json | null
          name?: string
          number?: string | null
          popularity_score?: number | null
          printed_total?: number | null
          rarity?: string | null
          search_number?: string | null
          search_vector?: unknown
          set_code?: string | null
          set_name?: string
          subtypes?: string[] | null
          supertype?: string | null
          sync_source?: Database["public"]["Enums"]["sync_source_type"] | null
          synced_at?: string | null
          tcgplayer_id?: string | null
          tcgplayer_prices?: Json | null
          types?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      popular_sets: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          priority_tier: number | null
          set_code: string
          set_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          priority_tier?: number | null
          set_code: string
          set_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          priority_tier?: number | null
          set_code?: string
          set_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_verified: boolean | null
          can_receive_payments: boolean | null
          country: string | null
          created_at: string | null
          email: string | null
          email_verified: boolean | null
          facebook_verified: boolean | null
          full_name: string | null
          id: string
          id_verified: boolean | null
          instagram_verified: boolean | null
          is_banned: boolean | null
          kyc_status: boolean | null
          linkedin_verified: boolean | null
          notification_preferences: Json | null
          phone_verified: boolean | null
          stripe_connect_account_id: string | null
          stripe_onboarding_complete: boolean | null
          trust_score: number | null
          twitter_verified: boolean | null
          updated_at: string | null
          verification_level: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_verified?: boolean | null
          can_receive_payments?: boolean | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          email_verified?: boolean | null
          facebook_verified?: boolean | null
          full_name?: string | null
          id: string
          id_verified?: boolean | null
          instagram_verified?: boolean | null
          is_banned?: boolean | null
          kyc_status?: boolean | null
          linkedin_verified?: boolean | null
          notification_preferences?: Json | null
          phone_verified?: boolean | null
          stripe_connect_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          trust_score?: number | null
          twitter_verified?: boolean | null
          updated_at?: string | null
          verification_level?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_verified?: boolean | null
          can_receive_payments?: boolean | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          email_verified?: boolean | null
          facebook_verified?: boolean | null
          full_name?: string | null
          id?: string
          id_verified?: boolean | null
          instagram_verified?: boolean | null
          is_banned?: boolean | null
          kyc_status?: boolean | null
          linkedin_verified?: boolean | null
          notification_preferences?: Json | null
          phone_verified?: boolean | null
          stripe_connect_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          trust_score?: number | null
          twitter_verified?: boolean | null
          updated_at?: string | null
          verification_level?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string | null
          id: string
          listing_id: string
          order_id: string
          rating: number
          review_text: string | null
          review_type: string
          reviewee_id: string
          reviewer_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_id: string
          order_id: string
          rating: number
          review_text?: string | null
          review_type: string
          reviewee_id: string
          reviewer_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_id?: string
          order_id?: string
          rating?: number
          review_text?: string | null
          review_type?: string
          reviewee_id?: string
          reviewer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_notes: string | null
          ai_recommended_action: string | null
          ai_risk_score: number | null
          ai_summary: string | null
          created_at: string | null
          evidence: Json | null
          id: string
          reason: string
          report_type: string
          reported_listing_id: string | null
          reported_user_id: string | null
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          ai_recommended_action?: string | null
          ai_risk_score?: number | null
          ai_summary?: string | null
          created_at?: string | null
          evidence?: Json | null
          id?: string
          reason: string
          report_type: string
          reported_listing_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          ai_recommended_action?: string | null
          ai_risk_score?: number | null
          ai_summary?: string | null
          created_at?: string | null
          evidence?: Json | null
          id?: string
          reason?: string
          report_type?: string
          reported_listing_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_listing_id_fkey"
            columns: ["reported_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reputation_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          impact_score: number
          metadata: Json | null
          reasoning: string | null
          seller_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          impact_score: number
          metadata?: Json | null
          reasoning?: string | null
          seller_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          impact_score?: number
          metadata?: Json | null
          reasoning?: string | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reputation_events_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_listings: {
        Row: {
          created_at: string | null
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string | null
          filters: Json | null
          id: string
          name: string
          query: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          filters?: Json | null
          id?: string
          name: string
          query: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          filters?: Json | null
          id?: string
          name?: string
          query?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      search_analytics: {
        Row: {
          clicked_listing_id: string | null
          created_at: string | null
          id: string
          query: string
          results_count: number | null
          search_type: string
          user_id: string | null
        }
        Insert: {
          clicked_listing_id?: string | null
          created_at?: string | null
          id?: string
          query: string
          results_count?: number | null
          search_type: string
          user_id?: string | null
        }
        Update: {
          clicked_listing_id?: string | null
          created_at?: string | null
          id?: string
          query?: string
          results_count?: number | null
          search_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_analytics_clicked_listing_id_fkey"
            columns: ["clicked_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          clicked_listings: Json | null
          created_at: string | null
          filters_applied: Json | null
          id: string
          results_count: number | null
          search_query: string
          search_type: string
          user_id: string | null
        }
        Insert: {
          clicked_listings?: Json | null
          created_at?: string | null
          filters_applied?: Json | null
          id?: string
          results_count?: number | null
          search_query: string
          search_type: string
          user_id?: string | null
        }
        Update: {
          clicked_listings?: Json | null
          created_at?: string | null
          filters_applied?: Json | null
          id?: string
          results_count?: number | null
          search_query?: string
          search_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_analytics: {
        Row: {
          avg_sale_price: number | null
          conversion_rate: number | null
          created_at: string | null
          date: string
          id: string
          seller_id: string
          total_messages: number | null
          total_revenue: number | null
          total_sales: number | null
          total_saves: number | null
          total_views: number | null
          updated_at: string | null
        }
        Insert: {
          avg_sale_price?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          date: string
          id?: string
          seller_id: string
          total_messages?: number | null
          total_revenue?: number | null
          total_sales?: number | null
          total_saves?: number | null
          total_views?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_sale_price?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          date?: string
          id?: string
          seller_id?: string
          total_messages?: number | null
          total_revenue?: number | null
          total_sales?: number | null
          total_saves?: number | null
          total_views?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_analytics_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_automation_rules: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string | null
          enabled: boolean | null
          id: string
          rule_type: string
          seller_id: string
          updated_at: string | null
        }
        Insert: {
          actions?: Json
          conditions?: Json
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          rule_type: string
          seller_id: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          rule_type?: string
          seller_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_automation_rules_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_badges: {
        Row: {
          badge_name: string
          badge_type: string
          created_at: string
          description: string | null
          earned_at: string
          id: string
          is_active: boolean | null
          seller_id: string
          updated_at: string | null
        }
        Insert: {
          badge_name: string
          badge_type: string
          created_at?: string
          description?: string | null
          earned_at?: string
          id?: string
          is_active?: boolean | null
          seller_id: string
          updated_at?: string | null
        }
        Update: {
          badge_name?: string
          badge_type?: string
          created_at?: string
          description?: string | null
          earned_at?: string
          id?: string
          is_active?: boolean | null
          seller_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_badges_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      seller_reputation: {
        Row: {
          active_since: string
          average_rating: number
          avg_response_time_hours: number
          cancellation_rate: number
          created_at: string
          disputes_lost: number
          disputes_won: number
          id: string
          last_calculated_at: string
          late_shipments: number
          on_time_shipments: number
          reputation_score: number
          response_rate: number
          seller_id: string
          total_revenue: number
          total_reviews: number
          total_sales: number
          updated_at: string
          verification_level: string
        }
        Insert: {
          active_since?: string
          average_rating?: number
          avg_response_time_hours?: number
          cancellation_rate?: number
          created_at?: string
          disputes_lost?: number
          disputes_won?: number
          id?: string
          last_calculated_at?: string
          late_shipments?: number
          on_time_shipments?: number
          reputation_score?: number
          response_rate?: number
          seller_id: string
          total_revenue?: number
          total_reviews?: number
          total_sales?: number
          updated_at?: string
          verification_level?: string
        }
        Update: {
          active_since?: string
          average_rating?: number
          avg_response_time_hours?: number
          cancellation_rate?: number
          created_at?: string
          disputes_lost?: number
          disputes_won?: number
          id?: string
          last_calculated_at?: string
          late_shipments?: number
          on_time_shipments?: number
          reputation_score?: number
          response_rate?: number
          seller_id?: string
          total_revenue?: number
          total_reviews?: number
          total_sales?: number
          updated_at?: string
          verification_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_reputation_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_risk_ratings: {
        Row: {
          avg_shipping_days: number | null
          cancellation_rate: number | null
          created_at: string | null
          dispute_ratio: number | null
          id: string
          last_calculated_at: string | null
          rating_average: number | null
          risk_tier: Database["public"]["Enums"]["risk_tier"]
          seller_id: string
          updated_at: string | null
          volume_last_30_days: number | null
        }
        Insert: {
          avg_shipping_days?: number | null
          cancellation_rate?: number | null
          created_at?: string | null
          dispute_ratio?: number | null
          id?: string
          last_calculated_at?: string | null
          rating_average?: number | null
          risk_tier?: Database["public"]["Enums"]["risk_tier"]
          seller_id: string
          updated_at?: string | null
          volume_last_30_days?: number | null
        }
        Update: {
          avg_shipping_days?: number | null
          cancellation_rate?: number | null
          created_at?: string | null
          dispute_ratio?: number | null
          id?: string
          last_calculated_at?: string | null
          rating_average?: number | null
          risk_tier?: Database["public"]["Enums"]["risk_tier"]
          seller_id?: string
          updated_at?: string | null
          volume_last_30_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_risk_ratings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_verifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          seller_id: string
          status: string
          updated_at: string
          verification_data: Json | null
          verification_type: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          seller_id: string
          status?: string
          updated_at?: string
          verification_data?: Json | null
          verification_type: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          seller_id?: string
          status?: string
          updated_at?: string
          verification_data?: Json | null
          verification_type?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_verifications_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_details: {
        Row: {
          carrier: string | null
          created_at: string | null
          delivered_at: string | null
          estimated_delivery: string | null
          id: string
          label_url: string | null
          order_id: string
          shipped_at: string | null
          status: string
          tracking_events: Json | null
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string | null
          delivered_at?: string | null
          estimated_delivery?: string | null
          id?: string
          label_url?: string | null
          order_id: string
          shipped_at?: string | null
          status?: string
          tracking_events?: Json | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          carrier?: string | null
          created_at?: string | null
          delivered_at?: string | null
          estimated_delivery?: string | null
          id?: string
          label_url?: string | null
          order_id?: string
          shipped_at?: string | null
          status?: string
          tracking_events?: Json | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_details_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      social_verifications: {
        Row: {
          connection_count: number | null
          created_at: string | null
          id: string
          last_validated: string | null
          profile_age_days: number | null
          profile_data: Json | null
          provider: string
          provider_user_id: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          connection_count?: number | null
          created_at?: string | null
          id?: string
          last_validated?: string | null
          profile_age_days?: number | null
          profile_data?: Json | null
          provider: string
          provider_user_id: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          connection_count?: number | null
          created_at?: string | null
          id?: string
          last_validated?: string | null
          profile_age_days?: number | null
          profile_data?: Json | null
          provider?: string
          provider_user_id?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      support_ticket_replies: {
        Row: {
          created_at: string
          id: string
          is_staff_reply: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_staff_reply?: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_staff_reply?: boolean | null
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          description: string
          id: string
          priority: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tcg_sync_progress: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          last_page_synced: number | null
          last_sync_at: string | null
          priority_tier: number | null
          set_code: string
          set_name: string | null
          sync_source: Database["public"]["Enums"]["sync_source_type"] | null
          sync_status: string | null
          synced_cards: number | null
          total_cards: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_page_synced?: number | null
          last_sync_at?: string | null
          priority_tier?: number | null
          set_code: string
          set_name?: string | null
          sync_source?: Database["public"]["Enums"]["sync_source_type"] | null
          sync_status?: string | null
          synced_cards?: number | null
          total_cards?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_page_synced?: number | null
          last_sync_at?: string | null
          priority_tier?: number | null
          set_code?: string
          set_name?: string | null
          sync_source?: Database["public"]["Enums"]["sync_source_type"] | null
          sync_status?: string | null
          synced_cards?: number | null
          total_cards?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tcgdex_import_progress: {
        Row: {
          cards_imported: number | null
          cards_total: number | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          language: string
          last_card_number: number | null
          retry_count: number | null
          set_code: string
          started_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          cards_imported?: number | null
          cards_total?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          language: string
          last_card_number?: number | null
          retry_count?: number | null
          set_code: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          cards_imported?: number | null
          cards_total?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          language?: string
          last_card_number?: number | null
          retry_count?: number | null
          set_code?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      trade_offers: {
        Row: {
          ai_fairness_score: number | null
          buyer_id: string
          cash_amount: number | null
          created_at: string | null
          expiry_date: string | null
          id: string
          photos: Json | null
          seller_id: string
          status: string | null
          target_listing_id: string
          trade_item_valuations: Json | null
          trade_items: Json
          updated_at: string | null
        }
        Insert: {
          ai_fairness_score?: number | null
          buyer_id: string
          cash_amount?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          photos?: Json | null
          seller_id: string
          status?: string | null
          target_listing_id: string
          trade_item_valuations?: Json | null
          trade_items?: Json
          updated_at?: string | null
        }
        Update: {
          ai_fairness_score?: number | null
          buyer_id?: string
          cash_amount?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          photos?: Json | null
          seller_id?: string
          status?: string | null
          target_listing_id?: string
          trade_item_valuations?: Json | null
          trade_items?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_offers_target_listing_id_fkey"
            columns: ["target_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_fees: {
        Row: {
          buyer_gmv_at_purchase: number | null
          buyer_protection_fee: number
          buyer_tier: Database["public"]["Enums"]["membership_tier"]
          created_at: string | null
          id: string
          instant_payout_fee: number
          instant_payout_percentage: number
          order_id: string
          protection_addon_fee: number | null
          seller_commission_fee: number
          seller_commission_percentage: number
          seller_risk_tier: Database["public"]["Enums"]["risk_tier"]
          seller_tier: Database["public"]["Enums"]["membership_tier"]
          shipping_margin: number | null
        }
        Insert: {
          buyer_gmv_at_purchase?: number | null
          buyer_protection_fee?: number
          buyer_tier: Database["public"]["Enums"]["membership_tier"]
          created_at?: string | null
          id?: string
          instant_payout_fee?: number
          instant_payout_percentage?: number
          order_id: string
          protection_addon_fee?: number | null
          seller_commission_fee?: number
          seller_commission_percentage?: number
          seller_risk_tier: Database["public"]["Enums"]["risk_tier"]
          seller_tier: Database["public"]["Enums"]["membership_tier"]
          shipping_margin?: number | null
        }
        Update: {
          buyer_gmv_at_purchase?: number | null
          buyer_protection_fee?: number
          buyer_tier?: Database["public"]["Enums"]["membership_tier"]
          created_at?: string | null
          id?: string
          instant_payout_fee?: number
          instant_payout_percentage?: number
          order_id?: string
          protection_addon_fee?: number | null
          seller_commission_fee?: number
          seller_commission_percentage?: number
          seller_risk_tier?: Database["public"]["Enums"]["risk_tier"]
          seller_tier?: Database["public"]["Enums"]["membership_tier"]
          shipping_margin?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_fees_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_score_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          impact_score: number
          reasoning: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          impact_score: number
          reasoning?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          impact_score?: number
          reasoning?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_score_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_indicators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_memberships: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          monthly_gmv_counter: number | null
          promo_expiry: string | null
          promo_user: boolean | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["membership_tier"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          monthly_gmv_counter?: number | null
          promo_expiry?: string | null
          promo_user?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["membership_tier"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          monthly_gmv_counter?: number | null
          promo_expiry?: string | null
          promo_user?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["membership_tier"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_memberships_user_id_fkey"
            columns: ["user_id"]
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
      wallet_accounts: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          pending_balance: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          pending_balance?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          pending_balance?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string | null
          description: string | null
          id: string
          related_order_id: string | null
          related_user_id: string | null
          status: string | null
          stripe_transaction_id: string | null
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          related_order_id?: string | null
          related_user_id?: string | null
          status?: string | null
          stripe_transaction_id?: string | null
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          related_order_id?: string | null
          related_user_id?: string | null
          status?: string | null
          stripe_transaction_id?: string | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallet_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      listing_facets: {
        Row: {
          avg_price: number | null
          category: string | null
          count: number | null
          max_price: number | null
          min_price: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      ensure_admin_role: { Args: never; Returns: undefined }
      get_next_set_to_sync: {
        Args: never
        Returns: {
          last_page_synced: number
          priority_tier: number
          set_code: string
          set_name: string
        }[]
      }
      increment_card_popularity: {
        Args: { card_ids: string[] }
        Returns: undefined
      }
      increment_gmv: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      refresh_listing_facets: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
      membership_tier: "free" | "pro" | "enterprise"
      risk_tier: "A" | "B" | "C"
      sync_source_type:
        | "manual"
        | "cron"
        | "on_demand"
        | "justtcg"
        | "github"
        | "tcgdex"
        | "pokemon_tcg_api"
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
      membership_tier: ["free", "pro", "enterprise"],
      risk_tier: ["A", "B", "C"],
      sync_source_type: [
        "manual",
        "cron",
        "on_demand",
        "justtcg",
        "github",
        "tcgdex",
        "pokemon_tcg_api",
      ],
      user_role: ["buyer", "seller", "admin", "moderator"],
    },
  },
} as const
