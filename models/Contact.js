// models/Contact.js
const { Schema, model, Types } = require('mongoose');

const connectionSchema = new Schema(
  {
    frequencyDays: { type: Number, min: 1, default: 30 }, // reminder frequency in days
    firstConnectedAt: { type: Date, default: null },
    lastConnectedAt: { type: Date, default: null },
    nextConnectDueAt: { type: Date, default: null },      // calculated from lastConnectedAt + frequencyDays
    snoozedUntil: { type: Date, default: null },          // skip until date
    history: [
      {
        connectedAt: { type: Date, required: true },
        note: { type: String, default: '' },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const contactSchema = new Schema(
  {
    owner: { type: Types.ObjectId, ref: 'User', required: true },
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    city: String,
    country: String,
    notes: String,
    groups: [{ type: Types.ObjectId, ref: 'Group' }],

    // replaced the flat first/lastConnectedAt with a nested "connection" object
    connection: { type: connectionSchema, default: () => ({}) },
  },
  { timestamps: true }
);

// Helpful index to quickly query "who's due next"
contactSchema.index({ owner: 1, 'connection.nextConnectDueAt': 1 });

module.exports = model('Contact', contactSchema);