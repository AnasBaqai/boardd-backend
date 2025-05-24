const { Types } = require("mongoose");

exports.getTaskByIdQuery = (taskId) => {
  return [
    {
      // Match the specific task
      $match: {
        _id: Types.ObjectId.isValid(taskId) ? new Types.ObjectId(taskId) : null,
      },
    },
    // Lookup creator details
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "creator",
      },
    },
    // Lookup assigned users details
    {
      $lookup: {
        from: "users",
        localField: "assignedTo",
        foreignField: "_id",
        as: "assignees",
      },
    },
    // Lookup subtasks
    {
      $lookup: {
        from: "subtasks",
        let: { taskId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$taskId", "$$taskId"] },
            },
          },
          // Lookup subtask assignee details
          {
            $lookup: {
              from: "users",
              localField: "assignedTo",
              foreignField: "_id",
              as: "assignee",
            },
          },
          {
            $unwind: {
              path: "$assignee",
              preserveNullAndEmptyArrays: true,
            },
          },
          // Project only needed subtask fields
          {
            $project: {
              _id: 1,
              title: 1,
              assignee: {
                _id: "$assignee._id",
                name: "$assignee.name",
                email: "$assignee.email",
              },
            },
          },
        ],
        as: "subtasks",
      },
    },
    // Lookup activities
    {
      $lookup: {
        from: "activities",
        let: { taskId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$taskId", "$$taskId"] },
            },
          },
          // Project only needed activity fields
          {
            $project: {
              _id: 1,
              message: 1,
              timestamp: 1,
            },
          },
          { $sort: { timestamp: -1 } },
        ],
        as: "activities",
      },
    },
    // Unwind creator array (will always be single item)
    {
      $unwind: {
        path: "$creator",
        preserveNullAndEmptyArrays: true,
      },
    },
    // Final projection
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
        customFields: 1,
        createdAt: 1,
        updatedAt: 1,
        projectId: 1,
        // Creator details
        createdBy: {
          _id: "$creator._id",
          name: "$creator.name",
          email: "$creator.email",
        },
        // Assigned users details
        assignedTo: {
          $map: {
            input: "$assignees",
            as: "assignee",
            in: {
              _id: "$$assignee._id",
              name: "$$assignee.name",
              email: "$$assignee.email",
            },
          },
        },
        // Include subtasks array as is (already processed in lookup)
        subtasks: 1,
        // Include activities array (already processed in lookup)
        activities: 1,
      },
    },
  ];
};
