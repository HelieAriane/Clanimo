<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <PhArrowLeft size="24" style="margin-left: 10px; cursor: pointer;" @click="goBack" class="icon" />
        </ion-buttons>
        <ion-title>Carte des rencontres</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-no-padding">
      <!-- HERO premium -->
      <div class="hero">
        <div class="hero-title">
          <div class="badge">
            <span class="badge-dot" />
            Rencontres à proximité
          </div>
          <h2>{{ nearbyCount }} événements ≤ {{ radiusKm }} km</h2>
          <p class="sub">Rafraîchissez ou recadrez la carte pour la mettre à jour.</p>
        </div>
        <div class="hero-controls">
          <div class="chip" @click="toggleSpotlight" :class="{ on: showSpotlight }">Zone ciblée</div>
          <div class="chip" @click="toggleIsochrones" :class="{ on: showIsochrones }">Zones de temps</div>
        </div>
      </div>

      <div class="screen">
        <!-- Toolbar carte -->
        <div class="filters">
          <label>Rayon : {{ radiusKm }} km</label>
          <input type="range" min="1" max="25" v-model.number="radiusKm" @change="onRadiusChange" />
          <ion-button size="small" class="btn" @click="reload" aria-label="Rafraîchir la carte">
            <PhArrowClockwise :size="20" />
          </ion-button>
          <ion-button size="small" class="btn" @click="centerOnMe" :disabled="isLocating">
            <span v-if="!isLocating">📍 Ma position</span>
            <span v-else>Localisation…</span>
          </ion-button>
          <ion-button size="small" class="btn" @click="toggleParks" :color="showParks ? '' : undefined">
            {{ showParks ? 'Parcs 🐾' : 'Parcs' }}
          </ion-button>
        </div>

        <!-- Carte -->
        <div class="map-wrap">
          <div class="map" ref="mapEl"></div>

          <!-- Spotlight radial premium (off par défaut) -->
          <div v-if="showSpotlight" class="spotlight" :style="spotStyle"></div>

          <!-- Légende -->
          <div class="legend">
            <div class="leg-item">
              <span class="pin-sample"></span>
              <span>Point de rencontre</span>
            </div>
            <div class="leg-item">
              <span class="ring ring10"></span> 10 min
              <span class="ring ring20"></span> 20 min
              <span class="ring ring30"></span> 30 min
            </div>
          </div>

          <!-- Bottom sheet: fiche rencontre -->
          <transition name="slide-up">
            <div v-if="sheetOpen && selectedMeetup" class="meetup-sheet" ref="sheetEl">
              <div class="sheet-handle"></div>

              <div class="sheet-row">
                <div class="sheet-title">
                  <div class="pill" :class="freshnessClass(selectedMeetup.date)">
                    {{ freshnessLabel(selectedMeetup.date) }}
                  </div>
                  <h3>{{ selectedMeetup.title }}</h3>
                  <div class="meta">
                    <span>{{ fmtDate(selectedMeetup.date) }}</span>
                    <span v-if="selectedMeetup.d">📍 {{ selectedMeetup.d }}</span>
                  </div>
                </div>

                <div class="sheet-cta">
                  <ion-button size="small" fill="outline" @click="routeToSelected" :disabled="!selectedMeetupLL">
                    Itinéraire
                  </ion-button>
                  <ion-button size="small" fill="clear" @click="goToDetail">
                    Détails
                  </ion-button>
                </div>
              </div>

              <div class="sheet-stats">
                <div class="stat">
                  <span class="v">{{ participantsCountDisplay }}</span>
                  <span class="k">Participants</span>
                </div>
                <div class="sep"></div>
                <div class="stat">
                  <span class="v">{{ distanceKmDisplay }}</span>
                  <span class="k">Distance</span>
                </div>
              </div>

              <ion-button expand="block" class="btn-join" :disabled="joining" @click="toggleParticipationFromMap">
                <span v-if="!joining">{{ participating ? 'Quitter la rencontre' : 'Participer' }}</span>
                <span v-else>Veuillez patienter…</span>
              </ion-button>
            </div>
          </transition>
        </div>
      </div>

      <ion-toast :is-open="toast.open" :message="toast.message" :color="toast.color" duration="1500"
        @didDismiss="toast.open = false" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonButton, IonToast
} from '@ionic/vue'
import { ref, onMounted, onBeforeUnmount, computed, nextTick, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { PhArrowClockwise, PhArrowLeft } from '@phosphor-icons/vue'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import api from '@/lib/api'
import L from 'leaflet'
import type { LeafletMouseEvent } from 'leaflet'
import 'leaflet.markercluster'
import 'leaflet-routing-machine'

//  Fix icônes Leaflet sous Vite
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl })

