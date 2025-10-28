// backend/routes/meetups.js
import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import multer from 'multer';

import Meetup from '../models/Meetup.js';
import User from '../models/User.js';
import { requireAuth } from '../middlewares/auth.js';

import { sendPushToUser } from '../services/push.js';
import { notifyMeetupInvite } from '../services/notify.js';

const router = Router();

// Multer (image optionnelle)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// GridFS helper (bucket uploads)
function bucket() {
  const db = mongoose.connection.db;
  return new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
}

async function saveBufferToGridFS(file, { userId, folder = 'meetups' } = {}) {
  if (!file?.buffer || !file?.originalname) return null;
  const contentType = file.mimetype || 'application/octet-stream';
  const filename = file.originalname || 'image';

  return new Promise((resolve, reject) => {
    const up = bucket().openUploadStream(filename, {
      contentType,
      metadata: { userId, folder },
    });
    up.end(file.buffer);
    up.on('finish', (f) => resolve(`/api/v1/uploads/${f._id.toString()}`));
    up.on('error', reject);
  });
}

// Helpers
const assertValid = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const e = new Error('validation');
    e.type = 'validation';
    e.details = errors.array().map((x) => ({ field: x.path, msg: x.msg }));
    throw e;
  }
};
const isISODate = (v) => !v || !isNaN(new Date(v).getTime());
const toNumberOrNull = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isNaN(n) ? null : n;
};
const assertObjectId = (id, res, name = 'id') => {
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: `invalid_${name}` });
    return false;
  }
  return true;
};

// Normalise pour le client : expose toujours .image (et garde .imageUrl)
function normalizeMeetupForClient(m) {
  if (!m) return m;
  const image = m.image || m.imageUrl || '';
  return { ...m, image };
}

// LISTE / FILTRES
router.get(
  '/',
  requireAuth,
  query('district').optional().isString(),
  query('dateFrom').optional().custom(isISODate).withMessage('dateFrom doit être ISO'),
  query('dateTo').optional().custom(isISODate).withMessage('dateTo doit être ISO'),
  query('createdBy').optional().isString(),
  query('participant').optional().isString(),
  async (req, res) => {
    assertValid(req);
    const { district, dateFrom, dateTo, createdBy, participant } = req.query;
    const filter = {};
    if (district) filter.district = String(district);
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }
    if (createdBy) filter.createdBy = String(createdBy);
    if (participant) filter.participants = String(participant);

    const raw = await Meetup.find(filter).sort({ date: 1, createdAt: -1 }).lean();
    const meetups = raw.map(normalizeMeetupForClient);
    res.json({ meetups });
  }
);

// RECHERCHE PROXIMITÉ
router.get(
  '/near',
  requireAuth,
  query('lat').isFloat({ min: -90, max: 90 }),
  query('lng').isFloat({ min: -180, max: 180 }),
  query('radiusKm').optional().isFloat({ gt: 0, lt: 200 }), // 200 km max
  async (req, res) => {
    assertValid(req);
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = parseFloat(req.query.radiusKm ?? '10');

    const raw = await Meetup.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusKm * 1000,
        },
      },
    })
      .sort({ date: 1 })
      .lean();

    const meetups = raw.map(normalizeMeetupForClient);
    res.json({ meetups });
  }
);

