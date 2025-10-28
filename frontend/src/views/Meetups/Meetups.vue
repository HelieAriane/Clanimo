<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="header">
        <ion-buttons slot="start">
          <ion-img :src="iconLogo" alt="icon clanimo" class="header-logo" />
        </ion-buttons>
        <ion-title>Rencontres</ion-title>

        <!-- Boutons carte / paramètres -->
        <ion-buttons slot="end">
          <ion-button @click="goToMap" fill="clear" aria-label="Carte">
            <PhMapPinArea class="icon" :size="22" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page">
      <!-- Pull-to-refresh -->
      <ion-refresher slot="fixed" @ionRefresh="doRefresh">
        <ion-refresher-content pulling-text="Tirer pour rafraîchir" />
      </ion-refresher>

      <!-- HERO -->
      <section class="hero ion-padding-horizontal">
        <div class="hero-badge">
          <span class="badge-dot" />
          Événements canins
        </div>
        <h1 class="hero-title">
          Trouve ta prochaine <span class="accent">balade</span> 🐾
        </h1>
        <p class="hero-sub">
          Filtre par quartier, date ou mot-clé. Rejoins la meute&nbsp;!
        </p>
      </section>

      <!-- FILTRES RAPIDES -->
      <section class="filters ion-padding-horizontal">
        <!-- Recherche -->
        <ion-searchbar v-model="search" debounce="300" placeholder="Rechercher une rencontre…"
          class="searchbar"></ion-searchbar>

        <!-- Filtres temps -->
        <div class="time-chips">
          <button v-for="t in timeOptions" :key="t.value" class="chip" :class="{ active: timeFilter === t.value }"
            @click="setTimeFilter(t.value)">
            {{ t.label }}
          </button>
        </div>
        <div class="advanced-filter-btn">
          <ion-button class="open-advanced" @click="toggleFilterSidebar">
            Filtres avancés
          </ion-button>
        </div>
      </section>

      <div v-if="showFilterSidebar" class="overlay" @click="toggleFilterSidebar"></div>
      <!-- SIDEBAR FILTRES (conservée) -->
      <div class="filter-sidebar" :class="{ open: showFilterSidebar }">
        <div class="filter-header">
          <h3>Filtres</h3>
          <ion-button size="small" @click="toggleFilterSidebar">
            <PhX size="20" class="icon" />
          </ion-button>
        </div>

        <div class="filter-card">
          <ion-label class="filter-label">Quartier(s)</ion-label>
          <ion-select v-model="selectedDistricts" multiple placeholder="Choisir quartier(s)">
            <ion-select-option v-for="district in districts" :key="district" :value="district">
              {{ district }}
            </ion-select-option>
          </ion-select>
        </div>

        <div class="filter-card">
          <ion-label class="filter-label">Dates</ion-label>
          <div class="date-filters">
            <ion-input type="date" v-model="startDate" placeholder="Début"></ion-input>
            <ion-input type="date" v-model="endDate" placeholder="Fin"></ion-input>
          </div>
        </div>

        <div class="filter-buttons">
          <ion-button @click="applyFilters" size="small" expand="block" class="filter-button">
            Appliquer
          </ion-button>
          <ion-button @click="resetFilters" size="small" expand="block" class="reset-button">
            Réinitialiser
          </ion-button>
        </div>
      </div>

      <!-- ÉTATS / LISTES -->
      <section class="list ion-padding-horizontal">
        <!-- Loading skeleton -->
        <div v-if="loading" class="cards">
          <div class="card skeleton" v-for="i in 4" :key="i">
            <div class="sk-img" />
            <div class="sk-line" />
            <div class="sk-line small" />
          </div>
        </div>

        <!-- Vide -->
        <div v-else-if="filteredMeetups.length === 0" class="state">
          <div class="state-ico paw">🐶</div>
          <h3>Aucune rencontre trouvée</h3>
          <p>Modifie tes filtres ou crée la première !</p>
          <ion-button class="cta" @click="goToForm">
            <PhPlus size="18" style="margin-right:6px" /> Créer une rencontre
          </ion-button>
        </div>

        <!-- Mes Offres -->
        <div v-else-if="myMeetups.length > 0" class="group">
          <h2 class="section-title">Mes Offres</h2>
          <div class="cards">
            <article v-for="meetup in myMeetups" :key="meetup.id" class="card">
              <div class="cover" :style="coverStyle(meetup)">
                <div class="badge when">
                  <PhCalendarBlank size="14" /> {{ formatDate(meetup.date) }}
                </div>
                <div class="badge where">
                  <PhMapPin size="14" /> {{ meetup.district || '—' }}
                </div>
              </div>

              <div class="content">
                <h3 class="title">{{ meetup.title }}</h3>
                <p class="desc">{{ meetup.description }}</p>

                <!-- Carte utilisateur (créateur) si dispo -->
                <div v-if="usersMap[meetup.createdBy]" class="clickable-user-card"
                  :class="{ disabled: meetup.createdBy === currentUserId }"
                  @click="meetup.createdBy !== currentUserId ? goToPublicProfile(meetup.createdBy) : null">
                  <UserCard class="user-card" :user="usersMap[meetup.createdBy]" />
                </div>

                <!-- Actions -->
                <div class="actions">
                  <ion-button size="small" @click="openInviteModal(meetup.id)">Inviter</ion-button>
                  <ion-button size="small" @click="openParticipantsModal(meetup.id)">
                    {{ getParticipantsCount(meetup.id) }} participant(s)
                  </ion-button>
                </div>
              </div>
            </article>
          </div>
        </div>

        <!-- Demandes -->
        <div v-if="othersMeetups.length > 0" class="group">
          <h2 class="section-title">Publications</h2>
          <div class="cards">
            <article v-for="meetup in othersMeetups" :key="meetup.id" class="card">
              <div class="cover" :style="coverStyle(meetup)">
                <div class="badge when">
                  <PhCalendarBlank size="14" /> {{ formatDate(meetup.date) }}
                </div>
                <div class="badge where">
                  <PhMapPin size="14" /> {{ meetup.district || '—' }}
                </div>
              </div>

              <div class="content">
                <h3 class="title">{{ meetup.title }}</h3>
                <p class="desc">{{ meetup.description }}</p>

                <!-- Carte utilisateur (créateur) si dispo -->
                <div v-if="usersMap[meetup.createdBy]" class="clickable-user-card"
                  :class="{ disabled: meetup.createdBy === currentUserId }"
                  @click="meetup.createdBy !== currentUserId ? goToPublicProfile(meetup.createdBy) : null">
                  <UserCard class="user-card" :user="usersMap[meetup.createdBy]" />
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
            </article>
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
              class="modal-user-card clickable-user-card"
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

      <!-- FAB Créer -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="goToForm" class="fab">
          <PhPlus size="22" />
        </ion-fab-button>
      </ion-fab>

      <!-- Toast -->
      <ion-toast :is-open="toast.open" :message="toast.message" :color="toast.color" duration="1500"
        @didDismiss="toast.open = false" />
    </ion-content>
  </ion-page>
