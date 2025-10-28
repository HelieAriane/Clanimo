// backend/routes/devices.js
import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import { requireAuth } from '../middlewares/auth.js'
import Device from '../models/Device.js'
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

// POST /devices  { token, platform? }
router.post('/',
  requireAuth,
  body('token').isString().isLength({ min: 10 }),
  body('platform').optional().isIn(['ios','android','web','unknown']),
  async (req, res) => {
    assertValid(req)
    const { token, platform = 'unknown' } = req.body
    const userId = req.user.uid

    // upsert par token (unique global)
    const doc = await Device.findOneAndUpdate(
      { token },
      { $set: { userId, platform, lastSeenAt: new Date(), disabled: false } },
      { upsert: true, new: true }
    )
    res.status(201).json({ device: doc })
  }
)

// GET /devices
router.get('/', requireAuth, async (req, res) => {
  const userId = req.user.uid
  const devices = await Device.find({ userId }).sort({ updatedAt: -1 }).lean()
  res.json({ devices })
})

// DELETE /devices/:id
router.delete('/:id',
  requireAuth,
  param('id').isString().notEmpty(),
  async (req, res) => {
    assertValid(req)
    const userId = req.user.uid
    const d = await Device.findOneAndDelete({ _id: req.params.id, userId })
    if (!d) return res.status(404).json({ error: 'device_not_found' })
    res.status(204).end()
  }
)

// POST /devices/:id/test  → envoie un push de test au user (tous ses devices)
router.post('/:id/test',
  requireAuth,
  param('id').isString().notEmpty(),
  async (req, res) => {
    assertValid(req)
    const userId = req.user.uid
    const one = await Device.findOne({ _id: req.params.id, userId }).lean()
    if (!one) return res.status(404).json({ error: 'device_not_found' })

    const r = await sendPushToUser(userId, {
      title: 'Test notification',
      body: 'Votre configuration FCM fonctionne !',
      data: { kind: 'test' }
    })
    res.json({ result: r })
  }
)

export default router
