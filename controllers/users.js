const express = require("express");
const router = express.Router();

const mongoose = require('mongoose');
const User = require('../models/User');
const Contact = require('../models/Contact');
const Group = require('../models/Group');

const verifyToken = require("../middleware/verify-token");

router.use(verifyToken); // Apply auth to everything in this router

/**
 * GET /api/users
 * MVP privacy, return ONLY the signed-in user (no global user list).
 * Later add roles, obtain a full list behind an admin check.
 */
router.get("/", async (req, res) => {
  try {
    const user = await User.findById(
      req.user._id,
      "username email createdAt"
    ).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json([user]); // array to keep response shape consistent with "list"
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/users/me
 * Convenience endpoint to fetch the current user.
 * Supports ?include=counts to get counts of related entities.
 */
router.get("/me", async (req, res) => {
  try {
    const includeCounts = (req.query.include || "")
      .toString()
      .split(",")
      .includes("counts");

    const user = await User.findById(
      req.user._id,
      "username email createdAt"
    ).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!includeCounts) return res.json({ user });

    const [contactsCount, groupsCount] = await Promise.all([
      Contact.countDocuments({ owner: req.user._id }),
      Group.countDocuments({ owner: req.user._id }),
    ]);

    return res.json({
      user,
      counts: {
        contacts: contactsCount,
        groups: groupsCount,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/users/:userId
 * Self-only access. Optionally include counts just like /me.
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    if (req.user._id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const includeCounts = (req.query.include || "")
      .toString()
      .split(",")
      .includes("counts");

    const user = await User.findById(userId, "username email createdAt").lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!includeCounts) return res.json({ user });

    const [contactsCount, groupsCount] = await Promise.all([
      Contact.countDocuments({ owner: req.user._id }),
      Group.countDocuments({ owner: req.user._id }),
    ]);

    return res.json({
      user,
      counts: {
        contacts: contactsCount,
        groups: groupsCount,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
