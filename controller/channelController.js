const { findUser } = require("../models/userModel");
const { parseBody, extractDomainFromEmail } = require("../utils");
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

// add multiple users to the channel
exports.addUserToChannel = async (req, res, next) => {
  try {
    const { emails, channelId } = parseBody(req.body);
    const requestingUserId = req.user.id; // Get ID of user making the request

    // Validate emails array
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return next({
        statusCode: STATUS_CODES.BAD_REQUEST,
        message: "Emails array is required and must not be empty",
      });
    }

    // Remove duplicates and validate email format
    const uniqueEmails = [...new Set(emails)];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = uniqueEmails.filter(
      (email) => !emailRegex.test(email)
    );

    if (invalidEmails.length > 0) {
      return next({
        statusCode: STATUS_CODES.BAD_REQUEST,
        message: `Invalid email format: ${invalidEmails.join(", ")}`,
      });
    }

    const channel = await findChannel({ _id: channelId });
    if (!channel) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Channel not found",
      });
    }

    // check if requesting user is a member of the channel
    if (!channel?.members?.includes(requestingUserId)) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "Only members of the channel can add users",
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

    // Process each email and collect results
    const addedUsers = [];
    const errors = [];
    const usersToAdd = []; // Store valid user IDs to add to channel

    for (const email of uniqueEmails) {
      try {
        // Find user by email
        const user = await findUser({ email });
        if (!user) {
          errors.push(`User with email ${email} not found`);
          continue;
        }

        // Check if user is already a member of the company
        if (user.companyId.toString() !== channel.companyId.toString()) {
          errors.push(`User ${email} is not a member of the company`);
          continue;
        }

        // Check if user is active
        if (!user.isActive) {
          errors.push(`Cannot add inactive user: ${email}`);
          continue;
        }

        // Check if user is already a member of the channel
        if (channel?.members?.includes(user._id)) {
          errors.push(`User ${email} is already a member of the channel`);
          continue;
        }

        // Check if user's email domain matches company domain
        const userDomain = extractDomainFromEmail(email);
        if (userDomain !== company.domain) {
          errors.push(`User ${email} domain does not match company domain`);
          continue;
        }

        // If all validations pass, add to arrays
        usersToAdd.push(user._id);
        addedUsers.push({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        });
      } catch (userError) {
        console.error(`Error processing user ${email}:`, userError);
        errors.push(`Failed to process user ${email}: ${userError.message}`);
      }
    }

    // Add all valid users to channel in a single operation
    let updatedChannel;
    if (usersToAdd.length > 0) {
      try {
        updatedChannel = await addMemberToChannel(
          { _id: channel._id },
          { $push: { members: { $each: usersToAdd } } }
        );
      } catch (updateError) {
        return next({
          statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
          message: `Failed to update channel: ${updateError.message}`,
        });
      }
    }

    // Prepare response
    const response = {
      addedUsers,
      totalAdded: addedUsers.length,
      totalRequested: uniqueEmails.length,
      channelId: channel._id,
      channelName: channel.channelName,
    };

    if (errors.length > 0) {
      response.errors = errors;
      response.failed = errors.length;
    }

    // Determine response status and message
    if (addedUsers.length === 0 && errors.length > 0) {
      // No users added due to errors
      return next({
        statusCode: STATUS_CODES.BAD_REQUEST,
        message: `Failed to add any users to the channel: ${errors.join(", ")}`,
        errors,
      });
    } else if (addedUsers.length === 0) {
      // No users to add (all were already members or duplicates)
      return generateResponse(
        response,
        "No new users to add to the channel",
        res,
        STATUS_CODES.SUCCESS
      );
    } else if (errors.length > 0) {
      // Partial success - some added, some failed
      const message = `${addedUsers.length} users added successfully. ${errors.length} users failed to be added.`;
      return generateResponse(
        response,
        message,
        res,
        STATUS_CODES.PARTIAL_CONTENT
      );
    } else {
      // All users added successfully
      return generateResponse(
        response,
        "All users added to the channel successfully",
        res,
        STATUS_CODES.SUCCESS
      );
    }
  } catch (error) {
    console.error("Error in addUserToChannel:", error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message ?? "Failed to add users to channel",
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
      responseKey: "members",
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
