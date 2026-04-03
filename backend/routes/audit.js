// routes/audit.js
const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const { getAuditLogs, getChatLogs, getStats } = require("../db/database");

const router = express.Router();

router.get("/logs",  authenticateToken, async (req, res) => {
  const logs = await getAuditLogs(100);
  return res.json({ success: true, logs, count: logs.length });
});

router.get("/chat",  authenticateToken, async (req, res) => {
  const logs = await getChatLogs(req.user.student_id, 50);
  return res.json({ success: true, logs, count: logs.length });
});

router.get("/stats", authenticateToken, async (req, res) => {
  const stats = await getStats();
  return res.json({ success: true, stats });
});

module.exports = router;
