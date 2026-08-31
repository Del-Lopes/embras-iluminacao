'use server'

// ================================================================
// upload.actions.ts — Cloudflare R2 presigned upload (catalog)
//
// Security model (CATALOG-PLAN.md, Wave C1.5) — every rule enforced here:
//   1. Auth gate: getUser() validates the token (never getSession()),
//      then role must be admin/editor — same gate as admin.actions.ts.
//   2. Server-side validation of MIME + size BEFORE signing.
//   3. Content-Type pinned into the signature so the PUT can't deviate.
//   4. Object key generated server-side (uuid) — never a client path.
//   5. Short TTL; single PUT.
//   6. Delete also gated here — clients never hold R2 credentials.
// ================================================================

import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { r2Client, R2_BUCKET, r2PublicUrl, deleteR2Objects, deleteR2Prefix, isFolderMarker,
  r2FolderSegment,
} from '@/lib/storage/r2-client'
import { PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'node:crypto'

// ----------------------------------------------------------------
// Allowlists — server-authoritative
// ----------------------------------------------------------------
const IMAGE_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/tiff': 'tiff',
  'image/tif': 'tiff',
}

// 3D models (Wave C7) — gated behind the same flow, larger size cap.
const MODEL_MIME: Record<string, string> = {
  'model/gltf-binary': 'glb',
}

// Documentos (catálogo em PDF, arquivos de download do produto: data sheet,
// IES/3D, certificados) — mesmo fluxo presigned. Aceita PDF e ZIP.
const DOC_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'application/octet-stream': 'zip', // alguns navegadores enviam .zip assim
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB — mirrors image-upload.tsx
const MAX_MODEL_BYTES = 50 * 1024 * 1024 // 50 MB — .glb
const MAX_DOC_BYTES = 50 * 1024 * 1024 // 50 MB — PDF/ZIP

const PRESIGN_TTL_SECONDS = 60

// Pastas que o gerenciador de Storage não mostra e que ele não pode excluir:
// guardam arquivos usados diretamente por páginas do site (o vídeo
// institucional, por exemplo), e não conteúdo gerenciado pelo painel.
const HIDDEN_FOLDERS = new Set(['site/'])

export type UploadKind = 'image' | 'model' | 'document'
// Destino no R2: 'product' → produtos/, 'model' → modelos_3d/, 'project' → projetos/,
// 'catalog' → catalogo/, 'banner' → banners/
export type UploadGroup = 'product' | 'model' | 'project' | 'catalog' | 'banner'

// Pasta-base por grupo. Cada item ganha uma subpasta com o nome (slug).
const GROUP_BASE: Record<UploadGroup, string> = {
  product: 'produtos',
  model: 'modelos_3d',
  project: 'projetos',
  catalog: 'catalogo',
  banner: 'banners',
}

// O segmento de pasta vem do helper do r2-client: é a mesma regra usada pela
// limpeza na exclusão, e manter uma cópia aqui faria as duas divergirem.
const sanitizeFolder = (raw: string): string => r2FolderSegment(raw)

export type GetUploadUrlInput = {
  kind: UploadKind
  group?: UploadGroup
  folder?: string
  contentType: string
  contentLength: number
}

export type GetUploadUrlResult =
  | { error: string }
  | { uploadUrl: string; publicUrl: string; key: string; contentType: string }

// ----------------------------------------------------------------
// Auth gate — reused shape from admin.actions.ts
// ----------------------------------------------------------------
const requireStaff = async () => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'editor'].includes(profile.role)) return null
  return user
}

// Gate mais estrito para as operações do gerenciador de Storage
// (listar / excluir arquivos e pastas), que passou a ser admin-only.
// O upload em si continua em requireStaff: o editor precisa dele para
// anexar imagens ao criar posts e produtos.
const requireAdminStaff = async () => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin' || !profile.is_active) return null
  return user
}

