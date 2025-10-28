<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet :key="$route.fullPath"></ion-router-outlet>

      <!-- Barre d'onglets en bas -->
      <ion-tab-bar slot="bottom">
        <!--
        <ion-tab-button tab="home" href="/tabs/home">
          <PhHouse :weight="isActive('/tabs/home') ? 'fill' : 'regular'" size="26" class="icon"/>
          <ion-label>Accueil</ion-label>
        </ion-tab-button>
        -->

        <ion-tab-button tab="meetups" href="/tabs/meetups">
          <PhUsers :weight="isActive('/tabs/meetups') ? 'fill' : 'regular'" size="26" class="icon" />
          <ion-label>Rencontres</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="chat" href="/tabs/chats" class="chat-tab">
          <PhChatCircleDots :weight="isActive('/tabs/chats') ? 'fill' : 'regular'" size="26" class="icon" />
          <ion-label>Messages</ion-label>

          <!-- Badge messages non lus -->
          <ion-badge v-if="messagesBadgeCount > 0" class="tab-badge">
            {{ messagesBadgeCount > 99 ? '99+' : messagesBadgeCount }}
          </ion-badge>
        </ion-tab-button>

        <ion-tab-button tab="notif" href="/tabs/notifications" class="notif-tab">
          <PhBell :weight="isActive('/tabs/notifications') ? 'fill' : 'regular'" size="26" class="icon" />
          <ion-label>Notifications</ion-label>

          <!-- Badge notifications non lues -->
          <ion-badge v-if="unreadCount > 0" class="tab-badge">
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </ion-badge>
        </ion-tab-button>

        <ion-tab-button tab="profile" href="/tabs/profilPrive">
          <PhUser :weight="isActive('/tabs/profilPrive') ? 'fill' : 'regular'" size="26" class="icon" />
          <ion-label>Profil</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>

    <!-- Pop-up Notifications -->
    <ion-toast :is-open="toastNotif.open" :message="toastNotif.message" :color="toastNotif.color" :duration="3500"
      :buttons="[{ text: 'Voir', role: 'info', handler: goToNotifications }]" @didDismiss="toastNotif.open = false" />

    <!-- Pop-up Messages -->
    <ion-toast :is-open="toastMsg.open" :message="toastMsg.message" :color="toastMsg.color" :duration="3500"
      :buttons="[{ text: 'Ouvrir', role: 'info', handler: goToChats }]" @didDismiss="toastMsg.open = false" />
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonTabBar, IonTabButton, IonTabs, IonLabel, IonPage, IonRouterOutlet,
  IonBadge, IonToast
} from '@ionic/vue'
import { PhHouse, PhUsers, PhBell, PhUser, PhChatCircleDots } from '@phosphor-icons/vue'
import { useRoute, useRouter } from 'vue-router'
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

// Notifications store
import { useNotifications } from '@/composables/useNotifications'
// API pour les conversations
import api from '@/lib/api'

const route = useRoute()
const router = useRouter()
const isActive = (path: string) => route.path === path

// Notifications (badge + toast)
const { items, fetchPage } = useNotifications()
const unreadCount = computed(() =>
  (items.value || []).reduce((acc: number, n: any) => acc + (n.read ? 0 : 1), 0)
)

const toastNotif = ref({ open: false, message: '', color: 'dark' })
function goToNotifications() {
  toastNotif.value.open = false
  router.push('/tabs/notifications')
}

function showNotifToast(msg: string, color = 'dark') {
  toastNotif.value = { open: true, message: msg, color }
  try { navigator.vibrate?.(25) } catch { }
}

function humanType(t: string) {
  switch (t) {
    case 'friend_request': return 'Demande d’ami'
    case 'friend_accept': return 'Ami accepté'
    case 'meetup_invite': return 'Invitation à une rencontre'
    case 'invite_accepted': return 'Invitation acceptée'
    case 'message': return 'Message'
    default: return 'Notification'
  }
}

const notifSnapshot = ref<Record<string, string>>({})
function snapNotifs(list: any[]) {
  const m: Record<string, string> = {}
  for (const n of list || []) {
    const id = n._id || n.id
    const ts = n.createdAt || n.updatedAt || ''
    if (id && ts) m[id] = ts
  }
  return m
}

async function detectNewNotifs(nextList: any[]) {
  const old = notifSnapshot.value
  const hadOld = Object.keys(old).length > 0
  for (const n of nextList || []) {
    const id = n._id || n.id
    const ts = n.createdAt || n.updatedAt
    const was = old[id]
    const isNew = !was && hadOld
    const isUpdated = was && ts && new Date(ts) > new Date(was)
    if ((isNew || isUpdated) && !n.read) {
      const title = n.title || humanType(n.type || '') || 'Nouvelle notification'
      const body = n.message || n.preview || ''
      showNotifToast(`${title}${body ? ' · ' + body : ''}`)
      break
    }
  }
  notifSnapshot.value = snapNotifs(nextList || [])
}

// Messages (badge + toast)
type Conversation = {
  _id?: string; id?: string;
  name?: string; title?: string;
  lastMessage?: any;
  lastMessageAt?: string; last_message_at?: string;
  lastAt?: string; last_at?: string;
  updatedAt?: string; updated_at?: string;
  createdAt?: string; created_at?: string;
  unreadCount?: number;
}

