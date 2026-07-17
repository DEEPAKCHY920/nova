const jwt = require('jsonwebtoken');
const asyncHandler = require('./asyncHandler');
const User = require('../models/User');

// Reads the JWT from the httpOnly cookie set at login, or from an Authorization: Bearer header
// (useful for non-browser clients / testing with curl or Postman).
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.nova_token) {
    token = req.cookies.nova_token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      res.status(401);
      throw new Error('Not authorized, user not found');
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401);
    throw new Error('Not authorized, token invalid or expired');
  }
});

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  res.status(403);
  throw new Error('Admin access required');
};

module.exports = { protect, admin };
