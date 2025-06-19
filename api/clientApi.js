"use strict";

const { Router } = require("express");
const {
  createOrUpdateClient,
  getClientForTab,
} = require("../controller/client.controller");
const Auth = require("../middlewares/Auth");
const { ROLES } = require("../utils/constants");
const {
  validateCreateOrUpdateClient,
} = require("../validation/clientValidation");

class ClientApi {
  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  setupRoutes() {
    let router = this.router;

    // Create or update client with validation
    router.post(
      "/",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateCreateOrUpdateClient,
      createOrUpdateClient
    );
    router.get("/:tabId", Auth([ROLES.ADMIN, ROLES.EMPLOYEE]), getClientForTab);
  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return "/clients";
  }
}

module.exports = ClientApi;
