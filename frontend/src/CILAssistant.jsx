import { useState } from "react";

export default function CILAssistant({ records = [], setPage }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([{ from: "bot", text: "hello. i'm the Coal India Limited governance assistant. ask me about risks, compliance, mines, statuses or field reporting." }]);

  const reply = (question) => {
    const q = question.toLowerCase();
    const unresolved = records.filter((record) => !["Resolved", "Closed"].includes(record.status));
    const critical = unresolved.filter((record) => record.priority === "Critical");
    const highRisk = unresolved.filter((record) => (record.riskScore || 0) >= 75);
    const compliance = records.filter((record) => record.category === "Compliance");
    const mineNames = [...new Set(records.map((record) => record.mineName).filter(Boolean))];

    if (q.includes("report") || q.includes("inspection") || q.includes("field")) {
      setPage("report");
      return "the field reporting page captures mine, zone, record type, priority, gps, evidence and corrective-action details.";
    }
    if (q.includes("map") || q.includes("gis") || q.includes("location")) {
      setPage("map");
      return "opening the live gis view. it shows the geo-tagged governance records currently loaded in the system.";
    }
    if (q.includes("critical")) return `there are ${critical.length} critical open record(s).`;
    if (q.includes("risk")) return `there are ${highRisk.length} open record(s) at or above the current high-risk threshold.`;
    if (q.includes("compliance")) return `the dataset contains ${compliance.length} compliance record(s). the dashboard also calculates a compliance rate from closed compliance records.`;
    if (q.includes("mine")) return `the current dataset covers ${mineNames.length} mine(s): ${mineNames.join(", ") || "none"}.`;
    if (q.includes("resolved") || q.includes("closed")) return `${records.filter((record) => ["Resolved", "Closed"].includes(record.status)).length} record(s) are resolved or closed.`;
    if (q.includes("status") || q.includes("progress")) return `${unresolved.length} record(s) remain open, including ${records.filter((record) => record.status === "In Progress").length} in progress.`;
    if (q.includes("how many") || q.includes("total") || q.includes("records")) return `Coal India Limited currently has ${records.length} governance record(s) in the loaded dataset.`;
    if (q.includes("hello") || q.includes("hi") || q.includes("hey")) return "hello. i can help with field reporting, gis, compliance, mine coverage, risk and workflow status.";
    return "try asking: how many critical alerts are open? show the gis map. how many compliance records are there? or help me create a field report.";
  };

  const send = (value = input) => {
    const question = value.trim();
    if (!question) return;
    setMessages((current) => [...current, { from: "user", text: question }, { from: "bot", text: reply(question) }]);
    setInput("");
  };

  return <>{open && <div className="assistant"><div className="assistant-head"><div><strong>Coal India Limited Assistant</strong><span>governance helper</span></div><button onClick={() => setOpen(false)}>×</button></div><div className="assistant-messages">{messages.map((message, index) => <div key={index} className={`assistant-message ${message.from}`}>{message.text}</div>)}</div><div className="assistant-actions"><button onClick={() => send("show the gis map")}>🗺️ GIS</button><button onClick={() => send("how many critical alerts are open?")}>🚨 Risks</button><button onClick={() => send("help me create a field report")}>📝 Field report</button></div><div className="assistant-input"><input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask about mine governance..." /><button onClick={() => send()}>→</button></div></div>}<button className="assistant-fab" onClick={() => setOpen((value) => !value)} aria-label="Open Coal India Limited Assistant">{open ? "×" : "💬"}</button></>;
}
