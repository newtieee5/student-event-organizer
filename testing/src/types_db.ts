export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          username: string | null
          full_name: string | null
          avatar_url: string | null
          website: string | null
        }
        Insert: {
          id: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
        }
        Update: {
          id?: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      // Add other tables as needed
      events: {
        Row: {
          id: string
          created_at: string
          user_id: string
          title: string
          description: string | null
          date: string
          time: string
          location: string | null
          type: 'Academic' | 'Social' | 'Personal' | 'Work' | 'Organizer' | null
          priority: 'Low' | 'Medium' | 'High' | null
          total_budget: number | null
          total_spent: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          title: string
          description?: string | null
          date: string
          time: string
          location?: string | null
          type?: 'Academic' | 'Social' | 'Personal' | 'Work' | 'Organizer' | null
          priority?: 'Low' | 'Medium' | 'High' | null
          total_budget?: number | null
          total_spent?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          title?: string
          description?: string | null
          date?: string
          time?: string
          location?: string | null
          type?: 'Academic' | 'Social' | 'Personal' | 'Work' | 'Organizer' | null
          priority?: 'Low' | 'Medium' | 'High' | null
          total_budget?: number | null
          total_spent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      },
      tasks: {
        Row: {
          id: string
          created_at: string
          event_id: string
          title: string
          completed: boolean | null
          deadline: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          event_id: string
          title: string
          completed?: boolean | null
          deadline?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          event_id?: string
          title?: string
          completed?: boolean | null
          deadline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      },
      registrations: {
        Row: {
          id: string
          created_at: string
          event_id: string
          user_id: string
          status: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          event_id: string
          user_id: string
          status?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          event_id?: string
          user_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      },
      budget_items: {
        Row: {
          id: string
          created_at: string
          event_id: string
          description: string
          amount: number
          paid: boolean | null
          category: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          event_id: string
          description: string
          amount: number
          paid?: boolean | null
          category?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          event_id?: string
          description?: string
          amount?: number
          paid?: boolean | null
          category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
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
