<!-- src/views/Auth/ForgotPassword.vue -->
<template>
  <ion-page class="auth-page">
    <ion-header>
      <ion-toolbar>
        <img src="@/assets/image/logo-uni.svg" alt="Logo" class="logo" />
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-text>
        <h1 class="auth-title">Mot de passe oublié</h1>
        <p class="auth-p">
          Entrez votre courriel (ou votre nom d'utilisateur si activé) et nous
          vous enverrons des instructions pour réinitialiser votre mot de passe.
        </p>
      </ion-text>

      <p class="auth-soustitre">Courriel ou nom d'utilisateur</p>

      <ion-input class="auth-input" placeholder="ex: jean.dupont@email.com" type="text" v-model="emailOrUsername"
        @keyup.enter="sendReset" required />

      <ion-text v-if="error" color="danger">
        <p style="margin-top:8px">{{ error }}</p>
      </ion-text>

      <ion-button expand="block" class="auth-button" :disabled="loading" @click="sendReset">
        Envoyer
      </ion-button>

      <ion-button expand="block" class="back-button" fill="clear" @click="gotoLogin">
        Retour à la connexion
      </ion-button>

      <ion-loading :is-open="loading" message="Envoi en cours..." />
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
const { resetPassword } = useAuth()

const emailOrUsername = ref('')
const loading = ref(false)
const error = ref('')
const toast = ref({ open: false, message: '', color: 'success' as 'success' | 'danger' })

async function sendReset() {
  error.value = ''
  const input = emailOrUsername.value.trim()
  if (!input) {
    error.value = 'Veuillez saisir votre e-mail.'
    return
  }

  loading.value = true
  try {
    const email = await resolveEmail(input)
    await resetPassword(email)
    toast.value = {
      open: true,
      message: "E-mail de réinitialisation envoyé. Vérifiez votre boîte de réception.",
      color: 'success',
    }
  } catch (e: any) {
    error.value = e?.message || "Impossible d'envoyer l'e-mail de réinitialisation."
  } finally {
    loading.value = false
  }
}

function gotoLogin() {
  router.push({ name: 'login' })
}

async function resolveEmail(input: string): Promise<string> {
  if (input.includes('@')) return input
  throw new Error("La réinitialisation nécessite l'e-mail du compte.")
}
</script>