</template>

<script setup>
import iconLogo from '@/assets/image/icon.svg'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonFab, IonFabButton, IonSelect, IonSelectOption, IonInput, IonModal,
  IonSearchbar, IonToast, IonLabel, IonRefresher, IonRefresherContent, IonBadge, onIonViewWillEnter
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import { ref, computed } from 'vue'
import UserCard from '@/components/UserCard.vue'
import { PhPlus, PhMapPinArea, PhMapPin, PhCalendarBlank, PhX, PhUserPlus, PhPaperPlaneTilt } from '@phosphor-icons/vue'
import api from '@/lib/api'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import defaultAvatar from '@/assets/image/clanimo-default-dog-avatar.png';

const router = useRouter()

// 👉 Base API pour transformer /api/... en URL absolue
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4200/api/v1'
const API_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, '')
function imgSrc(u) {
  if (!u) return ''
  if (/^(https?:|data:)/i.test(u)) return u
  if (u.startsWith('/api/')) return `${API_ORIGIN}${u}`
  return u
}

// Navigation header
function goToMap() { router.push({ name: 'meetupsMap' }) }
function goToForm() { router.push({ name: 'MeetupForm' }) }

// Filtres (sidebar existante)
const showFilterSidebar = ref(false)
const selectedDistricts = ref([])
const startDate = ref('')
const endDate = ref('')

