<template>
  <ion-page>
    <!-- HEADER -->
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <PhArrowLeft size="24" style="margin-left: 10px; cursor: pointer;" @click="router.push('/tabs/profilPrive')"
            class="icon" />
        </ion-buttons>
        <ion-title>Paramètres</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Compte & sécurité -->
      <ion-list inset>
        <ion-list-header>
          <h3 class="section-title">Compte & sécurité</h3>
        </ion-list-header>

        <ion-item button @click="goTo('ChangePassword')">
          <ion-label>Modifier mon mot de passe</ion-label>
        </ion-item>

        <ion-item button @click="goTo('DeleteAccount')">
          <ion-label>Supprimer mon compte</ion-label>
        </ion-item>
      </ion-list>

      <!-- Confidentialité -->
      <ion-list inset>
        <ion-list-header>
          <h3 class="section-title">Confidentialité</h3>
        </ion-list-header>

        <ion-item>
          <ion-label>Activer géolocalisation</ion-label>
          <ion-toggle justify="end" v-model="geoEnabled"></ion-toggle>
        </ion-item>

        <!-- Accordion pour utilisateurs bloqués -->
        <ion-accordion-group>
          <ion-accordion value="blockedUsers">
            <ion-item slot="header">
              <ion-label>
                {{ blockedUsers.length === 0 ? 'Utilisateur bloqué (0)' : blockedUsers.length === 1 ?
                  'Utilisateur bloqué (1)' : 'Utilisateurs bloqués (' + blockedUsers.length + ')' }}
              </ion-label>
            </ion-item>

            <div v-if="blockedUsers.length === 0" slot="content" class="empty-list">
              Aucun utilisateur bloqué.
            </div>

            <div v-else slot="content" class="blocked-users-list">
              <div v-for="user in blockedUsers" :key="user.id" class="modal-user-card">
                <div class="modal-user-info">
                  <img :src="user.photoURL" class="modal-user-avatar" />
                  <span class="modal-user-name">{{ user.name }}</span>
                </div>
                <ion-checkbox :checked="user.isBlocked" @ionChange="toggleBlock(user)"></ion-checkbox>
              </div>
            </div>
          </ion-accordion>
        </ion-accordion-group>
      </ion-list>

      <!-- Notifications -->
      <ion-list inset>
        <ion-list-header>
          <h3 class="section-title">Notifications</h3>
        </ion-list-header>

        <ion-item>
          <ion-label>Notifications push</ion-label>
          <ion-toggle justify="end" v-model="notifPush"></ion-toggle>
        </ion-item>

        <ion-item>
          <ion-label>Notifications email</ion-label>
          <ion-toggle justify="end" v-model="notifEmail"></ion-toggle>
        </ion-item>
      </ion-list>

      <!-- Autres -->
      <ion-list inset>
        <ion-list-header>
          <h3 class="section-title">Autres</h3>
        </ion-list-header>

        <ion-item button @click="goTo('Terms')">
          <ion-label>Termes & conditions</ion-label>
        </ion-item>

        <ion-item button @click="goTo('Privacy')">
          <ion-label>Politique de confidentialité</ion-label>
        </ion-item>
      </ion-list>

      <!-- Déconnexion -->
      <ion-button expand="block" @click="logout" class="logout-btn">
        Se déconnecter
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup>
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonCheckbox,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonAccordion,
  IonAccordionGroup,
  IonListHeader
} from "@ionic/vue";
import { PhArrowLeft } from "@phosphor-icons/vue";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { getAuth, signOut } from "firebase/auth";

const router = useRouter();

// Géolocalisation
const geoEnabled = ref(false);

// Utilisateurs bloqués fictifs
const blockedUsers = ref([
  { id: 1, name: "Alice", photoURL: "https://randomuser.me/api/portraits/women/8.jpg", isBlocked: true },
  { id: 2, name: "Bob", photoURL: "https://randomuser.me/api/portraits/men/4.jpg", isBlocked: true },
  { id: 3, name: "Charlie", photoURL: "https://randomuser.me/api/portraits/men/10.jpg", isBlocked: true },
]);

// Débloquer
const toggleBlock = (user) => {
  user.isBlocked = !user.isBlocked;
  console.log(`${user.name} est ${user.isBlocked ? "bloqué" : "débloqué"}`);
  if (!user.isBlocked) {
    blockedUsers.value = blockedUsers.value.filter((u) => u.isBlocked);
  }
};

// Navigation sur les items
const goTo = (routeName) => {
  console.log("Navigation vers", routeName);
  router.push({ name: routeName });
};

// Déconnexion
const logout = async () => {
  try {
    const auth = getAuth();
    await signOut(auth);
    router.push({ path: "/login" });
  } catch (err) {
    console.error("Erreur lors de la déconnexion :", err);
  }
};
</script>

<style scoped>
ion-toolbar {
  --color: var(--dark-blue);
}

ion-list {
  background: var(--beige);
  border-radius: 8px !important;
  border: 1px solid var(--dark-beige);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.section-title {
  font-family: 'Jakarta', sans-serif;
  font-weight: bold;
  font-size: 20px;
  color: var(--dark-blue);
  margin-bottom: 16px;
}

ion-item {
  --background: var(--beige);
  --color: var(--beige-pink);
  font-family: 'Jakarta', sans-serif;
  --border-style: none;
  margin-left: 16px;
}

ion-toggle {
  padding: 12px;

  --track-background: var(--dark-beige);
  --track-background-checked: var(--beige-pink);

  --handle-background: var(--dark-blue);
  --handle-background-checked: var(--yellow);

  --handle-width: 25px;
  --handle-height: 25px;
  --handle-max-height: auto;
  --handle-spacing: 6px;

  --handle-border-radius: 4px;
  --handle-box-shadow: none;
}

ion-toggle::part(track) {
  height: 10px;
  width: 60px;
  overflow: visible;
}

ion-accordion {
  background: var(--beige);
}

.blocked-users-list {
  background: var(--beige);
  font-family: 'Jakarta', sans-serif;
  font-size: 14px;
}

.empty-list {
  text-align: center;
  color: var(--dark-blue);
  font-family: 'Jakarta', sans-serif;
  font-size: 14px;
}

.modal-user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--beige);
  padding: 10px 16px;
  border-bottom: 1px solid var(--dark-beige);
}

.modal-user-card:last-child {
  border-bottom: none;
}

.modal-user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.modal-user-name {
  font-family: 'Jakarta', sans-serif;
  font-weight: 600;
  color: var(--dark-blue);
}

.logout-btn {
  --background: var(--yellow);
  --color: var(--dark-blue);
  margin: 20px;
  text-transform: none;
  --border-radius: 8px;
  font-weight: 600;
}
</style>
