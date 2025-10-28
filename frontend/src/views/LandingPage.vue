<template>
  <ion-page class="landing-page">
    <video autoplay muted playsinline @ended="onVideoEnd" class="logo-video">
      <source src="/logoAnimation.mp4" type="video/mp4" />
      Votre navigateur ne supporte pas la vidéo.
    </video>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage } from "@ionic/vue";
import { useRouter } from "vue-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const router = useRouter();
const auth = getAuth();

const onVideoEnd = () => {
  setTimeout(checkUserStatus, 2000);
};

const checkUserStatus = () => {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      // Pas connecté du tout --> Login
      router.replace("/login");
      return;
    }

    // Ici l’utilisateur est déjà connecté Firebase
    const isFirstTime = localStorage.getItem("firstTime") !== "false"; // par défaut true
    const wasLoggedOut = localStorage.getItem("wasLoggedOut") === "true";

    if (isFirstTime) {
      localStorage.setItem("firstTime", "false");
      router.replace("/register");
    } else if (!wasLoggedOut) {
      router.replace("/tabs/meetups");
    } else {
      router.replace("/login");
    }
  });
};
</script>

<style scoped>
.landing-page {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: var(--beige);
}

.logo-video {
  max-width: 80%;
  max-height: 80%;
  border-radius: 16px;
}
</style>
