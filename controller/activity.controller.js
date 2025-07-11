"use strict";

const { generateResponse } = require("../utils");
const { STATUS_CODES, ACTION_TYPE } = require("../utils/constants");
const { findProject } = require("../models/projectModel");
const { findTask } = require("../models/taskModel");
const {
  getProjectActivities,
  getTaskActivities,
} = require("../models/activityModel");

/**
 * Get all activities for a project
 */
exports.getProjectActivities = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { page, limit } = req.query;

    // Check if project exists
    const project = await findProject({ _id: projectId });
    if (!project) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Project not found",
      });
    }

    // Check if user has access to project
    // This verification would depend on your access control system

    // Get activities
    const activities = await getProjectActivities({
      projectId,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    return generateResponse(
      activities,
      "Project activities fetched successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.error("Error in getProjectActivities:", error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message,
    });
  }
};

/**
 * Get all activities for a specific task
 */
exports.getTaskActivities = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { page, limit } = req.query;

    // Check if task exists
    const task = await findTask({ _id: taskId });
    if (!task) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Task not found",
      });
    }

    // Get activities
    const activities = await getTaskActivities({
      taskId,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    return generateResponse(
      activities,
      "Task activities fetched successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.error("Error in getTaskActivities:", error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message,
    });
  }
};

/**
 * Format activity for display (helper function)
 * This could be used on the frontend or exposed as an API endpoint
 */
const formatActivityText = (activity) => {
  const { actionType, field, newValue, user } = activity;
  const userName = user?.name || "A user";

  switch (actionType) {
    case ACTION_TYPE.CREATE_TASK:
      return `${userName} created this task`;

    case ACTION_TYPE.UPDATE_TASK:
      switch (field) {
        case "title":
          return `${userName} changed the title to "${newValue}"`;
        case "description":
          return `${userName} updated the description`;
        case "status":
          return `${userName} changed the status to "${newValue}"`;
        case "priority":
          return `${userName} changed the priority to "${newValue}"`;
        case "dueDate":
          const date = new Date(newValue).toLocaleDateString();
          return `${userName} changed the due date to ${date}`;
        case "assignedTo":
          return `${userName} assigned the task to a user`;
        case "tags":
          return `${userName} updated the tags`;
        case "strokeColor":
          return `${userName} changed the color`;
        default:
          return `${userName} updated the task`;
      }

    case ACTION_TYPE.DELETE_TASK:
      return `${userName} deleted this task`;

    case ACTION_TYPE.CREATE_SUBTASK:
      return `${userName} created a subtask`;

    case ACTION_TYPE.UPDATE_SUBTASK:
      switch (field) {
        case "title":
          return `${userName} changed the subtask title to "${newValue}"`;
        case "status":
          return `${userName} changed the subtask status to "${newValue}"`;
        case "assignedTo":
          return `${userName} assigned the subtask to a user`;
        default:
          return `${userName} updated a subtask`;
      }

    case ACTION_TYPE.DELETE_SUBTASK:
      return `${userName} deleted a subtask`;

    default:
      return `${userName} performed an action`;
  }
};

// Export the helper function for use in frontend
exports.formatActivityText = formatActivityText;
