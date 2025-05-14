const bcrypt = require("bcrypt");
const { STATUS_CODES } = require("../utils/constants");
const { generateResponse, parseBody } = require("../utils");
const { findUser, createUser, generateToken } = require("../models/userModel");

exports.createUser = async (req, res,next) => {
  try {
    const { name, email,password, accountName, role, generalQuestions, channelPreference } = parseBody(req.body)

    if ( !name ||!email ||!password || !accountName ||  !role || !generalQuestions ||!channelPreference ) return generateResponse(
        null,
        "All fields are required",
        res,
        STATUS_CODES.BAD_REQUEST
      );
      //check if user already exists
      const existingUser = await findUser({email})
      if(existingUser) return generateResponse(
        null,
        "User already exists",
        res,
        STATUS_CODES.BAD_REQUEST
      );
      //hash password
      const hashedPassword = await bcrypt.hash(password, 10)
      // generate token
      const refreshToken = generateToken({email})
      //create user
      const user = await createUser({name, email, password: hashedPassword, accountName, role, generalQuestions, channelPreference, refreshToken})
      return generateResponse(
        user,
        "User created successfully",
        res,
        STATUS_CODES.CREATED
      )
  } catch (error) {
    console.log(error)
    return next(error)
  }
};
