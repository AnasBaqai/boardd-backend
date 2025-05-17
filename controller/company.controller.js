const { generateResponse } = require("../utils");
const { findCompany, updateCompany } = require("../models/companyModel");
const { STATUS_CODES } = require("../utils/constants");
// get company by joinToken or id
exports.getCompany = async (req, res, next) => {
  const { joinToken, companyId } = req?.query;
  try {
    if (joinToken) {
      const company = await findCompany({ joinToken });
      return generateResponse(
        company,
        "Company found",
        res,
        STATUS_CODES.SUCCESS
      );
    }
    if (companyId) {
      const company = await findCompany({ _id: companyId });
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
  const { companyId } = req?.query;
  // get complete body
  const body = req?.body;
  try {
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
    const updatedCompany = await updateCompany({ _id: companyId }, body);
    return generateResponse(
      updatedCompany,
      "Company updated",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (err) {
    return next(err);
  }
};
