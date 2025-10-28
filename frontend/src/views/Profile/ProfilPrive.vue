<template>
  <ion-page>
    <!-- HEADER -->
    <ion-header>
      <ion-toolbar class="custom-header">
        <ion-title class="header-title">
          {{ editMode ? "Modifier mon profil" : "Mon profil" }}
        </ion-title>
        <ion-buttons slot="start">
          <ion-img :src="iconLogo" alt="icon clanimo" class="header-logo" />
        </ion-buttons>

        <ion-buttons slot="end">
          <ion-button class="friends-list-btn" @click="router.push('/friends')">
            <PhUserList :size="24" color="#32354B" />
          </ion-button>
          <ion-button @click="router.push('/settings')" fill="clear" aria-label="Paramètres">
            <PhGear class="icon" size="22" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding profile-page">
      <!-- Todo PROFILE HEADER -->
      <div class="profile-header">
        <!-- Avatar via GridFS/Supabase : v-model = URL ABSOLUE ; prop :storage-path -->
        <Avatar v-model="user.avatarURL" :readonly="!editMode" :storage-path="storagePath" />
        <div class="profile-name">
          <h2>{{ user.name }}</h2>
          <p>@{{ user.username }}</p>
        </div>
        <ion-button v-if="!editMode" class="edit-btn" @click="toggleEditMode">
          <PhPencilSimple :size="18" style="margin-right: 6px" />
          Modifier le profil
        </ion-button>
        <ion-button v-if="editMode" class="save-btn" expand="block" @click="saveProfile">
          Enregistrer les modifications
        </ion-button>
      </div>

      <!-- TODO Infos utilisateur -->
      <section class="card">
        <h3 class="section-title">Informations</h3>

        <label class="input-label">Nom</label>
        <ion-input v-model="user.name" :readonly="!editMode" class="form-input"
          :class="{ 'readonly-field': !editMode }" />

        <label class="input-label">Nom d'utilisateur</label>
        <ion-input v-model="user.username" :readonly="!editMode" class="form-input"
          :class="{ 'readonly-field': !editMode }" />

        <div class="bio-header">
          <label class="input-label">Bio</label>
          <small class="char-count">{{ (user.bio || '').length }}/160</small>
        </div>
        <ion-textarea v-model="user.bio" :readonly="!editMode" maxlength="160" class="form-textarea"
          :class="{ 'readonly-field': !editMode }" />

        <label class="input-label">Quartier</label>
        <div v-if="!editMode" class="form-input-district">
          {{ user.district }}
        </div>
        <ion-select v-else v-model="user.district" placeholder="Choisir un quartier">
          <ion-select-option v-for="district in districts" :key="district" :value="district">
            {{ district }}
          </ion-select-option>
        </ion-select>
      </section>

      <!-- Chiens -->
      <section class="card">
        <div class="section-title-row">
          <h3 class="section-title">Vos chiens</h3>
          <ion-button v-if="!editMode" size="small" class="add-dog-btn" @click="createNewDog">
            <PhPlus size="18" style="margin-right: 6px" />
            Ajouter un chien
          </ion-button>
        </div>

        <div v-for="dog in dogs" :key="dog._id || dog.id" class="dog-item">
          <div class="dog-avatar-info-row">
            <ion-avatar class="dog-avatar">
              <img :src="imgSrc(dog.avatarURL)" alt="Avatar chien" />
            </ion-avatar>

            <div class="dog-info">
              <p class="dog-name">{{ dog.name }}</p>
              <p class="dog-breed">{{ dog.breed }}</p>
              <p class="dog-birthday" v-if="dog.birthday">
                Date de naissance : {{ fmtDate(dog.birthday) }}
              </p>

              <div class="dog-tags" v-if="(dog.personalities || []).length">
                <ion-chip v-for="tag in (dog.personalities || [])" :key="tag" outline class="personality-tag readonly">
                  <ion-label>{{ tag }}</ion-label>
                </ion-chip>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="dog-actions" v-if="editMode">
            <ion-button class="dog-edit-btn" size="small" :router-link="editLink(dog)" router-direction="forward"
              @click.prevent="goToDogProfile(dog._id || dog.id)">
              <PhPencilSimple :size="16" style="margin-right: 6px" />
              Modifier
            </ion-button>

            <ion-button class="dog-del-btn" size="small" @click="askDeleteDog(dog)">
              <PhTrashSimple :size="16" style="margin-right: 6px" />
              Supprimer
            </ion-button>
          </div>
        </div>
      </section>
    </ion-content>

    <!-- Alerte de confirmation (sortie édition) -->
    <ion-alert :is-open="showAlert" header="Attention"
      message="Vous avez des modifications non sauvegardées. Voulez-vous continuer ?" :buttons="[
        { text: 'Annuler', role: 'cancel' },
        { text: 'Confirmer', handler: alertType === 'back' ? goBackConfirmed : cancelEditConfirmed }
      ]" />

    <!-- Alerte suppression chien -->
    <ion-alert :is-open="showDeleteAlert" header="Supprimer ce chien ?"
      :message="`Vous êtes sur le point de supprimer « ${dogToDelete?.name || ''} ». Cette action est définitive.`"
      :buttons="[
        { text: 'Annuler', role: 'cancel' },
        { text: 'Supprimer', role: 'destructive', handler: confirmDeleteDog }
      ]" @didDismiss="showDeleteAlert = false" />

    <!-- Toasts -->
    <ion-toast :is-open="toast.open" :message="toast.message" :color="toast.color" duration="2200"
      @didDismiss="toast.open = false" />
  </ion-page>
