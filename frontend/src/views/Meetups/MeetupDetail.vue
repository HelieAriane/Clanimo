<template>
  <ion-page>
    <!-- Header -->
    <ion-header>
      <ion-toolbar class="header">
        <ion-buttons slot="start">
          <ion-button fill="clear" @click="router.back()" aria-label="Retour">
            <PhArrowLeft size="22" />
          </ion-button>
        </ion-buttons>
        <ion-title>Détail</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page">
      <!-- Pull-to-refresh -->
      <ion-refresher slot="fixed" @ionRefresh="doRefresh">
        <ion-refresher-content pulling-text="Tirer pour rafraîchir" />
      </ion-refresher>

      <!-- Skeleton -->
      <section v-if="loading" class="skeleton">
        <div class="sk-cover" />
        <div class="wrap ion-padding-horizontal">
          <div class="sk-line big" />
          <div class="sk-line" />
          <div class="sk-line" />
        </div>
      </section>

      <!-- Contenu -->
      <section v-else class="content">
        <div class="cover" :style="coverStyle">
          <div class="overlay" />
          <div class="badges">
            <div class="badge">
              <PhCalendarBlank size="14" />
              {{ formatDate(meetup.date) }}
            </div>
            <div class="badge">
              <PhMapPin size="14" />
              {{ meetup.district || '—' }}
            </div>
          </div>
          <h1 class="title">{{ meetup.title }}</h1>
        </div>

        <div class="wrap ion-padding-horizontal">
          <!-- Description -->
          <div class="block">
            <h3 class="block-title">Description</h3>
            <p class="desc">{{ meetup.description }}</p>
          </div>

          <!-- Localisation optionnelle -->
          <div v-if="hasLocation" class="block">
            <h3 class="block-title">Localisation</h3>
            <div class="loc-line">
              <span>Latitude</span><strong>{{ meetup.lat }}</strong>
            </div>
            <div class="loc-line">
              <span>Longitude</span><strong>{{ meetup.lng }}</strong>
            </div>
            <small class="muted">* Valeurs fournies par l’organisateur</small>
          </div>

          <!-- Créateur -->
          <div class="clickable-user-card-creator" @click="goToPublicProfile(meetup.createdBy)">
            <UserCard class="user-card" :user="creator" />
          </div>

          <!-- Actions -->
          <div class="actions">
            <ion-button size="small" @click="toggleParticipation(meetup)">
              {{ isParticipating(meetup.id) ? '✓ Participe' : 'Participer' }}
            </ion-button>
            <ion-button size="small" @click="openInviteModal(meetup.id)">Inviter</ion-button>
            <ion-button size="small" @click="openParticipantsModal(meetup.id)">
              {{ getParticipantsCount(meetup.id) }} participant(s)
            </ion-button>
          </div>
        </div>
      </section>

      <!-- MODAL Inviter -->
      <ion-modal :is-open="showInviteModal" @did-dismiss="showInviteModal = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>Inviter des amis</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="showInviteModal = false">
                <PhX size="20" class="icon" />
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-searchbar v-model="friendSearch" placeholder="Rechercher un ami" debounce="300" class="searchbar" />
          <div v-if="filteredFriends.length === 0" class="empty-list">
            Aucun ami trouvé.
          </div>
          <div v-else>
            <div v-for="friend in filteredFriends" :key="friend.id" class="modal-user-card">
              <div class="modal-user-info">
                <img :src="friend.avatar || defaultAvatar" class="modal-user-avatar" @error="onAvatarError" />
                <span class="modal-user-name">{{ friend.name || friend.username || friend.id }}</span>
              </div>
              <ion-button v-if="inviteStatus(friend.id, selectedMeetupId) === 'canInvite'" size="small"
                :disabled="workingInvite" @click="inviteFriend(friend.id, selectedMeetupId)">
                <PhUserPlus slot="start" size="25" style="margin-right:6px;" />
                Inviter
              </ion-button>
              <ion-button v-else-if="inviteStatus(friend.id, selectedMeetupId) === 'invited'" expand="block"
                class="sent-btn" disabled>
                <PhPaperPlaneTilt slot="start" size="25" style="margin-right:6px;" />
                Invitation envoyée
              </ion-button>
              <ion-badge v-else>Déjà participant</ion-badge>
            </div>
          </div>
        </ion-content>
      </ion-modal>

      <!-- MODAL Participants -->
      <ion-modal :is-open="showParticipantsModal" @did-dismiss="showParticipantsModal = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>Participants</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="showParticipantsModal = false">
                <PhX size="20" class="icon" />
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div v-if="modalParticipants.length === 0" class="empty-list">
            Aucun participant pour le moment.
          </div>
          <div v-else>
            <div v-for="user in modalParticipants" :key="user._id || user.id"
              class="modal-user-card clickable-user-card-modal"
              @click="!isSelf(user) && goToPublicProfile(user._id || user.id)" :class="{ disabled: isSelf(user) }">
              <div class="modal-user-info">
                <img :src="user.avatarURL || defaultAvatar" class="modal-user-avatar" @error="onAvatarError" />
                <span class="modal-user-name">{{ user.name || user.username || user._id || user.id }}</span>
              </div>
              <ion-badge v-if="isSelf(user)">Moi</ion-badge>
            </div>
          </div>
        </ion-content>
      </ion-modal>

      <!-- TOAST -->
      <ion-toast :is-open="toast.open" :message="toast.message" :color="toast.color" duration="1500"
        @didDismiss="toast.open = false" />
    </ion-content>
  </ion-page>
