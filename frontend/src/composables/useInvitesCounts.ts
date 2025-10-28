// src/composables/useInvitesCounts.ts
import { ref, onMounted, onUnmounted } from 'vue'
import api from '@/lib/api'

type Counts = {
  incoming: number
  outgoing: number
  total: number
}

const incoming = ref<number>(0)
const outgoing = ref<number>(0)
const total = ref<number>(0)

const loading = ref<boolean>(false)
const error = ref<string | null>(null)

let timer: ReturnType<typeof setInterval> | null = null
let started = false

const DEFAULT_INTERVAL_MS = 30_000 // 30s (ajuste si tu veux)
const ENDPOINT = '/meetups/@me/invites/count'

async function fetchCounts(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const res: { incoming?: number; outgoing?: number; total?: number } = await api.get(ENDPOINT)
    const data: Counts = {
      incoming: Number(res?.incoming ?? 0),
      outgoing: Number(res?.outgoing ?? 0),
      total: Number(res?.total ?? 0),
    }
    incoming.value = data.incoming
    outgoing.value = data.outgoing
    total.value = data.total
  } catch (e: any) {
    // Si l’endpoint n’existe pas encore, ne casse pas l’UI
    if (e?.response?.status === 404) {
      incoming.value = 0
      outgoing.value = 0
      total.value = 0
      console.warn('[useInvitesCounts] Endpoint non trouvé:', ENDPOINT)
    } else {
      error.value = e?.message || 'fetch_failed'
      console.error('[useInvitesCounts] fetchCounts error:', e)
    }
  } finally {
    loading.value = false
  }
}

function startPolling(intervalMs = DEFAULT_INTERVAL_MS): void {
  if (timer) return
  // premier tir + intervalle
  fetchCounts()
  timer = setInterval(fetchCounts, Math.max(5000, intervalMs))
}

function stopPolling(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

/**
 * Forcer un refresh manuel (à appeler après une action: accept/decline/join/leave/invite/cancel/resend)
 */
export async function refreshInvitesCounts(): Promise<void> {
  await fetchCounts()
}

/**
 * Hook principal : partage le même état (singleton) partout.
 * - Démarre le polling au premier montage.
 * - S’arrête au dernier démontage (optionnel, on garde simple: on ne stoppe pas
 *   automatiquement pour conserver un badge frais dans la barre d’onglets).
 */
export function useInvitesCounts(options?: { autoStart?: boolean; intervalMs?: number }) {
  const autoStart = options?.autoStart ?? true
  const intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS

  onMounted(() => {
    if (autoStart && !started) {
      started = true
      startPolling(intervalMs)
    } else if (autoStart) {
      // déjà démarré, on peut tout de même faire un tir immédiat léger
      fetchCounts()
    }
    // Option : rafraîchir si l’onglet revient au premier plan
    const visHandler = () => {
      if (document.visibilityState === 'visible') fetchCounts()
    }
    document.addEventListener('visibilitychange', visHandler)
    onUnmounted(() => {
      document.removeEventListener('visibilitychange', visHandler)
      // On laisse le polling tourner pour garder le badge des onglets à jour.
      // Si tu veux l’arrêter quand plus personne n’utilise le composable :
      // stopPolling()
    })
  })

  return {
    // state
    incoming,
    outgoing,
    total,
    loading,
    error,

    // actions
    refresh: refreshInvitesCounts,
    startPolling,
    stopPolling,
  }
}
