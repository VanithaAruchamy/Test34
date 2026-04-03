// middleware/auth.js
const jwt = require("jsonwebtoken");
const { saveAuditLog } = require("../db/database");
const { logger }       = require("../utils/logger");

// ── Verify JWT ──
async function authenticateToken(req, res, next) {
  const auth  = req.headers["authorization"];
  const token = auth && auth.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false, error: "Access denied. No token provided.", code: "NO_TOKEN",
    });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    await saveAuditLog({
      studentId: "unknown", eventType: "INVALID_TOKEN",
      query: "", details: err.message, ipAddress: req.ip, blocked: true,
    });
    logger.warn(`[AUTH] Invalid token: ${err.message}`);
    return res.status(403).json({
      success: false, error: "Invalid or expired token.", code: "INVALID_TOKEN",
    });
  }
}

// ── RBAC: require specific role ──
function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = req.user?.role || "student";
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error:   `Access denied. Requires role: ${roles.join(" or ")}`,
        code:    "INSUFFICIENT_ROLE",
      });
    }
    next();
  };
}

module.exports = { authenticateToken, requireRole };
