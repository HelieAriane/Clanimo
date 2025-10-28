import { Router } from 'express'
import User from '../models/User.js'
import Dog from '../models/Dog.js'

const router = Router()

// GET /public/users/:id -> profil public
router.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id, { _id:1, name:1, username:1, avatarURL:1, district:1 }).lean()
  if (!user) return res.status(404).json({ error: 'user_not_found' })
  res.json({ user })
})

// GET /public/users/:id/dogs
router.get('/users/:id/dogs', async (req, res) => {
  const dogs = await Dog.find({ ownerId: req.params.id }).lean()
  res.json({ dogs })
})


// NEW: /public/search?username=ca (match prefix insensible à la casse)
router.get('/search', async (req, res) => {
  const q = (req.query.username || '').toString().trim()
  if (!q) return res.json({ users: [] })
  const regex = new RegExp('^' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const users = await User.find({ username: regex }, { _id:1, name:1, username:1, avatarURL:1 }).limit(10).lean()
  res.json({ users })
})

export default router
