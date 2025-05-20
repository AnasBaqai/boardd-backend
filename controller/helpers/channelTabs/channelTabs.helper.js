const { DEFAULT_TABS } = require("../../../utils/constants");

exports.createDefaultTabs = (channelId, userId, companyId) => {
  return [
    {
      channelId: channelId,
      tabName: DEFAULT_TABS.CLIENT_MANAGEMENT,
      isDefault: true,
      members: [userId],
      createdBy: userId,
      companyId: companyId,
      isPrivate: true,
    },
    {
      channelId: channelId,
      tabName: DEFAULT_TABS.TASK_MANAGEMENT,
      isDefault: true,
      members: [userId],
      createdBy: userId,
      companyId: companyId,
      isPrivate: false,
    },
    {
      channelId: channelId,
      tabName: DEFAULT_TABS.WORK_IN_PROGRESS,
      isDefault: true,
      members: [userId],
      createdBy: userId,
      companyId: companyId,
      isPrivate: false,
    },
    {
      channelId: channelId,
      tabName: DEFAULT_TABS.FORM_BUILDER,
      isDefault: true,
      members: [userId],
      createdBy: userId,
      companyId: companyId,
      isPrivate: false,
    },
  ];
};
