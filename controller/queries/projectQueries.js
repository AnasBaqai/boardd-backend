const { Types } = require("mongoose");

/**
 * Get tasks calendar view for a specific month (lightweight for calendar strips)
 * @param {string} channelId - Channel ID
 * @param {string} tabId - Tab ID
 * @param {string} userId - Current user ID
 * @param {Date} currentDate - Date in the month to show
 * @returns {Array} Aggregation pipeline
 */
exports.getTasksCalendarQuery = (channelId, tabId, userId, currentDate) => {
  // Calculate start and end of the month
  const startOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const endOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );

  return [
    // Match projects by channelId and tabId
    {
      $match: {
        channelId: Types.ObjectId.createFromHexString(channelId),
        tabId: Types.ObjectId.createFromHexString(tabId),
        status: "active", // Only active projects
      },
    },

    // Lookup company details for context path
    {
      $lookup: {
        from: "companies",
        localField: "companyId",
        foreignField: "_id",
        as: "company",
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
            },
          },
        ],
      },
    },

    // Lookup tasks for these projects
    {
      $lookup: {
        from: "tasks",
        localField: "_id",
        foreignField: "projectId",
        as: "tasks",
        pipeline: [
          {
            $match: {
              isActive: true,
              dueDate: { $exists: true, $ne: null },
              // Filter tasks for the specific month
              dueDate: {
                $gte: startOfMonth,
                $lte: endOfMonth,
              },
              // User must be assigned to task OR created the task
              $or: [
                { assignedTo: Types.ObjectId.createFromHexString(userId) },
                { createdBy: Types.ObjectId.createFromHexString(userId) },
              ],
            },
          },
          // Project minimal task fields for calendar strips
          {
            $project: {
              _id: 1,
              title: 1,
              status: 1,
              priority: 1,
              dueDate: 1,
              strokeColor: 1,
              isOverdue: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ["$dueDate", null] },
                      { $lt: ["$dueDate", new Date()] },
                      { $ne: ["$status", "completed"] },
                    ],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
        ],
      },
    },

    // Unwind company array
    {
      $unwind: {
        path: "$company",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Unwind tasks to work with individual tasks
    {
      $unwind: {
        path: "$tasks",
        preserveNullAndEmptyArrays: false, // Only projects with tasks
      },
    },

    // Project the final lightweight task structure with context path
    {
      $project: {
        _id: "$tasks._id",
        title: "$tasks.title",
        status: "$tasks.status",
        priority: "$tasks.priority",
        dueDate: "$tasks.dueDate",
        strokeColor: "$tasks.strokeColor",
        isOverdue: "$tasks.isOverdue",
        // Context path for tasks: company/project/task
        contextPath: {
          $concat: [
            { $ifNull: ["$company.name", "Unknown Company"] },
            "/",
            "$name",
            "/",
            "$tasks.title",
          ],
        },
        // Minimal project context
        project: {
          _id: "$_id",
          name: "$name",
          color: "$color",
        },
      },
    },

    // Sort by due date
    {
      $sort: {
        dueDate: 1, // Earliest first
        priority: -1, // High priority first for same date
      },
    },
  ];
};

/**
 * Get projects overview of a tab (minimal data)
 * @param {string} channelId - Channel ID
 * @param {string} tabId - Tab ID
 * @returns {Array} Aggregation pipeline
 */
