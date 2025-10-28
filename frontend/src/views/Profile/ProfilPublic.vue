<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button fill="clear" @click="goBack">
            <PhArrowLeft size="24" />
          </ion-button>
        </ion-buttons>
        <ion-title class="header-title">Profil public</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding profile-page">
      <!-- PROFILE HEADER -->
      <div class="profile-header">
        <Avatar v-model="user.avatarURL" :readonly="!editMode" :storage-path="storagePath" />
        <h2 class="profile-name">{{ user.name }}</h2>
        <p class="profile-username">@{{ user.username }}</p>
      </div>

      <!-- BOUTONS AMIS -->
      <ion-grid>
        <ion-row class="ion-justify-content-center ion-margin-top">
          <ion-col :size="isFriend ? 6 : 7">
            <!-- Bouton Ajouter / En attente / Ami(e)s -->
            <ion-button v-if="!isFriend && !isPending" expand="block" class="btn-add-friend" @click="sendFriendRequest">
              <PhUserCirclePlus slot="start" size="25" weight="fill" style="margin-right:6px;" />
              Ajouter en ami(e)
            </ion-button>

            <ion-button v-else-if="isPending" expand="block" class="btn-friend-request" disabled>
              <PhClockUser slot="start" size="25" weight="fill" style="margin-right:6px;" />
              En attente
            </ion-button>

            <ion-button v-else expand="block" class="btn-friends" @click="removeFriend">
              <PhUsers slot="start" size="20" style="margin-right:6px;" />
              Ami(e)s
            </ion-button>
          </ion-col>

          <!-- Bouton Message -->
          <ion-col v-if="isFriend" size="6">
            <ion-button expand="block" class="btn-message" v-if="isFriend" @click="openChat">
              <PhPaperPlaneRight slot="start" size="20" style="margin-right:6px;" />
              Message
            </ion-button>
          </ion-col>
        </ion-row>
      </ion-grid>

      <!-- INFORMATIONS -->
      <section class="card">
        <h3 class="section-title">Informations</h3>

        <label class="input-label">Nom</label>
        <div class="form-input readonly-field">{{ user.name }}</div>

        <label class="input-label">Nom d'utilisateur</label>
        <div class="form-input readonly-field">{{ user.username }}</div>

        <label class="input-label">Bio</label>
        <div class="form-textarea readonly-field">{{ user.bio }}</div>

        <label class="input-label">Quartier</label>
        <div class="form-input-district readonly-field">{{ user.district }}</div>
      </section>

      <!-- CHIENS (issus du champ embarqué users/:id → user.dogs) -->
      <section class="card">
        <h3 class="section-title">Chiens de {{ user.name }}</h3>

        <div v-if="!dogs.length" class="ion-text-center ion-padding">
          <em class="empty-list">Aucun chien renseigné.</em>
        </div>

        <div v-for="dog in dogs" :key="dog._id || dog.id" class="dog-item">
          <ion-avatar class="dog-avatar">
            <img :src="imgSrc(dog.avatarURL)" />
          </ion-avatar>

          <div class="dog-info">
            <p class="dog-name">{{ dog.name }}</p>
            <p class="dog-breed">{{ dog.breed }}</p>
            <p class="dog-birthday" v-if="dog.birthday">
              Date de naissance : {{ fmtDate(dog.birthday) }}
            </p>
            <div class="dog-tags" v-if="(dog.personalities || []).length">
              <ion-chip v-for="tag in dog.personalities" :key="tag" outline class="personality-tag readonly">
                <ion-label>{{ tag }}</ion-label>
              </ion-chip>
            </div>
          </div>
        </div>
      </section>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
  IonButtons, IonAvatar, IonGrid, IonRow, IonCol, IonChip, IonLabel
} from "@ionic/vue";
import { PhArrowLeft, PhUsers, PhUserCirclePlus, PhClockUser, PhPaperPlaneRight } from "@phosphor-icons/vue";
import api from "@/lib/api";
import Avatar from "@/components/Avatar.vue";
import defaultDogAvatar from '@/assets/image/clanimo-default-dog-avatar.png';

const router = useRouter();
const route = useRoute();

// Base backend pour rendre les URLs relatives en absolues
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4200/api/v1";
const API_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, "");

// Id utilisateur cible (on accepte userId ou id dans la route)
const targetUserId = computed(() => String(route.params.userId || route.params.id || ""));

// UI state
const user = ref({
  avatarURL: "",
  name: "",
  username: "",
  bio: "",
  district: ""
});
const dogs = ref([]);
const isFriend = ref(false);
const isPending = ref(false);

const goBack = () => {
  router.back();
};

function fmtDate(d) {
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
}

// Convertit /api/... en URL absolue http://localhost:4200/...
function imgSrc(u, fallback = defaultDogAvatar) {
  if (!u) return fallback;
  if (/^(https?:|data:|blob:)/i.test(u)) return u;
  if (u.startsWith('/api/')) return `${API_ORIGIN}${u}`;
  return u;
}

/* Charge les infos publiques (les chiens arrivent via user.dogs) */
function normalizeUser(dto = {}) {
  const avatar = dto.avatarURL || dto.avatar || "";
  return {
    avatarURL: imgSrc(avatar),
    name: dto.name || "",
    username: dto.username || "",
    bio: dto.bio || "",
    district: dto.district || "",
    dogs: Array.isArray(dto.dogs)
      ? dto.dogs.map(d => ({ ...d, avatarURL: imgSrc(d.avatarURL || d.avatar || "") }))
      : [],
  };
}

