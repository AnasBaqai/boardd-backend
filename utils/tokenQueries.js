/**
 * Token query helpers to use with existing updateUser and findUser functions
 * These replace the removed specialized token functions
 */

// Query to find user by refresh token
// Use with: findUser(TOKEN_QUERIES.findByRefreshToken(token))
exports.findByRefreshToken = (token) => ({
  "refreshTokens.token": token,
  "refreshTokens.isActive": true,
  "refreshTokens.expiresAt": { $gt: new Date() },
});

// Update queries for refresh tokens
// Use with: updateUser(query, update)
exports.UPDATE_QUERIES = {
  // Update token last used
  // updateUser({ _id: userId, "refreshTokens.token": token }, UPDATE_QUERIES.updateLastUsed())
  updateLastUsed: () => ({
    $set: { "refreshTokens.$.lastUsedAt": new Date() },
  }),

  // Remove specific token
  // updateUser({ _id: userId }, UPDATE_QUERIES.removeToken(token))
  removeToken: (token) => ({
    $pull: { refreshTokens: { token: token } },
  }),

  // Remove all tokens (logout all devices)
  // updateUser({ _id: userId }, UPDATE_QUERIES.removeAllTokens())
  removeAllTokens: () => ({
    $set: { refreshTokens: [] },
  }),

  // Update token expiration (sliding expiration)
  // updateUser({ _id: userId, "refreshTokens.token": token }, UPDATE_QUERIES.updateExpiration(newExpiresAt))
  updateExpiration: (newExpiresAt) => ({
    $set: {
      "refreshTokens.$.expiresAt": newExpiresAt,
      "refreshTokens.$.lastUsedAt": new Date(),
    },
  }),
};
