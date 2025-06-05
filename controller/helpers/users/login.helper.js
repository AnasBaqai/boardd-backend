const { generateResponse, setRefreshTokenCookie } = require("../../../utils");
const { STATUS_CODES, ROLES } = require("../../../utils/constants");
const {
  REFRESH_TOKEN,
  calculateRefreshTokenExpiry,
} = require("../../../utils/tokenConstants");
const {
  createUser,
  generateToken,
  generateRefreshToken,
  findUser,
  addRefreshToken,
} = require("../../../models/userModel");
const { hashPassword, comparePassword } = require("./signup.helper");
const { extractDeviceInfo } = require("../../../utils/deviceDetection");

// Helper function to create and store refresh token
const createAndStoreRefreshToken = async (user, req) => {
  // Generate both tokens
  const accessToken = generateToken(user);
  const refreshToken = generateRefreshToken(user);

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

  return { accessToken, refreshToken };
};

exports.handleInviteSignup = async (
  name,
  email,
  password,
  company,
  inviteSlot,
  req,
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

  // Fetch clean user object without password for response
  const cleanUser = await findUser({ _id: user._id });

  // Generate both tokens and store refresh token
  const { accessToken, refreshToken } = await createAndStoreRefreshToken(
    cleanUser,
    req
  );

  // Set refresh token as httpOnly cookie
  setRefreshTokenCookie(res, refreshToken);

  return generateResponse(
    {
      user: cleanUser,
      accessToken,
    },
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
  req,
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

  // Fetch clean user object without password for response
  const cleanUser = await findUser({ _id: user._id });

  // Generate both tokens and store refresh token
  const { accessToken, refreshToken } = await createAndStoreRefreshToken(
    cleanUser,
    req
  );

  // Set refresh token as httpOnly cookie
  setRefreshTokenCookie(res, refreshToken);

  return generateResponse(
    {
      user: cleanUser,
      accessToken,
    },
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
  req,
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

  // Fetch clean user object without password for response
  const cleanUser = await findUser({ _id: user._id });

  // Generate both tokens and store refresh token
  const { accessToken, refreshToken } = await createAndStoreRefreshToken(
    cleanUser,
    req
  );

  // Set refresh token as httpOnly cookie
  setRefreshTokenCookie(res, refreshToken);

  return generateResponse(
    {
      user: cleanUser,
      accessToken,
    },
    "User account created successfully. Waiting for admin approval.",
    res,
    STATUS_CODES.SUCCESS
  );
};

exports.handleRegularLogin = async (
  user,
  password,
  company,
  req,
  res,
  next
) => {
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

  // Fetch clean user object without password for response
  const cleanUser = await findUser({ _id: user._id });

  // Generate both tokens and store refresh token
  const { accessToken, refreshToken } = await createAndStoreRefreshToken(
    cleanUser,
    req
  );

  // Set refresh token as httpOnly cookie
  setRefreshTokenCookie(res, refreshToken);

  return generateResponse(
    {
      user: cleanUser,
      accessToken,
    },
    "User logged in successfully",
    res,
    STATUS_CODES.SUCCESS
  );
};
