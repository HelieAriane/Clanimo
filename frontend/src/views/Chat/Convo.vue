<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <PhArrowLeft size="24" style="margin-left: 10px; cursor: pointer;" @click="goBack" class="icon" />
        </ion-buttons>
        <ion-title>{{ loading ? "Chargement..." : chatName }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding" ref="contentRef" fullscreen scrollEvents>
      <div class="convo-content">
        <div v-for="msg in messages" :key="msg._id"
          :class="['message-bubble', msg.fromUserId === myUserId ? 'sent' : 'received']">
          <p>{{ msg.body }}</p>
        </div>
      </div>
    </ion-content>

    <div class="message-input-container">
      <ion-input v-model="newMessage" placeholder="Message" class="message-input"
        @keyup.enter="sendMessage"></ion-input>
      <ion-button fill="clear" class="send-btn" @click="sendMessage">
        <PhPaperPlaneRight />
      </ion-button>
    </div>
  </ion-page>
</template>

<script setup>
import { IonPage, IonHeader, IonToolbar, IonButtons, IonTitle, IonContent, IonInput, IonButton } from '@ionic/vue';
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { PhArrowLeft, PhPaperPlaneRight } from '@phosphor-icons/vue';
import api from '@/lib/api';
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const router = useRouter();
const route = useRoute();

const chatId = route.params.id;
const myUserId = ref(null);

onAuthStateChanged(auth, user => {
  if (user) myUserId.value = user.uid;
});

const user = ref({ name: "", avatarURL: "" });
const chatName = computed(() => user.value.name || "Conversation");

const messages = ref([]);
const newMessage = ref('');
const loading = ref(true);
const contentRef = ref(null);

const scrollToBottom = async () => {
  await nextTick(); // attendre que le DOM se mette à jour
  if (contentRef.value && contentRef.value.scrollToBottom) {
    contentRef.value.scrollToBottom(300); // 300ms animation
  } else {
    const contentEl = contentRef.value.$el || contentRef.value;
    const lastMsg = contentEl.querySelector('.message-bubble:last-child');
    if (lastMsg) lastMsg.scrollIntoView({ behavior: 'smooth' });
  }
};

async function fetchMessages() {
  loading.value = true;
  console.log("Fetching messages for chat:", chatId);
  try {
    const data = await api.get(`/messages/${chatId}`);
    // data contient déjà { messages, user }
    console.log("Data reçue :", data);

    messages.value = data?.messages || [];
    console.log("Messages reçus :", messages.value);

    user.value = data?.user || { name: 'Utilisateur inconnu', avatarURL: '' };
    console.log("User après assignation :", user.value);

    await scrollToBottom();
  } catch (err) {
    console.error("Erreur chargement messages", err);
    user.value = { name: 'Utilisateur inconnu', avatarURL: '' };
  } finally {
    loading.value = false;
  }
}

async function sendMessage() {
  if (!newMessage.value.trim()) return;
  console.log("Envoi du message:", newMessage.value);

  const messageToSend = newMessage.value;
  newMessage.value = ''

  try {
    await api.post(`/messages/${chatId}`, { body: messageToSend });

    // Mettre à jour seenIndex pour éviter notification du message envoyé
    const seenRaw = JSON.parse(localStorage.getItem('pp_seen_conversations') || '{}')
    seenRaw[chatId] = new Date().toISOString()
    localStorage.setItem('pp_seen_conversations', JSON.stringify(seenRaw))

    // Rafraîchit la liste des messages après envoi
    await fetchMessages();
  } catch (err) {
    console.error("Erreur envoi message", err);
  }
}

const goBack = () => router.back();

onMounted(() => fetchMessages());

</script>

<style scoped>
ion-toolbar {
  --color: var(--dark-blue);
}

ion-back-button {
  --color: var(--dark-blue);
}

.convo-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  margin-bottom: 50px;
}

.message-bubble {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 20px;
  font-size: 14px;
  line-height: 1;
  word-wrap: break-word;
  box-shadow: 0 1px 2px rgb(0, 0, 0, 0.1);
  animation: fadeIn 0.3s ease-in-out;
}

.sent {
  background-color: var(--yellow);
  color: var(--dark-blue);
  align-self: flex-end;
  border-bottom-right-radius: 6px;
  margin-bottom: 15px;
}

.received {
  background-color: var(--dark-beige);
  color: var(--dark-blue);
  align-self: flex-start;
  border-bottom-left-radius: 6px;
  margin-bottom: 15px;
}

.message-input-container {
  display: flex;
  align-items: center;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  padding: 10px;
  box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.1);
  gap: 6px;
  height: 70px;
  border-top: 1px solid rgba(0, 0, 0, 0.2);
  background-color: var(--beige);
  box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.1);
}

.message-input {
  flex: 1;
  --padding-start: 12px;
  --color: var(--dark-blue);
  --background: var(--beige);
  border-radius: 20px;
  height: 36px;
  font-size: 16px;
}

.send-btn {
  color: var(--yellow);
  font-size: 22px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>