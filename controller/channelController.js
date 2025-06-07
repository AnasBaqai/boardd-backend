const { findUser } = require("../models/userModel");
const { parseBody } = require("../utils");
const { generateJoinToken } = require("./helpers/users/signup.helper");
const {
  createChannel,
  addMemberToChannel,
  findChannel,
  getAllChannelsDetails,
} = require("../models/channelModel");
const { generateResponse } = require("../utils");
const { STATUS_CODES } = require("../utils/constants");
const { createChannelTab } = require("../models/channelTabsModel");
const {
  createDefaultTabs,
  getAdminsAndMergeMembers,
} = require("./helpers/channelTabs/channelTabs.helper");
const {
  getAllMembersInChannelQuery,
  getAllChannelsOfUserQuery,
} = require("./queries/channelQueries");
const { findCompany } = require("../models/companyModel");

exports.createChannel = async (req, res, next) => {
  try {
    const { channelName, channelDescription, isPrivate } = parseBody(req.body);

    const userId = req.user.id;
    const user = await findUser({ _id: userId });

    // Get all company admins and merge with creator (avoiding duplicates)
    const allMembers = await getAdminsAndMergeMembers(user.companyId, [userId]);

    const channel = await createChannel({
      channelName,
      channelDescription,
      companyId: user.companyId,
      isPrivate,
      createdBy: userId,
      channelToken: generateJoinToken(),
      members: allMembers,
    });

    // create default tabs with admins included
    // const defaultTabs = await createDefaultTabs(
    //   channel._id,
    //   userId,
    //   user.companyId
    // );
    // // create default tabs with promise.all
    // await Promise.all(defaultTabs.map((tab) => createChannelTab(tab)));

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
    const currentUserId = req.user.id;

    // Get current user to check their company
    const currentUser = await findUser({ _id: currentUserId });
    if (!currentUser) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "User not found",
      });
    }

    const channel = await findChannel({ _id: channelId });
    if (!channel) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Channel not found",
      });
    }

    // Security Check: Verify the channel belongs to the user's company
    if (channel.companyId.toString() !== currentUser.companyId.toString()) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message:
          "You can only get joining links for channels from your own company",
      });
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
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message,
    });
  }
};

// add user to the channel
exports.addUserToChannel = async (req, res, next) => {
  try {
    const { email, channelToken } = parseBody(req.body);
    const requestingUserId = req.user.id; // Get ID of user making the request

    const channel = await findChannel({ channelToken });
    if (!channel) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Channel not found",
      });
    }

    // Check if requesting user is the channel creator
    if (channel.createdBy.toString() !== requestingUserId.toString()) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "Only channel creator can add members",
      });
    }

    const user = await findUser({ email });
    if (!user) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "User not found",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "Cannot add inactive user to channel",
      });
    }

    // check if user is already a member of the channel
    if (channel?.members?.includes(user._id)) {
      return next({
        statusCode: STATUS_CODES.CONFLICT,
        message: "User already a member of the channel",
      });
    }

    // Get company details for domain check
    const company = await findCompany({ _id: channel.companyId });
    if (!company) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Company not found",
      });
    }

    // Check if user's email domain matches company domain
    const userDomain = email.split("@")[1];
    if (userDomain !== company.domain) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "User's email domain does not match company domain",
      });
    }

    // add user to the channel
    const updatedChannel = await addMemberToChannel(
      { _id: channel._id },
      { $push: { members: user._id } }
    );
    return generateResponse(
      updatedChannel,
      "User added to the channel",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.log(error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message,
    });
  }
};

// get all members in  channel
exports.getAllMembersInChannel = async (req, res, next) => {
  try {
    const { channelId, page, limit } = req.query;
    const currentUserId = req.user.id; // Get current user ID

    // Get current user to check their company
    const currentUser = await findUser({ _id: currentUserId });
    if (!currentUser) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "User not found",
      });
    }

    const channel = await findChannel({ _id: channelId });
    if (!channel) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Channel not found",
      });
    }

    // Security Check: Verify the channel belongs to the user's company
    if (channel.companyId.toString() !== currentUser.companyId.toString()) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "You can only view members of channels from your own company",
      });
    }

    const membersQuery = getAllMembersInChannelQuery(channelId, currentUserId);
    const result = await getAllChannelsDetails({
      query: membersQuery,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      responseKey: "channel",
    });

    return generateResponse(
      result,
      "Members fetched successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.log(error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message,
    });
  }
};

// get all channels of a user in which he is a member
exports.getAllChannelsOfUser = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const userId = req.user.id;
    const query = getAllChannelsOfUserQuery(userId);

    const channels = await getAllChannelsDetails({
      query,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      responseKey: "channels",
    });

    return generateResponse(
      channels,
      "Channels fetched successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.log(error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message,
    });
  }
};
