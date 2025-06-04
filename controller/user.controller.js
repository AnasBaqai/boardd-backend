"use strict";

const { STATUS_CODES } = require("../utils/constants");
const { generateResponse, parseBody } = require("../utils");
const {
  findUser,
  createUser,
  generateToken,
  updateUser,
  getAllUsers,
} = require("../models/userModel");
const { createCompany, findCompany } = require("../models/companyModel");
const {
  createManyInviteSlots,
  findInviteSlot,
  updateInviteSlot,
  findAvailableInviteSlot,
} = require("../models/inviteSlotModel");
const {
  hashPassword,
  generateJoinToken,
  createInviteSlots,
} = require("./helpers/users/signup.helper");
const {
  handleInviteSignup,
  handleDomainSignup,
  handleRegularLogin,
  handlePublicSignup,
} = require("./helpers/users/login.helper");
const { getCompanyUsersQuery } = require("./queries/userQueries");

exports.signup = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      accountName,
      role,
      generalQuestions,
      channelPreference,
    } = parseBody(req.body);

    // Check if user exists
    const existingUser = await findUser({ email });
    if (existingUser) {
      return next({
        statusCode: STATUS_CODES.CONFLICT,
        message: "User already exists",
      });
    }

    // Check if company exists
    const domain = email.split("@")[1];
    const existingCompany = await findCompany({ domain });
    if (existingCompany) {
      return next({
        statusCode: STATUS_CODES.CONFLICT,
        message: "Company already exists",
      });
    }

    // Create user with hashed password
    const hashedPassword = await hashPassword(password);
    let user = await createUser({
      name,
      email,
      password: hashedPassword,
      role,
    });

    // Create company
    const company = await createCompany({
      name: accountName,
      domain,
      joinToken: generateJoinToken(),
      generalQuestions,
      channelPreference,
      adminUser: user._id,
    });

    // Create invite slots
    await createInviteSlots(company._id, createManyInviteSlots);

    // Update user with company and refresh token
    const refreshToken = generateToken(user);
    user = await updateUser(
      { _id: user._id },
      { companyId: company._id, refreshToken }
    );

    return generateResponse(
      { user, company },
      "Admin and company created successfully",
      res,
      STATUS_CODES.CREATED
    );
  } catch (error) {
    console.log(error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message,
    });
  }
};

exports.login = async (req, res, next) => {
  try {
    const { name, email, password } = parseBody(req.body);
    const { token, joinToken } = req?.query;

    // Handle invite-based signup (private invite)
    if (token) {
      // Validate invite token and get company
      const inviteSlot = await findInviteSlot({ token });
      if (!inviteSlot || inviteSlot?.used) {
        return next({
          statusCode: STATUS_CODES.NOT_FOUND,
          message: inviteSlot?.used
            ? "Invite slot already used"
            : "Invite slot not found",
        });
      }

      const company = await findCompany({ _id: inviteSlot?.companyId });
      if (!company) {
        return next({
          statusCode: STATUS_CODES.NOT_FOUND,
          message: "Company not found",
        });
      }

      // Handle invite signup and mark slot as used
      const result = await handleInviteSignup(
        name,
        email,
        password,
        company,
        inviteSlot,
        res
      );
      if (result.statusCode === STATUS_CODES.SUCCESS) {
        await updateInviteSlot({ _id: inviteSlot._id }, { used: true });
      }
      return result;
    }

    // Handle public link signup (joinToken)
    if (joinToken) {
      // Find company by joinToken
      const company = await findCompany({ joinToken });
      if (!company) {
        return next({
          statusCode: STATUS_CODES.NOT_FOUND,
          message: "Company not found",
        });
      }

      // Check if user with this email already exists
      const existingUser = await findUser({ email });
      if (existingUser) {
        return next({
          statusCode: STATUS_CODES.CONFLICT,
          message: "User already exists",
        });
      }

      // Find an available invite slot
      const availableSlot = await findAvailableInviteSlot({
        companyId: company._id,
      });
      if (!availableSlot) {
        return next({
          statusCode: STATUS_CODES.NOT_FOUND,
          message: "No available invite slot found",
        });
      }

      // Handle public signup and mark slot as used
      const result = await handlePublicSignup(
        name,
        email,
        password,
        company,
        res
      );
      if (result.statusCode === STATUS_CODES.SUCCESS) {
        await updateInviteSlot({ _id: availableSlot._id }, { used: true });
      }
      return result;
    }

    // Regular login or domain signup flow
    // Check if user exists
    const existingUser = await findUser({ email }).select("+password");
    if (existingUser) {
      const domain = email.split("@")[1];
      const company = await findCompany({ domain });
      return handleRegularLogin(existingUser, password, company, res);
    }

    // Handle domain-based signup
    const domain = email.split("@")[1];
    const company = await findCompany({ domain });
    if (company) {
      return handleDomainSignup(name, email, password, company, res);
    }

    // No matching company domain
    return next({
      statusCode: STATUS_CODES.NOT_FOUND,
      message: "No matching company domain",
    });
  } catch (error) {
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message,
    });
  }
};

// get users of particular company with matching name
exports.getUsersOfCompany = async (req, res, next) => {
  const { email, page, limit } = req.query;

  try {
    const userId = req.user.id;
    const user = await findUser({ _id: userId });
    if (!user) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "User not found",
      });
    }

    const company = await findCompany({ _id: user.companyId });
    if (!company) {
      return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Company not found",
      });
    }

    // Get the aggregation query from userQueries
    const queryArray = getCompanyUsersQuery(
      company._id.toString(),
      userId,
      email
    );

    if (email && email.trim() !== "") {
      console.log("Searching for emails containing:", email.trim());
    }

    const users = await getAllUsers({
      query: queryArray,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      responseKey: "users",
    });

    return generateResponse(
      users,
      "Users fetched successfully",
      res,
      STATUS_CODES.SUCCESS
    );
  } catch (error) {
    console.error("Error in getUsersOfCompany:", error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message,
    });
  }
};
