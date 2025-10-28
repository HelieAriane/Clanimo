// backend/routes/notifications.js
import { Router } from 'express'
import { body, query, param, validationResult } from 'express-validator'
import mongoose from 'mongoose'
import Notification from '../models/Notification.js'
import DeviceToken from '../models/DeviceToken.js'
import { requireAuth } from '../middlewares/auth.js'
import { sendPushToUser } from '../services/push.js'

const router = Router()
const assertValid = (req) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const e = new Error('validation'); e.type = 'validation'
    e.details = errors.array().map(x => ({ field: x.path, msg: x.msg }))
    throw e
  }
}

/** --- Register / Unregister device tokens --- */
router.post('/register',
  requireAuth,
  body('token').isString().notEmpty(),
  body('platform').optional().isIn(['web','ios','android']),
  body('ua').optional().isString(),
  async (req, res) => {
    assertValid(req)
    const { token, platform = 'web', ua } = req.body
    await DeviceToken.updateOne(
      { token },
      { $set: { userId: req.user.uid, platform, ua, lastSeenAt: new Date() } },
      { upsert: true }
    )
    res.status(204).end()
  }
)

router.post('/unregister',
  requireAuth,
  body('token').optional().isString(),
  body('ua').optional().isString(),
  async (req, res) => {
    assertValid(req)
    const { token, ua } = req.body
    if (token) {
      await DeviceToken.deleteOne({ token })
    } else {
      const q = { userId: req.user.uid }
      if (ua) q.ua = ua
      await DeviceToken.deleteMany(q)
    }
    res.status(204).end()
  }
)

/** --- List & unread count --- */
router.get('/unread/count', requireAuth, async (req, res) => {
  const count = await Notification.countDocuments({ userId: req.user.uid, read: false })
  res.json({ count })
})

router.get('/',
  requireAuth,
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('cursor').optional().isISO8601(),
  async (req, res) => {
    assertValid(req)
    const limit = Number(req.query.limit || 20)
    const cursor = req.query.cursor ? new Date(req.query.cursor) : null

    const filter = { userId: req.user.uid }
    if (cursor) filter.createdAt = { $lt: cursor }

    const notifications = await Notification
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    const nextCursor = notifications.length ? notifications[notifications.length - 1].createdAt.toISOString() : null
    res.json({ notifications, nextCursor })
  }
)

/** --- Marquer en lot comme lues --- */
router.post('/mark-read',
  requireAuth,
  body('ids').isArray().withMessage('ids array'),
  async (req, res) => {
    assertValid(req)
    const ids = req.body.ids || []
    await Notification.updateMany(
      { _id: { $in: ids }, userId: req.user.uid },
      { $set: { read: true, readAt: new Date() } }
    )
    res.status(204).end()
  }
)

/** --- Marquer UNE notif comme lue (ce qui manque à ton front) --- */
router.post('/:id/read',
  requireAuth,
  param('id').isString().notEmpty(),
  async (req, res) => {
    assertValid(req)
    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'invalid_notification_id' })
    }

    const r = await Notification.updateOne(
      { _id: id, userId: req.user.uid },
      { $set: { read: true, readAt: new Date() } }
    )

    if (r.matchedCount === 0) {
      return res.status(404).json({ error: 'not_found' })
    }
    return res.status(204).end() // ← attendu par api.postNoContent
  }
)

/** --- Utilitaire interne pour créer et *pousser* une notification --- */
export async function createAndPushNotification(userId, payload) {
  const doc = await Notification.create({
    userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    data: payload.data || {},
  })

  // push FCM (best effort)
  await sendPushToUser(userId, {
    title: payload.title,
    body: payload.message,
    data: { click_action: payload.data?.link || '/' }
  }).catch(() => {})

  return doc
}

/** --- Endpoint de test (dev) --- */
router.post('/test',
  requireAuth,
  body('title').optional().isString(),
  body('message').optional().isString(),
  async (req, res) => {
    assertValid(req)
    const title = req.body.title || 'Test notification'
    const message = req.body.message || 'Hello from Pawfect Pack'
    const doc = await createAndPushNotification(req.user.uid, {
      type: 'test',
      title, message, data: { link: '/' }
    })
    res.json({ ok: true, notification: doc })
  }
)

// Supprimer une notification
router.delete('/:id',
  requireAuth,
  param('id').isString().notEmpty(),
  async (req, res) => {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'invalid_notification_id' })
    }
    const r = await Notification.deleteOne({ _id: id, userId: req.user.uid })
    if (r.deletedCount === 0) {
      return res.status(404).json({ error: 'not_found' })
    }
    res.status(204).end()
  }
)

// Supprimer toutes les notifications de l'utilisateur connecté
router.delete('/',
  requireAuth,
  async (req, res) => {
    const r = await Notification.deleteMany({ userId: req.user.uid })
    console.log(`${r.deletedCount} notifications supprimées`)
    res.status(204).end()
  }
)


export default router
