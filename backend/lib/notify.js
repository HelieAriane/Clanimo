// lib/notify.js
import Notification from '../models/Notification.js'
import DeviceToken from '../models/DeviceToken.js'
import admin from '../config/firebaseAdmin.js' // doit exporter l'instance Firebase Admin initialisée

/**
 * Envoie des pushs FCM à tous les devices du user.
 * - Si FCM n’est pas configuré, on ignore silencieusement.
 * - Nettoyage des tokens invalides.
 */
async function sendPushToUser(userId, { title, body, data = {}, android = {}, apns = {}, webpush = {} }) {
  try {
    if (!admin?.messaging) return
    const tokens = await DeviceToken.find({ userId }).distinct('token')
    if (!tokens.length) return

    const message = {
      tokens,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])
      ),
      android,
      apns,
      webpush,
    }

    const resp = await admin.messaging().sendEachForMulticast(message)

    // Nettoyage tokens invalides
    const toDelete = []
    resp.responses.forEach((r, idx) => {
      if (!r.success) {
        const err = r.error
        const code = err?.errorInfo?.code || err?.code || ''
        if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
          toDelete.push(tokens[idx])
        }
      }
    })
    if (toDelete.length) {
      await DeviceToken.deleteMany({ token: { $in: toDelete } })
    }
  } catch (e) {
    // on ne fait pas échouer la requête API pour un push raté
    console.error('[notify] sendPushToUser error:', e?.message || e)
  }
}

/**
 * Crée une notification en base et déclenche un push FCM (best-effort).
 * @param {Object} p
 * @param {string} p.userId (destinataire)
 * @param {string} p.type   (clé métier)
 * @param {string} p.title
 * @param {string} p.message
 * @param {Object} [p.data]
 * @param {number} [p.ttlHours] - si fourni, supprime auto via TTL index (expiresAt)
 */
export async function createNotification({ userId, type, title, message, data = {}, ttlHours }) {
  const payload = { userId, type, title, message, data, read: false }
  if (ttlHours && Number.isFinite(ttlHours)) {
    payload.expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000)
  }
  const n = await Notification.create(payload)

  // Envoi push (best-effort)
  await sendPushToUser(userId, {
    title,
    body: message,
    data: { type, ...data, notificationId: String(n._id) },
    // Optionnel: ajoute des options android/apns/webpush si besoin
  })

  return n
}
