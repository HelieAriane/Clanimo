import admin from 'firebase-admin'

let appInitialized = false

if (!admin.apps?.length) {
  // Méthode A : GOOGLE_APPLICATION_CREDENTIALS = chemin du fichier JSON
  // Méthode B : FIREBASE_SERVICE_ACCOUNT_BASE64 = contenu JSON encodé base64
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
  if (b64) {
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))
    admin.initializeApp({
      credential: admin.credential.cert(json)
    })
    appInitialized = true
  } else {
    // Essaie via GOOGLE_APPLICATION_CREDENTIALS (ou ADC)
    admin.initializeApp()
    appInitialized = true
  }
}

if (appInitialized) {
  console.log('[FirebaseAdmin] Initialized')
}

export default admin
