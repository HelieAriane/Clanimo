<template>
  <ion-button fill="clear" @click="$emit('open')" aria-label="Notifications">
    <ion-icon :icon="notificationsOutline" />
    <ion-badge v-if="count > 0" color="danger" class="badge">{{ count }}</ion-badge>
  </ion-button>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { IonButton, IonIcon, IonBadge } from '@ionic/vue'
import { notificationsOutline } from 'ionicons/icons'
import { useNotifications } from '@/composables/useNotifications'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

const { unreadCount, refreshCount } = useNotifications()
const count = computed(() => unreadCount.value)

let unsubAuth: (() => void) | null = null

async function maybeRefresh() {
  // Ne tente le call backend que si un user est présent
  if (auth.currentUser) {
    try { await refreshCount() } catch { /* ignore erreurs réseau/token */ }
  }
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    void maybeRefresh()
  }
}

onMounted(() => {
  // 1er passage (si déjà loggé)
  void maybeRefresh()

  // Réagit aux transitions login/logout
  unsubAuth = onAuthStateChanged(auth, (user) => {
    if (user) {
      void maybeRefresh()
    } else {
      // Au logout, on remet le badge à zéro pour éviter un vieux count affiché
      unreadCount.value = 0
    }
  })

  // Quand l’onglet redevient actif, on rafraîchit
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  if (unsubAuth) unsubAuth()
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style scoped>
.badge {
  position: absolute;
  top: 2px;
  right: 0;
  transform: translate(25%, -25%);
}
</style>
