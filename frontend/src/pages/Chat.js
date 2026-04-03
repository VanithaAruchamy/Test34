// src/pages/Chat.js
import React, { useState, useRef, useEffect } from "react";
import { sendChat } from "../services/api";

const SUGGESTIONS = [
  "What is the minimum attendance required for exams?",
  "What is my current attendance percentage?",
  "Show my marks and grade",
  "Am I eligible for internship?",
  "What is the exam passing criteria?",
  "Explain the condonation policy for attendance",
  "What is the grading system?",
  "What are the lab attendance rules?",
  "What is the hostel in-time policy?",
  "What is the library book limit?",
];

const QT = {
  policy:       { bg:"#ede9fe", color:"#6d28d9", icon:"📋", label:"Policy (RAG)" },
  attendance:   { bg:"#dbeafe", color:"#1d4ed8", icon:"📅", label:"Attendance" },
  marks:        { bg:"#fef3c7", color:"#92400e", icon:"📊", label:"Marks" },
  personal_data:{ bg:"#f0fdf4", color:"#166534", icon:"👤", label:"Personal" },
  blocked:      { bg:"#fef2f2", color:"#dc2626", icon:"🚫", label:"Blocked" },
  unauthorized: { bg:"#fff7ed", color:"#92400e", icon:"🔒", label:"Unauthorized" },
};

const CONF = { high:"#16a34a", medium:"#d97706", low:"#dc2626" };
const CONFP = { high:"90%", medium:"55%", low:"25%" };

