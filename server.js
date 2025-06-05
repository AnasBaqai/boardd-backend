const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const API = require("./api");
const http = require("http");
const DB_CONNECT = require("./config/dbConnect");
const cookieSession = require("cookie-session");
const { notFound, errorHandler } = require("./middlewares/errorHandling");
const { log } = require("./middlewares/log");
const { initSocket } = require("./utils/socket");
const migrationRunner = require("./utils/migrationRunner");
require("dotenv").config();
const PORT = process.env.PORT;

const app = express();

// Database connection and migrations
const initializeApp = async () => {
  try {
    // Connect to database
    await DB_CONNECT();
    console.log("✅ Database connected successfully");

    // Run pending migrations
    const migrationResult = await migrationRunner.runPendingMigrations();
    if (migrationResult.executed > 0) {
      console.log(`✅ Executed ${migrationResult.executed} migrations`);
    }
  } catch (error) {
    console.error("❌ App initialization failed:", error);
    process.exit(1); // Exit if critical initialization fails
  }
};

const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "30mb" }));
app.use(cookieParser());
app.use("/uploadFiles", express.static("uploadFiles"));
app.use("/assets", express.static("assets"));
app.use(
  cookieSession({
    name: "session",
    keys: [process.env.COOKIE_KEY],
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  })
);

// CORS configuration - cannot use wildcard "*" when credentials: true
const allowedOrigins = [
  "http://localhost:3000", // Local development
  "http://localhost:3001", // Alternative local port
  "https://boarddd.ddns.net", // Production domain
  "https://www.boarddd.ddns.net", // Production with www
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "accessToken"],
  })
);

app.get("/", (req, res) => res.json({ message: "Welcome to the Boarddd" }));

app.use(log);
new API(app).registerGroups();
app.use(notFound);
app.use(errorHandler);

// Initialize app and start server
initializeApp()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}/`);
      console.log(`🔌 Socket.io initialized and listening for connections`);
    });
  })
  .catch((error) => {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  });
