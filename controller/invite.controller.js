"use strict";

// get unused invite slot for the company
const { generateResponse } = require("../utils");
const { STATUS_CODES, ROLES } = require("../utils/constants");
const { findCompany } = require("../models/companyModel");
const {
  findInviteSlot,
  updateInviteSlot,
  findAvailableInviteSlot,
} = require("../models/inviteSlotModel");
const Mailer = require("../utils/mailer");
const crypto = require("crypto");
const { generateInviteEmail } = require("../utils/emailTemplates");

/**
 * Get unused invite slots for admin to share
 * @param {Object} req - Request object
 * @param {Object} req.query.joinToken - Company's public join token
 * @param {Object} req.user - Authenticated admin user
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 * @returns {Object} Response with public and private invite links
 */
exports.getUnusedInviteSlot = async (req, res, next) => {
  try {
    const { joinToken } = req?.query;
    const adminUserId = req.user.id;
    const adminUser = await findUser({ _id: adminUserId });
    // Find company by joinToken or admin's company ID
    let company;
    if (joinToken) {
      company = await findCompany({ joinToken });
    } else if (adminUser?.companyId) {
      company = await findCompany({ _id: adminUser.companyId });
    }

    if (!company) {
      return generateResponse(
        null,
        "Company not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }

    // Find unused and unreserved invite slot for the company
    const unusedInviteSlot = await findAvailableInviteSlot({
      companyId: company._id,
    });

    if (!unusedInviteSlot) {
      return generateResponse(
        null,
        "No unused invite slots available",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }

    // Generate hashmap for invite links
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const inviteLinks = {
      private: `${baseUrl}/signin?companyId=${company.domain}&token=${unusedInviteSlot.token}`,
      public: `${baseUrl}/signin?companyId=${company.domain}&joinToken=${company.joinToken}`,
    };

    return generateResponse(
      inviteLinks,
      "Invite links generated successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.error("Error in getUnusedInviteSlot:", error);
    return next(error);
  }
};

// Add a new function to check if an email already has a reserved slot
const checkEmailAlreadyInvited = async (email, companyId) => {
  const existingInvite = await findInviteSlot({
    companyId,
    reservedFor: email,
    used: false,
  });
  return existingInvite !== null;
};

/**
 * Send invites to multiple users with different roles
 * @param {Object} req - Request object
 * @param {Object} req.body.invites - HashMap of email:role pairs
 * @param {Object} req.user - Authenticated user (admin)
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 * @returns {Object} Response with success/error message
 */
exports.sendBulkInvites = async (req, res, next) => {
  try {
    const { invites } = req.body;
    const adminUser = req.user;

    // Validate input
    if (
      !invites ||
      typeof invites !== "object" ||
      Object.keys(invites).length === 0
    ) {
      return generateResponse(
        null,
        "Please provide a valid invites object with email:role pairs",
        res,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Find admin's company
    const company = await findCompany({ adminUser: adminUser.id });
    if (!company) {
      return generateResponse(
        null,
        "Company not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }

    // Count total invites needed
    const totalInvites = Object.keys(invites).length;

    // Check if enough slots are available
    const availableSlots = await findAvailableInviteSlot({
      companyId: company._id,
    });
    if (!availableSlots) {
      return generateResponse(
        null,
        "No available invite slots. Please upgrade your plan.",
        res,
        STATUS_CODES.FORBIDDEN
      );
    }

    // Process each invite
    const results = {
      successful: [],
      failed: [],
    };

    for (const [email, role] of Object.entries(invites)) {
      try {
        // Validate role
        const validRole = role === ROLES.ADMIN || role === ROLES.EMPLOYEE;
        if (!validRole) {
          results.failed.push({
            email,
            reason: `Invalid role: ${role}. Must be admin or employee.`,
          });
          continue;
        }

        // Check if email already has a reserved slot
        const alreadyInvited = await checkEmailAlreadyInvited(
          email,
          company._id
        );
        if (alreadyInvited) {
          results.failed.push({
            email,
            reason: "This email already has an active invite",
          });
          continue;
        }

        // Find an available slot
        const availableSlot = await findAvailableInviteSlot({
          companyId: company._id,
        });
        if (!availableSlot) {
          results.failed.push({
            email,
            reason: "No more invite slots available",
          });
          break; // Stop processing if no more slots
        }

        // Generate invite token if not already present
        const inviteToken = availableSlot.token;

        // Create invite link
        const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const inviteLink = `${baseUrl}/signup?companyId=${company.domain}&token=${inviteToken}`;

        // Prepare email content using the template
        const subject = `Invitation to join ${company.name}`;
        const { html, text } = generateInviteEmail({
          companyName: company.name,
          role,
          inviteLink,
        });

        // Send email
        await Mailer.sendEmail({
          email,
          subject,
          message: text,
          html: html,
        });

        // Mark slot as reserved (not used yet)
        await updateInviteSlot(
          { _id: availableSlot._id },
          { reserved: true, reservedFor: email, reservedRole: role }
        );

        results.successful.push({ email, role });
      } catch (error) {
        console.error(`Error sending invite to ${email}:`, error);
        results.failed.push({ email, reason: "Failed to send invite" });
      }
    }

    // Return results
    if (results.successful.length === 0) {
      return generateResponse(
        { results },
        "Failed to send any invites",
        res,
        STATUS_CODES.UNPROCESSABLE_ENTITY
      );
    }

    if (results.failed.length > 0) {
      return generateResponse(
        { results },
        `Successfully sent ${results.successful.length} invites with ${results.failed.length} failures`,
        res,
        STATUS_CODES.PARTIAL_CONTENT || 206 // Using 206 Partial Content for partial success
      );
    }

    return generateResponse(
      { results },
      `Successfully sent all ${results.successful.length} invites`,
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.error("Error in sendBulkInvites:", error);
    return next(error);
  }
};
