<!-- src/components/DogCard.vue -->
<template>
  <ion-card class="dog-card" @click="$emit('click', dog)">
    <ion-card-content class="dog-card__content">
      <ion-avatar class="dog-card__avatar">
        <img :src="displayAvatar" :alt="`Avatar de ${dog.name || 'chien'}`" />
      </ion-avatar>

      <div class="dog-card__main">
        <div class="dog-card__header">
          <ion-card-title class="dog-card__title">{{ dog.name || 'Sans nom' }}</ion-card-title>
          <ion-card-subtitle class="dog-card__subtitle">{{ dog.breed || 'Race inconnue' }}</ion-card-subtitle>
        </div>

        <div class="dog-card__meta">
          <span v-if="dog.birthday">
            Né·e le {{ fmtDate(dog.birthday) }}
            <span v-if="ageMonths !== null"> • {{ ageMonths }} mois</span>
          </span>
        </div>

        <div v-if="(dog.personalities || []).length" class="dog-card__tags">
          <ion-chip v-for="tag in dog.personalities" :key="tag" outline class="dog-card__chip">
            <ion-label>{{ tag }}</ion-label>
          </ion-chip>
        </div>
      </div>

      <ion-button v-if="editable" fill="clear" size="small" class="dog-card__edit-btn" @click.stop="$emit('edit', dog)">
        Modifier
      </ion-button>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  IonCard, IonCardContent, IonCardTitle, IonCardSubtitle,
  IonAvatar, IonChip, IonLabel, IonButton
} from '@ionic/vue'

const props = defineProps<{
  dog: any
  editable?: boolean
}>()

defineEmits<{
  (e: 'click', dog: any): void
  (e: 'edit', dog: any): void
}>()

const FALLBACK = '/assets/image/clanimo-default-dog-avatar.png'

// Base backend (ex: http://localhost:4200) : utile pour /api/...
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4200/api/v1'
const API_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, '')

const displayAvatar = computed(() => {
  const v = props.dog?.avatarURL || props.dog?.avatar || FALLBACK
  if (/^(https?:|blob:|data:)/i.test(v)) return v
  if (typeof v === 'string' && v.startsWith('/api/')) return `${API_ORIGIN}${v}`
  return v // /assets/... reste tel quel (servi par le front)
})

function fmtDate(value: any) {
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return String(value)
    return d.toLocaleDateString()
  } catch {
    return String(value)
  }
}

const ageMonths = computed(() => {
  try {
    const v = props.dog?.birthday
    if (!v) return null
    const d = new Date(v)
    if (isNaN(d.getTime())) return null
    const now = new Date()
    let m = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
    if (now.getDate() < d.getDate()) m -= 1
    return Math.max(0, m)
  } catch { return null }
})
</script>

<style scoped>
.dog-card {
  margin: 0;
}

.dog-card__content {
  display: grid;
  grid-template-columns: 72px 1fr auto;
  gap: 12px;
  align-items: start;
}

.dog-card__avatar {
  width: 72px;
  height: 72px;
}

.dog-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.dog-card__main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dog-card__title {
  font-weight: 700;
  font-size: 16px;
  margin: 0;
}

.dog-card__subtitle {
  font-size: 13px;
  opacity: .8;
}

.dog-card__meta {
  font-size: 12px;
  opacity: .8;
}

.dog-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.dog-card__chip {
  background: var(--dark-beige);
  color: var(--dark-blue);
  border-radius: 8px;
  font-size: 12px;
}

.dog-card__edit-btn {
  align-self: start;
}
</style>