async function fetchUserProfile() {
  if (!targetUserId.value) return;
  try {
    const data = await api.get(`/users/${targetUserId.value}`);
    const u = normalizeUser(data.user || {});
    user.value = { ...u };
    dogs.value = u.dogs;
  } catch (err) {
    console.error("Erreur récupération profil public :", err);
  }
}

/* Calcule l'état relationnel (ami / en attente) depuis les endpoints existants */
async function fetchRelationStatus() {
  try {
    const [friendsRes, outRes, inRes] = await Promise.all([
      api.get("/users/@me/friends"),
      api.get("/friends/@me/requests/outgoing"),
      api.get("/friends/@me/requests/incoming"),
    ]);
    const friends = Array.isArray(friendsRes.friends) ? friendsRes.friends : [];
    const outReqs = Array.isArray(outRes.requests) ? outRes.requests : [];
    const inReqs = Array.isArray(inRes.requests) ? inRes.requests : [];

    isFriend.value = friends.some(f => (f._id || f.id) === targetUserId.value);
    isPending.value =
      outReqs.some(r => r.toUserId === targetUserId.value && r.status === "pending") ||
      inReqs.some(r => r.fromUserId === targetUserId.value && r.status === "pending");
  } catch {
    isFriend.value = false;
    isPending.value = false;
  }
}

/* Créer une demande d’ami → backend: POST /friends/requests/:toUid */
async function sendFriendRequest() {
  try {
    await api.post(`/friends/requests/${targetUserId.value}`);
    isPending.value = true;
  } catch (err) {
    if (err?.status === 409 && err?.error === "already_friends") {
      isFriend.value = true;
      isPending.value = false;
    } else if (err?.status === 409) {
      isPending.value = true;
    }
  }
}

/* Retirer un ami → backend: DELETE /friends/:friendUid */
async function removeFriend() {
  try {
    await api.del(`/friends/${targetUserId.value}`);
    isFriend.value = false;
    isPending.value = false;
  } catch (err) {
    console.error("Erreur suppression ami :", err);
  }
}

function openChat() {
  // Ici on utilise targetUserId comme id de conversation
  router.push({ name: "Chat", params: { id: targetUserId.value } });
}

onMounted(async () => {
  await Promise.all([fetchUserProfile(), fetchRelationStatus()]);
});
</script>

<style scoped>
ion-toolbar {
  --color: var(--dark-blue);
}

.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.profile-avatar {
  width: 128px;
  height: 128px;
  margin-bottom: 8px;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.profile-name {
  font-family: 'Jakarta', sans-serif;
  font-weight: 600;
  font-size: 20px;
  color: var(--dark-blue);
  margin: 0;
  padding-bottom: 8px;
}

.profile-username {
  font-size: 14px;
  color: var(--beige-pink);
  margin: 0;
}

.btn-add-friend,
.btn-friend-request,
.btn-friends {
  --border-radius: 12px;
  font-weight: 600;
  text-transform: none;
  --padding-start: 16px;
  --padding-end: 16px;
}

.btn-add-friend,
.btn-friend-request {
  --background: var(--yellow);
  --color: var(--dark-blue);
}

.btn-friends {
  --background: var(--dark-blue);
  --color: var(--yellow);
}

.btn-message {
  --background: var(--yellow);
  --color: var(--dark-blue);
  --border-radius: 12px;
  font-weight: 600;
  text-transform: none;
  --padding-start: 16px;
  --padding-end: 16px;
}

.input-label {
  font-family: 'Jakarta', sans-serif;
  font-weight: 600;
  color: var(--beige-pink);
  font-size: 14px;
  margin-bottom: 12px;
  margin-top: 14px;
  display: block;
}

.form-input {
  padding: 8px 12px;
  color: var(--dark-blue);
  border-radius: 8px;
  border: 1px solid var(--dark-beige);
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
}

.form-input-district {
  border: 1px solid var(--dark-beige);
  border-radius: 8px;
  padding: 10px;
  background-color: var(--beige);
  color: var(--dark-blue);
  font-size: 14px;
}

.readonly-field {
  user-select: none;
  pointer-events: none;
}

.form-textarea {
  flex: 1;
  color: var(--dark-blue);
  border-radius: 8px;
  border: 1px solid var(--dark-beige);
  padding: 10px;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
  min-height: 100px;
  resize: vertical;
}

.section-title {
  font-family: 'Jakarta', sans-serif;
  font-weight: bold;
  font-size: 24px;
  color: var(--dark-blue);
  margin-bottom: 20px;
}

.empty-list {
  font-size: 14px;
  color: var(--dark-blue);
}

.dog-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--dark-beige);
}

.dog-avatar img {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--dark-beige);
}

.dog-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.dog-name {
  font-weight: bold;
  font-size: 14px;
  color: var(--dark-blue);
  margin: 0;
}

.dog-breed {
  color: var(--beige-pink);
  font-size: 12px;
  margin-top: 4px;
  margin-bottom: 4px;
}

.dog-birthday {
  color: var(--beige-pink);
  font-size: 12px;
  margin-bottom: 4px;
  margin-top: 4px;
}

.dog-tags ion-chip {
  margin-right: 5px;
  margin-top: 2px;
  background: var(--dark-beige);
  color: var(--dark-blue);
  border-radius: 8px;
  font-size: 12px;
}

.personality-tag.readonly {
  pointer-events: none;
}
</style>
