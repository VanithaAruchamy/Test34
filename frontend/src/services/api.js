// src/services/api.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 60000,
});

// Attach JWT to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto logout on invalid token
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.data?.code === "INVALID_TOKEN") {
      localStorage.clear();
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export const login          = (student_id, password) => API.post("/auth/login", { student_id, password });
export const sendChat       = (message) => API.post("/chat", { message });
export const getAttendance  = () => API.get("/student/attendance");
export const getMarks       = () => API.get("/student/marks");
export const getProfile     = () => API.get("/student/profile");
export const getAuditLogs   = () => API.get("/audit/logs");
export const getChatHistory = () => API.get("/audit/chat");
export const getStats       = () => API.get("/audit/stats");
export const getHealth      = () => API.get("/health");

export default API;
