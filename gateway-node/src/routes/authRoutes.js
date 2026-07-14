const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

router.post('/logout', (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
