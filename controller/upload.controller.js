const { generateResponse } = require("../utils");
const { STATUS_CODES } = require("../utils/constants");
const fs = require("fs");
const path = require("path");

/**
 * Upload multiple files
 * @route POST /api/upload/multiple
 */
exports.uploadMultipleFiles = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next({
        statusCode: STATUS_CODES.BAD_REQUEST,
        message: "No file uploaded",
      });
    }

    // Get all file paths
    const filePaths = req.files.map((file) => {
      const isImage = file.mimetype.startsWith("image/");
      return `/uploadFiles/${isImage ? "images" : "documents"}/${
        file.filename
      }`;
    });

    // Return the file paths
    return generateResponse(
      { filePaths },
      "Files uploaded successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    // If there's an error, clean up any uploaded files
    if (req.files) {
      req.files.forEach((file) => {
        fs.unlinkSync(file.path);
      });
    }
    console.error("Error in uploadMultipleFiles:", error);
    next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message,
    });
  }
};

/**
 * Delete files (can handle both single file path or array of file paths)
 * @route DELETE /api/upload/files
 */
exports.deleteFiles = async (req, res, next) => {
  try {
    const { files } = req.body;

    // Validate files parameter
    if (!files) {
      return next({
        statusCode: STATUS_CODES.BAD_REQUEST,
        message: "No files specified for deletion",
      });
    }

    // Convert to array if single file path is provided
    const filePaths = Array.isArray(files) ? files : [files];

    // Track deletion results
    const results = {
      successful: [],
      failed: [],
    };

    // Process each file
    for (const filePath of filePaths) {
      try {
        // Remove the leading slash if present and construct absolute path
        const relativePath = filePath.startsWith("/")
          ? filePath.slice(1)
          : filePath;
        const absolutePath = path.join(process.cwd(), relativePath);

        // Verify the path is within uploadFiles directory for security
        const uploadFilesDir = path.join(process.cwd(), "uploadFiles");
        if (!absolutePath.startsWith(uploadFilesDir)) {
          results.failed.push({
            path: filePath,
            error: "Invalid file path - Security violation",
          });
          continue;
        }

        // Check if file exists
        if (!fs.existsSync(absolutePath)) {
          results.failed.push({
            path: filePath,
            error: "File not found",
          });
          continue;
        }

        // Delete the file
        fs.unlinkSync(absolutePath);
        results.successful.push(filePath);
      } catch (error) {
        results.failed.push({
          path: filePath,
          error: error.message,
        });
      }
    }

    // Generate appropriate response based on results
    if (results.failed.length === 0) {
      return generateResponse(
        results,
        "All files deleted successfully",
        res,
        STATUS_CODES.SUCCESS
      );
    } else if (results.successful.length === 0) {
      return generateResponse(
        results,
        "Failed to delete all files",
        res,
        STATUS_CODES.BAD_REQUEST
      );
    } else {
      return generateResponse(
        results,
        "Some files were deleted successfully",
        res,
        STATUS_CODES.SUCCESS
      );
    }
  } catch (error) {
    console.error("Error in deleteFiles:", error);
    next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message,
    });
  }
};
