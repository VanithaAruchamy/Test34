// utils/masking.js

// 1001 → "1**1"
function maskStudentId(id) {
  const s = String(id);
  if (s.length <= 2) return s;
  return s[0] + "*".repeat(s.length - 2) + s[s.length - 1];
}

// "Pranav Mehta" → "Pranav M***"
// "Aisha Singh"  → "Aisha S***"
function maskName(name) {
  if (!name) return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0] + "***";
  return parts[0] + " " + parts[parts.length - 1][0] + "***";
}

// Sanitize full student record for API response
function sanitizeStudent(s) {
  if (!s) return null;
  return {
    student_id: maskStudentId(s.student_id || s.Student_ID),
    name:       maskName(s.name || s.Name),
    department: s.department || s.Department,
    year:       s.year || s.Year,
  };
}

module.exports = { maskStudentId, maskName, sanitizeStudent };
