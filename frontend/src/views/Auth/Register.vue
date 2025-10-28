<!-- src/views/Auth/Register.vue -->
<template>
  <ion-page class="auth-page">
    <ion-header>
      <ion-toolbar>
        <img src="@/assets/image/logo-uni.svg" alt="Logo" class="logo" />
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-text>
        <h1 class="auth-title">Créer un compte</h1>
      </ion-text>

      <!-- Nom d'utilisateur -->
      <ion-input class="auth-input" placeholder="Nom" type="text" v-model="name" @keyup.enter="onSubmit" required />

      <!-- Adresse courriel -->
      <ion-input class="auth-input" placeholder="Adresse courriel" type="email" v-model="email" @keyup.enter="onSubmit"
        required />

      <!-- Mot de passe -->
      <ion-input class="auth-input" placeholder="Mot de passe" type="password" v-model="password"
        @keyup.enter="onSubmit" required>
        <ion-input-password-toggle slot="end"></ion-input-password-toggle>
      </ion-input>

      <ion-text v-if="error" color="danger">
        <p style="margin-top:8px">{{ error }}</p>
      </ion-text>

      <ion-button expand="block" class="auth-button" :disabled="loading" @click="onSubmit">
        S'inscrire
      </ion-button>

      <p class="auth-subtext">Vous avez déjà un compte ?</p>
      <router-link to="/login">
        <p class="auth-subtext">Se connecter</p>
      </router-link>

      <ion-loading :is-open="loading" message="Création du compte..." />
      <ion-toast :is-open="toast.open" :message="toast.message" :color="toast.color" duration="3000"
        @didDismiss="toast.open = false" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
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
} from '@ionic/vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import '@/views/Auth/auth.css'

const router = useRouter()
const { register } = useAuth()

const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const toast = ref({ open: false, message: '', color: 'success' as 'success' | 'danger' })

async function onSubmit() {
  error.value = ''

  const uname = name.value.trim()
  const mail = email.value.trim()
  const pwd = password.value

  if (!uname || !mail || !pwd) {
    error.value = 'Veuillez remplir tous les champs.'
    return
  }
  if (uname.length < 3) {
    error.value = "Le nom d'utilisateur doit contenir au moins 3 caractères."
    return
  }
  if (pwd.length < 6) {
    error.value = 'Le mot de passe doit contenir au moins 6 caractères.'
    return
  }

  loading.value = true
  try {
    const user = await register({ email: mail, password: pwd, displayName: uname })

    toast.value = {
      open: true,
      message: "Compte créé ! Vérifie l'e-mail de validation avant de te connecter.",
      color: 'success',
    }
    setTimeout(() => router.push({ name: 'ProfileForm' }), 300)
  } catch (e: any) {
    error.value = e?.message || "Impossible de créer le compte."
  } finally {
    loading.value = false
  }
}
</script>