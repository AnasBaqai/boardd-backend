const { findChannel } = require("../models/channelModel");
const { findChannelTab } = require("../models/channelTabsModel");
const { createProject, getAllProjects } = require("../models/projectModel");
const { findUser } = require("../models/userModel");
const { parseBody, generateResponse, formatDate } = require("../utils");
const { STATUS_CODES } = require("../utils/constants");
const { getProjectsOfTabQuery } = require("./queries/projectQueries");

exports.CreateProject = async (req, res, next) => {
  try {
    const { name, description, tabId, startDate, endDate, color, priority } =
      parseBody(req.body);
    const userId = req?.user?.id;

    // check if tabId is valid
    const tab = await findChannelTab({ _id: tabId });
    if (!tab) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Tab not found",
      });
    }
    const companyId = tab?.companyId;
    const channelId = tab?.channelId;

    // create project
    const project = await createProject({
      name,
      description,
      createdBy: userId,
      companyId,
      channelId,
      tabId,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      color,
      priority,
    });

    return generateResponse(
      project,
      "Project created successfully",
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

// Get projects of a tab with tasks grouped by status
exports.getProjectsOfTab = async (req, res, next) => {
  try {
    const { channelId, tabId } = req.params;
    const { page, limit } = req.query;
    const userId = req.user.id;

    // Validate user exists
    const user = await findUser({ _id: userId });
    if (!user) {
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
    if (!channel.members.includes(userId)) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "You are not a member of this channel",
      });
    }

    // Validate tab exists and belongs to the channel
    const tab = await findChannelTab({ _id: tabId, channelId: channelId });
    if (!tab) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Tab not found in this channel",
      });
    }

    // Check if user is a member of the tab (if tab has specific members)
    if (
      tab.members &&
      tab.members.length > 0 &&
      !tab.members.includes(userId)
    ) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "You are not a member of this tab",
      });
    }

    // Get aggregation query
    const query = getProjectsOfTabQuery(channelId, tabId);

    // Fetch projects with pagination
    const result = await getAllProjects({
      query,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      responseKey: "projects",
    });

    // Add context information to response
    const responseData = {
      ...result,
      context: {
        channel: {
          id: channel._id,
          name: channel.channelName,
        },
        tab: {
          id: tab._id,
          name: tab.tabName,
        },
      },
      summary: {
        totalProjects: result.pagination.totalDocs,
        projectsWithTasks: result.projects.filter((p) => p.taskStats.total > 0)
          .length,
        totalTasks: result.projects.reduce(
          (sum, p) => sum + p.taskStats.total,
          0
        ),
        completedTasks: result.projects.reduce(
          (sum, p) => sum + p.taskStats.completed,
          0
        ),
        overdueTasks: result.projects.reduce(
          (sum, p) => sum + p.taskStats.overdue,
          0
        ),
      },
    };

    return generateResponse(
      responseData,
      "Projects fetched successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.error("Error in getProjectsOfTab:", error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message ?? "Failed to fetch projects",
    });
  }
};
