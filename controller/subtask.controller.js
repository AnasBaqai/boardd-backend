"use strict";

const { parseBody, generateResponse } = require("../utils");
const { STATUS_CODES } = require("../utils/constants");
const { findUser } = require("../models/userModel");
const { findTask } = require("../models/taskModel");
const { findProject } = require("../models/projectModel");
const {
  createSubtask,
  findSubtask,
  updateSubtask,
  deleteSubtask,
  getAllSubtasks,
} = require("../models/subtaskModel");
const { getIO } = require("../utils/socket");
const { emitTaskEvent } = require("../utils/socket");
const { createActivity } = require("../models/activityModel");
const { findChannelTab } = require("../models/channelTabsModel");
const { findChannel } = require("../models/channelModel");
const { createNotification } = require("../models/notificationModel");
const { emitUserNotification } = require("../utils/socket");

/**
 * Create a new subtask
 */
exports.createSubtask = async (req, res, next) => {
  try {
    const { title, taskId, assignedTo } = parseBody(req.body);

    // Check if task exists
    const task = await findTask({ _id: taskId });
    if (!task) {
      return generateResponse(
        null,
        "Task not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }

    // Check if project exists
    const project = await findProject({ _id: task.projectId });
    if (!project) {
      return generateResponse(
        null,
        "Project not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }

    // Get creator's info
    const userId = req.user.id;
    const creator = await findUser({ _id: userId });
    if (!creator) {
      return generateResponse(
        null,
        "User not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }

    // Get tab and channel info for context
    const tab = await findChannelTab({ _id: project.tabId });
    if (!tab) {
      return generateResponse(
        null,
        "Tab not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }

    const channel = await findChannel({ _id: project.channelId });
    if (!channel) {
      return generateResponse(
        null,
        "Channel not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }

    // Create subtask object
    const subtaskData = {
      title,
      taskId,
      projectId: task.projectId,
      createdBy: userId,
      assignedTo: assignedTo || [],
    };

    // Create subtask
    const subtask = await createSubtask(subtaskData);

    const contextPath = `${channel.channelName} / ${tab.tabName}`;
    const userName = creator.name || creator.email;

    // Initialize activities and notifications arrays
    const activities = [];
    const notifications = [];

    // 1. Create activity for subtask creation
    const createSubtaskMessage = {
      forCreator: `You created subtask "${title}" for task "${task.title}"`,
      forOthers: `${userName} created subtask "${title}" for task "${task.title}"`,
    };

    const activity = await createActivity({
      projectId: task.projectId,
      taskId,
      subtaskId: subtask._id,
      userId,
      actionType: "CREATE_SUBTASK",
      timestamp: new Date(),
      message: createSubtaskMessage,
    });
    activities.push(activity);

    // 2. Create notifications for task creator and tab members
    for (const memberId of tab.members) {
      notifications.push(
        createNotification({
          userId: memberId,
          type: "CHANNEL",
          projectId: task.projectId,
          channelId: channel._id,
          tabId: tab._id,
          taskId: task._id,
          createdBy: userId,
          title: "New Subtask Created",
          message:
            memberId.toString() === userId.toString()
              ? createSubtaskMessage.forCreator
              : createSubtaskMessage.forOthers,
          contextPath,
        })
      );
    }

    // 3. Create notifications for assigned users
    if (assignedTo && assignedTo.length > 0) {
      for (const assigneeId of assignedTo) {
        if (assigneeId !== userId) {
          notifications.push(
            createNotification({
              userId: assigneeId,
              type: "MENTION",
              projectId: task.projectId,
              channelId: channel._id,
              tabId: tab._id,
              taskId: task._id,
              createdBy: userId,
              title: "Subtask Assignment",
              message: `${userName} assigned you to subtask "${title}" in task "${task.title}"`,
              contextPath,
            })
          );
        }
      }
    }

    // Save all notifications
    await Promise.all(notifications);

    // Emit socket events
    try {
      // Emit task update event
      emitTaskEvent({
        taskId,
        tabId: project.tabId,
        type: "SUBTASK_CREATED",
        payload: {
          subtask,
          activity,
          context: {
            projectId: task.projectId,
            taskId,
          },
        },
      });

      // Emit notifications to assigned users
      if (assignedTo && assignedTo.length > 0) {
        assignedTo.forEach((assigneeId) => {
          if (assigneeId !== userId) {
            emitUserNotification(assigneeId, {
              type: "MENTION",
              message: `${userName} assigned you to subtask "${title}" in task "${task.title}"`,
              taskId: task._id,
              context: {
                channelId: channel._id,
                tabId: tab._id,
                projectId: project._id,
                projectName: project.name,
                contextPath,
              },
            });
          }
        });
      }
    } catch (error) {
      console.error("Socket error:", error);
      // Continue even if socket fails
    }

    return generateResponse(
      subtask,
      "Subtask created successfully",
      res,
      STATUS_CODES.CREATED
    );
  } catch (error) {
    console.error("Error in createSubtask:", error);
    return next(error);
  }
};

/**
 * Update subtask
 */
exports.updateSubtask = async (req, res, next) => {
  try {
    const { subtaskId } = req.params;
    const updates = parseBody(req.body);
    const userId = req.user.id;

    // Find subtask
    const subtask = await findSubtask({ _id: subtaskId });
    if (!subtask) {
      return generateResponse(
        null,
        "Subtask not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }

    // Get project for context
    const project = await findProject({ _id: subtask.projectId });
    if (!project) {
      return generateResponse(
        null,
        "Project not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }

    // Capture previous values for activity tracking
    const previousValues = {};
    const updateFields = {};

    // Only update allowed fields and track changes
    const allowedFields = ["title", "description", "status", "assignedTo"];

    for (const field of allowedFields) {
      if (field in updates && updates[field] !== undefined) {
        previousValues[field] = subtask[field];
        updateFields[field] = updates[field];
      }
    }

    // Add updatedAt timestamp
    updateFields.updatedAt = new Date();

    // Update subtask
    const updatedSubtask = await updateSubtask(
      { _id: subtaskId },
      updateFields
    );

    // Create activities for changes
    const activities = await Promise.all(
      Object.entries(updateFields)
        .map(([field, value]) => {
          if (field !== "updatedAt") {
            return createActivity({
              projectId: subtask.projectId,
              taskId: subtask.taskId,
              subtaskId: subtask._id,
              userId,
              actionType: "UPDATE_SUBTASK",
              field,
              previousValue: previousValues[field],
              newValue: value,
            });
          }
        })
        .filter(Boolean)
    );

    // Emit socket event using standardized approach
    try {
      emitTaskEvent({
        taskId: subtask.taskId,
        tabId: project.tabId,
        type: "SUBTASK_UPDATED",
        payload: {
          subtask: updatedSubtask,
          activities,
          changes: updateFields,
        },
      });
    } catch (error) {
      console.error("Socket error:", error);
      // Continue even if socket fails
    }

    return generateResponse(
      updatedSubtask,
      "Subtask updated successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.error("Error in updateSubtask:", error);
    return next(error);
  }
};

/**
 * Delete subtask
 */
exports.deleteSubtask = async (req, res, next) => {
  try {
    const { subtaskId } = req.params;
    const userId = req.user.id;

    // Find subtask
    const subtask = await findSubtask({ _id: subtaskId });
    if (!subtask) {
      return generateResponse(
        null,
        "Subtask not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }

    // Get project for context
    const project = await findProject({ _id: subtask.projectId });
    if (!project) {
      return generateResponse(
        null,
        "Project not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }

    // Create activity record
    const activity = await createActivity({
      projectId: subtask.projectId,
      taskId: subtask.taskId,
      subtaskId: subtask._id,
      userId,
      actionType: "DELETE_SUBTASK",
    });

    // Delete subtask
    await deleteSubtask({ _id: subtaskId });

    // Emit socket event using standardized approach
    try {
      emitTaskEvent({
        taskId: subtask.taskId,
        tabId: project.tabId,
        type: "SUBTASK_DELETED",
        payload: {
          subtaskId,
          activity,
        },
      });
    } catch (error) {
      console.error("Socket error:", error);
      // Continue even if socket fails
    }

    return generateResponse(
      null,
      "Subtask deleted successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.error("Error in deleteSubtask:", error);
    return next(error);
  }
};