// Recherche + Filtres rapides
const search = ref('')
const timeFilter = ref('upcoming')
const timeOptions = [
  { value: 'upcoming', label: 'À venir' },
  { value: 'today', label: "Aujourd’hui" },
  { value: 'weekend', label: 'Week-end' },
  { value: 'week', label: '7 jours' }
]
function setTimeFilter(v) { timeFilter.value = v; applyFilters() }

// Données / état
const currentUserId = ref(null)
const loading = ref(true)
const toast = ref({ open: false, message: '', color: 'dark' })
function showToast(message, color = 'dark') { toast.value = { open: true, message, color } }

// Données liées
const users = ref([])
const friends = ref([])
const meetups = ref([])
const participants = ref({})
const usersMap = computed(() =>
  Object.fromEntries((users.value || []).map(u => [u._id || u.id, u]))
)

const districts = ref([
  'Ahuntsic-Cartierville', 'Anjou', 'Côte-des-Neiges–Notre-Dame-de-Grâce',
  'Lachine', 'LaSalle', 'Le Plateau-Mont-Royal', 'Le Sud-Ouest',
  "L'Île-Bizard–Sainte-Geneviève", 'Mercier–Hochelaga-Maisonneuve',
  'Montréal-Nord', 'Outremont', 'Pierrefonds-Roxboro',
  'Rivière-des-Prairies–Pointe-aux-Trembles', 'Rosemont–La Petite-Patrie',
  'Saint-Laurent', 'Saint-Léonard', 'Verdun', 'Ville-Marie',
  'Villeray–Saint-Michel–Parc-Extension'
])

// Auth & bootstrap
const auth = getAuth()
onAuthStateChanged(auth, async (user) => {
  loading.value = true
  try {
    if (user) {
      currentUserId.value = user.uid
      await Promise.all([fetchMeetups(), fetchFriends()])
    } else {
      currentUserId.value = null
      meetups.value = []
      friends.value = []
    }
  } finally {
    loading.value = false
  }
})

// Utils
function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const opts = { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
  return d.toLocaleString('fr-CA', opts)
}
function inFilterRange(d, filter) {
  if (!d) return false
  const now = new Date()
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return false
  const sameDay = now.toDateString() === dt.toDateString()
  const diffDays = Math.floor((dt - now) / (1000 * 60 * 60 * 24))
  switch (filter) {
    case 'today': return sameDay
    case 'weekend': return [0, 6].includes(dt.getDay())
    case 'week': return diffDays >= 0 && diffDays <= 7
    case 'upcoming': return dt >= now
    default: return true
  }
}

// Garde bien l'image renvoyée par l'API (m.image) OU l'ancien champ (m.imageUrl)
function normalizeMeetup(m) {
  return {
    id: m._id,
    createdBy: m.createdBy,
    title: m.title,
    description: m.description,
    district: m.district,
    date: m.date,
    image: m.image || m.imageUrl || null,
    participants: Array.isArray(m.participants) ? m.participants : []
  }
}

function coverStyle(m) {
  const raw = m.image || m.imageUrl || ''
  const url = imgSrc(raw)
  return url ? { backgroundImage: `url("${url}")` } : {}
}

