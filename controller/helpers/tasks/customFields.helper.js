const { CUSTOM_FIELD_TYPES } = require("../../../utils/constants");
// Validate custom fields
exports.validateCustomFields = (customFields) => {
  if (!Array.isArray(customFields)) {
    return "Custom fields must be an array";
  }

  for (const field of customFields) {
    // Check required fields
    if (!field.name || !field.type) {
      return "Custom field name and type are required";
    }

    // Check if type is valid
    if (!Object.values(CUSTOM_FIELD_TYPES).includes(field.type)) {
      return "Invalid custom field type";
    }

    // Validate value based on type
    if (field.value !== undefined && field.value !== null) {
      switch (field.type) {
        case CUSTOM_FIELD_TYPES.NUMBER:
          if (typeof field.value !== "number") {
            return `${field.name} must be a number`;
          }
          break;
        case CUSTOM_FIELD_TYPES.TEXT:
        case CUSTOM_FIELD_TYPES.TEXTAREA:
          if (typeof field.value !== "string") {
            return `${field.name} must be a string`;
          }
          break;
        case CUSTOM_FIELD_TYPES.DATE:
          if (
            !(field.value instanceof Date) &&
            isNaN(Date.parse(field.value))
          ) {
            return `${field.name} must be a valid date`;
          }
          break;
        case CUSTOM_FIELD_TYPES.CHECKBOX:
          if (typeof field.value !== "boolean") {
            return `${field.name} must be a boolean`;
          }
          break;
        case CUSTOM_FIELD_TYPES.DROPDOWN:
          if (!field.options || !Array.isArray(field.options)) {
            return `${field.name} must have options array`;
          }
          if (field.options.length > 3) {
            return `${field.name} can have maximum 3 options`;
          }
          if (field.value && !field.options.includes(field.value)) {
            return `${field.name} value must be one of the options`;
          }
          break;
      }
    }
  }

  return null; // No validation errors
};
