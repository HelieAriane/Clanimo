<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Messages</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding" chats-content>
      <ion-searchbar v-model="searchQuery" placeholder="Rechercher" class="chat-searchbar" debounce="300" />

      <div v-for="chat in filteredChats" :key="chat.id" class="chat-item"
        :class="{ 'chat-unread': chat.unreadComputed > 0 }" @click="openConversation(chat)">
        <div class="avatar-wrap">
          <ion-avatar class="chat-avatar">
            <img :src="chat.displayAvatar || defaultAvatar" @error="onAvatarError" />
          </ion-avatar>
          <span v-if="chat.unreadComputed > 0" class="dot-unread" aria-hidden="true"></span>
        </div>

        <div class="chat-info">
          <p class="chat-name">{{ chat.displayName }}</p>
          <p class="chat-message">{{ chat.lastMessage || '—' }}</p>
        </div>

        <div class="chat-meta">
          <span class="chat-time" v-if="chat.lastAt">{{ formatTime(chat.lastAt) }}</span>
        </div>
      </div>

      <p v-if="!loading && filteredChats.length === 0" class="no-chats">
        Aucun message pour le moment.
      </p>
    </ion-content>
  </ion-page>
</template>

<script setup>
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonAvatar, IonBadge
} from '@ionic/vue'
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getMessaging, onMessage, getToken } from 'firebase/messaging'
import api from '@/lib/api'
import defaultAvatar from '@/assets/image/clanimo-default-dog-avatar.png'

const router = useRouter()

// --- état
const loading = ref(true)
const searchQuery = ref('')
const conversations = ref([])
const rawConversations = ref([])
const currentUserId = ref(null)
const usersById = ref({})

const SEEN_LS_KEY = 'pp_seen_conversations'
const seenIndex = ref(loadSeenIndex()) // { convId: isoLastSeen }
const notifiedMessages = ref({})
const pollTimer = ref(null)

// utilitaires
function onAvatarError(e) { e.target.src = defaultAvatar }

function loadSeenIndex() {
  try {
    const raw = localStorage.getItem(SEEN_LS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveSeenIndex() {
  try { localStorage.setItem(SEEN_LS_KEY, JSON.stringify(seenIndex.value || {})) } catch { }
}

function formatTime(iso) {
  try {
    const d = new Date(iso)
    const now = new Date()
    const diff = (now - d) / 1000
    if (diff < 60) return 'Maintenant'
    if (diff < 3600) return `${Math.floor(diff / 60)} min`
    if (diff < 86400) return d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('fr-CA', { day: '2-digit', month: '2-digit' })
  } catch { return '' }
}

function getOtherParticipantId(c) {
  const me = currentUserId.value
  if (!me) return null
  const candidates = c.participants || c.members || c.users || c.userIds || []
  for (const p of candidates) {
    const id = typeof p === 'string' ? p : (p?._id || p?.id)
    if (id && id !== me) return id
  }
  return null
}

function getSenderId(msg) {
  if (!msg) return null
  return msg.senderId || msg.from || msg.userId || msg.authorId || msg.uid || null
}

// Normalise une conv, calcule unreadComputed et nom/avatar
function normalizeConversation(c) {
  const id = c._id || c.id
  const lastMessageObj = typeof c.lastMessage === 'string'
    ? { text: c.lastMessage, createdAt: c.lastAt || c.updatedAt }
    : c.lastMessage || {}
  const lastText = lastMessageObj.text || lastMessageObj.body || ''
  const lastAt = lastMessageObj.createdAt || c.lastAt || c.updatedAt || null

  let name = c.name || c.title || ''
  let avatar = c.avatarURL || c.avatar || c.photoURL || ''

  if (!name) {
    if (c.user) {
      name = c.user.name || c.user.displayName || 'Conversation'
      avatar = avatar || c.user.avatarURL || c.user.photoURL || ''
    } else {
      const otherId = getOtherParticipantId(c)
      const friend = otherId ? usersById.value[otherId] : null
      name = friend?.displayName || friend?.name || friend?.username || 'Conversation'
      avatar = avatar || friend?.avatarURL || friend?.photoURL || friend?.picture || ''
    }
  }

  // Calcul unread : uniquement si dernier message **pas de moi**
  const senderId = getSenderId(c.lastMessage)
  const fromMe = senderId && currentUserId.value && senderId === currentUserId.value

  let unreadComputed = 0
  if (!fromMe && lastAt) {
    const lastIso = new Date(lastAt).toISOString()
    const prevIso = seenIndex.value?.[id]
    unreadComputed = !prevIso || lastIso > prevIso ? 1 : 0
  }

  return {
    id,
    displayName: name,
    displayAvatar: avatar,
    lastMessage: lastText,
    lastAt,
    unreadComputed,
    _raw: c,
    fromMe // utile pour debugging et notifications
  }
}

// Notifications Web
async function ensureNotifPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const perm = await Notification.requestPermission().catch(() => 'denied')
  return perm === 'granted'
}

function notifyNewMessage(conv) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  new Notification(conv.displayName || 'Nouveau message', {
    body: conv.lastMessage || 'Vous avez reçu un nouveau message.'
  })
}

// Notification - uniquement les messages entrants non encore notifiés
function emitNotificationsIfAny(conversationsList) {
  for (const conv of conversationsList) {
    if (!conv.fromMe && conv.unreadComputed > 0) {
      const lastAt = new Date(conv.lastAt).toISOString()
      if (notifiedMessages.value[conv.id] !== lastAt) {
        ensureNotifPermission()
        notifyNewMessage(conv)
        notifiedMessages.value[conv.id] = lastAt
      }
    }
  }
}

// API
async function fetchConversations() {
  loading.value = true
  try {
    const res = await api.get('/messages')
    const list = res.conversations || res.chats || res.data?.conversations || []
    rawConversations.value = Array.isArray(list) ? list : []

    // Hydrate profils manquants (DM)
    const missingIds = new Set()
    for (const c of rawConversations.value) {
      const hasName = !!(c.name || c.title)
      if (!hasName) {
        const otherId = getOtherParticipantId(c)
        if (otherId && !usersById.value[otherId]) missingIds.add(otherId)
      }
    }
    if (missingIds.size) {
      try {
        const ids = [...missingIds]
        const resUsers = await api.get(`/public/users?ids=${ids.join(',')}`)
        if (Array.isArray(resUsers.users)) {
          const idx = { ...usersById.value }
          for (const u of resUsers.users) idx[u._id || u.id] = u
          usersById.value = idx
        }
      } catch (e) {
        console.warn('[chats] /public/users fallback:', e)
      }
    }

    const next = rawConversations.value.map(normalizeConversation)
    await emitNotificationsIfAny(next)
    conversations.value = next
  } catch (err) {
    console.error('Erreur chargement conversations', err)
  } finally {
    loading.value = false
  }
}

// Filtre recherche
const filteredChats = computed(() => {
  const q = (searchQuery.value || '').toLowerCase().trim()
  if (!q) return conversations.value
  return conversations.value.filter(c =>
    c.displayName.toLowerCase().includes(q) ||
    (c.lastMessage || '').toLowerCase().includes(q)
  )
})

// Ouvrir une conversation → marquer comme lu (local + API si dispo) puis naviguer
async function openConversation(chat) {
  const nowIso = new Date().toISOString()

  // Marque “vu” localement
  seenIndex.value = {
    ...(seenIndex.value || {}),
    [chat.id]: new Date().toISOString()
  }
  saveSeenIndex()

  // Essaye de prévenir le backend (optionnel)
  try { await api.post(`/messages/${chat.id}/read`) } catch { }

  router.push({
    name: 'Chat',
    params: {
      id: chat.id,
      name: chat.displayName,
      avatar: chat.displayAvatar
    }
  })
}

// Enregistrement du token FCM
async function registerDeviceToken() {
  try {
    const messaging = getMessaging()
    const token = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY })
    if (token) {
      await api.post('/devices', { token, platform: 'web' })
    }
  } catch (e) {
    console.warn('Erreur token device:', e)
  }
}

