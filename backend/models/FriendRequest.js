import mongoose from 'mongoose'
const { Schema } = mongoose

const FriendRequestSchema = new Schema({
  fromUserId: { type: String, required: true, index: true },
  toUserId:   { type: String, required: true, index: true },
  status:     { type: String, enum: ['pending','accepted','declined','canceled'], default: 'pending', index: true }
}, { timestamps: true })

// Évite doublons pending
FriendRequestSchema.index({ fromUserId: 1, toUserId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } })

export default mongoose.model('FriendRequest', FriendRequestSchema)
