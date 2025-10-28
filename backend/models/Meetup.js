// backend/models/Meetup.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

// --- Sous-schéma GeoJSON "Point"
const GeoPointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'] },
    // GeoJSON: [lng, lat]
    coordinates: {
      type: [Number],
      validate: [
        {
          validator: (v) =>
            v == null || (Array.isArray(v) && v.length === 2 && v.every(Number.isFinite)),
          message: 'coordinates must be [lng, lat]',
        },
        {
          validator: (v) =>
            v == null ||
            (Array.isArray(v) &&
              v.length === 2 &&
              v[0] >= -180 &&
              v[0] <= 180 && // lng
              v[1] >= -90 &&
              v[1] <= 90), // lat
          message: 'coordinates out of range',
        },
      ],
    },
  },
  { _id: false }
);

// --- Sous-schéma invitation
const InviteSchema = new Schema(
  {
    fromUserId: { type: String, required: true },
    toUserId: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'canceled'],
      default: 'pending',
    },
  },
  { timestamps: true, _id: true }
);

// --- Schéma principal Meetup
const MeetupSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    district: { type: String, index: true },

    // Libellé humain (ex: "Parc Laurier")
    locationText: { type: String },

    // Position carto (facultative)
    location: { type: GeoPointSchema, default: undefined },

    // Image: URL publique (Supabase, etc.)
    image: { type: String, default: '' },

    date: { type: Date, required: true, index: true },
    createdBy: { type: String, required: true, index: true },

    participants: { type: [String], default: [], index: true },
    invites: { type: [InviteSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals pratiques
MeetupSchema.virtual('id').get(function () {
  return this._id?.toString();
});

// Compat ascendante: encore lire/écrire `imageUrl` dans la même colonne
MeetupSchema.virtual('imageUrl')
  .get(function () {
    return this.image;
  })
  .set(function (v) {
    this.image = v;
  });

// Index géospatial pour $near
MeetupSchema.index({ location: '2dsphere' });

// Listing par quartier & date
MeetupSchema.index({ district: 1, date: -1 });

export default mongoose.models.Meetup || mongoose.model('Meetup', MeetupSchema);
