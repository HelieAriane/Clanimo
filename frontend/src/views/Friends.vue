<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <PhArrowLeft size="24" style="margin-left: 10px; cursor: pointer;" @click="goBack" class="icon" />
        </ion-buttons>
        <ion-title>Mes amis</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="friends-page">
      <div v-if="friends.length">
        <UserCard v-for="friend in friends" :key="friend._id" :user="friend"
          @click="() => goToPublicProfile(friend._id)" class="clickable-user-card" />
      </div>
      <p v-else class="no-friends">
        Aucun ami pour le moment.
      </p>
    </ion-content>
  </ion-page>
</template>

<script setup>
import '@/assets/global.css'
import { ref, onMounted } from 'vue'
import UserCard from '@/components/UserCard.vue'
import { IonPage, IonHeader, IonToolbar, IonButtons, IonTitle, IonContent } from '@ionic/vue'
import api from '@/lib/api'
import { PhArrowLeft } from "@phosphor-icons/vue";
import { useRouter } from "vue-router";

const router = useRouter();

const friends = ref([]);
const working = ref(false);

async function loadFriends() {
  try {
    working.value = true;
    const res = await api.get('/friends');
    console.log('Friends API:', res.friends);
    friends.value = res.friends || []
  } catch (e) {
    console.error('Erreur chargement amis :', e);
  } finally {
    working.value = false;
  }
}

// Aller sur le profil public
function goToPublicProfile(userId) {
  router.push({ name: 'profilPublic', params: { userId } });
}

onMounted(loadFriends);

const goBack = () => router.back();
</script>

<style scoped>
ion-toolbar {
  --color: var(--dark-blue);
}

ion-back-button {
  --color: var(--dark-blue);
}

.no-friends {
  font-size: 14px;
  color: var(--dark-blue);
  margin-left: 10px;
}

.clickable-user-card {
  cursor: pointer;
  border: 1px solid var(--dark-beige);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  margin: 15px;
}
</style>
