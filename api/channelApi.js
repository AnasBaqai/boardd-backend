"use strict";

const { Router } = require("express");
const {
  createChannel,
  addUserToChannel,
  getChannelJoiningLink,
  getAllMembersInChannel,
  getAllChannelsOfUser,
  sendChannelInviteEmails,
} = require("../controller/channelController");
const Auth = require("../middlewares/Auth");
const { ROLES } = require("../utils/constants");
const {
  validateCreateChannel,
  validateAddUserToChannel,
  validateGetChannelJoiningLinkQuery,
  validateGetAllMembersInChannelQuery,
  validateGetAllChannelsOfUserQuery,
  validateSendChannelInviteEmails,
} = require("../validation/channelValidation");

class ChannelApi {
  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  setupRoutes() {
    let router = this.router;

    // Create channel with validation
    router.post(
      "/",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateCreateChannel,
      createChannel
    );

    // Add user to channel with validation
    router.put(
      "/add-member",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateAddUserToChannel,
      addUserToChannel
    );

    // Get channel joining link with query validation
    router.get(
      "/joining-link",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateGetChannelJoiningLinkQuery,
      getChannelJoiningLink
    );

    // Get all members in channel with query validation
    router.get(
      "/members",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateGetAllMembersInChannelQuery,
      getAllMembersInChannel
    );

    // Get all channels of user with query validation
    router.get(
      "/member/all-channels",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateGetAllChannelsOfUserQuery,
      getAllChannelsOfUser
    );

    // Send channel invite emails
    router.post(
      "/:channelId/invite/emails",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateSendChannelInviteEmails,
      sendChannelInviteEmails
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
