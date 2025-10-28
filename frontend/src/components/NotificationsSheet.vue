<template>
  <ion-modal :is-open="open" @did-dismiss="$emit('update:open', false)" :initial-breakpoint="0.5"
    :breakpoints="[0, 0.5, 1]">
    <ion-header>
      <ion-toolbar>
        <ion-title>Notifications</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="items.length === 0" @click="onMarkAllRead">Tout marquer lu</ion-button>
          <ion-button @click="$emit('update:open', false)">Fermer</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="doRefresh">
        <ion-refresher-content pulling-text="Tirer pour rafraîchir" />
      </ion-refresher>

      <ion-list>
        <ion-item v-if="!items.length && !loading" lines="none">
          <ion-label>Aucune notification.</ion-label>
        </ion-item>

        <ion-item v-for="n in items" :key="n._id" button detail @click="openNotification(n)">
          <ion-label>
            <h2 class="row">
              <span v-if="!n.read" class="dot" />
              <span class="title">{{ n.title }}</span>
              <small class="time">{{ fmt(n.createdAt) }}</small>
            </h2>
            <p v-if="n.message" class="message">{{ n.message }}</p>
            <p v-else class="type">({{ humanType(n.type) }})</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <ion-infinite-scroll v-if="nextCursor" threshold="100px" @ionInfinite="loadMore">
        <ion-infinite-scroll-content loading-spinner="dots" loading-text="Chargement…" />
      </ion-infinite-scroll>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonRefresher, IonRefresherContent, IonList, IonItem, IonLabel,
  IonInfiniteScroll, IonInfiniteScrollContent
} from '@ionic/vue'
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNotifications } from '@/composables/useNotifications'

const props = defineProps<{ open: boolean }>()
defineEmits<{ (e: 'update:open', v: boolean): void }>()

const router = useRouter()
const {
  items, nextCursor, loading,
  fetchPage, markRead, markAllRead, refreshCount
} = useNotifications()

function fmt(iso: string) {
  try { return new Date(iso).toLocaleString() } catch { return '' }
}
function humanType(t: string) {
  switch (t) {
    case 'friend_request': return 'Demande d’ami'
    case 'friend_accept': return 'Ami accepté'
    case 'meetup_invite': return 'Invitation'
    case 'invite_accepted': return 'Invitation acceptée'
    case 'test': return 'Test'
    default: return t
  }
}

async function doRefresh(ev: CustomEvent) {
  try {
    await fetchPage(12, null)
    await refreshCount().catch(() => { })
  } finally {
    // @ts-ignore
    ev.target?.complete?.()
  }
}

async function loadMore(ev: CustomEvent) {
  try {
    if (nextCursor.value) await fetchPage(12, nextCursor.value)
  } finally {
    // @ts-ignore
    ev.target?.complete?.()
  }
}

async function onMarkAllRead() {
  await markAllRead().catch(() => { })
}

async function openNotification(n: any) {
  if (!n.read) { try { await markRead(n._id) } catch { } }
  const link = n?.data?.link
  if (link) { try { await router.push(link) } catch { } }
}

onMounted(async () => {
  if (!items.value.length) await fetchPage(12)
})

// quand on ouvre la sheet → refresh léger
watch(() => props.open, async (v) => { if (v) await fetchPage(12, null).catch(() => { }) })
</script>

<style scoped>
.row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.title {
  font-weight: 600;
  color: var(--ion-text-color);
}

.time {
  margin-left: auto;
  color: var(--ion-color-medium);
  white-space: nowrap;
}

.message,
.type {
  color: var(--ion-color-medium);
  margin-top: 4px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ion-color-primary);
  margin-right: 6px;
  display: inline-block;
}
</style>
