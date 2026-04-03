import React, { useState, useEffect } from "react";
import Login     from "./pages/Login";
import Chat      from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import AuditLogs from "./pages/AuditLogs";

const NAV = [
  { id:"chat",      icon:"💬", label:"AI Chat" },
  { id:"dashboard", icon:"📊", label:"My Profile" },
  { id:"audit",     icon:"🛡️", label:"Audit Logs" },
];

const PAGE_SUB = {
  chat:      "RAG answers with citations · Confidence · Token tracking · MySQL logging",
  dashboard: "PII-masked · Grade (O/A+/A/B+/B/F) · Percentile · Internship eligibility",
  audit:     "Security events · Injection attempts · Chat history — all persisted in MySQL",
};

export default function App() {
  const [student,   setStudent]   = useState(null);
  const [activeTab, setActiveTab] = useState("chat");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const saved = localStorage.getItem("student");
    if (token && saved) {
      try { setStudent(JSON.parse(saved)); } catch { localStorage.clear(); }
    }
  }, []);

  const logout = () => { localStorage.clear(); setStudent(null); };

  if (!student) return <Login onLogin={setStudent} />;

  return (
    <div style={S.app}>
      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={S.sideTop}>
          {/* Brand */}
          <div style={S.brand}>
            <span style={{ fontSize: 32 }}>🎓</span>
            <div>
              <div style={S.brandName}>UniAssist AI</div>
              <div style={S.brandSub}>4hr Hackathon · Full Stack AI</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={S.nav}>
            {NAV.map(item => (
              <button key={item.id}
                style={activeTab === item.id ? { ...S.navBtn, ...S.navActive } : S.navBtn}
                onClick={() => setActiveTab(item.id)}>
                <span>{item.icon}</span> {item.label}
              </button>
            ))}
          </nav>

          {/* Tech stack info */}
          <div style={S.techCard}>
            <div style={S.techTitle}>🔧 Tech Stack</div>
            {[
              "React 18 (Frontend)",
              "Node.js + Express (Backend)",
              "MySQL (Database)",
              "ChromaDB (Vector DB)",
              "OpenAI GPT-4o-mini (LLM)",
              "text-embedding-3-small (Embeddings)",
            ].map(t => <div key={t} style={S.techItem}>• {t}</div>)}
          </div>

          {/* Security features */}
          <div style={S.secCard}>
            <div style={S.secTitle}>🔒 Security Active</div>
            {[
              "✓ JWT Authentication",
              "✓ RBAC (Role-Based Access)",
              "✓ ID + Name PII Masking",
              "✓ 15 Injection Patterns",
              "✓ Cross-Student Detection",
              "✓ Audit Logging → MySQL",
              "✓ Rate Limiting",
              "✓ CI/CD + SonarQube",
            ].map(f => <div key={f} style={S.secItem}>{f}</div>)}
          </div>
        </div>

        {/* User info */}
        <div style={S.sideBottom}>
          <div style={S.userRow}>
            <div style={S.userAvatar}>{student.name.charAt(0)}</div>
            <div>
              <div style={S.userName}>{student.name}</div>
              <div style={S.userMeta}>{student.department} · Year {student.year}</div>
              <div style={S.userRole}>Role: {student.role || "student"}</div>
            </div>
          </div>
          <button style={S.logoutBtn} onClick={logout}>🚪 Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <main style={S.main}>
        <header style={S.header}>
          <div>
            <h1 style={S.pageTitle}>
              {activeTab === "chat"      ? "💬 Ask UniAssist"          :
               activeTab === "dashboard" ? "📊 Academic Profile"        : "🛡️ Audit & Security Logs"}
            </h1>
            <p style={S.pageSub}>{PAGE_SUB[activeTab]}</p>
          </div>
          <div style={S.onlineBadge}>🟢 AI + ChromaDB + MySQL Online</div>
        </header>

        <div style={S.content}>
          {activeTab === "chat"      && <Chat />}
          {activeTab === "dashboard" && <Dashboard />}
          {activeTab === "audit"     && <AuditLogs />}
        </div>
      </main>
    </div>
  );
}

const S = {
  app:        { display:"flex", height:"100vh", fontFamily:"'Inter',sans-serif", background:"#f1f5f9" },
  sidebar:    { width:280, background:"#0f172a", display:"flex", flexDirection:"column", justifyContent:"space-between", flexShrink:0 },
  sideTop:    { padding:"20px 14px", display:"flex", flexDirection:"column", gap:16, overflowY:"auto" },
  brand:      { display:"flex", alignItems:"center", gap:10 },
  brandName:  { fontSize:15, fontWeight:700, color:"#fff" },
  brandSub:   { fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 },
  nav:        { display:"flex", flexDirection:"column", gap:4 },
  navBtn:     { display:"flex", alignItems:"center", gap:10, padding:"11px 14px", borderRadius:10, border:"none", background:"transparent", color:"rgba(255,255,255,0.65)", fontSize:13, fontWeight:500, cursor:"pointer", textAlign:"left", fontFamily:"'Inter',sans-serif" },
  navActive:  { background:"rgba(255,255,255,0.13)", color:"#fff" },
  techCard:   { background:"rgba(255,255,255,0.06)", borderRadius:12, padding:12, border:"1px solid rgba(255,255,255,0.08)" },
  techTitle:  { fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.4)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em" },
  techItem:   { fontSize:11, color:"rgba(255,255,255,0.55)", padding:"2px 0" },
  secCard:    { background:"rgba(255,255,255,0.06)", borderRadius:12, padding:12, border:"1px solid rgba(255,255,255,0.08)" },
  secTitle:   { fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.4)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em" },
  secItem:    { fontSize:11, color:"rgba(255,255,255,0.6)", padding:"2px 0" },
  sideBottom: { padding:14, borderTop:"1px solid rgba(255,255,255,0.08)" },
  userRow:    { display:"flex", alignItems:"center", gap:10, marginBottom:10 },
  userAvatar: { width:36, height:36, borderRadius:"50%", background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:"#fff", flexShrink:0 },
  userName:   { fontSize:13, fontWeight:600, color:"#fff" },
  userMeta:   { fontSize:11, color:"rgba(255,255,255,0.45)", marginTop:1 },
  userRole:   { fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:1 },
  logoutBtn:  { width:"100%", padding:10, borderRadius:8, border:"1px solid rgba(255,255,255,0.15)", background:"transparent", color:"rgba(255,255,255,0.65)", fontSize:13, cursor:"pointer", fontFamily:"'Inter',sans-serif" },
  main:       { flex:1, display:"flex", flexDirection:"column", overflow:"hidden" },
  header:     { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 26px", background:"#fff", borderBottom:"1.5px solid #e2e8f0", flexShrink:0 },
  pageTitle:  { margin:0, fontSize:20, fontWeight:700, color:"#0f172a" },
  pageSub:    { margin:"4px 0 0", fontSize:12, color:"#64748b" },
  onlineBadge:{ fontSize:11, color:"#16a34a", fontWeight:600, background:"#f0fdf4", padding:"6px 14px", borderRadius:20, border:"1px solid #bbf7d0", flexShrink:0 },
  content:    { flex:1, overflow:"hidden", display:"flex", flexDirection:"column" },
};
