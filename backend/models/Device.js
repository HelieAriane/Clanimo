// backend/models/Device.js
import mongoose from 'mongoose'
const { Schema } = mongoose

const DeviceSchema = new Schema({
  userId:   { type: String, required: true, index: true },   // UID Firebase
  token:    { type: String, required: true, unique: true },  // FCM token (unique globalement)
  platform: { type: String, enum: ['ios','android','web','unknown'], default: 'unknown', index: true },
  lastSeenAt: { type: Date, default: Date.now },
  disabled: { type: Boolean, default: false, index: true },  // désactivé si token invalide
}, { timestamps: true })

export default mongoose.model('Device', DeviceSchema)
