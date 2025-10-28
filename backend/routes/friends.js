// backend/routes/friends.js
import { Router } from 'express'
import { param, validationResult } from 'express-validator'
import FriendRequest from '../models/FriendRequest.js'
import User from '../models/User.js'
import { requireAuth } from '../middlewares/auth.js'
import {
  notifyFriendRequest,
  notifyFriendAccept,
  notifyFriendDecline
} from '../services/notify.js'
// (Facultatif) Push ciblées – garde l’import si tu t’en sers ailleurs
// import { sendPushToUser } from '../services/push.js'

const router = Router()

const assertValid = (req) => {
  const e = validationResult(req)
  if (!e.isEmpty()) {
    const err = new Error('validation')
    err.type = 'validation'
    err.details = e.array()
    throw err
  }
}

// Petite projection pour renvoyer uniquement les champs utiles côté front
const FRIEND_PROJECTION = {
  _id: 1,
  username: 1,
  name: 1,
  avatarURL: 1,
  bio: 1, 
  dogs: 1,
  enLigne: 1,
  district: 1,
}

/**
 * GET /friends
 * Liste des amis de l’utilisateur courant (profils minimum)
 */
router.get('/',
  requireAuth,
  async (req, res) => {
    const me = await User.findById(req.user.uid, { friends: 1 }).lean()
    const ids = me?.friends || []
    if (!ids.length) return res.json({ friends: [] })

    const users = await User.find({ _id: { $in: ids } }, FRIEND_PROJECTION).lean()

    // Option: amis en ligne en premier, puis tri alpha
    users.sort((a, b) => {
      const aOn = a.enLigne ? 1 : 0
      const bOn = b.enLigne ? 1 : 0
      if (bOn - aOn !== 0) return bOn - aOn
      const an = (a.name || a.username || '').toString()
      const bn = (b.name || b.username || '').toString()
      return an.localeCompare(bn, 'fr', { sensitivity: 'base' })
    })

    res.json({ friends: users })
  }
)

// Alias pratique
router.get('/list', requireAuth, async (req, res) => {
  const me = await User.findById(req.user.uid, { friends: 1 }).lean()
  const ids = me?.friends || []
  if (!ids.length) return res.json({ friends: [] })
  const users = await User.find({ _id: { $in: ids } }, FRIEND_PROJECTION).lean()
  res.json({ friends: users })
})

/**
 * POST /friends/requests/:toUid
 * Créer une demande d’ami (idempotent).
 * - Si une demande existe (dans n’importe quel sens) et est "pending" → 409
 * - Si "accepted"/"declined" → réactive en "pending" dans le sens courant
 * - Sinon crée la demande
 */
router.post('/requests/:toUid',
  requireAuth,
  param('toUid').isString().notEmpty(),
  async (req, res) => {
    assertValid(req)
    const from = req.user.uid
    const to   = req.params.toUid

    if (from === to) return res.status(400).json({ error: 'cannot_friend_self' })

    const [uFrom, uTo] = await Promise.all([
      User.findById(from, { friends: 1 }).lean(),
      User.findById(to,   { _id: 1 }).lean()
    ])
    if (!uTo) return res.status(404).json({ error: 'user_not_found' })
    if (uFrom?.friends?.includes(to)) return res.status(409).json({ error: 'already_friends' })

    // Cherche une demande EXISTANTE dans les deux sens
    let fr = await FriendRequest.findOne({
      $or: [
        { fromUserId: from, toUserId: to },
        { fromUserId: to,   toUserId: from }
      ]
    })

    if (fr) {
      if (fr.status === 'pending') {
        const inverse = fr.fromUserId !== from
        return res.status(409).json({
          error: inverse ? 'inverse_request_pending' : 'request_exists',
          requestId: fr._id,
          fromUserId: fr.fromUserId,
          toUserId: fr.toUserId,
          status: fr.status
        })
      }

      // Réactive la demande (accepted/declined -> pending) dans le sens courant
      fr.fromUserId = from
      fr.toUserId   = to
      fr.status     = 'pending'
      await fr.save()

      // 🔔 notif
      notifyFriendRequest({ fromUserId: from, toUserId: to, requestId: fr._id }).catch(console.error)

      return res.status(200).json({ request: fr.toObject(), reactivated: true })
    }

    // Aucune demande → crée (et gère 11000)
    try {
      fr = await FriendRequest.create({ fromUserId: from, toUserId: to })
      notifyFriendRequest({ fromUserId: from, toUserId: to, requestId: fr._id }).catch(console.error)
      return res.status(201).json({ request: fr.toObject() })
    } catch (err) {
      if (err?.code === 11000) {
        const again = await FriendRequest.findOne({ fromUserId: from, toUserId: to }).lean()
        return res.status(409).json({
          error: 'request_exists',
          requestId: again?._id || null
        })
      }
      throw err
    }
  }
)

