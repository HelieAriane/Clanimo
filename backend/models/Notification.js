// backend/models/Notification.js
import mongoose from 'mongoose'
const { Schema } = mongoose

const NotificationSchema = new Schema({
  userId:   { type: String, required: true, index: true },
  type:     { type: String, required: true, trim: true }, // volontairement sans enum pour rester extensible
  title:    { type: String, required: true, trim: true },
  message:  { type: String, default: '', trim: true },
  data:     { type: Schema.Types.Mixed, default: {} },
  read:     { type: Boolean, default: false, index: true },
  expiresAt:{ type: Date, default: null } // utilisé uniquement si TTL activé
}, { timestamps: true })

//Index conseillés

/*
 * 1) Compteur d’“unread” + liste récente :
 *    - Compteur rapide: { userId, read:false }
 *    - Listing paginé par ordre inverse: createdAt desc
 */
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 })

/*
 * 2) Listing général par utilisateur (même si déjà lu) :
 */
NotificationSchema.index({ userId: 1, createdAt: -1 })

/*
 * 3) Filtre par type (utile si l’UI segmente par catégorie) :
 */
NotificationSchema.index({ userId: 1, type: 1, createdAt: -1 })

/*
 * TTL optionnel (purge auto)
 * Activez en définissant NOTIF_TTL_DAYS (>0) dans l’environnement.
 * Exemple: NOTIF_TTL_DAYS=30  → purge automatique ~30j après création.
 */
const ttlDays = Number(process.env.NOTIF_TTL_DAYS || 0)
if (ttlDays > 0) {
  // index TTL (expire à expiresAt, expireAfterSeconds=0 => expire exactement à la date)
  NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

  // Assigne expiresAt si absent, basé sur createdAt
  NotificationSchema.pre('save', function (next) {
    if (!this.expiresAt) {
      const base = this.createdAt || new Date()
      const exp = new Date(base)
      exp.setDate(exp.getDate() + ttlDays)
      this.expiresAt = exp
    }
    next()
  })
}

//Helpers (facultatif mais pratique)

/** Marquer toutes les notifs d’un user comme lues */
NotificationSchema.statics.markAllReadFor = function (userId) {
  return this.updateMany({ userId, read: false }, { $set: { read: true } })
}

/** Marquer une notification comme lue (sécurisé par userId) */
NotificationSchema.statics.markOneRead = function (userId, notifId) {
  return this.updateOne({ _id: notifId, userId }, { $set: { read: true } })
}

export default mongoose.model('Notification', NotificationSchema)
