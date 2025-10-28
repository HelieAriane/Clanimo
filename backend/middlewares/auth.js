import admin from '../config/firebaseAdmin.js'

/**
 * Extrait un token Bearer du header Authorization ou du cookie __session
 */
function extractToken(req) {
  const authHeader = (req.headers.authorization || '').trim()
  if (authHeader) {
    const [scheme, raw] = authHeader.split(/\s+/)
    if (scheme && scheme.toLowerCase() === 'bearer' && raw) {
      return raw.trim()
    }
  }
  // Optionnel: support cookie (utile si tu bascules en cookies httpOnly)
  if (req.cookies && req.cookies.__session) {
    return String(req.cookies.__session)
  }
  return null
}

/**
 * Middleware strict: exige un idToken valide
 */
export async function requireAuth(req, res, next) {
  try {
    // Laisse passer les preflight CORS
    if (req.method === 'OPTIONS') return next()

    const token = extractToken(req)
    if (!token) {
      return res.status(401).json({ error: 'missing_token', message: 'Missing Authorization: Bearer <idToken>' })
    }

    const decoded = await admin.auth().verifyIdToken(token, /* checkRevoked */ false)
    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
      email_verified: !!decoded.email_verified,
      // Tu peux ajouter des rôles/claims si tu en utilises:
      // role: decoded.role || 'user',
    }

    return next()
  } catch (e) {
    // Exemples d’erreurs: auth/argument-error, auth/id-token-expired, etc.
    const message = e?.message || 'invalid_token'
    return res.status(401).json({ error: 'invalid_token', message })
  }
}

/**
 * Middleware souple: attache req.user si le token est présent/valide, sinon continue en invité
 * Pratique pour des routes publiques qui réagissent différemment si l’utilisateur est connecté.
 */
export async function requireAuthOptional(req, res, next) {
  try {
    if (req.method === 'OPTIONS') return next()

    const token = extractToken(req)
    if (!token) {
      req.user = null
      return next()
    }

    const decoded = await admin.auth().verifyIdToken(token, false)
    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
      email_verified: !!decoded.email_verified,
    }
    return next()
  } catch {
    // Token invalide → on ignore et on passe en invité
    req.user = null
    return next()
  }
}

/**
 * Vérifie que l’utilisateur est bien en train d’accéder à SA ressource
 * À utiliser après requireAuth sur des routes type /users/:id/...
 */
export function ensureSelf(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  if (req.user.uid !== req.params.id) {
    return res.status(403).json({ error: 'forbidden', message: 'Not your resource' })
  }
  return next()
}
