const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protects routes by requiring a valid `Authorization: Bearer <token>` header.
// Decodes the JWT, loads the user (minus password), and attaches it to
// req.user for downstream handlers.
async function protect(req, res, next) {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      error: { message: 'Not authorized, no token', status: 401 },
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        error: { message: 'Not authorized, user not found', status: 401 },
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      error: { message: 'Not authorized, token failed', status: 401 },
    });
  }
}

module.exports = { protect };
