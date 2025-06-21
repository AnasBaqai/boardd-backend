"use strict";

const Joi = require("joi");
const {
  FORM_FIELD_TYPES,
  FORM_STATUS,
  FORM_SHARING,
} = require("../utils/constants");
const { STATUS_CODES } = require("../utils/constants");

// Field validation schema (flexible)
const fieldValidationSchema = Joi.object({
  required: Joi.boolean().default(false),
  minLength: Joi.number().integer().min(0),
  maxLength: Joi.number().integer().min(0),
  min: Joi.number(),
  max: Joi.number(),
  pattern: Joi.string(),
  customMessage: Joi.string(),
}).unknown(false);

// Field styling schema (flexible)
const fieldStylingSchema = Joi.object({
  width: Joi.string().default("100%"),
  placeholder: Joi.string(),
  description: Joi.string(),
  className: Joi.string(),
  fontFamily: Joi.string(),
  fontSize: Joi.string().valid("regular", "small", "large").default("regular"),
  fontWeight: Joi.string().default("10pt"),
  textAlign: Joi.string()
    .valid("left", "center", "right", "justify")
    .default("left"),
  color: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .default("#000000"),
  backgroundColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
}).unknown(false);

// Form field schema
const formFieldSchema = Joi.object({
  label: Joi.string().required().trim().min(1).max(100),
  type: Joi.string()
    .valid(...Object.values(FORM_FIELD_TYPES))
    .required(),
  fieldName: Joi.string()
    .required()
    .trim()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z][a-zA-Z0-9_]*$/)
    .messages({
      "string.pattern.base":
        "Field name must start with a letter and contain only letters, numbers, and underscores",
    }),
  order: Joi.number().integer().min(1),
  options: Joi.array().items(Joi.string().trim().min(1)),
  validation: fieldValidationSchema.default({}),
  styling: fieldStylingSchema.default({}),
  isActive: Joi.boolean().default(true),
}).unknown(false);

// Form preferences schema
const preferencesSchema = Joi.object({
  addCustomFieldToTask: Joi.boolean().default(false),
  keepFieldsFullWidth: Joi.boolean().default(false),
  addCaptcha: Joi.boolean().default(false),
  showSubmitAnotherLink: Joi.boolean().default(false),
}).unknown(false);

// Sharing settings schema
const sharingSettingsSchema = Joi.object({
  sharing: Joi.string()
    .valid(...Object.values(FORM_SHARING))
    .default(FORM_SHARING.PRIVATE),
  allowAnonymous: Joi.boolean().default(true),
  linkExpiry: Joi.alternatives().try(
    Joi.date(),
    Joi.string().pattern(/^\d{2}-\d{2}-\d{4}$/), // DD-MM-YYYY format
    Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
    Joi.string().isoDate(), // ISO date format
    Joi.allow(null)
  ),
  maxResponses: Joi.number().integer().min(1),
  embedCode: Joi.string(),
  shareWithSearchEngines: Joi.boolean().default(false),
}).unknown(false);

// Create form validation
const createFormSchema = Joi.object({
  title: Joi.string().required().trim().min(1).max(100),
  description: Joi.string().trim().max(500).allow("").default(""),
  type: Joi.string().trim().max(100).allow(""),
  tabId: Joi.string()
    .required()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      "string.pattern.base": "Invalid tab ID format",
    }),
  fields: Joi.array().items(formFieldSchema).default([]),
  attachments: Joi.array()
    .items(
      Joi.string().uri().messages({
        "string.uri": "Each attachment must be a valid URL",
      })
    )
    .default([]),
  sharingSettings: sharingSettingsSchema.default({}),
  preferences: preferencesSchema.default({}),
}).unknown(false);

// Update form validation (all fields optional except those that shouldn't change)
const updateFormSchema = Joi.object({
  title: Joi.string().trim().min(1).max(100),
  description: Joi.string().trim().max(500).allow(""),
  type: Joi.string().trim().max(100).allow(""),
  status: Joi.string().valid(...Object.values(FORM_STATUS)),
  fields: Joi.array().items(formFieldSchema),
  attachments: Joi.array().items(
    Joi.string().uri().messages({
      "string.uri": "Each attachment must be a valid URL",
    })
  ),
  sharingSettings: sharingSettingsSchema,
  preferences: preferencesSchema,
})
  .unknown(false)
  .min(1);

// Get forms query validation
const getFormsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid(...Object.values(FORM_STATUS)),
}).unknown(false);

// Validation middleware
const validateCreateForm = (req, res, next) => {
  const { error, value } = createFormSchema.validate(req.body);

  if (error) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      message: "Validation error",
      errors: error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      })),
    });
  }

  // Use Object.assign to avoid read-only property issues
  Object.assign(req.body, value);
  next();
};

const validateUpdateForm = (req, res, next) => {
  const { error, value } = updateFormSchema.validate(req.body);

  if (error) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      message: "Validation error",
      errors: error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      })),
    });
  }

  // Use Object.assign to avoid read-only property issues
  Object.assign(req.body, value);
  next();
};

const validateGetFormsQuery = (req, res, next) => {
  const { error, value } = getFormsQuerySchema.validate(req.query);

  if (error) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      message: "Query validation error",
      errors: error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      })),
    });
  }

  // Use Object.assign to avoid read-only property issues
  Object.assign(req.query, value);
  next();
};

const validateFormId = (req, res, next) => {
  const { formId } = req.params;

  if (!formId || !/^[0-9a-fA-F]{24}$/.test(formId)) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      message: "Invalid form ID format",
    });
  }

  next();
};

const validateTabId = (req, res, next) => {
  const { tabId } = req.params;

  if (!tabId || !/^[0-9a-fA-F]{24}$/.test(tabId)) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      message: "Invalid tab ID format",
    });
  }

  next();
};

module.exports = {
  validateCreateForm,
  validateUpdateForm,
  validateGetFormsQuery,
  validateFormId,
  validateTabId,
};
