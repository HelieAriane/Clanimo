<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Notifications</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="visibleItems.length === 0" @click="onMarkAllRead" fill="clear"
            aria-label="Tout marquer comme lu">
            <PhChecks class="icon" :size="24" />
          </ion-button>
          <ion-button :disabled="visibleItems.length === 0" @click="onDeleteAll" fill="clear"
            aria-label="Supprimer tout">
            <PhTrash class="icon" :size="22" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Pull-to-refresh -->
      <ion-refresher slot="fixed" @ionRefresh="doRefresh">
        <ion-refresher-content pulling-text="Tirer pour rafraîchir" />
      </ion-refresher>

      <!-- Demandes d'amis -->
      <h3>Demandes d'amis</h3>
      <div v-if="friendRequests.length">
        <ion-item-sliding v-for="req in friendRequests" :key="req._id">
          <ion-item button detail @click="openNotification(req)">
            <ion-label>
              <div class="notif-header">
                <span v-if="!req.read" class="dot" />
                <span class="title">{{ req.title || 'Demande d’ami' }}</span>
              </div>
              <p v-if="req.message" class="message">{{ req.message }}</p>
              <p v-else class="type">{{ humanType(req.type) }}</p>
              <small class="time">{{ formatDate(req.createdAt) }}</small>
            </ion-label>
          </ion-item>

          <ion-item-options side="end">
            <ion-item-option class="delete-btn" @click="deleteNotification(req)">
              <PhTrash size="30" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </div>
      <p v-else>Aucune demande pour le moment.</p>

      <!-- Invitations -->
      <h3>Invitations</h3>
      <div v-if="invitations.length">
        <ion-item-sliding v-for="inv in invitations" :key="inv._id">
          <ion-item button detail @click="openNotification(inv)">
            <ion-label>
              <div class="notif-header">
                <span v-if="!inv.read" class="dot" />
                <span class="title">{{ inv.title || 'Invitation' }}</span>
              </div>
              <p v-if="inv.message" class="message">{{ inv.message }}</p>
              <p v-else class="type">{{ humanType(inv.type) }}</p>
              <small class="time">{{ formatDate(inv.createdAt) }}</small>
            </ion-label>
          </ion-item>

          <ion-item-options side="end">
            <ion-item-option class="delete-btn" @click="deleteNotification(inv)">
              <PhTrash size="30" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </div>
      <p v-else>Aucune invitation pour le moment.</p>

      <!-- Infinite scroll -->
      <ion-infinite-scroll v-if="nextCursor" threshold="100px" @ionInfinite="loadMore">
        <ion-infinite-scroll-content loading-spinner="dots" loading-text="Chargement…" />
      </ion-infinite-scroll>

      <!-- Modal demande d'ami -->
      <ion-modal :is-open="showFriendRequestModal" @did-dismiss="showFriendRequestModal = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>Demande d’ami</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="showFriendRequestModal = false">Fermer</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
          <p>{{ selectedRequest?.fromUserName || "Nouvelle demande d’ami" }}</p>
          <!-- Si aucune action encore faite -->
          <template v-if="!friendRequestStatus">
            <ion-button expand="block" class="yes-btn" @click="acceptFriendRequest">
              Accepter
            </ion-button>
            <ion-button expand="block" class="no-btn" @click="rejectFriendRequest">
              Refuser
            </ion-button>
          </template>

          <!-- Après action -->
          <template v-else>
            <p v-if="friendRequestStatus === 'accepted'" style="color: var(--dark-blue)">Demande acceptée</p>
            <p v-else style="color: var(--dark-blue)">Demande refusée</p>
          </template>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonRefresher,
  IonRefresherContent, IonItem, IonLabel, IonInfiniteScroll, IonInfiniteScrollContent,
  IonItemSliding, IonItemOptions, IonItemOption, IonModal
} from '@ionic/vue'
import { PhChecks, PhTrash } from '@phosphor-icons/vue'
import { onMounted, computed, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useNotifications } from '@/composables/useNotifications'
import { ref } from 'vue';
import api from "@/lib/api";
import { useAuth } from '@/composables/useAuth'

// store/composable
const { items, nextCursor, fetchPage, markRead, refreshCount } = useNotifications()
const router = useRouter()
const { currentUser } = useAuth()

const me = computed(() => currentUser.value?.uid || null)

