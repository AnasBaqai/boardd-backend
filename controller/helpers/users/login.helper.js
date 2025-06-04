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
  res,
  next
) => {
  // Check if user with this email already exists
  const existingUser = await findUser({ email });
  if (existingUser) {
    return next({
      statusCode: STATUS_CODES.BAD_REQUEST,
      message: "User already exists",
    });
  }

  // Validate company domain
  if (company.domain !== email.split("@")[1]) {
    return next({
      statusCode: STATUS_CODES.BAD_REQUEST,
      message: "Invalid company domain",
    });
  }

  // Check if the slot is reserved for a specific email
  if (
    inviteSlot.reserved &&
    inviteSlot.reservedFor &&
    inviteSlot.reservedFor !== email
  ) {
    return next({
      statusCode: STATUS_CODES.BAD_REQUEST,
      message: "This invite link is reserved for a different email address",
    });
  }

  // Determine role based on reservation or default to USER
  const role = inviteSlot.reservedRole || ROLES.EMPLOYEE;

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

exports.handlePublicSignup = async (
  name,
  email,
  password,
  company,
  res,
  next
) => {
  // Create new user with active status (since it's a public link)
  const hashedPassword = await hashPassword(password);
  let user = await createUser({
    name,
    email,
    password: hashedPassword,
    companyId: company._id,
    isActive: true, // Public link users are active by default
    role: ROLES.EMPLOYEE, // Default role for public signups
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

exports.handleDomainSignup = async (
  name,
  email,
  password,
  company,
  res,
  next
) => {
  if (!name) {
    // assign name from email first part
    name = email.split("@")[0];
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

exports.handleRegularLogin = async (user, password, company, res, next) => {
  if (!user.isActive) {
    return next({
      statusCode: STATUS_CODES.UNAUTHORIZED,
      message: "Account is inactive. Please wait for admin approval.",
    });
  }

  if (!(await comparePassword(password, user.password))) {
    return next({
      statusCode: STATUS_CODES.UNAUTHORIZED,
      message: "Invalid password",
    });
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
