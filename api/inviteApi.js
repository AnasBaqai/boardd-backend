"use strict";

const { Router } = require("express");
const { getUnusedInviteSlot } = require("../controller/invite.controller");

class InviteAPI {
  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  setupRoutes() {
    let router = this.router;
    router.get("/", getUnusedInviteSlot);
  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return "/invites";
  }
}

module.exports = InviteAPI;
