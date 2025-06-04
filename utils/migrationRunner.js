const fs = require("fs");
const path = require("path");
const {
  isMigrationExecuted,
  recordMigration,
  recordFailedMigration,
} = require("../models/migrationModel");

class MigrationRunner {
  constructor() {
    this.migrationsDir = path.join(__dirname, "../migrations");
  }

  // Get all migration files sorted by name
  async getAllMigrations() {
    try {
      const files = fs
        .readdirSync(this.migrationsDir)
        .filter((file) => file.endsWith(".js"))
        .sort(); // Alphabetical order ensures proper execution order

      return files.map((file) => ({
        filename: file,
        path: path.join(this.migrationsDir, file),
      }));
    } catch (error) {
      console.error("❌ Error reading migrations directory:", error);
      return [];
    }
  }

  // Run all pending migrations
  async runPendingMigrations() {
    console.log("🔍 Checking for pending migrations...");

    const migrations = await this.getAllMigrations();
    if (migrations.length === 0) {
      console.log("ℹ️ No migration files found");
      return { success: true, executed: 0 };
    }

    let executedCount = 0;
    const results = [];

    for (const { filename, path: migrationPath } of migrations) {
      try {
        // Load migration module
        const migration = require(migrationPath);

        // Check if already executed
        const alreadyExecuted = await isMigrationExecuted(migration.name);
        if (alreadyExecuted) {
          console.log(`⏭️ Skipping ${migration.name} (already executed)`);
          continue;
        }

        console.log(`🚀 Executing migration: ${migration.name}`);
        console.log(`📝 Description: ${migration.description}`);

        // Execute migration
        const result = await migration.up();

        if (result.success) {
          // Record successful migration
          await recordMigration(
            migration.name,
            migration.version,
            migration.description
          );

          console.log(`✅ Migration ${migration.name} completed successfully`);
          executedCount++;

          results.push({
            name: migration.name,
            success: true,
            message: result.message,
          });
        } else {
          throw new Error(result.message || "Migration failed");
        }
      } catch (error) {
        console.error(`❌ Migration ${filename} failed:`, error.message);

        // Record failed migration
        try {
          const migration = require(migrationPath);
          await recordFailedMigration(
            migration.name,
            migration.version,
            migration.description,
            error
          );
        } catch (recordError) {
          console.error("❌ Failed to record migration failure:", recordError);
        }

        results.push({
          name: filename,
          success: false,
          error: error.message,
        });

        // Stop on first failure
        break;
      }
    }

    console.log(`🎉 Migrations completed! Executed: ${executedCount}`);
    return {
      success: true,
      executed: executedCount,
      results,
    };
  }

  // Rollback last migration (utility function)
  async rollbackLastMigration() {
    console.log("⬇️ Rolling back last migration...");

    const migrations = await this.getAllMigrations();

    // Find the last executed migration
    for (let i = migrations.length - 1; i >= 0; i--) {
      const { path: migrationPath } = migrations[i];
      const migration = require(migrationPath);

      const wasExecuted = await isMigrationExecuted(migration.name);
      if (wasExecuted && migration.down) {
        console.log(`⬇️ Rolling back: ${migration.name}`);

        try {
          const result = await migration.down();
          if (result.success) {
            // Remove from executed migrations
            // (In production, you might want to mark as rolled back instead of deleting)
            console.log(`✅ Rollback of ${migration.name} completed`);
            return { success: true, rolledBack: migration.name };
          }
        } catch (error) {
          console.error(`❌ Rollback failed for ${migration.name}:`, error);
          return { success: false, error: error.message };
        }
      }
    }

    console.log("ℹ️ No migrations to rollback");
    return { success: true, rolledBack: null };
  }
}

module.exports = new MigrationRunner();
