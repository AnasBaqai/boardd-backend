const { findChannel } = require("../models/channelModel");
const {
  updateChannelTab,
  findChannelTab,
  getAllTabs,
  createChannelTab,
} = require("../models/channelTabsModel");
const { generateResponse, parseBody } = require("../utils");
const mongoose = require("mongoose");
const { STATUS_CODES } = require("../utils/constants");
const {
  getAllTabsOfMemberInChannelQuery,
  getAllTabMembersQuery,
} = require("./queries/channelTabsQuery");
const { findCompany } = require("../models/companyModel");
const { findUser } = require("../models/userModel");

exports.addMembersToChannelTab = async (req, res, next) => {
  try {
    const { channelId, assignments } = parseBody(req.body);
    const requestingUserId = req.user.id; // Get ID of user making the request

    // Get current user to check their company
    const currentUser = await findUser({ _id: requestingUserId });
    if (!currentUser) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "User not found",
      });
    }

    const channel = await findChannel({ _id: channelId });
    if (!channel)
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Channel not found",
      });

    // Security Check: Verify the channel belongs to the user's company
    if (channel.companyId.toString() !== currentUser.companyId.toString()) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "You can only manage tabs from channels in your own company",
      });
    }

    // Check if requesting user is the channel creator
    if (channel.createdBy.toString() !== requestingUserId.toString()) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "Only channel creator can add members",
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

    try {
      // First validate all tabs and check for duplicates
      const validationPromises = assignments.map(async (assignment) => {
        const { tabId, memberids } = assignment;

        // Validate tab exists
        const tab = await findChannelTab({ _id: tabId });
        if (!tab) {
          throw new Error(`Tab with ID ${tabId} not found`);
        }

        // Validate each user in memberids
        for (const memberId of memberids) {
          const user = await findUser({ _id: memberId });
          if (!user) {
            throw new Error(`User with ID ${memberId} not found`);
          }

          // Check if user is active
          if (!user.isActive) {
            throw new Error(`Cannot add inactive user: ${user.email}`);
          }

          // Check user's domain
          const userDomain = user.email.split("@")[1];
          if (userDomain !== company.domain) {
            throw new Error(
              `User ${user.email} domain does not match company domain`
            );
          }

          // Check if user is already a member
          const existingMembers = tab.members || [];
          if (
            existingMembers.some((id) => id.toString() === memberId.toString())
          ) {
            throw new Error(
              `User ${user.email} is already a member of this tab`
            );
          }
        }

        return { tabId, memberids };
      });

      // Wait for all validations to complete
      const validatedAssignments = await Promise.all(validationPromises);

      // If we get here, all validations passed, so we can do updates in parallel
      const updatePromises = validatedAssignments.map(
        ({ tabId, memberids }) => {
          return updateChannelTab(
            { _id: tabId },
            { $push: { members: { $each: memberids } } }
          );
        }
      );

      // Wait for all updates to complete
      await Promise.all(updatePromises);

      return generateResponse(
        null,
        "Members added to tabs successfully",
        res,
        STATUS_CODES.SUCCESS
      );
    } catch (error) {
      return next({
        statusCode: STATUS_CODES.BAD_REQUEST,
        message: `Failed to add members: ${error.message}`,
      });
    }
  } catch (error) {
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message,
    });
  }
};

//get all tabs of a channel in which the user is a member
exports.getAllTabsOfChannel = async (req, res, next) => {
  try {
    const { channelId, page, limit } = req.query;
    const userId = req.user.id; // Get the current user's ID

    // Get current user to check their company
    const currentUser = await findUser({ _id: userId });
    if (!currentUser) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "User not found",
      });
    }

    const channel = await findChannel({ _id: channelId });
    if (!channel)
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Channel not found",
      });

    // Security Check: Verify the channel belongs to the user's company
    if (channel.companyId.toString() !== currentUser.companyId.toString()) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "You can only access tabs from channels in your own company",
      });
    }

    // Use the query to get only tabs where the user is a member
    const query = getAllTabsOfMemberInChannelQuery(channelId, userId);
    const tabs = await getAllTabs({
      query,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      responseKey: "tabs",
    });

    return generateResponse(
      tabs,
      "Tabs fetched successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message,
    });
  }
};

// get all members of a tab
exports.getAllTabMembers = async (req, res, next) => {
  try {
    const { tabId } = req.params;
    const userId = req.user.id;

    // Get current user to check their company
    const currentUser = await findUser({ _id: userId });
    if (!currentUser) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "User not found",
      });
    }

    // Find the tab
    const tab = await findChannelTab({ _id: tabId });
    if (!tab) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Tab not found",
      });
    }

    // Security Check: Verify the tab belongs to the user's company
    if (tab.companyId.toString() !== currentUser.companyId.toString()) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "You can only access tabs from your own company",
      });
    }

    // Check if the requesting user is a member of the tab
    if (!tab.members.includes(userId)) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "You are not a member of this tab",
      });
    }

    // Get all members with their details
    const query = getAllTabMembersQuery(tabId);
    const result = await getAllTabs({
      query,
      page: 1,
      limit: 1,
      responseKey: "tab",
    });

    if (!result.tab.length) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "No members found",
      });
    }

    return generateResponse(
      result.tab[0],
      "Tab members fetched successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.error("Error in getAllTabMembers:", error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message,
    });
  }
};

// create a new tab
exports.createNewChannelTab = async (req, res, next) => {
  try {
    const { tabName, channelId, isPrivate } = parseBody(req.body);
    const userId = req.user.id;

    // Get current user to check their company
    const currentUser = await findUser({ _id: userId });
    if (!currentUser) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "User not found",
      });
    }

    // find channel
    const channel = await findChannel({ _id: channelId });
    if (!channel)
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Channel not found",
      });

    // Security Check: Verify the channel belongs to the user's company
    if (channel.companyId.toString() !== currentUser.companyId.toString()) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "You can only create tabs in channels from your own company",
      });
    }

    // create channel tab
    const channelTabBody = {
      channelId,
      tabName,
      members: [userId],
      createdBy: userId,
      companyId: channel.companyId,
      isPrivate,
    };
    const newChannelTab = await createChannelTab(channelTabBody);
    return generateResponse(
      newChannelTab,
      "New channel tab successfully created",
      res,
      STATUS_CODES.CREATED
    );
  } catch (err) {
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: err?.message,
    });
  }
};
