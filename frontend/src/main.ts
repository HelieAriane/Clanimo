// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import { IonicVue } from '@ionic/vue'

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css'
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/float-elements.css'
import '@ionic/vue/css/text-alignment.css'
import '@ionic/vue/css/text-transformation.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'
import '@ionic/vue/css/palettes/dark.system.css'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'


/* Theme variables */
import './theme/variables.css'

/* 🔔 FCM */
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './lib/firebase'
import { registerWebPushToken, unregisterWebPushToken } from './lib/push'

/** (facultatif) logs globaux pour déboguer en dev */
if (import.meta.env.DEV) {
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[unhandledrejection]', e.reason ?? e)
  })
  window.addEventListener('error', (e) => {
    console.error('[uncaughtException]', e.error ?? e.message)
  })
}

const app = createApp(App).use(IonicVue).use(router)

/**
 * Évite les doubles inscriptions: certaines intégrations déclenchent
 * plusieurs transitions d’état auth rapidement.
 */
let hasRegisteredFCM = false

/** 🔐 Après login → on enregistre le token FCM ; avant logout → on le désinscrit */
onAuthStateChanged(auth, async (user) => {
  try {
    if (user) {
      // Si le navigateur n’a pas de SW/Notifications, registerWebPushToken renverra null sans casser
      const token = await registerWebPushToken({
        onForegroundMessage: (payload) => {
          // Ici tu peux afficher un toast/badge dans l’app
          console.log('[FCM foreground]', payload)
        },
      })
      hasRegisteredFCM = Boolean(token)
    } else {
      // Best-effort côté backend pour nettoyer les tokens liés à cet UA
      if (hasRegisteredFCM) {
        await unregisterWebPushToken().catch(() => {})
        hasRegisteredFCM = false
      }
    }
  } catch (err) {
    console.error('[FCM] registration flow failed', err)
  }
})

router.isReady().then(() => {
  app.mount('#app')
})
