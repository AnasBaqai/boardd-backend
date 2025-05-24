"use strict";

const { parseBody, generateResponse } = require("../utils");
const { STATUS_CODES } = require("../utils/constants");
const { validateRequiredFields } = require("./helpers/users/signup.helper");
const { findUser } = require("../models/userModel");
const { findProject } = require("../models/projectModel");
const {
  createTask,
  findTask,
  updateTask,
  deleteTask,
} = require("../models/taskModel");
const { getTaskActivities } = require("../models/activityModel");
const { getIO } = require("../utils/socket");
const { createActivity } = require("../models/activityModel");
const { createNotification } = require("../models/notificationModel");
const { findChannelTab } = require("../models/channelTabsModel");
const { findChannel } = require("../models/channelModel");
const { generateActivityMessage } = require("../utils");
const { emitUserNotification, emitTaskEvent } = require("../utils/socket");
const {
  createTaskActivitiesAndNotifications,
  handlePriorityActivity,
  handleDueDateActivity,
  handleAssignmentActivitiesAndNotifications,
  prepareTaskEventPayload,
} = require("./helpers/tasks/task.helper");
const { getTaskByIdQuery } = require("./queries/tasksQueries");
const { getAllTasks } = require("../models/taskModel");

/**
 * Create a new task
 */
