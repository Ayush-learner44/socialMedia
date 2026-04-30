const express = require('express');
const cors = require('cors');
const pool = require('./db');
const postsRoutes = require('./routes/posts');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.use('/api/posts', postsRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'posts' }));

pool.query(`
  CREATE TABLE IF NOT EXISTS likes (
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
  )
`).then(() => {
  app.listen(PORT, () => console.log(`Post service running on port ${PORT}`));
}).catch(err => {
  console.error('DB init failed:', err.message);
  process.exit(1);
});
