exports.ROLES = Object.freeze({
  ADMIN: "admin",
  EMPLOYEE: "employee",
  DEMO_USER: "demo_user",
});

exports.WORK_TYPE = Object.freeze({
  WORK: "work",
  PERSONAL: "personal",
  SCHOOL: "school",
  NONPROFIT: "nonp rofit",
});

exports.CURRENT_ROLE = Object.freeze({
  DIRECTOR: "director",
  TEAM_LEADER: "team leader",
  BUSINESS_OWNER: "business owner",
  TEAM_MEMBER: "team member",
  DESIGNER: "designer",
  FREELANCER: "freelancer",
});

exports.TEAM_QUANTITY = Object.freeze({
  ONLY_ME: "only me",
  TWO_TO_FIVE: "02-05",
  SIX_TO_TEN: "06-10",
  ELEVEN_TO_FIFTEEN: "11-15",
  SIXTEEN_TO_TWENTY_FIVE: "16-25",
  TWENTY_SIX_TO_FIFTY: "26-50",
  FIFTY_ONE_TO_HUNDRED: "51-100",
  ONE_HUNDRED_ONE_TO_FIVE_HUNDRED: "101-500",
});

exports.ORGANIZATION_QUANTITY = Object.freeze({
  ONE_TO_NINETEEN: "1-19",
  TENTY_TO_FOURTY_NINE: "20-49",
  FIFTY_TO_NINETY_NINE: "50-99",
  ONE_HUNDRED_TO_TWO_HUNDRED_FIFTY: "100-250",
  TWO_HUNDRED_FIFTY_ONE_TO_FIVE_HUNDRED: "251-500",
  FIVE_HUNDRED_ONE_TO_ONE_THOUSEND_FIVE_HUNDRED: "501-1500",
  ONE_THOUSEND_FIVE_HUNDRED_PLUS: "1500+",
});

exports.SOURCE = Object.freeze({
  YOUTUBE: "youtube",
  SEARCH_ENGINE: "search engine",
  LINKEDIN: "linkedin",
  FACEBOOK: "facebook",
  INSTAGRAM: "instagram",
  AUDIO_AD: "audio ad",
  OTHER: "other",
});

exports.CHANNEL_PREFERENCE = Object.freeze({
  TASK_MANAGEMENT: "task management",
  CLIENT_MANAGEMENT: "client management",
  FORM_BUILDER: "form builder",
  WORK_IN_PROGRESS: "work in progress",
  TIME_TRACKING: "time tracking",
});

exports.STATUS_CODES = Object.freeze({
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
});

exports.PRIVACY = Object.freeze({
  PUBLIC: "public",
  PRIVATE: "private",
});

exports.DEFAULT_TABS = Object.freeze({
  TASK_MANAGEMENT: "task management",
  CLIENT_MANAGEMENT: "client management",
  FORM_BUILDER: "form builder",
  WORK_IN_PROGRESS: "work in progress",
});

// Custom field type enum
exports.CUSTOM_FIELD_TYPES = Object.freeze({
  NUMBER: "number",
  TEXT: "text",
  DATE: "date",
  TEXTAREA: "textarea",
  CHECKBOX: "checkbox",
  DROPDOWN: "dropdown",
});
