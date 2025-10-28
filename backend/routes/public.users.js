// backend/routes/public.users.js
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import User from '../models/User.js'

const router = Router()

// Limite agressive car endpoint public
const limiter = rateLimit({ windowMs: 60 * 1000, max: 30 })

/**
 * GET /api/v1/public/users?ids=a,b,c
 * Récupère des profils publics (safe) pour une liste d'IDs.
 * Ne renvoie jamais d'email ou champs sensibles.
 */
router.get('/users', limiter, async (req, res) => {
  const idsParam = typeof req.query.ids === 'string' ? req.query.ids.trim() : ''
  if (!idsParam) {
    return res.status(400).json({ error: 'missing_ids', message: 'query param ids=a,b,c requis' })
  }

  // Normalisation basique
  let ids = idsParam
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  // Unicité + limite raisonnable
  ids = Array.from(new Set(ids)).slice(0, 100)

  if (ids.length === 0) {
    return res.status(400).json({ error: 'empty_ids' })
  }

  // Projection "safe"
  const projection = { _id: 1, name: 1, username: 1, avatarURL: 1, district: 1, enLigne: 1 }

  const docs = await User.find({ _id: { $in: ids } }, projection).lean()

  // Map par id pour accès rapide côté front
  const usersById = {}
  for (const u of docs) usersById[String(u._id)] = u

  // On renvoie à la fois la liste et la map (compatibilité maximale)
  res.json({ users: docs, usersById })
})

/**
 * GET /api/v1/public/users/availability?username=&email=
 * Vérifie la disponibilité d'un username et/ou email.
 */
router.get('/users/availability', limiter, async (req, res) => {
  const { username, email } = req.query
  const availability = {}

  if (typeof username === 'string' && username.trim()) {
    const doc = await User.findOne(
      { username: new RegExp(`^${username}$`, 'i') },
      { _id: 1 }
    ).lean()
    availability.usernameAvailable = !doc
  }

  if (typeof email === 'string' && email.trim()) {
    const e = String(email).toLowerCase()
    const doc = await User.findOne({ email: e }, { _id: 1 }).lean()
    availability.emailAvailable = !doc
  }

  if (!('usernameAvailable' in availability) && !('emailAvailable' in availability)) {
    return res.status(400).json({ error: 'missing_params', message: 'username or email required' })
  }

  res.json({ availability })
})

export default router
