const express = require('express');
const router = express.Router();
const {
  register, verifyEmail, resendCode, login,
  refresh, logout,
  forgotPassword, resetPassword, getMe
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register',        register);
router.post('/verify',          verifyEmail);
router.post('/resend-code',     resendCode);
router.post('/login',           login);
router.post('/refresh',         refresh);
router.post('/logout',          logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password',  resetPassword);
router.get('/me',               protect, getMe);

module.exports = router;