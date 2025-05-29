"use strict";

const { Router } = require("express");
const {
  signup,
  login,
  getUsersOfCompany,
} = require("../controller/user.controller");
const { ROLES } = require("../utils/constants");
const Auth = require("../middlewares/Auth");
const {
  validateSignup,
  validateLogin,
  validateGetUsersQuery,
} = require("../validation/userValidation");
const { validateTokenQuery } = require("../validation/authValidation");

class UserAPI {
  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  setupRoutes() {
    let router = this.router;

    // Admin signup with validation
    router.post("/admin/signup", validateSignup, signup);

    // Login with validation (tokens are optional, handled in controller)
    router.post("/login", validateLogin, login);

    // Get users with query validation
    router.get(
      "/",
      Auth([ROLES.ADMIN]),
      validateGetUsersQuery,
      getUsersOfCompany
    );
  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return "/users";
  }
}

module.exports = UserAPI;
