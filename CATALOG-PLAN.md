# CATALOG-PLAN.md — Embras / Catálogo de Produtos

> Plano de execução para o **Catálogo de Amostra Embras** (listing + página de produto + área de produtos no painel admin).
> Reaproveita a stack, os padrões e os componentes já existentes do blog. **Não** introduz compra, carrinho ou preço — é um catálogo de amostra.
> Complementa o [PLAN.md](PLAN.md) (blog/dashboard, já implementado). Mesma stack, mesmos padrões de Server Actions + Supabase + RLS.

## Project Snapshot (delta sobre o PLAN.md)

| Item | Detalhe |
|------|--------|
| Reuso direto | `(admin)` route group, `Sidebar`, `RichTextField` (TipTap), `ImageUpload`, `Table` UI, padrão `getPosts`/`PostDataTable`, padrão SSR de `blog/page.tsx` e `blog/[slug]/page.tsx` |
| Novo no público | `/catalogo` (listing) + `/catalogo/[slug]` (produto) |
| Novo no admin | Seletor de área (Blog ↔ Produtos) no topo da sidebar; rotas `/admin/products/*` e `/admin/product-categories` |
| Novas tabelas | `products`, `product_categories`, `product_category_map`, `product_images` |
| Storage | **Cloudflare R2 (S3, 10 GB)** para imagens de produto — upload via **presigned URL** gerada server-side. Substitui o bucket Supabase **somente para produtos** (blog mantém `cover-images` no Supabase) |
| 3D (futuro) | Colunas já presentes no schema; `<model-viewer>` carregado só na página de produto numa etapa final; `.glb` também no R2 |
| Sem mudança | Auth, RLS pattern, AI infra, automação do blog, storage do blog (`cover-images`) — intocados |

**Princípio de isolamento:** Blog e Produtos compartilham o mesmo painel (mesmo layout, mesma sidebar, mesmo estilo visual) mas operam em tabelas e rotas independentes. Nenhuma query cruza os dois domínios.

---

## Segurança — padrões validados a herdar (não reinventar)

Todo o catálogo **reusa os gates já validados na plataforma**. Nenhum mecanismo de auth/authz novo é criado.

| Controle já validado | Onde está hoje | Como o catálogo herda |
|----------------------|----------------|------------------------|
| Sessão via cookie `httpOnly`+`sameSite=lax`+`secure` (VULN-004) | `middleware.ts`, `supabase-server.ts` | Inalterado — rotas `/admin/products/*` já caem no `matcher: ['/admin/:path*']` |
| `getUser()` (valida token no Auth server; **nunca** `getSession()`) | `middleware.ts` | Toda Server Action de produto começa com `getUser()` |
| Authz por `profiles.role` (admin/editor) + ownership por `author_id` | `admin.actions.ts` (`deletePostAction`, `bulkDelete…`) | `product.actions.ts` copia o mesmo padrão verbatim |
| RLS: anon lê só `status='published'`; escrita admin/editor; service-role isolado | `posts` policies, `supabase-admin.ts` | Tabelas de produto recebem policies idênticas |
| Credenciais server-only (nunca `NEXT_PUBLIC_*`, nunca no browser) | `supabase-admin.ts` (service-role) | **Credenciais R2 seguem o mesmo isolamento** (ver Wave C1.5) |
| Validação de upload: allowlist MIME + 5 MB | `image-upload.tsx` | Mantida — agora **revalidada no servidor** antes do presign |
| `author_id` server-side a partir da sessão (nunca do payload) | `createPostAction` | Idêntico em `createProductAction` |

> ⚠️ **Risco específico do R2:** diferente do Supabase Storage, o R2 **não tem RLS**. Portanto o padrão atual (browser → Supabase com anon key) **não pode** ser replicado expondo credenciais S3 ao cliente. A tradução segura é **presigned URL emitida por Server Action atrás do mesmo gate `getUser()` + role** — detalhada na Wave C1.5.