</template>

<script setup>
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonModal, IonSearchbar, IonToast, IonRefresher, IonRefresherContent
} from '@ionic/vue'
import { useRoute, useRouter } from 'vue-router'
import { ref, computed, onMounted } from 'vue'
import UserCard from '@/components/UserCard.vue'
import { PhArrowLeft, PhCalendarBlank, PhMapPin, PhX } from '@phosphor-icons/vue'
import api from '@/lib/api'
import { getAuth } from 'firebase/auth'
import defaultAvatar from '@/assets/image/clanimo-default-dog-avatar.png';

const route = useRoute()
const router = useRouter()
const auth = getAuth()

// state
const loading = ref(true)
const toast = ref({ open: false, message: '', color: 'dark' })
function showToast(message, color = 'dark') { toast.value = { open: true, message, color } }

const meetup = ref({
  id: '',
  createdBy: '',
  title: '',
  description: '',
  date: '',
  district: '',
  imageUrl: '',
  lat: undefined,
  lng: undefined,
})
const creator = ref(null)
const participantsMap = ref({})
const currentUserId = ref(auth.currentUser?.uid || null)

const friends = ref([])

// Modal
const showParticipantsModal = ref(false)
const modalParticipants = ref([])

const showInviteModal = ref(false)
const selectedMeetupId = ref(null)
const friendSearch = ref("")
const workingInvite = ref(null)
const invitedFriends = ref({})

// computed
const meetupId = computed(() => String(route.params.id || ''))

const hasLocation = computed(() => meetup.value.lat != null && meetup.value.lng != null)

const coverStyle = computed(() => {
  return meetup.value.imageUrl ? { backgroundImage: `url("${meetup.value.imageUrl}")` } : {};
})

const filteredFriends = computed(() => {
  const term = (friendSearch.value || '').toLowerCase()
  return friends.value.filter(f =>
    (f.name || '').toLowerCase().includes(term) ||
    (f.username || '').toLowerCase().includes(term) ||
    (f.id || '').toLowerCase().includes(term)
  )
})

// utils
function normalizeMeetup(m) {
  return {
    id: m._id,
    createdBy: m.createdBy,
    title: m.title,
    description: m.description,
    district: m.district,
    date: m.date,
    imageUrl: m.imageUrl || m.image || null,
    lat: m.lat,
    lng: m.lng
  }
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const opts = { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }
  return d.toLocaleString('fr-CA', opts)
}

// api
async function fetchFriends() {
  try {
    const me = await api.get('/users/@me')
    const ids = Array.isArray(me.user?.friends) ? me.user.friends : []
    if (!ids.length) { friends.value = []; return }
    try {
      const pu = await api.get(`/public/users?ids=${ids.join(',')}`)
      friends.value = pu.users?.map(u => ({
        id: u._id || u.id,
        name: u.name,
        username: u.username,
        avatar: u.avatarURL
      })) || ids.map(id => ({ id }))
    } catch { friends.value = ids.map(id => ({ id })) }
  } catch (err) {
    console.error('fetchFriends error', err)
  }
}

