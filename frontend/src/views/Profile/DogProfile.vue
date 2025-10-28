<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <PhArrowLeft size="24" style="margin-left: 10px; cursor: pointer;" @click="goBack" class="icon" />
        </ion-buttons>
        <ion-title>Ajouter un chien</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="dog-form-card">
        <div class="profile-header">
          <Avatar v-model="newDog.avatarURL" kind="dog" bucket="avatars" :folder="`dogs/${uid}/`"
            @uploaded="onAvatarUploaded" />
        </div>

        <label class="input-label">Nom *</label>
        <ion-input v-model="newDog.name" placeholder="Nom de votre chien" class="form-input" required />

        <label class="input-label">Race *</label>
        <ion-input v-model="newDog.breed" placeholder="Race de votre chien" class="form-input" required />

        <label class="input-label">Personnalité (Minimum 1) *</label>
        <div class="personality-container">
          <PersonnalityTags v-model="newDog.personalities" />
        </div>

        <label class="input-label">Date de naissance *</label>
        <ion-datetime v-model="newDog.birthday" presentation="date" display-format="DD MMMM YYYY" locale="fr-CA"
          :min="'1990-01-01'" :max="today" class="form-datetime" required>
          <span slot="title">Sélectionner la date</span>
        </ion-datetime>

        <ion-button expand="block" class="save-button" @click="saveDogProfile">
          Ajouter le chien
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonInput, IonDatetime
} from "@ionic/vue";
import { PhArrowLeft } from "@phosphor-icons/vue";
import PersonnalityTags from "@/components/PersonnalityTags.vue";
import Avatar from "@/components/Avatar.vue";
import api from "@/lib/api";
import { auth } from "@/lib/firebase";

const router = useRouter();
const today = new Date().toISOString().split("T")[0];
const uid = computed(() => auth.currentUser?.uid || "anonymous");

const newDog = ref({
  name: "",
  breed: "",
  personalities: [],
  birthday: "",
  avatarURL: "",
});

function asISODate(v) {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toISOString();
  } catch {
    return String(v);
  }
}

async function onAvatarUploaded(publicUrl) {
  console.log("Avatar uploadé, URL reçue :", publicUrl);
  if (publicUrl && publicUrl.url) {
    newDog.value.avatarURL = publicUrl.url;
    console.log("URL enregistrée dans newDog.avatarURL :", newDog.value.avatarURL);
  } else if (typeof publicUrl === "string") {
    newDog.value.avatarURL = publicUrl;
    console.log("URL enregistrée (string) :", newDog.value.avatarURL);
  } else {
    console.warn("Impossible de récupérer l'URL de l'avatar !");
  }
}

const saveDogProfile = async () => {
  // Validations UI
  if (!newDog.value.name?.trim() || !newDog.value.breed?.trim() || !newDog.value.birthday) {
    alert("Tous les champs sont obligatoires !");
    return;
  }
  if (!Array.isArray(newDog.value.personalities) || newDog.value.personalities.length < 1) {
    alert("Sélectionne au moins une personnalité.");
    return;
  }

  const isoBirthday = asISODate(newDog.value.birthday);

  const payload = {
    name: newDog.value.name.trim(),
    breed: newDog.value.breed.trim(),
    personalities: newDog.value.personalities,
    birthday: isoBirthday,
    avatarURL: newDog.value.avatarURL || ""
  };

  try {
    // Création du chien dans /dogs
    const { dog } = await api.post("/dogs", payload);

    // Récupérer l'utilisateur courant
    const { user: currentUser } = await api.get("/users/@me");

    // Mettre à jour le user pour ajouter ce chien
    await api.put("/users/@me", {
      dogs: [...(currentUser.dogs || []), dog]
    });

    // Retour au profil
    router.push({ name: "profilPrive" });

  } catch (error) {
    console.error("Erreur:", error);
    alert("Impossible d'ajouter le chien. Réessayez plus tard.");
  }
};

const goBack = () => {
  window.history.back();
};
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

.save-button {
  --background: var(--yellow);
  --color: var(--dark-blue);
  border-radius: 8px;
  margin-top: 20px;
  text-transform: none;
  --border-radius: 8px;
  font-weight: 600;
}
</style>
