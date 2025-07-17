"use strict";

const { parseBody, generateResponse } = require("../utils");
const { STATUS_CODES } = require("../utils/constants");
const { findUser } = require("../models/userModel");
const { findChannel } = require("../models/channelModel");
const { findChannelTab } = require("../models/channelTabsModel");
const {
  createCard,
  findCard,
  findManyCards,
  updateCard,
  deleteCard,
  addTaskToCard,
  removeTaskFromCard,
  reorderTaskInCard,
} = require("../models/cardModel");

/**
 * Create a new custom card
 */
exports.createCard = async (req, res, next) => {
  try {
    const { name, description, color } = parseBody(req.body);
    const { channelId, tabId } = req.params;
    const userId = req.user.id;

    // Validate required fields
    if (!name || !name.trim()) {
      return next({
        statusCode: STATUS_CODES.BAD_REQUEST,
        message: "Card name is required",
      });
    }

    // Validate user exists
    const user = await findUser({ _id: userId });
    if (!user) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "User not found",
      });
    }

    // Validate channel exists and user has access
    const channel = await findChannel({ _id: channelId });
    if (!channel) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Channel not found",
      });
    }

    if (!channel.members.includes(userId)) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "You are not a member of this channel",
      });
    }

    // Validate tab exists and belongs to channel
    const tab = await findChannelTab({ _id: tabId, channelId: channelId });
    if (!tab) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Tab not found in this channel",
      });
    }

    // Check if user has access to tab
    if (
      tab.members &&
      tab.members.length > 0 &&
      !tab.members.includes(userId)
    ) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "You are not a member of this tab",
      });
    }

    // Get next card order (for ordering cards)
    const existingCards = await findManyCards({
      channelId,
      tabId,
      isActive: true,
    });
    const maxOrder =
      existingCards.length > 0
        ? Math.max(...existingCards.map((c) => c.cardOrder || 0))
        : 0;

    // Create card
    const card = await createCard({
      name: name.trim(),
      description: description || "",
      channelId,
      tabId,
      createdBy: userId,
      color: color || "#6C63FF",
      cardOrder: maxOrder + 1000,
      tasks: [], // Empty initially
    });

    // Prepare response with user info
    const responseData = {
      _id: card._id,
      name: card.name,
      description: card.description,
      color: card.color,
      cardOrder: card.cardOrder,
      taskCount: 0,
      tasks: [],
      createdBy: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    };

    return generateResponse(
      responseData,
      "Card created successfully",
      res,
      STATUS_CODES.CREATED
    );
  } catch (error) {
    console.error("Error in createCard:", error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message ?? "Failed to create card",
    });
  }
};

/**
 * Get all cards for a channel/tab
 */
exports.getCards = async (req, res, next) => {
  try {
    const { channelId, tabId } = req.params;
    const userId = req.user.id;

    // Validate user exists
    const user = await findUser({ _id: userId });
    if (!user) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "User not found",
      });
    }

    // Validate channel access
    const channel = await findChannel({ _id: channelId });
    if (!channel) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Channel not found",
      });
    }

    if (!channel.members.includes(userId)) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "You are not a member of this channel",
      });
    }

    // Validate tab access
    const tab = await findChannelTab({ _id: tabId, channelId: channelId });
    if (!tab) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Tab not found in this channel",
      });
    }

    if (
      tab.members &&
      tab.members.length > 0 &&
      !tab.members.includes(userId)
    ) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "You are not a member of this tab",
      });
    }

    // Get cards for this tab (initially empty)
    const cards = await findManyCards({
      channelId,
      tabId,
      isActive: true,
    })
      .populate("createdBy", "_id name email")
      .sort({ cardOrder: 1 });

    // Format response
    const formattedCards = cards.map((card) => ({
      _id: card._id,
      name: card.name,
      description: card.description,
      color: card.color,
      cardOrder: card.cardOrder,
      taskCount: card.tasks.length,
      tasks: [], // Will be populated later with actual task details
      createdBy: card.createdBy,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    }));

    return generateResponse(
      formattedCards,
      "Cards fetched successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.error("Error in getCards:", error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message ?? "Failed to fetch cards",
    });
  }
};

/**
 * Update card details
 */
exports.updateCard = async (req, res, next) => {
  try {
    const { cardId } = req.params;
    const { name, description, color } = parseBody(req.body);
    const userId = req.user.id;

    // Find card
    const card = await findCard({ _id: cardId, isActive: true });
    if (!card) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Card not found",
      });
    }

    // Check permissions (channel member)
    const channel = await findChannel({ _id: card.channelId });
    if (!channel || !channel.members.includes(userId)) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "You don't have permission to update this card",
      });
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;

    // Update card
    const updatedCard = await updateCard({ _id: cardId }, updateData, {
      new: true,
    }).populate("createdBy", "_id name email");

    // Format response
    const responseData = {
      _id: updatedCard._id,
      name: updatedCard.name,
      description: updatedCard.description,
      color: updatedCard.color,
      cardOrder: updatedCard.cardOrder,
      taskCount: updatedCard.tasks.length,
      createdBy: updatedCard.createdBy,
      createdAt: updatedCard.createdAt,
      updatedAt: updatedCard.updatedAt,
    };

    return generateResponse(
      responseData,
      "Card updated successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.error("Error in updateCard:", error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message ?? "Failed to update card",
    });
  }
};

/**
 * Delete card
 */
exports.deleteCard = async (req, res, next) => {
  try {
    const { cardId } = req.params;
    const userId = req.user.id;

    // Find card
    const card = await findCard({ _id: cardId, isActive: true });
    if (!card) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Card not found",
      });
    }

    // Check permissions (only creator or channel admin can delete)
    const channel = await findChannel({ _id: card.channelId });
    if (!channel || !channel.members.includes(userId)) {
      return next({
        statusCode: STATUS_CODES.FORBIDDEN,
        message: "You don't have permission to delete this card",
      });
    }

    // Soft delete (mark as inactive)
    await updateCard({ _id: cardId }, { isActive: false });

    return generateResponse(
      { cardId },
      "Card deleted successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.error("Error in deleteCard:", error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message ?? "Failed to delete card",
    });
  }
};
