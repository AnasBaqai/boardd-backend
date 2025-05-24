const { findChannel } = require("../models/channelModel");
const { findChannelTab } = require("../models/channelTabsModel");
const { createProject } = require("../models/projectModel");
const { parseBody, generateResponse, formatDate } = require("../utils");
const { STATUS_CODES } = require("../utils/constants");

exports.CreateProject = async (req, res, next) => {
  try {
    const { name, description, tabId, startDate, endDate, color, priority } =
      parseBody(req.body);
    const userId = req?.user?.id;

    // check if tabId is valid
    const tab = await findChannelTab({ _id: tabId });
    if (!tab) {
      return generateResponse(
        null,
        "Tab not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
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
    next(error);
  }
};
