// controllers/users.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const User = require('../models/User');
const Contact = require('../models/Contact');
const Group = require('../models/Group');
const verifyToken = require('../middleware/verify-token');

// Protect all routes
router.use(verifyToken);

// Never proceed without req.user._id
router.use((req, res, next) => {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// GET /api/users - Return only the signed-in user (array shape for list parity)
router.get('/', async (req, res) => {
  try {
    const user =
      req.user && req.user.username
        ? req.user
        : await User.findById(req.user._id).select('username email createdAt').lean();

    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json([user]);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// GET /api/users/me?include=counts - Robust: clean 401 when unauth, 404 when user missing, never throws on req.user._id
router.get('/me', async (req, res) => {
  try {
    // parse include param: supports "counts" or "counts,other"
    const includeCounts = (req.query.include || '')
      .toString()
      .split(',')
      .map(s => s.trim().toLowerCase())
      .includes('counts');

    // Prefer user from verifyToken; fallback to fetch
    const user =
      req.user && req.user.username
        ? req.user
        : await User.findById(req.user._id).select('username email createdAt').lean();

    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!includeCounts) return res.json({ user });

    const [groupsCount, contactsCount] = await Promise.all([
      Group.countDocuments({ owner: req.user._id }),
      Contact.countDocuments({ owner: req.user._id }),
    ]);

    return res.json({ user, counts: { groups: groupsCount, contacts: contactsCount } });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// GET /api/users/:userId - Self-only access. Supports ?include=counts
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const includeCounts = (req.query.include || '')
      .toString()
      .split(',')
      .map(s => s.trim().toLowerCase())
      .includes('counts');

    const user = await User.findById(userId).select('username email createdAt').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!includeCounts) return res.json({ user });

    const [groupsCount, contactsCount] = await Promise.all([
      Group.countDocuments({ owner: req.user._id }),
      Contact.countDocuments({ owner: req.user._id }),
    ]);

    return res.json({ user, counts: { groups: groupsCount, contacts: contactsCount } });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

module.exports = router;
