"use strict";

const { Router } = require("express");
const activityController = require("../controller/activity.controller");
const Auth = require("../middlewares/Auth");
const { ROLES } = require("../utils/constants");

class ActivityApi {
  constructor() {
    this.router = Router();
    this.registerRoutes();
  }

  registerRoutes() {
    let router = this.router;

    // Get activities for a project
    router.get(
      "/project/:projectId",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      activityController.getProjectActivities
    );

    // Get activities for a task
    router.get(
      "/task/:taskId",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      activityController.getTaskActivities
    );
  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return "/activities";
  }
}

module.exports = ActivityApi;
