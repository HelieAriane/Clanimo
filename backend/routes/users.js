// backend/routes/users.js
import { Router } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import User from '../models/User.js'
import { requireAuth } from '../middlewares/auth.js'

const router = Router()

const assertValid = (req) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const e = new Error('validation'); e.type = 'validation'
    e.details = errors.array().map(x => ({ field: x.path, msg: x.msg }))
    throw e
  }
}
const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Helper
function ensureUsername(u, fallbackId) {
  if (!u.username || String(u.username).trim() === '') {
    u.username = `user_${String(fallbackId).slice(0, 8)}`
  }
}

//Normalisation avatar : toujours exposer `avatarURL` (fallback `avatar`) et masquer l’ancien champ
function normalizeAvatarOut(doc) {
  if (!doc) return doc
  const u = doc.toObject ? doc.toObject() : { ...doc }
  if (!u.avatarURL && u.avatar) u.avatarURL = u.avatar
  delete u.avatar
  return u
}

// Projection “light” pour le front
const FRIEND_PROJECTION = {
  _id: 1,
  username: 1,
  name: 1,
  avatarURL: 1,
  enLigne: 1,
  district: 1,
}

// RECHERCHE + DISPONIBILITÉ
router.get('/search',
  requireAuth,
  query('email').optional().isString().trim(),
  query('username').optional().isString().trim(),
  query('q').optional().isString().trim(),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  async (req, res) => {
    assertValid(req)
    const { email, username, q } = req.query
    const limit = parseInt(req.query.limit ?? '10', 10)

    const filter = {}
    const or = []

    if (email) filter.email = String(email).toLowerCase()
    if (username) {
      or.push({ username: { $regex: `^${escapeRegExp(username)}$`, $options: 'i' } })
    }

    if (q && !email && !username) {
      const s = String(q).trim()
      if (s.includes('@')) {
        filter.email = s.toLowerCase()
      } else {
        or.push(
          { username: { $regex: `^${escapeRegExp(s)}$`, $options: 'i' } },
          { name: { $regex: escapeRegExp(s), $options: 'i' } }
        )
      }
    }

    const finalFilter = or.length ? { $and: [filter, { $or: or }] } : filter

    const usersRaw = await User.find(
      finalFilter,
      { _id: 1, name: 1, username: 1, avatarURL: 1, avatar: 1, district: 1 } // ← inclure avatar pour fallback
    )
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    const users = usersRaw.map(normalizeAvatarOut)
    return res.json({ users })
  }
)

router.get('/availability',
  requireAuth,
  query('username').optional().isString().trim(),
  query('email').optional().isString().trim().isEmail().withMessage('email invalide'),
  async (req, res) => {
    assertValid(req)
    const { username, email } = req.query

    let usernameAvailable
    let emailAvailable

    if (username) {
      const rx = new RegExp(`^${escapeRegExp(username)}$`, 'i')
      const hit = await User.findOne({ username: { $regex: rx } }, { _id: 1 }).lean()
      usernameAvailable = !hit
    }

    if (email) {
      const e = String(email).toLowerCase()
      const hit = await User.findOne({ email: e }, { _id: 1 }).lean()
      emailAvailable = !hit
    }

    return res.json({ availability: { usernameAvailable, emailAvailable } })
  }
)

// PROFIL COURANT : /users/@me
router.get('/@me', requireAuth, async (req, res) => {
  const u = await User.findById(req.user.uid).lean()
  if (!u) return res.status(404).json({ error: 'not_found' })
  // ← normaliser l’avatar (fallback + suppression de l’ancien champ)
  const out = normalizeAvatarOut(u)
  res.json({ user: out }) // on peut renvoyer l'email à l’utilisateur lui-même
})

