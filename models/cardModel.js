"use strict";

const { Schema, model, Types } = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const { getMongooseAggregatePaginatedData } = require("../utils");

// Task reference schema for ordering within cards
const taskReferenceSchema = new Schema(
  {
    taskId: { type: Types.ObjectId, ref: "Task", required: true },
    orderIndex: { type: Number, required: true }, // For drag & drop ordering
    addedAt: { type: Date, default: Date.now },
    addedBy: { type: Types.ObjectId, ref: "User", required: true },
  },
  { _id: false }
);

// Custom card schema
const cardSchema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  channelId: { type: Types.ObjectId, ref: "Channel", required: true },
  tabId: { type: Types.ObjectId, ref: "ChannelTab", required: true },
  createdBy: { type: Types.ObjectId, ref: "User", required: true },

  // Task references with ordering
  tasks: [taskReferenceSchema],

  // Card display properties
  color: { type: String, default: "#6C63FF" }, // Card header color
  isActive: { type: Boolean, default: true },

  // Card ordering (for reordering cards themselves)
  cardOrder: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for performance
cardSchema.index({ channelId: 1, tabId: 1 });
cardSchema.index({ "tasks.taskId": 1 });
cardSchema.index({ channelId: 1, tabId: 1, cardOrder: 1 });

// Middleware to update updatedAt
cardSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Register pagination plugins
cardSchema.plugin(mongoosePaginate);
cardSchema.plugin(aggregatePaginate);

const CardModel = model("Card", cardSchema);

// Create new card
exports.createCard = (cardData) => CardModel.create(cardData);

// Find card by query
exports.findCard = (query) => CardModel.findOne(query);

// Find many cards
exports.findManyCards = (query) => CardModel.find(query);

// Update card
exports.updateCard = (query, update, options = {}) =>
  CardModel.findOneAndUpdate(query, update, { new: true, ...options });

// Delete card
exports.deleteCard = (query) => CardModel.findOneAndDelete(query);

// Add task to card
exports.addTaskToCard = async (cardId, taskId, addedBy, orderIndex = null) => {
  const card = await CardModel.findById(cardId);
  if (!card) throw new Error("Card not found");

  // Check if task already exists in card
  const existingTask = card.tasks.find(
    (t) => t.taskId.toString() === taskId.toString()
  );
  if (existingTask) throw new Error("Task already exists in this card");

  // Calculate order index if not provided
  if (orderIndex === null) {
    const maxOrder =
      card.tasks.length > 0
        ? Math.max(...card.tasks.map((t) => t.orderIndex))
        : 0;
    orderIndex = maxOrder + 1000; // Add with gap for future insertions
  }

  // Add task reference
  card.tasks.push({
    taskId,
    orderIndex,
    addedBy,
    addedAt: new Date(),
  });

  return card.save();
};

// Remove task from card
exports.removeTaskFromCard = async (cardId, taskId) => {
  return CardModel.findByIdAndUpdate(
    cardId,
    { $pull: { tasks: { taskId } } },
    { new: true }
  );
};

// Reorder task within card
exports.reorderTaskInCard = async (cardId, taskId, newOrderIndex) => {
  return CardModel.findOneAndUpdate(
    { _id: cardId, "tasks.taskId": taskId },
    { $set: { "tasks.$.orderIndex": newOrderIndex } },
    { new: true }
  );
};

// Get all cards with pagination
exports.getAllCards = async ({ query, page, limit, responseKey = "cards" }) => {
  const { data, pagination } = await getMongooseAggregatePaginatedData({
    model: CardModel,
    query,
    page,
    limit,
  });

  return { [responseKey]: data, pagination };
};

// Get cards without pagination
exports.getAllCardsWithoutPagination = async (query) => {
  try {
    const data = await CardModel.aggregate(query);
    return data;
  } catch (error) {
    console.error("Error in getAllCardsWithoutPagination:", error);
    throw error;
  }
};
