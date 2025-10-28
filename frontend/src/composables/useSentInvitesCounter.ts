// src/composables/useSentInvitesCounter.ts
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import api from '@/lib/api'

/**
 * Compte les invitations *envoyées* en statut "pending" (owner).
 * - pollMs: intervalle de rafraîchissement (ms)
 * - autoStart: démarre automatiquement si user connecté
 */
export function useSentInvitesCounter(pollMs = 30000, autoStart = true) {
  const count = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const auth = getAuth()
  const userRef = ref<User | null>(auth.currentUser || null)

  let timer: number | null = null
  let unsubAuth: (() => void) | null = null

  async function fetchCount() {
    if (!userRef.value) { count.value = 0; return }
    loading.value = true
    error.value = null
    try {
      // Backend: GET /meetups/@me/invites/sent
      // Retour attendu: { invites: [ { invites: [{status: 'pending'|'accepted'|'declined', ...}], ... }, ... ] }
      const res = await api.get('/meetups/@me/invites/sent')
      const list = Array.isArray(res?.invites) ? res.invites : []
      const pending = list.reduce((acc: number, item: any) => {
        const invs = Array.isArray(item?.invites) ? item.invites : []
        return acc + invs.filter((i: any) => i?.status === 'pending').length
      }, 0)
      count.value = pending
    } catch (e) {
      error.value = 'fetch_failed'
    } finally {
      loading.value = false
    }
  }

  function start() {
    stop()
    fetchCount()
    timer = window.setInterval(fetchCount, pollMs)
    window.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onFocus)
  }
  function stop() {
    if (timer !== null) { window.clearInterval(timer); timer = null }
    window.removeEventListener('visibilitychange', onVis)
    window.removeEventListener('focus', onFocus)
  }
  function onVis() { if (document.visibilityState === 'visible') fetchCount() }
  function onFocus() { fetchCount() }

  onMounted(() => {
    unsubAuth = onAuthStateChanged(auth, (u) => {
      userRef.value = u
      if (u && autoStart) start()
      else stop()
    })
    if (userRef.value && autoStart) start()
  })
  onBeforeUnmount(() => {
    stop()
    if (unsubAuth) unsubAuth()
  })

  return { count, loading, error, refresh: fetchCount, start, stop }
}
