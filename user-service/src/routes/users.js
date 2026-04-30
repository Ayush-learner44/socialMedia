const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Internal: called by auth-service on register — no JWT needed
router.post('/internal/create', async (req, res) => {
  const { user_id, username } = req.body;
  try {
    await pool.query(
      'INSERT INTO profiles (user_id, username) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING',
      [user_id, username]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id — get profile
router.get('/:id', async (req, res) => {
  try {
    let result = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [req.params.id]);
    if (!result.rows.length) {
      result = await pool.query(
        'INSERT INTO profiles (user_id, username, bio) VALUES ($1, $2, $3) RETURNING *',
        [req.params.id, `user_${req.params.id}`, '']
      );
    }

    const [followersRes, followingRes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM follows WHERE following_id = $1', [req.params.id]),
      pool.query('SELECT COUNT(*) FROM follows WHERE follower_id = $1', [req.params.id]),
    ]);

    res.json({
      ...result.rows[0],
      followers_count: parseInt(followersRes.rows[0].count),
      following_count: parseInt(followingRes.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id/is-following/:targetId
router.get('/:id/is-following/:targetId', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
      [req.params.id, req.params.targetId]
    );
    res.json({ following: result.rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id — update profile
router.put('/:id', auth, async (req, res) => {
  if (String(req.user.id) !== String(req.params.id))
    return res.status(403).json({ error: 'Forbidden' });

  const { bio, avatar_url, username } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO profiles (user_id, username, bio, avatar_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET username = $2, bio = $3, avatar_url = $4
       RETURNING *`,
      [req.params.id, username, bio || '', avatar_url || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/:id/follow
router.post('/:id/follow', auth, async (req, res) => {
  if (String(req.user.id) === String(req.params.id))
    return res.status(400).json({ error: 'Cannot follow yourself' });
  try {
    await pool.query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.id]
    );
    res.json({ message: 'Followed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id/follow
router.delete('/:id/follow', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
      [req.user.id, req.params.id]
    );
    res.json({ message: 'Unfollowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
