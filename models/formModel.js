"use strict";

const { Schema, model, Types } = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const { getMongooseAggregatePaginatedData } = require("../utils");
const {
  FORM_FIELD_TYPES,
  FORM_STATUS,
  FORM_SHARING,
} = require("../utils/constants");

// Form field validation schema
const validationSchema = new Schema(
  {
    required: { type: Boolean, default: false },
    minLength: { type: Number },
    maxLength: { type: Number },
    min: { type: Number },
    max: { type: Number },
    pattern: { type: String }, // regex pattern
    customMessage: { type: String },
  },
  { _id: false }
);

// Form field styling schema
const stylingSchema = new Schema(
  {
    width: { type: String, default: "100%" },
    placeholder: { type: String },
    description: { type: String },
    className: { type: String },
    fontFamily: { type: String },
    fontSize: { type: String, default: "regular" }, // regular, small, large
    fontWeight: { type: String, default: "10pt" },
    textAlign: { type: String, default: "left" }, // left, center, right, justify
    color: { type: String, default: "#000000" },
    backgroundColor: { type: String },
  },
  { _id: false }
);

// Form field schema
const formFieldSchema = new Schema({
  label: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: Object.values(FORM_FIELD_TYPES),
  },
  fieldName: { type: String, required: true }, // unique within form
  order: { type: Number, required: true },
  options: [{ type: String }], // for select, radio, checkbox
  validation: { type: validationSchema, default: {} },
  styling: { type: stylingSchema, default: {} },
  isActive: { type: Boolean, default: true },
});

// Form preferences schema
const preferencesSchema = new Schema(
  {
    addCustomFieldToTask: { type: Boolean, default: false },
    keepFieldsFullWidth: { type: Boolean, default: false },
    addCaptcha: { type: Boolean, default: false },
    showSubmitAnotherLink: { type: Boolean, default: false },
  },
  { _id: false }
);

// Form sharing settings schema
const sharingSettingsSchema = new Schema(
  {
    sharing: {
      type: String,
      enum: Object.values(FORM_SHARING),
      default: FORM_SHARING.PRIVATE,
    },
    allowAnonymous: { type: Boolean, default: true },
    linkExpiry: { type: Date },
    maxResponses: { type: Number },
    embedCode: { type: String },
    shareWithSearchEngines: { type: Boolean, default: false },
  },
  { _id: false }
);

// Main form schema
const formSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  type: { type: String }, // Optional text field to describe what kind of form this is
  tabId: { type: Types.ObjectId, ref: "ChannelTab", required: true },
  createdBy: { type: Types.ObjectId, ref: "User", required: true },
  status: {
    type: String,
    enum: Object.values(FORM_STATUS),
    default: FORM_STATUS.PUBLISHED,
  },
  fields: [formFieldSchema],
  attachments: [{ type: String }], // Array of file URLs from upload API
  sharingSettings: { type: sharingSettingsSchema, default: {} },
  preferences: { type: preferencesSchema, default: {} },
  responseCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes
formSchema.index({ tabId: 1 });
formSchema.index({ createdBy: 1 });
formSchema.index({ status: 1 });

// Register pagination plugins
formSchema.plugin(mongoosePaginate);
formSchema.plugin(aggregatePaginate);

const FormModel = model("Form", formSchema);

// Basic CRUD operations following the same pattern
exports.createForm = (obj) => FormModel.create(obj);

exports.findForm = (query) => FormModel.findOne(query);

exports.findManyForms = (query) => FormModel.find(query);

exports.updateForm = (query, update, options = {}) =>
  FormModel.findOneAndUpdate(query, update, { new: true, ...options });

exports.deleteForm = (query) => FormModel.findOneAndDelete(query);

exports.getAllForms = async ({ query, page, limit, responseKey = "data" }) => {
  const { data, pagination } = await getMongooseAggregatePaginatedData({
    model: FormModel,
    query,
    page,
    limit,
  });
  return { [responseKey]: data, pagination };
};
