const jwt = require('jsonwebtoken');

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

const sendTokenCookie = (res, token) => {
  const days = Number(process.env.COOKIE_EXPIRES_DAYS || 7);
  res.cookie('nova_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: days * 24 * 60 * 60 * 1000
  });
};

module.exports = { generateToken, sendTokenCookie };