---

## Decisões de modelagem (resolver antes da Wave 1)

As três facetas de filtro do listing são fixas e distintas do conceito de "categorias em cascata" do cadastro. Modelagem recomendada:

| Faceta do filtro | Modelagem | Justificativa |
|------------------|-----------|---------------|
| **Área de uso (Interno/Externo)** | coluna `environment` enum (`'interno' \| 'externo'`) em `products` | Atributo do produto (área de uso), não um nó de categoria. Ex.: filtrar "luminária de área externa" |
| **Tipo de produto** | FK `product_categories` (árvore hierárquica via `parent_id`) | É o eixo "cascata" do cadastro ("podem ser várias em cascata") |
| **Material** | coluna `primary_material` (texto, indexada) para o filtro + `materials text[]` nas specs para exibição | Filtro usa material principal; ficha técnica lista todos |

> **Filtros acumulam (AND).** Selecionar mais de uma faceta restringe o resultado pela interseção — ex.: `environment=interno` **E** `tipo=luminária` **E** `material=aço` retorna só produtos que satisfazem as três. Cada faceta vira um `.eq()` adicional na query (mesmo padrão de `getPosts`).

- **Categorias em cascata (cadastro):** árvore `product_categories(parent_id)` + join `product_category_map` (N:N). Um produto pode receber várias categorias da árvore; "Tipo de produto" do filtro = categorias raiz/folha conforme nível.
- **3D:** colunas nullable já criadas na Wave 1 (`has_3d_model`, `model_3d_url`, `model_3d_poster`, `model_3d_alt`). UI de cadastro 3D fica atrás de um switcher e é preenchida numa etapa futura.

---

## Wave C1 — Schema & Tipos do Catálogo

**Objetivo:** Tabelas, RLS, tipos TS e bucket de Storage. Espelha o padrão de `src/lib/db/schema.ts`.

### Arquivos
| Arquivo | Propósito |
|---------|-----------|
| `supabase/migrations/00X_catalog_schema.sql` | CREATE TABLE + índices + RLS + bucket policies |
| `src/lib/db/schema.ts` (estender) | Tipos `Product`, `ProductCategory`, `ProductImage`, inserts/updates, `ProductWithRelations`, adicionar tabelas ao `Database` |

### Schema
```
product_categories  id, name, slug(unique), parent_id(FK→self, null=raiz),
                    description, sort_order, created_at

products            id, name, slug(unique), sku(unique), description(html),
                    cover_image, status(enum: draft|published),
                    environment(enum: interno|externo),
                    primary_material,
                    height_cm, width_cm, depth_cm, weight_kg,
                    materials text[], socket_type,
                    -- campos 3D (nullable, etapa futura) --
                    has_3d_model bool default false,
                    model_3d_url, model_3d_poster, model_3d_alt,
                    -- seo + auditoria --
                    seo_title, seo_description, seo_keywords text[],
                    author_id(FK→profiles), published_at,
                    created_at, updated_at

product_category_map  product_id(FK→products CASCADE),
                      category_id(FK→product_categories CASCADE),
                      PRIMARY KEY(product_id, category_id)

product_images      id, product_id(FK→products CASCADE),
                    url, alt, sort_order, created_at   -- carrossel vertical
```

### Índices
- `products(slug)`, `products(sku)` unique
- `products(status, environment)`, `products(primary_material)` — filtros do listing
- `product_images(product_id, sort_order)` — ordem do carrossel
- `product_categories(parent_id, sort_order)`

### RLS (espelha o padrão de `posts`)
- `product_categories`: leitura pública; escrita admin/editor
- `products`: anon lê `status='published'`; admin/editor escrita total
- `product_category_map` / `product_images`: leitura pública; escrita admin/editor

> `product_images.url` guarda a **URL pública de leitura do R2** (domínio de leitura dedicado), nunca caminho com credencial. O upload em si é tratado na Wave C1.5.

