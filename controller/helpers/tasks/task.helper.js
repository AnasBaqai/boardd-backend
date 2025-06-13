const { createActivity } = require("../../../models/activityModel");
const { createNotification } = require("../../../models/notificationModel");
const { findManyUsers } = require("../../../models/userModel");
const { generateActivityMessage } = require("../../../utils");
const { ACTION_TYPE } = require("../../../utils/constants");
/**
 * Create task creation activity and notifications
 */
exports.createTaskActivitiesAndNotifications = async ({
  task,
  projectId,
  userId,
  userName,
  channel,
  tab,
  contextPath,
}) => {
  const activities = [];
  const notifications = [];

  // 1. Task Creation Activity
  const createTaskMessage = {
    forCreator: `You created task "${task.title}"`,
    forOthers: `${userName} created task "${task.title}"`,
  };

  activities.push(
    await createActivity({
      projectId,
      taskId: task._id,
      userId,
      actionType: ACTION_TYPE.CREATE_TASK,
      timestamp: new Date(),
      message: createTaskMessage,
    })
  );

  // Task creation notification for all tab members
  for (const memberId of tab.members) {
    notifications.push(
      createNotification({
        userId: memberId,
        type: "CHANNEL",
        projectId,
        channelId: channel._id,
        tabId: tab._id,
        taskId: task._id,
        createdBy: userId,
        title: "New Task Created",
        message:
          memberId.toString() === userId.toString()
            ? createTaskMessage.forCreator
            : createTaskMessage.forOthers,
        contextPath,
      })
    );
  }

  return { activities, notifications };
};

/**
 * Handle priority setting activity
 */
exports.handlePriorityActivity = async ({
  priority,
  userName,
  task,
  projectId,
  userId,
}) => {
  const priorityMessage = generateActivityMessage("priority", userName, {
    previousValue: null,
    newValue: priority,
    taskTitle: task.title,
    isCreation: true,
  });

  return createActivity({
    projectId,
    taskId: task._id,
    userId,
    actionType: ACTION_TYPE.CHANGE_PRIORITY,
    field: "priority",
    newValue: priority,
    timestamp: new Date(),
    message: priorityMessage,
  });
};

/**
 * Handle due date setting activity
 */
exports.handleDueDateActivity = async ({
  dueDate,
  userName,
  task,
  projectId,
  userId,
}) => {
  const dueDateMessage = generateActivityMessage("dueDate", userName, {
    previousValue: null,
    newValue: dueDate,
    taskTitle: task.title,
    isCreation: true,
  });

  return createActivity({
    projectId,
    taskId: task._id,
    userId,
    actionType: ACTION_TYPE.CHANGE_DUE_DATE,
    field: "dueDate",
    newValue: dueDate,
    timestamp: new Date(),
    message: dueDateMessage,
  });
};

/**
 * Handle assignment activities and notifications
 */
exports.handleAssignmentActivitiesAndNotifications = async ({
  assignedTo,
  userName,
  task,
  projectId,
  userId,
  channel,
  tab,
  contextPath,
}) => {
  const activities = [];
  const notifications = [];

  // Get assignee details
  const assignees = await findManyUsers({ _id: { $in: assignedTo } });
  const assigneeNames = assignees
    .map((user) => user.name || user.email)
    .join(", ");

  const assignmentMessage = generateActivityMessage("assignedTo", userName, {
    previousValue: [],
    newValue: assigneeNames,
    taskTitle: task.title,
  });

  activities.push(
    await createActivity({
      projectId,
      taskId: task._id,
      userId,
      actionType: ACTION_TYPE.ASSIGN_USER,
      field: "assignedTo",
      newValue: assignedTo,
      timestamp: new Date(),
      message: assignmentMessage,
    })
  );

  // Create notifications for assigned users
  for (const assigneeId of assignedTo) {
    notifications.push(
      createNotification({
        userId: assigneeId,
        type: "MENTION",
        projectId,
        channelId: channel._id,
        tabId: tab._id,
        taskId: task._id,
        createdBy: userId,
        title: "Task Assignment",
        message:
          assigneeId === userId
            ? assignmentMessage.forCreator
            : assignmentMessage.forOthers,
        contextPath,
      })
    );
  }

  return { activities, notifications };
};

