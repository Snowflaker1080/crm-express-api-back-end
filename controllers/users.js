// controllers/users.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const User = require("../models/User");
const Contact = require("../models/Contact");
const Group = require("../models/Group");

const verifyToken = require("../middleware/verify-token");

// Apply auth to everything in this router
router.use(verifyToken);

/**
 * GET /api/users
 * MVP privacy: return ONLY the signed-in user (array shape for "list" parity)
 */
router.get("/", async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("username email createdAt")
      .lean();

    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json([user]);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

/**
 * GET /api/users/me?include=counts
 * Convenience endpoint to fetch the current user (and optional counts)
 */
router.get("/me", async (req, res) => {
  try {
    const includeCounts = String(req.query.include || "") === "counts";

    // verifyToken has already loaded the user; avoid re-query unless you prefer
    const user = req.user; // selected without password in verifyToken
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!includeCounts) return res.json({ user });

    const [groupsCount, contactsCount] = await Promise.all([
      Group.countDocuments({ owner: req.user._id }),
      Contact.countDocuments({ owner: req.user._id }),
    ]);

    return res.json({
      user,
      counts: { groups: groupsCount, contacts: contactsCount },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

/**
 * GET /api/users/:userId
 * Self-only access. Supports ?include=counts like /me.
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const includeCounts = (req.query.include || "")
      .toString()
      .split(",")
      .includes("counts");

    const user = await User.findById(userId)
      .select("username email createdAt")
      .lean();

    if (!user) return res.status(404).json({ error: "User not found" });

    if (!includeCounts) return res.json({ user });

    const [contactsCount, groupsCount] = await Promise.all([
      Contact.countDocuments({ owner: req.user._id }),
      Group.countDocuments({ owner: req.user._id }),
    ]);

    return res.json({
      user,
      counts: { contacts: contactsCount, groups: groupsCount },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

module.exports = router;
