const express = require('express');
const cors = require('cors');
const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

app.use('/api/users', usersRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'users' }));

app.listen(PORT, () => console.log(`User service running on port ${PORT}`));
