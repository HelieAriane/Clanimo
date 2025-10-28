<template>
  <ion-page>
    <!-- HEADER -->
    <ion-header>
      <ion-toolbar>
        <ion-title>Créer votre profil</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding profile-form-page">
      <!-- Profile -->
      <div class="profile-form-card">
        <div class="profile-header">
          <!-- Avatar Supabase : URL publique + save immédiat -->
          <Avatar v-model="user.avatarURL" :storage-path="storagePath" @uploaded="onAvatarUploaded" />
        </div>
      </div>

      <!-- Infos utilisateur -->
      <label class="input-label">Nom *</label>
      <ion-input v-model="user.name" placeholder="Entrez votre nom" class="form-input" />

      <label class="input-label">Nom d'utilisateur *</label>
      <ion-input v-model="user.username" placeholder="Entrez votre nom d'utilisateur" class="form-input" />

      <div class="bio-header">
        <label class="input-label">Bio *</label>
        <small class="char-count">{{ (user.bio || '').length }}/160</small>
      </div>
      <ion-textarea v-model="user.bio" maxlength="160" placeholder="Parlez un peu de vous" class="form-textarea" />

      <label class="input-label">Quartier *</label>
      <ion-select v-model="user.district" placeholder="Choisir un quartier">
        <ion-select-option v-for="district in districts" :key="district" :value="district">{{ district
          }}</ion-select-option>
      </ion-select>

      <!-- Bouton sauvegarder -->
      <ion-button expand="block" size="small" class="save-button" @click="saveProfile">
        Enregistrer le profil
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonSelect, IonSelectOption, IonInput, IonTextarea
} from "@ionic/vue";
import Avatar from "@/components/Avatar.vue";
import api from "@/lib/api";
import { auth } from "@/lib/firebase";

const router = useRouter();

// Pour convertir d'éventuelles URLs relatives venant du backend
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4200/api/v1";
const API_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, "");

// Dossier de stockage Supabase (ex: users/<uid>)
const storagePath = computed(() => {
  const uid = auth.currentUser?.uid;
  return uid ? `users/${uid}` : "users";
});

// Etat local du user (avatarURL est une URL publique Supabase)
const user = ref({
  avatarURL: "",
  name: "",
  username: "",
  bio: "",
  district: "",
});

// Chiens (lecture seule ici)
const dogs = ref([]);

function imgSrc(u) {
  if (!u) return "";
  if (/^(https?:|data:|blob:)/i.test(u)) return u;
  if (u.startsWith("/api/")) return `${API_ORIGIN}${u}`;
  return u;
}

const districts = ref([
  "Ahuntsic-Cartierville", "Anjou", "Côte-des-Neiges–Notre-Dame-de-Grâce",
  "Lachine", "LaSalle", "Le Plateau-Mont-Royal", "Le Sud-Ouest",
  "L'Île-Bizard–Sainte-Geneviève", "Mercier–Hochelaga-Maisonneuve",
  "Montréal-Nord", "Outremont", "Pierrefonds-Roxboro",
  "Rivière-des-Prairies–Pointe-aux-Trembles", "Rosemont–La Petite-Patrie",
  "Saint-Laurent", "Saint-Léonard", "Verdun", "Ville-Marie",
  "Villeray–Saint-Michel–Parc-Extension",
]);

// Normalise le user depuis le backend
function normalizeUser(u = {}) {
  return {
    avatarURL: imgSrc(u.avatarURL || u.avatar || ""),
    name: u.name || "",
    username: u.username || "",
    bio: u.bio || "",
    district: u.district || "",
  };
}

// Récupérer le profil (et créer si 404)
const fetchUserProfile = async () => {
  try {
    const data = await api.get(`/users/@me`);
    user.value = normalizeUser(data.user || {});
    dogs.value = Array.isArray(data.user?.dogs) ? data.user.dogs : [];
  } catch (error) {
    if (error?.status === 404) {
      const displayName = auth.currentUser?.displayName || "Utilisateur";
      const created = await api.put(`/users/@me`, { name: displayName });
      user.value = normalizeUser(created.user || {});
      dogs.value = Array.isArray(created.user?.dogs) ? created.user.dogs : [];
      return;
    }
    console.error("Erreur récupération profil :", error);
  }
};

// Sauvegarde immédiate de l’avatar quand l’upload Supabase réussit
async function onAvatarUploaded(url) {
  try {
    await api.put(`/users/@me`, { avatarURL: url, avatar: url });
    user.value.avatarURL = url;
  } catch (e) {
    console.error("Erreur save avatar :", e);
  }
}

// Sauvegarder le profil
const saveProfile = async () => {
  if (!user.value.name || !user.value.username || !user.value.bio || !user.value.district) {
    alert("Veuillez remplir tous les champs obligatoires.");
    return;
  }
  try {
    const updated = await api.put(`/users/@me`, {
      avatarURL: user.value.avatarURL || "",
      avatar: user.value.avatarURL || "",
      name: user.value.name,
      username: user.value.username,
      bio: user.value.bio,
      district: user.value.district,
    });
    user.value = normalizeUser(updated.user || {});
    alert("Profil enregistré avec succès !");
    router.replace("/tabs/meetups");
  } catch (error) {
    if (error?.status === 409 && error?.error === "username_taken") {
      alert("Ce nom d'utilisateur est déjà pris. Merci d'en choisir un autre.");
    } else if (error?.status === 409 && error?.error === "email_taken") {
      alert("Email déjà utilisé.");
    } else {
      alert("Impossible d'enregistrer le profil.");
    }
    console.error("Erreur sauvegarde profil :", error);
  }
};

onMounted(fetchUserProfile);
</script>

<style scoped>
ion-toolbar {
  --color: var(--dark-blue);
}

.profile-form-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
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
  --padding-start: 10px;
  --color: var(--dark-blue);
  border-radius: 8px;
  border: 1px solid var(--dark-beige);
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
}

.bio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.form-textarea {
  flex: 1;
  --color: var(--dark-blue);
  border-radius: 8px;
  border: 1px solid var(--dark-beige);
  padding: 10px;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
  min-height: 100px;
  resize: vertical;
}

.char-count {
  font-size: 12px;
  color: var(--beige-pink);
  text-align: right;
  white-space: nowrap;
}

ion-select {
  --padding-start: 10px;
  color: var(--dark-blue);
  border-radius: 8px;
  border: 1px solid var(--dark-beige);
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
}

.section-title {
  font-family: 'Jakarta', sans-serif;
  font-weight: bold;
  color: var(--dark-blue);
  font-size: 16px;
  margin-top: 15px;
  margin-bottom: 8px;
}

.dog-card {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--dark-beige);
}

ion-avatar {
  margin: 2px;
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
  margin-bottom: 4px;
  margin-top: 4px;
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

.save-button {
  --background: var(--yellow);
  --color: var(--dark-blue);
  display: flex;
  text-transform: none;
  --border-radius: 8px;
  font-weight: 600;
  margin-top: 30px;
}
</style>
