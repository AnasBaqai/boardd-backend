"use strict";

const { Router } = require("express");
const {
  signup,
  login,
  getUsersOfCompany,
} = require("../controller/user.controller");
const { ROLES } = require("../utils/constants");
const Auth = require("../middlewares/Auth");
class UserAPI {
  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  setupRoutes() {
    let router = this.router;
    router.post("/admin/signup", signup);
    router.post("/login", login);
    router.get("/", Auth([ROLES.ADMIN]), getUsersOfCompany);
  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return "/users";
  }
}

module.exports = UserAPI;
