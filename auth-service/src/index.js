const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'auth' }));

app.listen(PORT, () => console.log(`Auth service running on port ${PORT}`));
