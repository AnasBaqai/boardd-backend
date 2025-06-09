"use strict";

const { Router } = require("express");
const {
  createTask,
  getTaskById,
  batchUpdateTask,
  shareTask,
} = require("../controller/task.controller");
const Auth = require("../middlewares/Auth");
const OptionalAuth = require("../middlewares/OptionalAuth");
const { ROLES } = require("../utils/constants");
const {
  validateCreateTask,
  validateBatchUpdateTask,
  validateTaskIdParam,
  validateShareTask,
} = require("../validation/taskValidation");

class TaskApi {
  constructor() {
    this.router = Router();
    this.registerRoutes();
  }

  registerRoutes() {
    let router = this.router;

    // Create a new task with validation
    router.post(
      "/",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateCreateTask,
      createTask
    );

    // Get task by ID with parameter validation (supports both authenticated and guest access)
    router.get(
      "/:taskId",
      OptionalAuth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateTaskIdParam,
      getTaskById
    );

    // Batch update task with validation
    router.put(
      "/:taskId/batch",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateTaskIdParam,
      validateBatchUpdateTask,
      batchUpdateTask
    );

    // Share task with multiple users via email and generate shareable link
    router.post(
      "/:taskId/share",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateTaskIdParam,
      validateShareTask,
      shareTask
    );
  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return "/tasks";
  }
}

module.exports = TaskApi;
