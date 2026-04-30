const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/messages/conversations — list everyone you've DMed (with last message)
router.get('/conversations', auth, async (req, res) => {
  const myId = req.user.id;
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (other_id)
        other_id,
        other_username,
        content AS last_message,
        created_at
      FROM (
        SELECT
          CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS other_id,
          CASE WHEN sender_id = $1 THEN receiver_username ELSE sender_username END AS other_username,
          content,
          created_at
        FROM messages
        WHERE sender_id = $1 OR receiver_id = $1
        ORDER BY created_at DESC
      ) sub
      ORDER BY other_id, created_at DESC
    `, [myId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/:userId — full conversation with a user
router.get('/:userId', auth, async (req, res) => {
  const myId = req.user.id;
  const otherId = req.params.userId;
  try {
    const result = await pool.query(`
      SELECT * FROM messages
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at ASC
    `, [myId, otherId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages/:userId — send a message to a user
router.post('/:userId', auth, async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim())
    return res.status(400).json({ error: 'Message cannot be empty' });

  const myId = req.user.id;
  const otherId = req.params.userId;

  if (String(myId) === String(otherId))
    return res.status(400).json({ error: 'Cannot message yourself' });

  try {
    const result = await pool.query(
      `INSERT INTO messages (sender_id, sender_username, receiver_id, receiver_username, content)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [myId, req.user.username, otherId, req.body.receiver_username || '', content.trim()]
    );

    // Notify receiver (fire and forget)
    fetch('http://notification-service:3005/api/notifications/internal/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: otherId, from_user_id: myId, from_username: req.user.username }),
    }).catch(() => {});

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
