"use strict";

const { Router } = require("express");
const {
  addMembersToChannelTab,
  getAllTabsOfChannel,
  getAllTabMembers,
} = require("../controller/channelTabsController");
const Auth = require("../middlewares/Auth");
const { ROLES } = require("../utils/constants");
class ChannelTabsApi {
  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  setupRoutes() {
    let router = this.router;
    router.post(
      "/add-members",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      addMembersToChannelTab
    );
    router.get(
      "/members",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      getAllTabsOfChannel
    );
    router.get(
      "/:tabId/members",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
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
