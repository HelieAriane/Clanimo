// src/lib/api.ts
import { auth } from '@/lib/firebase'

const BASE = import.meta.env.MODE === 'development'
  ? import.meta.env.VITE_API_LOCAL
  : import.meta.env.VITE_API_PROD;

function isFormData(body: any): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData
}

async function withAuthHeaders(init?: RequestInit): Promise<RequestInit> {
  const user = auth.currentUser
  const token = user ? await user.getIdToken(/* forceRefresh */ false) : undefined
  
const baseHeaders: Record<string, string> = {
  ...(init?.headers as Record<string, string> | undefined),
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
}

  // Ne pas forcer le Content-Type si on envoie du FormData
  const body = (init as any)?.body
  if (!isFormData(body) && !('Content-Type' in baseHeaders)) {
    baseHeaders['Content-Type'] = 'application/json'
  }

  return {
    ...(init || {}),
    headers: baseHeaders,
  }

}

// Parse JSON si présent, sinon {}
async function parseJsonIfAny<T = any>(res: Response): Promise<T> {
  if (res.status === 204) return {} as T
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/json')) {
    // vide le flux au besoin pour libérer le reader
    await res.text().catch(() => { })
    return {} as T
  }
  return res.json()
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// coeur: fetch robuste avec timeout/retry/keepalive
type DoFetchOpts = {
  expectJson?: boolean
  timeoutMs?: number
  keepalive?: boolean
  /** nombre de retries restants pour erreurs transitoires */
  retries?: number
  /** backoff de base en ms (utilisé si retries > 0) */
  backoffBaseMs?: number
}

function shouldRetryOnHttp(status: number) {
  // erreurs transitoires classiques
  return status === 502 || status === 503 || status === 504
}

function isNetworkError(e: any) {
  const msg = String(e?.message || '')
  return e?.name === 'TypeError' || msg.includes('Failed to fetch')
}

// Backoff global (ex: après un 429 côté serveur)

let globalBackoffUntil = 0
async function doFetch<T = any>(path: string, init?: RequestInit, opts: DoFetchOpts = {}): Promise<T> {
  const {
    expectJson = true,
    timeoutMs = 20000,
    keepalive = false,
    retries = 1,
    backoffBaseMs = 350,
  } = opts

  // Respecter un éventuel backoff global (suite à 429)
  const now = Date.now()
  if (now < globalBackoffUntil) {
    await sleep(globalBackoffUntil - now)
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => {
    try { ctrl.abort() } catch { }
  }, timeoutMs)

  try {
    const res = await fetch(
      `${BASE}${path}`,
      await withAuthHeaders({
        ...init,
        keepalive,
        signal: ctrl.signal,
      })
    )

    if (!res.ok) {
      // 429 → lis Retry-After et applique un backoff global + 1 retry
      if (res.status === 429) {
        const ra = res.headers.get('retry-after')
        const waitMs = ra && !Number.isNaN(Number(ra))
          ? Math.max(1000, Number(ra) * 1000)
          : 2000 + Math.floor(Math.random() * 400)
        globalBackoffUntil = Date.now() + waitMs
        await sleep(waitMs)

        if (retries > 0) {
          return doFetch<T>(path, init, {
            expectJson, timeoutMs, keepalive, retries: retries - 1, backoffBaseMs: backoffBaseMs * 2,
          })
        }
      }

      // Cas 5xx → on peut retenter
      if (retries > 0 && shouldRetryOnHttp(res.status)) {
        console.warn(`[api] ${path} → ${res.status} (${res.statusText}) → retry…`)
        await sleep(backoffBaseMs)
        return doFetch<T>(path, init, {
          expectJson, timeoutMs, keepalive, retries: retries - 1, backoffBaseMs: backoffBaseMs * 2,
        })
      }

      // Sinon remonte une erreur enrichie
      const errBody = await res.json().catch(() => ({}))
      throw Object.assign(new Error(res.statusText), { status: res.status, ...errBody })
    }
    return expectJson ? parseJsonIfAny<T>(res) : (undefined as T)
  } catch (e: any) {
    // Retry sur AbortError (HMR / navigation / proxy)
    if (e?.name === 'AbortError' && retries > 0) {
      console.warn(`[api] AbortError on ${path} → retry…`)
      await sleep(backoffBaseMs)
      return doFetch<T>(path, init, {
        expectJson, timeoutMs, keepalive, retries: retries - 1, backoffBaseMs: backoffBaseMs * 2,
      })
    }

    // Retry sur erreurs réseau
    if (isNetworkError(e) && retries > 0) {
      console.warn(`[api] Network error on ${path} → retry…`)
      await sleep(backoffBaseMs)
      return doFetch<T>(path, init, {
        expectJson, timeoutMs, keepalive, retries: retries - 1, backoffBaseMs: backoffBaseMs * 2,
      })
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

// API publique

export async function apiGet<T = any>(path: string, init?: RequestInit): Promise<T> {
  return doFetch<T>(path, init, { expectJson: true })
}

export async function apiPost<T = any>(path: string, body?: any, init?: RequestInit): Promise<T> {
  return doFetch<T>(
    path,
    { method: 'POST', body: body ? JSON.stringify(body) : undefined, ...(init || {}) },
    { expectJson: true }
  )
}

// FormData (upload) — pas de Content-Type forcé
export async function apiPostForm<T = any>(path: string, form: FormData, init?: RequestInit): Promise<T> {
  // uploads → timeout plus long, et on autorise 1 retry
  return doFetch<T>(
    path,
    { method: 'POST', body: form, ...(init || {}) },
    { expectJson: true, timeoutMs: 120_000, retries: 1 }
  )
}

export async function apiPut<T = any>(path: string, body?: any, init?: RequestInit): Promise<T> {
  return doFetch<T>(
    path,
    { method: 'PUT', body: body ? JSON.stringify(body) : undefined, ...(init || {}) },
    { expectJson: true }
  )
}

export async function apiPutForm<T = any>(path: string, form: FormData, init?: RequestInit): Promise<T> {
  //uploads → timeout plus long, et on autorise 1 retry
  return doFetch<T>(
    path,
    { method: 'PUT', body: form, ...(init || {}) },
    { expectJson: true, timeoutMs: 120_000, retries: 1 }
  )
}

// DELETE → attend 204 No Content (void)

export async function apiDelete(path: string, init?: RequestInit): Promise<void> {
  await doFetch(path, { method: 'DELETE', ...(init || {}) }, { expectJson: false })
}

// DELETE → attend une réponse JSON (ex: { ok: true })

export async function apiDeleteJson<T = any>(path: string, init?: RequestInit): Promise<T> {
  return doFetch<T>(path, { method: 'DELETE', ...(init || {}) }, { expectJson: true })
}

// Ping POST sans corps (ex: web push unregister) → keepalive utile

export async function apiPostNoContent(path: string, init?: RequestInit): Promise<void> {
  await doFetch(path, { method: 'POST', ...(init || {}) }, { expectJson: false, keepalive: true })
}

export async function apiGetRaw(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, await withAuthHeaders(init))
}

const api = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  // DELETE (void) et DELETE (JSON)
  del: apiDelete,
  delete: apiDeleteJson,
  postNoContent: apiPostNoContent,
  getRaw: apiGetRaw,
  postForm: apiPostForm,
  putForm: apiPutForm,
}

export default api