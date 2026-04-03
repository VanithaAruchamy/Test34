// routes/chat.js
const express  = require("express");
const OpenAI   = require("openai");
const { authenticateToken }                      = require("../middleware/auth");
const { guardrailMiddleware, classifyQuery }     = require("../middleware/guardrails");
const { answerWithRAG }                          = require("../services/ragService");
const { getStudentById, saveChatLog, saveAuditLog } = require("../db/database");
const { maskStudentId, maskName }               = require("../utils/masking");
const { logger } = require("../utils/logger");

const router = express.Router();
const openai  = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/chat
router.post("/", authenticateToken, guardrailMiddleware, async (req, res) => {
  const t0        = Date.now();
  const { message } = req.body;
  const studentId   = req.user.student_id;
  const queryType   = classifyQuery(message);

  logger.info(`[CHAT] student=${studentId} type=${queryType} query="${message.substring(0, 60)}"`);

  // ── ATTENDANCE ──
  if (queryType === "ATTENDANCE") {
    const student = await getStudentById(studentId);
    if (!student) return res.status(404).json({ success: false, error: "Student not found." });

    const att      = parseFloat(student.attendance);
    const eligible = att >= 75;
    const msg      = eligible
      ? `Your attendance exceeds the minimum requirement of 75%.`
      : `Your attendance is below 75%. Condonation may be required.`;

    const latencyMs = Date.now() - t0;
    await saveChatLog({ studentId, message, response: msg,
      queryType: "attendance", citations: [], confidence: "high",
      tokensUsed: 0, latencyMs });
    await saveAuditLog({ studentId, eventType: "ATTENDANCE_CHAT_QUERY",
      query: message, details: `att=${att}`, ipAddress: req.ip, blocked: false });

    return res.json({
      success:    true,
      answer:     msg,
      data: {
        student_id:            maskStudentId(student.student_id),
        name:                  maskName(student.name),
        attendance_percentage: att,
        status:                eligible ? "eligible" : "not eligible",
        message:               msg,
      },
      query_type:  "attendance",
      citations:   [],
      confidence:  "high",
      tokens_used: 0,
      latency_ms:  latencyMs,
    });
  }

  // ── MARKS ──
  if (queryType === "MARKS") {
    const student = await getStudentById(studentId);
    if (!student) return res.status(404).json({ success: false, error: "Student not found." });

    const cgpa   = parseFloat(student.cgpa);
    const marks  = Math.round(cgpa * 10);
    let grade;
    if      (cgpa >= 9.0) grade = "O";
    else if (cgpa >= 8.0) grade = "A+";
    else if (cgpa >= 7.0) grade = "A";
    else if (cgpa >= 6.0) grade = "B+";
    else if (cgpa >= 5.0) grade = "B";
    else                  grade = "F";
    const percentile = Math.min(99, Math.round((cgpa / 10) * 100));
    const answer     = `Your CGPA is ${cgpa} (Grade: ${grade}). Marks equivalent: ${marks}/100. Percentile: ${percentile}.`;

    const latencyMs = Date.now() - t0;
    await saveChatLog({ studentId, message, response: answer,
      queryType: "marks", citations: [], confidence: "high",
      tokensUsed: 0, latencyMs });
    await saveAuditLog({ studentId, eventType: "MARKS_CHAT_QUERY",
      query: message, details: `cgpa=${cgpa}`, ipAddress: req.ip, blocked: false });

    return res.json({
      success:    true,
      answer,
      data: {
        student_id:      maskStudentId(student.student_id),
        name:            maskName(student.name),
        marks,
        grade,
        percentile,
        cgpa,
        active_backlogs: student.backlogs,
      },
      query_type:  "marks",
      citations:   [],
      confidence:  "high",
      tokens_used: 0,
      latency_ms:  latencyMs,
    });
  }

  // ── PERSONAL DATA ──
  if (queryType === "PERSONAL_DATA") {
    const student = await getStudentById(studentId);
    if (!student) return res.status(404).json({ success: false, error: "Student not found." });

    const cgpa = parseFloat(student.cgpa);
    const att  = parseFloat(student.attendance);
    const internEligible = cgpa >= 7.0 && att >= 75 && student.backlogs === 0;

    const systemPrompt = `You are a University Assistant. Answer ONLY based on this student's data.
Student: ${maskName(student.name)} | Dept: ${student.department} | Year: ${student.year}
Attendance: ${att}% | CGPA: ${cgpa} | Backlogs: ${student.backlogs}
Internship eligible: ${internEligible ? "YES" : "NO"}
Rules: att<75% needs condonation, internship needs CGPA≥7.0 att≥75% no backlogs.`;

    const resp = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      max_tokens: 400, temperature: 0.1,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: message },
      ],
    });

    const latencyMs = Date.now() - t0;
    const tokens    = resp.usage?.total_tokens || 0;
    const answer    = resp.choices[0].message.content;

    await saveChatLog({ studentId, message, response: answer,
      queryType: "personal_data", citations: [], confidence: "high",
      tokensUsed: tokens, latencyMs });

    return res.json({
      success:     true,
      answer,
      data: {
        student_id: maskStudentId(student.student_id),
        name:       maskName(student.name),
        attendance: att,
        cgpa,
        backlogs:   student.backlogs,
      },
      query_type:  "personal_data",
      citations:   [],
      confidence:  "high",
      tokens_used: tokens,
      latency_ms:  latencyMs,
    });
  }

  // ── POLICY RAG (default) ──
  try {
    const ragResult = await answerWithRAG(message);

    await saveChatLog({ studentId, message, response: ragResult.answer,
      queryType: "policy", citations: ragResult.citations,
      confidence: ragResult.confidence, tokensUsed: ragResult.tokens_used,
      latencyMs: ragResult.latency_ms });
    await saveAuditLog({ studentId, eventType: "POLICY_QUERY",
      query: message, details: `conf=${ragResult.confidence}`,
      ipAddress: req.ip, blocked: false });

    return res.json({
      success:     true,
      answer:      ragResult.answer,
      citations:   ragResult.citations,
      confidence:  ragResult.confidence,
      query_type:  ragResult.query_type,
      tokens_used: ragResult.tokens_used,
      latency_ms:  ragResult.latency_ms,
    });
  } catch (err) {
    logger.error("RAG error: " + err.message);
    return res.status(500).json({ success: false, error: "Failed to retrieve policy information." });
  }
});

module.exports = router;
