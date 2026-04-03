// db/database.js
const mysql = require("mysql2/promise");
const XLSX  = require("xlsx");
const path  = require("path");
const { logger } = require("../utils/logger");

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host:               process.env.DB_HOST     || "localhost",
      port:               parseInt(process.env.DB_PORT || "3306"),
      user:               process.env.DB_USER     || "root",
      password:           process.env.DB_PASSWORD || "",
      database:           process.env.DB_NAME     || "university_assistant",
      waitForConnections: true,
      connectionLimit:    10,
      queueLimit:         0,
      timezone:           "+00:00",
    });
  }
  return pool;
}

async function initDatabase() {
  const db = getPool();

  // students
  await db.execute(`CREATE TABLE IF NOT EXISTS students (
    student_id   VARCHAR(10)   PRIMARY KEY,
    name         VARCHAR(100)  NOT NULL,
    department   VARCHAR(50),
    year         INT,
    attendance   DECIMAL(5,2),
    cgpa         DECIMAL(4,2),
    backlogs     INT           DEFAULT 0,
    role         VARCHAR(20)   DEFAULT 'student',
    password     VARCHAR(255)  DEFAULT 'password123',
    created_at   DATETIME      DEFAULT CURRENT_TIMESTAMP
  )`);

  // policies
  await db.execute(`CREATE TABLE IF NOT EXISTS policies (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    policy_category  VARCHAR(100),
    policy_title     VARCHAR(200),
    details          TEXT,
    access_level     VARCHAR(50) DEFAULT 'public',
    created_at       DATETIME    DEFAULT CURRENT_TIMESTAMP
  )`);

  // chat_logs
  await db.execute(`CREATE TABLE IF NOT EXISTS chat_logs (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    student_id   VARCHAR(10),
    message      TEXT,
    response     TEXT,
    query_type   VARCHAR(50),
    citations    TEXT,
    confidence   VARCHAR(20),
    tokens_used  INT       DEFAULT 0,
    latency_ms   INT       DEFAULT 0,
    timestamp    DATETIME  DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cl_student (student_id),
    INDEX idx_cl_time    (timestamp)
  )`);

  // audit_logs
  await db.execute(`CREATE TABLE IF NOT EXISTS audit_logs (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    student_id   VARCHAR(10),
    event_type   VARCHAR(100),
    query        TEXT,
    details      TEXT,
    ip_address   VARCHAR(50),
    blocked      TINYINT(1)  DEFAULT 0,
    timestamp    DATETIME    DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_al_event   (event_type),
    INDEX idx_al_blocked (blocked),
    INDEX idx_al_student (student_id)
  )`);

  logger.info("✅ MySQL tables ready");

  const [[{ c: sc }]] = await db.execute("SELECT COUNT(*) as c FROM students");
  if (sc === 0) await seedStudents(db);

  const [[{ c: pc }]] = await db.execute("SELECT COUNT(*) as c FROM policies");
  if (pc === 0) await seedPolicies(db);
}

async function seedStudents(db) {
  try {
    const wb   = XLSX.readFile(path.join(__dirname, "../data/students_data_60.xlsx"));
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    for (const r of rows) {
      await db.execute(
        `INSERT IGNORE INTO students
           (student_id, name, department, year, attendance, cgpa, backlogs, role)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'student')`,
        [String(r.Student_ID), r.Name, r.Department,
         r.Year, r.Attendance_Percentage, r.CGPA, r.Active_Backlogs]
      );
    }
    logger.info(`✅ Seeded ${rows.length} students`);
  } catch (e) { logger.warn("seedStudents error: " + e.message); }
}

async function seedPolicies(db) {
  try {
    const wb   = XLSX.readFile(path.join(__dirname, "../data/university_policies.xlsx"));
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    for (const r of rows) {
      await db.execute(
        `INSERT INTO policies (policy_category, policy_title, details) VALUES (?, ?, ?)`,
        [r.Policy_Category, r.Policy_Title, r.Details]
      );
    }
    logger.info(`✅ Seeded ${rows.length} policies`);
  } catch (e) { logger.warn("seedPolicies error: " + e.message); }
}

// ── CRUD ──
async function getStudentById(id) {
  const [[row]] = await getPool().execute(
    "SELECT * FROM students WHERE student_id = ?", [String(id)]
  );
  return row || null;
}

async function getAllPolicies() {
  const [rows] = await getPool().execute("SELECT * FROM policies");
  return rows;
}

async function saveChatLog(entry) {
  try {
    await getPool().execute(
      `INSERT INTO chat_logs
         (student_id, message, response, query_type, citations, confidence, tokens_used, latency_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [entry.studentId,
       entry.message,
       (entry.response || "").substring(0, 2000),
       entry.queryType,
       Array.isArray(entry.citations) ? entry.citations.join(" | ") : (entry.citations || ""),
       entry.confidence || "",
       entry.tokensUsed || 0,
       entry.latencyMs  || 0]
    );
  } catch (e) { logger.warn("saveChatLog: " + e.message); }
}

async function getChatLogs(studentId, limit = 50) {
  const [rows] = await getPool().execute(
    "SELECT * FROM chat_logs WHERE student_id = ? ORDER BY timestamp DESC LIMIT ?",
    [studentId, limit]
  );
  return rows;
}

async function saveAuditLog(entry) {
  try {
    await getPool().execute(
      `INSERT INTO audit_logs (student_id, event_type, query, details, ip_address, blocked)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [entry.studentId || "unknown", entry.eventType,
       (entry.query || "").substring(0, 500),
       entry.details || "", entry.ipAddress || "",
       entry.blocked ? 1 : 0]
    );
  } catch (e) { logger.warn("saveAuditLog: " + e.message); }
}

async function getAuditLogs(limit = 100) {
  const [rows] = await getPool().execute(
    "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?", [limit]
  );
  return rows;
}

async function getStats() {
  const db = getPool();
  const [[{ tq }]] = await db.execute("SELECT COUNT(*) as tq FROM chat_logs");
  const [[{ ba }]] = await db.execute("SELECT COUNT(*) as ba FROM audit_logs WHERE blocked=1");
  const [[{ ia }]] = await db.execute("SELECT COUNT(*) as ia FROM audit_logs WHERE event_type='INJECTION_ATTEMPT'");
  const [[{ ts }]] = await db.execute("SELECT COUNT(*) as ts FROM students");
  const [[{ at }]] = await db.execute("SELECT COALESCE(AVG(tokens_used),0) as at FROM chat_logs WHERE tokens_used>0");
  const [[{ al }]] = await db.execute("SELECT COALESCE(AVG(latency_ms),0) as al FROM chat_logs WHERE latency_ms>0");
  return {
    totalQueries:       tq,
    blockedAttempts:    ba,
    injectionAttempts:  ia,
    totalStudents:      ts,
    avgTokensPerQuery:  Math.round(at),
    avgLatencyMs:       Math.round(al),
  };
}

module.exports = {
  getPool, initDatabase,
  getStudentById, getAllPolicies,
  saveChatLog, getChatLogs,
  saveAuditLog, getAuditLogs, getStats,
};
