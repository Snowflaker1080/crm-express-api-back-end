const { Schema, model, Types } = require('mongoose');
const mongoose = require("mongoose");

const groupSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['cohort','network','friend','family','business','sport','other'], default: 'other' },
  owner: { type: Types.ObjectId, ref: 'User', required: true },
  members: [{ type: Types.ObjectId, ref: 'Contact' }],
}, { timestamps: true });

module.exports = model('Group', groupSchema);


