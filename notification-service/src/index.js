const express = require('express');
const cors = require('cors');
const pool = require('./db');
const notificationsRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

app.use('/api/notifications', notificationsRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'notifications' }));

pool.query(`
  CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    from_user_id INTEGER NOT NULL,
    from_username VARCHAR(50) NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, from_user_id)
  )
`).then(() => {
  app.listen(PORT, () => console.log(`Notification service running on port ${PORT}`));
}).catch(err => {
  console.error('DB init failed:', err.message);
  process.exit(1);
});
