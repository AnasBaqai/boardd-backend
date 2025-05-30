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
      return generateResponse(
        null,
        "Admin already exists",
        res,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Check if company exists
    const domain = email.split("@")[1];
    const existingCompany = await findCompany({ domain });
    if (existingCompany) {
      return generateResponse(
        null,
        "Company already exists",
        res,
        STATUS_CODES.BAD_REQUEST
      );
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
    return next(error);
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
        return generateResponse(
          null,
          inviteSlot?.used
            ? "Invite slot already used"
            : "Invite slot not found",
          res,
          STATUS_CODES.NOT_FOUND
        );
      }

      const company = await findCompany({ _id: inviteSlot?.companyId });
      if (!company) {
        return generateResponse(
          null,
          "Company not found",
          res,
          STATUS_CODES.NOT_FOUND
        );
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
        return generateResponse(
          null,
          "Invalid join link",
          res,
          STATUS_CODES.NOT_FOUND
        );
      }

      // Check if user with this email already exists
      const existingUser = await findUser({ email });
      if (existingUser) {
        return generateResponse(
          null,
          "User with this email already exists",
          res,
          STATUS_CODES.CONFLICT
        );
      }

      // Find an available invite slot
      const availableSlot = await findAvailableInviteSlot({
        companyId: company._id,
      });
      if (!availableSlot) {
        return generateResponse(
          null,
          "No available seats for this company. Please contact the administrator.",
          res,
          STATUS_CODES.FORBIDDEN
        );
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
    return generateResponse(
      null,
      "Invalid email domain or user not found",
      res,
      STATUS_CODES.NOT_FOUND
    );
  } catch (error) {
    return next(error);
  }
};

// get users of particular company with matching name
exports.getUsersOfCompany = async (req, res, next) => {
  const { email, page, limit } = req.query;

  try {
    const userId = req.user.id;
    const user = await findUser({ _id: userId });
    const company = await findCompany({ _id: user.companyId });

    // Build query to get users of particular company with the matching name
    let queryArray = [];

    // Add company filter
    queryArray.push({ $match: { companyId: company._id } });

    // Add active users filter
    queryArray.push({ $match: { isActive: true } });

    // Exclude the current logged-in user from results
    queryArray.push({ $match: { _id: { $ne: user._id } } });

    // Only add email filter if email parameter is provided
    if (email && email.trim() !== "") {
      const searchTerm = email.trim();

      // Search for the term anywhere in email or name
      queryArray.push({
        $match: {
          $or: [
            { email: { $regex: searchTerm, $options: "i" } },
            { name: { $regex: searchTerm, $options: "i" } },
          ],
        },
      });

      // Add fields to calculate ranking score
      queryArray.push({
        $addFields: {
          emailStartsWithSearch: {
            $cond: {
              if: {
                $regexMatch: {
                  input: "$email",
                  regex: `^${searchTerm}`,
                  options: "i",
                },
              },
              then: 1,
              else: 0,
            },
          },
          nameStartsWithSearch: {
            $cond: {
              if: {
                $regexMatch: {
                  input: "$name",
                  regex: `^${searchTerm}`,
                  options: "i",
                },
              },
              then: 1,
              else: 0,
            },
          },
          sortScore: {
            $add: [
              {
                $cond: {
                  if: {
                    $regexMatch: {
                      input: "$email",
                      regex: `^${searchTerm}`,
                      options: "i",
                    },
                  },
                  then: 10, // High priority for email starting with search
                  else: 0,
                },
              },
              {
                $cond: {
                  if: {
                    $regexMatch: {
                      input: "$name",
                      regex: `^${searchTerm}`,
                      options: "i",
                    },
                  },
                  then: 8, // High priority for name starting with search
                  else: 0,
                },
              },
              {
                $cond: {
                  if: {
                    $regexMatch: {
                      input: "$email",
                      regex: searchTerm,
                      options: "i",
                    },
                  },
                  then: 2, // Lower priority for email containing search
                  else: 0,
                },
              },
              {
                $cond: {
                  if: {
                    $regexMatch: {
                      input: "$name",
                      regex: searchTerm,
                      options: "i",
                    },
                  },
                  then: 1, // Lower priority for name containing search
                  else: 0,
                },
              },
            ],
          },
        },
      });

      // Sort by score (descending) then by name (ascending)
      queryArray.push({
        $sort: {
          sortScore: -1,
          name: 1,
        },
      });

      // Remove the temporary fields before returning results
      queryArray.push({
        $project: {
          emailStartsWithSearch: 0,
          nameStartsWithSearch: 0,
          sortScore: 0,
        },
      });

      console.log("Searching for emails/names containing:", searchTerm);
    } else {
      // If no search term, just sort by name
      queryArray.push({
        $sort: { name: 1 },
      });
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
    return next(error);
  }
};
