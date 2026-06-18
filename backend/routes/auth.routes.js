const express = require('express');
const router = express.Router();
const { getMe } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

/**
 * Legacy authentication endpoints are now handled directly by the Supabase Auth client on the frontend.
 * The backend only provides the /me endpoint to fetch extended user profile information.
 */

router.get('/me', protect, getMe);

module.exports = router;