// API
async function fetchMeetups() {
  loading.value = true
  try {
    const res = await api.get('/meetups')
    const list = Array.isArray(res.meetups) ? res.meetups : []
    meetups.value = list.map(normalizeMeetup)

    // participants map
    const map = {}
    for (const m of list) map[m._id] = Array.isArray(m.participants) ? m.participants : []
    participants.value = map

    // récupérer les invitations pour chaque meetup
    for (const m of list) {
      try {
        const invitesRes = await api.get(`/meetups/${m._id}/invites`)
        invitedFriends.value[m._id] = Array.isArray(invitesRes.invited)
          ? invitesRes.invited
            .filter(i => i.status === 'pending')
            .map(i => i.toUserId)
          : []
      } catch {
        invitedFriends.value[m._id] = []
      }
    }

    // créateurs (si endpoint batch public disponible)
    const creatorIds = [...new Set(list.map(m => m.createdBy).filter(Boolean))]
    if (creatorIds.length) {
      try {
        const pu = await api.get(`/public/users?ids=${creatorIds.join(',')}`)
        console.log('User', pu)
        if (Array.isArray(pu.users)) {
          const asMap = Object.fromEntries((users.value || []).map(u => [u._id || u.id, u]))
          for (const u of pu.users) asMap[u._id || u.id] = u
          users.value = Object.values(asMap)
        }
      } catch { }
    }
  } catch (err) {
    console.error('fetchMeetups error', err)
    showToast('Impossible de charger les rencontres.', 'danger')
  } finally {
    loading.value = false
  }
}

async function fetchFriends() {
  try {
    const me = await api.get('/users/@me')
    const ids = Array.isArray(me.user?.friends) ? me.user.friends : []
    if (!ids.length) { friends.value = []; return }
    try {
      const pu = await api.get(`/public/users?ids=${ids.join(',')}`)
      if (Array.isArray(pu.users)) {
        friends.value = pu.users.map(u => ({
          id: u._id || u.id,
          name: u.name,
          username: u.username,
          avatar: u.avatarURL
        }))
        return
      }
    } catch { }
    friends.value = ids.map(id => ({ id }))
  } catch (err) {
    console.error('fetchFriends error', err)
  }
}

// Computed
const filteredMeetups = computed(() => {
  const list = Array.isArray(meetups.value) ? meetups.value : []
  const q = search.value.trim().toLowerCase()

  return list.filter(m => {
    const okText = !q ||
      (String(m.title || '').toLowerCase().includes(q) ||
        String(m.description || '').toLowerCase().includes(q))

    const okDistrict = !selectedDistricts.value.length || selectedDistricts.value.includes(m.district)

    let okDateRange = true
    const meetupDate = m.date ? new Date(m.date) : null
    const start = startDate.value ? new Date(startDate.value) : null
    const end = endDate.value ? new Date(endDate.value) : null
    if (start && meetupDate) okDateRange = meetupDate >= start
    if (end && meetupDate) okDateRange = okDateRange && meetupDate <= end

    const okTime = inFilterRange(m.date, timeFilter.value)

    return okText && okDistrict && okDateRange && okTime
  })
})

const myMeetups = computed(() =>
  filteredMeetups.value.filter(m => m.createdBy === currentUserId.value)
)
const othersMeetups = computed(() =>
  filteredMeetups.value.filter(m => m.createdBy !== currentUserId.value)
)

const filteredFriends = computed(() => {
  const term = (friendSearch.value || '').toLowerCase()
  const list = Array.isArray(friends.value) ? friends.value : []
  if (!term) return list
  return list.filter(f =>
    (f.name || '').toLowerCase().includes(term) ||
    (f.username || '').toLowerCase().includes(term) ||
    (f.id || '').toLowerCase().includes(term)
  )
})

// Actions / UI
function toggleFilterSidebar() { showFilterSidebar.value = !showFilterSidebar.value }
async function applyFilters() { showFilterSidebar.value = false }
async function resetFilters() {
  selectedDistricts.value = []
  startDate.value = ''
  endDate.value = ''
}