exports.getProjectsOverviewQuery = (channelId, tabId) => {
  return [
    // Match projects by channelId and tabId
    {
      $match: {
        channelId: Types.ObjectId.createFromHexString(channelId),
        tabId: Types.ObjectId.createFromHexString(tabId),
        status: "active", // Only active projects
      },
    },

    // Lookup company details for context path
    {
      $lookup: {
        from: "companies",
        localField: "companyId",
        foreignField: "_id",
        as: "company",
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
            },
          },
        ],
      },
    },

    // Lookup project creator details
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "creator",
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
            },
          },
        ],
      },
    },

    // Lookup task counts for progress calculation (minimal lookup)
    {
      $lookup: {
        from: "tasks",
        localField: "_id",
        foreignField: "projectId",
        as: "taskCounts",
        pipeline: [
          {
            $match: {
              isActive: true,
            },
          },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ],
      },
    },

    // Calculate progress from task counts
    {
      $addFields: {
        taskStats: {
          $reduce: {
            input: "$taskCounts",
            initialValue: { total: 0, completed: 0 },
            in: {
              total: { $add: ["$$value.total", "$$this.count"] },
              completed: {
                $cond: [
                  { $eq: ["$$this._id", "completed"] },
                  { $add: ["$$value.completed", "$$this.count"] },
                  "$$value.completed",
                ],
              },
            },
          },
        },
      },
    },

    // Calculate progress percentage
    {
      $addFields: {
        progress: {
          $cond: {
            if: { $eq: ["$taskStats.total", 0] },
            then: 0,
            else: {
              $multiply: [
                {
                  $divide: ["$taskStats.completed", "$taskStats.total"],
                },
                100,
              ],
            },
          },
        },
      },
    },

    // Unwind creator array
    {
      $unwind: {
        path: "$creator",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Unwind company array
    {
      $unwind: {
        path: "$company",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Project minimal fields for overview
    {
      $project: {
        _id: 1,
        name: 1,
        priority: 1,
        color: 1,
        startDate: 1,
        endDate: 1,
        createdAt: 1,
        creator: 1,
        progress: {
          $round: ["$progress", 1], // Round to 1 decimal place
        },
        taskCount: "$taskStats.total",
        // Context path for projects: company/project
        contextPath: {
          $concat: [
            { $ifNull: ["$company.name", "Unknown Company"] },
            "/",
            "$name",
          ],
        },
        // Project status indicators
        isOverdue: {
          $cond: {
            if: {
              $and: [
                { $ne: ["$endDate", null] },
                { $lt: ["$endDate", new Date()] },
                { $ne: ["$status", "completed"] },
              ],
            },
            then: true,
            else: false,
          },
        },
        daysUntilDue: {
          $cond: {
            if: { $ne: ["$endDate", null] },
            then: {
              $ceil: {
                $divide: [
                  { $subtract: ["$endDate", new Date()] },
                  1000 * 60 * 60 * 24, // Convert milliseconds to days
                ],
              },
            },
            else: null,
          },
        },
      },
    },

    // Sort projects by priority and due date
    {
      $sort: {
        priority: -1, // high, medium, low
        endDate: 1, // earliest first
        createdAt: -1, // newest first if no due date
      },
    },
  ];
};

/**
 * Get projects of a tab with tasks grouped by status (detailed data)
 * @param {string} channelId - Channel ID
 * @param {string} tabId - Tab ID
 * @returns {Array} Aggregation pipeline
 */
exports.getProjectsOfTabQuery = (channelId, tabId) => {
  return [
    // Match projects by channelId and tabId
    {
      $match: {
        channelId: Types.ObjectId.createFromHexString(channelId),
        tabId: Types.ObjectId.createFromHexString(tabId),
        status: "active", // Only active projects
      },
    },

    // Lookup project creator details
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "creator",
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
            },
          },
        ],
      },
    },

    // Lookup company details for context path
    {
      $lookup: {
        from: "companies",
        localField: "companyId",
        foreignField: "_id",
        as: "company",
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
            },
          },
        ],
      },
    },

    // Lookup channel details
    {
      $lookup: {
        from: "channels",
        localField: "channelId",
        foreignField: "_id",
        as: "channel",
        pipeline: [
          {
            $project: {
              _id: 1,
              channelName: 1,
            },
          },
        ],
      },
    },

    // Lookup tab details
    {
      $lookup: {
        from: "channeltabs",
        localField: "tabId",
        foreignField: "_id",
        as: "tab",
        pipeline: [
          {
            $project: {
              _id: 1,
              tabName: 1,
            },
          },
        ],
      },
    },

    // Lookup all tasks for this project
    {
      $lookup: {
        from: "tasks",
        localField: "_id",
        foreignField: "projectId",
        as: "allTasks",
        pipeline: [
          {
            $match: {
              isActive: true, // Only active tasks
            },
          },
          // Lookup task assignees
          {
            $lookup: {
              from: "users",
              localField: "assignedTo",
              foreignField: "_id",
              as: "assignees",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    isDemo: 1,
                  },
                },
              ],
            },
          },
          // Lookup task creator
          {
            $lookup: {
              from: "users",
              localField: "createdBy",
              foreignField: "_id",
              as: "taskCreator",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                  },
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$taskCreator",
              preserveNullAndEmptyArrays: true,
            },
          },
          // Project task fields
          {
            $project: {
              _id: 1,
              title: 1,
              description: 1,
              status: 1,
              priority: 1,
              dueDate: 1,
              tags: 1,
              strokeColor: 1,
              type: 1,
              attachments: 1,
              customFields: 1,
              createdAt: 1,
              updatedAt: 1,
              assignees: 1,
              taskCreator: 1,
              // Add computed fields
              isOverdue: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ["$dueDate", null] },
                      { $lt: ["$dueDate", new Date()] },
                      { $ne: ["$status", "completed"] },
                    ],
                  },
                  then: true,
                  else: false,
                },
              },
              assigneeCount: { $size: "$assignees" },
            },
          },
          // Sort tasks by priority and due date
          {
            $sort: {
              priority: -1, // high, medium, low
              dueDate: 1, // earliest first
              createdAt: -1, // newest first if no due date
            },
          },
        ],
      },
    },

    // Group tasks by status and add context paths
    {
      $addFields: {
        todoTasks: {
          $map: {
            input: {
              $filter: {
                input: "$allTasks",
                cond: { $eq: ["$$this.status", "todo"] },
              },
            },
            as: "task",
            in: {
              $mergeObjects: [
                "$$task",
                {
                  contextPath: {
                    $concat: [
                      {
                        $ifNull: [
                          { $arrayElemAt: ["$company.name", 0] },
                          "Unknown Company",
                        ],
                      },
                      "/",
                      "$name",
                      "/",
                      "$$task.title",
                    ],
                  },
                },
              ],
            },
          },
        },
        inProgressTasks: {
          $map: {
            input: {
              $filter: {
                input: "$allTasks",
                cond: { $eq: ["$$this.status", "in_progress"] },
              },
            },
            as: "task",
            in: {
              $mergeObjects: [
                "$$task",
                {
                  contextPath: {
                    $concat: [
                      {
                        $ifNull: [
                          { $arrayElemAt: ["$company.name", 0] },
                          "Unknown Company",
                        ],
                      },
                      "/",
                      "$name",
                      "/",
                      "$$task.title",
                    ],
                  },
                },
              ],
            },
          },
        },
        completedTasks: {
          $map: {
            input: {
              $filter: {
                input: "$allTasks",
                cond: { $eq: ["$$this.status", "completed"] },
              },
            },
            as: "task",
            in: {
              $mergeObjects: [
                "$$task",
                {
                  contextPath: {
                    $concat: [
                      {
                        $ifNull: [
                          { $arrayElemAt: ["$company.name", 0] },
                          "Unknown Company",
                        ],
                      },
                      "/",
                      "$name",
                      "/",
                      "$$task.title",
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },

    // Calculate project statistics
    {
      $addFields: {
        taskStats: {
          total: { $size: "$allTasks" },
          todo: { $size: "$todoTasks" },
          inProgress: { $size: "$inProgressTasks" },
          completed: { $size: "$completedTasks" },
          overdue: {
            $size: {
              $filter: {
                input: "$allTasks",
                cond: {
                  $and: [
                    { $ne: ["$$this.dueDate", null] },
                    { $lt: ["$$this.dueDate", new Date()] },
                    { $ne: ["$$this.status", "completed"] },
                  ],
                },
              },
            },
          },
        },
        progress: {
          $cond: {
            if: { $eq: [{ $size: "$allTasks" }, 0] },
            then: 0,
            else: {
              $multiply: [
                {
                  $divide: [
                    { $size: "$completedTasks" },
                    { $size: "$allTasks" },
                  ],
                },
                100,
              ],
            },
          },
        },
      },
    },

    // Unwind arrays to get single objects
    {
      $unwind: {
        path: "$creator",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$company",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$channel",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$tab",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Final project structure
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        status: 1,
        startDate: 1,
        endDate: 1,
        priority: 1,
        color: 1,
        createdAt: 1,
        updatedAt: 1,
        creator: 1,
        channel: 1,
        tab: 1,
        todoTasks: 1,
        inProgressTasks: 1,
        completedTasks: 1,
        taskStats: 1,
        progress: {
          $round: ["$progress", 1], // Round to 1 decimal place
        },
        // Context path for projects: company/project
        contextPath: {
          $concat: [
            { $ifNull: ["$company.name", "Unknown Company"] },
            "/",
            "$name",
          ],
        },
        // Project status indicators
        isOverdue: {
          $cond: {
            if: {
              $and: [
                { $ne: ["$endDate", null] },
                { $lt: ["$endDate", new Date()] },
                { $ne: ["$status", "completed"] },
              ],
            },
            then: true,
            else: false,
          },
        },
        daysUntilDue: {
          $cond: {
            if: { $ne: ["$endDate", null] },
            then: {
              $ceil: {
                $divide: [
                  { $subtract: ["$endDate", new Date()] },
                  1000 * 60 * 60 * 24, // Convert milliseconds to days
                ],
              },
            },
            else: null,
          },
        },
      },
    },

    // Sort projects by priority and due date
    {
      $sort: {
        priority: -1, // high, medium, low
        endDate: 1, // earliest first
        createdAt: -1, // newest first if no due date
      },
    },
  ];
};
