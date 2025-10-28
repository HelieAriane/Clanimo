import { ref } from 'vue'
import api from '@/lib/api'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

const count = ref(0)
let timer: ReturnType<typeof setInterval> | null = null
const POLL_MS = 45_000
let started = false

async function fetchCount() {
  try {
    // Backend déjà en place : GET /meetups/@me/invites/incoming
    // On compte seulement les invites en "pending"
    const res = await api.get('/meetups/@me/invites/incoming')
    const list = Array.isArray(res?.invites) ? res.invites : []
    // chaque item a un champ invites: [{status: 'pending'|'accepted'|'declined', ...}]
    count.value = list.reduce((acc: number, it: any) => {
      const pendings = (it?.invites || []).filter((i: any) => i?.status === 'pending').length
      return acc + pendings
    }, 0)
  } catch {
    // pas grave, on réessaiera au prochain tick
  }
}

function handleVisibility() {
  if (!document.hidden) fetchCount()
}

function start() {
  if (started) return
  started = true
  stop() // sécurité double-start
  fetchCount()
  timer = setInterval(fetchCount, POLL_MS)
  document.addEventListener('visibilitychange', handleVisibility)
}

function stop() {
  if (timer) clearInterval(timer)
  timer = null
  document.removeEventListener('visibilitychange', handleVisibility)
  started = false
  count.value = 0
}

// Démarrage/arrêt auto selon l'auth Firebase
const auth = getAuth()
onAuthStateChanged(auth, (user) => {
  if (user) start()
  else stop()
})

export function useInvitesBadge() {
  return {
    count,
    start,     // au cas où tu veuilles forcer le démarrage côté App/Tabs
    stop,
    refresh: fetchCount,
  }
}