// CRÉATION (JSON ou multipart)
router.post(
  '/',
  requireAuth,
  upload.single('image'),
  body('title').isString().trim().isLength({ min: 2 }),
  body('description').optional().isString(),
  body('district').optional().isString(),
  body('locationText').optional().isString(),
  body('image').optional().isString(),   // URL directe éventuelle
  body('imageUrl').optional().isString(),// compat
  body('date').notEmpty().isISO8601().withMessage('date ISO requise'),
  body('lat')
    .optional({ checkFalsy: true })
    .custom((v) => v === '' || v == null || !isNaN(parseFloat(v)))
    .withMessage('lat invalide'),
  body('lng')
    .optional({ checkFalsy: true })
    .custom((v) => v === '' || v == null || !isNaN(parseFloat(v)))
    .withMessage('lng invalide'),
  async (req, res, next) => {
    try {
      assertValid(req);

      const title = String(req.body.title || '').trim();
      const description = typeof req.body.description === 'string' ? req.body.description : '';
      const district = typeof req.body.district === 'string' ? req.body.district : '';
      const locationText = typeof req.body.locationText === 'string' ? req.body.locationText : '';
      const when = new Date(req.body.date);

      if (isNaN(when.getTime())) {
        return res.status(400).json({ error: 'invalid_date', message: 'date non parseable' });
      }

      const lat = toNumberOrNull(req.body.lat);
      const lng = toNumberOrNull(req.body.lng);

      // Soit les deux, soit aucun
      if ((lat === null) !== (lng === null)) {
        return res
          .status(400)
          .json({ error: 'both_lat_lng_required', message: 'lat et lng doivent être fournis ensemble' });
      }

      // Image: priorité au fichier, sinon accepte URL directe (image ou imageUrl)
      let finalImageUrl = '';
      if (req.file) {
        try {
          finalImageUrl = await saveBufferToGridFS(req.file, { userId: req.user.uid, folder: 'meetups' });
        } catch (e) {
          console.error('[meetups:create] image upload failed:', e);
          return res.status(400).json({ error: 'image_upload_failed' });
        }
      } else if (typeof req.body.image === 'string' && req.body.image.trim()) {
        finalImageUrl = req.body.image.trim();
      } else if (typeof req.body.imageUrl === 'string' && req.body.imageUrl.trim()) {
        finalImageUrl = req.body.imageUrl.trim();
      }

      const doc = {
        title,
        description,
        district,
        locationText,
        imageUrl: finalImageUrl,
        date: when,
        createdBy: req.user.uid,
        participants: [req.user.uid],
      };

      if (lat !== null && lng !== null) {
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          return res.status(400).json({ error: 'coordinates_out_of_range' });
        }
        doc.location = { type: 'Point', coordinates: [lng, lat] }; // GeoJSON = [lng, lat]
      }

      const meetup = await Meetup.create(doc);
      return res.status(201).json({ meetup: normalizeMeetupForClient(meetup.toObject()) });
    } catch (err) {
      console.error('[meetups:create]', err);
      return next(err);
    }
  }
);

// GET BY ID
router.get(
  '/:id',
  requireAuth,
  param('id').isString().notEmpty(),
  async (req, res) => {
    assertValid(req);
    if (!assertObjectId(req.params.id, res, 'meetup_id')) return;
    const m = await Meetup.findById(req.params.id).lean();
    if (!m) return res.status(404).json({ error: 'meetup_not_found' });
    res.json({ meetup: normalizeMeetupForClient(m) });
  }
);

// UPDATE (JSON ou multipart)
router.put(
  '/:id',
  requireAuth,
  upload.single('image'),
  param('id').isString().notEmpty(),
  body('title').optional().isString().isLength({ min: 2 }),
  body('description').optional().isString(),
  body('district').optional().isString(),
  body('locationText').optional().isString(),
  body('image').optional().isString(),
  body('imageUrl').optional().isString(),
  body('date').optional().custom(isISODate).withMessage('date ISO invalide'),
  body('lat')
    .optional({ checkFalsy: true })
    .custom((v) => v === '' || v == null || !isNaN(parseFloat(v)))
    .withMessage('lat invalide'),
  body('lng')
    .optional({ checkFalsy: true })
    .custom((v) => v === '' || v == null || !isNaN(parseFloat(v)))
    .withMessage('lng invalide'),
  async (req, res, next) => {
    try {
      assertValid(req);
      if (!assertObjectId(req.params.id, res, 'meetup_id')) return;

      const m = await Meetup.findById(req.params.id);
      if (!m) return res.status(404).json({ error: 'meetup_not_found' });
      if (m.createdBy !== req.user.uid) return res.status(403).json({ error: 'forbidden' });

      const patch = {};
      ['title', 'description', 'district', 'locationText'].forEach((k) => {
        if (k in req.body) patch[k] = req.body[k];
      });
      if ('date' in req.body) patch.date = new Date(req.body.date);

      const lat = toNumberOrNull(req.body.lat);
      const lng = toNumberOrNull(req.body.lng);
      if ((lat === null) !== (lng === null)) {
        return res
          .status(400)
          .json({ error: 'both_lat_lng_required', message: 'lat et lng doivent être fournis ensemble' });
      }
      if (lat !== null && lng !== null) {
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          return res.status(400).json({ error: 'coordinates_out_of_range' });
        }
        patch.location = { type: 'Point', coordinates: [lng, lat] };
      }

      // Image: fichier prioritaire, sinon URL (toujours stockée dans imageUrl)
      if (req.file) {
        try {
          const url = await saveBufferToGridFS(req.file, { userId: req.user.uid, folder: 'meetups' });
          patch.imageUrl = url;
        } catch (e) {
          console.error('[meetups:update] image upload failed:', e);
          return res.status(400).json({ error: 'image_upload_failed' });
        }
      } else if (typeof req.body.image === 'string' && req.body.image.trim()) {
        patch.imageUrl = req.body.image.trim();
      } else if (typeof req.body.imageUrl === 'string' && req.body.imageUrl.trim()) {
        patch.imageUrl = req.body.imageUrl.trim(); 
      }

      Object.assign(m, patch);
      await m.save();
      return res.json({ meetup: normalizeMeetupForClient(m.toObject()) });
    } catch (err) {
      return next(err);
    }
  }
);

