import { ref, onMounted, onUnmounted, watch } from 'vue'
import { onAuthStateChanged, getAuth } from 'firebase/auth'
import api from '@/lib/api'

/**
 * Singleton partagé : total d'invitations "pending" (reçues + envoyées).
 * - poll toutes les 30s par défaut (configurable)
 * - expose { total, refresh, start, stop }
 */
const _total = ref(0)
let _timer: number | null = null
let _started = false
const _auth = getAuth()
const _uid = ref<string | null>(_auth.currentUser?.uid || null)

const computeTotal = (incoming: any[], outgoing: any[]) => {
  const incPending = (incoming || []).reduce((acc, row: any) => {
    const list = row.invites || []
    return acc + list.filter((i: any) => i?.status === 'pending').length
  }, 0)
  const outPending = (outgoing || []).filter((x: any) => x?.status === 'pending').length
  return incPending + outPending
}

async function _refreshInternal() {
  if (!_uid.value) { _total.value = 0; return }
  try {
    const [inc, out] = await Promise.all([
      api.get('/meetups/@me/invites/incoming'), // { invites: [...] }
      api.get('/meetups/@me/invites/outgoing')  // { invites: [...] }
    ])
    _total.value = computeTotal(inc?.invites || [], out?.invites || [])
  } catch {
    // silencieux
  }
}

function _start(pollMs: number) {
  _stop()
  _started = true
  _refreshInternal()
  _timer = window.setInterval(_refreshInternal, pollMs)
}

function _stop() {
  if (_timer) {
    window.clearInterval(_timer)
    _timer = null
  }
  _started = false
}

// suivre login/logout
onAuthStateChanged(_auth, (u) => {
  _uid.value = u?.uid || null
  if (_uid.value) {
    if (_started) _refreshInternal()
  } else {
    _stop()
    _total.value = 0
  }
})

export function useInvitesCounter(pollMs = 30000) {
  onMounted(() => {
    if (_uid.value && !_started) _start(pollMs)
  })
  onUnmounted(() => {
    // on NE stoppe PAS le singleton à l’unmount pour conserver le badge
    // (il sera géré par login/logout)
  })

  // si quelqu’un demande un autre pollMs pendant que ça tourne
  watch(() => pollMs, () => {
    if (_started) { _start(pollMs) }
  })

  return {
    total: _total,
    async refresh() { await _refreshInternal() },
    start() { _start(pollMs) },
    stop: _stop,
  }
}
