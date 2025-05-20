const { findUser } = require("../models/userModel");
const { parseBody } = require("../utils");
const { generateJoinToken } = require("./helpers/users/signup.helper");
const { createChannel } = require("../models/channelModel");
const { generateResponse } = require("../utils");
const { STATUS_CODES } = require("../utils/constants");
const { validateRequiredFields } = require("./helpers/users/signup.helper");

exports.createChannel = async (req, res, next) => {
  try {
    const { channelName, channelDescription, isPrivate } = parseBody(req.body);
    const validationError = validateRequiredFields(
      {
        channelName,
        channelDescription,
        isPrivate,
      },
      res
    );
    if (validationError) return validationError;

    const userId = req.user.id;
    const user = await findUser({ _id: userId });
    const channel = await createChannel({
      channelName,
      channelDescription,
      companyId: user.companyId,
      isPrivate,
      createdBy: userId,
      channelToken: generateJoinToken(),
    });

    return generateResponse(
      channel,
      "Channel created successfully",
      res,
      STATUS_CODES.CREATED
    );
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// get channel joining link
exports.getChannelJoiningLink = async (req, res, next) => {
  try {
    const { channelId } = req.query;
    const validationError = validateRequiredFields(
      {
        channelId,
      },
      res
    );
    if (validationError) return validationError;

    const channel = await findChannel({ _id: channelId });
    if (!channel) {
      return generateResponse(
        null,
        "Channel not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }
    const joiningLink = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/join-channel?token=${channel.channelToken}`;

    return generateResponse(
      joiningLink,
      "Channel joining link fetched successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.log(error);
    next(error);
  }
};
