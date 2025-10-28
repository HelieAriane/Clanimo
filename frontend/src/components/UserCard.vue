<template>
  <ion-card class="user-card" @click="$emit('click')">

    <!-- Profil utilisateur -->
    <ion-card-content>
      <ion-item class="user-info" lines="none">
        <ion-avatar slot="start" class="user-avatar">
          <ion-img :src="user.avatarURL" alt="Avatar" @ionError="onUserImgError" />
        </ion-avatar>
        <ion-label>
          <h2 class="user-name">{{ user.name }}</h2>
          <h2 class="user-bio">{{ user.bio }}</h2>
        </ion-label>
      </ion-item>

      <!-- Chiens -->
      <div v-if="user.dogs && user.dogs.length" class="dogs-section">
        <h3>Chiens</h3>
        <div v-for="dog in user.dogs" :key="dog._id || dog.id" class="dog-card">
          <ion-avatar class="dog-avatar">
            <ion-img :src="dog.avatarURL" alt="Dog avatar" @ionError="onDogImgError($event)" />
          </ion-avatar>
          <div class="dog-info">
            <p class="dog-name">{{ dog.name }}</p>
            <p class="dog-breed">{{ dog.breed }}</p>
            <div class="dog-tags" v-if="dog.personalities?.length">
              <ion-chip v-for="tag in dog.personalities" :key="tag" outline class="personality-tag readonly">
                <ion-label>{{ tag }}</ion-label>
              </ion-chip>
            </div>
          </div>
        </div>
      </div>
    </ion-card-content>
  </ion-card>
</template>

<script setup>
import { defineProps } from 'vue';
import { IonCard, IonCardContent, IonItem, IonAvatar, IonLabel, IonChip, IonImg } from '@ionic/vue';
import defaultAvatar from '@/assets/image/clanimo-default-dog-avatar.png';

const props = defineProps({
  user: {
    type: Object,
    required: true,
    default: () => ({
      name: '',
      bio: '',
      avatarURL: '',
      dogs: []
    })
  }
});

// Remplace par l'image par défaut si erreur de chargement
const onUserImgError = (event) => {
  event.target.src = defaultAvatar;
}

const onDogImgError = (event) => {
  event.target.src = defaultAvatar;
}
</script>

<style scoped>
ion-card-content {
  padding: 0 !important;
}

.user-card {
  border-radius: 12px;
  font-family: 'Jakarta', sans-serif;
  background: var(--beige);
  max-width: 100%;
}

.user-avatar {
  background: #fff;
}

ion-avatar {
  width: 64px;
  height: 64px;
  border: 1px solid var(--dark-beige);
}

.user-info {
  --background: var(--beige-);
}

.user-name {
  font-weight: bold;
  color: var(--dark-blue);
  font-size: 16px;
  margin-bottom: 4px;
}

.user-bio {
  color: var(--beige-pink);
  font-size: 12px;
}

.dogs-section {
  margin-top: 10px;
}

.dogs-section h3 {
  font-weight: bold;
  color: var(--dark-blue);
  font-size: 14px;
  padding-top: 12px;
  margin-bottom: 8px;
  position: relative;
  padding-left: 18px;
}

/* Ligne décorative au-dessus */
.dogs-section h3::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 45px;
  height: 3px;
  background-color: var(--dark-beige);
  border-radius: 1px;
}

.dog-card {
  display: flex;
  align-items: center;
  margin: 10px;
  padding-left: 5px
}

.dog-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding-left: 18px
}

.dog-name {
  font-weight: bold;
  font-size: 16px;
  color: var(--dark-blue);
}

.dog-breed {
  color: var(--beige-pink);
  font-size: 12px;
}

.dog-tags ion-chip {
  margin-top: 2px;
  background: var(--dark-beige);
  color: var(--dark-blue);
  border-radius: 8px;
  font-size: 12px;
  margin-left: 0;
  padding: 10px;
}

.personality-tag.readonly {
  pointer-events: none;
}
</style>