// PARTICIPATION
router.post(
  '/:id/join',
  requireAuth,
  param('id').isString().notEmpty(),
  async (req, res) => {
    assertValid(req);
    if (!assertObjectId(req.params.id, res, 'meetup_id')) return;
    const m = await Meetup.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { participants: req.user.uid } },
      { new: true }
    ).lean();
    if (!m) return res.status(404).json({ error: 'meetup_not_found' });
    res.json({ meetup: normalizeMeetupForClient(m) });
  }
);

router.post(
  '/:id/leave',
  requireAuth,
  param('id').isString().notEmpty(),
  async (req, res) => {
    assertValid(req);
    if (!assertObjectId(req.params.id, res, 'meetup_id')) return;
    const m = await Meetup.findByIdAndUpdate(
      req.params.id,
      { $pull: { participants: req.user.uid } },
      { new: true }
    ).lean();
    if (!m) return res.status(404).json({ error: 'meetup_not_found' });
    res.json({ meetup: normalizeMeetupForClient(m) });
  }
);

// INVITATIONS
router.post(
  '/:id/invite/:friendId',
  requireAuth,
  param('id').isString().notEmpty(),
  param('friendId').isString().notEmpty(),
  async (req, res) => {
    assertValid(req);

    if (!assertObjectId(req.params.id, res, 'meetup_id')) return;

    const friendId = req.params.friendId;

    const m = await Meetup.findById(req.params.id);
    if (!m) return res.status(404).json({ error: 'meetup_not_found' });

    if (m.participants.includes(friendId)) {
      return res.status(400).json({ error: 'already_participant', message: 'Cet utilisateur participe déjà' });
    }

    const alreadyInvited = (m.invites || []).some((v) => v.toUserId === friendId && v.status === 'pending');
    if (alreadyInvited) {
      return res.status(400).json({ error: 'already_invited', message: 'Cet utilisateur a déjà été invité' });
    }

    const invite = { fromUserId: req.user.uid, toUserId: friendId, status: 'pending' };
    m.invites = m.invites || [];
    m.invites.push(invite);

    await m.save();

    try {
      await notifyMeetupInvite({ inviterId: req.user.uid, inviteeId: friendId, meetup: m });
    } catch (err) {
      console.error('[notify] meetup_invite failed:', err);
    }

    res.status(201).json({ meetup: normalizeMeetupForClient(m.toObject()) });
  }
);

