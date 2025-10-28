// src/composables/useNotifications.ts
import { ref } from 'vue'
import { apiGet, apiPostNoContent } from '@/lib/api'
import { auth } from '@/lib/firebase'

export type Notification = {
  _id: string
  userId: string
  type: 'friend_request' | 'friend_accept' | 'meetup_invite' | 'invite_accepted' | 'test' | string
  title: string
  message?: string
  data?: Record<string, any>
  read: boolean
  createdAt: string
}

const unreadCount = ref<number>(0)

export function useNotifications() {
  const loading = ref(false)
  const items = ref<Notification[]>([])
  const nextCursor = ref<string | null>(null)

  const isLoggedIn = () => Boolean(auth.currentUser)

  async function refreshCount() {
    // Pas connecté → pas d’appel API, compte = 0
    if (!isLoggedIn()) { unreadCount.value = 0; return }
    try {
      const { count } = await apiGet<{ count: number }>('/notifications/unread/count')
      unreadCount.value = count ?? 0
    } catch {
      // silencieux (ex: token expiré pendant le logout)
      unreadCount.value = 0
    }
  }

  async function fetchPage(limit = 10, cursor?: string | null) {
    if (!isLoggedIn()) { items.value = []; nextCursor.value = null; return }
    loading.value = true
    try {
      const qs = new URLSearchParams({ limit: String(limit) })
      if (cursor) qs.set('cursor', cursor)
      const res = await apiGet<{ notifications: Notification[], nextCursor: string | null }>(`/notifications?${qs}`)
      if (!cursor) items.value = res.notifications
      else items.value = [...items.value, ...res.notifications]
      nextCursor.value = res.nextCursor
    } catch {
      // en cas d’erreur, on ne casse pas l’UI
      if (!cursor) { items.value = []; nextCursor.value = null }
    } finally {
      loading.value = false
    }
  }

  async function markRead(id: string) {
    if (!isLoggedIn()) return
    try {
      await apiPostNoContent(`/notifications/${id}/read`)
      const it = items.value.find(n => n._id === id)
      if (it && !it.read) {
        it.read = true
        if (unreadCount.value > 0) unreadCount.value -= 1
      } else {
        await refreshCount()
      }
    } catch {
      // silencieux
    }
  }

  async function markAllRead() {
    if (!isLoggedIn()) return
    try {
      await apiPostNoContent(`/notifications/mark-all-read`)
      items.value.forEach(n => (n.read = true))
      unreadCount.value = 0
    } catch {
      // silencieux
    }
  }

  // Reset auto quand l’utilisateur se déconnecte
  // (optionnel : utile si le composable reste vivant)
  auth.onAuthStateChanged((u) => {
    if (!u) {
      unreadCount.value = 0
      items.value = []
      nextCursor.value = null
    }
  })

  return {
    // state
    unreadCount, items, nextCursor, loading,
    // actions
    refreshCount, fetchPage, markRead, markAllRead,
  }
}
