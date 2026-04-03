// src/pages/Dashboard.js
import React, { useEffect, useState } from "react";
import { getProfile, getAttendance, getMarks, getStats } from "../services/api";

const GRADES = [
  ["O",  "9.0–10.0", "Outstanding"],
  ["A+", "8.0–8.9",  "Excellent"],
  ["A",  "7.0–7.9",  "Good"],
  ["B+", "6.0–6.9",  "Above Avg"],
  ["B",  "5.0–5.9",  "Average"],
  ["F",  "< 5.0",    "Fail"],
];

export default function Dashboard() {
  const [profile,    setProfile]    = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [marks,      setMarks]      = useState(null);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    Promise.all([getProfile(), getAttendance(), getMarks(), getStats()])
      .then(([p, a, m, s]) => {
        setProfile(p.data.data);
        setAttendance(a.data.data);
        setMarks(m.data.data);
        setStats(s.data.stats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={S.loading}>⏳ Loading your academic profile...</div>;

  const attColor  = attendance?.attendance_percentage >= 75 ? "#16a34a"
                  : attendance?.attendance_percentage >= 65 ? "#d97706" : "#dc2626";
  const cgpaColor = marks?.cgpa >= 8 ? "#16a34a"
                  : marks?.cgpa >= 6 ? "#d97706" : "#dc2626";

  return (
    <div style={S.wrap}>
      {/* Profile banner */}
      <div style={S.banner}>
        <div style={S.avatar}>{(profile?.name || "S").charAt(0)}</div>
        <div style={S.bannerInfo}>
          <h2 style={S.bannerName}>{profile?.name}</h2>
          <p style={S.bannerMeta}>{profile?.department} · Year {profile?.year}</p>
          <div style={S.bannerRow}>
            <span style={S.bannerTag}>
              🔒 ID: <strong>{profile?.student_id}</strong> (masked)
            </span>
            <span style={S.bannerTag}>
              👤 Role: <strong>{profile?.role || "student"}</strong>
            </span>
          </div>
        </div>
        <div style={S.jwtBadge}>JWT + RBAC Active</div>
      </div>

      {/* Stats grid */}
      <div style={S.grid}>
        <StatCard icon="📅" label="Attendance" value={`${attendance?.attendance_percentage}%`}
          color={attColor} sub={attendance?.status?.toUpperCase()} subColor={attColor} />
        <StatCard icon="📊" label="CGPA"       value={marks?.cgpa?.toFixed(2)}
          color={cgpaColor} sub={`Grade: ${marks?.grade}`} subColor={cgpaColor} />
        <StatCard icon="📈" label="Marks"      value={`${marks?.marks}/100`}
          color="#6d28d9"  sub={`${marks?.percentile}th Percentile`} subColor="#6d28d9" />
        <StatCard icon="📋" label="Backlogs"   value={marks?.active_backlogs ?? 0}
          color={marks?.active_backlogs === 0 ? "#16a34a" : "#dc2626"}
          sub={marks?.active_backlogs === 0 ? "Clean Record" : "Has Backlogs"}
          subColor={marks?.active_backlogs === 0 ? "#16a34a" : "#dc2626"} />
      </div>

      {/* Internship eligibility */}
      <div style={{
        ...S.infoCard,
        background:  marks?.internship_eligible ? "#f0fdf4" : "#fef2f2",
        borderColor: marks?.internship_eligible ? "#bbf7d0" : "#fecaca",
      }}>
        <div style={S.infoTitle}>
          {marks?.internship_eligible ? "✅ Eligible for Internship" : "❌ Not Eligible for Internship"}
        </div>
        <div style={S.infoDesc}>{marks?.internship_reason}</div>
        <div style={S.criteria}>
          <Crit label="CGPA ≥ 7.0"         met={marks?.cgpa >= 7.0}             val={marks?.cgpa} />
          <Crit label="Attendance ≥ 75%"   met={attendance?.attendance_percentage >= 75} val={`${attendance?.attendance_percentage}%`} />
          <Crit label="No Active Backlogs" met={marks?.active_backlogs === 0}    val={`${marks?.active_backlogs} backlogs`} />
        </div>
      </div>

      {/* Grading reference */}
      <div style={S.gradeCard}>
        <div style={S.gradeTitle}>📖 University Grading System (per Handbook)</div>
        <div style={S.gradeGrid}>
          {GRADES.map(([g, r, l]) => (
            <div key={g} style={{
              ...S.gradeCell,
              ...(marks?.grade === g ? S.gradeCellActive : {}),
            }}>
              <span style={S.gradeSymbol}>{g}</span>
              <span style={S.gradeRange}>{r}</span>
              <span style={S.gradeDesc}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* MySQL system stats */}
      {stats && (
        <div style={S.statsCard}>
          <div style={S.statsTitle}>📊 System Statistics (MySQL)</div>
          <div style={S.statsGrid}>
            <MiniStat icon="💬" label="Queries"      value={stats.totalQueries} />
            <MiniStat icon="🚫" label="Blocked"      value={stats.blockedAttempts} />
            <MiniStat icon="🛡️" label="Injections"   value={stats.injectionAttempts} />
            <MiniStat icon="👥" label="Students"     value={stats.totalStudents} />
            <MiniStat icon="🪙" label="Avg Tokens"   value={stats.avgTokensPerQuery} />
            <MiniStat icon="⏱" label="Avg Latency"  value={`${stats.avgLatencyMs}ms`} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, sub, subColor }) {
  return (
    <div style={SC.card}>
      <div style={SC.icon}>{icon}</div>
      <div style={{ ...SC.value, color }}>{value}</div>
      <div style={SC.label}>{label}</div>
      {sub && <div style={{ ...SC.sub, color: subColor }}>{sub}</div>}
    </div>
  );
}

function Crit({ label, met, val }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
      <span style={{ color: met ? "#16a34a" : "#dc2626", fontWeight: 700, fontSize: 16 }}>
        {met ? "✓" : "✗"}
      </span>
      <span style={{ flex: 1, fontSize: 13, color: "#374151" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: met ? "#16a34a" : "#dc2626" }}>{val}</span>
    </div>
  );
}

function MiniStat({ icon, label, value }) {
  return (
    <div style={S.miniStat}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 20, fontWeight: 700, color: "#1e3a5f" }}>{value}</span>
      <span style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

const S = {
  wrap:          { padding: 24, overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 18, fontFamily: "'Inter',sans-serif" },
  loading:       { padding: 40, textAlign: "center", color: "#64748b", fontFamily: "'Inter',sans-serif" },
  banner:        { display: "flex", alignItems: "center", gap: 18, padding: "20px 24px", background: "linear-gradient(135deg,#1e3a5f,#2d6a9f)", borderRadius: 18, color: "#fff" },
  avatar:        { width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, flexShrink: 0 },
  bannerInfo:    { flex: 1 },
  bannerName:    { margin: "0 0 3px", fontSize: 22, fontWeight: 700 },
  bannerMeta:    { margin: "0 0 6px", fontSize: 13, opacity: 0.8 },
  bannerRow:     { display: "flex", gap: 10, flexWrap: "wrap" },
  bannerTag:     { fontSize: 11, background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: 20, opacity: 0.9 },
  jwtBadge:      { fontSize: 11, background: "rgba(255,255,255,0.15)", padding: "6px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.3)", flexShrink: 0 },
  grid:          { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  infoCard:      { borderRadius: 14, padding: "14px 18px", border: "1.5px solid" },
  infoTitle:     { fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 5 },
  infoDesc:      { fontSize: 13, color: "#64748b", marginBottom: 10 },
  criteria:      { display: "flex", flexDirection: "column" },
  gradeCard:     { background: "#fff", borderRadius: 14, padding: "14px 18px", border: "1.5px solid #e2e8f0" },
  gradeTitle:    { fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 10 },
  gradeGrid:     { display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8 },
  gradeCell:     { background: "#f8fafc", borderRadius: 10, padding: "8px 4px", textAlign: "center", border: "1.5px solid #e2e8f0" },
  gradeCellActive:{ background: "#ede9fe", borderColor: "#7c3aed" },
  gradeSymbol:   { display: "block", fontSize: 16, fontWeight: 700, color: "#1e3a5f" },
  gradeRange:    { display: "block", fontSize: 9, color: "#64748b", margin: "2px 0" },
  gradeDesc:     { display: "block", fontSize: 9, color: "#94a3b8" },
  statsCard:     { background: "#fff", borderRadius: 14, padding: "14px 18px", border: "1.5px solid #e2e8f0" },
  statsTitle:    { fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 12 },
  statsGrid:     { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 },
  miniStat:      { background: "#f8fafc", borderRadius: 10, padding: 10, textAlign: "center", display: "flex", flexDirection: "column", gap: 3, alignItems: "center" },
};

const SC = {
  card:  { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: 16, textAlign: "center" },
  icon:  { fontSize: 26, marginBottom: 8 },
  value: { fontSize: 24, fontWeight: 700, marginBottom: 3 },
  label: { fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" },
  sub:   { fontSize: 11, marginTop: 3, fontWeight: 600 },
};
