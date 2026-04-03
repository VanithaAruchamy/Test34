// src/pages/Login.js
import React, { useState } from "react";
import { login } from "../services/api";

const DEMO_ACCOUNTS = [
  { id: "1001", name: "Tarun",  dept: "ECE", att: 80,  cgpa: 9.41, note: "High CGPA, 1 backlog" },
  { id: "1002", name: "Sneha",  dept: "CSE", att: 100, cgpa: 7.07, note: "100% attendance" },
  { id: "1003", name: "Pranav", dept: "ECE", att: 68,  cgpa: 8.07, note: "Low attendance (Warning)" },
  { id: "1007", name: "Kiran",  dept: "ECE", att: 65,  cgpa: 5.58, note: "Critical att, Low CGPA" },
];

export default function Login({ onLogin }) {
  const [studentId, setStudentId] = useState("");
  const [password,  setPassword]  = useState("");
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await login(studentId, password);
      localStorage.setItem("token",   res.data.token);
      localStorage.setItem("student", JSON.stringify(res.data.student));
      onLogin(res.data.student);
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Check credentials.");
    } finally { setLoading(false); }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Hero */}
        <div style={S.hero}>
          <div style={S.heroIcon}>🎓</div>
          <h1 style={S.title}>UniAssist AI</h1>
          <p style={S.subtitle}>AI-Driven University Student Assistant</p>
          <div style={S.tagRow}>
            {["OpenAI RAG","ChromaDB","MySQL","JWT + RBAC","Guardrails","CI/CD"].map(t => (
              <span key={t} style={S.tag}>{t}</span>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={S.form}>
          <div style={S.field}>
            <label style={S.label}>Student ID</label>
            <input style={S.input} value={studentId}
              onChange={e => setStudentId(e.target.value)}
              placeholder="e.g. 1001" required />
          </div>
          <div style={S.field}>
            <label style={S.label}>Password</label>
            <input style={S.input} type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="password123" required />
          </div>
          {error && <div style={S.errBox}>⚠️ {error}</div>}
          <button type="submit"
            style={loading ? { ...S.btn, opacity: 0.6 } : S.btn}
            disabled={loading}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>

        {/* Demo accounts */}
        <div style={S.demoBox}>
          <p style={S.demoTitle}>🔑 Demo accounts — password: <strong>password123</strong></p>
          <div style={S.demoGrid}>
            {DEMO_ACCOUNTS.map(u => (
              <button key={u.id} style={S.demoBtn}
                onClick={() => { setStudentId(u.id); setPassword("password123"); }}>
                <div style={S.demoAvatar}>{u.name[0]}</div>
                <div style={S.demoInfo}>
                  <div style={S.demoName}>{u.name} · {u.dept}</div>
                  <div style={S.demoMeta}>Att: {u.att}% · CGPA: {u.cgpa}</div>
                  <div style={S.demoNote}>{u.note}</div>
                </div>
                <div style={S.demoId}>#{u.id}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  page:     { minHeight:"100vh", background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'Inter',sans-serif" },
  card:     { background:"#fff", borderRadius:24, padding:"40px 36px", width:"100%", maxWidth:500, boxShadow:"0 32px 80px rgba(0,0,0,0.5)" },
  hero:     { textAlign:"center", marginBottom:28 },
  heroIcon: { fontSize:56, marginBottom:10 },
  title:    { margin:"0 0 4px", fontSize:28, fontWeight:700, color:"#0f172a" },
  subtitle: { margin:"0 0 14px", fontSize:13, color:"#64748b" },
  tagRow:   { display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap" },
  tag:      { background:"#f1f5f9", color:"#475569", fontSize:10, fontWeight:600, padding:"3px 10px", borderRadius:20 },
  form:     { display:"flex", flexDirection:"column", gap:14, marginBottom:20 },
  field:    { display:"flex", flexDirection:"column", gap:5 },
  label:    { fontSize:13, fontWeight:600, color:"#374151" },
  input:    { padding:"12px 14px", borderRadius:10, border:"1.5px solid #e2e8f0", fontSize:15, outline:"none", fontFamily:"'Inter',sans-serif" },
  errBox:   { background:"#fef2f2", color:"#dc2626", padding:"10px 14px", borderRadius:10, fontSize:13, border:"1px solid #fecaca" },
  btn:      { background:"linear-gradient(135deg,#1e3a5f,#2d6a9f)", color:"#fff", border:"none", padding:14, borderRadius:10, fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"'Inter',sans-serif" },
  demoBox:  { background:"#f8fafc", borderRadius:14, padding:14, border:"1px solid #e2e8f0" },
  demoTitle:{ fontSize:12, color:"#64748b", margin:"0 0 10px", textAlign:"center" },
  demoGrid: { display:"flex", flexDirection:"column", gap:8 },
  demoBtn:  { display:"flex", alignItems:"center", gap:12, padding:"10px 12px", background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:12, cursor:"pointer", fontFamily:"'Inter',sans-serif", textAlign:"left" },
  demoAvatar:{ width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg,#1e3a5f,#2d6a9f)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, flexShrink:0 },
  demoInfo: { flex:1 },
  demoName: { fontSize:13, fontWeight:600, color:"#1e293b" },
  demoMeta: { fontSize:11, color:"#64748b", marginTop:1 },
  demoNote: { fontSize:10, color:"#94a3b8", marginTop:1 },
  demoId:   { fontSize:11, color:"#94a3b8", fontWeight:600 },
};
