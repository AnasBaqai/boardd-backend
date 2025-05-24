"use strict";

const multer = require("multer");
const fs = require("fs");
const FCM = require("fcm-node");
const { STATUS_CODES } = require("./constants");
const moment = require("moment");

exports.generateResponse = (data, message, res, code = 200) => {
  return res.status(code).json({
    message,
    data,
  });
};

exports.parseBody = (body) => {
  let obj;
  if (typeof body === "object") obj = body;
  else obj = JSON.parse(body);
  return obj;
};

exports.generateRandomOTP = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

exports.upload = (folderName) => {
  return multer({
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        const path = `uploads/${folderName}/`;
        fs.mkdirSync(path, { recursive: true });
        cb(null, path);
      },

      // By default, multer removes file extensions so let's add them back
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + "." + file.originalname.split(".").pop());
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // max 10MB //
    fileFilter: (req, file, cb) => {
      // check mime type
      if (
        !file.mimetype.match(
          /image\/(jpg|JPG|webp|jpeg|JPEG|png|PNG|gif|GIF|jfif|JFIF)/
        )
      ) {
        req.fileValidationError = "Only image files are allowed!";
        return cb(null, false);
      }
      cb(null, true);
    },
  });
};

exports.sendNotificationToAll = ({ body, fcmTokens }) => {
  const serverKey = process.env.FIREBASE_SERVER_KEY;
  const fcm = new FCM(serverKey);
  const title = process.env.APP_NAME;

  const message = {
    // the registration tokens of the devices you want to send the message to
    registration_ids: [...fcmTokens],
    notification: { title, body },
  };

  fcm.send(message, function (err, response) {
    if (err) {
      console.log("FCM - Something has gone wrong!");
    } else {
      console.log("Successfully sent with response: ", response);
    }
  });
};

// pagination with mongoose paginate library
exports.getMongoosePaginatedData = async ({
  model,
  page = 1,
  limit = 10,
  query = {},
  populate = "",
  select = "-password",
  sort = { createdAt: -1 },
}) => {
  const options = {
    select,
    sort,
    populate,
    lean: true,
    page,
    limit,
    customLabels: {
      totalDocs: "totalItems",
      docs: "data",
      limit: "perPage",
      page: "currentPage",
      meta: "pagination",
    },
  };

  const { data, pagination } = await model.paginate(query, options);
  return { data, pagination };
};

// aggregate pagination with mongoose paginate library
exports.getMongooseAggregatePaginatedData = async ({
  model,
  page = 1,
  limit = 10,
  query = [],
  populate = "",
  select = "-password",
  sort = { createdAt: -1 },
}) => {
  const options = {
    select,
    sort,
    populate,
    lean: true,
    page,
    limit,
    customLabels: {
      totalDocs: "totalItems",
      docs: "data",
      limit: "perPage",
      page: "currentPage",
      meta: "pagination",
    },
  };

  const myAggregate = model.aggregate(query);
  const { data, pagination } = await model.aggregatePaginate(
    myAggregate,
    options
  );
  return { data, pagination };
};

exports.sendNotification = ({
  title,
  body,
  fcmToken,
  data,
  priority = "normal",
}) => {
  const serverKey = process.env.FIREBASE_SERVER_KEY;
  const fcm = new FCM(serverKey);

  const message = {
    to: fcmToken,
    priority,
    notification: {
      title,
      body,
    },
    data,
  };

  // Send the notification
  fcm.send(message, (error, response) => {
    if (error) {
      console.error("Error sending notification:", error);
    } else {
      console.log("Notification sent successfully:", response);
    }
  });
};

exports.formatDate = (date) => moment(date).format("DD-MM-YYYY");

exports.formatTime = (date) => moment(date).format("HH:mm:ss");

exports.formatDateTime = (date) => moment(date).format("DD-MM-YYYY HH:mm:ss");

// Helper function to generate activity messages
exports.generateActivityMessage = (field, userName, data) => {
  const { previousValue, newValue, taskTitle } = data;

  switch (field) {
    case "status":
      return {
        forCreator: `You changed the status of "${taskTitle}" from ${previousValue} to ${newValue}`,
        forOthers: `${userName} changed the status of "${taskTitle}" from ${previousValue} to ${newValue}`,
      };

    case "priority":
      return {
        forCreator: `You changed the priority of "${taskTitle}" from ${previousValue} to ${newValue}`,
        forOthers: `${userName} changed the priority of "${taskTitle}" from ${previousValue} to ${newValue}`,
      };

    case "dueDate":
      return {
        forCreator: `You changed the due date of "${taskTitle}" to ${new Date(
          newValue
        ).toLocaleDateString()}`,
        forOthers: `${userName} changed the due date of "${taskTitle}" to ${new Date(
          newValue
        ).toLocaleDateString()}`,
      };

    case "assignedTo":
      return {
        forCreator: `You assigned "${taskTitle}" to ${
          Array.isArray(newValue) ? newValue.join(", ") : newValue
        }`,
        forOthers: `${userName} assigned "${taskTitle}" to ${
          Array.isArray(newValue) ? newValue.join(", ") : newValue
        }`,
      };

    case "description":
      return {
        forCreator: `You updated the description of "${taskTitle}"`,
        forOthers: `${userName} updated the description of "${taskTitle}"`,
      };

    case "strokeColor":
      return {
        forCreator: `You changed the color of "${taskTitle}"`,
        forOthers: `${userName} changed the color of "${taskTitle}"`,
      };

    case "tags":
      const addedTags = newValue.filter((tag) => !previousValue.includes(tag));
      const removedTags = previousValue.filter(
        (tag) => !newValue.includes(tag)
      );
      if (addedTags.length > 0) {
        return {
          forCreator: `You added tags ${addedTags.join(
            ", "
          )} to "${taskTitle}"`,
          forOthers: `${userName} added tags ${addedTags.join(
            ", "
          )} to "${taskTitle}"`,
        };
      } else {
        return {
          forCreator: `You removed tags ${removedTags.join(
            ", "
          )} from "${taskTitle}"`,
          forOthers: `${userName} removed tags ${removedTags.join(
            ", "
          )} from "${taskTitle}"`,
        };
      }

    default:
      return {
        forCreator: `You updated ${field} of "${taskTitle}"`,
        forOthers: `${userName} updated ${field} of "${taskTitle}"`,
      };
  }
};