router.get('/:id/invites', async (req, res) => {
  try {
    const meetup = await Meetup.findById(req.params.id).lean();
    if (!meetup) {
      return res.status(404).json({ message: 'Meetup not found' });
    }
    res.json({ invited: meetup.invites || [] });
  } catch (err) {
    console.error('Erreur récupération invites', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get(
  '/:id/participants',
  requireAuth,
  param('id').isString().notEmpty(),
  async (req, res) => {
    assertValid(req);
    if (!assertObjectId(req.params.id, res, 'meetup_id')) return;
    const m = await Meetup.findById(req.params.id, { participants: 1 }).lean();
    if (!m) return res.status(404).json({ error: 'meetup_not_found' });
    const users = await User.find({ _id: { $in: m.participants || [] } }, { _id: 1, name: 1, avatarURL: 1 }).lean();
    res.json({ users });
  }
);

// Invitations @me
router.get('/@me/invites/incoming', requireAuth, async (req, res) => {
  const meetups = await Meetup.find({ 'invites.toUserId': req.user.uid }, { invites: 1, title: 1 }).lean();
  const incoming = [];
  for (const m of meetups) {
    for (const inv of m.invites || []) {
      if (inv.toUserId === req.user.uid && inv.status === 'pending') {
        incoming.push({ meetupId: m._id, title: m.title, invite: inv });
      }
    }
  }
  res.json({ invites: incoming });
});

router.get('/@me/invites/outgoing', requireAuth, async (req, res) => {
  const meetups = await Meetup.find({ 'invites.fromUserId': req.user.uid }, { invites: 1, title: 1 }).lean();
  const outgoing = [];
  for (const m of meetups) {
    for (const inv of m.invites || []) {
      if (inv.fromUserId === req.user.uid && inv.status === 'pending') {
        outgoing.push({ meetupId: m._id, title: m.title, invite: inv });
      }
    }
  }
  res.json({ invites: outgoing });
});

router.get('/invitations', requireAuth, async (req, res) => {
  const meetups = await Meetup.find({ 'invites.toUserId': req.user.uid }, { invites: 1, title: 1, date: 1 }).lean();
  const list = [];
  for (const m of meetups) {
    for (const inv of m.invites || []) {
      if (inv.toUserId === req.user.uid && inv.status === 'pending') {
        list.push({ meetupId: m._id, title: m.title, date: m.date, invite: inv });
      }
    }
  }
  res.json({ invitations: list });
});

router.post(
  '/invitations/:invId/accept',
  requireAuth,
  param('invId').isString().notEmpty(),
  async (req, res) => {
    assertValid(req);
    const invId = req.params.invId;
    if (!assertObjectId(invId, res, 'invite_id')) return;
    const m = await Meetup.findOneAndUpdate(
      { 'invites._id': invId, 'invites.toUserId': req.user.uid },
      { $set: { 'invites.$.status': 'accepted' } },
      { new: true }
    );
    if (!m) return res.status(404).json({ error: 'invite_not_found' });
    if (!m.participants.includes(req.user.uid)) {
      m.participants.push(req.user.uid);
      await m.save();
    }
    res.json({ meetup: normalizeMeetupForClient(m.toObject()) });
  }
);

router.post(
  '/invitations/:invId/decline',
  requireAuth,
  param('invId').isString().notEmpty(),
  async (req, res) => {
    assertValid(req);
    const invId = req.params.invId;
    if (!assertObjectId(invId, res, 'invite_id')) return;
    const m = await Meetup.findOneAndUpdate(
      {
        'invites._id': invId,
        $or: [{ 'invites.toUserId': req.user.uid }, { 'invites.fromUserId': req.user.uid }],
      },
      { $set: { 'invites.$.status': 'declined' } },
      { new: true }
    );
    if (!m) return res.status(404).json({ error: 'invite_not_found' });
    res.json({ meetup: normalizeMeetupForClient(m.toObject()) });
  }
);

router.get('/@me/invites/count', requireAuth, async (req, res) => {
  const uid = req.user.uid;

  const mInDocs = await Meetup.find({ 'invites.toUserId': uid }, { invites: 1 }).lean();
  let inCount = 0;
  for (const m of mInDocs) for (const inv of m.invites || []) if (inv.toUserId === uid && inv.status === 'pending') inCount++;

  const mOutDocs = await Meetup.find({ 'invites.fromUserId': uid }, { invites: 1 }).lean();
  let outCount = 0;
  for (const m of mOutDocs) for (const inv of m.invites || []) if (inv.fromUserId === uid && inv.status === 'pending') outCount++;

  const mSentDocs = await Meetup.find({ createdBy: uid, 'invites.0': { $exists: true } }, { invites: 1 }).lean();
  let sentCount = 0;
  for (const m of mSentDocs) for (const inv of m.invites || []) if (inv.status === 'pending') sentCount++;

  res.json({
    counts: {
      meetupIncoming: inCount,
      meetupOutgoing: outCount,
      meetupSent: sentCount,
      total: inCount + outCount + sentCount,
    },
  });
});

export default router;