function doRefresh(ev) { fetchMeetups().finally(() => ev.target.complete()) }

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
    await fetchMeetups()
  } catch (e) {
    console.error(e)
    showToast('Action impossible. Réessayez.', 'danger')
  }
}

function isParticipating(meetupId) {
  return (participants.value?.[meetupId] || []).includes(currentUserId.value)
}

// Modals
const showParticipantsModal = ref(false)
const modalParticipants = ref([])

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

const showInviteModal = ref(false)
const selectedMeetupId = ref(null)
const friendSearch = ref("")
const workingInvite = ref(null)
const invitedFriends = ref({})

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
  if ((participants.value[meetupId] || []).includes(friendId)) return 'participant'
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

function getParticipantsCount(meetupId) {
  return (participants.value?.[meetupId] || []).length
}

function isSelf(user) {
  return (user._id || user.id) === currentUserId.value
}

function onAvatarError(event) {
  event.target.src = defaultAvatar;
}

function goToPublicProfile(userId) {
  router.push({ name: 'profilPublic', params: { userId } });
}

onIonViewWillEnter(async () => {
  if (currentUserId.value) {
    loading.value = true
    try {
      await Promise.all([fetchMeetups(), fetchFriends()])
    } finally {
      loading.value = false
    }
  }
})
</script>

<style scoped>
ion-toolbar {
  --color: var(--dark-blue);
}

/* Header */
.header {
  --color: var(--dark-blue);
  backdrop-filter: blur(6px);
  border-bottom: 1px solid var(--dark-beige);
}

.header-logo {
  width: 24px;
  height: 24px;
  margin-left: 8px;
}

/* Hero */
.hero {
  position: relative;
  padding: 16px;
  color: var(--beige-pink);
  border-bottom: 3px solid var(--dark-beige);
  margin-bottom: 16px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--dark-blue);
  border: 2px solid var(--dark-beige);
  color: var(--dark-beige);
  font-weight: 700;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--yellow);
  display: inline-block;
}

.hero-title {
  margin: 10px 0 2px;
  font-family: 'Jakarta', sans-serif;
  font-weight: 800;
  font-size: 22px;
  color: var(--dark-blue)
}

.hero-title .accent {
  color: var(--beige-pink)
}

.hero-sub {
  margin: 0;
  color: var(--beige-pink);
  font-size: 12px;
}

/* Filtres rapides */
.searchbar {
  --background: var(--dark-beige);
  --color: var(--beige-pink);
  --border-radius: 10px;
  margin-bottom: 12px;
  padding: 0px;
}

.filters {
  display: grid;
  gap: 8px;
}

.time-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.chip {
  font-weight: 700;
  font-size: 12px;
  padding: 8px 10px;
  border-radius: 999px;
  border: 2px solid var(--dark-beige);
  background: var(--beige);
  color: var(--dark-blue);
}

.chip.active {
  background: var(--dark-blue);
  color: var(--beige);
}

.open-advanced {
  --color: var(--dark-blue);
  border-radius: 10px;
  font-size: 12px;
  margin: 0px;
  --border-radius: 8px;
  font-weight: 600;
}

/* SIDEBAR */
.filter-sidebar {
  position: fixed;
  top: 0;
  right: -350px;
  width: 350px;
  height: 100%;
  background-color: var(--beige);
  box-shadow: -1px 0 8px rgba(0, 0, 0, 0.15);
  padding: 20px;
  padding-top: 45px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  transition: right 0.3s ease;
  z-index: 1001;
}

.filter-sidebar.open {
  right: 0;
}

/* Overlay derrière la sidebar */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.35);
  z-index: 1000;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  color: var(--dark-blue);
}

.icon {
  --color: var(--dark-blue);
  --background-color: var(--yellow);
}

.filter-card {
  background-color: var(--beige);
  padding: 10px;
  color: var(--dark-blue);
  border-radius: 8px;
  border: 1px solid var(--dark-beige);
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
}

