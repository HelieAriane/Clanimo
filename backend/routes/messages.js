import { Router } from 'express';
import Message from '../models/Message.js';
import { requireAuth } from '../middlewares/auth.js';
import User from '../models/User.js';

const router = Router();

// liste des conversations avec dernier message
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.uid;

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { fromUserId: userId },
            { toUserId: userId }
          ]
        }
      },
      {
        $project: {
          body: 1,
          fromUserId: 1,
          toUserId: 1,
          createdAt: 1,
          otherUserId: {
            $cond: [{ $eq: ['$fromUserId', userId] }, '$toUserId', '$fromUserId']
          }
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$otherUserId',
          lastMessage: { $first: '$body' },
          lastAt: { $first: '$createdAt' }
        }
      },
      // join avec users pour récupérer name + avatar
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: {
          path: '$userInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          lastMessage: 1,
          lastAt: 1,
          user: {
            name: { $ifNull: ['$userInfo.name', 'Utilisateur inconnu'] },
            avatarURL: {
              $ifNull: ['$userInfo.avatarURL', { $ifNull: ['$userInfo.avatar', ''] }]
            }
          }
        }
      },
      { $sort: { lastAt: -1 } }
    ]);

    res.json({ conversations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur récupération des conversations' });
  }
});

// tous les messages avec un utilisateur
router.get('/:userId', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.user.uid;
    const otherUserId = req.params.userId;

    // Récupère les messages existants entre les deux utilisateurs
    const messages = await Message.find({
      $or: [
        { fromUserId: currentUserId, toUserId: otherUserId },
        { fromUserId: otherUserId, toUserId: currentUserId }
      ]
    }).sort({ createdAt: 1 });

    // Récupère les infos publiques de l'autre utilisateur
    const otherUserRaw = await User.findById(otherUserId, {
      name: 1,
      avatarURL: 1,
      avatar: 1
    }).lean();

    const otherUser = otherUserRaw
      ? {
          name: otherUserRaw.name || 'Utilisateur inconnu',
          avatarURL: otherUserRaw.avatarURL || otherUserRaw.avatar || ''
        }
      : { name: 'Utilisateur inconnu', avatarURL: '' };

    // Retourne toujours les infos de l’utilisateur, même si messages est vide
    res.json({ messages, user: otherUser });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur récupération messages' });
  }
});

// envoyer un message
router.post('/:userId', requireAuth, async (req, res) => {
  try {
    const fromUserId = req.user.uid;
    const toUserId = req.params.userId;
    const { body } = req.body;

    if (!body || body.trim() === '') {
      return res.status(400).json({ error: 'Le message ne peut pas être vide' });
    }

    const message = await Message.create({ fromUserId, toUserId, body });
    res.json({ message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur envoi message' });
  }
});

// marquer tous les messages comme lus
router.patch('/:userId/read', requireAuth, async (req, res) => {
  try {
    const userId = req.user.uid; 
    const otherUserId = req.params.userId;

    const result = await Message.updateMany(
      { fromUserId: otherUserId, toUserId: userId, readAt: null },
      { $set: { readAt: new Date() } }
    );

    res.json({ updated: result.modifiedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur mise à jour lecture messages' });
  }
});

export default router;
