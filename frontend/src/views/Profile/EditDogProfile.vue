<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <PhArrowLeft size="24" style="margin-left: 10px; cursor: pointer;" @click="goBack" class="icon" />
        </ion-buttons>
        <ion-title>Profil du chien</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="dog-form-card" v-if="dog">
        <div class="profile-header">
          <Avatar v-model="dog.avatarURL" kind="dog" bucket="avatars" :folder="`dogs/${uid}/`"
            @uploaded="onAvatarUploaded" @update:modelValue="onAvatarUpdated" />
        </div>

        <div>
          <label class="input-label">Nom</label>
          <ion-input v-model="dog.name" class="form-input" />
        </div>

        <div>
          <label class="input-label">Race</label>
          <ion-input v-model="dog.breed" class="form-input" />
        </div>

        <label class="input-label">Personnalités</label>
        <div class="personality-container">
          <PersonnalityTags v-model="dog.personalities" />
        </div>

        <label class="input-label">Date de naissance</label>
        <ion-datetime v-model="dog.birthday" presentation="date" display-format="DD MMMM YYYY" locale="fr-CA"
          :min="'1990-01-01'" :max="today" class="form-datetime">
          <span slot="title">Sélectionner la date</span>
        </ion-datetime>

        <div class="buttons">
          <ion-button expand="block" class="save-button" @click="saveDogProfile">
            Enregistrer
          </ion-button>

          <ion-button expand="block" class="delete-button" @click="confirmDelete">
            Supprimer ce chien
          </ion-button>
        </div>
      </div>
    </ion-content>

    <ion-alert :is-open="showAlert" header="Attention"
      message="Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?" :buttons="[
        { text: 'Annuler', role: 'cancel' },
        { text: 'Quitter', handler: goBackConfirmed },
      ]" />

    <ion-alert :is-open="showDelete" header="Supprimer" message="Supprimer définitivement ce chien ?" :buttons="[
      { text: 'Annuler', role: 'cancel' },
      { text: 'Supprimer', role: 'destructive', handler: deleteDog }
    ]" />
  </ion-page>
</template>

<script setup>
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonTitle, IonContent,
  IonInput, IonDatetime, IonAlert, IonButton
} from "@ionic/vue";
import { ref, onMounted, computed } from "vue";
import { PhArrowLeft } from "@phosphor-icons/vue";
import Avatar from "@/components/Avatar.vue";
import PersonnalityTags from "@/components/PersonnalityTags.vue";
import { useRoute, useRouter } from "vue-router";
import api from "@/lib/api";
import { auth } from "@/lib/firebase";

const router = useRouter();
const route = useRoute();

const uid = computed(() => auth.currentUser?.uid || "anonymous");
const dogId = computed(() =>
  String(route.params.id ?? route.params.dogId ?? route.params._id ?? "")
);

const showAlert = ref(false);
const showDelete = ref(false);
const today = new Date().toISOString().split("T")[0];
const originalDog = ref(null);

const dog = ref(null);

function normalizeDogDTO(dto = {}) {
  return {
    _id: dto._id || dogId.value,
    avatarURL: dto.avatarURL || "",
    name: dto.name || "",
    breed: dto.breed || "",
    personalities: Array.isArray(dto.personalities) ? dto.personalities : [],
    birthday: dto.birthday || "",
    owner: dto.ownerId || dto.owner || "",
  };
}

async function loadDogProfile() {
  if (!dogId.value) return;
  try {
    const res = await api.get(`/dogs/${dogId.value}`);
    const dto = res?.dog || res?.data || res;
    dog.value = normalizeDogDTO(dto);
    originalDog.value = JSON.parse(JSON.stringify(dog.value));
  } catch (error) {
    console.error("Erreur chargement profil chien:", error);
    router.replace({ name: "profilPrive" });
  }
}

function asISODate(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toISOString();
  } catch {
    return String(value);
  }
}

const hasChanges = () =>
  JSON.stringify(dog.value) !== JSON.stringify(originalDog.value);