// ================================================================
// getProductUploadUrl — issue a short-lived presigned PUT URL
// ================================================================
export const getProductUploadUrl = async (
  input: GetUploadUrlInput
): Promise<GetUploadUrlResult> => {
  // 1. Auth gate
  const user = await requireStaff()
  if (!user) return { error: 'Não autorizado' }

  // 2. Resolve allowlist + size cap by kind
  const mimeMap =
    input.kind === 'image' ? IMAGE_MIME : input.kind === 'model' ? MODEL_MIME : DOC_MIME
  const maxBytes =
    input.kind === 'image'
      ? MAX_IMAGE_BYTES
      : input.kind === 'model'
        ? MAX_MODEL_BYTES
        : MAX_DOC_BYTES
  // Destino: imagens do produto → produtos/, asset 3D → modelos_3d/, PDF → catalogo/.
  // O grupo é explícito (o poster 3D é uma imagem que vai em modelos_3d/).
  const group: UploadGroup =
    input.group ??
    (input.kind === 'model' ? 'model' : input.kind === 'document' ? 'catalog' : 'product')
  const base = GROUP_BASE[group]
  // O catálogo é um arquivo único do site, não uma coleção por item: ele grava
  // direto na pasta raiz, sem subpasta. Os demais grupos têm uma subpasta por
  // produto/projeto, e por isso continuam exigindo o folder.
  const folder = group === 'catalog' ? '' : sanitizeFolder(input.folder ?? '')

  // 3. Validate MIME (server-authoritative)
  const ext = mimeMap[input.contentType]
  if (!ext) {
    return {
      error:
        input.kind === 'image'
          ? 'Tipo de imagem não permitido (use JPG, PNG ou WebP)'
          : input.kind === 'model'
            ? 'Tipo de modelo não permitido (use .glb)'
            : 'Tipo de arquivo não permitido (use PDF)',
    }
  }

  // 4. Validate size
  if (!Number.isFinite(input.contentLength) || input.contentLength <= 0) {
    return { error: 'Tamanho de arquivo inválido' }
  }
  if (input.contentLength > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024))
    return { error: `Arquivo muito grande (máx. ${mb} MB)` }
  }

  // 5. Server-generated key — never client-controlled.
  //    Ex.: produtos/luminaria-led/<uuid>.jpg | modelos_3d/luminaria-led/<uuid>.glb
  const key = folder ? `${base}/${folder}/${randomUUID()}.${ext}` : `${base}/${randomUUID()}.${ext}`

  // 6. Pin Content-Type + Content-Length into the signed request so the
  //    eventual PUT cannot upload a different type or oversize payload.
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
  })

  try {
    const uploadUrl = await getSignedUrl(r2Client, command, {
      expiresIn: PRESIGN_TTL_SECONDS,
      // Sign these headers so they're enforced, not advisory.
      signableHeaders: new Set(['content-type', 'content-length']),
    })

    return {
      uploadUrl,
      publicUrl: r2PublicUrl(key),
      key,
      contentType: input.contentType,
    }
  } catch (err) {
    console.error('[getProductUploadUrl]', (err as Error).message)
    return { error: 'Erro ao preparar upload' }
  }
}

// ================================================================
// deleteProductObject — gated delete (clients never hold R2 creds)
// ================================================================
export type DeleteObjectResult = { error: string } | { ok: true }

// A deletable key is any real object (non-empty, not a "folder" marker).
// Auth (admin/editor) is the real gate; this just blocks nonsense input.
const isDeletableKey = (k: string) =>
  k.length > 0 && !k.startsWith('/') && !k.endsWith('/')

export const deleteProductObject = async (
  key: string
): Promise<DeleteObjectResult> => {
  const user = await requireAdminStaff()
  if (!user) return { error: 'Não autorizado' }

  if (!isDeletableKey(key)) return { error: 'Chave inválida' }

  try {
    await r2Client.send(
      new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key })
    )
    return { ok: true }
  } catch (err) {
    console.error('[deleteProductObject]', (err as Error).message)
    return { error: 'Erro ao excluir arquivo' }
  }
}

// ================================================================
// deleteProductObjects — gated bulk delete (R2 storage manager)
// ================================================================
export const deleteProductObjects = async (
  keys: string[]
): Promise<DeleteObjectResult> => {
  const user = await requireAdminStaff()
  if (!user) return { error: 'Não autorizado' }

  const valid = keys.filter(isDeletableKey)
  if (!valid.length) return { error: 'Nenhuma chave válida' }

  try {
    await deleteR2Objects(valid)
    return { ok: true }
  } catch (err) {
    console.error('[deleteProductObjects]', (err as Error).message)
    return { error: 'Erro ao excluir arquivos' }
  }
}

// ================================================================
// deleteR2Folder — gated recursive delete of an entire "folder" (prefix)
// ================================================================
export type DeleteFolderResult = { error: string } | { ok: true; deleted: number }

