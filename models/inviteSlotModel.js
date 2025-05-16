const { Schema, model, Types } = require("mongoose");
const InviteSlotSchema = new Schema({
  companyId: { type: Types.ObjectId, ref: "Company", required: true },
  slot: { type: Number, required: true },
  token: { type: String, required: true, unique: true }, // secret per slot
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
InviteSlotSchema.index({ companyId: 1, slot: 1 }, { unique: true });

const InviteSlotModel = model("InviteSlot", InviteSlotSchema);

//create many invite slots
exports.createManyInviteSlots = (obj) => InviteSlotModel.insertMany(obj);

//find invite slot by query
exports.findInviteSlot = (query) => InviteSlotModel.findOne(query);

//update invite slot by query
exports.updateInviteSlot = (query, obj) =>
  InviteSlotModel.findOneAndUpdate(query, obj, { new: true });

//delete invite slot by query
exports.deleteInviteSlot = (query) => InviteSlotModel.findOneAndDelete(query);
