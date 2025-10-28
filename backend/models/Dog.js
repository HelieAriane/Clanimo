// backend/models/Dog.js
import mongoose from 'mongoose'
const { Schema } = mongoose

const DogSchema = new Schema({
  ownerId:     { type: String, required: true, index: true }, // UID Firebase
  name:        { type: String, required: true, trim: true },
  breed:       { type: String, trim: true },
  sex:         { type: String, enum: ['male','female','unknown'], default: 'unknown' },

  // date de naissance (optionnelle) + âge calculé côté front (ageMonths)
  birthday:    { type: Date },
  ageMonths:   { type: Number, min: 0 },

  weightKg:    { type: Number, min: 0 },

  personalities: { type: [String], default: [] }, // ex: ["Joueur", "Énergique"]
  bio:         { type: String },

  avatarURL:   { type: String }, // URL (ex: Firebase Storage)
  vaccinated:  { type: Boolean, default: false },
  sterilized:  { type: Boolean, default: false }
}, { timestamps: true })

export default mongoose.model('Dog', DogSchema)