router.put('/@me',
  requireAuth,
  body('name').optional().isString().trim().isLength({ min: 2 }),
  body('username').optional().isString().trim().isLength({ min: 2 }),
  body('bio').optional().isString(),
  body('district').optional().isString(),
  body('avatarURL').optional().isString(),
  body('avatar').optional().isString(), // ← accepte aussi `avatar`
  body('phone').optional().isString(),
  body('email').optional().isString().isLength({ min: 3 }).bail().isEmail().withMessage('email invalide'),
  body('dogs').optional().isArray(), // autorise l’update massif
  async (req, res, next) => {
    try {
      assertValid(req)
      let user = await User.findById(req.user.uid)
      if (!user) {
        user = new User({ _id: req.user.uid, name: req.body.name ?? 'Utilisateur' })
        ensureUsername(user, req.user.uid)
      }

      // Fallback entrée : si `avatar` fourni sans `avatarURL`, on mappe
      if (typeof req.body.avatar === 'string' && !req.body.avatarURL) {
        req.body.avatarURL = req.body.avatar
      }

      const fields = ['name','username','bio','district','avatarURL','phone','email','dogs']
      for (const f of fields) {
        if (f in req.body) {
          user[f] = (f === 'email' && typeof req.body[f] === 'string')
            ? req.body[f].toLowerCase().trim()
            : req.body[f]
        }
      }
      ensureUsername(user, req.user.uid)

      await user.save()
      const out = normalizeAvatarOut(user)
      return res.json({ user: out })
    } catch (err) {
      if (err && err.code === 11000) {
        if (err.keyPattern?.email)    return res.status(409).json({ error: 'email_taken' })
        if (err.keyPattern?.username) return res.status(409).json({ error: 'username_taken' })
      }
      return next(err)
    }
  }
)

// Statut en ligne (utilisé par Home.vue)
router.put('/@me/status',
  requireAuth,
  body('enLigne').isBoolean(),
  async (req, res) => {
    assertValid(req)
    const u = await User.findByIdAndUpdate(
      req.user.uid,
      { $set: { enLigne: !!req.body.enLigne } },
      { new: true, upsert: true }
    )
    ensureUsername(u, req.user.uid)
    await u.save()
    const out = normalizeAvatarOut(u)
    res.json({ user: out })
  }
)

// Amis (@me + public)

