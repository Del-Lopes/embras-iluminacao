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

export type ProductStatus = 'draft' | 'published'

export type ProductEnvironment = 'interno' | 'externo'

// ----------------------------------------------------------------
// 3D model — AR config + material variations (color/texture)
// ----------------------------------------------------------------
export type Model3dObjectType = 'floor' | 'wall' // ar-placement
export type Model3dArScale = 'fixed' | 'auto' // ar-scale
export type Model3dVariationType = 'color' | 'texture'

// One selectable variation bound to a technical material of the GLB.
export type Model3dVariation = {
  material: string // technical material name (exact, from the GLB)
  name: string // label shown in the selector (e.g. "Azul")
  type: Model3dVariationType
  color?: string | null // HEX when type === 'color'
  texture_url?: string | null // R2 URL when type === 'texture'
}

// Map of technical material name -> friendly group name (e.g. "Metal").
export type Model3dMaterialLabels = Record<string, string>

// ----------------------------------------------------------------
// TABLE ROW TYPES (shape returned by Supabase SELECT)
// ----------------------------------------------------------------
export type Profile = {
  id: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  bio: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Category = {
  id: string
  name: string
  slug: string
  description: string | null
  // NULL = categoria pré-existente à migration 013. O editor não
  // pode excluir essas; só as que ele mesmo criou.
  created_by: string | null
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
// CATALOG — Product tables
// ----------------------------------------------------------------
export type ProductCategory = {
  id: string
  name: string
  slug: string
  parent_id: string | null
  description: string | null
  sort_order: number
  created_at: string
}

// Linha da tabela "Informações Técnicas" (flexível): rótulo + valor.
export type ProductTechSpec = { label: string; value: string }

export type Product = {
  id: string
  name: string
  slug: string
  sku: string
  description: string | null
  short_description: string | null
  cover_image: string | null
  status: ProductStatus
  environment: ProductEnvironment
  primary_material: string | null
  // Aba "Informações Técnicas" (linhas rótulo/valor flexíveis)
  tech_specs: ProductTechSpec[] | null
  // Aba "Aplicações" (texto)
  applications: string | null
  // Aba "Arquivos para download" — 3 slots (URL no R2 + nome original)
  datasheet_url: string | null
  datasheet_filename: string | null
  ies_url: string | null
  ies_filename: string | null
  certificates_url: string | null
  certificates_filename: string | null
  // technical specs
  height_cm: number | null
  width_cm: number | null
  depth_cm: number | null
  weight_kg: number | null
  materials: string[] | null
  socket_type: string | null
  // 3D model fields (populated in Wave C7)
  has_3d_model: boolean
  model_3d_url: string | null
  model_3d_poster: string | null
  model_3d_alt: string | null
  model_3d_filename: string | null // original uploaded file name (migration 009)
  // 3D AR config + material variations (migration 008)
  model_3d_object_type: Model3dObjectType | null
  model_3d_ar_scale: Model3dArScale | null
  model_3d_material_labels: Model3dMaterialLabels | null
  model_3d_variations: Model3dVariation[] | null
  // seo + audit
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string[] | null
  author_id: string
  published_at: string | null
  created_at: string
  updated_at: string
}

// is_primary: marca a categoria PRINCIPAL do produto (exibida no card).
export type ProductCategoryMap = {
  product_id: string
  category_id: string
  is_primary: boolean
}

export type ProductImage = {
  id: string
  product_id: string
  url: string
  alt: string | null
  sort_order: number
  created_at: string
}

// Características cadastráveis: hoje só materiais, que são o filtro do
// catálogo. O tipo 'soquete' saiu por deixar de ser filtro, e quem precisar
// informá-lo usa uma linha livre em "Informações técnicas".
// (O enum no banco ainda tem os valores legados material_principal,
// material_secundario e soquete, mas nenhuma linha os usa.)
export type ProductCharacteristicType = 'material'

export type ProductCharacteristic = {
  id: string
  type: ProductCharacteristicType
  name: string
  slug: string
  sort_order: number
  created_at: string
}

// is_primary: marca o material PRINCIPAL do produto (exibido no card). Os
// secundários têm is_primary=false.
export type ProductCharacteristicMap = {
  product_id: string
  characteristic_id: string
  is_primary: boolean
}

// Rótulo reutilizável da tabela "Informações Técnicas" (ex.: "Tensão").
// É só um catálogo de sugestões para o editor: o valor de cada produto
// continua em products.tech_specs, então não há tabela de ligação e apagar
// um rótulo daqui não afeta produto nenhum.
// `normalized` é a forma sem acento/caixa que carrega o UNIQUE, e é o que
// impede "Tensão" e "tensao" de virarem dois registros.
export type ProductSpecLabel = {
  id: string
  name: string
  normalized: string
  sort_order: number
  created_at: string
}

// Preset de VALOR (ex.: 220V). Mesma forma do rótulo, regra de entrada
// diferente: o usuário não escolhe salvar — a função promote_product_spec_values
// promove sozinha o que já foi usado em 10 produtos distintos. O cadastro
// manual pela página de admin continua valendo, sem depender da contagem.
export type ProductSpecValue = {
  id: string
  name: string
  normalized: string
  // Rótulo a que o valor pertence, na forma normalizada. É o que faz a
  // sugestão ser em cascata: ao preencher "Tensão" só aparecem valores
  // daquele rótulo, e não tudo que já foi digitado no catálogo.
  // Guarda o texto normalizado e não uma FK, porque o rótulo de um produto
  // pode existir sem estar cadastrado como preset.
  label_normalized: string
  sort_order: number
  created_at: string
}

// ----------------------------------------------------------------
// PORTFOLIO — Project tables (galeria de projetos exibida na home)
// ----------------------------------------------------------------
export type ProjectStatus = 'draft' | 'published'

export type Project = {
  id: string
  name: string
  slug: string
  location: string | null // ex.: "São Paulo"
  // Quando o projeto foi feito. Texto livre porque costuma ser aproximado
  // ("Março de 2024", "2023"); serve para exibição, não para cálculo.
  project_date: string | null
  description: string | null // texto explicativo (plain text)
  cover_image: string | null
  status: ProjectStatus
  // Destaque na home: os projetos marcados aparecem no grid principal da
  // seção "Projetos", que tem 5 posições. Os demais viram cards menores /
  // listagem.
  is_featured: boolean
  // Posição no grid da home (1 a 5, ou null quando não é destaque). 1 é o card
  // grande à esquerda; 2 a 5 são os menores à direita, lidos em coluna. As
  // posições sem destaque são preenchidas pelos projetos mais antigos.
  home_position: number | null
  author_id: string
  published_at: string | null
  created_at: string
  updated_at: string
}

// Álbum de fotos do projeto — mesma forma de ProductImage.
export type ProjectImage = {
  id: string
  project_id: string
  url: string
  alt: string | null
  sort_order: number
  created_at: string
}

// ----------------------------------------------------------------
// INSERT PAYLOADS (omit DB-generated fields)
// ----------------------------------------------------------------
export type InsertPost = Omit<Post, 'id' | 'created_at' | 'updated_at'>

// created_by é opcional: a coluna aceita NULL e nem todo caminho de
// criação tem um usuário (a automação insere categorias sem sessão).
export type InsertCategory = Omit<Category, 'id' | 'created_at' | 'created_by'> & {
  created_by?: string | null
}

export type InsertAiLog = Omit<AiAutomationLog, 'id' | 'generation_date'>

// DB-defaulted columns (status, environment, has_3d_model) are optional on insert.
export type InsertProduct = Omit<
  Product,
  'id' | 'created_at' | 'updated_at' | 'status' | 'environment' | 'has_3d_model'
> & {
  status?: ProductStatus
  environment?: ProductEnvironment
  has_3d_model?: boolean
}

// sort_order has a DB default → optional on insert.
export type InsertProductCategory = Omit<
  ProductCategory,
  'id' | 'created_at' | 'sort_order'
> & {
  sort_order?: number
}

// sort_order has a DB default → optional on insert.
export type InsertProductImage = Omit<
  ProductImage,
  'id' | 'created_at' | 'sort_order'
> & {
  sort_order?: number
}

// sort_order has a DB default → optional on insert.
export type InsertProductCharacteristic = Omit<
  ProductCharacteristic,
  'id' | 'created_at' | 'sort_order'
> & {
  sort_order?: number
}

export type InsertProductSpecLabel = Omit<
  ProductSpecLabel,
  'id' | 'created_at' | 'sort_order'
> & {
  sort_order?: number
}

export type InsertProductSpecValue = Omit<
  ProductSpecValue,
  'id' | 'created_at' | 'sort_order'
> & {
  sort_order?: number
}

// status e is_featured têm default no banco → opcionais no insert.
export type InsertProject = Omit<
  Project,
  'id' | 'created_at' | 'updated_at' | 'status' | 'is_featured'
> & {
  status?: ProjectStatus
  is_featured?: boolean
}

// sort_order has a DB default → optional on insert.
export type InsertProjectImage = Omit<
  ProjectImage,
  'id' | 'created_at' | 'sort_order'
> & {
  sort_order?: number
}

// ----------------------------------------------------------------
// UPDATE PAYLOADS (all fields optional except discriminator)
// ----------------------------------------------------------------
export type UpdatePost = Partial<InsertPost>

export type UpdateProduct = Partial<InsertProduct>

export type UpdateProductCategory = Partial<InsertProductCategory>

export type UpdateProject = Partial<InsertProject>

// ----------------------------------------------------------------
// JOINED / ENRICHED TYPES (used in UI)
// ----------------------------------------------------------------
export type PostWithRelations = Post & {
  author: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
  category: Pick<Category, 'id' | 'name' | 'slug'>
}

export type ProductWithRelations = Product & {
  author: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
  categories: Pick<ProductCategory, 'id' | 'name' | 'slug'>[]
  images: Pick<ProductImage, 'id' | 'url' | 'alt' | 'sort_order'>[]
}

export type ProjectWithRelations = Project & {
  author: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
  images: Pick<ProjectImage, 'id' | 'url' | 'alt' | 'sort_order'>[]
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
// SITE SETTINGS — configurações gerais do site (linha única, id=1)
// ----------------------------------------------------------------
export type SiteSettings = {
  id: number
  catalog_url: string | null // URL pública (R2) do PDF do catálogo
  catalog_filename: string | null // nome original do arquivo enviado
  updated_at: string
}

export type UpdateSiteSettings = Partial<Pick<SiteSettings, 'catalog_url' | 'catalog_filename'>>

// ----------------------------------------------------------------
// LEADS — capturados no popup de download de arquivos do produto
// ----------------------------------------------------------------
export type LeadFileType = 'datasheet' | 'ies' | 'certificates'

export type Lead = {
  id: string
  product_id: string | null // set null se o produto for excluído
  product_name: string | null // denormalizado (sobrevive à exclusão do produto)
  file_type: LeadFileType
  name: string
  email: string
  phone: string | null
  created_at: string
}

export type InsertLead = Omit<Lead, 'id' | 'created_at'>

// ----------------------------------------------------------------
// SUPABASE DATABASE SHAPE (for createClient generic)
// Must include Views, Functions, CompositeTypes for full type inference.
// ----------------------------------------------------------------
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        // avatar_url, bio e is_active têm default no banco — exigi-los
        // no insert obrigaria todo chamador a repetir null/true.
        Insert: Omit<Profile, 'created_at' | 'updated_at' | 'avatar_url' | 'bio' | 'is_active'> &
          Partial<Pick<Profile, 'avatar_url' | 'bio' | 'is_active'>>
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
      automation_settings: {
        Row: AutomationSettings
        Insert: Omit<AutomationSettings, 'id' | 'updated_at'>
        Update: Partial<Omit<AutomationSettings, 'id'>>
        Relationships: []
      }
      automation_daily_runs: {
        Row: AutomationDailyRun
        Insert: Pick<AutomationDailyRun, 'run_date' | 'run_type' | 'posts_target'> &
          Partial<Pick<AutomationDailyRun, 'posts_created' | 'completed' | 'last_attempt_at'>>
        Update: Partial<Omit<AutomationDailyRun, 'id' | 'created_at'>>
        Relationships: []
      }
      automation_city_history: {
        Row: AutomationCityHistory
        Insert: Omit<AutomationCityHistory, 'id'>
        Update: Partial<Omit<AutomationCityHistory, 'id'>>
        Relationships: []
      }
      product_categories: {
        Row: ProductCategory
        Insert: InsertProductCategory
        Update: UpdateProductCategory
        Relationships: []
      }
      products: {
        Row: Product
        Insert: InsertProduct
        Update: UpdateProduct
        Relationships: []
      }
      product_category_map: {
        Row: ProductCategoryMap
        Insert: Omit<ProductCategoryMap, 'is_primary'> & { is_primary?: boolean }
        Update: Partial<ProductCategoryMap>
        Relationships: []
      }
      product_images: {
        Row: ProductImage
        Insert: InsertProductImage
        Update: Partial<InsertProductImage>
        Relationships: []
      }
      product_characteristics: {
        Row: ProductCharacteristic
        Insert: InsertProductCharacteristic
        Update: Partial<InsertProductCharacteristic>
        Relationships: []
      }
      product_spec_labels: {
        Row: ProductSpecLabel
        Insert: InsertProductSpecLabel
        Update: Partial<InsertProductSpecLabel>
        Relationships: []
      }
      product_spec_values: {
        Row: ProductSpecValue
        Insert: InsertProductSpecValue
        Update: Partial<InsertProductSpecValue>
        Relationships: []
      }
      product_characteristic_map: {
        Row: ProductCharacteristicMap
        Insert: Omit<ProductCharacteristicMap, 'is_primary'> & { is_primary?: boolean }
        Update: Partial<ProductCharacteristicMap>
        Relationships: []
      }
      projects: {
        Row: Project
        Insert: InsertProject
        Update: UpdateProject
        Relationships: []
      }
      project_images: {
        Row: ProjectImage
        Insert: InsertProjectImage
        Update: Partial<InsertProjectImage>
        Relationships: []
      }
      site_settings: {
        Row: SiteSettings
        Insert: Partial<SiteSettings> & { id?: number }
        Update: Partial<Omit<SiteSettings, 'id'>>
        Relationships: []
      }
      leads: {
        Row: Lead
        Insert: InsertLead
        Update: Partial<InsertLead>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      // Promove a preset todo valor de tech_specs já usado em `min_uses`
      // produtos distintos. Retorna quantos foram inseridos nesta chamada.
      promote_product_spec_values: {
        Args: { min_uses: number }
        Returns: number
      }
      // Exposta para o teste de paridade com o normalizeLabel do TypeScript.
      normalize_spec_text: {
        Args: { t: string }
        Returns: string
      }
    }
    CompositeTypes: Record<string, never>
    Enums: {
      user_role: UserRole
      post_status: PostStatus
      product_status: ProductStatus
      product_environment: ProductEnvironment
      product_characteristic_type: ProductCharacteristicType
      project_status: ProjectStatus
    }
  }
}
