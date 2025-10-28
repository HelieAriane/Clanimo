import { ref, computed } from 'vue'
import { auth, authReady } from '@/lib/firebase'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  sendEmailVerification,
  type User
} from 'firebase/auth'

const currentUser = ref<User | null>(auth.currentUser)
const isReady = ref(false)
let started = false

function mapAuthError(code?: string) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password': return 'Identifiants invalides.'
    case 'auth/user-not-found': return "Aucun compte trouvé pour cet e-mail."
    case 'auth/email-already-in-use': return "Cet e-mail est déjà utilisé."
    case 'auth/weak-password': return "Mot de passe trop faible."
    case 'auth/too-many-requests': return 'Trop de tentatives, réessaie plus tard.'
    default: return 'Une erreur est survenue. Réessaie.'
  }
}

async function start() {
  if (started) return
  started = true
  await authReady
  onAuthStateChanged(auth, (u) => { currentUser.value = u; isReady.value = true })
}
start()

export function useAuth() {
  const isLoggedIn = computed(() => !!currentUser.value)
  const emailVerified = computed(() => currentUser.value?.emailVerified ?? false)

  async function login(email: string, password: string) {
    try { await authReady; return (await signInWithEmailAndPassword(auth, email, password)).user }
    catch (e: any) { throw new Error(mapAuthError(e.code)) }
  }

  async function register({ email, password, displayName }: { email: string; password: string; displayName?: string }) {
    try {
      await authReady
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      if (displayName) await updateProfile(cred.user, { displayName })
      await sendEmailVerification(cred.user)
      return cred.user
    } catch (e: any) { throw new Error(mapAuthError(e.code)) }
  }

  async function resetPassword(email: string) {
    try { await authReady; await sendPasswordResetEmail(auth, email) }
    catch (e: any) { throw new Error(mapAuthError(e.code)) }
  }

  async function logout() { await signOut(auth) }

  return { currentUser, isReady, isLoggedIn, emailVerified, login, register, resetPassword, logout }
}