type Meetup = {
  _id: string
  title: string
  d?: string
  date: string
  location?: { type: 'Point', coordinates: [number, number] }
  locationText?: string
}

const router = useRouter()
const auth = getAuth()
const currentUserId = ref<string | null>(null)
onAuthStateChanged(auth, (u) => { currentUserId.value = u?.uid || null })

// Data
const meetups = ref<Meetup[]>([])
const nearbyCount = computed(() => meetups.value.length)

// Map refs
const mapEl = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let baseDay: L.TileLayer | null = null
let parksLayer: L.LayerGroup | null = null
let meetupsCluster: L.MarkerClusterGroup | null = null
let radiusCircle: L.Circle | null = null
let routingControl: any = null
const routingActive = ref(false)

// Smart layers
let leafletHeatAvailable = false
let isochronesGroup: L.LayerGroup | null = null

// UI state
const isLocating = ref(false)
const center = ref({ lat: 45.508, lng: -73.587 }) // Montréal
const radiusKm = ref(8)
const showParks = ref(false)
const showSpotlight = ref(false) // off par défaut
const showIsochrones = ref(true)

// Utils
function toLatLng(m: Meetup) {
  if (m?.location?.coordinates?.length === 2) {
    const [lng, lat] = m.location.coordinates
    return { lat, lng }
  }
  return null
}

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

function freshness(iso: string) {
  const diffH = (new Date(iso).getTime() - Date.now()) / 3_600_000
  if (diffH <= 6) return 'urgent'
  if (diffH <= 48) return 'soon'
  return 'later'
}

function freshnessClass(iso: string) {
  const f = freshness(iso)
  return f === 'urgent' ? 'urgent' : f === 'soon' ? 'soon' : 'later'
}

function freshnessLabel(iso: string) {
  const f = freshness(iso)
  return f === 'urgent' ? 'Imminent' : f === 'soon' ? 'Bientôt' : 'À venir'
}

// Spotlight
const spotStyle = ref<Record<string, string>>({})
function updateSpotlight() {
  if (!map || !mapEl.value || !showSpotlight.value) return
  const cpx = map.latLngToContainerPoint(center.value)
  const box = mapEl.value.getBoundingClientRect()
  const meters = radiusKm.value * 1000
  const dest = L.latLng(center.value.lat + (meters / 111_320), center.value.lng)
  const dpx = map.latLngToContainerPoint(dest)
  const rPx = Math.abs(dpx.y - cpx.y)
  spotStyle.value = {
    background: `radial-gradient(circle ${rPx}px at ${cpx.x}px ${cpx.y}px,
      rgba(0,0,0,0) 0%,
      rgba(0,0,0,0) 60%,
      rgba(0,0,0,0.18) 100%)`,
    width: box.width + 'px',
    height: box.height + 'px'
  }
}

