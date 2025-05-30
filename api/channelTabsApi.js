"use strict";

const { Router } = require("express");
const {
  addMembersToChannelTab,
  getAllTabsOfChannel,
  getAllTabMembers,
  createNewChannelTab,
} = require("../controller/channelTabsController");
const Auth = require("../middlewares/Auth");
const { ROLES } = require("../utils/constants");
const {
  validateCreateChannelTab,
  validateAddMembersToChannelTab,
  validateTabIdParam,
  validateGetAllTabsOfChannelQuery,
  validateGetTabMembersQuery,
} = require("../validation/channelTabsValidation");

class ChannelTabsApi {
  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  setupRoutes() {
    let router = this.router;

    // Create new channel tab with validation
    router.post(
      "/",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateCreateChannelTab,
      createNewChannelTab
    );

    // Add members to channel tab with validation
    router.post(
      "/add-members",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateAddMembersToChannelTab,
      addMembersToChannelTab
    );

    // Get all tabs of channel with validation
    router.get(
      "/members",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateGetAllTabsOfChannelQuery,
      getAllTabsOfChannel
    );

    // Get all tab members with parameter and query validation
    router.get(
      "/:tabId/members",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateTabIdParam,
      validateGetTabMembersQuery,
      getAllTabMembers
    );
  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return "/channel-tabs";
  }
}

module.exports = ChannelTabsApi;
