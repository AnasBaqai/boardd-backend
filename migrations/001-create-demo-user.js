const mongoose = require("mongoose");
const { createUser, findUser, removeUser } = require("../models/userModel");
const { ROLES } = require("../utils/constants");

const migration = {
  name: "001-create-demo-user",
  version: "1.0.0",
  description: 'Create global demo user "Uncle" for onboarding purposes',

  // Migration UP - Create demo user
  up: async () => {
    console.log("🚀 Running migration: Create demo user...");

    // Check if demo user already exists
    const existingDemoUser = await findUser({ isDemo: true });
    if (existingDemoUser) {
      console.log("✅ Demo user already exists, skipping creation");
      return { success: true, message: "Demo user already exists" };
    }

    // Create demo user with fixed ID
    const demoUser = await createUser({
      _id: new mongoose.Types.ObjectId("000000000000000000000001"),
      name: "Uncle",
      email: "uncle@boardd.demo",
      password: "demo-password-not-used",
      isDemo: true,
      companyId: null, // Appears in all companies
      isActive: true,
      role: ROLES.DEMO_USER,
    });

    console.log('✅ Demo user "Uncle" created successfully!');
    console.log(`📧 Email: ${demoUser.email}`);
    console.log("🏢 Available in: All companies");

    return {
      success: true,
      message: "Demo user created successfully",
      data: { userId: demoUser._id, email: demoUser.email },
    };
  },

  // Migration DOWN - Remove demo user (for rollback)
  down: async () => {
    console.log("⬇️ Rolling back migration: Remove demo user...");

    const demoUser = await findUser({ isDemo: true });
    if (!demoUser) {
      console.log("ℹ️ Demo user not found, nothing to rollback");
      return { success: true, message: "Demo user not found" };
    }

    await removeUser(demoUser._id);
    console.log("✅ Demo user removed successfully");

    return {
      success: true,
      message: "Demo user removed successfully",
      data: { removedUserId: demoUser._id },
    };
  },
};

module.exports = migration;
