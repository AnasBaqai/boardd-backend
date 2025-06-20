"use strict";

const { Router } = require("express");
const {
  createForm,
  getFormsByTab,
  getFormById,
  updateForm,
  deleteForm,
} = require("../controller/formController");
const Auth = require("../middlewares/Auth");
const { ROLES } = require("../utils/constants");
const {
  validateCreateForm,
  validateUpdateForm,
  validateGetFormsQuery,
  validateFormId,
  validateTabId,
} = require("../validation/formValidation");

class FormApi {
  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  setupRoutes() {
    let router = this.router;

    // Create form
    router.post(
      "/",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateCreateForm,
      createForm
    );

    // Get forms by tab
    router.get(
      "/tab/:tabId",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateTabId,
      validateGetFormsQuery,
      getFormsByTab
    );

    // Get form by ID
    router.get(
      "/:formId",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.GUEST]), // Allow guest access for public forms
      validateFormId,
      getFormById
    );

    // Update form
    router.put(
      "/:formId",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateFormId,
      validateUpdateForm,
      updateForm
    );

    // Delete form (soft delete)
    router.delete(
      "/:formId",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateFormId,
      deleteForm
    );
  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return "/forms";
  }
}

module.exports = FormApi;