### Checklist
- [ ] SQL roda sem erro no Supabase SQL editor
- [ ] Anon não lê produto `status != 'published'`
- [ ] FK CASCADE: deletar produto remove suas `product_images` e `product_category_map`
- [ ] Tipos TS batem coluna a coluna com o banco

---

## Wave C1.5 — Storage seguro em Cloudflare R2 (S3)

**Objetivo:** Upload de imagens de produto no R2 (10 GB) **sem nunca expor credenciais ao browser**, atrás do mesmo gate de auth já validado. Pré-requisito para o upload da Wave C4.

### Por que presigned URL (e não copiar o padrão Supabase)
O upload atual do blog vai `browser → Supabase Storage` usando a **anon key + RLS no bucket**. O R2 não tem RLS — se a anon/access key do R2 fosse para o browser, qualquer pessoa poderia escrever/apagar os 10 GB. Logo, o cliente **nunca** recebe credencial: ele pede ao servidor uma **URL pré-assinada de PUT** (TTL curto, escopo de 1 objeto), faz o `PUT` direto no R2 e só então registra a URL pública no banco. Isso também contorna o limite de body de 4,5 MB de funções serverless (o arquivo não passa pelo servidor).

### Arquivos
| Arquivo | Propósito |
|---------|-----------|
| `src/lib/storage/r2-client.ts` | Cliente S3 do R2 — **server-only**, isolado igual `supabase-admin.ts` (lança erro se faltar env; comentário "NEVER import in Client Components") |
| `src/server/upload.actions.ts` | `getProductUploadUrl(input)` Server Action: `getUser()` → checa role admin/editor → valida MIME/tamanho → gera key aleatória → retorna presigned PUT URL (TTL 60 s) + URL pública final |
| `src/components/admin/r2-upload.tsx` | Componente client (molde `image-upload.tsx`): pede a URL à action, faz `PUT` no R2, devolve a URL pública. Mesma UX (5 MB, MIME, preview, remover) |

### Modelo de segurança (todas obrigatórias)
- **Credenciais R2 só no servidor:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` — **sem prefixo `NEXT_PUBLIC_`**, importadas apenas em `r2-client.ts`. Mesmo isolamento de `SUPABASE_SERVICE_ROLE_KEY`.
- **Presign atrás do gate validado:** a action **começa** com `getUser()` + checagem de `profiles.role ∈ {admin, editor}` (igual às actions atuais). Anon ou sessão inválida → rejeita antes de assinar.
- **Validação server-side antes de assinar:** MIME na allowlist (`image/jpeg|png|webp`) e `contentLength` ≤ 5 MB recebidos como input e **fixados na assinatura** (`Content-Type` + `Content-Length` casados), para o PUT não poder enviar outra coisa.
- **Key gerada no servidor:** `products/{uuid}.{ext}` — nunca um caminho vindo do cliente (previne overwrite e path traversal). Bucket **não** lista para o cliente.
- **TTL curto:** presigned URL expira em ~60 s e serve um único PUT.
- **Bucket sem escrita pública:** escrita só via presign; **leitura** pública por domínio de leitura dedicado (R2 public bucket / custom domain) — somente GET.
- **CORS do R2 restrito** à origem do site (PUT/GET apenas), não `*`.
- **Delete via servidor:** remoção de objeto só por Server Action gated (nunca credencial no cliente). Listagem de imagens do produto vem da tabela `product_images`, **não** do bucket (diferente do `StorageManager` atual, que lista o bucket Supabase — esse padrão **não** é replicado para o R2).
- **Dependência nova:** `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (SDK S3 padrão; R2 é S3-compatível).

