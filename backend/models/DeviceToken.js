import mongoose from 'mongoose'
const { Schema } = mongoose

const DeviceTokenSchema = new Schema({
  userId:   { type: String, required: true, index: true },
  token:    { type: String, required: true, unique: true },
  platform: { type: String, enum: ['web','ios','android'], default: 'web', index: true },
  ua:       { type: String },
  lastSeenAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true })

export default mongoose.model('DeviceToken', DeviceTokenSchema)
