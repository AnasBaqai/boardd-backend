const { Types } = require("mongoose");

exports.getTaskByIdQuery = (taskId, userId = null) => {
  return [
    {
      // Match the specific task
      $match: {
        _id: Types.ObjectId.isValid(taskId) ? new Types.ObjectId(taskId) : null,
      },
    },
    // Lookup project details
    {
      $lookup: {
        from: "projects",
        localField: "projectId",
        foreignField: "_id",
        as: "project",
      },
    },
    {
      $unwind: {
        path: "$project",
        preserveNullAndEmptyArrays: true,
      },
    },
    // Lookup tab details
    {
      $lookup: {
        from: "channeltabs",
        localField: "project.tabId",
        foreignField: "_id",
        as: "tab",
      },
    },
    {
      $unwind: {
        path: "$tab",
        preserveNullAndEmptyArrays: true,
      },
    },
    // Lookup channel details
    {
      $lookup: {
        from: "channels",
        localField: "tab.channelId",
        foreignField: "_id",
        as: "channel",
      },
    },
    {
      $unwind: {
        path: "$channel",
        preserveNullAndEmptyArrays: true,
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
    // Lookup current user details (for role info)
    ...(userId
      ? [
          {
            $lookup: {
              from: "users",
              pipeline: [
                { $match: { _id: new Types.ObjectId(userId) } },
                { $project: { _id: 1, name: 1, email: 1, role: 1 } },
              ],
              as: "currentUser",
            },
          },
        ]
      : []),
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
              actionType: 1,
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
    // Add permission calculation and context
    {
      $addFields: {
        permissions: {
          $cond: {
            if: { $eq: [userId, null] }, // No user provided (guest access)
            then: {
              canView: true,
              canEdit: false,
              canComment: false,
              accessLevel: "guest",
            },
            else: {
              $let: {
                vars: {
                  userObjectId: { $toObjectId: userId },
                  isChannelMember: {
                    $in: [{ $toObjectId: userId }, "$channel.members"],
                  },
                  isTabMember: {
                    $in: [{ $toObjectId: userId }, "$tab.members"],
                  },
                  isAssigned: {
                    $in: [{ $toObjectId: userId }, "$assignedTo"],
                  },
                  isCreator: {
                    $eq: [{ $toObjectId: userId }, "$createdBy"],
                  },
                },
                in: {
                  canView: true,
                  canEdit: {
                    $or: [
                      "$$isChannelMember",
                      "$$isTabMember",
                      "$$isAssigned",
                      "$$isCreator",
                    ],
                  },
                  canComment: {
                    $or: ["$$isChannelMember", "$$isTabMember", "$$isAssigned"],
                  },
                  accessLevel: {
                    $switch: {
                      branches: [
                        { case: "$$isCreator", then: "owner" },
                        { case: "$$isAssigned", then: "assignee" },
                        { case: "$$isTabMember", then: "member" },
                        { case: "$$isChannelMember", then: "viewer" },
                      ],
                      default: "guest",
                    },
                  },
                },
              },
            },
          },
        },
        context: {
          channelId: "$channel._id",
          channelName: "$channel.channelName",
          tabId: "$tab._id",
          tabName: "$tab.tabName",
          projectId: "$project._id",
          projectName: "$project.name",
          contextPath: {
            $concat: [
              "$channel.channelName",
              " / ",
              "$tab.tabName",
              " / ",
              "$project.name",
            ],
          },
        },
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
        // Current user info (for role badges)
        currentUser: {
          $cond: {
            if: { $eq: [{ $size: { $ifNull: ["$currentUser", []] } }, 0] },
            then: null,
            else: { $first: "$currentUser" },
          },
        },
        // Include subtasks array as is (already processed in lookup)
        subtasks: 1,
        // Include activities array (already processed in lookup)
        activities: 1,
        // Permission and context information
        permissions: 1,
        context: 1,
      },
    },
  ];
};