// Liste des amis de l’utilisateur courant
router.get('/@me/friends',
  requireAuth,
  async (req, res) => {
    const me = await User.findById(req.user.uid, { friends: 1 }).lean()
    const ids = me?.friends || []
    if (!ids.length) return res.json({ friends: [] })

    const usersRaw = await User.find({ _id: { $in: ids } }, { ...FRIEND_PROJECTION, avatar: 1 }).lean()
    const users = usersRaw.map(normalizeAvatarOut)

    // en ligne d’abord, puis tri alpha
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

// Liste des amis d’un utilisateur (profil public)
router.get('/:id/friends',
  requireAuth,
  param('id').isString().notEmpty(),
  async (req, res) => {
    assertValid(req)
    const u = await User.findById(req.params.id, { friends: 1 }).lean()
    if (!u) return res.status(404).json({ error: 'not_found' })
    const ids = u.friends || []
    if (!ids.length) return res.json({ friends: [] })
    const usersRaw = await User.find({ _id: { $in: ids } }, { ...FRIEND_PROJECTION, avatar: 1 }).lean()
    const users = usersRaw.map(normalizeAvatarOut)
    res.json({ friends: users })
  }
)

// ROUTES PARAMÉTRIQUES : /:id (GET/PUT SAFE PUBLIC)
router.get('/:id', async (req, res) => {
  const { id } = req.params
  if (!id) return res.status(400).json({ error: 'missing_id' })

  // Projection "safe" : champs publics uniquement + dogs
  const projection = {
    _id: 1,
    name: 1,
    username: 1,
    bio: 1,
    avatarURL: 1,
    avatar: 1,
    district: 1,
    dogs: 1
  }

  const userRaw = await User.findById(id, projection).lean()
  if (!userRaw) return res.status(404).json({ error: 'not_found' })

  // Normalisation avatar principal
  if (!userRaw.avatarURL && userRaw.avatar) userRaw.avatarURL = userRaw.avatar
  delete userRaw.avatar

  // Normalisation avatars des chiens
  if (Array.isArray(userRaw.dogs)) {
    userRaw.dogs = userRaw.dogs.map(d => {
      if (!d) return d
      if (!d.avatarURL && d.avatar) d.avatarURL = d.avatar
      delete d.avatar
      return d
    })
  }

  // Ne jamais exposer l’email côté public
  const { email, ...safe } = userRaw

  res.json({ user: safe })
})

router.put('/:id',
  requireAuth,
  param('id').isString().notEmpty(),
  body('name').optional().isString().trim().isLength({ min: 2 }),
  body('username').optional().isString().trim().isLength({ min: 2 }),
  body('bio').optional().isString(),
  body('district').optional().isString(),
  body('avatarURL').optional().isString(),
  body('avatar').optional().isString(), // ← accepte aussi `avatar`
  body('phone').optional().isString(),
  body('email').optional().isString().isLength({ min: 3 }).bail().isEmail().withMessage('email invalide'),
  body('dogs').optional().isArray(),
  async (req, res, next) => {
    try {
      assertValid(req)
      if (req.user.uid !== req.params.id) {
        return res.status(403).json({ error: 'forbidden' })
      }

      let user = await User.findById(req.params.id)
      if (!user) {
        user = new User({ _id: req.params.id, name: req.body.name ?? 'Utilisateur' })
        ensureUsername(user, req.params.id)
      }

      // Fallback entrée
      if (typeof req.body.avatar === 'string' && !req.body.avatarURL) {
        req.body.avatarURL = req.body.avatar
      }

      const fields = ['name','username','bio','district','avatarURL','phone','email','dogs']
      for (const f of fields) {
        if (f in req.body) {
          user[f] = (f === 'email' && typeof req.body[f] === 'string')
            ? req.body[f].toLowerCase().trim()
            : req.body[f]
        }
      }
      ensureUsername(user, req.params.id)

      await user.save()
      const out = normalizeAvatarOut(user)
      const { email, ...safe } = out
      return res.json({ user: safe })
    } catch (err) {
      if (err && err.code === 11000) {
        if (err.keyPattern?.email)    return res.status(409).json({ error: 'email_taken' })
        if (err.keyPattern?.username) return res.status(409).json({ error: 'username_taken' })
      }
      return next(err)
    }
  }
)

// Dogs @me  (si tu utilises encore la version “embed” dans User)
router.get('/@me/dogs', requireAuth, async (req, res) => {
  const u = await User.findById(req.user.uid, { dogs: 1 }).lean()
  if (!u) return res.status(404).json({ error: 'not_found' })
  res.json({ dogs: u.dogs || [] })
})

router.post('/@me/dogs',
  requireAuth,
  body('name').isString().trim().isLength({ min: 1 }),
  body('breed').isString().trim().isLength({ min: 1 }),
  body('personalities').optional().isArray(),
  body('birthday').optional().isISO8601().toDate(),
  body('avatarURL').optional().isString(),
  async (req, res) => {
    assertValid(req)
    const u = await User.findById(req.user.uid)
    if (!u) return res.status(404).json({ error: 'not_found' })

    const dog = {
      name: req.body.name,
      breed: req.body.breed,
      personalities: Array.isArray(req.body.personalities) ? req.body.personalities : [],
      birthday: req.body.birthday ?? null,
      avatarURL: req.body.avatarURL || ''
    }
    u.dogs.push(dog)
    await u.save()
    const added = u.dogs[u.dogs.length - 1]
    res.status(201).json({ dog: added })
  }
)

router.put('/@me/dogs/:dogId',
  requireAuth,
  param('dogId').isString().notEmpty(),
  body('name').optional().isString().trim().isLength({ min: 1 }),
  body('breed').optional().isString().trim().isLength({ min: 1 }),
  body('personalities').optional().isArray(),
  body('birthday').optional().isISO8601().toDate(),
  body('avatarURL').optional().isString(),
  async (req, res) => {
    assertValid(req)
    const u = await User.findById(req.user.uid)
    if (!u) return res.status(404).json({ error: 'not_found' })
    const d = u.dogs.id(req.params.dogId)
    if (!d) return res.status(404).json({ error: 'dog_not_found' })

    ;['name','breed','personalities','birthday','avatarURL'].forEach(f => {
      if (f in req.body) d[f] = req.body[f]
    })
    await u.save()
    res.json({ dog: d })
  }
)

router.delete('/@me/dogs/:dogId',
  requireAuth,
  param('dogId').isString().notEmpty(),
  async (req, res) => {
    assertValid(req)
    const u = await User.findById(req.user.uid)
    if (!u) return res.status(404).json({ error: 'not_found' })
    const d = u.dogs.id(req.params.dogId)
    if (!d) return res.status(404).json({ error: 'dog_not_found' })
    d.deleteOne()
    await u.save()
    res.status(204).end()
  }
)

export default router
