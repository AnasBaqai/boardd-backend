"use strict";

const Joi = require("joi");
const { STATUS_CODES } = require("../utils/constants");

// Validation for creating a new card
const validateCreateCard = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(1).max(100).required().messages({
      "string.empty": "Card name is required",
      "string.min": "Card name must be at least 1 character",
      "string.max": "Card name cannot exceed 100 characters",
      "any.required": "Card name is required",
    }),
    description: Joi.string().allow("").max(500).optional().messages({
      "string.max": "Description cannot exceed 500 characters",
    }),
    color: Joi.string()
      .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
      .optional()
      .messages({
        "string.pattern.base":
          "Color must be a valid hex color (e.g., #6C63FF)",
      }),
  });

  // Validate params
  const paramsSchema = Joi.object({
    channelId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Channel ID must be a valid MongoDB ObjectId",
        "any.required": "Channel ID is required",
      }),
    tabId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Tab ID must be a valid MongoDB ObjectId",
        "any.required": "Tab ID is required",
      }),
  });

  // Validate body
  const { error: bodyError } = schema.validate(req.body);
  if (bodyError) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      message: bodyError.details[0].message,
    });
  }

  // Validate params
  const { error: paramsError } = paramsSchema.validate(req.params);
  if (paramsError) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      message: paramsError.details[0].message,
    });
  }

  next();
};

// Validation for updating a card
const validateUpdateCard = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(1).max(100).optional().messages({
      "string.empty": "Card name cannot be empty",
      "string.min": "Card name must be at least 1 character",
      "string.max": "Card name cannot exceed 100 characters",
    }),
    description: Joi.string().allow("").max(500).optional().messages({
      "string.max": "Description cannot exceed 500 characters",
    }),
    color: Joi.string()
      .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
      .optional()
      .messages({
        "string.pattern.base":
          "Color must be a valid hex color (e.g., #6C63FF)",
      }),
  })
    .min(1)
    .messages({
      "object.min": "At least one field must be provided for update",
    });

  // Validate params
  const paramsSchema = Joi.object({
    cardId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Card ID must be a valid MongoDB ObjectId",
        "any.required": "Card ID is required",
      }),
  });

  // Validate body
  const { error: bodyError } = schema.validate(req.body);
  if (bodyError) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      message: bodyError.details[0].message,
    });
  }

  // Validate params
  const { error: paramsError } = paramsSchema.validate(req.params);
  if (paramsError) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      message: paramsError.details[0].message,
    });
  }

  next();
};

// Validation for getting cards
const validateGetCards = (req, res, next) => {
  const paramsSchema = Joi.object({
    channelId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Channel ID must be a valid MongoDB ObjectId",
        "any.required": "Channel ID is required",
      }),
    tabId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Tab ID must be a valid MongoDB ObjectId",
        "any.required": "Tab ID is required",
      }),
  });

  // Validate params
  const { error: paramsError } = paramsSchema.validate(req.params);
  if (paramsError) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      message: paramsError.details[0].message,
    });
  }

  next();
};

// Validation for deleting a card
const validateDeleteCard = (req, res, next) => {
  const paramsSchema = Joi.object({
    cardId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Card ID must be a valid MongoDB ObjectId",
        "any.required": "Card ID is required",
      }),
  });

  // Validate params
  const { error: paramsError } = paramsSchema.validate(req.params);
  if (paramsError) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      message: paramsError.details[0].message,
    });
  }

  next();
};

module.exports = {
  validateCreateCard,
  validateUpdateCard,
  validateGetCards,
  validateDeleteCard,
};
