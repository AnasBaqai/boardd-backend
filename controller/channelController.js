const { findUser } = require("../models/userModel");
const { parseBody } = require("../utils");
const { generateJoinToken } = require("./helpers/users/signup.helper");
const {
  createChannel,
  addMemberToChannel,
  findChannel,
} = require("../models/channelModel");
const { generateResponse } = require("../utils");
const { STATUS_CODES } = require("../utils/constants");
const { validateRequiredFields } = require("./helpers/users/signup.helper");
const Mailer = require("../utils/mailer");

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

// add user to the channel
exports.addUserToChannel = async (req, res, next) => {
  try {
    const { email, channelToken } = parseBody(req.body);

    const validationError = validateRequiredFields(
      {
        email,
        channelToken,
      },
      res
    );
    if (validationError) return validationError;

    const channel = await findChannel({ channelToken });
    if (!channel) {
      return generateResponse(
        null,
        "Channel not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }

    const user = await findUser({ email });
    if (!user) {
      return generateResponse(
        null,
        "User not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }

    // check if user is already a member of the channel
    if (channel?.members?.includes(user._id)) {
      return generateResponse(
        null,
        "User already a member of the channel",
        res,
        STATUS_CODES.CONFLICT
      );
    }
    // check if user company is the same as the channel company
    if (user.companyId !== channel.companyId) {
      return generateResponse(
        null,
        "User not a member of the company",
        res,
        STATUS_CODES.CONFLICT
      );
    }
    // add user to the channel
    return generateResponse(
      null,
      "User added to the channel",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.log(error);
    next(error);
  }
};
