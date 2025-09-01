// controllers/contacts.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Contact = require('../models/Contact');
const Group = require('../models/Group');
const verifyToken = require('../middleware/verify-token');

// Auth guard for all routes
router.use(verifyToken);

// Defensive guard in case verifyToken didn't attach a user
router.use((req, res, next) => {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

const isId = mongoose.isValidObjectId;

// Helper: Sync Contact.groups <-> Group.members
async function syncContactGroupMembership({ session, ownerId, contactId, incomingGroupIds }) {
  // Ensure incoming group ids are valid & owned by the user
  const validGroups = incomingGroupIds?.length
    ? await Group.find(
        { _id: { $in: incomingGroupIds }, owner: ownerId },
        { _id: 1 }
      ).session(session)
    : [];
  const validIds = validGroups.map(g => g._id.toString());

  // Load current groups on the contact
  const currentContact = await Contact.findOne(
    { _id: contactId, owner: ownerId },
    { groups: 1 }
  ).lean().session(session);

  const currentIds = (currentContact?.groups || []).map(id => id.toString());

  // Diff
  const toAdd = validIds.filter(id => !currentIds.includes(id));
  const toRemove = currentIds.filter(id => !validIds.includes(id));

  // Update contact.groups to exactly the valid set
  await Contact.updateOne(
    { _id: contactId, owner: ownerId },
    { $set: { groups: validIds } },
    { session }
  );

  // Add/remove contact in group.members accordingly
  if (toAdd.length) {
    await Group.updateMany(
      { _id: { $in: toAdd }, owner: ownerId },
      { $addToSet: { members: contactId } },
      { session }
    );
  }
  if (toRemove.length) {
    await Group.updateMany(
      { _id: { $in: toRemove }, owner: ownerId },
      { $pull: { members: contactId } },
      { session }
    );
  }
}
//=== Routes ===
// GET /api/contacts  -> list current user's contacts (supports ?group=<id>)
router.get('/', async (req, res, next) => {
  try {
    const ownerId = req.user._id;
    const { group } = req.query;

    const query = { owner: ownerId };
    if (group && isId(group)) {
      // Only contacts whose groups array contains this group id
      query.groups = group;
    }

    const contacts = await Contact.find(query)
      .sort({ lastName: 1, firstName: 1, createdAt: -1 })
      .lean();

    return res.json(contacts);
  } catch (err) {
    return next(err);
  }
});

// POST /api/contacts -> create (and sync groups if provided)
router.post('/', async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const ownerId = req.user._id;
    const payload = req.body || {};

    // Basic input sanity (extend as needed)
    if (payload.email && typeof payload.email !== 'string') {
      return res.status(400).json({ error: 'Invalid email' });
    }

    const {
      firstName, lastName, email, phone, city, country, notes,
      groups, firstConnectedAt, lastConnectedAt
    } = payload;

    let created;
    await session.withTransaction(async () => {
      // Create contact with empty groups first; sync after
      const doc = await Contact.create([{
        owner: ownerId,
        firstName, lastName, email, phone, city, country, notes,
        groups: [],
        firstConnectedAt, lastConnectedAt
      }], { session });

      created = doc[0];

      if (Array.isArray(groups)) {
        const incomingGroupIds = groups.filter(isId);
        await syncContactGroupMembership({
          session, ownerId, contactId: created._id, incomingGroupIds
        });
      }
    });

    const saved = await Contact.findOne({ _id: created._id, owner: ownerId }).lean();
    return res.status(201).json(saved);
  } catch (err) {
    if (err?.name === 'ValidationError' || err?.name === 'CastError') {
      return res.status(400).json({ error: err.message });
    }
    return next(err);
  } finally {
    session.endSession();
  }
});

// GET /api/contacts/:id -> read one (self-owned)
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const doc = await Contact.findOne({ _id: id, owner: req.user._id }).lean();
    if (!doc) return res.status(404).json({ error: 'Not found' });
    return res.json(doc);
  } catch (err) {
    return next(err);
  }
});

// PUT /api/contacts/:id -> update (self-owned) and sync groups if provided
router.put('/:id', async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.params;
    if (!isId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const ownerId = req.user._id;
    const payload = req.body || {};
    const {
      groups, // may be undefined; only sync if it's an array
      ...rest
    } = payload;

    let updated;
    await session.withTransaction(async () => {
      // Update scalar fields first
      updated = await Contact.findOneAndUpdate(
        { _id: id, owner: ownerId },
        { $set: rest },
        { new: true, runValidators: true, session }
      );

      if (!updated) {
        // Abort transaction by returning an error response directly
        return res.status(404).json({ error: 'Not found' });
      }

      // If groups provided, sync both sides
      if (Array.isArray(groups)) {
        const incomingGroupIds = groups.filter(isId);
        await syncContactGroupMembership({
          session, ownerId, contactId: updated._id, incomingGroupIds
        });
        // Reload after sync for accurate response
        updated = await Contact.findOne({ _id: id, owner: ownerId }).session(session);
      }
    });

    if (!updated) return; // response already sent inside transaction if not found
    return res.json(updated.toObject());
  } catch (err) {
    if (err?.name === 'ValidationError' || err?.name === 'CastError') {
      return res.status(400).json({ error: err.message });
    }
    return next(err);
  } finally {
    session.endSession();
  }
});

// DELETE /api/contacts/:id -> delete (self-owned) and pull from groups.members
router.delete('/:id', async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.params;
    if (!isId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const ownerId = req.user._id;

    await session.withTransaction(async () => {
      const deleted = await Contact.findOneAndDelete(
        { _id: id, owner: ownerId },
        { session }
      ).lean();

      if (!deleted) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Remove this contact from all groups owned by the user
      await Group.updateMany(
        { owner: ownerId },
        { $pull: { members: id } },
        { session }
      );

      return res.status(204).end();
    });
  } catch (err) {
    return next(err);
  } finally {
    session.endSession();
  }
});

module.exports = router;