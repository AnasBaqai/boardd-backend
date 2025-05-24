"use strict";

const { Schema, model, Types } = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const { getMongooseAggregatePaginatedData } = require("../utils");
const { CUSTOM_FIELD_TYPES } = require("../utils/constants");

const customFieldSchema = new Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: Object.values(CUSTOM_FIELD_TYPES),
  },
  value: { type: Schema.Types.Mixed }, // Can store any type of value
  options: {
    type: [String], // For dropdown type, max 3 options
    validate: {
      validator: function (options) {
        // Only validate if type is dropdown
        return this.type !== CUSTOM_FIELD_TYPES.DROPDOWN || options.length <= 3;
      },
      message: "Dropdown can have maximum 3 options",
    },
  },
});

const taskSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  projectId: { type: Types.ObjectId, ref: "Project", required: true },
  createdBy: { type: Types.ObjectId, ref: "User", required: true },
  assignedTo: [{ type: Types.ObjectId, ref: "User" }],
  status: {
    type: String,
    enum: ["todo", "in_progress", "completed"],
    default: "todo",
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },
  dueDate: { type: Date },
  tags: [{ type: String }],
  strokeColor: { type: String, default: "#6C63FF" }, // Default purple
  type: { type: String, default: "task" },
  isActive: { type: Boolean, default: true },
  attachments: [{ type: String }],
  customFields: [customFieldSchema], // Add custom fields array
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// register pagination plugin to task model
taskSchema.plugin(mongoosePaginate);
taskSchema.plugin(aggregatePaginate);

const TaskModel = model("Task", taskSchema);

// create new task
exports.createTask = (obj) => TaskModel.create(obj);

// find task by query
exports.findTask = (query) => TaskModel.findOne(query);

//find many tasks by query
exports.findManyTasks = (query) => TaskModel.find(query);

// update task by query
exports.updateTask = (query, update, options = {}) =>
  TaskModel.findOneAndUpdate(query, update, { new: true, ...options });

// delete task by query
exports.deleteTask = (query) => TaskModel.findOneAndDelete(query);

// get all tasks
exports.getAllTasks = async ({ query, page, limit, responseKey = "data" }) => {
  const { data, pagination } = await getMongooseAggregatePaginatedData({
    model: TaskModel,
    query,
    page,
    limit,
  });
  return { [responseKey]: data, pagination };
};
