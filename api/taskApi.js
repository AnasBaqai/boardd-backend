"use strict";

const { Router } = require("express");
const {
  createTask,
  getTaskById,
  batchUpdateTask,
} = require("../controller/task.controller");
const Auth = require("../middlewares/Auth");
const { ROLES } = require("../utils/constants");
const {
  validateCreateTask,
  validateBatchUpdateTask,
  validateTaskIdParam,
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

    // Get task by ID with parameter validation
    router.get(
      "/:taskId",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
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
  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return "/tasks";
  }
}

module.exports = TaskApi;
