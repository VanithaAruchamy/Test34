-- Run: mysql -u root -p < backend/db/schema.sql
CREATE DATABASE IF NOT EXISTS university_assistant;
USE university_assistant;

CREATE TABLE IF NOT EXISTS students (
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
);

CREATE TABLE IF NOT EXISTS policies (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  policy_category  VARCHAR(100),
  policy_title     VARCHAR(200),
  details          TEXT,
  access_level     VARCHAR(50) DEFAULT 'public',
  created_at       DATETIME    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_logs (
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
  INDEX idx_student (student_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  student_id   VARCHAR(10),
  event_type   VARCHAR(100),
  query        TEXT,
  details      TEXT,
  ip_address   VARCHAR(50),
  blocked      TINYINT(1) DEFAULT 0,
  timestamp    DATETIME   DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event   (event_type),
  INDEX idx_blocked (blocked)
);
