"use strict";

const { Router } = require("express");
const {
  getUnusedInviteSlot,
  sendBulkInvites,
} = require("../controller/invite.controller");
const Auth = require("../middlewares/Auth");
const { ROLES } = require("../utils/constants");
const {
  validateGetUnusedInviteSlotQuery,
  validateSendBulkInvites,
} = require("../validation/inviteValidation");

class InviteAPI {
  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  setupRoutes() {
    let router = this.router;

    // Get unused invite slot with query validation
    router.get(
      "/",
      Auth([ROLES.ADMIN]),
      validateGetUnusedInviteSlotQuery,
      getUnusedInviteSlot
    );

    // Send bulk invites with validation
    router.post(
      "/",
      Auth([ROLES.ADMIN]),
      validateSendBulkInvites,
      sendBulkInvites
    );
  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return "/invites";
  }
}

module.exports = InviteAPI;
