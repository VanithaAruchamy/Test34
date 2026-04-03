// routes/auth.js
const express = require("express");
const jwt     = require("jsonwebtoken");
const { getStudentById, saveAuditLog } = require("../db/database");
const { logger } = require("../utils/logger");

const router = express.Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { student_id, password } = req.body;

  if (!student_id)
    return res.status(400).json({ success: false, error: "student_id is required" });

  const student = await getStudentById(student_id);

  if (!student) {
    await saveAuditLog({ studentId: student_id, eventType: "FAILED_LOGIN",
      query: "", details: "Student not found", ipAddress: req.ip, blocked: true });
    return res.status(401).json({ success: false, error: "Student not found. Check your ID." });
  }

  if (password !== "password123") {
    await saveAuditLog({ studentId: student_id, eventType: "FAILED_LOGIN",
      query: "", details: "Wrong password", ipAddress: req.ip, blocked: true });
    return res.status(401).json({ success: false, error: "Invalid password." });
  }

  const token = jwt.sign(
    {
      student_id: student.student_id,
      name:       student.name,
      department: student.department,
      role:       student.role || "student",
    },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  logger.info(`User logged in: ${student.name} (${student.department})`);
  await saveAuditLog({ studentId: student_id, eventType: "LOGIN_SUCCESS",
    query: "", details: "", ipAddress: req.ip, blocked: false });

  return res.json({
    success: true,
    token,
    student: {
      name:       student.name,
      department: student.department,
      year:       student.year,
      student_id: student.student_id,
      role:       student.role || "student",
    },
  });
});

module.exports = router;
