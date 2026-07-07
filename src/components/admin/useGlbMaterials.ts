'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Reads the technical material names of a .glb by parsing the glTF JSON chunk
// directly — no rendering, no three.js/model-viewer, no texture/Draco decoding.
//
// Why parse instead of loading into <model-viewer>:
//   - Reading materials by rendering the whole model pulls in every texture
//     (as blob: URLs). Some models have textures that fail to decode, spamming
//     "THREE.GLTFLoader: Couldn't load texture blob:" — pure noise when all we
//     need are names.
//   - three.js's GLTFLoader sets `material.name` straight from the glTF JSON's
//     `materials[i].name`, so the names parsed here are IDENTICAL to what the
//     frontend <model-viewer> resolves — no naming drift. Unnamed materials have
//     no name in either place and are filtered out in both.
//
// The glTF JSON chunk sits at the very start of a .glb (before the binary buffer),
// so a small Range request is usually enough; we fall back to a full fetch if the
// JSON chunk is larger than the partial window (or the host ignores Range).

export type GlbMaterialsStatus = 'idle' | 'loading' | 'ready' | 'error'

export type UseGlbMaterials = {
  status: GlbMaterialsStatus
  materials: string[]
  error: string | null
  read: (url: string) => void
  reset: () => void
}

const GLB_MAGIC = 0x46546c67 // "glTF"
const JSON_CHUNK = 0x4e4f534a // "JSON"
const PARTIAL_BYTES = 2 * 1024 * 1024 // 2 MB — plenty for the JSON chunk

// Parse material names from a GLB buffer. Returns `null` if the JSON chunk is
// present but truncated (caller should refetch more bytes); throws on a buffer
// that isn't a valid .glb.
function parseMaterialNames(buf: ArrayBuffer): string[] | null {
  const dv = new DataView(buf)
  if (buf.byteLength < 12 || dv.getUint32(0, true) !== GLB_MAGIC) {
    throw new Error('Arquivo .glb inválido.')
  }
  let offset = 12
  while (offset + 8 <= buf.byteLength) {
    const chunkLength = dv.getUint32(offset, true)
    const chunkType = dv.getUint32(offset + 4, true)
    const dataStart = offset + 8
    if (chunkType === JSON_CHUNK) {
      if (dataStart + chunkLength > buf.byteLength) return null // truncated
      const text = new TextDecoder().decode(new Uint8Array(buf, dataStart, chunkLength))
      const json = JSON.parse(text) as { materials?: { name?: unknown }[] }
      const mats = Array.isArray(json.materials) ? json.materials : []
      return mats
        .map((m) => (typeof m?.name === 'string' ? m.name : ''))
        .filter((n): n is string => n.length > 0)
    }
    offset = dataStart + chunkLength
  }
  return [] // no JSON chunk with materials
}

export function useGlbMaterials(): UseGlbMaterials {
  const [status, setStatus] = useState<GlbMaterialsStatus>('idle')
  const [materials, setMaterials] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  // Guards against a stale read winning after the model was swapped.
  const reqRef = useRef(0)

  const reset = useCallback(() => {
    reqRef.current += 1
    setStatus('idle')
    setMaterials([])
    setError(null)
  }, [])

  const read = useCallback((url: string) => {
    const token = ++reqRef.current
    if (!url) {
      setStatus('idle')
      setMaterials([])
      setError(null)
      return
    }
    setStatus('loading')
    setError(null)
    setMaterials([])

    ;(async () => {
      // 1. Try a partial fetch — the JSON chunk lives at the start of the file.
      let names: string[] | null = null
      try {
        const partial = await fetch(url, { headers: { Range: `bytes=0-${PARTIAL_BYTES - 1}` } })
        if (partial.ok) names = parseMaterialNames(await partial.arrayBuffer())
      } catch {
        // Range unsupported / CORS on the header → fall through to full fetch.
      }
      // 2. Truncated JSON chunk (names === null) → fetch the whole file.
      if (names === null) {
        const full = await fetch(url)
        if (!full.ok) throw new Error('Não foi possível baixar o modelo 3D.')
        names = parseMaterialNames(await full.arrayBuffer())
      }
      return names ?? []
    })()
      .then((names) => {
        if (token !== reqRef.current) return
        setMaterials(names)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (token !== reqRef.current) return
        setError(err instanceof Error ? err.message : 'Falha ao ler os materiais do modelo.')
        setStatus('error')
      })
  }, [])

  // Invalidate any in-flight read on unmount.
  useEffect(() => () => { reqRef.current += 1 }, [])

  return { status, materials, error, read, reset }
}
