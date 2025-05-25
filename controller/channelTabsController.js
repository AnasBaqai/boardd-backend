const { findChannel } = require("../models/channelModel");
const {
  updateChannelTab,
  findChannelTab,
  getAllTabs,
} = require("../models/channelTabsModel");
const { generateResponse, parseBody } = require("../utils");
const mongoose = require("mongoose");
const { validateRequiredFields } = require("./helpers/users/signup.helper");
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

    const validationError = validateRequiredFields(
      { channelId, assignments },
      res
    );
    if (validationError) return validationError;

    const channel = await findChannel({ _id: channelId });
    if (!channel)
      return generateResponse(
        null,
        "Channel not found",
        res,
        STATUS_CODES.NOT_FOUND
      );

    // Check if requesting user is the channel creator
    if (channel.createdBy.toString() !== requestingUserId.toString()) {
      return generateResponse(
        null,
        "Only channel creator can add members",
        res,
        STATUS_CODES.FORBIDDEN
      );
    }

    // Get company details for domain check
    const company = await findCompany({ _id: channel.companyId });
    if (!company) {
      return generateResponse(
        null,
        "Company not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
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
      return generateResponse(
        null,
        `Failed to add members: ${error.message}`,
        res,
        STATUS_CODES.BAD_REQUEST
      );
    }
  } catch (error) {
    next(error);
  }
};

//get all tabs of a channel in which the user is a member
exports.getAllTabsOfChannel = async (req, res, next) => {
  try {
    const { channelId, page, limit } = req.query;
    const userId = req.user.id; // Get the current user's ID
    const validationError = validateRequiredFields({ channelId }, res);
    if (validationError) return validationError;

    const channel = await findChannel({ _id: channelId });
    if (!channel)
      return generateResponse(
        null,
        "Channel not found",
        res,
        STATUS_CODES.NOT_FOUND
      );

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
    next(error);
  }
};

// get all members of a tab
exports.getAllTabMembers = async (req, res, next) => {
  try {
    const { tabId } = req.params;
    const userId = req.user.id;

    // Validate tabId
    if (!tabId) {
      return generateResponse(
        null,
        "Tab ID is required",
        res,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Find the tab
    const tab = await findChannelTab({ _id: tabId });
    if (!tab) {
      return generateResponse(
        null,
        "Tab not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }

    // Check if the requesting user is a member of the tab
    if (!tab.members.includes(userId)) {
      return generateResponse(
        null,
        "You are not a member of this tab",
        res,
        STATUS_CODES.FORBIDDEN
      );
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
      return generateResponse(
        null,
        "No members found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }

    return generateResponse(
      result.tab[0],
      "Tab members fetched successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.error("Error in getAllTabMembers:", error);
    next(error);
  }
};
