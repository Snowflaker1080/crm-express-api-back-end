const { Schema, model, Types } = require('mongoose');

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
    lastConnectedAt: Date,
    firstConnectedAt: Date,
  },
  { timestamps: true }
);

module.exports = model('Contact', contactSchema);