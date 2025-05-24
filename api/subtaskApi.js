"use strict";

const { Router } = require("express");
const subtaskController = require("../controller/subtask.controller");
const Auth = require("../middlewares/Auth");
const { ROLES } = require("../utils/constants");

class SubtaskApi {
  constructor() {
    this.router = Router();
    this.registerRoutes();
  }

  registerRoutes() {
    let router = this.router;

    // Create a new subtask
    router.post(
      "/",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      subtaskController.createSubtask
    );

    // Update subtask
    router.put(
      "/:subtaskId",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      subtaskController.updateSubtask
    );

    // Delete subtask
    router.delete(
      "/:subtaskId",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      subtaskController.deleteSubtask
    );
  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return "/subtasks";
  }
}

module.exports = SubtaskApi;