// Parks
const dogParks = [
  // Ahuntsic-Cartierville
  { name: "Parc Saint-Benoit", lat: 45.5407, lng: -73.6649, d: "Ahuntsic-Cartierville" },
  { name: "Parc du Sault-au-Récollet", lat: 45.5706, lng: -73.6449, d: "Ahuntsic-Cartierville" },
  { name: "Parc Ahuntsic", lat: 45.5561, lng: -73.6662, d: "Ahuntsic-Cartierville" },

  // Anjou
  { name: "Parc Lucie-Bruneau", lat: 45.6032, lng: -73.5839, d: "Anjou" },

  // Côte-des-Neiges–Notre-Dame-de-Grâce
  { name: "Parc de la Confédération", lat: 45.4737, lng: -73.6415, d: "Côte-des-Neiges–Notre-Dame-de-Grâce" },
  { name: "Parc Notre-Dame-de-Grâce", lat: 45.4731, lng: -73.6142, d: "Côte-des-Neiges–Notre-Dame-de-Grâce" },
  { name: "Parc Trenholme", lat: 45.4615, lng: -73.6322, d: "Côte-des-Neiges–Notre-Dame-de-Grâce" },
  { name: "Parc William-Bowie", lat: 45.4583, lng: -73.6503, d: "Côte-des-Neiges–Notre-Dame-de-Grâce" },

  // Lachine
  { name: "Parc à chien de l’arrondissement de Lachine", lat: 45.4359, lng: -73.6884, d: "Lachine" },

  // LaSalle
  { name: "Parc canin Frederick-Mackenzie", lat: 45.4369, lng: -73.6131, d: "LaSalle" },

  // Le Plateau-Mont-Royal
  { name: "Parc La Fontaine", lat: 45.5272, lng: -73.5646, d: "Le Plateau-Mont-Royal" },
  { name: "Parc Sir-Wilfrid-Laurier", lat: 45.5324, lng: -73.5890, d: "Le Plateau-Mont-Royal" },

  // Le Sud-Ouest
  { name: "Parc Gallery", lat: 45.4914, lng: -73.5572, d: "Le Sud-Ouest" },
  { name: "Parc Angrignon", lat: 45.4455, lng: -73.5998, d: "Le Sud-Ouest" },
  { name: "Parc Le Ber", lat: 45.4785, lng: -73.5495, d: "Le Sud-Ouest" },
  { name: "Parc Louis-Cyr", lat: 45.4765, lng: -73.5815, d: "Le Sud-Ouest" },
  { name: "Bande Saint-Antoine", lat: 45.4871, lng: -73.5790, d: "Le Sud-Ouest" },
  { name: "Parc Campbell-Ouest", lat: 45.4602, lng: -73.5952, d: "Le Sud-Ouest" },

  // L'Île-Bizard–Sainte-Geneviève
  { name: "Parc canin", lat: 45.5022, lng: -73.8790, d: "L'Île-Bizard–Sainte-Geneviève" },

  // Mercier–Hochelaga-Maisonneuve
  { name: "Parc Liébert", lat: 45.5962, lng: -73.5290, d: "Mercier–Hochelaga-Maisonneuve" },
  { name: "Parc de la Bruère", lat: 45.5946, lng: -73.5201, d: "Mercier–Hochelaga-Maisonneuve" },
  { name: "Parc Félix-Leclerc", lat: 45.5902, lng: -73.5634, d: "Mercier–Hochelaga-Maisonneuve" },
  { name: "Parc Lalancette", lat: 45.5487, lng: -73.5498, d: "Mercier–Hochelaga-Maisonneuve" },
  { name: "Parc Wolfred-Nelson", lat: 45.5496, lng: -73.5330, d: "Mercier–Hochelaga-Maisonneuve" },

  // Montréal-Nord
  { name: "Parc Pilon", lat: 45.5934, lng: -73.6418, d: "Montréal-Nord" },

  // Outremont
  { name: "Parc Canin d’Outremont", lat: 45.5202, lng: -73.6206, d: "Outremont" },

  // Pierrefonds-Roxboro
  { name: "Parc Brook", lat: 45.5104, lng: -73.8409, d: "Pierrefonds-Roxboro" },
  { name: "Parc Grier", lat: 45.4566, lng: -73.8845, d: "Pierrefonds-Roxboro" },

  // Rivière-des-Prairies–Pointe-aux-Trembles
  { name: "Parc de l’École secondaire Pointe-aux-Trembles", lat: 45.6845, lng: -73.4942, d: "Rivière-des-Prairies–Pointe-aux-Trembles" },

  // Rosemont–La Petite-Patrie
  { name: "Parc Beaubien", lat: 45.5543, lng: -73.5897, d: "Rosemont–La Petite-Patrie" },
  { name: "Parc Père-Marquette", lat: 45.5385, lng: -73.5911, d: "Rosemont–La Petite-Patrie" },
  { name: "Parc du Pélican", lat: 45.5436, lng: -73.5725, d: "Rosemont–La Petite-Patrie" },
  { name: "Parc Lafond", lat: 45.5516, lng: -73.5699, d: "Rosemont–La Petite-Patrie" },

  // Saint-Laurent
  { name: "Parc Marcel-Laurin", lat: 45.5088, lng: -73.6994, d: "Saint-Laurent" },
  { name: "Parc Cousineau", lat: 45.5222, lng: -73.6915, d: "Saint-Laurent" },
  { name: "Parc Gohier", lat: 45.5074, lng: -73.6814, d: "Saint-Laurent" },
  { name: "Parc à chiens du parc du Bois-Franc", lat: 45.5105, lng: -73.7170, d: "Saint-Laurent" },

  // Saint-Léonard
  { name: "Parc à chiens Jean-Talon - Provencher", lat: 45.5712, lng: -73.5878, d: "Saint-Léonard" },
  { name: "Parc à chiens Arthur-Péloquin", lat: 45.5784, lng: -73.5968, d: "Saint-Léonard" },

  // Verdun
  { name: "Parc Arthur-Therrien", lat: 45.4540, lng: -73.5662, d: "Verdun" },
  { name: "Parc Champion", lat: 45.4692, lng: -73.5588, d: "Verdun" },

  // Ville-Marie
  { name: "Parc des Royaux", lat: 45.5297, lng: -73.5592, d: "Ville-Marie" },
  { name: "Parc canin Duke-Brennan", lat: 45.4955, lng: -73.5539, d: "Ville-Marie" },

  // Villeray–Saint-Michel–Parc-Extension
  { name: "Parc Jarry", lat: 45.5344, lng: -73.6240, d: "Villeray–Saint-Michel–Parc-Extension" },
  { name: "Parc Villeray", lat: 45.5481, lng: -73.6230, d: "Villeray–Saint-Michel–Parc-Extension" }
];

