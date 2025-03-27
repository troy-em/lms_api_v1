require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET,
  jwtExpiration: process.env.JWT_EXPIRATION || "1h",
  jwtExpirationShort: process.env.JWT_EXPIRATION_SHORT || "3m",
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || 86400,   // 24 hours
};
