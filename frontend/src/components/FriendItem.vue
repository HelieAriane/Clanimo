<template>
  <ion-card class="friend-item" @click="goToProfile">
    <ion-item lines="none">
      <ion-avatar slot="start">
        <img :src="user.avatarURL" alt="Avatar">
      </ion-avatar>

      <div class="info">
        <ion-label class="label">
        <h2>{{ user.name }}</h2>
        <p class="time">{{ timeAgo }}</p>
      </ion-label>

      <div class="actions" @click.stop>
        <ion-button class="accept" @click="$emit('accept', user._id)">
          Accepter
        </ion-button>
        <ion-button class="decline" @click="$emit('decline', user._id)">
          Refuser
        </ion-button>
      </div>
      </div>
    </ion-item>
  </ion-card>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { IonCard, IonItem, IonAvatar, IonLabel, IonButton } from '@ionic/vue'

const props = defineProps({
  user: {
    type: Object,
    required: true
  },
  requestDate: {
    type: String,
    required: true
  }
})

const router = useRouter()

const goToProfile = () => {
  router.push({ name: "profilPublic", params: { userId: props.user._id } })
};

const timeAgo = computed(() => {
  const now = new Date()
  const requestDateObj = new Date(props.requestDate)
  const days = Math.floor((now - requestDateObj) / (1000 * 60 * 60 * 24))
  return `Il y a ${days} jours`
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
.friend-item {
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

h2 {
  color: var(--dark-blue);
  font-family: 'Jakarta', sans-serif;
  font-size: 16px;
  font-weight: medium;
}
.time {
  color: var(--beige-pink);
  font-size: 14px;
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
