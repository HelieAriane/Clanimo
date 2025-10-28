// backend/server.js
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import './config/db.js'
import './config/firebaseAdmin.js'
import usersRouter from './routes/users.js'
import dogsRouter from './routes/dogs.js'
import friendsRouter from './routes/friends.js'
import meetupsRouter from './routes/meetups.js'
import publicRouter from './routes/public.js'
import notificationsRouter from './routes/notifications.js'
import publicUsersRouter from './routes/public.users.js'
import devicesRouter from './routes/devices.js'
import uploadsRouter from './routes/uploads.js'
import messageRoutes from './routes/messages.js'
import { notFound, errorHandler } from './middlewares/error.js'

const app = express()

// IMPORTANT derrière Render/Proxy : vraie IP client sinon le rate-limit déclenche trop tôt
app.set('trust proxy', 1)

// Sécurité de base
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

// CORS — whitelist depuis .env (CSV
// CORS AVANT TOUTES LES ROUTE
const origins = (process.env.CORS_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean)

app.use(cors({
  origin(origin, cb) {
    // autorise les outils (no-origin) et les origins listés
    if (!origin || origins.includes(origin)) return cb(null, true)
    return cb(new Error('Not allowed by CORS'))
  },

  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type']
}))

app.options('*', cors())

// Parsers & cookies
app.use(cookieParser())

app.use(express.json({ limit: '5mb' }))

app.use(express.urlencoded({ extended: true, limit: '5mb' }))

// Logs
app.use(morgan('dev'))

// Healthcheck (pas de rate-limit)
app.get('/api/v1/health', (_req, res) => res.json({ ok: true }))

// Rate-limit API (plus doux) + Retry-After pour que le front backoff proprement
const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.set('Retry-After', '5')
    res.status(429).json({ error: 'rate_limited' })
  }
})

// applique UNIQUEMENT sur l'API (évite de limiter les assets/health)
app.use('/api/v1', apiLimiter)

// (optionnel) servir les fichiers d'upload directement
const __dirname = path.dirname(fileURLToPath(import.meta.url))

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '30d',
  etag: true
}))

// Routes API
app.use('/api/v1/public', publicRouter)
app.use('/api/v1/public', publicUsersRouter)
app.use('/api/v1/users', usersRouter)
app.use('/api/v1/dogs', dogsRouter)
app.use('/api/v1/friends', friendsRouter)
app.use('/api/v1/meetups', meetupsRouter)
app.use('/api/v1/notifications', notificationsRouter)
app.use('/api/v1/devices', devicesRouter)
app.use('/api/v1/uploads', uploadsRouter)
app.use('/api/v1/messages', messageRoutes)

// 404 + erreurs
app.use(notFound)
app.use(errorHandler)

// Boot
const PORT = process.env.PORT || 420
app.listen(PORT, () => {
  console.log(`API ready on port ${PORT}`)
})
