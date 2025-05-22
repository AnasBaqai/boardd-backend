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