</template>

<script setup>
import iconLogo from '@/assets/image/icon.svg'
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonAvatar, IonTextarea, IonInput,
  IonSelect, IonSelectOption, IonChip, IonLabel, IonAlert, IonToast, IonImg, onIonViewWillEnter
} from "@ionic/vue";
import { PhPencilSimple, PhPlus, PhUserList, PhGear, PhTrashSimple } from "@phosphor-icons/vue";
import Avatar from "@/components/Avatar.vue";
import api from "@/lib/api";
import { auth } from "@/lib/firebase";
import defaultDogAvatar from '@/assets/image/clanimo-default-dog-avatar.png';

const router = useRouter();

// Base backend pour transformer /api/... en URL absolue
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4200/api/v1';
const API_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, '');

const storagePath = computed(() => {
  const uid = auth.currentUser?.uid;
  return uid ? `users/${uid}` : 'users';
});

const user = ref({
  avatarURL: "",
  name: "",
  username: "",
  bio: "",
  district: "",
});
const dogs = ref([]);

const editMode = ref(false);
const showAlert = ref(false);
const alertType = ref(null);
const showDeleteAlert = ref(false);
const dogToDelete = ref(null);

const toast = ref({ open: false, message: "", color: "dark" });

const originalUser = ref({});

const districts = ref([
  "Ahuntsic-Cartierville", "Anjou", "Côte-des-Neiges–Notre-Dame-de-Grâce",
  "Lachine", "LaSalle", "Le Plateau-Mont-Royal", "Le Sud-Ouest",
  "L'Île-Bizard–Sainte-Geneviève", "Mercier–Hochelaga-Maisonneuve",
  "Montréal-Nord", "Outremont", "Pierrefonds-Roxboro",
  "Rivière-des-Prairies–Pointe-aux-Trembles", "Rosemont–La Petite-Patrie",
  "Saint-Laurent", "Saint-Léonard", "Verdun", "Ville-Marie",
  "Villeray–Saint-Michel–Parc-Extension",
]);

function fmtDate(d) {
  try { return new Date(d).toLocaleDateString() } catch { return d }
}

// Transforme /api/... en URL absolue http://localhost:4200/...
function imgSrc(u, fallback = defaultDogAvatar) {
  if (!u) return fallback;
  if (/^(https?:|data:|blob:)/i.test(u)) return u;
  if (u.startsWith('/api/')) return `${API_ORIGIN}${u}`;
  return u;
}

function normalizeUser(dto = {}) {
  const avatar = dto.avatarURL || dto.avatar || '';
  return {
    avatarURL: imgSrc(avatar),
    name: dto.name || '',
    username: dto.username || '',
    bio: dto.bio || '',
    district: dto.district || '',
    dogs: Array.isArray(dto.dogs) ? dto.dogs : [],
  };
}

