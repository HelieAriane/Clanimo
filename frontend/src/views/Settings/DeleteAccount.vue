<template>
  <ion-page>
    <!-- HEADER -->
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <PhArrowLeft size="24" style="margin-left: 10px; cursor: pointer;" @click="router.push('/settings')"
            class="icon" />
        </ion-buttons>
        <ion-title class="header-title">Supprimer mon compte</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-text>
        <h1 class="auth-title">Suppression du compte</h1>
        <p class="auth-p">
          Cette action est définitive. Toutes vos données et informations personnelles
          seront supprimées de manière permanente et ne pourront pas être récupérées.
        </p>
      </ion-text>

      <ion-button expand="block" class="auth-button" :disabled="loading" @click="confirmDelete">
        Supprimer mon compte
      </ion-button>

      <ion-loading :is-open="loading" message="Suppression en cours..." />
      <ion-toast :is-open="toast.open" :message="toast.message" :color="toast.color" duration="3000"
        @didDismiss="toast.open = false" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { auth } from "@/lib/firebase";
import { PhArrowLeft } from "@phosphor-icons/vue";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonText,
  IonButton,
  IonLoading,
  IonToast,
  IonButtons
} from "@ionic/vue";

const router = useRouter();
const loading = ref(false);
const toast = ref({
  open: false,
  message: "",
  color: "success" as "success" | "danger",
});

const confirmDelete = async () => {
  if (!confirm("Voulez-vous vraiment supprimer votre compte ?")) return;

  loading.value = true;
  try {
    if (auth.currentUser) {
      await auth.currentUser.delete();
      toast.value = {
        open: true,
        message: "Compte supprimé.",
        color: "success",
      };
      setTimeout(() => router.push({ name: "login" }), 1000);
    }
  } catch (e: any) {
    toast.value = {
      open: true,
      message: e.message || "Erreur lors de la suppression.",
      color: "danger",
    };
  } finally {
    loading.value = false;
  }
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
</style>
