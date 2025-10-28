<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <PhArrowLeft :size="24" color="#32354B" />
          </ion-button>
        </ion-buttons>
        <ion-title class="header-title">Modifier mon mot de passe</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-text>
        <h1 class="auth-title">Changer mon mot de passe</h1>
        <p class="auth-p">Entrez votre nouveau mot de passe ci-dessous.</p>
      </ion-text>

      <ion-input class="auth-input" placeholder="Nouveau mot de passe" type="password" v-model="newPassword"
        @keyup.enter="changePassword" required>
        <ion-input-password-toggle slot="end"></ion-input-password-toggle>
      </ion-input>

      <ion-input class="auth-input" placeholder="Confirmer le mot de passe" type="password" v-model="confirmPassword"
        @keyup.enter="changePassword" required>
        <ion-input-password-toggle slot="end"></ion-input-password-toggle>
      </ion-input>

      <ion-text v-if="error" color="danger">
        <p>{{ error }}</p>
      </ion-text>

      <ion-button expand="block" class="auth-button" :disabled="loading" @click="changePassword">
        Changer le mot de passe
      </ion-button>

      <ion-loading :is-open="loading" message="Mise à jour..." />
      <ion-toast :is-open="toast.open" :message="toast.message" :color="toast.color" duration="3000"
        @didDismiss="toast.open = false" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonText,
  IonInput,
  IonButton,
  IonLoading,
  IonToast,
} from "@ionic/vue";
import { PhArrowLeft } from "@phosphor-icons/vue";

const router = useRouter();
const newPassword = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const error = ref("");
const toast = ref({
  open: false,
  message: "",
  color: "success" as "success" | "danger",
});

const changePassword = async () => {
  error.value = "";
  if (!newPassword.value || !confirmPassword.value) {
    error.value = "Veuillez remplir les deux champs.";
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = "Les mots de passe ne correspondent pas.";
    return;
  }

  loading.value = true;
  try {

    // Simuler succès
    toast.value = {
      open: true,
      message: "Mot de passe mis à jour !",
      color: "success",
    };

    newPassword.value = "";
    confirmPassword.value = "";

    // Redirection vers login
    setTimeout(() => router.push({ name: "login" }), 1000);
  } catch (e: any) {
    error.value = e.message || "Erreur lors de la mise à jour.";
    toast.value = { open: true, message: error.value, color: "danger" };
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.back();
};
</script>
<style scoped>
ion-toolbar {
  --color: var(--dark-blue);
}

ion-content.auth-page {
  padding: 16px 16px 32px;
}

.auth-button {
  margin-top: 24px;
  margin-bottom: 16px;
  background-color: var(--yellow);
  color: var(--dark-blue);
  border-radius: 8px;
  font-weight: 600;
}

.auth-title {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 20px;
  color: var(--dark-blue);
  margin-bottom: 10px;
}

.auth-p {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 14px;
  color: var(--beige-pink);
}

.auth-input {
  margin-bottom: 20px;
}

.auth-subtext {
  margin-top: 20px;
}
</style>