### Checklist
- [ ] `R2_*` ausentes → `r2-client.ts` lança erro no boot (igual `supabase-admin.ts`)
- [ ] Nenhuma var R2 tem prefixo `NEXT_PUBLIC_`; grep no bundle do cliente não acha a secret
- [ ] `getProductUploadUrl` sem sessão → rejeitado; com role inválida → rejeitado
- [ ] PUT com `Content-Type` fora da allowlist → recusado pela assinatura
- [ ] PUT acima de 5 MB → recusado pela assinatura
- [ ] Key é gerada no servidor; cliente não consegue definir o caminho do objeto
- [ ] Presigned URL expira (~60 s) e não permite um segundo uso
- [ ] CORS do bucket limitado à origem do site (não `*`)
- [ ] Leitura pública funciona; escrita pública direta (sem presign) é negada
- [ ] Upload de capa/galeria persiste a **URL pública** em `products.cover_image` / `product_images.url`

---

## Wave C2 — Seletor de Área + Categorias de Produto (Admin)

**Objetivo:** Adicionar o switch Blog↔Produtos na sidebar e o CRUD de categorias de produto (com hierarquia).

### Arquivos
| Arquivo | Propósito |
|---------|-----------|
| `src/components/admin/area-switcher.tsx` | Toggle "Blog / Produtos" no topo da sidebar (client, lê pathname) |
| `src/components/admin/sidebar.tsx` (estender) | Nav condicional por área; mantém estilo atual |
| `src/app/(admin)/admin/products/product-categories/page.tsx` | Painel de categorias de produto |
| `src/components/admin/product-categories-manager.tsx` | UI em árvore (parent → filhos) — molde em `categories-manager.tsx` |
| `src/server/product-category.actions.ts` | `createProductCategory`, `deleteProductCategory` (bloqueia se houver produtos vinculados) — molde em `category.actions.ts` |

### Comportamento
- Sidebar mostra **dois conjuntos de nav** conforme área ativa (derivada do pathname `/admin/products*` vs resto):
  - **Blog:** itens atuais (Dashboard, Categorias, Criação…) — inalterados
  - **Produtos:** Dashboard de Produtos, Novo Produto, Categorias de Produto
- Categoria suporta `parent_id` (cascata): criar subcategoria escolhendo um pai.

### Checklist
- [ ] Switcher alterna nav sem recarregar contexto do outro domínio
- [ ] Criar categoria raiz e subcategoria (parent_id) funciona
- [ ] Excluir categoria com produtos vinculados é bloqueado (igual ao blog)
- [ ] Estilo visual idêntico ao da sidebar atual

---

## Wave C3 — Dashboard de Produtos (lista, filtros, ordenação, bulk)

**Objetivo:** Tabela admin de produtos. Molde direto em `dashboard/page.tsx` + `PostDataTable` + `getPosts`.

### Arquivos
| Arquivo | Propósito |
|---------|-----------|
| `src/app/(admin)/admin/products/page.tsx` | Server component; busca produtos com filtros |
| `src/server/product.actions.ts` | `getProducts`, `deleteProductAction`, `bulkDeleteProductsAction` |
| `src/components/admin/product-data-table.tsx` | Tabela (molde `PostDataTable`) |
| `src/components/admin/product-table-toolbar.tsx` | Busca + filtros (molde `data-table-toolbar`) |

### Comportamento
- **Colunas:** Thumbnail (cover), Nome, Status (Badge), Categoria, Data de publicação, Última atualização, Ações (Editar | Deletar)
- **Ordenação clicável no cabeçalho:** Nome (A→Z / Z→A), datas (mais recente / mais antigo) — via URL param `?sort=name&dir=asc`
- **Filtros (URL params, deep-link):** busca `q`, categoria, status, data (`date_from`/`date_to`)
- **Paginação:** **20 por página** (navegação livre + botões anterior/próxima) — reusa o componente `Pagination` da `PostDataTable`
- **Bulk:** seleção + excluir selecionados (igual ao blog)

> ⚠️ Diferença vs blog: page size **20** (blog usa 15) e **ordenação por clique no cabeçalho** (blog não tem). Encapsular `sort/dir` no `getProducts`.