// Liste courante + snapshot pour comparer
const conversations = ref<Conversation[]>([])

// Map des convs ayant une nouvelle activité non lue (pour badge)
const unreadByConv = ref<Record<string, boolean>>({})
const messagesBadgeCount = computed(() =>
  Object.values(unreadByConv.value).filter(Boolean).length
)

const toastMsg = ref({ open: false, message: '', color: 'primary' })
function goToChats() {
  toastMsg.value.open = false
  router.push('/tabs/chats')
}
function showMsgToast(msg: string, color = 'primary') {
  // Ne pas spammer si on est déjà sur l’onglet /tabs/chats
  if (route.path.startsWith('/tabs/chats')) return
  toastMsg.value = { open: true, message: msg, color }
  try { navigator.vibrate?.(25) } catch { }
}

// Helpers robustes pour timestamp + preview
function getLastPreview(c: Conversation): string {
  const lm = c.lastMessage
  if (!lm) return ''
  if (typeof lm === 'string') return lm
  return lm.text || lm.body || lm.message || lm.preview || ''
}
function getLastTimestamp(c: Conversation): string {
  const lm = c.lastMessage || {}
  return (
    lm.createdAt || lm.created_at || lm.sentAt || lm.sent_at ||
    c.lastMessageAt || c.last_message_at ||
    c.lastAt || c.last_at ||
    c.updatedAt || c.updated_at ||
    c.createdAt || c.created_at || ''
  )
}
function getDisplayName(c: Conversation): string {
  return c.name || c.title || 'Nouveau message'
}

// Snapshot id -> "timestamp|preview"
const msgSnapshot = ref<Record<string, string>>({})
function snapConvos(list: Conversation[]) {
  const m: Record<string, string> = {}
  for (const c of list || []) {
    const id = (c._id || c.id) as string | undefined
    if (!id) continue
    const ts = getLastTimestamp(c)
    const pv = getLastPreview(c)
    if (ts || pv) m[id] = `${ts}|${pv}`
  }
  return m
}

async function fetchConversations() {
  const res = await api.get('/messages')
  const list = res.conversations || res.data?.conversations || res.chats || []
  conversations.value = Array.isArray(list) ? list : []
}

async function detectNewMessages(nextList: Conversation[]) {
  const old = msgSnapshot.value
  const hadOld = Object.keys(old).length > 0
  let shown = false

  const newUnread = { ...unreadByConv.value }

  for (const c of nextList || []) {
    const id = (c._id || c.id) as string | undefined
    if (!id) continue
    const ts = getLastTimestamp(c)
    const pv = getLastPreview(c)
    const key = `${ts}|${pv}`
    const was = old[id]

    const changed = hadOld && key && was && key !== was
    const appeared = hadOld && key && !was
    const hasUnreadFlag = (c.unreadCount || 0) > 0

    if ((changed || appeared || hasUnreadFlag) && !route.path.startsWith('/tabs/chats')) {
      newUnread[id] = true
      if (!shown) {
        shown = true
        const who = getDisplayName(c)
        showMsgToast(`${who}${pv ? ' · ' + pv : ''}`)
      }
    }
  }

  unreadByConv.value = newUnread
  msgSnapshot.value = snapConvos(nextList || [])
}

// Lifecycle
let notifTimer: any = null
let msgTimer: any = null

onMounted(async () => {
  // Notifications
  await fetchPage(10, null)
  notifSnapshot.value = snapNotifs(items.value || [])
  notifTimer = setInterval(async () => {
    await fetchPage(10, null)
    await detectNewNotifs(items.value || [])
  }, 12000)

  // Messages
  await fetchConversations()
  msgSnapshot.value = snapConvos(conversations.value || [])
  msgTimer = setInterval(async () => {
    await fetchConversations()
    await detectNewMessages(conversations.value || [])
  }, 8000)
})

// Si un autre écran rafraîchit la liste des notifs, on détecte ici aussi
watch(items, async (nv, ov) => {
  if (!ov || Object.keys(notifSnapshot.value).length === 0) {
    notifSnapshot.value = snapNotifs(nv || [])
    return
  }
  await detectNewNotifs(nv || [])
}, { deep: false })

// Quand on navigue sur /tabs/chats, on considère tout vu pour le badge local
watch(() => route.path, (p) => {
  if (p.startsWith('/tabs/chats')) {
    unreadByConv.value = {}
    toastMsg.value.open = false
  }
})

onBeforeUnmount(() => {
  if (notifTimer) clearInterval(notifTimer)
  if (msgTimer) clearInterval(msgTimer)
})
</script>

<style scoped>
ion-tab-bar {
  --background: var(--beige);
  padding: 8px;
}

.icon {
  color: var(--beige-pink);
}

ion-label {
  color: var(--beige-pink);
}

/* Badge sur les onglets */
.notif-tab,
.chat-tab {
  position: relative;
}

.tab-badge {
  position: absolute;
  top: 0px;
  font-weight: 800;
  width: 20px;     /* taille minimum */
  height: 20px; 
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
</style>
