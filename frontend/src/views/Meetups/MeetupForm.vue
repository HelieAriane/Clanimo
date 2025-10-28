<template>
  <ion-page>
    <!-- Header -->
    <ion-header>
      <ion-toolbar class="header">
        <ion-buttons slot="start">
          <PhArrowLeft size="24" style="margin-left: 8px; cursor: pointer" @click="router.push('/tabs/meetups')" />
        </ion-buttons>
        <ion-title>Créer une rencontre</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page">
      <!-- Hero -->
      <section class="hero">
        <div class="hero-badge">
          <span class="badge-dot" />
          Nouvelle rencontre
        </div>
        <h1 class="hero-title">
          Crée un moment <span class="accent">canin</span> parfait 🐾
        </h1>
        <p class="hero-sub">
          Invite la communauté, précise l’ambiance et partage une belle balade.
        </p>
      </section>

      <!-- Card -->
      <div class="card">
        <!-- Titre -->
        <div class="field">
          <label class="label">Titre *</label>
          <div class="input-wrap" :class="{ error: showErrors && !title.trim() }">
            <ion-input v-model="title" placeholder="Ex. : Balade au parc Laurier" class="input" />
          </div>
          <small v-if="showErrors && !title.trim()" class="error-text">Le titre est requis.</small>
        </div>

        <!-- Description -->
        <div class="field">
          <div class="label-row">
            <label class="label">Description *</label>
            <small class="counter">{{ description.length }}/500</small>
          </div>
          <div class="textarea-wrap" :class="{ error: showErrors && !description.trim() }">
            <ion-textarea v-model="description" :maxlength="500"
              placeholder="Ambiance, niveau d’énergie, consignes, matériel conseillé…" class="textarea" auto-grow />
          </div>
          <small v-if="showErrors && !description.trim()" class="error-text">La description est requise.</small>
        </div>

        <!-- Date / heure -->
        <div class="field">
          <div class="label-row">
            <label class="label">Date et heure *</label>
          </div>
          <div class="picker-wrap">
            <ion-datetime v-model="date" presentation="date-time" display-format="DD MMMM YYYY HH:mm"
              picker-format="DD MMMM YYYY HH:mm" locale="fr-CA" :min="minDate" :max="maxDate" class="datetime">
              <span slot="title">Sélectionner la date et l'heure</span>
            </ion-datetime>
          </div>
        </div>

        <!-- Quartier -->
        <div class="field">
          <label class="label">Quartier *</label>
          <div class="input-wrap" :class="{ error: showErrors && !district.trim() }">
            <ion-select v-model="district" placeholder="Choisir un quartier" class="select">
              <ion-select-option v-for="d in districts" :key="d" :value="d">
                {{ d }}
              </ion-select-option>
            </ion-select>
          </div>
          <small v-if="showErrors && !district.trim()" class="error-text">Le quartier est requis.</small>
        </div>

        <!-- Image -->
        <div class="field">
          <label class="label">Image (optionnelle)</label>

          <div class="dropzone" :class="{ hasImage: !!image }" @dragover.prevent @drop.prevent="onDrop">
            <!-- Vide -->
            <div class="dz-empty" v-if="!image">
              <div class="dz-icon">
                <PhImageSquare size="40" />
              </div>
              <div class="dz-title">Glissez-déposez votre image</div>
              <div class="dz-sub">ou cliquez pour choisir un fichier</div>
              <ion-button class="dz-btn" size="small" @click.stop="triggerFileInput">
                Choisir une image
              </ion-button>
              <input type="file" ref="fileInput" accept="image/*" class="file-input" @change="onFileChange" />
            </div>

            <!-- Avec image -->
            <div class="dz-preview" v-else>
              <img :src="image" alt="Aperçu" />
              <div class="dz-overlay">
                <ion-button size="small" class="image-remplacer-btn" @click="triggerFileInput">
                  Remplacer
                </ion-button>
                <ion-button size="small" class="image-supprimer-btn" @click.stop="removeImage">
                  Supprimer
                </ion-button>
              </div>
            </div>
            <!-- Input caché -->
            <input type="file" ref="fileInput" accept="image/*" class="file-input" @change="onFileChange" />
          </div>

          <div class="file-row" v-if="image">
            <PhFileArrowUp size="16" />
            <span class="file-name">{{ imageName }}</span>
          </div>
        </div>

        <!-- Localisation -->
        <div class="field">
          <div class="label-row">
            <label class="label">Localisation (optionnelle)</label>
          </div>

          <div class="grid-2">
            <div class="input-wrap">
              <ion-input type="number" step="any" v-model="lat" placeholder="Latitude" class="input" />
            </div>
            <div class="input-wrap">
              <ion-input type="number" step="any" v-model="lng" placeholder="Longitude" class="input" />
            </div>
          </div>

          <ion-button size="small" class="locate-btn" :disabled="isLocating" @click="useMyLocation">
            <template v-if="!isLocating">
              Utiliser ma position
            </template>
            <template v-else>
              <PhClock size="16" style="margin-right: 6px" /> Localisation…
            </template>
          </ion-button>
          <small v-if="locationError" class="geo-error">{{ locationError }}</small>
        </div>

        <!-- Actions -->
        <div class="actions">
          <ion-button class="cancel" @click="router.push('/tabs/meetups')">
            Annuler
          </ion-button>
          <ion-button class="publish" :disabled="publishDisabled || isSubmitting" @click="saveMeetup">
            <PhPaperPlaneRight size="18" style="margin-right: 6px" />
            {{ isSubmitting ? 'Publication…' : 'Publier' }}
          </ion-button>
        </div>
      </div>

      <!-- Toast feedback -->
      <ion-toast :is-open="toast.open" :message="toast.message" :color="toast.color" duration="2200"
        @didDismiss="toast.open = false" />
    </ion-content>
  </ion-page>
