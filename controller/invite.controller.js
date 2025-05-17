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

    // generate hashmap for invite links
    const inviteLinks = {
      private: `${process.env.FRONTEND_URL || "http://localhost:3000"}/invite/${
        company?.domain
      }/${unusedInviteSlot?.token}`,
      public: `${process.env.FRONTEND_URL || "http://localhost:3000"}/invite/${
        company?.domain
      }/${joinToken}`,
    };
    // return unused invite slot
    return generateResponse(
      inviteLinks,
      "unused invite slot found",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (err) {
    return next(err);
  }
};
