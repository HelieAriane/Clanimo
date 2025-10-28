// backend/routes/dogs.js
import { Router } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import mongoose from 'mongoose'
import Dog from '../models/Dog.js'
import User from '../models/User.js'
import { requireAuth } from '../middlewares/auth.js'

const router = Router()

// Helpers
const assertValid = (req) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const err = new Error('validation')
    err.type = 'validation'
    err.details = errors.array().map(x => ({ field: x.path, msg: x.msg }))
    throw err
  }
}
const isISODate = (v) => !v || !isNaN(new Date(v).getTime())

// Ne garder que les champs autorisés (+ alias avatar -> avatarURL)
function pickDogFields(src = {}) {
  const dst = {}

  if ('name' in src) dst.name = String(src.name)
  if ('breed' in src) dst.breed = src.breed ?? undefined
  if ('sex' in src) dst.sex = src.sex

  if ('birthday' in src) {
    dst.birthday = src.birthday ? new Date(src.birthday) : undefined
  }
  if ('ageMonths' in src) dst.ageMonths = Number.isFinite(+src.ageMonths) ? +src.ageMonths : undefined
  if ('weightKg' in src) dst.weightKg = Number.isFinite(+src.weightKg) ? +src.weightKg : undefined

  if ('bio' in src) dst.bio = src.bio ?? undefined

  // alias d'avatar
  const avatarURL = src.avatarURL ?? src.avatar
  if (avatarURL !== undefined) dst.avatarURL = String(avatarURL)

  if ('vaccinated' in src) dst.vaccinated = !!src.vaccinated
  if ('sterilized' in src) dst.sterilized = !!src.sterilized

  if ('personalities' in src && Array.isArray(src.personalities)) {
    dst.personalities = src.personalities.map(String)
  }

  return dst
}

// Normalise la forme renvoyée (pour afficher dans le front)
function normalizeOut(dog) {
  if (!dog) return dog
  const d = { ...dog }
  if (!d.avatarURL && d.avatar) d.avatarURL = d.avatar
  return d
}

// LISTE DES CHIENS
// GET /dogs?owner=@me|<uid>
router.get('/',
  requireAuth,
  query('owner').optional().isString(),
  async (req, res, next) => {
    try {
      assertValid(req)
      const owner =
        !req.query.owner || req.query.owner === '@me'
          ? req.user.uid
          : String(req.query.owner)

      const dogs = await Dog.find({ ownerId: owner })
        .sort({ createdAt: -1 })
        .lean()

      res.json({ dogs: dogs.map(normalizeOut) })
    } catch (err) { next(err) }
  }
)

// Alias pratique : /dogs/@me
router.get('/@me',
  requireAuth,
  async (req, res, next) => {
    try {
      const dogs = await Dog.find({ ownerId: req.user.uid })
        .sort({ createdAt: -1 })
        .lean()
      res.json({ dogs: dogs.map(normalizeOut) })
    } catch (err) { next(err) }
  }
)

// CRÉATION
router.post('/',
  requireAuth,
  body('name').isString().trim().isLength({ min: 1 }),
  body('breed').optional().isString(),
  body('sex').optional().isIn(['male', 'female', 'unknown']),
  body('birthday').optional().custom(isISODate).withMessage('birthday doit être ISO'),
  body('ageMonths').optional().isInt({ min: 0 }),
  body('weightKg').optional().isFloat({ min: 0 }),
  body('bio').optional().isString(),
  body('avatarURL').optional().isString(),
  body('avatar').optional().isString(),          // alias supporté
  body('vaccinated').optional().isBoolean(),
  body('sterilized').optional().isBoolean(),
  body('personalities').optional().isArray(),
  body('personalities.*').optional().isString(),
  async (req, res, next) => {
    try {
      assertValid(req)
      const data = pickDogFields(req.body)
      const created = await Dog.create({ ...data, ownerId: req.user.uid })

      //Synchroniser dans User
      await User.updateOne(
        { _id: req.user.uid },
        { $push: { dogs: normalizeOut(created.toObject()) } }
      )
      res.status(201).json({ dog: normalizeOut(created.toObject()) })
    } catch (err) { next(err) }
  }
)

// LECTURE
router.get('/:id',
  requireAuth,
  param('id').isString().notEmpty(),
  async (req, res, next) => {
    try {
      assertValid(req)
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'invalid_dog_id' })
      }
      const dog = await Dog.findById(req.params.id).lean()
      if (!dog) return res.status(404).json({ error: 'dog_not_found' })
      if (dog.ownerId !== req.user.uid) return res.status(403).json({ error: 'forbidden' })
      res.json({ dog: normalizeOut(dog) })
    } catch (err) { next(err) }
  }
)

// MISE À JOUR
router.put('/:id',
  requireAuth,
  param('id').isString().notEmpty(),
  body('name').optional().isString().trim().isLength({ min: 1 }),
  body('breed').optional().isString(),
  body('sex').optional().isIn(['male', 'female', 'unknown']),
  body('birthday').optional().custom(isISODate).withMessage('birthday doit être ISO'),
  body('ageMonths').optional().isInt({ min: 0 }),
  body('weightKg').optional().isFloat({ min: 0 }),
  body('bio').optional().isString(),
  body('avatarURL').optional().isString(),
  body('avatar').optional().isString(),          // alias supporté
  body('vaccinated').optional().isBoolean(),
  body('sterilized').optional().isBoolean(),
  body('personalities').optional().isArray(),
  body('personalities.*').optional().isString(),
  async (req, res, next) => {
    try {
      assertValid(req)
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'invalid_dog_id' })
      }

      const patch = pickDogFields(req.body) // ownerId jamais modifié
      const dog = await Dog.findOneAndUpdate(
        { _id: req.params.id, ownerId: req.user.uid },
        { $set: patch },
        { new: true, lean: true }
      )
      if (!dog) return res.status(404).json({ error: 'dog_not_found_or_forbidden' })

      // Synchronisation avec base users
      await User.updateOne(
        { _id: req.user.uid, "dogs._id": dog._id },
        {
          $set: {
            "dogs.$.name": dog.name,
            "dogs.$.breed": dog.breed,
            "dogs.$.sex": dog.sex,
            "dogs.$.birthday": dog.birthday,
            "dogs.$.ageMonths": dog.ageMonths,
            "dogs.$.weightKg": dog.weightKg,
            "dogs.$.bio": dog.bio,
            "dogs.$.avatarURL": dog.avatarURL,
            "dogs.$.vaccinated": dog.vaccinated,
            "dogs.$.sterilized": dog.sterilized,
            "dogs.$.personalities": dog.personalities
          }
        }
      )

      res.json({ dog: normalizeOut(dog) })
    } catch (err) { next(err) }
  }
)

// SUPPRESSION
router.delete('/:id',
  requireAuth,
  param('id').isString().notEmpty(),
  async (req, res, next) => {
    try {
      assertValid(req)
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'invalid_dog_id' })
      }
      const r = await Dog.deleteOne({ _id: req.params.id, ownerId: req.user.uid })
      if (r.deletedCount === 0) {
        return res.status(404).json({ error: 'dog_not_found_or_forbidden' })
      }

      // Supprimer aussi dans User
      await User.updateOne(
        { _id: req.user.uid },
        { $pull: { dogs: { _id: req.params.id } } }
      )

      res.status(204).end()
    } catch (err) { next(err) }
  }
)

export default router
