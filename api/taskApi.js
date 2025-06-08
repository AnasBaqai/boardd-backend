"use strict";

const { Router } = require("express");
const {
  createTask,
  getTaskById,
  batchUpdateTask,
  shareTask,
} = require("../controller/task.controller");
const Auth = require("../middlewares/Auth");
const { ROLES } = require("../utils/constants");
const {
  validateCreateTask,
  validateBatchUpdateTask,
  validateShareTask,
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

    // Get task by ID with parameter validation (optional auth for shared tasks)
    router.get(
      "/:taskId",
      (req, res, next) => {
        // Optional authentication middleware
        const authHeader =
          req.header("accessToken") || req.session?.accessToken;
        if (authHeader) {
          // If auth token is provided, validate it
          return Auth([ROLES.ADMIN, ROLES.EMPLOYEE])(req, res, next);
        } else {
          // If no auth token, continue as guest
          req.user = null;
          next();
        }
      },
      validateTaskIdParam,
      getTaskById
    );

    // Share task via email and generate link
    router.post(
      "/:taskId/share",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateTaskIdParam,
      validateShareTask,
      shareTask
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
