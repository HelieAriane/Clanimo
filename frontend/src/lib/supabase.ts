// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Buckets
export const AVATARS_BUCKET =
  (import.meta.env.VITE_SUPABASE_BUCKET as string) ||
  (import.meta.env.VITE_SUPABASE_AVATARS_BUCKET as string) ||
  'avatars'

export const MEETUPS_BUCKET =
  (import.meta.env.VITE_SUPABASE_MEETUPS_BUCKET as string) ||
  'meetups'

// Utils internes
function extFromFilename(name?: string) {
  const n = (name || '').split('?')[0]
  const p = n.lastIndexOf('.')
  return p >= 0 ? n.slice(p + 1).toLowerCase() : 'bin'
}

function uniqueName(ext = 'bin') {
  const rnd = (crypto as any)?.randomUUID?.() || Math.random().toString(36).slice(2)
  return `${Date.now()}-${rnd}.${ext}`
}

function normalizePath(bucket: string, path: string) {
  // évite les "bucket/bucket/..." si quelqu'un a préfixé par erreur
  return path.replace(new RegExp(`^${bucket}/`), '')
}

// Builders de chemins (RLS friendly)
export function buildAvatarPath(folder: 'users' | 'dogs', uid: string, filename?: string) {
  const safeFolder = folder === 'dogs' ? 'dogs' : 'users'
  const ext = extFromFilename(filename)
  return `${safeFolder}/${uid}/${uniqueName(ext)}`
}

export function buildMeetupPath(uid: string, filename?: string) {
  const ext = extFromFilename(filename)
  // Pour le bucket "meetups", on force "meetups/<uid>/..."
  return `meetups/${uid}/${uniqueName(ext)}`
}

// Public URL helpers
export function publicUrlFromPathInBucket(bucket: string, rawPath: string) {
  const path = normalizePath(bucket, rawPath)
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

export function pathFromPublicUrlInBucket(bucket: string, url: string) {
  const marker = `/storage/v1/object/public/${bucket}/`
  const i = url.indexOf(marker)
  if (i === -1) return url
  return url.slice(i + marker.length)
}

// Backwards compat pour les avatars existants
export function publicUrlFromPath(path: string) {
  return publicUrlFromPathInBucket(AVATARS_BUCKET, path)
}

// ---------- Upload / Delete génériques ----------
export async function uploadToBucket(bucket: string, path: string, file: File, { upsert = true } = {}) {
  const cleanPath = normalizePath(bucket, path)
  const { error } = await supabase.storage
    .from(bucket)
    .upload(cleanPath, file, {
      upsert,
      contentType: file.type || 'application/octet-stream',
      cacheControl: '31536000',
    })
  if (error) {
    if (String(error.message || '').toLowerCase().includes('row-level security')) {
      console.error('[supabase] RLS upload blocked. Check policies & path:', { bucket, path: cleanPath })
    }
    throw error
  }
  return {
    path: cleanPath,
    url: publicUrlFromPathInBucket(bucket, cleanPath),
  }
}

export async function deleteFromBucket(bucket: string, pathOrUrl: string) {
  if (!pathOrUrl) return
  const path = pathOrUrl.startsWith('http')
    ? pathFromPublicUrlInBucket(bucket, pathOrUrl)
    : normalizePath(bucket, pathOrUrl)
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}

// APIs haut-niveau (avatars / meetups)
export async function uploadAvatar(
  file: File,
  folder: 'users' | 'dogs',
  uid: string,
  opts?: { upsert?: boolean }
) {
  if (!file) throw new Error('no_file')
  if (!uid) throw new Error('no_uid')
  const path = buildAvatarPath(folder, uid, file.name)
  return uploadToBucket(AVATARS_BUCKET, path, file, opts)
}

export async function uploadMeetupImage(
  file: File,
  uid: string,
  opts?: { upsert?: boolean }
) {
  if (!file) throw new Error('no_file')
  if (!uid) throw new Error('no_uid')
  const path = buildMeetupPath(uid, file.name) // ex: "meetups/<uid>/xxx.png"
  return uploadToBucket(MEETUPS_BUCKET, path, file, opts)
}

// Petit util
export function ensureHttpUrl(url?: string) {
  if (!url) return ''
  if (/^(blob:|data:)/i.test(url)) return ''
  return url
}