/**
 * Prepare task event payload
 */
exports.prepareTaskEventPayload = ({
  task,
  activities,
  channel,
  tab,
  project,
  creator,
  contextPath,
}) => ({
  taskId: task._id,
  tabId: project.tabId,
  type: "TASK_CREATED",
  payload: {
    task,
    activities,
    context: {
      channelId: channel._id,
      tabId: tab._id,
      projectId: project._id,
      projectName: project.name,
      contextPath,
    },
    updatedBy: {
      _id: creator._id,
      name: creator.name,
      email: creator.email,
    },
  },
});

/**
 * Handle description setting activity
 */
exports.handleDescriptionActivity = async ({
  description,
  userName,
  task,
  projectId,
  userId,
}) => {
  const descriptionMessage = generateActivityMessage("description", userName, {
    previousValue: null,
    newValue: description,
    taskTitle: task.title,
    isCreation: true,
  });

  return createActivity({
    projectId,
    taskId: task._id,
    userId,
    actionType: ACTION_TYPE.UPDATE_TASK,
    field: "description",
    newValue: description,
    timestamp: new Date(),
    message: descriptionMessage,
  });
};

/**
 * Handle tags setting activity
 */
exports.handleTagsActivity = async ({
  tags,
  userName,
  task,
  projectId,
  userId,
}) => {
  const tagsMessage = generateActivityMessage("tags", userName, {
    previousValue: [],
    newValue: tags,
    taskTitle: task.title,
    isCreation: true,
  });

  return createActivity({
    projectId,
    taskId: task._id,
    userId,
    actionType: ACTION_TYPE.UPDATE_TASK,
    field: "tags",
    newValue: tags,
    timestamp: new Date(),
    message: tagsMessage,
  });
};

/**
 * Handle stroke color setting activity
 */
exports.handleStrokeColorActivity = async ({
  strokeColor,
  userName,
  task,
  projectId,
  userId,
}) => {
  const strokeColorMessage = generateActivityMessage("strokeColor", userName, {
    previousValue: null,
    newValue: strokeColor,
    taskTitle: task.title,
    isCreation: true,
  });

  return createActivity({
    projectId,
    taskId: task._id,
    userId,
    actionType: ACTION_TYPE.UPDATE_TASK,
    field: "strokeColor",
    newValue: strokeColor,
    timestamp: new Date(),
    message: strokeColorMessage,
  });
};

/**
 * Handle attachments setting activity
 */
exports.handleAttachmentsActivity = async ({
  attachments,
  userName,
  task,
  projectId,
  userId,
}) => {
  const attachmentsMessage = generateActivityMessage("attachments", userName, {
    previousValue: [],
    newValue: attachments,
    taskTitle: task.title,
    isCreation: true,
  });

  return createActivity({
    projectId,
    taskId: task._id,
    userId,
    actionType: ACTION_TYPE.UPDATE_TASK,
    field: "attachments",
    newValue: attachments,
    timestamp: new Date(),
    message: attachmentsMessage,
  });
};

/**
 * Handle custom fields setting activity
 */
exports.handleCustomFieldsActivity = async ({
  customFields,
  userName,
  task,
  projectId,
  userId,
}) => {
  const customFieldsMessage = generateActivityMessage(
    "customFields",
    userName,
    {
      previousValue: [],
      newValue: customFields,
      taskTitle: task.title,
      isCreation: true,
    }
  );

  return createActivity({
    projectId,
    taskId: task._id,
    userId,
    actionType: ACTION_TYPE.UPDATE_TASK,
    field: "customFields",
    newValue: customFields,
    timestamp: new Date(),
    message: customFieldsMessage,
  });
};

/**
 * Handle checklist setting activity
 */
exports.handleChecklistActivity = async ({
  checklist,
  userName,
  task,
  projectId,
  userId,
}) => {
  const checklistMessage = generateActivityMessage("checklist", userName, {
    previousValue: [],
    newValue: checklist,
    taskTitle: task.title,
    isCreation: true,
  });

  return createActivity({
    projectId,
    taskId: task._id,
    userId,
    actionType: ACTION_TYPE.UPDATE_TASK,
    field: "checklist",
    newValue: checklist,
    timestamp: new Date(),
    message: checklistMessage,
  });
};