function drawParks() {
  if (!map || !parksLayer) return
  parksLayer.clearLayers()
  if (!showParks.value) return
  dogParks.forEach(p => {
    const html = `<b>${p.name}</b>${p.d ? `<div>${p.d}</div>` : ''}`
    L.circleMarker([p.lat, p.lng], {
      radius: 6, color: '#895D6D', weight: 2, fillColor: '#895D6D', fillOpacity: 0.9
    }).bindPopup(html).addTo(parksLayer!)
  })
}

// Isochrones
function drawIsochrones() {
  if (!map) return
  if (isochronesGroup) { isochronesGroup.clearLayers() }
  else { isochronesGroup = L.layerGroup().addTo(map) }
  if (!showIsochrones.value) return

  const MIN_SPEED = 75 // m/min marche
  const rings = [
    { min: 10, color: '#2A9D8F' },
    { min: 20, color: '#E9C46A' },
    { min: 30, color: '#E76F51' },
  ]
  rings.forEach(r => {
    const radiusM = r.min * MIN_SPEED
    L.circle([center.value.lat, center.value.lng], {
      radius: radiusM,
      color: r.color,
      weight: 2,
      opacity: 0.85,
      dashArray: '6,6',
      fillOpacity: 0
    }).addTo(isochronesGroup!)
  })
}

