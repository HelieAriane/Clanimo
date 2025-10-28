// backend/scripts/sync-indexes.js
import 'dotenv/config'
import mongoose from 'mongoose'
import '../config/db.js'

import Notification  from '../models/Notification.js'
import FriendRequest from '../models/FriendRequest.js'
import User          from '../models/User.js'
import Meetup        from '../models/Meetup.js'

async function main() {
  try {
    // En script/migration on peut laisser autoIndex à true
    mongoose.set('autoIndex', true)

    console.log('Syncing indexes for Notification...')
    await Notification.syncIndexes()
    console.log('Notification indexes:', await Notification.collection.indexes())

    console.log('Syncing indexes for FriendRequest...')
    await FriendRequest.syncIndexes()
    console.log('FriendRequest indexes:', await FriendRequest.collection.indexes())

    console.log('Syncing indexes for User...')
    await User.syncIndexes()
    console.log('User indexes:', await User.collection.indexes())

    console.log('Syncing indexes for Meetup...')
    await Meetup.syncIndexes()
    console.log('Meetup indexes:', await Meetup.collection.indexes())
  } catch (err) {
    console.error('sync-indexes error:', err)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect().catch(() => {})
  }
}

main()
