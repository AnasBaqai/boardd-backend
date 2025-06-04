const { generateResponse, parseBody } = require("../utils");
const { findCompany, updateCompany } = require("../models/companyModel");
const { STATUS_CODES } = require("../utils/constants");
// get company by joinToken or id
exports.getCompany = async (req, res, next) => {
  try {
    const { joinToken, companyId } = req.query;

    if (joinToken) {
      const company = await findCompany({ joinToken });
      if (!company) {
        return next({
          statusCode: STATUS_CODES.NOT_FOUND,
          message: "Company not found with this join token",
        });
      }
      return generateResponse(
        company,
        "Company found",
        res,
        STATUS_CODES.SUCCESS
      );
    }

    if (companyId) {
      const company = await findCompany({ _id: companyId });
      if (!company) {
        return next({
          statusCode: STATUS_CODES.NOT_FOUND,
          message: "Company not found",
        });
      }
      return generateResponse(
        company,
        "Company found",
        res,
        STATUS_CODES.SUCCESS
      );
    }

    return next({
      statusCode: STATUS_CODES.NOT_FOUND,
      message: "Company not found",
    });
  } catch (error) {
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message,
    });
  }
};

// update company
exports.updateCompany = async (req, res, next) => {
  try {
    const { companyId } = req.query;
    const updates = parseBody(req.body);

    // find company
    const company = await findCompany({ _id: companyId });
    if (!company) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Company not found",
      });
    }

    // update company
    const updatedCompany = await updateCompany({ _id: companyId }, updates);
    return generateResponse(
      updatedCompany,
      "Company updated successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (err) {
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: err?.message,
    });
  }
};
