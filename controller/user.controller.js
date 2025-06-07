"use strict";

const { STATUS_CODES } = require("../utils/constants");
const {
  generateResponse,
  parseBody,
  setRefreshTokenCookie,
  extractDomainFromEmail,
} = require("../utils");
const { calculateRefreshTokenExpiry } = require("../utils/tokenConstants");
const {
  findUser,
  createUser,
  generateToken,
  generateRefreshToken,
  updateUser,
  getAllUsers,
  addRefreshToken,
} = require("../models/userModel");
const { createCompany, findCompany } = require("../models/companyModel");
const { createManyInviteSlots } = require("../models/inviteSlotModel");
const {
  hashPassword,
  generateJoinToken,
  createInviteSlots,
} = require("./helpers/users/signup.helper");
const { getCompanyUsersQuery } = require("./queries/userQueries");
const { extractDeviceInfo } = require("../utils/deviceDetection");
const {
  determineLoginStrategy,
  handleDomainFlow,
  handleRegularFlow,
  handlePublicFlow,
  handleInviteFlow,
} = require("./helpers/users/login.flow");

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
    const domain = extractDomainFromEmail(email);
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

    // Update user with company
    user = await updateUser({ _id: user._id }, { companyId: company._id });

    // Fetch clean user object without password for response
    const cleanUser = await findUser({ _id: user._id });

    // Generate both tokens
    const accessToken = generateToken(cleanUser);
    const refreshToken = generateRefreshToken(cleanUser);

    // Get device info
    const deviceInfo = extractDeviceInfo(req);

    // Calculate expiration date (30 days from now)
    const expiresAt = calculateRefreshTokenExpiry();

    // Create refresh token data
    const refreshTokenData = {
      token: refreshToken,
      deviceInfo,
      expiresAt,
    };

    // Add refresh token to user's array
    await addRefreshToken(user._id, refreshTokenData);

    // Set refresh token as httpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    return generateResponse(
      {
        user: cleanUser,
        company,
        accessToken,
      },
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
    const { token, joinToken } = req?.query ?? {};

    // Strategy pattern for different login flows
    const loginStrategy = await determineLoginStrategy(token, joinToken, email);

    // Execute the appropriate strategy
    switch (loginStrategy.type) {
      case "INVITE_SIGNUP":
        return await handleInviteFlow(
          loginStrategy.data,
          { name, email, password },
          req,
          res,
          next
        );

      case "PUBLIC_SIGNUP":
        return await handlePublicFlow(
          loginStrategy.data,
          { name, email, password },
          req,
          res,
          next
        );

      case "REGULAR_LOGIN":
        return await handleRegularFlow(
          loginStrategy.data,
          { email, password },
          req,
          res,
          next
        );

      case "DOMAIN_SIGNUP":
        return await handleDomainFlow(
          loginStrategy.data,
          { name, email, password },
          req,
          res,
          next
        );

      default:
        return next({
          statusCode: STATUS_CODES.BAD_REQUEST,
          message:
            "Invalid login request. No matching authentication method found.",
        });
    }
  } catch (error) {
    console.error("Login error:", error);
    return next({
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error?.message ?? "An unexpected error occurred during login",
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
