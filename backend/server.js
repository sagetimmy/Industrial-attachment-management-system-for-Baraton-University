require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// ── CORS fix for web browser ──
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors()); // handle preflight requests

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth',          require('./routes/auth.routes'));
app.use('/api/students',      require('./routes/student.routes'));
app.use('/api/supervisors',   require('./routes/supervisor.routes'));
app.use('/api/admin',         require('./routes/admin.routes'));
app.use('/api/activities',    require('./routes/activities.routes'));
app.use('/api/applications',  require('./routes/applications.routes'));
app.use('/api/host-orgs',     require('./routes/hostOrg.routes'));
app.use('/api/notifications', require('./routes/notifications.routes'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/avatar', require('./routes/avatar.routes'));

app.get('/', (req, res) => res.json({ message: 'IAMS backend is running' }));
app.get('/api', (req, res) => res.json({ message: 'IAMS API is running' }));
app.get('/api/health', (req, res) => res.json({ status: 'IAMS API running ✅' }));

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, () => console.log(`Server running on http://${HOST}:${PORT}`));
server.setTimeout(60000);
server.keepAliveTimeout = 60000;
server.headersTimeout = 65000;