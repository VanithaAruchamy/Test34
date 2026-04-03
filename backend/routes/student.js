// routes/student.js
const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const { getStudentById, saveChatLog, saveAuditLog } = require("../db/database");
const { maskStudentId, maskName } = require("../utils/masking");

const router = express.Router();

// ── Attendance: GET /api/student/attendance ──
router.get("/attendance", authenticateToken, async (req, res) => {
  const t0      = Date.now();
  const student = await getStudentById(req.user.student_id);
  if (!student) return res.status(404).json({ success: false, error: "Student not found." });

  const att = parseFloat(student.attendance);
  let status, eligible, message;
  if      (att < 65) { status = "critical";     eligible = false; message = "Below 65% — may be barred from exams."; }
  else if (att < 75) { status = "warning";       eligible = false; message = "65–74% — condonation required with medical proof and fine."; }
  else if (att < 85) { status = "satisfactory";  eligible = true;  message = "Meets the minimum 75% attendance requirement."; }
  else               { status = "excellent";      eligible = true;  message = "Great attendance! Above 85%."; }

  const latencyMs = Date.now() - t0;
  await saveChatLog({ studentId: req.user.student_id, message: "GET /student/attendance",
    response: `att=${att}%`, queryType: "attendance", citations: [],
    confidence: "high", tokensUsed: 0, latencyMs });
  await saveAuditLog({ studentId: req.user.student_id, eventType: "ATTENDANCE_QUERY",
    query: "attendance", details: `att=${att}`, ipAddress: req.ip, blocked: false });

  return res.json({
    success: true,
    data: {
      student_id:            maskStudentId(student.student_id),
      name:                  maskName(student.name),
      department:            student.department,
      year:                  student.year,
      attendance_percentage: att,
      status,
      eligible,
      message,
      minimum_required:      75,
      query_type:            "attendance",
    },
  });
});

// ── Marks: GET /api/student/marks ──
router.get("/marks", authenticateToken, async (req, res) => {
  const t0      = Date.now();
  const student = await getStudentById(req.user.student_id);
  if (!student) return res.status(404).json({ success: false, error: "Student not found." });

  const cgpa  = parseFloat(student.cgpa);
  const marks = Math.round(cgpa * 10);
  let grade;
  if      (cgpa >= 9.0) grade = "O";
  else if (cgpa >= 8.0) grade = "A+";
  else if (cgpa >= 7.0) grade = "A";
  else if (cgpa >= 6.0) grade = "B+";
  else if (cgpa >= 5.0) grade = "B";
  else                  grade = "F";

  const percentile = Math.min(99, Math.round((cgpa / 10) * 100));
  const att = parseFloat(student.attendance);
  const internshipEligible = cgpa >= 7.0 && att >= 75 && student.backlogs === 0;

  const latencyMs = Date.now() - t0;
  await saveChatLog({ studentId: req.user.student_id, message: "GET /student/marks",
    response: `cgpa=${cgpa}`, queryType: "marks", citations: [],
    confidence: "high", tokensUsed: 0, latencyMs });
  await saveAuditLog({ studentId: req.user.student_id, eventType: "MARKS_QUERY",
    query: "marks", details: `cgpa=${cgpa}`, ipAddress: req.ip, blocked: false });

  return res.json({
    success: true,
    data: {
      student_id:          maskStudentId(student.student_id),
      name:                maskName(student.name),
      department:          student.department,
      year:                student.year,
      cgpa,
      marks,
      grade,
      percentile,
      active_backlogs:     student.backlogs,
      internship_eligible: internshipEligible,
      internship_reason:   internshipEligible
        ? "Meets all criteria: CGPA ≥ 7.0, Attendance ≥ 75%, No active backlogs"
        : `Not eligible: ${cgpa < 7.0 ? "CGPA below 7.0. " : ""}${att < 75 ? "Attendance below 75%. " : ""}${student.backlogs > 0 ? `${student.backlogs} active backlog(s).` : ""}`,
      query_type: "marks",
    },
  });
});

// ── Profile: GET /api/student/profile ──
router.get("/profile", authenticateToken, async (req, res) => {
  const student = await getStudentById(req.user.student_id);
  if (!student) return res.status(404).json({ success: false, error: "Student not found." });
  return res.json({
    success: true,
    data: {
      student_id: maskStudentId(student.student_id),
      name:       maskName(student.name),
      department: student.department,
      year:       student.year,
      attendance: parseFloat(student.attendance),
      cgpa:       parseFloat(student.cgpa),
      backlogs:   student.backlogs,
      role:       student.role,
    },
  });
});

module.exports = router;
