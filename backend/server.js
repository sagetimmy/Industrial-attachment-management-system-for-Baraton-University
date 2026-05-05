require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth',        require('./routes/auth.routes'));
app.use('/api/supervisors', require('./routes/supervisor.routes'));

app.get('/api/health', (req, res) => res.json({ status: 'IAMS API running ✅' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));