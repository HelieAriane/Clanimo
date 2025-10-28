// backend/scripts/backfill-notif-expires.js
import 'dotenv/config'
import mongoose from 'mongoose'
import '../config/db.js'
import Notification from '../models/Notification.js'

const ttlDays = Number(process.env.NOTIF_TTL_DAYS || 0)

async function main() {
  if (!ttlDays) {
    console.log('NOTIF_TTL_DAYS est 0 ou absent — rien à faire.')
    process.exit(0)
  }
  try {
    const bulk = []
    const cur = Notification.find({ expiresAt: { $exists: false } })
      .cursor({ batchSize: 1000 })

    for (let doc = await cur.next(); doc; doc = await cur.next()) {
      const base = doc.createdAt || new Date()
      const exp = new Date(base); exp.setDate(exp.getDate() + ttlDays)
      bulk.push({
        updateOne: {
          filter: { _id: doc._id, expiresAt: { $exists: false } },
          update: { $set: { expiresAt: exp } }
        }
      })
      if (bulk.length >= 1000) {
        await Notification.collection.bulkWrite(bulk)
        bulk.length = 0
      }
    }
    if (bulk.length) await Notification.collection.bulkWrite(bulk)
    console.log('Backfill terminé.')
  } catch (e) {
    console.error('Backfill error:', e)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect().catch(() => {})
  }
}

main()
