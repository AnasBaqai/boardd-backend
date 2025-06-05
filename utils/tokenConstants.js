/**
 * Token configuration constants
 */

// Access token configuration
exports.ACCESS_TOKEN = {
  EXPIRES_IN: "15m", // 15 minutes
  SECRET_ENV: "JWT_SECRET",
};

// Refresh token configuration
exports.REFRESH_TOKEN = {
  EXPIRES_IN_DAYS: 30, // 30 days for refresh tokens
  SECRET_ENV: "REFRESH_JWT_SECRET",
  SLIDING_THRESHOLD_DAYS: 15, // Extend if token is 15+ days old
  SLIDING_EXTENSION_DAYS: 15, // Add 15 more days when sliding
};

// Security limits
exports.SECURITY_LIMITS = {
  MAX_DEVICES_PER_USER: 5,
  REFRESH_RATE_LIMIT: 10, // Max refresh attempts per minute
  TOKEN_CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
};

// Token error codes
exports.TOKEN_ERRORS = {
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_INVALID: "TOKEN_INVALID",
  TOKEN_MISSING: "TOKEN_MISSING",
  TOKEN_REVOKED: "TOKEN_REVOKED",
  REFRESH_TOKEN_EXPIRED: "REFRESH_TOKEN_EXPIRED",
  REFRESH_TOKEN_INVALID: "REFRESH_TOKEN_INVALID",
  MAX_DEVICES_REACHED: "MAX_DEVICES_REACHED",
};

// Cookie configuration
exports.COOKIE_CONFIG = {
  REFRESH_TOKEN_NAME: "refreshToken",
  HTTP_ONLY: true,
  SECURE: process.env.NODE_ENV === "production", // Only secure in production
  SAME_SITE: "none",
  MAX_AGE: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
};

// Utility functions
exports.calculateRefreshTokenExpiry = () => {
  const expiresAt = new Date();
  expiresAt.setDate(
    expiresAt.getDate() + exports.REFRESH_TOKEN.EXPIRES_IN_DAYS
  );
  return expiresAt;
};

// Sliding expiration utilities
exports.shouldSlideToken = (refreshToken) => {
  const now = new Date();
  const remainingTime = refreshToken.expiresAt - now;
  const remainingDays = remainingTime / (1000 * 60 * 60 * 24);

  // Slide if token has 15+ days remaining
  return remainingDays >= exports.REFRESH_TOKEN.SLIDING_THRESHOLD_DAYS;
};

exports.calculateSlidingExpiry = () => {
  const newExpiresAt = new Date();
  newExpiresAt.setDate(
    newExpiresAt.getDate() + exports.REFRESH_TOKEN.EXPIRES_IN_DAYS
  );
  return newExpiresAt;
};
