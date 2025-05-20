"use strict";

const { Router } = require("express");
const {
  getCompany,
  updateCompany,
} = require("../controller/company.controller");
const Auth = require("../middlewares/Auth");
const { ROLES } = require("../utils/constants");
class CompanyApi {
  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  setupRoutes() {
    let router = this.router;
    router.get("/", Auth([ROLES.ADMIN, ROLES.EMPLOYEE]), getCompany);
    router.put("/", Auth([ROLES.ADMIN]), updateCompany);
  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return "/companies";
  }
}

module.exports = CompanyApi;
