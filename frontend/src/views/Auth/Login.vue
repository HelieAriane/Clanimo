<!-- src/views/Auth/Login.vue -->
<template>
  <ion-page class="auth-page">
    <ion-header>
      <ion-toolbar>
        <img src="@/assets/image/logo-uni.svg" alt="Logo" class="logo" />
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-text>
        <h1 class="auth-title">Se connecter</h1>
      </ion-text>

      <!-- E-mail ou nom d'utilisateur -->
      <ion-input class="auth-input" placeholder="E-mail ou nom d'utilisateur" type="text" v-model="emailOrUsername"
        @keyup.enter="onSubmit" required />

      <!-- Mot de passe -->
      <ion-input class="auth-input" placeholder="Mot de passe" type="password" v-model="password"
        @keyup.enter="onSubmit" required>
        <ion-input-password-toggle slot="end"></ion-input-password-toggle>
      </ion-input>

      <router-link to="/forgot-password">
        <p class="auth-link">Mot de passe oublié ?</p>
      </router-link>

      <ion-text v-if="error" color="danger">
        <p style="margin-top: 8px">{{ error }}</p>
      </ion-text>

      <ion-button expand="block" class="auth-button" :disabled="loading" @click="onSubmit">
        Se connecter
      </ion-button>

      <p class="auth-subtext">Vous n'avez pas de compte ?</p>
      <router-link to="/register">
        <p class="auth-subtext">S'inscrire</p>
      </router-link>

      <ion-loading :is-open="loading" message="Connexion en cours..." />
      <ion-toast :is-open="toast.open" :message="toast.message" :color="toast.color" duration="2500"
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
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import '@/views/Auth/auth.css'

const router = useRouter()
const route = useRoute()
const { login } = useAuth()

const emailOrUsername = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const toast = ref({ open: false, message: '', color: 'success' as 'success' | 'danger' })

async function onSubmit() {
  error.value = ''
  const identifier = emailOrUsername.value.trim()
  const pwd = password.value

  if (!identifier || !pwd) {
    error.value = 'Veuillez saisir vos identifiants.'
    return
  }

  loading.value = true
  try {
    const email = await resolveEmail(identifier) // e-mail direct OU username (optionnel Firestore)
    await login(email, pwd)

    const redirect = (route.query.redirect as string) || '/tabs/meetups'
    toast.value = { open: true, message: 'Connexion réussie ✨', color: 'success' }
    router.replace(redirect)
  } catch (e: any) {
    error.value = e?.message || 'Connexion impossible. Vérifiez vos identifiants.'
  } finally {
    loading.value = false
  }
}

async function resolveEmail(input: string): Promise<string> {
  if (input.includes('@')) return input
  throw new Error("Veuillez saisir l'e-mail du compte.")
}
</script>