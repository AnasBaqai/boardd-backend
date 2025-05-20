"use strict";

const { Router } = require("express");
const {
  getUnusedInviteSlot,
  sendBulkInvites,
} = require("../controller/invite.controller");
const Auth = require("../middlewares/Auth");
const { ROLES } = require("../utils/constants");
class InviteAPI {
  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  setupRoutes() {
    let router = this.router;
    router.get("/", Auth([ROLES.ADMIN]), getUnusedInviteSlot);
    router.post("/", Auth([ROLES.ADMIN]), sendBulkInvites);
  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return "/invites";
  }
}

module.exports = InviteAPI;