// Renvoie true si la notif provient du user courant (donc à ignorer pour type "message")
function isSelfOriginated(n: any): boolean {
  const myId = me.value
  if (!myId || !n) return false
  const candidates = [
    n.actorId, n.userId, n.senderId, n.fromUserId,
    n?.data?.fromUserId, n?.data?.senderId, n?.data?.authorId
  ].filter(Boolean)
  return candidates.some((id: string) => String(id) === String(myId))
}

// Liste "visible" = items sans les messages auto-générés par moi 
const visibleItems = computed(() =>
  items.value.filter(n => !(n.type === 'message' && isSelfOriginated(n)))
)

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  } catch { return '' }
}

function humanType(t: string) {
  switch (t) {
    case 'friend_request': return 'Demande d’ami'
    case 'friend_accept': return 'Ami accepté'
    case 'meetup_invite': return 'Invitation à une rencontre'
    case 'invite_accepted': return 'Invitation acceptée'
    case 'message': return 'Message'
    default: return t
  }
}

// Catégories (sur la liste visible)
const messages = computed(() =>
  visibleItems.value.filter(n => n.type === 'message')
)

const friendRequests = computed(() =>
  visibleItems.value.filter(n =>
    n.type === 'friend_request' ||
    n.type === 'friend_accept' ||
    n.type === 'friend_decline'
  )
)

const friendRequestStatus = ref<null | "accepted" | "rejected">(null)

const invitations = computed(() =>
  visibleItems.value.filter(n => (n.type === 'meetup_invite' || n.type === 'invite_accepted'))
)

/** Au montage :
 *  - charge la page si vide
 *  - marque comme LUES les notifs de message que j’ai moi-même émises (pas de badge ni pop-up)
 */
onMounted(async () => {
  if (!items.value.length) {
    await fetchPage(12).catch(() => { })
  }
  autoMarkMyMessageNotifsAsRead()
})

async function autoMarkMyMessageNotifsAsRead() {
  const mine = items.value.filter(n => n.type === 'message' && isSelfOriginated(n) && !n.read)
  if (!mine.length) return
  try {
    await Promise.all(mine.map(n => markRead(n._id)))
    // MAJ locale
    for (const n of mine) n.read = true
    await refreshCount().catch(() => { })
  } catch (e) {
    // silencieux: ne bloque pas l'UI
    console.warn('[notif] autoMarkMyMessageNotifsAsRead error', e)
  }
}

// Si la liste change (ex: arrivée temps réel), re-marque mes messages comme lus
watchEffect(() => {
  // simple détection: dès que items change, on tente
  autoMarkMyMessageNotifsAsRead()
})

// Pull-to-refresh
async function doRefresh(ev: CustomEvent) {
  try {
    await fetchPage(12, null) // recharge la première page
    await refreshCount().catch(() => { })
    await autoMarkMyMessageNotifsAsRead()
  } finally {
    // @ts-ignore
    ev.target?.complete?.()
  }
}

// Infinite scroll
async function loadMore(ev: CustomEvent) {
  try {
    if (nextCursor.value) {
      await fetchPage(12, nextCursor.value)
      await autoMarkMyMessageNotifsAsRead()
    }
  } finally {
    // @ts-ignore
    ev.target?.complete?.()
  }
}

// Marquer tout comme lu (sur les visibles)
async function onMarkAllRead() {
  try {
    const unread = visibleItems.value.filter(n => !n.read)
    await Promise.all(unread.map(n => markRead(n._id)))
    // MAJ locale pour tous les visibles
    for (const n of unread) n.read = true
    await refreshCount().catch(() => { })
  } catch (e) {
    console.error("Erreur marquer tout comme lu:", e)
  }
}

// Supprimer notification (uniquement celles affichées)
async function deleteNotification(n: any) {
  try {
    await api.del(`/notifications/${n._id}`)
    items.value = items.value.filter(i => i._id !== n._id)
    console.log(`Notification ${n._id} supprimée`)
  } catch (err: any) { console.error('Erreur suppression notification :', err) }
}

// Supprimer toutes les notifications visibles
async function onDeleteAll() {
  if (!visibleItems.value.length) return
  try {
    // Ici on ne supprime QUE celles visibles côté client
    const ids = visibleItems.value.map(n => n._id)
    await Promise.all(ids.map(id => api.del(`/notifications/${id}`)))
    items.value = items.value.filter(n => !ids.includes(n._id))
    console.log('Notifications visibles supprimées')
    await refreshCount().catch(() => { })
  } catch (err) {
    console.error('Erreur suppression notifications :', err)
  }
}