</template>

<script setup>
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonTitle, IonContent,
  IonInput, IonTextarea, IonButton, IonSelect, IonSelectOption, IonDatetime, IonToast
} from '@ionic/vue'
import { ref, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/lib/api'
import { PhArrowLeft, PhImageSquare, PhFileArrowUp, PhPaperPlaneRight, PhClock } from '@phosphor-icons/vue'

import { getAuth } from 'firebase/auth'
import { uploadMeetupImage, MEETUPS_BUCKET } from '@/lib/supabase'

const router = useRouter()

// Champs
const title = ref('')
const description = ref('')
const date = ref('')
const district = ref('')

// Validation & états
const showErrors = ref(false)
const isSubmitting = ref(false)

// Localisation
const lat = ref('')
const lng = ref('')
const isLocating = ref(false)
const locationError = ref('')

// Image / fichier sélectionné
const image = ref('')
const imageName = ref('')
const fileInput = ref(null)
const selectedFile = ref(null)
let objectURL = ''

// Toasts
const toast = ref({ open: false, message: '', color: 'success' })
function notify(message, color = 'success') { toast.value = { open: true, message, color } }

// Drag & drop
function onDrop(e) {
  const file = e.dataTransfer?.files?.[0]
  if (!file || !file.type.startsWith('image/')) return
  setImageFile(file)
}

function triggerFileInput() {
  if (!fileInput.value) return
  fileInput.value.value = null
  fileInput.value.click()
}

function onFileChange(ev) {
  const file = ev.target.files?.[0]
  if (!file) return removeImage()
  if (!file.type.startsWith('image/')) {
    notify('Veuillez sélectionner une image valide.', 'warning');
    return
  }
  setImageFile(file)
}

function setImageFile(file) {
  imageName.value = file.name
  selectedFile.value = file
  if (objectURL) URL.revokeObjectURL(objectURL)
  objectURL = URL.createObjectURL(file)
  image.value = objectURL
}

function removeImage() {
  image.value = ''
  imageName.value = ''
  selectedFile.value = null
  if (fileInput.value) fileInput.value.value = ''
  if (objectURL) { URL.revokeObjectURL(objectURL); objectURL = '' }
}

onBeforeUnmount(() => { if (objectURL) URL.revokeObjectURL(objectURL) })

// Localisation
function useMyLocation() {
  locationError.value = ''
  if (!('geolocation' in navigator)) {
    locationError.value = "La géolocalisation n'est pas disponible sur cet appareil."
    return
  }
  isLocating.value = true
  navigator.geolocation.getCurrentPosition(
    pos => {
      lat.value = pos.coords.latitude.toFixed(6)
      lng.value = pos.coords.longitude.toFixed(6)
      isLocating.value = false
    },
    err => {
      locationError.value = `Impossible de récupérer la position (${err.message})`
      isLocating.value = false
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  )
}

// Quartiers
const districts = ref([
  'Ahuntsic-Cartierville', 'Anjou', 'Côte-des-Neiges–Notre-Dame-de-Grâce',
  'Lachine', 'LaSalle', 'Le Plateau-Mont-Royal', 'Le Sud-Ouest',
  "L'Île-Bizard–Sainte-Geneviève", 'Mercier–Hochelaga-Maisonneuve',
  'Montréal-Nord', 'Outremont', 'Pierrefonds-Roxboro',
  'Rivière-des-Prairies–Pointe-aux-Trembles', 'Rosemont–La Petite-Patrie',
  'Saint-Laurent', 'Saint-Léonard', 'Verdun', 'Ville-Marie',
  'Villeray–Saint-Michel–Parc-Extension'
])

// Date min / max
const today = new Date()
const minDate = today.toISOString().split('T')[0]
const maxDate = new Date(today.getFullYear() + 1, 11, 31).toISOString().split('T')[0]

// Helpers
function toValidISOOrNow(v) {
  try {
    const d = v ? new Date(v) : new Date()
    if (Number.isNaN(d.getTime())) return new Date().toISOString()
    return d.toISOString()
  } catch {
    return new Date().toISOString()
  }
}

// Publishing state
const publishDisabled = computed(() =>
  !title.value.trim() || !description.value.trim() || !district.value
)

// Submit
async function saveMeetup() {
  showErrors.value = false
  if (publishDisabled.value) {
    showErrors.value = true
    notify('Veuillez remplir les champs requis.', 'warning')
    return
  }

  const finalISODate = toValidISOOrNow(date.value)

  try {
    isSubmitting.value = true

    // 1) Upload Supabase si fichier sélectionné
    let imageUrl = ''
    if (selectedFile.value) {
      const uid = getAuth().currentUser?.uid
      console.log('Uploading to Supabase:', { bucket: MEETUPS_BUCKET, uid })

      if (!uid) {
        notify('Vous devez être connecté pour téléverser une image.', 'warning')
        isSubmitting.value = false
        return
      }
      const { url } = await uploadMeetupImage(selectedFile.value, uid)
      imageUrl = url
    }

    // 2) Envoi JSON au backend (champ "image" accepté côté API)
    const payload = {
      title: title.value.trim(),
      description: description.value.trim(),
      date: finalISODate,
      district: district.value,
      ...(imageUrl ? { image: imageUrl } : {}),
    }

    if (lat.value && lng.value) {
      const parsedLat = parseFloat(lat.value)
      const parsedLng = parseFloat(lng.value)
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        payload.lat = parsedLat
        payload.lng = parsedLng
      }
    }

    await api.post('/meetups', payload)

    notify('Rencontre créée avec succès !', 'success')
    router.replace('/tabs/meetups')
  } catch (error) {
    console.error('Erreur création rencontre:', error)
    notify("Impossible de créer la rencontre.", 'danger')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
/* Header */
.header {
  --color: var(--dark-blue);
  border-bottom: 1px solid var(--dark-beige);
}

/* Hero */
.hero {
  position: relative;
  color: var(--beige-pink);
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
  margin-bottom: 16px;
}

/* Card */
.card {
  width: 100%;
  border-radius: 18px;
  padding: 16px;
  border: 2px solid var(--dark-beige);
}

.field {
  margin-bottom: 14px;
}

.label {
  font-weight: 800;
  color: var(--beige-pink);
  font-size: 14px;
  display: block;
  margin-bottom: 8px;
}

.label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.counter {
  color: var(--beige-pink);
  font-size: 12px;
}

/* Inputs */
.input-wrap,
.textarea-wrap,
.picker-wrap {
  color: var(--dark-blue);
  position: relative;
  border-radius: 12px;
  border: 1px solid var(--dark-beige);
  background: var(--beige);
  transition: border-color .12s ease, box-shadow .12s ease, transform .06s ease;
}

.input-wrap:focus-within,
.textarea-wrap:focus-within,
.picker-wrap:focus-within {
  border-color: var(--yellow);
  box-shadow: 0 6px 16px rgba(255, 214, 102, .25);
}

.input-wrap.error,
.textarea-wrap.error {
  border-color: #e74c3c !important;
}

.input,
.select {
  --padding-start: 12px;
  --color: var(--dark-blue);
  border-radius: 12px;
  font-size: 14px;
  width: 100%;
}

.textarea {
  padding: 12px;
  min-height: 110px;
  font-size: 14px;
  color: var(--dark-blue);
}

.error-text {
  color: #e74c3c;
  font-size: 12px;
  margin-top: 6px;
}

.datetime {
  background: var(--beige);
  font-family: 'Jakarta', sans-serif;
  border-radius: 8px;
  border: 1px solid var(--dark-beige);
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
  color: var(--beige-pink);
  --wheel-highlight-background: var(--yellow);
  --wheel-highlight-border-radius: 48px;
  --wheel-fade-background-rgb: 247, 236, 226;
}

.datetime::part(wheel-item) {
  color: var(--beige-pink);
}

.datetime::part(wheel-item active) {
  color: var(--dark-blue);
}

.datetime::part(time-button) {
  color: var(--dark-blue);
  background: transparent;
  border: 1px solid var(--dark-beige);
}

.datetime::part(time-button):hover {
  background: var(--yellow);
}

/* Dropzone */
.dropzone {
  border: 1.5px dashed var(--dark-beige);
  border-radius: 14px;
  background: var(--beige);
  min-height: 160px;
  display: grid;
  place-items: center;
  position: relative;
  overflow: hidden;
  transition: border-color .12s ease, background .12s ease, transform .06s ease;
}

.dropzone:hover {
  border-color: var(--yellow);
  transform: translateY(-1px);
}

.dropzone.hasImage {
  border-style: solid;
  padding: 0;
}

.dz-empty {
  text-align: center;
  padding: 16px;
}

.dz-icon {
  color: var(--beige-pink);
  margin-bottom: 6px;
}

.dz-title {
  font-weight: 800;
  font-size: 14px;
  color: var(--dark-blue);
}

.dz-sub {
  font-size: 12px;
  color: var(--beige-pink);
  margin-bottom: 8px;
}

.dz-btn {
  --background: var(--yellow);
  --color: var(--dark-blue);
  text-transform: none;
  --border-radius: 8px;
  font-weight: 600;
}

.file-input {
  display: none;
}

.dz-preview {
  position: relative;
  width: 100%;
}

.dz-preview img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 12px;
}

.dz-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  background: linear-gradient(0deg, rgba(0, 0, 0, .35), rgba(0, 0, 0, .15));
  opacity: 0;
  transition: opacity .15s ease;
}

.dz-preview:hover .dz-overlay {
  opacity: 1;
}

.file-row {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--dark-blue);
  font-size: 13px;
}

.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-remplacer-btn {
  height: 34px;
  display: flex;
  gap: 6px;
  text-transform: none;
  --border-radius: 8px;
  font-weight: 600;
}

.image-supprimer-btn {
  --background: var(--dark-blue);
  --color: var(--yellow);
  height: 34px;
  display: flex;
  gap: 6px;
  text-transform: none;
  --border-radius: 8px;
  font-weight: 600;
}

/* Geo */
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.grid-2 .input-wrap {
  height: 44px;
}

.locate-btn {
  margin-top: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  text-transform: none;
  --border-radius: 8px;
  font-weight: 600;
}

.geo-error {
  color: #c0392b;
  margin-top: 6px;
  display: inline-block;
}

/* Actions */
.actions {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cancel {
  --background: var(--dark-blue);
  --color: var(--yellow);
  text-transform: none;
  --border-radius: 8px;
  font-weight: 600;
}

.publish {
  --background: var(--yellow);
  --color: var(--dark-blue);
  text-transform: none;
  --border-radius: 8px;
  font-weight: 600;
}
</style>