### Checklist
- [ ] Tabela renderiza produtos do Supabase com thumbnail
- [ ] Cada filtro (q, categoria, status, data) altera resultados
- [ ] Clicar cabeçalho Nome ordena A→Z / Z→A; clicar data inverte recência
- [ ] Paginação 20/página avança e retrocede
- [ ] Bulk delete remove e revalida
- [ ] Editor não deleta produto de outro autor (ownership check, igual `deletePostAction`)

---

## Wave C4 — Cadastro / Edição de Produto

**Objetivo:** Formulário CRUD completo. Molde em `post-editor.tsx` (RHF + zod + `RichTextField` + `ImageUpload`).

### Arquivos
| Arquivo | Propósito |
|---------|-----------|
| `src/app/(admin)/admin/products/new/page.tsx` | Criar |
| `src/app/(admin)/admin/products/[id]/edit/page.tsx` | Editar (pré-preenche) |
| `src/components/admin/product-editor.tsx` | Form client (molde `PostEditor`) |
| `src/components/admin/product-image-gallery.tsx` | Upload múltiplo + reordenar carrossel — usa `r2-upload.tsx` da Wave C1.5 |
| `src/server/product.actions.ts` (estender) | `createProductAction`, `updateProductAction` |

### Campos do formulário
- `name` (gera `slug` automático, editável — reusa `toSlug`)
- **Categorias em cascata** (múltiplas via `product_category_map`)
- `environment` (Interno/Externo)
- `cover_image` (componente `r2-upload` → presigned PUT no R2; persiste a URL pública)
- **Imagens do carrossel** (várias, via `r2-upload`, com `sort_order`; URLs em `product_images`)
- `sku`
- `description` (WYSIWYG via `RichTextField`)
- **Ficha técnica:** `height_cm`, `width_cm`, `depth_cm`, `weight_kg`, `materials[]`, `socket_type`, `primary_material`
- `status` (Rascunho / Publicado)
- SEO (opcional, igual ao blog)
- **Seção 3D atrás de um switcher** (`has_3d_model`): ao ativar, revela campos `model_3d_url`, `model_3d_poster`, `model_3d_alt` — *campos presentes mas implementação de preenchimento/validação fica para a etapa futura (Wave C7)*
- **(Opcional) "Gerar descrição com IA":** botão que chama uma action reusando a infra de `src/lib/ai/*` — pode ficar como stub na C4 e ativar depois

### Segurança (espelha `admin.actions.ts` + Wave C1.5)
- Upload: validação MIME/5 MB **no servidor** (action de presign), não só no cliente
- `slug` e `sku` únicos validados no servidor (erro `23505` → mensagem amigável)
- `author_id` setado server-side a partir da sessão (nunca do payload)
- Toda action de produto inicia com `getUser()` + checagem de role (igual ao blog)

### Checklist
- [ ] Criar produto → aparece no dashboard de produtos
- [ ] Editar → form pré-preenche (incl. categorias múltiplas e imagens do carrossel)
- [ ] Upload de capa e de várias imagens de carrossel persiste URLs + `sort_order`
- [ ] Reordenar carrossel salva nova ordem
- [ ] `sku`/`slug` duplicado retorna erro amigável
- [ ] Switcher 3D revela/oculta campos sem quebrar submit (campos ficam null se desativado)
- [ ] `author_id` não pode ser forjado via form

---

## Wave C5 — Listing Público `/catalogo`

**Objetivo:** Réplica estrutural da `blog/page.tsx`, exibindo produtos. SSR, filtros, ordenação, toggle lista/grid, paginação.

### Arquivos
| Arquivo | Propósito |
|---------|-----------|
| `src/app/catalogo/page.tsx` | Index SSR paginado (molde `blog/page.tsx`) |
| `src/components/catalog/CatalogSidebar.tsx` | Filtros (molde `BlogSidebar`) |
| `src/components/catalog/ProductCard.tsx` | Card produto (molde `PostCard`) |
| `src/components/catalog/ViewToggle.tsx` | Alterna lista ↔ grid (client, URL param `?view=`) |
| `src/components/catalog/CatalogHeader.tsx` | Header (reusar `BlogHeader` se possível) |

