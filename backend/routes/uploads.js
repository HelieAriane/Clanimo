// backend/routes/uploads.js
import { Router } from 'express'
import multer from 'multer'
import mongoose from 'mongoose'
import { requireAuth } from '../middlewares/auth.js'

const router = Router()

// Stockage en mémoire (on pousse le buffer dans GridFS)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
})

function bucket() {
  const db = mongoose.connection.db
  return new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' })
}

// POST /api/v1/uploads  (form-data: file=<fichier>; folder=users|dogs|…)
router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file_required' })

    const contentType = req.file.mimetype || 'application/octet-stream'
    const filename = req.file.originalname || 'file'
    const meta = {
      userId: req.user.uid,
      folder: req.body.folder || 'misc'
    }

    const up = bucket().openUploadStream(filename, { contentType, metadata: meta })
    up.end(req.file.buffer)

    up.on('finish', (file) => {
      const id = file._id.toString()
      const url = `/api/v1/uploads/${id}`
      res.status(201).json({
        id, url,
        filename: file.filename,
        contentType: file.contentType,
        length: file.length,
        metadata: file.metadata || {}
      })
    })
    up.on('error', next)
  } catch (e) { next(e) }
})

// GET /api/v1/uploads/:id  (stream binaire)
router.get('/:id', async (req, res, next) => {
  try {
    let _id
    try { _id = new mongoose.Types.ObjectId(req.params.id) }
    catch { return res.status(400).json({ error: 'invalid_id' }) }

    const files = await bucket().find({ _id }).toArray()
    if (!files.length) return res.status(404).json({ error: 'not_found' })
    const file = files[0]

    res.setHeader('Content-Type', file.contentType || 'application/octet-stream')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')

    bucket().openDownloadStream(_id).pipe(res)
  } catch (e) { next(e) }
})

// DELETE /api/v1/uploads/:id  (optionnel, vérifie le propriétaire)
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    let _id
    try { _id = new mongoose.Types.ObjectId(req.params.id) }
    catch { return res.status(400).json({ error: 'invalid_id' }) }

    const files = await bucket().find({ _id }).toArray()
    if (!files.length) return res.status(404).json({ error: 'not_found' })

    const owner = files[0]?.metadata?.userId
    if (owner && owner !== req.user.uid) {
      return res.status(403).json({ error: 'forbidden' })
    }
    await bucket().delete(_id)
    res.status(204).end()
  } catch (e) { next(e) }
})

export default router
