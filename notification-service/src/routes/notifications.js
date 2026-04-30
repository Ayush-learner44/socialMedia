const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Internal: called by dm-service when a message is sent — no JWT needed
router.post('/internal/create', async (req, res) => {
  const { user_id, from_user_id, from_username } = req.body;
  try {
    // Upsert: if unread notification already exists from same sender, just update timestamp
    await pool.query(`
      INSERT INTO notifications (user_id, from_user_id, from_username)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, from_user_id)
      DO UPDATE SET read = FALSE, created_at = NOW()
    `, [user_id, from_user_id, from_username]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications — get unread notifications for current user
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM notifications
      WHERE user_id = $1 AND read = FALSE
      ORDER BY created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/read-all — mark all as read
router.put('/read-all', auth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET read = TRUE WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/:fromUserId/read — mark notifications from one user as read
router.put('/:fromUserId/read', auth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET read = TRUE WHERE user_id = $1 AND from_user_id = $2',
      [req.user.id, req.params.fromUserId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
