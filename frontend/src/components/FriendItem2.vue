<template>
  <ion-item class="friend-item2">
    <ion-avatar slot="start">
    <img :src="imageUrl" :alt="`${prenom} ${nom}`" class="friend-img" />
    </ion-avatar>
    <span class="friend-name">{{ prenom }} {{ nom }}</span>
    <span v-if="enLigne" class="online-dot"></span>

    <ion-button slot="end" fill="outline" title="Envoyer un message">
      <PhChatCircleText size="24" weight="bold" />
    </ion-button>
  </ion-item>
</template>

<script>
import { PhChatCircleText } from '@phosphor-icons/vue';

export default {
  name: 'FriendItem2',
  props: {
    prenom: { type: String, required: true },
    nom: { type: String, required: true },
    imageUrl: { type: String, required: true },
    enLigne: { type: Boolean, default: false }
  }
}
</script>

<style scoped>
.friend-item2 {
  display: flex;
  align-items: center;
  gap: 8px;
}
.friend-img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}
.friend-name {
  font-weight: bold;
}

.online-dot {
  width: 10px;
  height: 10px;
  background-color: green;
  border-radius: 50%;
}
</style>