exports.createTask = async (req, res, next) => {
  try {
    const { title, projectId, assignedTo, priority, dueDate } = parseBody(
      req.body
    );

    // Validate required fields
    const validationError = validateRequiredFields({ title, projectId }, res);
    if (validationError) return validationError;

    // Check if project exists and get context
    const project = await findProject({ _id: projectId });
    if (!project) {
      return generateResponse(
        null,
        "Project not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }

    // Check if user is a member of the tab
    const userId = req?.user?.id;
    const tab = await findChannelTab({ _id: project.tabId });
    if (!tab) {
      return generateResponse(
        null,
        "Tab not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }
    const isMember = tab?.members?.includes(userId);
    if (!isMember) {
      return generateResponse(
        null,
        "You are not a member of this tab",
        res,
        STATUS_CODES.FORBIDDEN
      );
    }

    // Get creator's info
    const creator = await findUser({ _id: userId });
    if (!creator) {
      return generateResponse(
        null,
        "User not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }

    // Create task
    const task = await createTask({
      title,
      projectId,
      assignedTo: assignedTo || [],
      priority: priority || "medium",
      dueDate: dueDate || null,
      createdBy: userId,
    });

    // Find channel
    const channel = await findChannel({ _id: project.channelId });
    if (!channel) {
      return generateResponse(
        null,
        "Channel not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }

    const contextPath = `${channel.channelName} / ${tab.tabName}`;
    const userName = creator.name || creator.email;

    // Initialize activities and notifications arrays
    let activities = [];
    let notifications = [];

    // 1. Handle task creation activities and notifications
    const taskCreationResult = await createTaskActivitiesAndNotifications({
      task,
      projectId,
      userId,
      userName,
      channel,
      tab,
      contextPath,
    });
    activities = [...activities, ...taskCreationResult.activities];
    notifications = [...notifications, ...taskCreationResult.notifications];

    // 2. Handle priority setting activity
    if (priority) {
      const priorityActivity = await handlePriorityActivity({
        priority,
        userName,
        task,
        projectId,
        userId,
      });
      activities.push(priorityActivity);
    }

    // 3. Handle due date setting activity
    if (dueDate) {
      const dueDateActivity = await handleDueDateActivity({
        dueDate,
        userName,
        task,
        projectId,
        userId,
      });
      activities.push(dueDateActivity);
    }

    // 4. Handle assignment activities and notifications
    if (assignedTo && assignedTo.length > 0) {
      const assignmentResult = await handleAssignmentActivitiesAndNotifications(
        {
          assignedTo,
          userName,
          task,
          projectId,
          userId,
          channel,
          tab,
          contextPath,
        }
      );
      activities = [...activities, ...assignmentResult.activities];
      notifications = [...notifications, ...assignmentResult.notifications];
    }

    // Save all notifications
    await Promise.all(notifications);

    // Emit socket events
    try {
      // Emit task creation event
      const taskEventPayload = prepareTaskEventPayload({
        task,
        activities,
        channel,
        tab,
        project,
        creator,
        contextPath,
      });
      emitTaskEvent(taskEventPayload);

      // Emit notifications to assigned users
      if (assignedTo && assignedTo.length > 0) {
        assignedTo.forEach((assigneeId) => {
          if (assigneeId !== creator._id) {
            emitUserNotification(assigneeId, {
              type: "MENTION",
              message: `${userName} assigned you to task "${task.title}"`,
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
      task,
      "Task created successfully",
      res,
      STATUS_CODES.CREATED
    );
  } catch (error) {
    console.error("Error in createTask:", error);
    return next(error);
  }
};

/**
 * Get task by ID with subtasks and activities
 */
exports.getTaskById = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const query = getTaskByIdQuery(taskId);
    const result = await getAllTasks({
      query,
      page: 1,
      limit: 1,
      responseKey: "task",
    });

    if (!result.task.length) {
      return generateResponse(
        null,
        "Task not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }

    return generateResponse(
      result.task[0],
      "Task fetched successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.error("Error in getTaskById:", error);
    return next(error);
  }
};

/**
 * Batch update task
 */
exports.batchUpdateTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const updates = parseBody(req.body);
    const userId = req.user.id;

    // Find task
    const task = await findTask({ _id: taskId });
    if (!task) {
      return generateResponse(
        null,
        "Task not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }

    // Get project and user info
    const project = await findProject({ _id: task.projectId });
    if (!project) {
      return generateResponse(
        null,
        "Project not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
    }

    const user = await findUser({ _id: userId });
    if (!user) {
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

    // Store previous values for activity tracking
    const previousValues = {};
    Object.keys(updates).forEach((field) => {
      previousValues[field] = task[field];
    });

    // Update task with all changes
    const updatedTask = await updateTask(
      { _id: taskId },
      { ...updates, updatedAt: new Date() },
      { new: true }
    );

    const contextPath = `${channel.channelName} / ${tab.tabName}`;
    const userName = user.name || user.email;

    // Create activities and notifications for each changed field
    const activities = [];
    const notifications = [];

    for (const [field, value] of Object.entries(updates)) {
      const message = generateActivityMessage(field, userName, {
        previousValue: previousValues[field],
        newValue: value,
        taskTitle: task.title,
      });

      // Create activity
      const activity = await createActivity({
        projectId: task.projectId,
        taskId: task._id,
        userId,
        actionType: "UPDATE_TASK",
        field,
        previousValue: previousValues[field],
        newValue: value,
        message,
        timestamp: new Date(),
      });
      activities.push(activity);

      // Create notifications based on field type
      switch (field) {
        case "status":
          // Work in Progress notification
          if (value === "in_progress") {
            notifications.push(
              createNotification({
                userId: task.createdBy,
                type: "WORK_IN_PROGRESS",
                projectId: task.projectId,
                channelId: project.channelId,
                tabId: project.tabId,
                taskId: task._id,
                createdBy: userId,
                title: "Task Status Update",
                message: message.forOthers,
                contextPath,
              })
            );
          }
          break;

        case "assignedTo":
          // Handle new assignees (Mentions)
          const newAssignees = value.filter(
            (id) => !previousValues.assignedTo?.includes(id.toString())
          );

          for (const assigneeId of newAssignees) {
            if (assigneeId.toString() !== userId) {
              notifications.push(
                createNotification({
                  userId: assigneeId,
                  type: "MENTION",
                  projectId: task.projectId,
                  channelId: project.channelId,
                  tabId: project.tabId,
                  taskId: task._id,
                  createdBy: userId,
                  title: "Task Assignment",
                  message: `${userName} assigned you to task "${task.title}"`,
                  contextPath,
                })
              );
            }
          }
          break;

        default:
          // Channel notification for all other updates
          notifications.push(
            createNotification({
              userId: task.createdBy,
              type: "CHANNEL",
              projectId: task.projectId,
              channelId: project.channelId,
              tabId: project.tabId,
              taskId: task._id,
              createdBy: userId,
              title: "Task Update",
              message: message.forOthers,
              contextPath,
            })
          );
      }
    }

    // Save all notifications
    await Promise.all(notifications);

    // Emit task update event
    emitTaskEvent({
      taskId,
      tabId: project.tabId,
      type: "TASK_UPDATED",
      payload: {
        task: updatedTask,
        activities,
        updatedBy: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
      },
    });

    // Emit notifications to relevant users
    notifications.forEach((notification) => {
      emitUserNotification(notification.userId, {
        type: notification.type,
        message: notification.message,
        taskId: task._id,
        context: {
          channelId: project.channelId,
          tabId: project.tabId,
          projectId: project._id,
          projectName: project.name,
          contextPath,
        },
      });
    });

    return generateResponse(
      { task: updatedTask, activities },
      "Task updated successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.error("Error in batchUpdateTask:", error);
    return next(error);
  }
};
