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
        return generateResponse(
          null,
          "Company not found with this join token",
          res,
          STATUS_CODES.NOT_FOUND
        );
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
        return generateResponse(
          null,
          "Company not found with this ID",
          res,
          STATUS_CODES.NOT_FOUND
        );
      }
      return generateResponse(
        company,
        "Company found",
        res,
        STATUS_CODES.SUCCESS
      );
    }

    return generateResponse(
      null,
      "Company not found",
      res,
      STATUS_CODES.NOT_FOUND
    );
  } catch (err) {
    return next(err);
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
      return generateResponse(
        null,
        "Company not found",
        res,
        STATUS_CODES.NOT_FOUND
      );
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
    return next(err);
  }
};
