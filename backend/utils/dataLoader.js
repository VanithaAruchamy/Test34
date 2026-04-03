// utils/dataLoader.js
const XLSX = require("xlsx");
const path = require("path");

let studentsCache = null;
let policiesCache = null;

function loadStudents() {
  if (studentsCache) return studentsCache;
  const wb = XLSX.readFile(path.join(__dirname, "../data/students_data_60.xlsx"));
  const ws = wb.Sheets[wb.SheetNames[0]];
  studentsCache = XLSX.utils.sheet_to_json(ws);
  return studentsCache;
}

function loadPolicies() {
  if (policiesCache) return policiesCache;
  const wb = XLSX.readFile(path.join(__dirname, "../data/university_policies.xlsx"));
  const ws = wb.Sheets[wb.SheetNames[0]];
  policiesCache = XLSX.utils.sheet_to_json(ws);
  return policiesCache;
}

function getStudentById(studentId) {
  return loadStudents().find((s) => String(s.Student_ID) === String(studentId)) || null;
}

// PII masking: 1001 → 1**1
function maskStudentId(id) {
  const str = String(id);
  if (str.length <= 2) return str;
  return str[0] + "*".repeat(str.length - 2) + str[str.length - 1];
}

// Sanitize student object — mask ID before returning
function sanitizeStudent(student) {
  if (!student) return null;
  return {
    student_id: maskStudentId(student.Student_ID),
    name: student.Name,
    department: student.Department,
    year: student.Year,
    attendance_percentage: student.Attendance_Percentage,
    cgpa: student.CGPA,
    active_backlogs: student.Active_Backlogs,
  };
}

module.exports = { loadStudents, loadPolicies, getStudentById, maskStudentId, sanitizeStudent };
