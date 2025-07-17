"use strict";

const { Router } = require("express");
const {
  createCard,
  getCards,
  updateCard,
  deleteCard,
} = require("../controller/cardController");
const Auth = require("../middlewares/Auth");
const { ROLES } = require("../utils/constants");
const {
  validateCreateCard,
  validateUpdateCard,
  validateGetCards,
  validateDeleteCard,
} = require("../validation/cardValidation");

class CardApi {
  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  setupRoutes() {
    let router = this.router;

    // Create new card in channel/tab
    router.post(
      "/:channelId/:tabId",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateCreateCard,
      createCard
    );

    // Get all cards for channel/tab
    router.get(
      "/:channelId/:tabId",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateGetCards,
      getCards
    );

    // Update card details
    router.put(
      "/:cardId",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateUpdateCard,
      updateCard
    );

    // Delete card
    router.delete(
      "/:cardId",
      Auth([ROLES.ADMIN, ROLES.EMPLOYEE]),
      validateDeleteCard,
      deleteCard
    );
  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return "/cards";
  }
}

module.exports = CardApi;
