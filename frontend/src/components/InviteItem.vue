<template>
  <ion-card class="invite-item">
    <ion-item lines="none">
      <ion-avatar slot="start">
        <img :src="user.avatarURL" alt="Avatar">
      </ion-avatar>

      <div class="info">
        <ion-label class="label">
          <p><strong>{{ user.name }}</strong> vous a envoyé une invitation</p>
          <p class="time">{{ timeAgo }}</p>
        </ion-label>

        <div class="meetup">
          <p><strong>{{ meetup.title }}</strong></p>
          <p>{{ formattedDate }}</p>
          <p>{{ meetup.district }}</p>
        </div>

        <div class="actions">
          <ion-button class="accept" @click="$emit('accept', id)">
            Accepter
          </ion-button>
          <ion-button class="decline" @click="$emit('decline', id)">
            Refuser
          </ion-button>
        </div>
      </div>
    </ion-item>
  </ion-card>
</template>

<script setup>
import '@/assets/global.css'
import { computed } from 'vue'
import { IonCard, IonItem, IonAvatar, IonLabel, IonButton } from '@ionic/vue'

const props = defineProps({
  id: {
    type: Number,
    required: true
  },
  user: {
    type: Object,
    required: true
  },
  meetup: {
    type: Object,
    required: true
  },
  requestDate: {
    type: String,
    required: true
  }
})

const timeAgo = computed(() => {
  const now = new Date()
  const requestDateObj = new Date(props.requestDate)
  const days = Math.floor((now - requestDateObj) / (1000 * 60 * 60 * 24))
  return `Il y a ${days} jours`
})

const formattedDate = computed(() => {
  const dateStr = new Date(props.meetup.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  return dateStr.charAt(0).toUpperCase() + dateStr.slice(1)
})
</script>

<style scoped>
ion-item {
  --background: none;
  align-items: flex-start;
}

ion-avatar {
  height: 100%;
  width: 64px;
}

.invite-item {
  --background: none;
  box-shadow: none;
  border: none;
}

.info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.label {
  display: flex;
  justify-content: space-between;
}

.label p {
  font-size: 14px;
  color: var(--dark-blue);
  font-family: 'Jakarta', sans-serif;
  margin: 0;
}

.label .time {
  color: var(--beige-pink);
  font-size: 14px;
  font-family: 'Jakarta', sans-serif;
  margin: 0;
}

.meetup {
  font-size: 14px;
  color: var(--dark-blue);
}

.actions {
  display: flex;
  gap: 8px;
}

.actions ion-button {
  flex: 1;
}

.accept {
  --background: var(--yellow);
  --color: var(--dark-blue);
  --border-radius: 8px;
}

.decline {
  --background: var(--dark-blue);
  --color: var(--beige);
  --border-radius: 8px;
}
</style>
