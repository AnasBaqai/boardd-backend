// get unused invite slot for the company
const { findInviteSlot } = require("../models/inviteSlotModel");
const { findCompany } = require("../models/companyModel");
const { generateResponse } = require("../utils");
const { STATUS_CODES } = require("../utils/constants");

exports.getUnusedInviteSlot = async (req, res, next) => {
  try {
    const { joinToken } = req?.query;
    // find company by joinToken
    const company = await findCompany({ joinToken });
    if (!company)
      return generateResponse(
        null,
        "company not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    // find unused invite slot for the company
    const unusedInviteSlot = await findInviteSlot({
      companyId: company?._id,
      used: false,
    });
    if (!unusedInviteSlot)
      return generateResponse(
        null,
        "no unused invite slot found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    // generate invite link
    const inviteLink = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/invite/${company?.domain}/${unusedInviteSlot?.token}`;
    // return unused invite slot
    return generateResponse(
      inviteLink,
      "unused invite slot found",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (err) {
    return next(err);
  }
};
