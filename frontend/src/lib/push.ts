// src/lib/push.ts
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging'
import { auth, app } from '@/lib/firebase'
import api from '@/lib/api'

type RegisterOptions = {
  // Callback pour les messages reçus quand l'app est au premier plan
  onForegroundMessage?: (payload: any) => void
}

let _messaging: Messaging | null = null
let _inFlight: Promise<string | null> | null = null
let _initialized = false

async function ensureMessaging() {
  if (!(await isSupported())) {
    console.warn('[Push] FCM non supporté par ce navigateur')
    return null
  }
  if (!_messaging) _messaging = getMessaging(app)
  return _messaging
}

// Renvoie true si on a déjà envoyé ce token au backend (memo localStorage)
function alreadySent(token: string) {
  return localStorage.getItem('pushToken') === token
}
function markSent(token: string) {
  localStorage.setItem('pushToken', token)
}

// Enregistre le SW + permission + token, puis envoie au backend. Idempotent.
export async function registerWebPushToken(opts: RegisterOptions = {}) {
  if (_inFlight) return _inFlight
  _inFlight = _register(opts).finally(() => {
    _inFlight = null
  })
  return _inFlight
}

async function _register(opts: RegisterOptions = {}): Promise<string | null> {
  const messaging = await ensureMessaging()
  if (!messaging) return null

  // il faut un utilisateur connecté
  const user = auth.currentUser
  if (!user) {
    console.debug('[Push] Ignoré: pas d’utilisateur connecté')
    return null
  }

  // 1) Service Worker prêt (évite des AbortError à l'init/HMR)
  if (!('serviceWorker' in navigator)) {
    console.warn('[Push] Service Worker non supporté')
    return null
  }

  // Enregistre si absent, puis attends qu'il soit prêt
  let swReg =
    (await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')) ||
    (await navigator.serviceWorker.register('/firebase-messaging-sw.js'))
  // S'assure qu'il est actif/contrôlant
  const ready = await navigator.serviceWorker.ready
  // Si l'URL ne correspond pas (ex: SW global), garde quand même la registration initiale
  swReg = swReg || (ready as ServiceWorkerRegistration)

  // 2) Permission notifications
  if (Notification.permission === 'denied') {
    console.warn('[Push] Permission notifications refusée')
    return null
  }
  if (Notification.permission === 'default') {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') {
      console.warn('[Push] Permission non accordée')
      return null
    }
  }

  // 3) Token FCM
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined
  if (!vapidKey) {
    console.error('[Push] VITE_FIREBASE_VAPID_KEY manquante dans .env')
    return null
  }

  let token: string | null = null
  try {
    token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg })
  } catch (e) {
    // En dev, il arrive que getToken échoue si le SW vient juste d'être rechargé
    console.error('[Push] getToken() a échoué', e)
    return null
  }
  if (!token) {
    console.warn('[Push] Aucun token récupéré')
    return null
  }
  console.debug('[Push] Token FCM:', token)

  // 4) Envoi backend (uniquement si nouveau token)
  if (!alreadySent(token)) {
    try {
      await api.post(
        '/notifications/register',
        { token, platform: 'web', ua: navigator.userAgent },
       
        { keepalive: true }
      )
      markSent(token)
    } catch (e: any) {
      // Les reload/HMR peuvent provoquer des AbortError: on ignore.
      if (e?.name === 'AbortError') {
        console.debug('[Push] Register aborté (page rechargée), on réessaiera plus tard.')
      } else {
        console.error('[Push] Envoi token backend échoué', e)
      }
    }
  } else {
    console.debug('[Push] Token déjà enregistré côté backend (skip)')
  }

  // 5) Écoute messages foreground (optionnel, une seule fois)
  if (opts.onForegroundMessage && !_initialized) {
    onMessage(messaging, (payload) => opts.onForegroundMessage!(payload))
    _initialized = true
  }

  return token
}

// Désinscription côté backend (best effort)
export async function unregisterWebPushToken() {
  const user = auth.currentUser
  if (!user) return
  try {
    await api.post(
      '/notifications/unregister',
      { ua: navigator.userAgent },
     
      { keepalive: true }
    )
  } catch {
    // no-op 
  }
}
