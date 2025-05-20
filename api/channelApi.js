"use strict";

const { Router } = require("express");
const { createChannel } = require("../controller/channelController");
const Auth = require("../middlewares/Auth");
const { ROLES } = require("../utils/constants");
class ChannelApi {
  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  setupRoutes() {
    let router = this.router;
    router.post("/", Auth([ROLES.ADMIN, ROLES.EMPLOYEE]), createChannel);
  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return "/channels";
  }
}

module.exports = ChannelApi;
