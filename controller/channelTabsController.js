const { findChannel } = require("../models/channelModel");
const {
  updateChannelTab,
  findChannelTab,
} = require("../models/channelTabsModel");
const { generateResponse, parseBody } = require("../utils");
const mongoose = require("mongoose");
const { validateRequiredFields } = require("./helpers/users/signup.helper");
const { STATUS_CODES } = require("../utils/constants");

exports.addMembersToChannelTab = async (req, res, next) => {
  try {
    const { channelId, assignments } = parseBody(req.body);
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

    try {
      // First validate all tabs and check for duplicates
      const validationPromises = assignments.map(async (assignment) => {
        const { tabId, memberids } = assignment;

        // Validate tab exists
        const tab = await findChannelTab({ _id: tabId });
        if (!tab) {
          throw new Error(`Tab with ID ${tabId} not found`);
        }

        // Check if any users are already members of this tab
        const existingMembers = tab.members || [];
        const duplicateMembers = memberids.filter((id) =>
          existingMembers.some(
            (memberId) => memberId.toString() === id.toString()
          )
        );

        if (duplicateMembers.length > 0) {
          throw new Error(
            `Some users are already members of this tab: ${duplicateMembers.join(
              ", "
            )}`
          );
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
