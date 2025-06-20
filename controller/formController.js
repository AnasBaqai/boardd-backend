"use strict";

const { parseBody, generateResponse, generateNextOrder } = require("../utils");
const { STATUS_CODES } = require("../utils/constants");
const { findUser } = require("../models/userModel");
const { findChannelTab } = require("../models/channelTabsModel");
const { findChannel } = require("../models/channelModel");
const {
  createForm,
  findForm,
  updateForm,
  deleteForm,
  getAllForms,
} = require("../models/formModel");

// Helper function to parse date strings (same as project controller)
const parseDate = (dateString) => {
  if (!dateString) return undefined;

  // If it's already a Date object, return it
  if (dateString instanceof Date) return dateString;

  // Handle DD-MM-YYYY format
  if (
    typeof dateString === "string" &&
    dateString.match(/^\d{2}-\d{2}-\d{4}$/)
  ) {
    const [day, month, year] = dateString.split("-");
    return new Date(year, month - 1, day); // month is 0-indexed
  }

  // Handle other formats (YYYY-MM-DD, ISO, etc.)
  return new Date(dateString);
};

/**
 * Create a new form
 */
exports.createForm = async (req, res, next) => {
  try {
    const {
      title,
      description,
      type,
      tabId,
      fields,
      attachments,
      sharingSettings,
      preferences,
    } = parseBody(req.body);
    const userId = req?.user?.id;

    // Validate user exists
    const user = await findUser({ _id: userId });
    if (!user) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "User not found",
      });
    }

    // Validate tab exists
    const tab = await findChannelTab({ _id: tabId });
    if (!tab) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Tab not found",
      });
    }

    // Check if user is a member of the tab
    if (!tab?.members?.includes(userId)) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "You are not a member of this tab",
      });
    }

    // Validate channel exists and user has access
    const channel = await findChannel({ _id: tab.channelId });
    if (!channel) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Channel not found",
      });
    }

    // Process fields if provided
    let processedFields = [];
    if (fields && Array.isArray(fields)) {
      // Validate field names are unique within the form
      const fieldNames = fields.map((field) => field.fieldName);
      const uniqueFieldNames = [...new Set(fieldNames)];

      if (fieldNames.length !== uniqueFieldNames.length) {
        return next({
          statusCode: STATUS_CODES.BAD_REQUEST,
          message: "Field names must be unique within the form",
        });
      }

      // Process each field and ensure proper ordering
      processedFields = fields.map((field, index) => ({
        ...field,
        order: field.order || index + 1,
        validation: field.validation || {},
        styling: field.styling || {},
      }));
    }

    // Process sharing settings with date parsing
    let processedSharingSettings = sharingSettings || {};
    if (processedSharingSettings.linkExpiry) {
      processedSharingSettings.linkExpiry = parseDate(
        processedSharingSettings.linkExpiry
      );
    }

    // Create form
    const form = await createForm({
      title,
      description: description || "",
      type: type || "",
      tabId,
      createdBy: userId,
      fields: processedFields,
      attachments: attachments || [],
      sharingSettings: processedSharingSettings,
      preferences: preferences || {},
    });

    return generateResponse(
      form,
      "Form created successfully",
      res,
      STATUS_CODES.CREATED
    );
  } catch (error) {
    console.error("Error in createForm:", error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message,
    });
  }
};

/**
 * Get forms by tab ID with pagination
 */
exports.getFormsByTab = async (req, res, next) => {
  try {
    const { tabId } = req.params;
    const { page, limit, status } = req.query;
    const userId = req?.user?.id;

    // Validate user exists
    const user = await findUser({ _id: userId });
    if (!user) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "User not found",
      });
    }

    // Validate tab exists and user has access
    const tab = await findChannelTab({ _id: tabId });
    if (!tab) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Tab not found",
      });
    }

    if (!tab?.members?.includes(userId)) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "You are not a member of this tab",
      });
    }

    // Build query
    const query = [{ $match: { tabId: tab._id, isActive: true } }];

    // Add status filter if provided
    if (status) {
      query[0].$match.status = status;
    }

    // Add user details
    query.push(
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "creator",
        },
      },
      {
        $unwind: "$creator",
      },
      {
        $project: {
          title: 1,
          description: 1,
          type: 1,
          status: 1,
          fields: 1,
          attachments: 1,
          sharingSettings: 1,
          preferences: 1,
          responseCount: 1,
          createdAt: 1,
          updatedAt: 1,
          creator: {
            _id: 1,
            name: 1,
            email: 1,
          },
        },
      },
      { $sort: { createdAt: -1 } }
    );

    const result = await getAllForms({
      query,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      responseKey: "forms",
    });

    return generateResponse(
      result,
      "Forms fetched successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.error("Error in getFormsByTab:", error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message,
    });
  }
};

/**
 * Get form by ID
 */
exports.getFormById = async (req, res, next) => {
  try {
    const { formId } = req.params;
    const userId = req?.user?.id;

    // Find form
    const form = await findForm({ _id: formId, isActive: true });
    if (!form) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Form not found",
      });
    }

    // If user is provided, validate access
    if (userId) {
      const tab = await findChannelTab({ _id: form.tabId });
      if (!tab || !tab?.members?.includes(userId)) {
        return next({
          statusCode: STATUS_CODES.FORBIDDEN,
          message: "You don't have access to this form",
        });
      }
    }

    return generateResponse(
      form,
      "Form fetched successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.error("Error in getFormById:", error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message,
    });
  }
};

/**
 * Update form
 */
exports.updateForm = async (req, res, next) => {
  try {
    const { formId } = req.params;
    const updates = parseBody(req.body);
    const userId = req?.user?.id;

    // Find form
    const form = await findForm({ _id: formId, isActive: true });
    if (!form) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Form not found",
      });
    }

    // Validate user has access
    const tab = await findChannelTab({ _id: form.tabId });
    if (!tab || !tab?.members?.includes(userId)) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "You don't have permission to update this form",
      });
    }

    // If updating fields, validate field names are unique
    if (updates.fields && Array.isArray(updates.fields)) {
      const fieldNames = updates.fields.map((field) => field.fieldName);
      const uniqueFieldNames = [...new Set(fieldNames)];

      if (fieldNames.length !== uniqueFieldNames.length) {
        return next({
          statusCode: STATUS_CODES.BAD_REQUEST,
          message: "Field names must be unique within the form",
        });
      }
    }

    // Process sharing settings with date parsing if being updated
    if (updates.sharingSettings && updates.sharingSettings.linkExpiry) {
      updates.sharingSettings.linkExpiry = parseDate(
        updates.sharingSettings.linkExpiry
      );
    }

    // Update form
    const updatedForm = await updateForm(
      { _id: formId },
      { ...updates, updatedAt: new Date() }
    );

    return generateResponse(
      updatedForm,
      "Form updated successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.error("Error in updateForm:", error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message,
    });
  }
};

/**
 * Delete form (soft delete)
 */
exports.deleteForm = async (req, res, next) => {
  try {
    const { formId } = req.params;
    const userId = req?.user?.id;

    // Find form
    const form = await findForm({ _id: formId, isActive: true });
    if (!form) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Form not found",
      });
    }

    // Validate user has access (only creator or tab member can delete)
    const tab = await findChannelTab({ _id: form.tabId });
    if (!tab || !tab?.members?.includes(userId)) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "You don't have permission to delete this form",
      });
    }

    // Soft delete
    await updateForm(
      { _id: formId },
      { isActive: false, updatedAt: new Date() }
    );

    return generateResponse(
      { formId },
      "Form deleted successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.error("Error in deleteForm:", error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message,
    });
  }
};