// Gestion des notifications push FCM en direct
function setupFCMListeners(conversationsRef) {
  const messaging = getMessaging()
  onMessage(messaging, payload => {
    const convId = payload.data?.convId
    const senderId = payload.data?.senderId

    // ignore mes propres messages
    if (senderId === currentUserId.value) return

    const msgText = payload.notification?.body || 'Nouveau message'

    // notification locale
    if (Notification.permission === 'granted') {
      new Notification(payload.notification?.title || 'Nouveau message', { body: msgText })
    }

    // met à jour la conversation dans l'UI
    const conv = conversationsRef.value.find(c => c.id === convId)
    if (conv) {
      conv.lastMessage = msgText
      conv.lastAt = new Date().toISOString()
      conv.unreadComputed = 1
    }
  })
}

onMounted(() => {
  const auth = getAuth()
  onAuthStateChanged(auth, async (user) => {
    currentUserId.value = user?.uid || null
    await fetchConversations()
    await registerDeviceToken()
    setupFCMListeners(conversations)
    if (pollTimer.value) clearInterval(pollTimer.value)
    pollTimer.value = setInterval(async () => {
      await fetchConversations()
      emitNotificationsIfAny(conversations.value)
    }, 12000)
  })
})

onBeforeUnmount(() => {
  if (pollTimer.value) clearInterval(pollTimer.value)
})

</script>

<style scoped>
ion-toolbar {
  --color: var(--dark-blue);
}

.no-chats {
  font-size: 14px;
  color: var(--dark-blue);
  margin-left: 10px;
}

.chat-searchbar {
  --background: var(--dark-beige);
  --color: var(--beige-pink);
  --border-radius: 10px;
  margin-bottom: 20px;
}

.chat-item {
  display: grid;
  grid-template-columns: 60px 1fr auto;
  gap: 12px;
  align-items: center;
  border-radius: 12px;
  border: 1px solid var(--dark-beige);
  background: var(--beige);
  padding: 10px 12px;
  margin: 10px 6px 14px;
  cursor: pointer;
  transition: transform .08s ease, box-shadow .12s ease, border-color .12s ease;
}

.chat-item:hover {
  transform: translateY(-1px);
  border-color: var(--yellow);
  box-shadow: 0 8px 18px rgba(0, 0, 0, .06);
}

.avatar-wrap {
  position: relative;
  width: 60px;
  height: 60px;
}

.chat-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--dark-beige);
}

.chat-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dot-unread {
  position: absolute;
  background: var(--yellow);
  right: -2px;
  top: -2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--beige);
}

.chat-unread {
  border: 2px solid var(--dark-blue);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.chat-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-name {
  margin: 0 0 2px;
  font-weight: 800;
  font-size: 15px;
  color: var(--dark-blue);
}

.chat-message {
  margin: 0;
  font-size: 13px;
  color: var(--beige-pink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.chat-time {
  font-size: 12px;
  color: var(--beige-pink);
}
</style>