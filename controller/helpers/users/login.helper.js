const { generateResponse } = require("../../../utils");
const { STATUS_CODES } = require("../../../utils/constants");
const {
  createUser,
  generateToken,
  updateUser,
} = require("../../../models/userModel");
const { hashPassword, comparePassword } = require("./signup.helper");
const { findUser } = require("../../../models/userModel");
exports.handleInviteSignup = async (name, email, password, company, res) => {
  // Validate company domain
  if (company.domain !== email.split("@")[1]) {
    return generateResponse(
      null,
      "Invalid company domain",
      res,
      STATUS_CODES.BAD_REQUEST
    );
  }
  // check if user already exists
  const existingUser = await findUser({ email });
  if (existingUser) {
    return generateResponse(
      null,
      "User already exists",
      res,
      STATUS_CODES.BAD_REQUEST
    );
  }
  const hashedPassword = await hashPassword(password);
  let user = await createUser({
    name,
    email,
    password: hashedPassword,
    companyId: company._id,
  });

  // Generate and update refresh token
  const refreshToken = generateToken(user);
  user = await updateUser({ _id: user._id }, { refreshToken });

  return generateResponse(
    { user },
    "User signed up successfully",
    res,
    STATUS_CODES.SUCCESS
  );
};

exports.handleDomainSignup = async (name, email, password, company, res) => {
  if (!name) {
    return generateResponse(
      null,
      "Name is required for new user registration",
      res,
      STATUS_CODES.BAD_REQUEST
    );
  }

  const hashedPassword = await hashPassword(password);

  // Create inactive user with company association
  let user = await createUser({
    name,
    email,
    password: hashedPassword,
    companyId: company._id,
    isActive: false, // Set user as inactive by default
  });

  // Generate and update refresh token
  const refreshToken = generateToken(user);
  user = await updateUser({ _id: user._id }, { refreshToken });

  return generateResponse(
    { user },
    "User account created successfully. Waiting for admin approval.",
    res,
    STATUS_CODES.SUCCESS
  );
};

exports.handleRegularLogin = async (user, password, company, res) => {
  if (!user.isActive) {
    return generateResponse(
      null,
      "Account is inactive. Please wait for admin approval.",
      res,
      STATUS_CODES.UNAUTHORIZED
    );
  }

  if (!(await comparePassword(password, user.password))) {
    return generateResponse(
      null,
      "Invalid password",
      res,
      STATUS_CODES.UNAUTHORIZED
    );
  }

  // Generate and update refresh token
  const refreshToken = generateToken(user);
  const updatedUser = await updateUser({ _id: user._id }, { refreshToken });

  return generateResponse(
    { user: updatedUser, company },
    "User logged in successfully",
    res,
    STATUS_CODES.SUCCESS
  );
};
