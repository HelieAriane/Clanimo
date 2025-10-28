// src/lib/firebase.ts
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  indexedDBLocalPersistence,
  setPersistence,
  onAuthStateChanged,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

export const firebaseConfig = {
  apiKey:             import.meta.env.VITE_FIREBASE_API_KEY!,
  authDomain:         import.meta.env.VITE_FIREBASE_AUTH_DOMAIN!,
  projectId:          import.meta.env.VITE_FIREBASE_PROJECT_ID!,
  storageBucket:      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId:  import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID!,
  appId:              import.meta.env.VITE_FIREBASE_APP_ID!,
  measurementId:      import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Aide dev: avertir si le bucket n’est pas correct
if (import.meta.env.DEV) {
  const b = String(firebaseConfig.storageBucket || '')
  if (b && !b.endsWith('.appspot.com')) {
    console.warn('[Firebase] VITE_FIREBASE_STORAGE_BUCKET doit se terminer par ".appspot.com". Valeur actuelle:', b)
  }
}

export const app  = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db   = getFirestore(app)

// Persistance robuste Web/Capacitor
export const authReady = setPersistence(auth, indexedDBLocalPersistence).catch(() => null)

// Helpers DEV: exposer auth + token
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // @ts-ignore
  window.__auth = auth
  onAuthStateChanged(auth, async (u) => {
    try {
      // @ts-ignore
      window.__token = u ? await u.getIdToken(true) : null
    } catch {
      // @ts-ignore
      window.__token = null
    }
  })
}

export { app as default }
