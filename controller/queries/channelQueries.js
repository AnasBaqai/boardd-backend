// write a query to get all members populated with their name email and id of that channel
const { Types } = require("mongoose");

exports.getAllMembersInChannelQuery = (channelId) => {
  return [
    {
      $match: {
        _id: { $eq: Types.ObjectId.createFromHexString(channelId) },
      },
    },
    {
      // Lookup users collection to get member details
      $lookup: {
        from: "users",
        localField: "members",
        foreignField: "_id",
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