async function fetchDetail() {
  if (!meetupId.value) return
  loading.value = true
  try {
    const res = await api.get(`/meetups/${meetupId.value}`)
    const m = normalizeMeetup(res.meetup || res)
    meetup.value = m

    // Participants
    participantsMap.value[m.id] = Array.isArray(res.meetup?.participants) ? res.meetup.participants : []

    // Créateur
    if (m.createdBy) {
      try {
        const pu = await api.get(`/public/users?ids=${m.createdBy}`)
        creator.value = pu.users?.[0] || null
      } catch { creator.value = null }
    }
  } catch (err) {
    console.error('fetchDetail error', err)
    showToast('Impossible de charger le meetup.', 'danger')
  } finally {
    loading.value = false
  }
}

function doRefresh(ev) {
  fetchDetail().finally(() => ev.target.complete())
}

// Modals
function isParticipating(meetupId) {
  return (participantsMap.value?.[meetupId] || []).includes(currentUserId.value);
}

function getParticipantsCount(meetupId) {
  return (participantsMap.value[meetupId] || []).length;
}

async function toggleParticipation(meetup) {
  if (!currentUserId.value) { showToast('Vous devez être connecté.', 'warning'); return }
  try {
    if (isParticipating(meetup.id)) {
      const res = await api.post(`/meetups/${meetup.id}/leave`)
      if (res?.error === 'owner_cannot_leave') {
        showToast("L'organisateur ne peut pas quitter. Supprimez ou modifiez le meetup.", 'warning')
      } else {
        showToast('Vous avez quitté la rencontre.', 'medium')
      }
    } else {
      await api.post(`/meetups/${meetup.id}/join`)
      showToast('Inscription confirmée', 'success')
    }
    await fetchDetail()
  } catch (e) {
    console.error(e)
    showToast('Action impossible. Réessayez.', 'danger')
  }
}

async function openParticipantsModal(meetupId) {
  try {
    const res = await api.get(`/meetups/${meetupId}/participants`)
    modalParticipants.value = Array.isArray(res.users) ? res.users : []
  } catch {
    modalParticipants.value = []
  } finally {
    showParticipantsModal.value = true
  }
}

async function openInviteModal(meetupId) {
  selectedMeetupId.value = meetupId
  showInviteModal.value = true

  try {
    // Récupérer toutes les invitations du meetup, uniquement celles en pending
    const res = await api.get(`/meetups/${meetupId}/invites`)
    invitedFriends.value[meetupId] = Array.isArray(res.invited)
      ? res.invited.filter(i => i.status === 'pending').map(i => i.toUserId)
      : []
  } catch (err) {
    console.error('Erreur fetch invitations pour meetup', meetupId, err)
    invitedFriends.value[meetupId] = []
  }
}

function inviteStatus(friendId, meetupId) {
  if ((participantsMap.value[meetupId] || []).includes(friendId)) return 'participant'
  if ((invitedFriends.value[meetupId] || []).includes(friendId)) return 'invited'
  return 'canInvite'
}

async function inviteFriend(friendId, meetupId) {
  selectedMeetupId.value = meetupId
  if (!meetupId) return
  workingInvite.value = friendId
  try {
    await api.post(`/meetups/${meetupId}/invite/${friendId}`)
    showToast('Invitation envoyée', 'success')
    if (!invitedFriends.value[meetupId]) invitedFriends.value[meetupId] = []
    invitedFriends.value[meetupId].push(friendId)
  } catch (e) {
    console.error(e)
    showToast('Impossible d’inviter cet ami.', 'danger')
  } finally {
    workingInvite.value = null
  }
}

function isSelf(user) {
  return (user._id || user.id) === currentUserId.value
}

function onAvatarError(event) {
  event.target.src = defaultAvatar;
}


function goToPublicProfile(userId) {
  router.push({ name: 'profilPublic', params: { userId } })
}

// lifecycle
onMounted(() => {
  fetchDetail()
  fetchFriends()
})
</script>


<style scoped>
/* HEADER */
ion-toolbar {
  --color: var(--dark-blue);
}

.header {
  --color: var(--dark-blue);
}

