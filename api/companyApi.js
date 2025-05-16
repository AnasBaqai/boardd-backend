"use strict";

const { Router } = require("express");
const { getCompany } = require("../controller/company.controller");

class CompanyApi {
  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  setupRoutes() {
    let router = this.router;
    router.get("/", getCompany);
  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return "/companies";
  }
}

module.exports = CompanyApi;
