"use strict";

const socketIO = require("socket.io");
const { createActivity } = require("../models/activityModel");
const { updateTask } = require("../models/taskModel");
const { updateSubtask } = require("../models/subtaskModel");

let io;

// Initialize socket.io
exports.initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Join all accessible tabs for a user
    socket.on("join-user-tabs", async (data) => {
      const { userId, tabs } = data;
      console.log(`Socket ${socket.id} joining tabs for user: ${userId}`);

      // Join user's personal room for mentions/notifications
      if (userId) {
        console.log(`Socket ${socket.id} joining user room: ${userId}`);
        socket.join(`user:${userId}`);
      }

      // Join all tab rooms the user has access to
      if (Array.isArray(tabs)) {
        tabs.forEach((tabId) => {
          console.log(`Socket ${socket.id} joining tab room: ${tabId}`);
          socket.join(`tab:${tabId}`);
        });
      }
    });

    // Join specific task room for real-time updates
    socket.on("join-task", (data) => {
      const { taskId } = data;
      console.log(`Socket ${socket.id} joining task room: ${taskId}`);
      socket.join(`task:${taskId}`);
    });

    // Leave specific task room
    socket.on("leave-task", (data) => {
      const { taskId } = data;
      console.log(`Socket ${socket.id} leaving task room: ${taskId}`);
      socket.leave(`task:${taskId}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
};

// Get io instance
exports.getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

// Single function to emit any task-related updates
exports.emitTaskEvent = (data) => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }

  const { taskId, tabId, type, payload } = data;

  // Emit task-specific update to users viewing the task
  if (taskId) {
    io.to(`task:${taskId}`).emit("task-update", {
      type,
      ...payload,
      timestamp: new Date(),
    });
  }

  // Emit to tab for activity feed
  if (tabId) {
    io.to(`tab:${tabId}`).emit("tab-activity", {
      type,
      ...payload,
      timestamp: new Date(),
    });
  }
};

// Emit notification to specific user
exports.emitUserNotification = (userId, data) => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  io.to(`user:${userId}`).emit("notification", {
    ...data,
    timestamp: new Date(),
  });
};
