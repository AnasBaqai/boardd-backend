const Joi = require("joi");
const { CUSTOM_FIELD_TYPES } = require("../utils/constants");
const { helpers } = require("./authValidation");

// Custom field validation schema
const customFieldSchema = Joi.object({
  name: Joi.string().trim().min(1).max(50).required().messages({
    "string.empty": "Custom field name is required",
    "string.min": "Custom field name must be at least 1 character long",
    "string.max": "Custom field name cannot exceed 50 characters",
  }),

  type: Joi.string()
    .valid(...Object.values(CUSTOM_FIELD_TYPES))
    .required()
    .messages({
      "any.only": `Custom field type must be one of: ${Object.values(
        CUSTOM_FIELD_TYPES
      ).join(", ")}`,
      "string.empty": "Custom field type is required",
    }),

  value: Joi.alternatives()
    .try(
      Joi.string(),
      Joi.number(),
      Joi.boolean(),
      Joi.date(),
      Joi.array().items(Joi.string())
    )
    .optional()
    .messages({
      "alternatives.types":
        "Custom field value must be string, number, boolean, date, or array of strings",
    }),

  options: Joi.when("type", {
    is: CUSTOM_FIELD_TYPES.DROPDOWN,
    then: Joi.array()
      .items(Joi.string().trim().min(1))
      .max(3)
      .min(1)
      .required()
      .messages({
        "array.max": "Dropdown can have maximum 3 options",
        "array.min": "Dropdown must have at least 1 option",
        "any.required": "Options are required for dropdown type",
      }),
    otherwise: Joi.forbidden(),
  }),
});

