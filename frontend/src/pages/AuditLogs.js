// src/pages/AuditLogs.js
import React, { useEffect, useState } from "react";
import { getAuditLogs, getChatHistory } from "../services/api";

const EVENT_COLORS = {
  INJECTION_ATTEMPT:     "#dc2626",
  CROSS_STUDENT_ACCESS:  "#dc2626",
  FAILED_LOGIN:          "#d97706",
  INVALID_TOKEN:         "#d97706",
  LOGIN_SUCCESS:         "#16a34a",
  POLICY_QUERY:          "#6d28d9",
  ATTENDANCE_QUERY:      "#2563eb",
  MARKS_QUERY:           "#0891b2",
  ATTENDANCE_CHAT_QUERY: "#2563eb",
  MARKS_CHAT_QUERY:      "#0891b2",
};

export default function AuditLogs() {
  const [secLogs,  setSecLogs]  = useState([]);
  const [chatLogs, setChatLogs] = useState([]);
  const [tab,      setTab]      = useState("security");
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([getAuditLogs(), getChatHistory()])
      .then(([a, c]) => {
        setSecLogs(a.data.logs  || []);
        setChatLogs(c.data.logs || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const logs = tab === "security" ? secLogs : chatLogs;

  return (
    <div style={S.wrap}>
      <div style={S.tabs}>
        {[["security", "🛡️ Security Events"], ["chat", "💬 Chat History"]].map(([id, label]) => (
          <button key={id}
            style={tab === id ? { ...S.tabBtn, ...S.tabActive } : S.tabBtn}
            onClick={() => setTab(id)}>{label}
            {id === "security" && secLogs.length > 0 && (
              <span style={{ ...S.badge, marginLeft: 6,
                background: secLogs.some(l => l.blocked) ? "#dc2626" : "#16a34a" }}>
                {secLogs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={S.empty}>Loading logs...</div>
      ) : logs.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <p>No {tab === "security" ? "security events" : "chat history"} yet.</p>
          <p style={{ fontSize: 12, marginTop: 8, color: "#94a3b8" }}>
            Interact with the system to generate logs.
          </p>
        </div>
      ) : (
        <div style={S.list}>
          {logs.map((log, i) => {
            const evColor = EVENT_COLORS[log.event_type || log.query_type] || "#64748b";
            return (
              <div key={i} style={S.row}>
                <div style={{
                  ...S.badge2,
                  background: evColor + "20",
                  color: evColor,
                }}>
                  {(log.event_type || log.query_type || "").replace(/_/g, " ")}
                </div>

                <div style={S.details}>
                  <div style={S.sid}>{log.student_id}</div>
                  {(log.query || log.message) && (
                    <div style={S.query}>
                      "{(log.query || log.message || "").substring(0, 90)}"
                    </div>
                  )}
                  <div style={S.meta}>
                    {tab === "chat" && log.confidence  && <span>📊 {log.confidence}</span>}
                    {tab === "chat" && log.tokens_used > 0 && <span>🪙 {log.tokens_used} tokens</span>}
                    {tab === "chat" && log.latency_ms  > 0 && <span>⏱ {log.latency_ms}ms</span>}
                    {tab === "security" && (
                      log.blocked
                        ? <span style={{ color:"#dc2626", fontWeight:700 }}>🔴 BLOCKED</span>
                        : <span style={{ color:"#16a34a", fontWeight:700 }}>🟢 ALLOWED</span>
                    )}
                  </div>
                </div>

                <div style={S.time}>
                  {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const S = {
  wrap:    { padding: 24, overflowY: "auto", height: "100%", fontFamily: "'Inter',sans-serif", display: "flex", flexDirection: "column", gap: 16 },
  tabs:    { display: "flex", gap: 8 },
  tabBtn:  { display: "flex", alignItems: "center", padding: "8px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", color: "#64748b" },
  tabActive:{ background: "#1e3a5f", color: "#fff", borderColor: "#1e3a5f" },
  badge:   { fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, color: "#fff" },
  empty:   { textAlign: "center", color: "#94a3b8", padding: 60 },
  list:    { display: "flex", flexDirection: "column", gap: 8 },
  row:     { display: "flex", alignItems: "flex-start", gap: 12, background: "#fff", borderRadius: 12, padding: "12px 16px", border: "1.5px solid #e2e8f0" },
  badge2:  { fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 20, flexShrink: 0, whiteSpace: "nowrap", marginTop: 2 },
  details: { flex: 1, minWidth: 0 },
  sid:     { fontSize: 12, fontWeight: 700, color: "#1e293b", marginBottom: 3 },
  query:   { fontSize: 12, color: "#64748b", fontStyle: "italic", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  meta:    { display: "flex", gap: 12, fontSize: 11, color: "#94a3b8" },
  time:    { fontSize: 11, color: "#94a3b8", flexShrink: 0 },
};