const goBack = () => {
  if (originalDog.value && hasChanges()) showAlert.value = true;
  else window.history.back();
};

const goBackConfirmed = () => window.history.back();

function confirmDelete() {
  showDelete.value = true;
}

async function deleteDog() {
  try {
    await api.del(`/dogs/${dogId.value}`);
    router.replace({ name: "profilPrive" });
  } catch (e) {
    console.error("Suppression impossible:", e);
    alert("Impossible de supprimer pour le moment.");
  }
}

// persist avatar immediately
async function onAvatarUploaded(publicUrl) {
  if (!publicUrl || !dogId.value) return;

  try {
    const payload = { avatarURL: String(publicUrl) };
    await api.put(`/dogs/${dogId.value}`, payload);

    dog.value.avatarURL = publicUrl;
    originalDog.value = JSON.parse(JSON.stringify(dog.value));
    console.log("Avatar mis à jour avec succès :", publicUrl);
  } catch (e) {
    console.error("[EditDog] échec mise à jour avatar :", e.response?.data || e.message);
  }
}

function onAvatarUpdated(val) {
  if (!val || String(val).startsWith("blob:")) return;
  onAvatarUploaded(val);
}

async function saveDogProfile() {
  if (!dogId.value) {
    alert("Identifiant du chien manquant.");
    return;
  }
  if (!dog.value.name?.trim() || !dog.value.breed?.trim()) {
    alert("Nom et race sont obligatoires.");
    return;
  }
  if (!Array.isArray(dog.value.personalities) || dog.value.personalities.length < 1) {
    alert("Ajoutez au moins 1 trait de personnalité.");
    return;
  }

  try {
    const payload = {
      name: dog.value.name.trim(),
      breed: dog.value.breed.trim(),
      personalities: dog.value.personalities,
      birthday: dog.value.birthday ? asISODate(dog.value.birthday) : undefined,
      avatarURL: dog.value.avatarURL || "",
    };
    await api.put(`/dogs/${dogId.value}`, payload);
    originalDog.value = JSON.parse(JSON.stringify(dog.value));
    alert("Profil chien sauvegardé !");
    router.replace({ name: "profilPrive" });
  } catch (error) {
    console.error("Erreur sauvegarde profil chien:", error);
    alert("Impossible d'enregistrer. Réessayez plus tard.");
  }
}

onMounted(() => {
  if (!dogId.value) router.replace({ name: "profilPrive" });
  else loadDogProfile();
});
</script>

<style scoped>
ion-toolbar {
  --color: var(--dark-blue);
}

.dog-form-card {
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-header {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.input-label {
  font-family: "Jakarta", sans-serif;
  font-weight: 600;
  color: var(--beige-pink);
  font-size: 14px;
  margin-bottom: 8px;
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

.personality-container {
  margin-bottom: 10px;
}

.form-datetime {
  background: var(--beige);
  font-family: "Jakarta", sans-serif;
  border-radius: 8px;
  border: 1px solid var(--dark-beige);
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
  color: var(--beige-pink);
  --wheel-highlight-background: var(--yellow);
  --wheel-highlight-border-radius: 48px;
  --wheel-fade-background-rgb: 247, 236, 226;
}

.form-datetime::part(wheel-item) {
  color: var(--beige-pink);
}

.form-datetime::part(wheel-item active) {
  color: var(--dark-blue);
}

.form-datetime::part(time-button) {
  color: var(--dark-blue);
  background: transparent;
  border: 1px solid var(--dark-beige);
}

.form-datetime::part(time-button):hover {
  background: var(--yellow);
}

.buttons {
  display: grid;
  gap: 5px;
}

.save-button {
  --background: var(--yellow);
  --color: var(--dark-blue);
  --border-radius: 8px;
  margin-top: 20px;
  text-transform: none;
}

.delete-button {
  --background: var(--dark-blue);
  --color: var(--yellow);
  --border-radius: 8px;
  text-transform: none;
}
</style>