export default function Chat() {
  const [messages, setMessages] = useState([{
    id: 1, role: "assistant", queryType: "welcome", time: new Date(),
    text: "👋 Hi! I'm your University AI Assistant.\n\nI can help you with:\n• 📋 University policies — grounded in official documents with citations\n• 📅 Your attendance status with eligibility check\n• 📊 Your marks, grade (O/A+/A/B+/B/F) and percentile\n• ✅ Internship eligibility based on CGPA, attendance & backlogs\n\nAll policy answers include citations and confidence scores. Try asking something!",
  }]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(p => [...p, { id: Date.now(), role: "user", text: msg, time: new Date() }]);
    setLoading(true);
    try {
      const res = await sendChat(msg);
      const d   = res.data;
      setMessages(p => [...p, {
        id: Date.now() + 1, role: "assistant",
        text: d.answer, queryType: d.query_type,
        citations: d.citations, confidence: d.confidence,
        tokensUsed: d.tokens_used, latencyMs: d.latency_ms,
        data: d.data, time: new Date(),
      }]);
    } catch (err) {
      const d = err.response?.data || {};
      setMessages(p => [...p, {
        id: Date.now() + 1, role: "assistant",
        text: d.error || "Something went wrong.",
        queryType: d.query_type || "blocked",
        errorType: d.error_type, time: new Date(),
        requestedStudent: d.requested_student,
        authenticatedStudent: d.authenticated_student,
      }]);
    } finally { setLoading(false); inputRef.current?.focus(); }
  };

  return (
    <div style={S.wrap}>
      <div style={S.messages}>
        {messages.map(m => <Bubble key={m.id} msg={m} />)}
        {loading && <TypingDots />}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 2 && (
        <div style={S.sugWrap}>
          <p style={S.sugLabel}>Try asking:</p>
          <div style={S.chips}>
            {SUGGESTIONS.map(s => (
              <button key={s} style={S.chip} onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        </div>
      )}

      <div style={S.inputRow}>
        <textarea ref={inputRef} style={S.textarea} rows={1}
          disabled={loading}
          placeholder="Ask about policies, attendance, marks, eligibility..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }}}
        />
        <button
          style={loading || !input.trim() ? { ...S.sendBtn, opacity: 0.4 } : S.sendBtn}
          disabled={loading || !input.trim()}
          onClick={() => send()}>➤</button>
      </div>
    </div>
  );
}

function Bubble({ msg }) {
  const isUser    = msg.role === "user";
  const qt        = QT[msg.queryType] || QT.policy;
  const isBlocked = ["blocked", "unauthorized"].includes(msg.queryType);

  return (
    <div style={{ ...S.row, justifyContent: isUser ? "flex-end" : "flex-start" }}>
      {!isUser && <div style={S.botAvatar}>🎓</div>}
      <div style={{
        ...S.bubble,
        ...(isUser ? S.userBubble : S.botBubble),
        ...(isBlocked ? S.blockedBubble : {}),
      }}>
        {/* Query type badge */}
        {!isUser && msg.queryType && msg.queryType !== "welcome" && (
          <div style={{ ...S.typeBadge, background: qt.bg, color: qt.color }}>
            {qt.icon} {qt.label}
          </div>
        )}

        {/* Error type badge */}
        {msg.errorType && (
          <div style={S.errBadge}>🚫 {msg.errorType}</div>
        )}

        {/* Personal data card */}
        {msg.data && !isBlocked && (
          <div style={S.dataCard}>
            {msg.data.attendance_percentage !== undefined && (
              <>
                <DataRow label="📅 Attendance"
                  value={`${msg.data.attendance_percentage}%`}
                  color={msg.data.attendance_percentage >= 75 ? "#16a34a" : "#dc2626"} />
                <DataRow label="✅ Status"
                  value={msg.data.status}
                  color={msg.data.status === "eligible" ? "#16a34a" : "#dc2626"} />
              </>
            )}
            {msg.data.marks !== undefined && (
              <>
                <DataRow label="📊 Marks"      value={`${msg.data.marks}/100`}  color="#6d28d9" />
                <DataRow label="🏅 Grade"      value={msg.data.grade}           color="#6d28d9" />
                <DataRow label="📈 Percentile" value={`${msg.data.percentile}th`} color="#6d28d9" />
                <DataRow label="📋 Backlogs"   value={msg.data.active_backlogs}
                  color={msg.data.active_backlogs === 0 ? "#16a34a" : "#dc2626"} />
              </>
            )}
            {(msg.data.student_id || msg.data.name) && (
              <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 6, paddingTop: 6 }}>
                {msg.data.student_id && <DataRow label="🔒 ID" value={msg.data.student_id} color="#94a3b8" />}
                {msg.data.name       && <DataRow label="👤 Name" value={msg.data.name}     color="#94a3b8" />}
              </div>
            )}
          </div>
        )}

        {/* Unauthorized info */}
        {(msg.requestedStudent || msg.authenticatedStudent) && (
          <div style={{ ...S.dataCard, background: "#fff7ed" }}>
            <DataRow label="🔍 Requested"     value={msg.requestedStudent}     color="#dc2626" />
            <DataRow label="🔑 Authenticated" value={msg.authenticatedStudent} color="#16a34a" />
          </div>
        )}

        {/* Answer text */}
        <p style={{ ...S.text, color: isUser ? "#fff" : "#1e293b" }}>{msg.text}</p>

        {/* Citations */}
        {msg.citations?.length > 0 && (
          <div style={S.citBox}>
            <div style={S.citTitle}>📎 Citations</div>
            {msg.citations.map((c, i) => <div key={i} style={S.citItem}>• {c}</div>)}
          </div>
        )}

        {/* Meta: confidence + tokens + latency */}
        {!isUser && msg.confidence && (
          <div style={S.metaRow}>
            <div style={S.metaItem}>
              <span style={S.metaLabel}>Confidence</span>
              <div style={S.confTrack}>
                <div style={{
                  ...S.confFill,
                  width: CONFP[msg.confidence] || "30%",
                  background: CONF[msg.confidence] || "#94a3b8",
                }} />
              </div>
              <span style={{ ...S.metaVal, color: CONF[msg.confidence] }}>
                {msg.confidence}
              </span>
            </div>
            {msg.tokensUsed > 0 && <span style={S.pill}>🪙 {msg.tokensUsed} tokens</span>}
            {msg.latencyMs  > 0 && <span style={S.pill}>⏱ {msg.latencyMs}ms</span>}
          </div>
        )}

        <div style={{ ...S.time, textAlign: isUser ? "right" : "left" }}>
          {msg.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

function DataRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <span style={{ fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ ...S.row, justifyContent: "flex-start" }}>
      <div style={S.botAvatar}>🎓</div>
      <div style={{ ...S.bubble, ...S.botBubble }}>
        <div style={{ display: "flex", gap: 4 }}>
          {[0, 0.2, 0.4].map((d, i) => (
            <span key={i} style={{
              width: 8, height: 8, borderRadius: "50%", background: "#94a3b8",
              display: "inline-block", animation: `bounce 1s ${d}s infinite`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

const S = {
  wrap:         { display: "flex", flexDirection: "column", height: "100%", background: "#f8fafc" },
  messages:     { flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 },
  row:          { display: "flex", alignItems: "flex-end", gap: 8 },
  botAvatar:    { fontSize: 20, flexShrink: 0, marginBottom: 4 },
  bubble:       { maxWidth: "78%", borderRadius: 16, padding: "12px 16px", wordBreak: "break-word" },
  userBubble:   { background: "linear-gradient(135deg,#1e3a5f,#2d6a9f)", borderBottomRightRadius: 4 },
  botBubble:    { background: "#fff", border: "1.5px solid #e2e8f0", borderBottomLeftRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  blockedBubble:{ background: "#fef2f2", border: "1.5px solid #fecaca" },
  typeBadge:    { fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, marginBottom: 8, display: "inline-block" },
  errBadge:     { fontSize: 11, fontWeight: 700, color: "#dc2626", marginBottom: 6 },
  dataCard:     { background: "#f0f9ff", borderRadius: 10, padding: "10px 12px", marginBottom: 10, border: "1px solid #bae6fd" },
  text:         { margin: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" },
  citBox:       { marginTop: 10, background: "#faf5ff", borderRadius: 8, padding: "8px 12px", border: "1px solid #e9d5ff" },
  citTitle:     { fontSize: 11, fontWeight: 700, color: "#6d28d9", marginBottom: 4 },
  citItem:      { fontSize: 12, color: "#374151", padding: "2px 0" },
  metaRow:      { display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" },
  metaItem:     { display: "flex", alignItems: "center", gap: 6 },
  metaLabel:    { fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" },
  confTrack:    { width: 60, height: 4, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" },
  confFill:     { height: "100%", borderRadius: 4 },
  metaVal:      { fontSize: 11, fontWeight: 700 },
  pill:         { fontSize: 10, background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: 12, fontWeight: 600 },
  time:         { fontSize: 10, color: "#94a3b8", marginTop: 6 },
  sugWrap:      { padding: "0 16px 12px" },
  sugLabel:     { fontSize: 11, color: "#94a3b8", margin: "0 0 8px", fontWeight: 600, textTransform: "uppercase" },
  chips:        { display: "flex", flexWrap: "wrap", gap: 6 },
  chip:         { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 20, padding: "6px 12px", fontSize: 12, cursor: "pointer", color: "#374151", fontFamily: "'Inter',sans-serif" },
  inputRow:     { display: "flex", gap: 10, padding: "12px 16px", background: "#fff", borderTop: "1.5px solid #e2e8f0", alignItems: "flex-end" },
  textarea:     { flex: 1, padding: "12px 16px", borderRadius: 12, border: "1.5px solid #e2e8f0", fontSize: 14, resize: "none", outline: "none", fontFamily: "'Inter',sans-serif", lineHeight: 1.5, maxHeight: 120 },
  sendBtn:      { width: 44, height: 44, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#1e3a5f,#2d6a9f)", color: "#fff", fontSize: 18, cursor: "pointer", flexShrink: 0 },
};
