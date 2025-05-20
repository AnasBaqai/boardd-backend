"use strict";

const { Router } = require("express");

const RootApi = require("./rootApi");
const UserApi = require("./userApi");
const InviteApi = require("./inviteApi");
const CompanyApi = require("./companyApi");
const ChannelApi = require("./channelApi");
// all API routing files import here like above

class API {
  constructor(app) {
    this.app = app;
    this.router = Router();
    this.routeGroups = [];
  }

  loadRouteGroups() {
    this.routeGroups.push(new RootApi());
    this.routeGroups.push(new UserApi());
    this.routeGroups.push(new InviteApi());
    this.routeGroups.push(new CompanyApi());
    this.routeGroups.push(new ChannelApi());
    // all routes register here like above
  }

  setContentType(req, res, next) {
    res.set("Content-Type", "application/json");
    next();
  }

  registerGroups() {
    this.loadRouteGroups();
    this.routeGroups.forEach((rg) => {
      console.log("Route group: " + rg.getRouterGroup());
      this.app.use(
        "/api" + rg.getRouterGroup(),
        this.setContentType,
        rg.getRouter()
      );
    });
  }
}

module.exports = API;
