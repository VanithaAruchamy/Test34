// middleware/guardrails.js
const { saveAuditLog }  = require("../db/database");
const { maskStudentId } = require("../utils/masking");
const { logger }        = require("../utils/logger");

// ── 15 Injection patterns ──
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous\s+)?instructions/i,
  /forget\s+everything/i,
  /you\s+are\s+now/i,
  /act\s+as\s+(a\s+)?different/i,
  /bypass\s+(security|auth|rules|guardrails)/i,
  /show\s+(all|every)\s+(student|user|data|record)/i,
  /list\s+all\s+students/i,
  /dump\s+(all|database|data)/i,
  /reveal\s+(all|hidden|secret|config|system|internal)/i,
  /system\s+prompt/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /override\s+(all\s+)?restrictions/i,
  /show\s+(marks|attendance|data)\s+(of|for)\s+student\s+\d+/i,
  /access\s+student\s+\d+/i,
];

// ── Detect injection ──
function detectInjection(query) {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(query)) {
      return { detected: true, type: "INJECTION_ATTEMPT",
        message: "Query blocked: contains restricted patterns." };
    }
  }
  return { detected: false };
}

// ── Detect cross-student access ──
function detectCrossStudent(query, authStudentId) {
  const match = query.match(/student[\s_-]?(?:id[\s:]*)?(\d{3,})/i);
  if (match && match[1] !== String(authStudentId)) {
    return { detected: true, requestedId: match[1], authenticatedId: authStudentId };
  }
  return { detected: false };
}

// ── Classify query for routing ──
function classifyQuery(query) {
  const q = query.toLowerCase();
  const attKw = ["my attendance","attendance percentage","my percentage",
    "show my attendance","current attendance","am i eligible","attendance status",
    "my att"];
  const mrkKw = ["my marks","my grade","my score","my result","show my marks",
    "my cgpa","my backlogs","my performance","my gpa","my grades"];
  const perKw = ["what is my","show my","tell me my","my academic","my profile",
    "my details"];

  if (attKw.some(kw => q.includes(kw))) return "ATTENDANCE";
  if (mrkKw.some(kw => q.includes(kw))) return "MARKS";
  if (perKw.some(kw => q.includes(kw))) return "PERSONAL_DATA";
  return "POLICY_RAG";
}

// ── Guardrail middleware ──
async function guardrailMiddleware(req, res, next) {
  const query     = req.body?.message || req.body?.query || "";
  const studentId = req.user?.student_id || "unknown";
  const ip        = req.ip || "";

  if (!query || query.trim().length === 0) {
    return res.status(400).json({ success: false, error: "Query cannot be empty." });
  }

  // 1. Injection check
  const injection = detectInjection(query);
  if (injection.detected) {
    await saveAuditLog({ studentId, eventType: "INJECTION_ATTEMPT",
      query, details: injection.message, ipAddress: ip, blocked: true });
    logger.warn(`[GUARDRAIL] Injection blocked: ${studentId}`);
    return res.status(403).json({
      success:    false,
      error:      injection.message,
      error_type: "PromptInjectionDetected",
      query_type: "blocked",
    });
  }

  // 2. Cross-student access check
  if (req.user) {
    const cross = detectCrossStudent(query, req.user.student_id);
    if (cross.detected) {
      await saveAuditLog({ studentId, eventType: "CROSS_STUDENT_ACCESS",
        query, details: `Tried student ${cross.requestedId}`,
        ipAddress: ip, blocked: true });
      logger.warn(`[GUARDRAIL] Cross-student access blocked: ${studentId}`);
      return res.status(403).json({
        success: false,
        error:   "You can only access your own information.",
        requested_student:     maskStudentId(cross.requestedId),
        authenticated_student: maskStudentId(cross.authenticatedId),
        timestamp:   new Date().toISOString(),
        query_type:  "unauthorized",
      });
    }
  }

  next();
}

module.exports = {
  detectInjection, detectCrossStudent, classifyQuery, guardrailMiddleware,
};
