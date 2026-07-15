const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Signs a JWT for the given user id, valid for 30 days.
function generateToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

// POST /api/auth/register
async function registerUser(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const err = new Error('User already exists');
      err.status = 400;
      return next(err);
    }

    const user = await User.create({ name, email, password });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      projectId: user.projectId,
      token: generateToken(user._id),
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function loginUser(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      return next(err);
    }

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      projectId: user.projectId,
      token: generateToken(user._id),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function getMe(req, res, next) {
  try {
    // req.user is already loaded (minus password) by the `protect` middleware.
    res.status(200).json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      projectId: req.user.projectId,
      role: req.user.role,
      widgetSettings: req.user.widgetSettings,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { generateToken, registerUser, loginUser, getMe };
