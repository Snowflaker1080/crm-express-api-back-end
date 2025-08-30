const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const Group = require('../models/Group'); // if contact groups are supported

const verifyToken = require('../middleware/verify-token');
router.use(verifyToken);

// GET /api/contacts
router.get('/', async (req, res, next) => {
  try {
    const contacts = await Contact.find({ owner: req.user._id }).sort({ lastName: 1, firstName: 1 });
    res.json(contacts);
  } catch (err) { next(err); }
});

// POST /api/contacts
router.post('/', async (req, res, next) => {
  try {
    const payload = req.body || {};
    const contact = await Contact.create({ ...payload, owner: req.user._id });
    res.status(201).json(contact);
  } catch (err) { next(err); }
});

// GET /api/contacts/:id
router.get('/:id', async (req, res, next) => {
  try {
    const doc = await Contact.findOne({ _id: req.params.id, owner: req.user._id }).lean();
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (err) { next(err); }
});

// PUT /api/contacts/:id
router.put('/:id', async (req, res, next) => {
  try {
    const updated = await Contact.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $set: req.body || {} },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/contacts/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await Contact.findOneAndDelete({ _id: req.params.id, owner: req.user._id }).lean();
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;