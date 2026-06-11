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
import { r2Client, R2_BUCKET, r2PublicUrl } from '@/lib/storage/r2-client'
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'node:crypto'

// ----------------------------------------------------------------
// Allowlists — server-authoritative
// ----------------------------------------------------------------
const IMAGE_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

// 3D models (Wave C7) — gated behind the same flow, larger size cap.
const MODEL_MIME: Record<string, string> = {
  'model/gltf-binary': 'glb',
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB — mirrors image-upload.tsx
const MAX_MODEL_BYTES = 50 * 1024 * 1024 // 50 MB — .glb

const PRESIGN_TTL_SECONDS = 60

export type UploadKind = 'image' | 'model'

export type GetUploadUrlInput = {
  kind: UploadKind
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
  const isImage = input.kind === 'image'
  const mimeMap = isImage ? IMAGE_MIME : MODEL_MIME
  const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_MODEL_BYTES
  const prefix = isImage ? 'products' : 'models'

  // 3. Validate MIME (server-authoritative)
  const ext = mimeMap[input.contentType]
  if (!ext) {
    return {
      error: isImage
        ? 'Tipo de imagem não permitido (use JPG, PNG ou WebP)'
        : 'Tipo de modelo não permitido (use .glb)',
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

  // 5. Server-generated key — never client-controlled
  const key = `${prefix}/${randomUUID()}.${ext}`

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

export const deleteProductObject = async (
  key: string
): Promise<DeleteObjectResult> => {
  const user = await requireStaff()
  if (!user) return { error: 'Não autorizado' }

  // Only allow deleting within our managed prefixes.
  if (!/^(products|models)\/[a-f0-9-]+\.[a-z0-9]+$/.test(key)) {
    return { error: 'Chave inválida' }
  }

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
