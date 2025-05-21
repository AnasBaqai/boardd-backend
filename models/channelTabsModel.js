const { Schema, model, Types } = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const { getMongooseAggregatePaginatedData } = require("../utils");

const channelTabSchema = new Schema({
  channelId: { type: Types.ObjectId, ref: "Channel", required: true },
  tabName: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  tabDescription: { type: String },
  members: [{ type: Types.ObjectId, ref: "User", required: true }],
  createdBy: { type: Types.ObjectId, ref: "User", required: true },
  companyId: { type: Types.ObjectId, ref: "Company", required: true },
  isPrivate: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

channelTabSchema.plugin(mongoosePaginate);
channelTabSchema.plugin(aggregatePaginate);

const ChannelTab = model("ChannelTab", channelTabSchema);

//create A CHANNEL TAB
exports.createChannelTab = (channelTab) => ChannelTab.create(channelTab);

//get A CHANNEL TAB
exports.findChannelTab = (query) => ChannelTab.findOne(query);

//update A CHANNEL TAB
exports.updateChannelTab = (query, obj) =>
  ChannelTab.findOneAndUpdate(query, obj, { new: true });
