<template>
  <ion-card class="notification-item" @click="goToChats">
    <ion-item lines="none">
      <ion-avatar slot="start">
        <img :src="user.avatarURL" alt="Avatar">
      </ion-avatar>

      <div class="info">
        <ion-label class="label">
          <p><strong>{{ user.name }}</strong> vous a envoyé un message</p>
          <p class="time">{{ timeAgo }}</p>
        </ion-label>
      </div>
    </ion-item>
  </ion-card>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { IonCard, IonItem, IonAvatar, IonLabel } from '@ionic/vue'

const props = defineProps({
  user: {
    type: Object,
    required: true
  },
  messageDate: {
    type: String,
    required: true
  }
})

const router = useRouter()

const timeAgo = computed(() => {
  const now = new Date()
  const messageDateObj = new Date(props.messageDate)
  const diffMs = now - messageDateObj
  const minutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (minutes < 60) return `Il y a ${minutes} min`
  if (hours < 24) return `Il y a ${hours} h`
  return `Il y a ${days} jours`
})

const goToChats = () => {
  router.push('/tabs/chats')
}
</script>

<style scoped>
.notification-item {
  --background: var(--beige);
  background: var(--beige);
  box-shadow: none;
  cursor: pointer;
  border-bottom: 1px solid var(--dark-beige); 
  border-radius: 0; 
}

ion-avatar {
  height: 100%;
  width: 64px;
}

ion-item {
  --background: transparent;
  display: flex;
  align-items: center;
  padding-bottom: 10px;
}

ion-avatar {
  height: 100%;
  aspect-ratio: 1 / 1;
  flex-shrink: 0;
}

.info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  flex: 1;
}

.label p {
  font-size: 14px;
  color: var(--dark-blue);
  font-family: 'Jakarta', sans-serif;
  margin: 0;
}

.label .time {
  color: var(--beige-pink);
  font-size: 12px;
  margin-top: 8px;
}
</style>
