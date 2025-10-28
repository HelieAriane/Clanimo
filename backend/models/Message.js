import mongoose from 'mongoose';
const { Schema } = mongoose;

const MessageSchema = new Schema({
  fromUserId: { type: String, ref: 'User', required: true },
  toUserId:   { type: String, ref: 'User', required: true },
  body:       { type: String, required: true },
  readAt:     { type: Date, default: null },
}, { timestamps: true });

MessageSchema.index({ fromUserId: 1, toUserId: 1, createdAt: -1 });

export default mongoose.model('Message', MessageSchema);
