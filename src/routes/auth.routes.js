const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware'); // move here

// Signup (customer/owner)
router.post('/signup', authController.signup);

// Login
router.post('/login', authController.login);

// Protected: get current user from token
router.get('/me', verifyToken, (req, res) => {
  res.json({
    success: true,
    message: 'Protected route accessed',
    user: req.user      // { id, role, email, iat, exp }
  });
});

module.exports = router;   // export only once, at the bottom