export const deleteR2Folder = async (prefix: string): Promise<DeleteFolderResult> => {
  const user = await requireAdminStaff()
  if (!user) return { error: 'Não autorizado' }

  // A folder prefix must be non-empty and end with '/'. Never allow '' (bucket root).
  const clean = (prefix || '').replace(/^\/+/, '')
  if (!clean || !clean.endsWith('/')) return { error: 'Pasta inválida' }

  // Pastas-base do sistema não podem ser excluídas (subpastas dentro delas sim).
  // As ocultas entram na mesma regra: elas não aparecem na listagem, mas o
  // caminho pode ser digitado, e apagá-las quebraria páginas do site.
  if (
    clean === 'modelos_3d/' ||
    clean === 'produtos/' ||
    clean === 'projetos/' ||
    clean === 'catalogo/' ||
    clean === 'banners/' ||
    HIDDEN_FOLDERS.has(clean)
  ) {
    return { error: 'Esta pasta do sistema não pode ser excluída' }
  }

  try {
    const deleted = await deleteR2Prefix(clean)
    return { ok: true, deleted }
  } catch (err) {
    console.error('[deleteR2Folder]', (err as Error).message)
    return { error: 'Erro ao excluir a pasta' }
  }
}

// ================================================================
// listR2Objects — gated, folder-aware listing for the storage manager
// Uses Delimiter='/' so the bucket is browsed one level at a time:
// CommonPrefixes are folders, Contents are the files at this level.
// ================================================================
export type R2Object = {
  key: string
  size: number
  lastModified: string | null
  url: string
}

export type R2Listing = { folders: string[]; files: R2Object[] }
export type ListR2Result = { error: string } | R2Listing

export const listR2Objects = async (prefix = ''): Promise<ListR2Result> => {
  const user = await requireAdminStaff()
  if (!user) return { error: 'Não autorizado' }

  // Normalize: strip leading slashes; ensure a trailing slash when non-empty
  // so the prefix lines up with R2's folder semantics.
  let safePrefix = prefix.replace(/^\/+/, '')
  if (safePrefix && !safePrefix.endsWith('/')) safePrefix += '/'

  // Pasta de arquivos do próprio site (vídeo institucional e afins): não é
  // conteúdo gerenciado pelo painel, e listá-la só convidaria a excluir algo
  // de que uma página depende. Devolve vazio, e não erro: para quem usa o
  // painel ela simplesmente não existe.
  if (HIDDEN_FOLDERS.has(safePrefix)) return { folders: [], files: [] }

  try {
    const folders: string[] = []
    const files: R2Object[] = []
    let token: string | undefined

    // ListObjectsV2 caps at 1000 keys per call — page through all of them.
    do {
      const res = await r2Client.send(
        new ListObjectsV2Command({
          Bucket: R2_BUCKET,
          Prefix: safePrefix,
          Delimiter: '/',
          ContinuationToken: token,
          MaxKeys: 1000,
        })
      )
      for (const p of res.CommonPrefixes ?? []) {
        if (p.Prefix && !HIDDEN_FOLDERS.has(p.Prefix)) folders.push(p.Prefix)
      }
      for (const o of res.Contents ?? []) {
        if (!o.Key || o.Key === safePrefix || o.Key.endsWith('/')) continue
        // O marcador de pasta é um objeto de zero byte que só existe para o
        // prefixo aparecer no R2. Listá-lo mostraria um arquivo fantasma em
        // toda pasta e permitiria excluí-lo, o que faria a pasta sumir.
        if (isFolderMarker(o.Key)) continue
        files.push({
          key: o.Key,
          size: o.Size ?? 0,
          lastModified: o.LastModified ? o.LastModified.toISOString() : null,
          url: r2PublicUrl(o.Key),
        })
      }
      token = res.IsTruncated ? res.NextContinuationToken : undefined
    } while (token)

    folders.sort((a, b) => a.localeCompare(b))
    // Newest first (lexicographic on ISO timestamps == chronological).
    files.sort((a, b) => (b.lastModified ?? '').localeCompare(a.lastModified ?? ''))
    return { folders, files }
  } catch (err) {
    console.error('[listR2Objects]', (err as Error).message)
    return { error: 'Erro ao carregar arquivos' }
  }
}
