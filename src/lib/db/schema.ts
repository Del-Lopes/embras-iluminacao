// ============================================================
// schema.ts — Database TypeScript types (mirrors Supabase schema)
// All types use `type` (not `interface`) per RULES.md
// ============================================================

// ----------------------------------------------------------------
// ENUMS
// ----------------------------------------------------------------
export type UserRole = 'admin' | 'editor' | 'ai_bot'

export type PostStatus =
  | 'draft'
  | 'published'
  | 'scheduled'
  | 'ai_generating'
  | 'review_required'

// ----------------------------------------------------------------
// TABLE ROW TYPES (shape returned by Supabase SELECT)
// ----------------------------------------------------------------
export type Profile = {
  id: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  bio: string | null
  created_at: string
  updated_at: string
}

export type Category = {
  id: string
  name: string
  slug: string
  description: string | null
  created_at: string
}

export type Post = {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  cover_image: string | null
  author_id: string
  category_id: string
  status: PostStatus
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string[] | null
  image_prompt: string | null
  source_url: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export type AiAutomationLog = {
  id: string
  post_id: string | null
  prompt_used: string
  model_version: string
  token_usage: number | null
  raw_response: Record<string, unknown> | null
  generation_date: string
}

// ----------------------------------------------------------------
// INSERT PAYLOADS (omit DB-generated fields)
// ----------------------------------------------------------------
export type InsertPost = Omit<Post, 'id' | 'created_at' | 'updated_at'>

export type InsertCategory = Omit<Category, 'id' | 'created_at'>

export type InsertAiLog = Omit<AiAutomationLog, 'id' | 'generation_date'>

// ----------------------------------------------------------------
// UPDATE PAYLOADS (all fields optional except discriminator)
// ----------------------------------------------------------------
export type UpdatePost = Partial<InsertPost>

// ----------------------------------------------------------------
// JOINED / ENRICHED TYPES (used in UI)
// ----------------------------------------------------------------
export type PostWithRelations = Post & {
  author: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
  category: Pick<Category, 'id' | 'name' | 'slug'>
}

// ----------------------------------------------------------------
// AUTOMATION — Wave 6 types
// ----------------------------------------------------------------
export type AutomationSettings = {
  id: string
  cron_start_hour: number      // 0–23 (Brasília local hour)
  cron_start_minute: number    // 0–59
  active_days: number[]        // 0=Sun … 6=Sat
  news_posts_per_day: number
  sales_posts_per_day: number
  post_interval_hours: number  // 1–23 — hours between each scheduled slot
  is_enabled: boolean
  updated_at: string
}

export type AutomationDailyRun = {
  id: string
  run_date: string             // YYYY-MM-DD
  run_type: 'news' | 'sales'
  posts_created: number
  posts_target: number
  completed: boolean
  last_attempt_at: string
  created_at: string
}

export type AutomationCityHistory = {
  id: string
  city: string
  state: string
  state_code: string
  region: string
  last_used_date: string | null
  usage_count: number
}

export type UpdateAutomationSettings = Omit<AutomationSettings, 'id' | 'updated_at'>

// ----------------------------------------------------------------
// SUPABASE DATABASE SHAPE (for createClient generic)
// Must include Views, Functions, CompositeTypes for full type inference.
// ----------------------------------------------------------------
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id'>>
        Relationships: []
      }
      categories: {
        Row: Category
        Insert: InsertCategory
        Update: Partial<InsertCategory>
        Relationships: []
      }
      posts: {
        Row: Post
        Insert: InsertPost
        Update: UpdatePost
        Relationships: []
      }
      ai_automation_logs: {
        Row: AiAutomationLog
        Insert: InsertAiLog
        Update: Partial<InsertAiLog>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    CompositeTypes: Record<string, never>
    Enums: {
      user_role: UserRole
      post_status: PostStatus
    }
  }
}
