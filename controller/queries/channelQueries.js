// write a query to get all members populated with their name email and id of that channel
const { Types } = require("mongoose");

// get all channels of a user
exports.getAllChannelsOfUserQuery = (userId) => {
  return [
    {
      $match: {
        members: { $in: [Types.ObjectId.createFromHexString(userId)] },
      },
    },
    {
      $lookup: {
        from: "users",
        let: { channelMembers: "$members" },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $in: ["$_id", "$$channelMembers"] }, // Regular channel members
                  { $eq: ["$isDemo", true] }, // Always include demo users
                ],
              },
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              isDemo: 1,
            },
          },
          {
            $sort: {
              isDemo: 1, // Demo users last
              name: 1, // Then by name
            },
          },
        ],
        as: "memberDetails",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "creatorDetails",
      },
    },
    {
      $unwind: {
        path: "$creatorDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        channelName: 1,
        channelDescription: 1,
        isPrivate: 1,
        channelToken: 1,
        createdAt: 1,
        updatedAt: 1,
        totalMembers: { $size: "$memberDetails" }, // Updated to count all members including demo
        members: {
          $map: {
            input: "$memberDetails",
            as: "member",
            in: {
              _id: "$$member._id",
              name: "$$member.name",
              email: "$$member.email",
              isDemo: "$$member.isDemo",
            },
          },
        },
        creator: {
          _id: "$creatorDetails._id",
          name: "$creatorDetails.name",
          email: "$creatorDetails.email",
        },
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ];
};

// get all members in a channel
exports.getAllMembersInChannelQuery = (channelId) => {
  return [
    {
      $match: {
        _id: { $eq: Types.ObjectId.createFromHexString(channelId) },
      },
    },
    {
      // Lookup users collection to get member details + demo users
      $lookup: {
        from: "users",
        let: { channelMembers: "$members" },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $in: ["$_id", "$$channelMembers"] }, // Regular channel members
                  { $eq: ["$isDemo", true] }, // Always include demo users
                ],
              },
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              role: 1,
              isActive: 1,
              isDemo: 1,
            },
          },
        ],
        as: "memberDetails",
      },
    },
    {
      // Unwind the memberDetails array
      $unwind: {
        path: "$memberDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      // Project only the required fields
      $project: {
        _id: 1,
        channelName: 1,
        channelDescription: 1,
        isPrivate: 1,
        member: {
          _id: "$memberDetails._id",
          name: "$memberDetails.name",
          email: "$memberDetails.email",
          role: "$memberDetails.role",
          isActive: "$memberDetails.isActive",
          isDemo: "$memberDetails.isDemo",
        },
      },
    },
    {
      // Group back to get array of members
      $group: {
        _id: {
          channelId: "$_id",
          channelName: "$channelName",
          channelDescription: "$channelDescription",
          isPrivate: "$isPrivate",
        },
        members: {
          $push: "$member",
        },
      },
    },
    {
      // Sort members: demo users last, then by name
      $addFields: {
        members: {
          $sortArray: {
            input: "$members",
            sortBy: {
              isDemo: 1, // Demo users appear last
              name: 1, // Then sort by name
            },
          },
        },
      },
    },
    {
      // Final projection to clean up the output
      $project: {
        _id: 0,
        channelId: "$_id.channelId",
        channelName: "$_id.channelName",
        channelDescription: "$_id.channelDescription",
        isPrivate: "$_id.isPrivate",
        members: 1,
        totalMembers: { $size: "$members" },
      },
    },
  ];
};
