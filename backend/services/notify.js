// backend/services/notify.js
import { EventEmitter } from 'events'
import Notification from '../models/Notification.js'
import User from '../models/User.js'

export const notifBus = new EventEmitter()

const displayName = (u) => u?.name || u?.username || 'Quelqu’un'

export async function pushNotification(userId, type, title, message = '', data = {}) {
  try {
    const doc = await Notification.create({ userId, type, title, message, data })
    try {
      notifBus.emit('notify', { userId, notification: doc.toObject() })
    } catch (e) {
      console.error('[notify] emit failed:', e)
    }
    return doc
  } catch (err) {
    console.error('[notify] create failed:', err)
    return null
  }
}

export async function notifyFriendRequest({ fromUserId, toUserId, requestId }) {
  try {
    const from = await User.findById(fromUserId, { name:1, username:1 }).lean()
    const title = 'Nouvelle demande d’ami'
    const message = `${displayName(from)} souhaite vous ajouter en ami`
    return await pushNotification(toUserId, 'friend_request', title, message, { fromUserId, requestId })
  } catch (e) {
    console.error('[notify] friend_request failed:', e)
    return null
  }
}

export async function notifyFriendAccept({ fromUserId, toUserId }) {
  try {
    const to = await User.findById(toUserId, { name:1, username:1 }).lean()
    const title = 'Demande d’ami acceptée'
    const message = `${displayName(to)} a accepté votre demande`
    return await pushNotification(fromUserId, 'friend_accept', title, message, { fromUserId, toUserId })
  } catch (e) {
    console.error('[notify] friend_accept failed:', e)
    return null
  }
}

export async function notifyFriendDecline({ fromUserId, toUserId }) {
  try {
    const to = await User.findById(toUserId, { name:1, username:1 }).lean()
    const title = 'Demande d’ami refusée'
    const message = `${displayName(to)} a refusé votre demande`
    return await pushNotification(fromUserId, 'friend_decline', title, message, { fromUserId, toUserId })
  } catch (e) {
    console.error('[notify] friend_decline failed:', e)
    return null
  }
}

export async function notifyMeetupInvite({ inviterId, inviteeId, meetup }) {
  try {
    const inv = await User.findById(inviterId, { name:1, username:1 }).lean()
    const title = 'Invitation à une rencontre'
    const message = `${displayName(inv)} vous a invité à « ${meetup.title} »`
    return await pushNotification(inviteeId, 'meetup_invite', title, message, { meetupId: meetup._id, inviterId })
  } catch (e) {
    console.error('[notify] meetup_invite failed:', e)
    return null
  }
}

export async function notifyMeetupAccept({ inviterId, inviteeId, meetup }) {
  try {
    const inv = await User.findById(inviteeId, { name:1, username:1 }).lean()
    const title = 'Invitation acceptée'
    const message = `${displayName(inv)} a accepté pour « ${meetup.title} »`
    return await pushNotification(inviterId, 'meetup_accept', title, message, { meetupId: meetup._id, inviteeId })
  } catch (e) {
    console.error('[notify] meetup_accept failed:', e)
    return null
  }
}

export async function notifyMeetupDecline({ inviterId, inviteeId, meetup }) {
  try {
    const inv = await User.findById(inviteeId, { name:1, username:1 }).lean()
    const title = 'Invitation refusée'
    const message = `${displayName(inv)} a refusé « ${meetup.title} »`
    return await pushNotification(inviterId, 'meetup_decline', title, message, { meetupId: meetup._id, inviteeId })
  } catch (e) {
    console.error('[notify] meetup_decline failed:', e)
    return null
  }
}
