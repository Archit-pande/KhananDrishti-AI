import { useState } from "react";
import { BrainCircuit, Map, Send, Sparkles } from "lucide-react";
import { api } from "./services/api";

export default function KhananDrishtiAssistant({ records = [], setPage }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "hello. i'm khanandrishti ai. ask me about mine risk, overdue actions, anomalies, recurring violations, compliance or field reporting." }
  ]);

  const send = async (value = input) => {
    const question = value.trim();
    if (!question || busy) return;
    setMessages((current) => [...current, { from: "user", text: question }]);
    setInput("");
    setBusy(true);
    try {
      const result = await api.askAI(question);
      if (question.toLowerCase().includes("gis") || question.toLowerCase().includes("map")) setPage("map");
      if (question.toLowerCase().includes("field report") || question.toLowerCase().includes("inspection")) setPage("report");
      setMessages((current) => [...current, { from: "bot", text: result.answer || "i could not produce an answer from the current governance data." }]);
    } catch (error) {
      const q = question.toLowerCase();
      const openRecords = records.filter((record) => !["Resolved", "Closed"].includes(record.status));
      let fallback = `i'm connected to ${openRecords.length} open governance record(s).`;
      if (q.includes("risk")) fallback = `the current dataset has ${openRecords.filter((r) => (r.riskScore || 0) >= 75).length} open high-risk record(s).`;
      if (q.includes("critical")) fallback = `there are ${openRecords.filter((r) => r.priority === "Critical").length} open critical record(s).`;
      setMessages((current) => [...current, { from: "bot", text: `${fallback} the live ai endpoint is currently unavailable.` }]);
    } finally {
      setBusy(false);
    }
  };

  return <>
    {open && <div className="assistant">
      <div className="assistant-head"><div><strong><BrainCircuit size={16} /> KhananDrishti AI</strong><span>governance copilot</span></div><button onClick={() => setOpen(false)}>×</button></div>
      <div className="assistant-messages">{messages.map((message, index) => <div key={index} className={`assistant-message ${message.from}`}>{message.text}</div>)}{busy && <div className="assistant-message bot">analyzing governance signals…</div>}</div>
      <div className="assistant-actions"><button onClick={() => send("what are the highest risk records?")}><Sparkles size={12} /> top risks</button><button onClick={() => send("show recurring violations")}><BrainCircuit size={12} /> patterns</button><button onClick={() => send("show the gis map")}><Map size={12} /> gis</button></div>
      <div className="assistant-input"><input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask KhananDrishti AI…" /><button onClick={() => send()} disabled={busy}><Send size={15} /></button></div>
    </div>}
    <button className="assistant-fab" onClick={() => setOpen((value) => !value)} aria-label="Open KhananDrishti AI assistant"><BrainCircuit size={21} /></button>
  </>;
}
