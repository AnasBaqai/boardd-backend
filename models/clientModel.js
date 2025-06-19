const { Schema, model, Types } = require("mongoose");
const { ROLES } = require("../utils/constants");
const mongoosePaginate = require("mongoose-paginate-v2");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const { getMongooseAggregatePaginatedData } = require("../utils");

//personal details schema
const personalDetailsSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: {
    countryCode: { type: String, required: true },
    number: { type: String, required: true },
  },
  address: {
    line_1: { type: String, required: true },
    line_2: { type: String, required: true },
  },
  company: { type: String },
});

// Simple project schema for client data
const projectSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
  },
  {
    _id: true,
    timestamps: false,
  }
);

//client schema
const clientSchema = new Schema({
  personalDetails: [{ type: personalDetailsSchema }],
  attachments: [{ type: String }],
  tabId: { type: Types.ObjectId, ref: "ChannelTab", required: true },
  projects: [projectSchema],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Index for better query performance
clientSchema.index({ tabId: 1 });

//register pagination plugin to client model
clientSchema.plugin(mongoosePaginate);
clientSchema.plugin(aggregatePaginate);

const ClientModel = model("Client", clientSchema);

// Utility functions for client operations
exports.createClient = (clientData) => ClientModel.create(clientData);

exports.findClient = (query) => ClientModel.findOne(query);

exports.findManyClients = (query) => ClientModel.find(query);

exports.updateClient = (query, updateData, options = {}) =>
  ClientModel.findOneAndUpdate(query, updateData, { new: true, ...options });

exports.deleteClient = (query) => ClientModel.findOneAndDelete(query);

// Get all clients with pagination
exports.getAllClients = async ({
  query,
  page,
  limit,
  responseKey = "clients",
}) => {
  const { data, pagination } = await getMongooseAggregatePaginatedData({
    model: ClientModel,
    query,
    page,
    limit,
  });

  return { [responseKey]: data, pagination };
};

// Project specific utility functions
exports.addProject = async (clientId, projectData) => {
  return ClientModel.findByIdAndUpdate(
    clientId,
    {
      $push: { projects: projectData },
      updatedAt: new Date(),
    },
    { new: true }
  );
};
