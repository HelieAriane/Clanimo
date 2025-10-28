import admin from 'firebase-admin'
import DeviceToken from '../models/DeviceToken.js'

//Envoie un push à tous les tokens du user. Nettoie ceux qui sont invalides
export async function sendPushToUser(userId, notif) {
  // notif: { title, body, data? }
  const tokens = await DeviceToken.find({ userId }).lean()
  if (!tokens.length) return { success: 0, failure: 0 }

  const message = {
    notification: { title: notif.title, body: notif.body },
    data: Object.fromEntries(Object.entries(notif.data || {}).map(([k, v]) => [k, String(v)])),
    tokens: tokens.map(t => t.token),
  }

  const res = await admin.messaging().sendEachForMulticast(message)

  // suppression des tokens invalides
  const toDelete = []
  res.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code || ''
      if (code.includes('invalid-argument') || code.includes('registration-token-not-registered')) {
        toDelete.push(tokens[i].token)
      }
    }
  })
  if (toDelete.length) {
    await DeviceToken.deleteMany({ token: { $in: toDelete } })
  }

  return { success: res.successCount, failure: res.failureCount }
}