// Charge @me ; crée si 404 ; redirige si 401
const loadUserData = async () => {
  try {
    const data = await api.get(`/users/@me`);
    const u = normalizeUser(data.user || {});
    user.value = { ...u };
    originalUser.value = JSON.parse(JSON.stringify(user.value));
    console.log("[ProfilPrive] Utilisateur normalisé :", u);
    console.log("[ProfilPrive] Chiens intégrés :", u.dogs);
    await tryFetchDogs();
  } catch (err) {
    console.error("Erreur récupération utilisateur :", err);
    if (err.status === 404) {
      const displayName = auth.currentUser?.displayName || "Utilisateur";
      const created = await api.put(`/users/@me`, { name: displayName });
      const u = normalizeUser(created.user || {});
      user.value = { ...u };
      originalUser.value = JSON.parse(JSON.stringify(user.value));
      dogs.value = u.dogs;
      if (!dogs.value?.length) await tryFetchDogs();
    } else if (err.status === 401) {
      router.push({ name: "login", query: { redirect: "/tabs/profilPrive" } });
    }
  }
};

async function tryFetchDogs() {
  try {
    const r1 = await api.get('/dogs/@me').catch(() => null);
    if (r1?.dogs?.length) { dogs.value = r1.dogs; return; }
    const r2 = await api.get('/dogs?owner=@me').catch(() => null);
    if (r2?.dogs?.length) { dogs.value = r2.dogs; return; }
    const r3 = await api.get('/dogs').catch(() => null);
    if (r3?.dogs?.length) { dogs.value = r3.dogs; return; }
  } catch { /* no-op */ }
}

onMounted(loadUserData);

onIonViewWillEnter(() => {
  loadUserData();
});

const toggleEditMode = () => {
  if (editMode.value && hasChanges()) {
    alertType.value = "edit";
    showAlert.value = true;
  } else {
    editMode.value = !editMode.value;
  }
};

const hasChanges = () =>
  JSON.stringify(user.value) !== JSON.stringify(originalUser.value);

const cancelEditConfirmed = () => {
  showAlert.value = false;
  editMode.value = false;
  user.value = JSON.parse(JSON.stringify(originalUser.value));
};

//   Helpers de navigation vers l’édition du chien
const editLink = (dog) => {
  const id = String(dog?._id || dog?.id || '');
  return id ? `/profile/dogs/${encodeURIComponent(id)}` : '/profile';
};

function goToDogProfile(dogId) {
  const id = String(dogId || '');
  if (!id) {
    console.warn('[ProfilPrive] dogId manquant sur clic Modifier');
    alert("Impossible d’ouvrir la fiche: identifiant manquant.");
    return;
  }
  router.push({ name: 'EditDogProfile', params: { id } })
    .catch((err) => console.error('[ProfilPrive] navigation error:', err));
}

const saveProfile = async () => {
  try {
    // On envoie avatarURL ET avatar (compat backend),
    // en préférant une URL RELATIVE si l’API attend /api/v1/uploads/...
    const avatarRel = user.value.avatarURL?.replace(API_ORIGIN, '') || '';
    const payload = {
      name: user.value.name,
      username: user.value.username,
      bio: user.value.bio,
      district: user.value.district,
      avatarURL: avatarRel || user.value.avatarURL,
      avatar: avatarRel || user.value.avatarURL,
    };

    const updated = await api.put(`/users/@me`, payload);
    const u = normalizeUser(updated.user || {});
    user.value = { ...u };
    originalUser.value = JSON.parse(JSON.stringify(user.value));
    editMode.value = false;
    toast.value = { open: true, message: "Profil sauvegardé !", color: "success" };
  } catch (err) {
    console.error("Erreur sauvegarde :", err);
    if (err.status === 409 && err.error === "username_taken") {
      toast.value = { open: true, message: "Nom d'utilisateur déjà pris.", color: "warning" };
    } else if (err.status === 409 && err.error === "email_taken") {
      toast.value = { open: true, message: "Email déjà utilisé.", color: "warning" };
    } else {
      toast.value = { open: true, message: "Impossible d'enregistrer le profil.", color: "danger" };
    }
  }
};

const createNewDog = () => router.push({ name: "DogProfile" });
const goBackConfirmed = () => window.history.back();

/* Suppression d’un chien */
function askDeleteDog(dog) {
  dogToDelete.value = dog;
  showDeleteAlert.value = true;
}

async function confirmDeleteDog() {
  showDeleteAlert.value = false;
  if (!dogToDelete.value) return;

  const id = String(dogToDelete.value._id || dogToDelete.value.id || "");
  try {
    // 1) Route collection /dogs/:id
    await api.del(`/dogs/${id}`);
  } catch (e1) {
    // 2) Fallback : chien embarqué dans users
    try {
      await api.del(`/users/@me/dogs/${id}`);
    } catch (e2) {
      console.error("Suppression chien échouée:", e1, e2);
      toast.value = { open: true, message: "Impossible de supprimer ce chien.", color: "danger" };
      dogToDelete.value = null;
      return;
    }
  }
  // Succès → retrait local
  dogs.value = dogs.value.filter(d => (d._id || d.id) !== id);
  dogToDelete.value = null;
  toast.value = { open: true, message: "Chien supprimé.", color: "success" };
}
</script>