### Comportamento
- **Filtros (acumulativos, AND):** Área de uso (Interno/Externo), Tipo de produto (árvore `product_categories`), Material (`primary_material`) — todos via URL params, deep-link, combináveis simultaneamente (ex.: `?environment=interno&tipo=luminaria&material=aco`)
- **Ordenação:** mais recente, A→Z, Z→A (`?sort=`)
- **Toggle exibição:** lista e grid (`?view=grid|list`)
- **Paginação:** **9 produtos por página** (`PAGE_SIZE = 9`)
- Só `status='published'` (RLS + filtro server)
- Adicionar link "Catálogo" em `src/config/navigation.ts`

### Checklist
- [ ] Listing mostra só produtos publicados, 9 por página
- [ ] Cada filtro (Interno/Externo, Tipo, Material) refina resultados e é deep-linkável
- [ ] Ordenação altera a ordem corretamente
- [ ] Toggle lista/grid muda layout e persiste no URL
- [ ] Paginação avança/retrocede preservando filtros
- [ ] "Catálogo" aparece na navegação do site

---

## Wave C6 — Página de Produto `/catalogo/[slug]`

**Objetivo:** Página de detalhe. Molde em `blog/[slug]/page.tsx` (SSR + `generateMetadata` + share + relacionados). **Sem compra/carrinho/preço.**

### Arquivos
| Arquivo | Propósito |
|---------|-----------|
| `src/app/catalogo/[slug]/page.tsx` | Detalhe SSR + `generateMetadata` |
| `src/components/catalog/ProductGallery.tsx` | Foto de capa + **carrossel vertical** (client) |
| `src/components/catalog/ProductSpecs.tsx` | Tabela de especificações técnicas |
| `src/components/catalog/RelatedProducts.tsx` | Carrossel de produtos relacionados (molde bloco "Posts Relacionados") |

### Layout (conforme arquitetura)
1. **Foto da capa** + **carrossel vertical** das `product_images` (ordenadas por `sort_order`)
2. **Informações:** categoria, nome, **SKU** (sem preço, sem botão de compra)
3. **Compartilhar** nas redes (reusar bloco de share do blog: X, Facebook, LinkedIn, WhatsApp)
4. **Descrição** do produto (HTML do WYSIWYG; renderizada de forma segura)
5. **Especificações técnicas** (altura, largura, profundidade, peso, materiais, tipo de soquete)
6. **Carrossel de produtos relacionados** (mesma `environment`/categoria, exclui o atual — molde da query de related do blog)
7. **Placeholder de 3D** reservado no layout (ativado na Wave C7 quando `has_3d_model`)

### Checklist
- [ ] `/catalogo/[slug]` renderiza o produto correto; rascunho retorna 404
- [ ] Carrossel vertical exibe imagens na ordem `sort_order`
- [ ] Categoria, nome e SKU exibidos; **nenhum** elemento de preço/carrinho presente
- [ ] Share gera links corretos
- [ ] Specs técnicas renderizam só campos preenchidos
- [ ] Relacionados aparecem e excluem o produto atual
- [ ] `<title>` usa `seo_title`; OG image usa `cover_image`

---

## Wave C7 — Suporte a Modelo 3D (`model-viewer`) *(etapa final)*

**Objetivo:** Ativar a visualização 3D na página de produto. Plataforma já preparada desde a Wave C1 (schema) e C4 (campos no cadastro).

### Arquivos
| Arquivo | Propósito |
|---------|-----------|
| `src/components/catalog/ProductModelViewer.tsx` | Wrapper client de `<model-viewer>` (carregado dinamicamente, só quando `has_3d_model`) |
| `src/app/catalogo/[slug]/page.tsx` (estender) | Renderiza o viewer condicionalmente |
| `src/components/admin/product-editor.tsx` (estender) | Validação/preview dos campos 3D dentro do switcher |

