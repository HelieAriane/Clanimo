import mongoose from 'mongoose'

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('[DB] Missing MONGODB_URI in .env')
  process.exit(1)
}

mongoose.set('strictQuery', true)

mongoose.connect(uri, {
  autoIndex: true,
  serverSelectionTimeoutMS: 10000
}).then(() => {
  console.log('[DB] Connected')
}).catch(err => {
  console.error('[DB] Connection error:', err?.message || err)
  process.exit(1)
})

export default mongoose