// Create task validation schema
const createTaskValidation = Joi.object({
  title: Joi.string().trim().min(1).max(200).required().messages({
    "string.empty": "Task title is required",
    "string.min": "Task title must be at least 1 character long",
    "string.max": "Task title cannot exceed 200 characters",
  }),

  description: Joi.string().trim().max(1000).optional().default("").messages({
    "string.max": "Task description cannot exceed 1000 characters",
  }),

  projectId: helpers.objectIdValidation.required().messages({
    "any.required": "Project ID is required",
  }),

  assignedTo: Joi.array()
    .items(helpers.objectIdValidation)
    .optional()
    .default([])
    .messages({
      "array.base": "Assigned to must be an array of valid user IDs",
    }),

  status: Joi.string()
    .valid("todo", "in_progress", "completed")
    .optional()
    .default("todo")
    .messages({
      "any.only": "Status must be one of: todo, in_progress, completed",
    }),

  priority: Joi.string()
    .valid("low", "medium", "high")
    .optional()
    .default("medium")
    .messages({
      "any.only": "Priority must be one of: low, medium, high",
    }),

  dueDate: Joi.date().optional().messages({
    "date.base": "Due date must be a valid date",
  }),

  tags: Joi.array()
    .items(Joi.string().trim().min(1).max(30))
    .optional()
    .default([])
    .messages({
      "array.base": "Tags must be an array of strings",
      "string.min": "Each tag must be at least 1 character long",
      "string.max": "Each tag cannot exceed 30 characters",
    }),

  strokeColor: Joi.string()
    .pattern(/^#([0-9A-F]{3}){1,2}$/i)
    .optional()
    .default("#6C63FF")
    .messages({
      "string.pattern.base":
        "Stroke color must be a valid hex color (e.g., #6C63FF)",
    }),

  type: Joi.string().optional().default("task").messages({
    "string.base": "Type must be a string",
  }),

  attachments: Joi.array()
    .items(Joi.string().uri())
    .optional()
    .default([])
    .messages({
      "array.base": "Attachments must be an array of valid URLs",
      "string.uri": "Each attachment must be a valid URL",
    }),

  customFields: Joi.array()
    .items(customFieldSchema)
    .optional()
    .default([])
    .messages({
      "array.base": "Custom fields must be an array",
    }),
});

// Batch update task validation schema
const batchUpdateTaskValidation = Joi.object({
  title: Joi.string().trim().min(1).max(200).optional().messages({
    "string.min": "Task title must be at least 1 character long",
    "string.max": "Task title cannot exceed 200 characters",
  }),

  description: Joi.string().trim().max(1000).optional().messages({
    "string.max": "Task description cannot exceed 1000 characters",
  }),

  assignedTo: Joi.array()
    .items(helpers.objectIdValidation)
    .optional()
    .messages({
      "array.base": "Assigned to must be an array of valid user IDs",
    }),

  status: Joi.string()
    .valid("todo", "in_progress", "completed")
    .optional()
    .messages({
      "any.only": "Status must be one of: todo, in_progress, completed",
    }),

  priority: Joi.string().valid("low", "medium", "high").optional().messages({
    "any.only": "Priority must be one of: low, medium, high",
  }),

  dueDate: Joi.date().optional().allow(null).messages({
    "date.base": "Due date must be a valid date",
  }),

  tags: Joi.array()
    .items(Joi.string().trim().min(1).max(30))
    .optional()
    .messages({
      "array.base": "Tags must be an array of strings",
      "string.min": "Each tag must be at least 1 character long",
      "string.max": "Each tag cannot exceed 30 characters",
    }),

  strokeColor: Joi.string()
    .pattern(/^#([0-9A-F]{3}){1,2}$/i)
    .optional()
    .messages({
      "string.pattern.base":
        "Stroke color must be a valid hex color (e.g., #6C63FF)",
    }),

  attachments: Joi.array().items(Joi.string().uri()).optional().messages({
    "array.base": "Attachments must be an array of valid URLs",
    "string.uri": "Each attachment must be a valid URL",
  }),

  customFields: Joi.array().items(customFieldSchema).optional().messages({
    "array.base": "Custom fields must be an array",
  }),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

// Share task validation schema
const shareTaskValidation = Joi.object({
  emails: Joi.array()
    .items(
      Joi.string().email().messages({
        "string.email": "Each email must be a valid email address",
      })
    )
    .min(1)
    .max(20)
    .optional()
    .messages({
      "array.base": "Emails must be an array of email addresses",
      "array.min": "At least one email is required when emails are provided",
      "array.max": "Cannot share with more than 20 recipients at once",
    }),

  message: Joi.string().trim().max(500).optional().messages({
    "string.max": "Custom message cannot exceed 500 characters",
  }),

  shareType: Joi.string()
    .valid("email", "link", "both")
    .optional()
    .default("link")
    .messages({
      "any.only": "Share type must be one of: email, link, both",
    }),
}).custom((value, helpers) => {
  // If shareType is 'email' or 'both', emails are required
  if (
    (value.shareType === "email" || value.shareType === "both") &&
    !value.emails
  ) {
    return helpers.message(
      "Emails are required when shareType is 'email' or 'both'"
    );
  }
  return value;
});

// Task ID parameter validation
const taskIdParamValidation = Joi.object({
  taskId: helpers.objectIdValidation.required().messages({
    "any.required": "Task ID is required",
  }),
});

// Validation middleware function
const validateRequest = (schema, source = "body") => {
  return (req, res, next) => {
    const dataToValidate =
      source === "query"
        ? req.query
        : source === "params"
        ? req.params
        : req.body;

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
        value: detail.context.value,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors,
        statusCode: 400,
      });
    }

    // Replace the original data with validated data
    if (source === "query") {
      req.query = value;
    } else if (source === "params") {
      req.params = value;
    } else {
      req.body = value;
    }

    next();
  };
};

module.exports = {
  validateCreateTask: validateRequest(createTaskValidation),
  validateBatchUpdateTask: validateRequest(batchUpdateTaskValidation),
  validateShareTask: validateRequest(shareTaskValidation),
  validateTaskIdParam: validateRequest(taskIdParamValidation, "params"),

  // Export schemas for testing or custom usage
  schemas: {
    createTaskValidation,
    batchUpdateTaskValidation,
    shareTaskValidation,
    taskIdParamValidation,
    customFieldSchema,
  },
};
