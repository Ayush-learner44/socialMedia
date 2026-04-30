const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/posts — public feed with like counts
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id)::int AS like_count
      FROM posts p
      ORDER BY p.created_at DESC LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/posts/user/:userId — posts by a specific user with like counts
router.get('/user/:userId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id)::int AS like_count
      FROM posts p
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
    `, [req.params.userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts — create a post (auth required)
router.post('/', auth, async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim())
    return res.status(400).json({ error: 'Content required' });

  try {
    const result = await pool.query(
      'INSERT INTO posts (user_id, username, content) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, req.user.username, content.trim()]
    );
    res.status(201).json({ ...result.rows[0], like_count: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/posts/:id — delete own post
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (!result.rows.length)
      return res.status(404).json({ error: 'Post not found or not yours' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts/:id/like — like a post
router.post('/:id/like', auth, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, req.user.id]
    );
    const result = await pool.query(
      'SELECT COUNT(*)::int AS like_count FROM likes WHERE post_id = $1',
      [req.params.id]
    );
    res.json({ like_count: result.rows[0].like_count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/posts/:id/like — unlike a post
router.delete('/:id/like', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM likes WHERE post_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    const result = await pool.query(
      'SELECT COUNT(*)::int AS like_count FROM likes WHERE post_id = $1',
      [req.params.id]
    );
    res.json({ like_count: result.rows[0].like_count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
