<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <PhArrowLeft size="24" style="margin-left: 10px; cursor: pointer;" @click="router.push('/settings')"
            class="icon" />
        </ion-buttons>
        <ion-title>Politique de confidentialité</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <section v-for="(section, index) in privacySections" :key="index" class="privacy-section">
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

const privacySections = ref([
  { title: "1. Collecte des données", text: "Nous collectons uniquement les informations nécessaires à l’utilisation de l’application : nom, email, numéro de téléphone (pour double authentification), informations sur les chiens et interactions au sein de la communauté." },
  { title: "2. Utilisation des données", text: "Vos données servent à créer et sécuriser votre compte, afficher votre profil selon vos paramètres de confidentialité, et envoyer des notifications si vous l’acceptez." },
  { title: "3. Partage des données", text: "Nous ne partageons pas vos données personnelles avec des tiers sans votre consentement, sauf si la loi l’exige." },
  { title: "4. Géolocalisation", text: "La géolocalisation est optionnelle et utilisée uniquement pour montrer votre présence aux amis ou pour organiser des rencontres." },
  { title: "5. Sécurité des données", text: "Vos informations sont protégées par des mesures de sécurité techniques et organisationnelles : chiffrement des données, HTTPS, double authentification." },
  { title: "6. Conservation des données", text: "Vos données sont conservées tant que votre compte est actif ou selon la loi applicable." },
  { title: "7. Vos droits", text: "Vous pouvez consulter, modifier ou supprimer vos informations personnelles via les paramètres de votre compte, ou demander la suppression complète de votre compte." },
  { title: "8. Contact", text: "Pour toute question concernant la confidentialité, contactez-nous à contact@nomapp.com." },
]);
</script>

<style scoped>
ion-toolbar {
  --color: var(--dark-blue);
}

.privacy-section {
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
