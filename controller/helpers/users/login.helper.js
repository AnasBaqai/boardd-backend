const { generateResponse } = require("../../../utils");
const { STATUS_CODES, ROLES } = require("../../../utils/constants");
const {
  createUser,
  generateToken,
  updateUser,
  findUser,
} = require("../../../models/userModel");
const { hashPassword, comparePassword } = require("./signup.helper");

exports.handleInviteSignup = async (
  name,
  email,
  password,
  company,
  inviteSlot,
  res
) => {
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

  // Validate company domain
  if (company.domain !== email.split("@")[1]) {
    return generateResponse(
      null,
      "Invalid company domain",
      res,
      STATUS_CODES.BAD_REQUEST
    );
  }

  // Check if the slot is reserved for a specific email
  if (
    inviteSlot.reserved &&
    inviteSlot.reservedFor &&
    inviteSlot.reservedFor !== email
  ) {
    return generateResponse(
      null,
      "This invite link is reserved for a different email address",
      res,
      STATUS_CODES.FORBIDDEN
    );
  }

  // Determine role based on reservation or default to USER
  const role = inviteSlot.reservedRole || ROLES.USER;

  // Create new user with active status
  const hashedPassword = await hashPassword(password);
  let user = await createUser({
    name,
    email,
    password: hashedPassword,
    companyId: company._id,
    isActive: true, // Users from invite are active by default
    role: role,
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

exports.handlePublicSignup = async (name, email, password, company, res) => {
  // Create new user with active status (since it's a public link)
  const hashedPassword = await hashPassword(password);
  let user = await createUser({
    name,
    email,
    password: hashedPassword,
    companyId: company._id,
    isActive: true, // Public link users are active by default
    role: ROLES.USER, // Default role for public signups
  });

  // Generate and update refresh token
  const refreshToken = generateToken(user);
  user = await updateUser({ _id: user._id }, { refreshToken });

  return generateResponse(
    { user },
    "User signed up successfully via public link",
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
    role: ROLES.EMPLOYEE, // Default role for domain signups
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
    { user: updatedUser },
    "User logged in successfully",
    res,
    STATUS_CODES.SUCCESS
  );
};