// Pins & cluster
function pinHTML(m: Meetup) {
  const titleSafe = (m.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return `
    <div class="pin" style="position: relative;">
      <span class="pulse"></span>
      <span class="dot"></span>
      <div class="tag" 
           style="
             padding: 2px 6px;
             border-radius: 8px;
             display: inline-flex;;
             justify-content: center;
             align-items: center;
             white-space: nowrap;
             font-weight: bold;
             color: #32354B;
             font-size: 14px;
             text-decoration: underline;
           ">
        <span class="tag-title">${titleSafe}</span>
      </div>
    </div>
  `
}

function clusterIconCreate(cluster: any) {
  const children = cluster.getAllChildMarkers()

  const html = `
    <div class="clu" 
         style="
           background: #F2D346; 
           color: #32354B;
           width: 70px; 
           height: 40px; 
           display: flex; 
           justify-content: center; 
           align-items: center; 
           font-weight: 600;
           font-size: 14px;
           border-radius: 8px;">
      <span>${children.length}</span>
    </div>
  `
  return L.divIcon({ html, className: 'clu-wrap', iconSize: [50, 50] })
}

// UI state
const sheetOpen = ref(false)
const selectedMeetup = ref<Meetup | null>(null)
const sheetEl = ref<HTMLDivElement | null>(null) // ref pour le meetup-sheet

// Fermer le sheet quand on clique en dehors
function handleClickOutside(e: MouseEvent) {
  if (!sheetEl.value) return
  if (!sheetEl.value.contains(e.target as Node)) {
    sheetOpen.value = false
    selectedMeetup.value = null
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

const participating = ref(false)
const participantsCount = ref<number | null>(null)
const joining = ref(false)

const participantsCountDisplay = computed(() =>
  participantsCount.value == null ? '—' : String(participantsCount.value)
)

const selectedMeetupLL = computed(() => {
  if (!selectedMeetup.value?.location?.coordinates) return null
  const [lng, lat] = selectedMeetup.value.location.coordinates
  return { lat, lng }
})

const distanceKmDisplay = computed(() => {
  const ll = selectedMeetupLL.value
  if (!ll) return '—'
  const d = haversine(center.value.lat, center.value.lng, ll.lat, ll.lng)
  return d.toFixed(1) + ' km'
})


function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3, φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(1 - a), Math.sqrt(a))
  return (R * c) / 1000
}

async function openMeetupCard(m: Meetup, e?: MouseEvent) {
  if (e) e.stopPropagation()
  selectedMeetup.value = m
  sheetOpen.value = true
  await loadParticipants(m._id)
}

async function loadParticipants(meetupId: string) {
  try {
    const res = await api.get(`/meetups/${meetupId}/participants`) // { users: [...] }
    const users = Array.isArray(res.users) ? res.users : []
    participantsCount.value = users.length
    const myId = currentUserId.value
    participating.value = !!(myId && users.some((u: any) => (u._id || u.id) === myId))
  } catch {
    // fallback : inconnu
    participantsCount.value = null
    participating.value = false
  }
}

async function toggleParticipationFromMap() {
  if (!selectedMeetup.value) return
  if (!currentUserId.value) {
    showToast('Connectez-vous pour participer.', 'warning')
    return
  }
  try {
    joining.value = true
    if (participating.value) {
      const res = await api.post(`/meetups/${selectedMeetup.value._id}/leave`)
      if (res?.error === 'owner_cannot_leave') {
        showToast("L'organisateur ne peut pas quitter.", 'warning')
      } else {
        showToast('Vous avez quitté la rencontre.', 'dark')
      }
    } else {
      await api.post(`/meetups/${selectedMeetup.value._id}/join`)
      showToast('Inscription confirmée 🎉', 'success')
    }
    await Promise.all([loadParticipants(selectedMeetup.value._id), reload()])
  } catch (e) {
    console.error(e)
    showToast('Action impossible. Réessayez.', 'danger')
  } finally {
    joining.value = false
  }
}

function routeToSelected() {
  const ll = selectedMeetupLL.value
  if (!ll) return
  startRouteTo(ll.lat, ll.lng)
}
function goToDetail() {
  if (!selectedMeetup.value) return
  router.push({ name: 'MeetupDetail', params: { id: selectedMeetup.value._id } })
}

async function drawMeetupsCluster() {
  if (!map || !meetupsCluster) return
  meetupsCluster.clearLayers()

  for (const m of meetups.value) {
    const ll = toLatLng(m)
    if (!ll) continue
    const marker = L.marker([ll.lat, ll.lng], {
      icon: L.divIcon({
        html: pinHTML(m),
        className: 'pin-wrap',
        iconAnchor: [16, 36],
      }),
    }) as any
    marker.options.meetup = m
    marker.on('click', (e: LeafletMouseEvent) => openMeetupCard(m, e.originalEvent as MouseEvent))
    meetupsCluster.addLayer(marker)
  }
}

// Routing (sans marqueurs grâce à un plan custom)
function startRouteTo(lat: number, lng: number) {
  if (!map) return
  if (routingControl) { routingControl.remove(); routingControl = null }

  // Plan sans marqueur (createMarker renvoie null)
  const plan = (L.Routing.plan as any)(
    [L.latLng(center.value.lat, center.value.lng), L.latLng(lat, lng)],
    { createMarker: () => null }
  )

  routingControl = (L.Routing.control as any)({
    plan,
    routeWhileDragging: false,
    addWaypoints: false,
    fitSelectedRoutes: true,
    show: false,
    lineOptions: { styles: [{ color: '#1a73e8', weight: 5, opacity: 0.9 }] } as any,
    router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' })
  }).addTo(map)

  routingActive.value = true
}

// API & reload
async function loadMeetupsNear() {
  const qs = new URLSearchParams({
    lat: String(center.value.lat),
    lng: String(center.value.lng),
    radiusKm: String(radiusKm.value),
  })
  const res = await api.get<{ meetups: Meetup[] }>(`/meetups/near?${qs}`)
  meetups.value = (res.meetups || []).filter(m => m.location?.coordinates?.length === 2)
}

async function reload() {
  try {
    await loadMeetupsNear()
    drawRadius()
    await drawMeetupsCluster()
    drawParks()
    drawIsochrones()
    await nextTick()
    updateSpotlight()
    map?.invalidateSize()
  } catch (e) {
    console.error('[meetups map] reload error', e)
  }
}

// Map init
function setBaseLayers() {
  if (!map) return
  if (baseDay) map.removeLayer(baseDay)

  baseDay = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    { attribution: '&copy; OpenStreetMap' }
  ).addTo(map)
}

