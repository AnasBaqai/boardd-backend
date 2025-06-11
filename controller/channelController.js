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
// Import required functions
const {
  findAvailableInviteSlot,
  updateInviteSlot,
  findInviteSlot,
} = require("../models/inviteSlotModel");
const Mailer = require("../utils/mailer");
const { generateChannelInviteEmail } = require("../utils/emailTemplates");
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

    // Get company details
    const company = await findCompany({ _id: channel.companyId });
    if (!company) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Company not found",
      });
    }

    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    // Try to get company slot for main joining link
    const companySlot = await findAvailableInviteSlot({
      companyId: company._id,
      isGuestInviteSlot: false,
    });

    let joiningLink;
    let guestLink = null;
    let errors = [];

    // Generate company link (backward compatible)
    if (companySlot) {
      joiningLink = `${baseUrl}/invite/channel/${companySlot.token}?flow=company`;
    } else {
      // Fallback to old channel token if no company slots available
      joiningLink = `${baseUrl}/join-channel?token=${channel.channelToken}`;
      errors.push("No company invite slots available - using fallback link");
    }

    // Try to get guest slot for additional functionality
    const guestSlot = await findAvailableInviteSlot({
      companyId: company._id,
      isGuestInviteSlot: true,
    });

    if (guestSlot) {
      guestLink = `${baseUrl}/invite/channel/${guestSlot.token}?flow=guest`;
    } else {
      errors.push("No guest invite slots available");
    }

    // Enhanced response - backward compatible with additional features
    const response = {
      // Keep original field name for backward compatibility
      data: joiningLink,

      // Add new guest functionality
      guestLink: guestLink,

      // Additional metadata for frontend (optional to use)
      channelInfo: {
        id: channel._id,
        name: channel.channelName,
        description: channel.channelDescription,
      },

      availability: {
        companySlotsAvailable: !!companySlot,
        guestSlotsAvailable: !!guestSlot,
        errors: errors,
      },
    };

    // Determine message based on availability
    let message = "Channel joining link fetched successfully";
    if (errors.length > 0) {
      message = `Channel joining link fetched with limitations: ${errors.join(
        ", "
      )}`;
    }

    // Send response directly for backward compatibility (avoiding double nesting)
    return res.status(errors.length > 0 ? 206 : 200).json({
      success: true,
      message: message,
      data: joiningLink, // Backward compatible - just the link
      guestLink: guestLink, // New feature
      channelInfo: {
        id: channel._id,
        name: channel.channelName,
        description: channel.channelDescription,
      },
      availability: {
        companySlotsAvailable: !!companySlot,
        guestSlotsAvailable: !!guestSlot,
        errors: errors,
      },
    });
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

    // Filter out demo user email and track for response
    const DEMO_EMAIL = "uncle@boardd.demo";
    const demoEmailsFound = uniqueEmails.filter(
      (email) => email.toLowerCase() === DEMO_EMAIL.toLowerCase()
    );
    const nonDemoEmails = uniqueEmails.filter(
      (email) => email.toLowerCase() !== DEMO_EMAIL.toLowerCase()
    );

    // Handle edge case: Only demo email(s) provided
    if (nonDemoEmails.length === 0 && demoEmailsFound.length > 0) {
      return next({
        statusCode: STATUS_CODES.BAD_REQUEST,
        message:
          "Uncle is a demo user and cannot be added to channels. Please provide other user emails.",
      });
    }

    // Handle edge case: No valid emails after filtering
    if (nonDemoEmails.length === 0) {
      return next({
        statusCode: STATUS_CODES.BAD_REQUEST,
        message: "No valid user emails provided",
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

    // Process each email and collect results (now using nonDemoEmails)
    const addedUsers = [];
    const errors = [];
    const usersToAdd = []; // Store valid user IDs to add to channel

    // Add demo user filtering notice to errors if demo emails were found
    if (demoEmailsFound.length > 0) {
      errors.push(
        `Uncle (demo user) cannot be added to channels - filtered out ${
          demoEmailsFound.length
        } demo email${demoEmailsFound.length > 1 ? "s" : ""}`
      );
    }

    for (const email of nonDemoEmails) {
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
      totalRequested: uniqueEmails.length, // Original total including demo emails
      totalProcessed: nonDemoEmails.length, // Total after filtering demo emails
      channelId: channel._id,
      channelName: channel.channelName,
    };

    // Add demo filtering info to response if demo emails were found
    if (demoEmailsFound.length > 0) {
      response.filteredDemoEmails = demoEmailsFound.length;
    }

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
      // No users to add (all were already members, demo users, or duplicates)
      const message =
        demoEmailsFound.length > 0
          ? "No new users to add to the channel (demo users were filtered out)"
          : "No new users to add to the channel";
      return generateResponse(response, message, res, STATUS_CODES.SUCCESS);
    } else if (errors.length > 0) {
      // Partial success - some added, some failed
      const demoNote =
        demoEmailsFound.length > 0 ? " (demo users were filtered out)" : "";
      const message = `${addedUsers.length} users added successfully. ${errors.length} users failed to be added${demoNote}.`;
      return generateResponse(
        response,
        message,
        res,
        STATUS_CODES.PARTIAL_CONTENT
      );
    } else {
      // All users added successfully
      const demoNote =
        demoEmailsFound.length > 0 ? " (demo users were filtered out)" : "";
      const message = `All users added to the channel successfully${demoNote}`;
      return generateResponse(response, message, res, STATUS_CODES.SUCCESS);
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

// Send channel invite emails
exports.sendChannelInviteEmails = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const {
      emails = [],
      allowGuests = false,
      channelDescription = null,
    } = parseBody(req.body);

    const inviterId = req.user.id;

    // Validate emails array
    if (!emails || emails.length === 0) {
      return next({
        statusCode: STATUS_CODES.BAD_REQUEST,
        message: "Emails array is required and must not be empty",
      });
    }

    // Validate user exists
    const inviter = await findUser({ _id: inviterId });
    if (!inviter) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "User not found",
      });
    }

    // Validate channel exists and user has access
    const channel = await findChannel({ _id: channelId });
    if (!channel) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Channel not found",
      });
    }

    // Check if user is a member of the channel
    if (!channel.members.includes(inviterId)) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "You must be a member of the channel to send invites",
      });
    }

    // Get company details
    const company = await findCompany({ _id: channel.companyId });
    if (!company) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Company not found",
      });
    }

    const results = {
      successful: [],
      failed: [],
    };

    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    // Process each email
    for (const email of emails) {
      try {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return next({
            statusCode: STATUS_CODES.BAD_REQUEST,
            message: "email format not allowed",
          });
        }

        // Determine if this should be a guest invite
        const emailDomain = extractDomainFromEmail(email);
        const isGuestInvite = emailDomain !== company.domain;

        // Validate guest invites are allowed if needed
        if (isGuestInvite && !allowGuests) {
          return next({
            statusCode: STATUS_CODES.FORBIDDEN,
            message:
              "Guest invites not allowed. Only company domain emails permitted.",
          });
        }

        // Find appropriate slot
        let availableSlot;
        if (isGuestInvite) {
          availableSlot = await findAvailableInviteSlot({
            companyId: company._id,
            isGuestInviteSlot: true,
          });
          if (!availableSlot) {
            return next({
              statusCode: STATUS_CODES.NOT_FOUND,
              message: "no guest slot available",
            });
          }
        } else {
          availableSlot = await findAvailableInviteSlot({
            companyId: company._id,
            isGuestInviteSlot: false,
          });
          if (!availableSlot) {
            return next({
              statusCode: STATUS_CODES.NOT_FOUND,
              message: "no company slot available",
            });
          }
        }

        // Check if email already has an invite for this channel
        const existingInvite = await findInviteSlot({
          companyId: company._id,
          channelId: channel._id,
          reservedFor: email,
          used: false,
        });

        if (existingInvite) {
          return next({
            statusCode: STATUS_CODES.NOT_FOUND,
            message: "user already has existing invite on this email",
          });
        }

        // Generate invite link with flow context
        const inviteLink = `${baseUrl}/invite/channel/${
          availableSlot.token
        }?flow=${isGuestInvite ? "guest" : "company"}`;

        // Prepare email content
        const subject = `Join ${channel.channelName} channel at ${company.name}`;
        const { html, text } = generateChannelInviteEmail({
          channelName: channel.channelName,
          companyName: company.name,
          inviteLink,
          inviterName: inviter.name,
          inviterEmail: inviter.email,
          channelDescription,
          isGuestInvite,
        });

        // Send email
        await Mailer.sendEmail({
          email,
          subject,
          message: text,
          html: html,
          replyTo: inviter.email,
        });

        // NOW reserve the slot (only after successful email send)
        await updateInviteSlot(
          { _id: availableSlot._id },
          {
            reserved: true,
            reservedFor: email,
            channelId: channel._id,
            inviteType: isGuestInvite ? "channel_guest" : "channel_company",
            reservedAt: new Date(),
          }
        );

        results.successful.push({
          email,
          inviteType: isGuestInvite ? "guest" : "company",
          inviteLink,
        });
      } catch (error) {
        console.error(`Error processing invite for ${email}:`, error);
        results.failed.push({
          email,
          reason: "Failed to send invite",
        });
      }
    }

    // Determine response
    const totalEmails = emails.length;
    const successfulEmails = results.successful.length;
    const failedEmails = results.failed.length;

    const response = {
      emailInvites: results,
      stats: {
        totalEmailsRequested: totalEmails,
        emailsSentSuccessfully: successfulEmails,
        emailsFailed: failedEmails,
        allowGuests: allowGuests,
      },
      channelInfo: {
        id: channel._id,
        name: channel.channelName,
      },
    };

    if (successfulEmails === 0 && failedEmails > 0) {
      return next({
        statusCode: STATUS_CODES.BAD_REQUEST,
        message: "Failed to send any channel invite emails",
      });
    }

    const message =
      successfulEmails === totalEmails
        ? `All ${successfulEmails} channel invite emails sent successfully`
        : `${successfulEmails} of ${totalEmails} channel invite emails sent successfully`;

    const statusCode =
      failedEmails > 0 ? STATUS_CODES.PARTIAL_CONTENT : STATUS_CODES.SUCCESS;

    return generateResponse(response, message, res, statusCode);
  } catch (error) {
    console.error("Error in sendChannelInviteEmails:", error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message ?? "Failed to send channel invite emails",
    });
  }
};