.filter-label {
  font-family: 'Jakarta', sans-serif;
  font-weight: 600;
  color: var(--beige-pink);
  font-size: 14px;
}

.date-filters {
  margin-top: 8px;
  display: flex;
  gap: 10px;
}

.filter-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filter-button {
  --background: var(--yellow);
  --color: var(--dark-blue);
  --border-radius: 8px;
  font-weight: 600;
}

.reset-button {
  --background: var(--dark-blue);
  --color: var(--yellow);
  --border-radius: 8px;
  font-weight: 600;
}

/* Section et Liste */
.section-title {
  font-family: 'Jakarta', sans-serif;
  font-weight: bold;
  font-size: 24px;
  color: var(--dark-blue);
  margin: 16px 0 0;
}

.list {
  display: grid;
  gap: 16px;
}

.group {
  display: grid;
  gap: 10px;
}

/* Cartes */
.cards are {
  display: grid;
  gap: 14px;
}

.cards {
  display: grid;
  gap: 14px;
}

.card {
  border: 2px solid var(--dark-beige);
  border-radius: 16px;
  overflow: hidden;
  background: var(--beige);
}

.cover {
  position: relative;
  height: 260px;
  background: linear-gradient(135deg, #fff8e6, #ffe9d1);
  background-size: cover;
  background-position: center;
}

.badge {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  backdrop-filter: blur(6px);
  background: var(--beige);
  border: 1px solid var(--dark-beige);
  color: var(--dark-blue);
}

.badge.when {
  top: 10px;
  left: 10px;
  background: var(--dark-beige);
}

.badge.where {
  bottom: 10px;
  right: 10px;
  background: var(--dark-beige);
}

/* Content */
.content {
  padding: 12px;
}

.title {
  margin: 0 0 6px;
  font-weight: 800;
  font-size: 16px;
  color: var(--dark-blue);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.desc {
  margin: 0 0 8px;
  color: var(--beige-pink);
  font-size: 13px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

user-card {
  border: none !important;
}

.clickable-user-card {
  cursor: pointer;
}

ion-card {
  border: none !important;
  box-shadow: none !important;
  margin: 0px;
}

.clickable-user-card.disabled {
  cursor: default;
  pointer-events: none;
}

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
  --border-radius: 8px;
  font-weight: 600;
  font-size: 12px;
  text-transform: none;
  font-weight: 600;
}

/* ÉTATS */
.state {
  text-align: center;
  padding: 28px 12px;
  color: var(--dark-blue);
  border: 2px dashed var(--dark-beige);
  border-radius: 16px;
  background: #fffefa;
  margin-top: 15px;
}

.state-ico {
  font-size: 48px;
  margin-bottom: 6px;
}

.state h3 {
  margin: 6px 0 4px;
  font-weight: 800;
}

.state p {
  margin: 0 0 10px;
  color: var(--beige-pink);
}

.state .cta {
  --background: var(--yellow);
  --color: var(--dark-blue);
  --border-radius: 8px;
  font-weight: 600;
}

/* Skeletons */
.skeleton .sk-img {
  height: 160px;
  background: linear-gradient(90deg, #f2f2f2 25%, #f8f8f8 37%, #f2f2f2 63%);
  animation: shimmer 1.1s infinite;
  background-size: 400% 100%;
}

.skeleton .sk-line {
  height: 14px;
  margin: 10px 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f2f2f2 25%, #f8f8f8 37%, #f2f2f2 63%);
  animation: shimmer 1.1s infinite;
  background-size: 400% 100%;
}

.skeleton .sk-line.small {
  width: 60%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0
  }

  100% {
    background-position: -200% 0
  }
}

/* Liste vide */
.empty-list {
  color: var(--dark-blue);
  margin-top: 15px;
}

/* Fab */
.fab {
  --background: var(--yellow);
  --color: var(--dark-blue);
  border-radius: 16px;
}

/* Divers */
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
</style>
