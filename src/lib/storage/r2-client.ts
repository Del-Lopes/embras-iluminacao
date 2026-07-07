// ============================================================
// r2-client.ts
// Cloudflare R2 (S3-compatible) client — SERVER-ONLY.
// Holds the write credentials. Mirrors the isolation contract of
// supabase-admin.ts: these secrets must NEVER reach the browser.
//
// Use ONLY in server-side code: Server Actions, Route Handlers.
// NEVER import this in Client Components.
//
// Security model (see CATALOG-PLAN.md, Wave C1.5):
//   - Credentials live only in non-public env vars (no NEXT_PUBLIC_).
//   - Clients never receive credentials — they get short-lived
//     presigned PUT URLs generated here, behind an auth gate.
// ============================================================

import 'server-only'
import { S3Client, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY

if (!ACCOUNT_ID) throw new Error('Missing env: R2_ACCOUNT_ID')
if (!ACCESS_KEY_ID) throw new Error('Missing env: R2_ACCESS_KEY_ID')
if (!SECRET_ACCESS_KEY) throw new Error('Missing env: R2_SECRET_ACCESS_KEY')

export const R2_BUCKET = (() => {
  const bucket = process.env.R2_BUCKET
  if (!bucket) throw new Error('Missing env: R2_BUCKET')
  return bucket
})()

// Public read base URL (GET only) — the single R2 value that ever
// appears in browser-facing URLs. Trailing slash trimmed for safe joins.
export const R2_PUBLIC_BASE_URL = (() => {
  const base = process.env.R2_PUBLIC_BASE_URL
  if (!base) throw new Error('Missing env: R2_PUBLIC_BASE_URL')
  return base.replace(/\/+$/, '')
})()

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
})

// Build the public read URL for a stored object key.
export const r2PublicUrl = (key: string) =>
  `${R2_PUBLIC_BASE_URL}/${key.replace(/^\/+/, '')}`

// Reverse of r2PublicUrl: derive the object key from a stored public URL.
// Returns null for URLs that don't belong to our R2 public base (e.g. an
// external URL pasted by an editor) — those must never be deleted.
export const r2KeyFromPublicUrl = (url: string): string | null => {
  const prefix = `${R2_PUBLIC_BASE_URL}/`
  if (!url.startsWith(prefix)) return null
  const key = url.slice(prefix.length)
  // Only our own object namespaces are ever deletable. Matches the real
  // layout written by upload.actions.ts: produtos/<slug>/… and
  // modelos_3d/<slug>/… (models, posters and texture variations).
  if (!key || key.endsWith('/')) return null
  return /^(produtos|modelos_3d)\//.test(key) ? key : null
}

// Recursively list every object key under a prefix (no delimiter), paging
// past the 1000-key cap. Used to reconcile a product's 3D folder on save:
// list everything under modelos_3d/<slug>/ and delete keys no longer referenced.
export const listR2Keys = async (prefix: string): Promise<string[]> => {
  const keys: string[] = []
  let token: string | undefined
  do {
    const res = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: prefix,
        ContinuationToken: token,
        MaxKeys: 1000,
      })
    )
    for (const o of res.Contents ?? []) {
      if (o.Key && !o.Key.endsWith('/')) keys.push(o.Key)
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined
  } while (token)
  return keys
}

// Best-effort deletion of multiple objects. Failures are swallowed per-key
// (caller treats storage cleanup as non-critical relative to the DB delete).
export const deleteR2Objects = async (keys: string[]): Promise<void> => {
  await Promise.allSettled(
    keys.map((Key) =>
      r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key }))
    )
  )
}