// Popup demande d'ami
const showFriendRequestModal = ref(false);
const selectedRequest = ref<any>(null)

async function acceptFriendRequest() {
  if (!selectedRequest.value?.data?.requestId) return
  try {
    await api.post(`/friends/requests/${selectedRequest.value.data.requestId}/accept`)
    friendRequestStatus.value = "accepted"
  } catch (err: any) {
    console.error('Erreur acceptation ami :', err)
  }
}

async function rejectFriendRequest() {
  if (!selectedRequest.value?.data?.requestId) return
  try {
    await api.post(`/friends/requests/${selectedRequest.value.data.requestId}/decline`)
    friendRequestStatus.value = "rejected"
  } catch (err: any) {
    console.error('Erreur refus ami :', err)
  }
}

// Ouvrir notification
async function openNotification(n: any) {
  // Ne rien faire si c'est une notif de message que j'ai moi-même envoyée
  if (n.type === 'message' && isSelfOriginated(n)) return

  // Marquer comme lu si nécessaire
  if (!n.read) {
    try {
      await markRead(n._id)
      n.read = true // Mettre à jour localement pour que le dot disparaisse
      await refreshCount().catch(() => { })
    } catch (err) {
      console.error('Erreur marquer notification comme lue :', err)
    }
  }

  const currentUserId = me.value
  if (!currentUserId) return

  switch (n.type) {
    case 'friend_request':
      selectedRequest.value = n
      friendRequestStatus.value = null
      showFriendRequestModal.value = true
      break

    case 'friend_accept':
    case 'friend_decline': {
      const otherUserId = n.data?.fromUserId === currentUserId
        ? n.data?.toUserId
        : n.data?.fromUserId
      if (otherUserId) {
        router.push({ name: 'profilPublic', params: { userId: otherUserId }, query: { isFriend: 'true' } })
      }
      break
    }

    case 'meetup_invite':
    case 'invite_accepted': {
      const meetupId = n.data?.meetupId
      if (meetupId) router.push({ name: 'MeetupDetail', params: { id: String(meetupId) } })
      break
    }

    case 'message': {
      // Ouvrir la conversation si fournie
      const convoId = n.data?.conversationId || n.data?.chatId || n.resourceId
      const title = n.data?.fromUserName || 'Message'
      if (convoId) router.push({ name: 'Chat', params: { id: convoId, name: title } })
      break
    }

    default:
      console.warn('Notification type inconnue:', n.type)
  }
}
</script>

<style scoped>
ion-toolbar {
  --color: var(--dark-blue);
}

h3 {
  margin-top: 16px;
  margin-bottom: 8px;
  color: var(--dark-blue);
  font-size: 16px;
  font-weight: bold;
  border-left: 4px solid var(--yellow);
  padding-left: 8px;
  margin-left: 12px;
  margin-top: 24px;
}

p {
  color: var(--beige-pink);
  font-size: 14px;
  margin-left: 26px;
  margin-bottom: 12px;
}

ion-item {
  margin: 12px;
  border-radius: 8px;
  border: 1px solid var(--dark-beige);
  --background: var(--beige);
  padding: 10px;
  --inner-border-width: 0;
  display: flex;
  align-items: center;
  --color: var(--dark-blue) !important;
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--yellow);
  margin-right: 6px;
  vertical-align: middle;
  flex-shrink: 0;
}

.notif-header {
  display: flex;
  align-items: center;
}

.title {
  color: var(--beige-pink);
  font-weight: 600;
  font-size: 14px;
}

.message {
  margin-top: 4px;
  color: var(--dark-blue);
  font-size: 12px;
  margin-left: 0;
}

.time {
  display: block;
  text-align: right;
  font-size: 12px;
  color: var(--dark-blue);
  margin-right: 0;
}

/* Style du modal demande d'ami */
ion-modal p {
  font-weight: 500;
  font-size: 18px;
  color: var(--beige-pink);
  margin-left: 0;
  margin-bottom: 10px;
}

.yes-btn {
  --background: var(--yellow);
  --color: var(--dark-blue);
  margin-bottom: 10px;
}

.no-btn {
  --background: var(--dark-blue);
  --color: var(--yellow);
}

.delete-btn {
  border-start-start-radius: 12px;
  border-end-start-radius: 12px;
  width: 60px;
  margin: 10px 6px 10px 0px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}
</style>