function drawRadius() {
  if (!map) return
  if (radiusCircle) { radiusCircle.removeFrom(map); radiusCircle = null }
  radiusCircle = L.circle([center.value.lat, center.value.lng], {
    radius: radiusKm.value * 1000,
    color: '#1a73e8',
    weight: 1,
    fillColor: '#1a73e8',
    fillOpacity: 0.08
  }).addTo(map)
}

function onRadiusChange() {
  drawRadius()
  drawIsochrones()
  updateSpotlight()
}

async function centerOnMe() {
  if (!map) return
  if (!('geolocation' in navigator)) return
  isLocating.value = true
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 })
    })
    center.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
    map.setView([center.value.lat, center.value.lng], Math.max(12, map.getZoom()))
    await reload()
  } catch {/* ignore */ }
  finally { isLocating.value = false }
}

onMounted(async () => {
  try {
    // @ts-ignore
    await import('leaflet.heat')
    // @ts-ignore
    leafletHeatAvailable = !!(L as any).heatLayer
  } catch { leafletHeatAvailable = false }

  if (!mapEl.value) return
  map = L.map(mapEl.value, { zoomControl: true })
  setBaseLayers()

  parksLayer = L.layerGroup().addTo(map)
  meetupsCluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    disableClusteringAtZoom: 16,
    iconCreateFunction: clusterIconCreate
  }).addTo(map)

  map.setView([center.value.lat, center.value.lng], 12)
  drawRadius()
  drawParks()
  drawIsochrones()
  updateSpotlight()
  setTimeout(() => map?.invalidateSize(), 0)

  map.on('move zoom', () => updateSpotlight())
  map.on('moveend', () => {
    const c = map!.getCenter()
    center.value = { lat: c.lat, lng: c.lng }
    updateSpotlight()
  })

  await centerOnMe().catch(() => { })
  await reload()
})

onBeforeUnmount(() => {
  if (routingControl) { routingControl.remove(); routingControl = null }
  map?.remove()
  map = null
})

