"use strict";

const { Router } = require("express");
const {
  createTask,
  getTaskById,
  batchUpdateTask,
} = require("../controller/task.controller");
const Auth = require("../middlewares/Auth");
const { ROLES } = require("../utils/constants");

class TaskApi {
  constructor() {
    this.router = Router();
    this.registerRoutes();
  }

  registerRoutes() {
    let router = this.router;

    // Create a new task
    router.post("/", Auth([ROLES.ADMIN, ROLES.EMPLOYEE]), createTask);

    // Get task by ID
    router.get("/:taskId", Auth([ROLES.ADMIN, ROLES.EMPLOYEE]), getTaskById);
    // Batch update task (replaces old update endpoint)
    router.put(
      "/:taskId/batch",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
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
