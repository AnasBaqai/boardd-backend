"use strict";

const { Router } = require("express");
const {
  createChannel,
  addUserToChannel,
  getChannelJoiningLink,
  getAllMembersInChannel,
} = require("../controller/channelController");
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
    router.post(
      "/add-member",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      addUserToChannel
    );
    router.get(
      "/joining-link",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      getChannelJoiningLink
    );
    router.get(
      "/members",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      getAllMembersInChannel
    );
  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return "/channels";
  }
}

module.exports = ChannelApi;