/**
 * GET /friends/@me/requests/incoming
 * Liste des demandes entrantes "pending"
 */
router.get('/@me/requests/incoming',
  requireAuth,
  async (req, res) => {
    const uid = req.user.uid
    const list = await FriendRequest.find({ toUserId: uid, status: 'pending' })
      .sort({ createdAt: -1 })
      .lean()
    res.json({ requests: list })
  }
)

/**
 * GET /friends/@me/requests/outgoing
 * Liste des demandes sortantes "pending"
 */
router.get('/@me/requests/outgoing',
  requireAuth,
  async (req, res) => {
    const uid = req.user.uid
    const list = await FriendRequest.find({ fromUserId: uid, status: 'pending' })
      .sort({ createdAt: -1 })
      .lean()
    res.json({ requests: list })
  }
)

/**
 * POST /friends/requests/:reqId/accept
 * Accepter une demande reçue
 */
router.post('/requests/:reqId/accept',
  requireAuth,
  param('reqId').isString().notEmpty(),
  async (req, res) => {
    assertValid(req)
    const reqId = req.params.reqId

    const fr = await FriendRequest.findOneAndUpdate(
      { _id: reqId, toUserId: req.user.uid, status: 'pending' },
      { $set: { status: 'accepted' } },
      { new: true }
    )
    if (!fr) return res.status(404).json({ error: 'request_not_found' })

    // Ajoute l’ami des 2 côtés
    await User.updateOne({ _id: fr.fromUserId }, { $addToSet: { friends: fr.toUserId } })
    await User.updateOne({ _id: fr.toUserId },   { $addToSet: { friends: fr.fromUserId } })

    // 🔔 notif (prévenir l’émetteur initial)
    notifyFriendAccept({ fromUserId: fr.fromUserId, toUserId: fr.toUserId }).catch(console.error)

    res.json({ request: fr.toObject() })
  }
)

/**
 * POST /friends/requests/:reqId/decline
 * Refuser une demande (par l’un des deux acteurs)
 */
router.post('/requests/:reqId/decline',
  requireAuth,
  param('reqId').isString().notEmpty(),
  async (req, res) => {
    assertValid(req)
    const reqId = req.params.reqId

    const fr = await FriendRequest.findOneAndUpdate(
      {
        _id: reqId,
        $or: [
          { toUserId: req.user.uid },
          { fromUserId: req.user.uid }
        ],
        status: 'pending'
      },
      { $set: { status: 'declined' } },
      { new: true }
    )
    if (!fr) return res.status(404).json({ error: 'request_not_found' })

    // 🔔 notif (prévenir le demandeur)
    notifyFriendDecline({ fromUserId: fr.fromUserId, toUserId: fr.toUserId }).catch(console.error)

    res.json({ request: fr.toObject() })
  }
)

/**
 * DELETE /friends/:friendUid
 * Retirer un ami (symétrique)
 */
router.delete('/:friendUid',
  requireAuth,
  param('friendUid').isString().notEmpty(),
  async (req, res) => {
    assertValid(req)
    const a = req.user.uid
    const b = req.params.friendUid

    await User.updateOne({ _id: a }, { $pull: { friends: b } })
    await User.updateOne({ _id: b }, { $pull: { friends: a } })

    res.status(204).end()
  }
)

export default router
