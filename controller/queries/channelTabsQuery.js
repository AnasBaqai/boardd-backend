// write a query to get all tabs of a channel in which the user is a member
const { Types } = require("mongoose");

exports.getAllTabsOfMemberInChannelQuery = (channelId, userId) => {
  return [
    {
      $match: {
        channelId: {
          $eq: Types.ObjectId.isValid(channelId)
            ? Types.ObjectId.createFromHexString(channelId)
            : null,
        },
        members: {
          $in: [
            Types.ObjectId.isValid(userId)
              ? Types.ObjectId.createFromHexString(userId)
              : null,
          ],
        },
      },
    },
    {
      $lookup: {
        from: "channels",
        localField: "channelId",
        foreignField: "_id",
        as: "channelInfo",
      },
    },
    {
      $unwind: {
        path: "$channelInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        tabName: 1,
        tabDescription: 1,
        channelId: 1,
        // members: 1,
        createdAt: 1,
        updatedAt: 1,
        channelName: "$channelInfo.channelName",
        channelDescription: "$channelInfo.channelDescription",
      },
    },
  ];
};

// get all members of a tab with their details
exports.getAllTabMembersQuery = (tabId) => {
  return [
    {
      $match: {
        _id: Types.ObjectId.isValid(tabId)
          ? Types.ObjectId.createFromHexString(tabId)
          : null,
      },
    },
    {
      // Lookup users collection to get member details
      $lookup: {
        from: "users",
        let: { memberIds: "$members" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ["$_id", "$$memberIds"] },
                  { $eq: ["$isActive", true] },
                ],
              },
            },
          },
        ],
        as: "memberDetails",
      },
    },
    {
      // Project only the required fields
      $project: {
        _id: 1,
        tabName: 1,
        tabDescription: 1,
        isPrivate: 1,
        isDefault: 1,
        channelId: 1,
        companyId: 1,
        createdAt: 1,
        updatedAt: 1,
        members: {
          $map: {
            input: "$memberDetails",
            as: "member",
            in: {
              _id: "$$member._id",
              name: "$$member.name",
              email: "$$member.email",
              role: "$$member.role",
              isActive: "$$member.isActive",
            },
          },
        },
        totalMembers: { $size: "$memberDetails" },
      },
    },
  ];
};