<style scoped>
/* En-tête */
ion-toolbar.custom-header {
  --color: var(--dark-blue);
  border-bottom: 1px solid var(--dark-beige);
}

/* Header profil */
.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding-bottom: 16px;
}

.header-logo {
  width: 24px;
  height: 24px;
  margin-left: 8px;
}

.profile-name {
  text-align: center;
}

.profile-name h2 {
  font-family: "Jakarta", sans-serif;
  font-weight: 700;
  font-size: 20px;
  color: var(--dark-blue);
  margin: 0;
}

.profile-name p {
  font-size: 14px;
  color: var(--beige-pink);
  margin: 0;
}

.edit-btn {
  --background: var(--dark-beige);
  --color: var(--dark-blue);
  display: flex;
  gap: 6px;
  text-transform: none;
  --border-radius: 8px;
  font-weight: 600;
}

.save-btn {
  --background: var(--yellow);
  --color: var(--dark-blue);
  display: flex;
  gap: 6px;
  text-transform: none;
  --border-radius: 8px;
  font-weight: 600;
}

/* Titres */
.card {
  border-top: 3px solid var(--dark-beige);
  padding-bottom: 16px;
}

.section-title {
  font-family: "Jakarta", sans-serif;
  font-weight: 800;
  font-size: 20px;
  color: var(--dark-blue);
  margin-top: 16px;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  margin-top: 16px;
}

.add-dog-btn {
  --background: var(--yellow);
  --color: var(--dark-blue);
  text-transform: none;
  --border-radius: 8px;
  font-weight: 600;
}

/* Inputs */
.input-label {
  font-family: "Jakarta", sans-serif;
  font-weight: 600;
  color: var(--beige-pink);
  font-size: 14px;
  margin-bottom: 8px;
  margin-top: 12px;
  display: block;
}

.form-input {
  --padding-start: 10px;
  --color: var(--dark-blue);
  --border-radius: 10px;
  --background: var(--dark-beige);
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
}

.form-input-district {
  border-radius: 10px;
  padding: 14px;
  background-color: var(--dark-beige);
  color: var(--dark-blue);
  font-size: 14px;
}

/* .readonly-field {
  user-select: none;
  pointer-events: none;
  background-color: var(--beige);
} */

.bio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.form-textarea {
  flex: 1;
  --color: var(--dark-blue);
  border-radius: 10px;
  border: 1px solid var(--dark-beige);
  padding: 10px;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
  min-height: 100px;
  resize: vertical;
  background: var(--dark-beige);
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
  border-radius: 10px;
  border: 1px solid var(--dark-beige);
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
  background: var(--dark-beige);
}

/* Liste chiens */
.dog-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--dark-beige);
  background: var(--beige);
  transition: transform .06s ease, box-shadow .06s ease;
}

.dog-avatar-info-row {
  display: flex;
  align-items: center;
  gap: 12px;
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
  gap: 4px;
}

.dog-name {
  font-weight: 800;
  font-size: 14px;
  color: var(--dark-blue);
  margin: 0;
}

.dog-breed,
.dog-birthday {
  color: var(--beige-pink);
  font-size: 12px;
  margin: 0;
}

.dog-tags {
  margin-top: 4px;
}

.dog-tags ion-chip {
  margin-right: 6px;
  margin-top: 4px;
  background: var(--dark-beige);
  color: var(--dark-blue);
  border-radius: 10px;
  border: 1px solid var(--beige-pink);
  font-size: 12px;
}

.personality-tag.readonly {
  pointer-events: none;
}

.dog-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.dog-edit-btn {
  border-radius: 12px;
  height: 34px;
  display: flex;
  gap: 6px;
  text-transform: none;
  --border-radius: 8px;
  font-weight: 600;
}

.dog-del-btn {
  --background: var(--dark-blue);
  --color: var(--yellow);
  border-radius: 12px;
  height: 34px;
  display: flex;
  gap: 6px;
  text-transform: none;
  --border-radius: 8px;
  font-weight: 600;
}
</style>
