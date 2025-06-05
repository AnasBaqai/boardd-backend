const UAParser = require("ua-parser-js");

/**
 * Extract device information from request
 * @param {Object} req - Express request object
 * @returns {Object} Device information object
 */
exports.extractDeviceInfo = (req) => {
  const parser = new UAParser();
  const userAgent = req.headers["user-agent"] || "";
  const ipAddress =
    req.ip ||
    req.connection.remoteAddress ||
    req.headers["x-forwarded-for"] ||
    "unknown";

  parser.setUA(userAgent);
  const result = parser.getResult();

  return {
    userAgent,
    ipAddress,
    browser: `${result.browser.name || "Unknown"} ${
      result.browser.version || ""
    }`.trim(),
    os: `${result.os.name || "Unknown"} ${result.os.version || ""}`.trim(),
    deviceType: result.device.type || "desktop", // mobile, tablet, desktop
  };
};

/**
 * Create device fingerprint for identification
 * @param {Object} deviceInfo - Device information object
 * @returns {String} Device fingerprint
 */
exports.createDeviceFingerprint = (deviceInfo) => {
  return `${deviceInfo.browser}_${deviceInfo.os}_${deviceInfo.deviceType}`;
};

/**
 * Generate human-readable device description
 * @param {Object} deviceInfo - Device information object
 * @returns {String} Human readable device description
 */
exports.getDeviceDescription = (deviceInfo) => {
  const browser = deviceInfo.browser || "Unknown Browser";
  const os = deviceInfo.os || "Unknown OS";
  return `${browser} on ${os}`;
};
