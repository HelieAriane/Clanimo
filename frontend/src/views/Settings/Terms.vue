<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <PhArrowLeft size="24" style="margin-left: 10px; cursor: pointer;" @click="router.push('/settings')"
            class="icon" />
        </ion-buttons>
        <ion-title>Termes et conditions</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <section v-for="(section, index) in termsSections" :key="index" class="term-section">
        <h2>{{ section.title }}</h2>
        <p>{{ section.text }}</p>
      </section>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent } from '@ionic/vue';
import { ref } from 'vue';
import { PhArrowLeft } from "@phosphor-icons/vue";
import { useRouter } from "vue-router";

const router = useRouter();

const termsSections = ref([
  { title: "1. Utilisation de l’application", text: "L’application est réservée aux propriétaires de chiens souhaitant interagir avec la communauté. Vous vous engagez à utiliser l’app de manière respectueuse et légale." },
  { title: "2. Création de compte", text: "Vous devez fournir des informations exactes et à jour pour créer un compte. La double authentification (SMS ou email) peut être utilisée pour sécuriser votre compte." },
  { title: "3. Contenu utilisateur", text: "Tout contenu que vous partagez (messages, photos, profils) doit respecter la loi et ne pas porter atteinte à autrui. Nous nous réservons le droit de supprimer tout contenu inapproprié." },
  { title: "4. Interactions avec les autres utilisateurs", text: "Vous êtes responsable de vos interactions. Les abus, harcèlements ou comportements inappropriés peuvent entraîner le blocage ou la suppression de votre compte." },
  { title: "5. Propriété intellectuelle", text: "L’ensemble du contenu et du design de l’application est protégé par le droit d’auteur. Vous ne pouvez pas le reproduire sans autorisation." },
  { title: "6. Modifications des termes", text: "Nous pouvons modifier ces conditions à tout moment. Les utilisateurs seront informés via l’application ou par email." },
  { title: "7. Limitation de responsabilité", text: "Nous ne sommes pas responsables des dommages directs ou indirects liés à l’utilisation de l’application." },
  { title: "8. Contact", text: "Pour toute question concernant ces conditions, veuillez nous contacter à RENRER NOTRE ADRESSE COURRIEL DE L'APP." },
]);
</script>

<style scoped>
ion-toolbar {
  --color: var(--dark-blue);
}

.term-section {
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid var(--dark-beige);
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

h2 {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 1.3rem;
  color: var(--dark-blue);
  border-left: 4px solid var(--yellow);
  padding-left: 12px;
  margin-bottom: 10px;
}

p {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--beige-pink);
  margin-bottom: 0;
}
</style>