### Notas de implementação
- Biblioteca: `@google/model-viewer` (web component), carregada **client-side e sob demanda** para não pesar o bundle do listing
- Formatos: `.glb`/`.gltf` em `model_3d_url`; `model_3d_poster` como imagem de carregamento; `model_3d_alt` para acessibilidade
- **Upload do `.glb` reusa o presign do R2 (Wave C1.5)** — estende a allowlist para `model/gltf-binary` e eleva o teto de tamanho (ex.: 25–50 MB) **na validação server-side**, mantendo todas as demais regras de segurança. Prefixo de key `models/{uuid}.glb`
- Fallback: se `has_3d_model=false` ou URL ausente, página renderiza só o carrossel de imagens (comportamento da C6)

### Checklist
- [ ] `<model-viewer>` carrega só quando `has_3d_model=true`
- [ ] Bundle do listing não inclui a lib 3D
- [ ] Upload/validação de `.glb` no cadastro funciona
- [ ] Fallback para imagens quando não há modelo

---

## Mapa de Dependências

```
C1 (Schema/DB)
 ├─► C1.5 (Storage R2 seguro) ──┐
 └─► C2 (Área + Categorias)     │
       └─► C3 (Dashboard)       │
             └─► C4 (Cadastro) ◄┘  (C4 precisa do presign do R2)
                   ├─► C5 (Listing público /catalogo)
                   │     └─► C6 (Página de produto)
                   │           └─► C7 (Modelo 3D, .glb no R2) ← etapa final
                   └─(C5 e C6 podem começar assim que houver produtos publicados via C4)
```

---

## Reuso de código (evita reinvenção)

| Já existe | Reusar em |
|-----------|-----------|
| `RichTextField` (TipTap) | descrição do produto (C4) |
| UX/validação de `ImageUpload` (5 MB, MIME, preview) | base do `r2-upload` (C1.5) — troca o backend Supabase pelo presign R2 |
| Isolamento de credencial de `supabase-admin.ts` | molde do `r2-client.ts` server-only (C1.5) |
| Gate `getUser()` + role + ownership de `admin.actions.ts` | todas as actions de produto (C1.5, C3, C4) |
| `Pagination` (em `post-data-table`) | dashboard de produtos (C3) e listing (C5) |
| Padrão `getPosts` + filtros URL | `getProducts` (C3) |
| `categories-manager` / `category.actions` | categorias de produto (C2) |
| Bloco de share do `blog/[slug]` | share do produto (C6) |
| Query de "related posts" | produtos relacionados (C6) |
| Padrão `generateMetadata` | SEO do produto (C6) |

---

## Variáveis de Ambiente

**Novas (Cloudflare R2 — todas server-only, SEM `NEXT_PUBLIC_`):**
```env
R2_ACCOUNT_ID=            # ID da conta Cloudflare
R2_ACCESS_KEY_ID=         # credencial S3 do R2 — NUNCA exposta ao cliente
R2_SECRET_ACCESS_KEY=     # segredo S3 do R2 — NUNCA exposta ao cliente
R2_BUCKET=                # nome do bucket de produtos
R2_PUBLIC_BASE_URL=       # domínio de LEITURA pública (GET) — ex.: https://cdn.embras.com.br
```
> `R2_PUBLIC_BASE_URL` é o único valor relacionado ao R2 que aparece em URLs públicas (leitura). As três credenciais ficam **exclusivamente** em `r2-client.ts`, espelhando o isolamento de `SUPABASE_SERVICE_ROLE_KEY`.

Supabase (auth + DB + RLS) permanece como já configurado. A descrição por IA (opcional, C4) reusa as chaves de IA já existentes no `.env`.

---

**Aguardando aprovação para iniciar a Wave C1.**
