const bcrypt = require("bcrypt");
const { generateResponse } = require("../../../utils");
const { STATUS_CODES } = require("../../../utils/constants");
const crypto = require("crypto");

// Password related helpers
exports.hashPassword = async (password) => {
  return bcrypt.hash(password, 10);
};

exports.comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

// Token generation helpers
exports.generateJoinToken = () => {
  return crypto.randomBytes(24).toString("hex");
};

// Invite slots helper
exports.createInviteSlots = async (companyId, createManyInviteSlots) => {
  const slots = Array.from(
    { length: parseInt(process.env.INVITE_SLOT_COUNT) },
    (_, i) => ({
      companyId,
      slot: i + 1,
      token: exports.generateJoinToken(),
    })
  );
  return createManyInviteSlots(slots);
};
