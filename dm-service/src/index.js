const express = require('express');
const cors = require('cors');
const pool = require('./db');
const messagesRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

app.use('/api/messages', messagesRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'dm' }));

pool.query(`
  CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL,
    sender_username VARCHAR(50) NOT NULL,
    receiver_id INTEGER NOT NULL,
    receiver_username VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).then(() => {
  app.listen(PORT, () => console.log(`DM service running on port ${PORT}`));
}).catch(err => {
  console.error('DB init failed:', err.message);
  process.exit(1);
});
