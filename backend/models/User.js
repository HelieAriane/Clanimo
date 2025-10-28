// backend/models/User.js
import mongoose from 'mongoose'
const { Schema } = mongoose

const DogSchema = new Schema({
  name:          { type: String, required: true, trim: true },
  breed:         { type: String, required: true, trim: true },
  personalities: { type: [String], default: [] },
  birthday:      { type: Date, default: null },
  avatarURL:     { type: String, default: '' },

  // Ancien champ éventuellement présent dans la base (legacy)
  avatar:        { type: String, select: false }
}, { _id: true, timestamps: true })

// Normalisation de sortie sur chaque chien : avatarURL fallback sur avatar
function normalizeDogOut(doc, ret) {
  if (!ret) return ret
  if (!ret.avatarURL && ret.avatar) ret.avatarURL = ret.avatar
  delete ret.avatar
  return ret
}
DogSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: normalizeDogOut
})
DogSchema.set('toObject', {
  virtuals: true,
  versionKey: false,
  transform: normalizeDogOut
})

const UserSchema = new Schema({
  _id: { type: String, required: true }, // UID Firebase

  email: {
    type: String,
    lowercase: true,
    trim: true,
    default: undefined,
    set: v => {
      if (v == null) return undefined
      const s = String(v).trim()
      return s === '' ? undefined : s
    }
  },

  name: { type: String, required: true, trim: true },

  username: { type: String, required: true, trim: true, index: true, unique: true },

  avatarURL: { type: String, default: '' },
  // Ancien champ potentiellement existant dans la base (legacy)
  avatar:    { type: String, select: false },

  bio:       { type: String, default: '' },

  district:  { type: String, default: '', index: true },
  phone:     { type: String, default: '' },

  enLigne:   { type: Boolean, default: false },

  friends:   { type: [String], default: [], index: true },

  // Chiens embarqués
  dogs:      { type: [DogSchema], default: [] },
}, { timestamps: true })

UserSchema.index(
  { email: 1 },
  {
    unique: true,
    name: 'email_unique_string',
    partialFilterExpression: { email: { $type: 'string' } }
  }
)

// Normalisation de sortie pour l’utilisateur : avatarURL fallback sur avatar
function normalizeUserOut(doc, ret) {
  if (!ret) return ret
  if (!ret.avatarURL && ret.avatar) ret.avatarURL = ret.avatar
  delete ret.avatar
  // Normaliser aussi chaque chien (au cas où)
  if (Array.isArray(ret.dogs)) {
    ret.dogs = ret.dogs.map(d => {
      if (!d) return d
      if (!d.avatarURL && d.avatar) d.avatarURL = d.avatar
      delete d.avatar
      return d
    })
  }
  return ret
}
UserSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: normalizeUserOut
})
UserSchema.set('toObject', {
  virtuals: true,
  versionKey: false,
  transform: normalizeUserOut
})

export default mongoose.model('User', UserSchema)
