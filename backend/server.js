// server.js
require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const rateLimit = require("express-rate-limit");
const { logger }       = require("./utils/logger");
const { initDatabase } = require("./db/database");
const { buildVectorIndex } = require("./services/ragService");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security middleware ──
app.use(helmet());
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "10kb" }));

// ── Rate limiting ──
app.use("/api/", rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  message: { success: false, error: "Too many requests. Please try again later." },
}));
app.use("/api/chat", rateLimit({
  windowMs: 60 * 1000, max: 20,
  message: { success: false, error: "Too many chat messages. Please wait." },
}));

// ── Routes ──
app.use("/api/auth",    require("./routes/auth"));
app.use("/api/student", require("./routes/student"));
app.use("/api/chat",    require("./routes/chat"));
app.use("/api/audit",   require("./routes/audit"));

// ── Health check ──
app.get("/api/health", (req, res) => res.json({
  status:      "OK",
  service:     "University Assistant API",
  timestamp:   new Date().toISOString(),
  database:    "MySQL",
  vectorStore: "Vectra (local JSON)",
  aiModel:     process.env.OPENAI_MODEL || "gpt-4o-mini",
  embedding:   process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
}));

// ── 404 ──
app.use((req, res) =>
  res.status(404).json({ success: false, error: "Route not found." })
);

// ── Error handler ──
app.use((err, req, res, next) => {
  logger.error("Unhandled: " + err.message);
  res.status(500).json({ success: false, error: "Internal server error." });
});

// ── Start ──
async function start() {
  try {
    logger.info("🗄️  Connecting to MySQL...");
    await initDatabase();

    app.listen(PORT, async () => {
      logger.info(`🚀 University Assistant API → http://localhost:${PORT}`);
      logger.info("🔨 Building Vectra vector index...");
      try {
        await buildVectorIndex();
      } catch (e) {
        logger.warn("⚠️  Vector index build failed: " + e.message);
      }
      logger.info("✅ Server ready!");
    });
  } catch (e) {
    logger.error("❌ Startup failed: " + e.message);
    logger.error("   Check MySQL credentials in backend/.env");
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") start();

module.exports = app;
