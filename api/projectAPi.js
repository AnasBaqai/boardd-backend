"use strict";

const { Router } = require("express");
const { CreateProject } = require("../controller/projectController");
const Auth = require("../middlewares/Auth");
const { ROLES } = require("../utils/constants");
class ProjectAPI {
  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  setupRoutes() {
    let router = this.router;
    router.post("/", Auth([ROLES.ADMIN, ROLES.EMPLOYEE]), CreateProject);
  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return "/projects";
  }
}

module.exports = ProjectAPI;
