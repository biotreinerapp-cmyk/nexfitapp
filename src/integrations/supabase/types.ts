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
      admin_actions: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json
          entity_id: string
          entity_table: string
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json
          entity_id: string
          entity_table?: string
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json
          entity_id?: string
          entity_table?: string
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      agenda_treinos: {
        Row: {
          aluno_id: string | null
          dia_semana: number | null
          exercicios: Json | null
          id: string
          status: string | null
        }
        Insert: {
          aluno_id?: string | null
          dia_semana?: number | null
          exercicios?: Json | null
          id?: string
          status?: string | null
        }
        Update: {
          aluno_id?: string | null
          dia_semana?: number | null
          exercicios?: Json | null
          id?: string
          status?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key_name: string
          key_value: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          key_name: string
          key_value: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          key_name?: string
          key_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      atividade_sessao: {
        Row: {
          bpm_medio: number | null
          calorias_estimadas: number | null
          confirmado: boolean
          distance_km: number | null
          finalizado_em: string | null
          id: string
          iniciado_em: string | null
          pace_avg: number | null
          route: Json | null
          status: string | null
          tipo_atividade: string
          user_id: string
        }
        Insert: {
          bpm_medio?: number | null
          calorias_estimadas?: number | null
          confirmado?: boolean
          distance_km?: number | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string | null
          pace_avg?: number | null
          route?: Json | null
          status?: string | null
          tipo_atividade: string
          user_id: string
        }
        Update: {
          bpm_medio?: number | null
          calorias_estimadas?: number | null
          confirmado?: boolean
          distance_km?: number | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string | null
          pace_avg?: number | null
          route?: Json | null
          status?: string | null
          tipo_atividade?: string
          user_id?: string
        }
        Relationships: []
      }
      biblioteca_exercicios: {
        Row: {
          body_part: string | null
          equipment: string | null
          external_id: string | null
          id: string
          instrucoes: string[] | null
          nome: string | null
          target_muscle: string | null
          video_url: string | null
        }
        Insert: {
          body_part?: string | null
          equipment?: string | null
          external_id?: string | null
          id?: string
          instrucoes?: string[] | null
          nome?: string | null
          target_muscle?: string | null
          video_url?: string | null
        }
        Update: {
          body_part?: string | null
          equipment?: string | null
          external_id?: string | null
          id?: string
          instrucoes?: string[] | null
          nome?: string | null
          target_muscle?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      blacklist_cnpj: {
        Row: {
          cnpj: string
          data_banimento: string | null
          motivo: string | null
        }
        Insert: {
          cnpj: string
          data_banimento?: string | null
          motivo?: string | null
        }
        Update: {
          cnpj?: string
          data_banimento?: string | null
          motivo?: string | null
        }
        Relationships: []
      }
      club_post_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "club_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      club_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "club_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      club_posts: {
        Row: {
          activity_id: string | null
          activity_type: string | null
          author_avatar_url: string | null
          author_initials: string | null
          author_name: string | null
          calories: number | null
          caption: string | null
          club_id: string
          created_at: string
          distance_km: number | null
          duration_minutes: number | null
          id: string
          image_url: string | null
          pace: string | null
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          activity_type?: string | null
          author_avatar_url?: string | null
          author_initials?: string | null
          author_name?: string | null
          calories?: number | null
          caption?: string | null
          club_id: string
          created_at?: string
          distance_km?: number | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          pace?: string | null
          user_id: string
        }
        Update: {
          activity_id?: string | null
          activity_type?: string | null
          author_avatar_url?: string | null
          author_initials?: string | null
          author_name?: string | null
          calories?: number | null
          caption?: string | null
          club_id?: string
          created_at?: string
          distance_km?: number | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          pace?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_posts_activity_fk"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "running_club_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_posts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "running_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      config_ai_agents: {
        Row: {
          agent_key: string
          api_key: string | null
          base_url: string
          created_at: string
          id: string
          instructions_layer: string | null
          provider: string
          system_context: string | null
          updated_at: string
        }
        Insert: {
          agent_key: string
          api_key?: string | null
          base_url?: string
          created_at?: string
          id?: string
          instructions_layer?: string | null
          provider: string
          system_context?: string | null
          updated_at?: string
        }
        Update: {
          agent_key?: string
          api_key?: string | null
          base_url?: string
          created_at?: string
          id?: string
          instructions_layer?: string | null
          provider?: string
          system_context?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      configuracoes_sistema: {
        Row: {
          chave: string
          created_at: string
          descricao: string | null
          id: string
          updated_at: string
          valor: string
        }
        Insert: {
          chave: string
          created_at?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor: string
        }
        Update: {
          chave?: string
          created_at?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      dashboard_outdoors: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          image_path: string
          image_url: string
          is_active: boolean
          link_url: string | null
          starts_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_path: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          starts_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_path?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          starts_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      equipment: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      exercise_media: {
        Row: {
          exercise_id: string
          id: string
          is_main: boolean | null
          url: string
        }
        Insert: {
          exercise_id: string
          id?: string
          is_main?: boolean | null
          url: string
        }
        Update: {
          exercise_id?: string
          id?: string
          is_main?: boolean | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_media_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          difficulty: string | null
          equipment: string | null
          equipment_id: string | null
          id: string
          muscle_image_url: string | null
          name: string
          primary_muscle_id: string | null
          slug: string | null
          target_muscle: string
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          equipment?: string | null
          equipment_id?: string | null
          id?: string
          muscle_image_url?: string | null
          name: string
          primary_muscle_id?: string | null
          slug?: string | null
          target_muscle: string
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          equipment?: string | null
          equipment_id?: string | null
          id?: string
          muscle_image_url?: string | null
          name?: string
          primary_muscle_id?: string | null
          slug?: string | null
          target_muscle?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_primary_muscle_id_fkey"
            columns: ["primary_muscle_id"]
            isOneToOne: false
            referencedRelation: "muscles"
            referencedColumns: ["id"]
          },
        ]
      }
      highlight_offers: {
        Row: {
          badge_label: string | null
          created_at: string
          description: string | null
          duration_days: number
          features: string[]
          id: string
          is_active: boolean
          price_cents: number
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          badge_label?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          features?: string[]
          id?: string
          is_active?: boolean
          price_cents?: number
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          badge_label?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          features?: string[]
          id?: string
          is_active?: boolean
          price_cents?: number
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lojas: {
        Row: {
          advertencias: number | null
          cnpj: string
          created_at: string | null
          email: string | null
          id: string
          nome_loja: string
          responsavel: string | null
          status: string | null
        }
        Insert: {
          advertencias?: number | null
          cnpj: string
          created_at?: string | null
          email?: string | null
          id?: string
          nome_loja: string
          responsavel?: string | null
          status?: string | null
        }
        Update: {
          advertencias?: number | null
          cnpj?: string
          created_at?: string | null
          email?: string | null
          id?: string
          nome_loja?: string
          responsavel?: string | null
          status?: string | null
        }
        Relationships: []
      }
      manual_routines: {
        Row: {
          created_at: string
          days: Json
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marketplace_coupons: {
        Row: {
          created_at: string
          discount_percent: number
          expires_at: string
          free_shipping: boolean
          id: string
          order_id: string | null
          plan_at_issue: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_percent: number
          expires_at?: string
          free_shipping?: boolean
          id?: string
          order_id?: string | null
          plan_at_issue: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          discount_percent?: number
          expires_at?: string
          free_shipping?: boolean
          id?: string
          order_id?: string | null
          plan_at_issue?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      marketplace_order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_image: string | null
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_image?: string | null
          product_name: string
          quantity?: number
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_image?: string | null
          product_name?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_orders: {
        Row: {
          coupon_id: string | null
          created_at: string
          delivery_address: string | null
          delivery_city: string | null
          discount_amount: number
          id: string
          payment_method: string | null
          pix_payload: string | null
          shipping_cost: number
          status: string
          store_id: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_city?: string | null
          discount_amount?: number
          id?: string
          payment_method?: string | null
          pix_payload?: string | null
          shipping_cost?: number
          status?: string
          store_id: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_city?: string | null
          discount_amount?: number
          id?: string
          payment_method?: string | null
          pix_payload?: string | null
          shipping_cost?: number
          status?: string
          store_id?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "marketplace_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "marketplace_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_products: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          nome: string
          preco_desconto: number
          preco_original: number
          store_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          nome: string
          preco_desconto: number
          preco_original: number
          store_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          nome?: string
          preco_desconto?: number
          preco_original?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "marketplace_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_stores: {
        Row: {
          banner_image_url: string | null
          city: string | null
          cover_image_url: string | null
          created_at: string
          desconto_percent: number
          descricao: string | null
          id: string
          nome: string
          owner_user_id: string
          profile_image_url: string | null
          status: string
          store_type: string
          updated_at: string
        }
        Insert: {
          banner_image_url?: string | null
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          desconto_percent?: number
          descricao?: string | null
          id?: string
          nome: string
          owner_user_id: string
          profile_image_url?: string | null
          status?: string
          store_type: string
          updated_at?: string
        }
        Update: {
          banner_image_url?: string | null
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          desconto_percent?: number
          descricao?: string | null
          id?: string
          nome?: string
          owner_user_id?: string
          profile_image_url?: string | null
          status?: string
          store_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      muscles: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          desired_plan: Database["public"]["Enums"]["subscription_plan"]
          id: string
          metadata: Json
          processed_at: string | null
          processed_by: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          receipt_path: string
          rejection_reason: string | null
          requested_at: string
          reviewed_receipt_path: string | null
          status: Database["public"]["Enums"]["payment_status"]
          store_id: string | null
          user_id: string
        }
        Insert: {
          desired_plan: Database["public"]["Enums"]["subscription_plan"]
          id?: string
          metadata?: Json
          processed_at?: string | null
          processed_by?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          receipt_path: string
          rejection_reason?: string | null
          requested_at?: string
          reviewed_receipt_path?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          store_id?: string | null
          user_id: string
        }
        Update: {
          desired_plan?: Database["public"]["Enums"]["subscription_plan"]
          id?: string
          metadata?: Json
          processed_at?: string | null
          processed_by?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          receipt_path?: string
          rejection_reason?: string | null
          requested_at?: string
          reviewed_receipt_path?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          store_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pix_configs: {
        Row: {
          bank_name: string | null
          created_at: string
          id: string
          marketplace_store_id: string | null
          pix_key: string | null
          qr_image_path: string | null
          receiver_name: string | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          bank_name?: string | null
          created_at?: string
          id?: string
          marketplace_store_id?: string | null
          pix_key?: string | null
          qr_image_path?: string | null
          receiver_name?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          bank_name?: string | null
          created_at?: string
          id?: string
          marketplace_store_id?: string | null
          pix_key?: string | null
          qr_image_path?: string | null
          receiver_name?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pix_configs_marketplace_store_id_fkey"
            columns: ["marketplace_store_id"]
            isOneToOne: false
            referencedRelation: "marketplace_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pix_configs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_configs: {
        Row: {
          created_at: string
          features: string[]
          plan: Database["public"]["Enums"]["subscription_plan"]
          price_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: string[]
          plan: Database["public"]["Enums"]["subscription_plan"]
          price_cents?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: string[]
          plan?: Database["public"]["Enums"]["subscription_plan"]
          price_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      plan_feature_catalog: {
        Row: {
          created_at: string
          key: string
          label: string
        }
        Insert: {
          created_at?: string
          key: string
          label: string
        }
        Update: {
          created_at?: string
          key?: string
          label?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_privacy_default: string
          altura_cm: number | null
          ativo: boolean
          avatar_url: string | null
          bio: string | null
          created_at: string
          data_nascimento: string | null
          display_name: string | null
          email: string | null
          focus_group: string | null
          genero: string | null
          gps_auto_pause: boolean
          id: string
          language_pref: string
          measurement_system: string
          nivel: string | null
          nivel_experiencia: string | null
          nome: string | null
          objetivo: string | null
          onboarding_completed: boolean
          peso_kg: number | null
          plan_expires_at: string | null
          plan_expiry_notified_at: string | null
          plano: Database["public"]["Enums"]["app_plan"]
          role: string | null
          store_id: string | null
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          training_days: string[] | null
          training_level: string | null
          updated_at: string
        }
        Insert: {
          activity_privacy_default?: string
          altura_cm?: number | null
          ativo?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          data_nascimento?: string | null
          display_name?: string | null
          email?: string | null
          focus_group?: string | null
          genero?: string | null
          gps_auto_pause?: boolean
          id: string
          language_pref?: string
          measurement_system?: string
          nivel?: string | null
          nivel_experiencia?: string | null
          nome?: string | null
          objetivo?: string | null
          onboarding_completed?: boolean
          peso_kg?: number | null
          plan_expires_at?: string | null
          plan_expiry_notified_at?: string | null
          plano?: Database["public"]["Enums"]["app_plan"]
          role?: string | null
          store_id?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          training_days?: string[] | null
          training_level?: string | null
          updated_at?: string
        }
        Update: {
          activity_privacy_default?: string
          altura_cm?: number | null
          ativo?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          data_nascimento?: string | null
          display_name?: string | null
          email?: string | null
          focus_group?: string | null
          genero?: string | null
          gps_auto_pause?: boolean
          id?: string
          language_pref?: string
          measurement_system?: string
          nivel?: string | null
          nivel_experiencia?: string | null
          nome?: string | null
          objetivo?: string | null
          onboarding_completed?: boolean
          peso_kg?: number | null
          plan_expires_at?: string | null
          plan_expiry_notified_at?: string | null
          plano?: Database["public"]["Enums"]["app_plan"]
          role?: string | null
          store_id?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          training_days?: string[] | null
          training_level?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      running_club_activities: {
        Row: {
          activity_image_url: string | null
          author_initials: string | null
          author_name: string | null
          caption: string | null
          club_id: string
          distance_km: number
          duration_minutes: number
          id: string
          recorded_at: string
          user_id: string
        }
        Insert: {
          activity_image_url?: string | null
          author_initials?: string | null
          author_name?: string | null
          caption?: string | null
          club_id: string
          distance_km: number
          duration_minutes: number
          id?: string
          recorded_at?: string
          user_id: string
        }
        Update: {
          activity_image_url?: string | null
          author_initials?: string | null
          author_name?: string | null
          caption?: string | null
          club_id?: string
          distance_km?: number
          duration_minutes?: number
          id?: string
          recorded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "running_club_activities_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "running_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      running_club_challenge_progress: {
        Row: {
          challenge_id: string
          id: string
          last_updated: string
          total_distance_km: number
          user_id: string
        }
        Insert: {
          challenge_id: string
          id?: string
          last_updated?: string
          total_distance_km?: number
          user_id: string
        }
        Update: {
          challenge_id?: string
          id?: string
          last_updated?: string
          total_distance_km?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "running_club_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "running_club_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      running_club_challenges: {
        Row: {
          active: boolean
          club_id: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          id: string
          start_date: string
          target_distance_km: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          club_id: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          id?: string
          start_date: string
          target_distance_km: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          club_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          id?: string
          start_date?: string
          target_distance_km?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "running_club_challenges_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "running_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      running_club_members: {
        Row: {
          club_id: string
          id: string
          joined_at: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          club_id: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          club_id?: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "running_club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "running_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      running_clubs: {
        Row: {
          city: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          invite_code: string
          name: string
          state: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          invite_code: string
          name: string
          state?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          invite_code?: string
          name?: string
          state?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      store_cart_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          subtotal: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          subtotal: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_cart_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_orders: {
        Row: {
          created_at: string
          id: string
          status: string
          store_id: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          store_id: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          store_id?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          stock: number
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price: number
          stock?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          stock?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_users: {
        Row: {
          created_at: string
          id: string
          role: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_users_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          store_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          store_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          store_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      telemedicina_agendamentos: {
        Row: {
          aluno_id: string
          consulta_link: string | null
          created_at: string
          data_hora: string
          id: string
          profissional_id: string
          profissional_nome: string | null
          status: string
        }
        Insert: {
          aluno_id: string
          consulta_link?: string | null
          created_at?: string
          data_hora: string
          id?: string
          profissional_id: string
          profissional_nome?: string | null
          status?: string
        }
        Update: {
          aluno_id?: string
          consulta_link?: string | null
          created_at?: string
          data_hora?: string
          id?: string
          profissional_id?: string
          profissional_nome?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "telemedicina_agendamentos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "admin_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemedicina_agendamentos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemedicina_agendamentos_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "telemedicina_profissionais"
            referencedColumns: ["id"]
          },
        ]
      }
      telemedicina_profissionais: {
        Row: {
          bio: string | null
          crm_crp: string | null
          disponivel: boolean | null
          foto_url: string | null
          id: string
          nome: string
          preco_base: number | null
          servico_id: string | null
        }
        Insert: {
          bio?: string | null
          crm_crp?: string | null
          disponivel?: boolean | null
          foto_url?: string | null
          id?: string
          nome: string
          preco_base?: number | null
          servico_id?: string | null
        }
        Update: {
          bio?: string | null
          crm_crp?: string | null
          disponivel?: boolean | null
          foto_url?: string | null
          id?: string
          nome?: string
          preco_base?: number | null
          servico_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telemedicina_profissionais_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "telemedicina_servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      telemedicina_servicos: {
        Row: {
          ativo: boolean | null
          icon_url: string | null
          icone: string | null
          id: string
          nome: string
          slug: string
        }
        Insert: {
          ativo?: boolean | null
          icon_url?: string | null
          icone?: string | null
          id?: string
          nome: string
          slug: string
        }
        Update: {
          ativo?: boolean | null
          icon_url?: string | null
          icone?: string | null
          id?: string
          nome?: string
          slug?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
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
      workout_history: {
        Row: {
          activity_type: string
          avg_hr: number | null
          calories: number | null
          created_at: string
          distance_km: number | null
          duration_seconds: number | null
          ended_at: string | null
          equipment: string[] | null
          extras: Json | null
          gps_points: Json | null
          gps_polyline: Json | null
          id: string
          intensity: Json | null
          max_hr: number | null
          notes: string | null
          pace_avg: number | null
          privacy: string
          source: string
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type: string
          avg_hr?: number | null
          calories?: number | null
          created_at?: string
          distance_km?: number | null
          duration_seconds?: number | null
          ended_at?: string | null
          equipment?: string[] | null
          extras?: Json | null
          gps_points?: Json | null
          gps_polyline?: Json | null
          id?: string
          intensity?: Json | null
          max_hr?: number | null
          notes?: string | null
          pace_avg?: number | null
          privacy?: string
          source?: string
          started_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          avg_hr?: number | null
          calories?: number | null
          created_at?: string
          distance_km?: number | null
          duration_seconds?: number | null
          ended_at?: string | null
          equipment?: string[] | null
          extras?: Json | null
          gps_points?: Json | null
          gps_polyline?: Json | null
          id?: string
          intensity?: Json | null
          max_hr?: number | null
          notes?: string | null
          pace_avg?: number | null
          privacy?: string
          source?: string
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          bpm_medio: number | null
          calorias_estimadas: number | null
          club_id: string | null
          confirmado: boolean
          created_at: string
          exercise_name: string
          finalizado_em: string | null
          id: string
          iniciado_em: string
          repetitions: number | null
          series: number | null
          status: string
          target_muscles: string[] | null
          total_reps: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bpm_medio?: number | null
          calorias_estimadas?: number | null
          club_id?: string | null
          confirmado?: boolean
          created_at?: string
          exercise_name: string
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          repetitions?: number | null
          series?: number | null
          status?: string
          target_muscles?: string[] | null
          total_reps?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bpm_medio?: number | null
          calorias_estimadas?: number | null
          club_id?: string | null
          confirmado?: boolean
          created_at?: string
          exercise_name?: string
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          repetitions?: number | null
          series?: number | null
          status?: string
          target_muscles?: string[] | null
          total_reps?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "running_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_profiles_view: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          nome_exibicao: string | null
          plano: Database["public"]["Enums"]["app_plan"] | null
          role: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_list_users: {
        Args: never
        Returns: {
          ativo: boolean
          created_at: string
          display_name: string
          email: string
          id: string
          phone: string
          plan_expires_at: string
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
        }[]
      }
      generate_plan_coupons: {
        Args: { p_plan: string; p_user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_plan: "BASICO" | "SAUDE" | "SAUDE_PRO"
      app_role: "admin" | "moderator" | "user" | "store_owner"
      payment_provider: "pix"
      payment_status: "pending" | "approved" | "rejected"
      subscription_plan: "FREE" | "ADVANCE" | "ELITE"
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
      app_plan: ["BASICO", "SAUDE", "SAUDE_PRO"],
      app_role: ["admin", "moderator", "user", "store_owner"],
      payment_provider: ["pix"],
      payment_status: ["pending", "approved", "rejected"],
      subscription_plan: ["FREE", "ADVANCE", "ELITE"],
    },
  },
} as const
