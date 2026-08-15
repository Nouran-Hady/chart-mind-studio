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
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: Json
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: Json
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: Json
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          dataset_id: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dataset_id: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dataset_id?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets: {
        Row: {
          column_count: number
          created_at: string
          file_size: number | null
          filename: string
          full_rows: Json
          id: string
          missing_values: number | null
          name: string
          row_count: number
          sample_rows: Json
          schema_json: Json
          summary: string | null
          user_id: string
        }
        Insert: {
          column_count?: number
          created_at?: string
          file_size?: number | null
          filename: string
          full_rows?: Json
          id?: string
          missing_values?: number | null
          name: string
          row_count?: number
          sample_rows?: Json
          schema_json?: Json
          summary?: string | null
          user_id: string
        }
        Update: {
          column_count?: number
          created_at?: string
          file_size?: number | null
          filename?: string
          full_rows?: Json
          id?: string
          missing_values?: number | null
          name?: string
          row_count?: number
          sample_rows?: Json
          schema_json?: Json
          summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          document_version: number
          id: string
          section: string | null
          token_estimate: number
          user_id: string
          vector_id: string | null
          version_id: string | null
        }
        Insert: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id: string
          document_version?: number
          id?: string
          section?: string | null
          token_estimate?: number
          user_id: string
          vector_id?: string | null
          version_id?: string | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          document_version?: number
          id?: string
          section?: string | null
          token_estimate?: number
          user_id?: string
          vector_id?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_chunks_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          created_at: string
          created_by_email: string | null
          document_id: string
          id: string
          markdown: string
          note: string | null
          status: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by_email?: string | null
          document_id: string
          id?: string
          markdown?: string
          note?: string | null
          status?: string
          updated_at?: string
          user_id: string
          version: number
        }
        Update: {
          created_at?: string
          created_by_email?: string | null
          document_id?: string
          id?: string
          markdown?: string
          note?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          active_version: number | null
          chunk_count: number
          created_at: string
          current_version: number
          extraction_status: string
          file_size: number
          file_type: string
          filename: string
          id: string
          ingestion_error: string | null
          ingestion_progress: Json
          ingestion_status: string
          metadata: Json
          name: string
          original_content: string
          review_status: string
          source_type: string
          updated_at: string
          user_id: string
          vector_count: number
          vector_index: string | null
          vector_namespace: string | null
        }
        Insert: {
          active_version?: number | null
          chunk_count?: number
          created_at?: string
          current_version?: number
          extraction_status?: string
          file_size?: number
          file_type?: string
          filename: string
          id?: string
          ingestion_error?: string | null
          ingestion_progress?: Json
          ingestion_status?: string
          metadata?: Json
          name: string
          original_content?: string
          review_status?: string
          source_type?: string
          updated_at?: string
          user_id: string
          vector_count?: number
          vector_index?: string | null
          vector_namespace?: string | null
        }
        Update: {
          active_version?: number | null
          chunk_count?: number
          created_at?: string
          current_version?: number
          extraction_status?: string
          file_size?: number
          file_type?: string
          filename?: string
          id?: string
          ingestion_error?: string | null
          ingestion_progress?: Json
          ingestion_status?: string
          metadata?: Json
          name?: string
          original_content?: string
          review_status?: string
          source_type?: string
          updated_at?: string
          user_id?: string
          vector_count?: number
          vector_index?: string | null
          vector_namespace?: string | null
        }
        Relationships: []
      }
      insights: {
        Row: {
          chart_config: Json | null
          chart_type: string | null
          created_at: string
          dataset_id: string
          id: string
          insight_text: string | null
          question: string
          thread_id: string | null
          user_id: string
        }
        Insert: {
          chart_config?: Json | null
          chart_type?: string | null
          created_at?: string
          dataset_id: string
          id?: string
          insight_text?: string | null
          question: string
          thread_id?: string | null
          user_id: string
        }
        Update: {
          chart_config?: Json | null
          chart_type?: string | null
          created_at?: string
          dataset_id?: string
          id?: string
          insight_text?: string | null
          question?: string
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insights_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      pinned_charts: {
        Row: {
          chart_config: Json
          created_at: string
          dataset_id: string
          id: string
          note: string | null
          thread_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          chart_config: Json
          created_at?: string
          dataset_id: string
          id?: string
          note?: string | null
          thread_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          chart_config?: Json
          created_at?: string
          dataset_id?: string
          id?: string
          note?: string | null
          thread_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_charts_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_charts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
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