.hero {
  position: relative;
  padding: 16px;
  color: var(--beige-pink);
  border-bottom: 3px solid var(--dark-beige);
  margin-bottom: 16px;
}

.page {
  display: grid;
}

/* SKELETON */
.skeleton .sk-cover {
  height: 220px;
  background: linear-gradient(90deg, #f2f2f2 25%, #f8f8f8 37%, #f2f2f2 63%);
  animation: shimmer 1.1s infinite;
  background-size: 400% 100%;
}

.skeleton .sk-line {
  height: 14px;
  margin: 12px 0;
  border-radius: 6px;
  background: linear-gradient(90deg, #f2f2f2 25%, #f8f8f8 37%, #f2f2f2 63%);
  animation: shimmer 1.1s infinite;
  background-size: 400% 100%;
}

.skeleton .sk-line.big {
  height: 20px;
  width: 70%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0
  }

  100% {
    background-position: -200% 0
  }
}

/* COUVERTURE */
.cover {
  position: relative;
  height: 260px;
  background-size: cover;
  background-position: center;
  border-bottom: 1px solid var(--dark-beige);
}

.overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.0) 20%, rgba(0, 0, 0, 0.25) 70%);
}

.badges {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  backdrop-filter: blur(6px);
  background: var(--dark-beige);
  border: 1px solid var(--dark-beige);
  color: var(--dark-blue);
}

.badge.kind {
  margin-left: auto;
}

.badge.kind.warn {
  background: #fff3f3;
  border-color: #ffd6d6;
}

.title {
  font-family: 'Jakarta', sans-serif;
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 16px;
  margin: 0;
  color: var(--dark-blue);
  font-weight: 600;
  font-size: 22px;
}

/* BLOCS */
.wrap {
  display: grid;
  gap: 14px;
  margin-top: 12px;
}

.block {
  border: 1px solid var(--dark-beige);
  border-radius: 12px;
  padding: 12px;
}

.block-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 800;
  color: var(--dark-blue);
}

.desc {
  margin: 0;
  color: var(--beige-pink);
  line-height: 1.5;
}

/* Créateur */
.clickable-user-card-creator {
  cursor: pointer;
  border: 1px solid var(--dark-beige);
  border-radius: 12px;
}

ion-card {
  border: none !important;
  box-shadow: none !important;
  margin: 0px;
}

/* Localisation */
.loc-line {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px dashed var(--dark-beige);
}

.loc-line:last-child {
  border-bottom: 0;
}

.muted {
  color: var(--beige-pink);
}

/* Actions */
.actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-top: 8px;
}

.actions ion-button {
  --background: var(--yellow);
  --color: var(--dark-blue);
  font-weight: 600;
  font-size: 12px;
  text-transform: none;
  --border-radius: 8px;
  font-weight: 600;
}

/* Modals (réutilisés) */
.searchbar {
  --background: var(--dark-beige);
  --color: var(--beige-pink);
  --border-radius: 10px;
  margin-bottom: 8px;
  padding: 0px;
}

.empty-list {
  color: var(--dark-blue);
  margin-top: 15px;
}

.modal-user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  margin-bottom: 10px;
  background: var(--beige);
  border-radius: 8px;
  border: 1px solid var(--dark-beige);
}

.modal-user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  background-color: transparent;
  border: 1px solid var(--dark-beige);
}

.modal-user-name {
  font-family: 'Jakarta', sans-serif;
  font-weight: 600;
  color: var(--dark-blue);
}

ion-badge {
  color: var(--yellow);
  background-color: var(--dark-blue);
  padding: 7px 12px;
  font-weight: 600;
  font-size: 12px;
  text-transform: none;
  border-radius: 8px;
}

ion-button {
  font-size: 12px;
  font-weight: 600;
  text-transform: none;
  --border-radius: 8px;
}

.invite-btn {
  --background: var(--yellow);
  --color: var(--dark-blue);
}

.sent-btn {
  --background: var(--yellow);
  --color: var(--dark-blue);
}

.clickable-user-card {
  border: none !important;
  box-shadow: none !important;
  border-radius: 12px;
}

.clickable-user-card-modal {
  cursor: pointer;
}

.clickable-user-card-modal.disabled {
  cursor: default;
  pointer-events: none;
}
</style>