// UI
function toggleParks() { showParks.value = !showParks.value; drawParks() }
function toggleSpotlight() { showSpotlight.value = !showSpotlight.value; updateSpotlight() }
function toggleIsochrones() { showIsochrones.value = !showIsochrones.value; drawIsochrones() }
const toast = reactive({
  open: false,
  message: '',
  color: 'primary'
})

// Exemple pour l’afficher :
function showToast(msg: string, color: string = 'primary') {
  toast.message = msg
  toast.color = color
  toast.open = true
}

const goBack = () => router.back();
</script>

<style scoped>
ion-toolbar {
  --color: var(--dark-blue);
}

/* HERO premium */
.hero {
  position: relative;
  padding: 16px;
  color: var(--dark-blue);
  border-bottom: 3px solid var(--dark-beige);
  margin-bottom: 16px;
}

.hero .badge {
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

.hero-title h2 {
  margin-top: 10px;
  font-size: 20px;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hero-title .sub {
  margin: 0;
  font-size: 12px;
  color: var(--beige-pink);
  margin-bottom: 16px;
}

.hero-controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.chip {
  background: var(--dark-beige);
  border: 2px solid var(--dark-beige);
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
  transition: transform .12s ease, background .2s ease;
}

.chip.on {
  background: var(--dark-blue);
  color: var(--beige);
  transform: translateY(-2px) scale(1.05);
}

/* Layout */
.screen {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.filters {
  padding: 8px 12px 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  border-bottom: 1px solid rgba(0, 0, 0, .06);
  color: var(--dark-blue);
}

.btn {
  text-transform: none;
  --border-radius: 8px;
  font-weight: 600;
}

.map-wrap {
  position: relative;
  flex: 1 1 auto;
  min-height: 70vh;
}

.map {
  position: absolute;
  inset: 0;
}

/* Spotlight overlay */
.spotlight {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
  mix-blend-mode: multiply;
  transition: background .18s ease;
  z-index: 300;
}

/* Legend */
.legend {
  position: absolute;
  left: 10px;
  bottom: 10px;
  z-index: 500;
  background: var(--beige-pink);
  color: var(--beige);
  border: 2px solid rgba(0, 0, 0, .08);
  border-radius: 10px;
  padding: 10px 12px;
  display: grid;
  gap: 8px;
  font-size: 12px;
}

.leg-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pin-sample {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--yellow);
  box-shadow: 0 0 0 6px rgba(51, 153, 255, .22);
}

.ring {
  display: inline-block;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  margin: 0 6px;
}

.ring10 {
  border: 2px dashed #2A9D8F;
}

.ring20 {
  border: 2px dashed #E9C46A;
}

.ring30 {
  border: 2px dashed #E76F51;
}

/* Bottom sheet container */
.meetup-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  max-height: 90%;
  background: #fff;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.2);
  padding: 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  z-index: 1001;
}

/* Drag handle */
.sheet-handle {
  width: 40px;
  height: 4px;
  background: #ccc;
  border-radius: 2px;
  margin: 0 auto 12px;
}

/* Row with title and CTA buttons */
.sheet-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

/* Meetup title and meta */
.sheet-title {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sheet-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sheet-title .meta {
  font-size: 14px;
  color: var(--dark-blue);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Freshness pill */
.pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--dark-blue);
  background: var(--dark-beige);
  white-space: nowrap;
  width: auto;
  max-width: fit-content;
}

/* CTA buttons column */
.sheet-cta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Stats row */
.sheet-stats {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
  gap: 12px;
  color: var(--dark-blue);
}

.sheet-stats .stat {
  text-align: center;
}

.sheet-stats .stat .v {
  display: block;
  font-size: 16px;
  font-weight: 700;
}

.sheet-stats .stat .k {
  display: block;
  font-size: 12px;
  color: #666;
}

.sheet-stats .sep {
  width: 1px;
  background: #ccc;
  height: 100%;
}

/* Join button */
.btn-join {
  margin-top: 12px;
  --background: var(--yellow);
  --color: var(--dark-blue);
  font-weight: 600;
  text-transform: none;
  --border-radius: 8px;
  font-weight: 600;
}

/* Transition for slide up */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
