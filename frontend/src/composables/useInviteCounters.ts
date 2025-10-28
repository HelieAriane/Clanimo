// src/composables/useInviteCounters.ts
import { ref } from 'vue'
import api from '@/lib/api'

//état réactif global (partagé entre tous les composants)
const totalInvites = ref(0)
let refreshing = false

export function useInviteCounters() {
  // → compteur unique (envoyées en attente + reçues)
  async function refreshCounters() {
    if (refreshing) return
    refreshing = true
    try {
      // backend doit exposer ces endpoints :
      // GET /meetups/@me/invites/incoming
      // GET /meetups/@me/invites/outgoing
      const [incoming, outgoing] = await Promise.all([
        api.get('/meetups/@me/invites/incoming'),
        api.get('/meetups/@me/invites/outgoing'),
      ])
      const inCount = (incoming?.invites || []).length
      // outgoing : on ne compte que celles encore "pending"
      const outCount = (outgoing?.invites || []).reduce((acc: number, inv: any) => {
        return acc + (inv.status === 'pending' ? 1 : 0)
      }, 0)
      totalInvites.value = inCount + outCount
    } catch (e) {
      console.error('refreshCounters error', e)
      totalInvites.value = 0
    } finally {
      refreshing = false
    }
  }

  return {
    totalInvites,
    refreshCounters,
  }
}
