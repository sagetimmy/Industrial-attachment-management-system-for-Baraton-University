require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth',        require('./routes/auth.routes'));
app.use('/api/students',     require('./routes/student.routes'));
app.use('/api/supervisors', require('./routes/supervisor.routes'));
app.use('/api/admin',       require('./routes/admin.routes'));
app.use('/api/host-orgs',   require('./routes/hostOrg.routes'));
app.use('/api/notifications', require('./routes/notifications.routes'));

app.get('/', (req, res) => {
  res.json({
    message: 'IAMS backend is running',
    api: '/api',
    health: '/api/health',
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'IAMS API is running',
    routes: {
      health: '/api/health',
      auth: '/api/auth',
      students: '/api/students',
      supervisors: '/api/supervisors',
      admin: '/api/admin',
      hostOrgs: '/api/host-orgs',
    },
  });
});

app.get('/api/health', (req, res) => res.json({ status: 'IAMS API running ✅' }));

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => console.log(`Server running on http://${HOST}:${PORT}`));
