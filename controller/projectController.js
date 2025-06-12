const { findChannel } = require("../models/channelModel");
const { findChannelTab } = require("../models/channelTabsModel");
const { createProject, getAllProjects } = require("../models/projectModel");
const { findUser } = require("../models/userModel");
const { parseBody, generateResponse, formatDate } = require("../utils");
const { STATUS_CODES } = require("../utils/constants");
const {
  getProjectsOfTabQuery,
  getProjectsOverviewQuery,
  getTasksCalendarQuery,
} = require("./queries/projectQueries");

// Helper function to parse date strings
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
      startDate: parseDate(startDate),
      endDate: parseDate(endDate),
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

// Get projects of a tab with conditional view (overview or detailed list)
exports.getProjectsOfTab = async (req, res, next) => {
  try {
    const { channelId, tabId } = req.params;
    const { page, limit, view, currentDate } = req.query;
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

    // Handle calendar view separately
    if (view === "calendar") {
      return handleCalendarView(req, res, next, {
        channelId,
        tabId,
        userId,
        currentDate: new Date(currentDate),
        channel,
        tab,
        user,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 100, // Higher default for calendar
      });
    }

    // Choose query based on view parameter
    let query;
    let responseKey = "projects";

    if (view === "overview") {
      query = getProjectsOverviewQuery(channelId, tabId);
      responseKey = "projects"; // Same key but different data structure
    } else {
      // Default to detailed list view
      query = getProjectsOfTabQuery(channelId, tabId);
    }

    // Fetch projects with pagination
    const result = await getAllProjects({
      query,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      responseKey,
    });

    // Prepare response data based on view
    let responseData;

    if (view === "overview") {
      // Overview response - minimal data
      responseData = {
        ...result,
        view: "overview",
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
          projectsWithTasks: result.projects.filter((p) => p.taskCount > 0)
            .length,
          totalTasks: result.projects.reduce((sum, p) => sum + p.taskCount, 0),
          averageProgress:
            result.projects.length > 0
              ? Math.round(
                  (result.projects.reduce((sum, p) => sum + p.progress, 0) /
                    result.projects.length) *
                    10
                ) / 10
              : 0,
        },
      };
    } else {
      // Detailed list response - full data with tasks
      responseData = {
        ...result,
        view: "list",
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
          projectsWithTasks: result.projects.filter(
            (p) => p.taskStats.total > 0
          ).length,
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
    }

    const message =
      view === "overview"
        ? "Projects overview fetched successfully"
        : "Projects with tasks fetched successfully";

    return generateResponse(responseData, message, res, STATUS_CODES.SUCCESS);
  } catch (error) {
    console.error("Error in getProjectsOfTab:", error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message ?? "Failed to fetch projects",
    });
  }
};

// Helper function to handle calendar view
const handleCalendarView = async (req, res, next, params) => {
  try {
    const {
      channelId,
      tabId,
      userId,
      currentDate,
      channel,
      tab,
      user,
      page,
      limit,
    } = params;

    // Get calendar query for tasks
    const query = getTasksCalendarQuery(channelId, tabId, userId, currentDate);

    // Fetch tasks with pagination
    const result = await getAllProjects({
      query,
      page,
      limit,
      responseKey: "tasks",
    });

    // Calculate month boundaries for context
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    // Prepare lightweight calendar response
    const responseData = {
      tasks: result.tasks,
      pagination: result.pagination,
      view: "calendar",
      context: {
        channel: {
          id: channel._id,
          name: channel.channelName,
        },
        tab: {
          id: tab._id,
          name: tab.tabName,
        },
        calendar: {
          currentDate: currentDate.toISOString().split("T")[0],
          month: month + 1, // 1-based month
          year,
          monthStart: monthStart.toISOString().split("T")[0],
          monthEnd: monthEnd.toISOString().split("T")[0],
          monthName: monthStart.toLocaleDateString("en-US", { month: "long" }),
        },
      },
    };

    return generateResponse(
      responseData,
      `Calendar tasks for ${monthStart.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })} fetched successfully`,
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.error("Error in handleCalendarView:", error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message ?? "Failed to fetch calendar data",
    });
  }
};
