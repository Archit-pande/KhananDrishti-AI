import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  CloudOff,
  FileText,
  Gauge,
  FileDown,
  Landmark,
  LogOut,
  MapPin,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  Upload,
  X,
  Zap,
  BrainCircuit,
  Bot,
  TrendingUp,
  ShieldAlert,
  Sparkles
} from "lucide-react";
import KhananDrishtiMap from "./KhananDrishtiMap";
import KhananDrishtiAssistant from "./KhananDrishtiAssistant";
import { api } from "./services/api";
import "./App.css";

const demoRecords = [
  {
    id: "KDAI-26002",
    mineId: "MINE-001",
    mineName: "Central Coal Mine",
    subsidiary: "Central Coal Subsidiary",
    zone: "North Mining Block",
    recordType: "Compliance Violation",
    title: "Environmental inspection overdue",
    description: "The scheduled environmental inspection was not completed within the required compliance period.",
    category: "Compliance",
    priority: "Critical",
    status: "Reported",
    riskScore: 98,
    location: "North Mining Block",
    lat: 23.6523,
    lng: 82.6948,
    reportedBy: "Compliance Officer",
    assignedTo: "Environment Manager"
  },
  {
    id: "KDAI-26001",
    mineId: "MINE-001",
    mineName: "Central Coal Mine",
    subsidiary: "Central Coal Subsidiary",
    zone: "Mine Zone A",
    recordType: "Safety Observation",
    title: "Safety helmet compliance gap",
    description: "Several workers were observed without mandatory safety helmets in the active mining zone.",
    category: "Safety",
    priority: "High",
    status: "In Progress",
    riskScore: 78,
    location: "Mine Zone A",
    lat: 23.6501,
    lng: 82.6902,
    reportedBy: "Field Safety Officer",
    assignedTo: "Mine Safety Manager"
  },
  {
    id: "KDAI-26004",
    mineId: "MINE-002",
    mineName: "Eastern Open Cast Mine",
    subsidiary: "Eastern Coal Subsidiary",
    zone: "Open Cast Pit 1",
    recordType: "Environmental Alert",
    title: "Dust level above monitoring threshold",
    description: "Dust monitoring indicates levels above the configured operational threshold in the active excavation area.",
    category: "Environment",
    priority: "High",
    status: "Reported",
    riskScore: 86,
    location: "Open Cast Pit 1",
    lat: 23.6561,
    lng: 82.7032,
    reportedBy: "Environmental Officer",
    assignedTo: "Environment Manager"
  }
];

const roleLabels = {
  field_officer: "Field Officer",
  mine_official: "Mine Official",
  corporate_manager: "Corporate Manager",
  regulator: "Regulatory Reviewer",
  admin: "Administrator"
};

const statusOrder = ["Reported", "Pending", "Verified", "Assigned", "In Progress", "Resolved", "Closed"];

const categoryIcons = {
  Safety: "🦺",
  Environment: "🌿",
  Compliance: "📋",
  Production: "⛏️",
  Equipment: "⚙️",
  Labour: "👷",
  Contractor: "🏗️",
  Grievance: "🗣️",
  Other: "⚠️"
};

function roleCanManage(role) {
  return ["field_officer", "mine_official", "corporate_manager", "regulator", "admin"].includes(role);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function App() {
  const [page, setPage] = useState("home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("khanandrishti-ai-theme") || "dark");
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("khanandrishti-ai-user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [records, setRecords] = useState(demoRecords);
  const [stats, setStats] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [apiError, setApiError] = useState("");
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("khanandrishti-ai-theme", theme);
  }, [theme]);

  useEffect(() => {
    const onlineHandler = () => setOnline(true);
    const offlineHandler = () => setOnline(false);
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, []);

  const refreshData = async () => {
    const results = await Promise.allSettled([api.getIssues(), api.getStats(), api.getAIInsights()]);
    const [issueResult, statResult, aiResult] = results;
    let hadCoreError = false;
    if (issueResult.status === "fulfilled" && Array.isArray(issueResult.value)) setRecords(issueResult.value);
    else hadCoreError = true;
    if (statResult.status === "fulfilled" && statResult.value) setStats(statResult.value);
    if (aiResult.status === "fulfilled" && aiResult.value) setAiInsights(aiResult.value);
    if (!hadCoreError) setApiError("");
    else setApiError(online ? issueResult.reason?.message || "Unable to reach the governance backend." : "You are offline. Showing the cached governance view.");
  };

  useEffect(() => {
    refreshData();
  }, [online]);

  useEffect(() => {
    const rawQueue = localStorage.getItem("khanandrishti-ai-offline-queue");
    if (!online || !rawQueue || !user) return;
    let queue;
    try {
      queue = JSON.parse(rawQueue);
    } catch {
      queue = [];
    }
    if (!Array.isArray(queue) || queue.length === 0) return;

    const sync = async () => {
      const remaining = [];
      for (const item of queue) {
        try {
          await api.createIssue(item);
        } catch {
          remaining.push(item);
        }
      }
      localStorage.setItem("khanandrishti-ai-offline-queue", JSON.stringify(remaining));
      if (remaining.length !== queue.length) refreshData();
    };

    sync().catch(() => {});
  }, [online, user]);

  const login = (payload) => {
    const nextUser = {
      id: payload.user.id,
      name: payload.user.name,
      email: payload.user.email,
      role: payload.user.role,
      subsidiary: payload.user.subsidiary || "",
      assignedMines: payload.user.assignedMines || []
    };
    localStorage.setItem("khanandrishti-ai-token", payload.token);
    localStorage.setItem("khanandrishti-ai-user", JSON.stringify(nextUser));
    setUser(nextUser);
    setPage(roleCanManage(nextUser.role) ? "governance" : "dashboard");
  };

  const logout = () => {
    localStorage.removeItem("khanandrishti-ai-token");
    localStorage.removeItem("khanandrishti-ai-user");
    setUser(null);
    setSelectedRecord(null);
    setPage("home");
  };

  const openRecord = (record) => {
    setSelectedRecord(record);
    setPage("track");
  };

  const addRecord = async (record) => {
    const optimistic = { ...record, id: record.id || `KDAI-${Date.now().toString().slice(-6)}` };
    setRecords((current) => [optimistic, ...current]);
    setSelectedRecord(optimistic);
    setPage("track");

    if (!online) {
      const queue = JSON.parse(localStorage.getItem("khanandrishti-ai-offline-queue") || "[]");
      queue.push(optimistic);
      localStorage.setItem("khanandrishti-ai-offline-queue", JSON.stringify(queue));
      setApiError("Record saved locally and queued for sync when connection returns.");
      return;
    }

    try {
      const saved = await api.createIssue(optimistic);
      setRecords((current) => current.map((item) => item.id === optimistic.id ? saved : item));
      setSelectedRecord(saved);
      setApiError("");
      const [statData, intelligence] = await Promise.all([api.getStats(), api.getAIInsights()]);
      setStats(statData);
      setAiInsights(intelligence);
    } catch (error) {
      setApiError(error?.message || "Record could not be saved to the backend.");
    }
  };

  const updateStatus = async (id, status) => {
    const previous = records;
    setRecords((current) => current.map((record) => record.id === id ? { ...record, status } : record));
    setSelectedRecord((current) => current && current.id === id ? { ...current, status } : current);
    try {
      const updated = await api.updateIssue(id, { status });
      setRecords((current) => current.map((record) => record.id === id ? updated : record));
      setSelectedRecord((current) => current && current.id === id ? updated : current);
      const [statData, intelligence] = await Promise.all([api.getStats(), api.getAIInsights()]);
      setStats(statData);
      setAiInsights(intelligence);
      setApiError("");
    } catch (error) {
      setRecords(previous);
      setApiError(error?.message || "Status update failed.");
    }
  };

  const navigate = (next) => {
    setPage(next);
    setMobileOpen(false);
  };

  return (
    <div className="app-shell">
      <nav className="topbar">
        <button className="brand" onClick={() => navigate("home")} aria-label="KhananDrishti AI home">
          <img src="/khanandrishti-ai-logo.png" alt="KhananDrishti AI" />
        </button>

        <div className={`nav-links ${mobileOpen ? "open" : ""}`}>
          <button onClick={() => navigate("home")}>Overview</button>
          <button onClick={() => navigate("dashboard")}>Dashboard</button>
          <button onClick={() => navigate("ai")}>AI Command Center</button>
          <button onClick={() => navigate("report")}>Field Report</button>
          <button onClick={() => navigate("map")}>Live GIS</button>
          {roleCanManage(user?.role) && <button onClick={() => navigate("governance")}>Governance</button>}
        </div>

        <div className="topbar-actions">
          <span className={`connection-pill ${online ? "online" : "offline"}`}>
            {online ? <Zap size={13} /> : <CloudOff size={13} />} {online ? "Online" : "Offline"}
          </span>
          <button className="icon-btn" onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")} aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          {user ? (
            <button className="user-btn" onClick={logout} title="Logout">
              <span>{user.name?.slice(0, 1).toUpperCase() || "U"}</span>
              <span className="user-name">{user.name}</span>
              <LogOut size={15} />
            </button>
          ) : (
            <button className="login-btn" onClick={() => navigate("login")}>Sign in</button>
          )}
          <button className="mobile-menu" onClick={() => setMobileOpen((value) => !value)} aria-label="Menu">
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {apiError && <div className="notice"><AlertTriangle size={15} /> {apiError}</div>}

      {page === "home" && <Home records={records} stats={stats} setPage={navigate} openRecord={openRecord} />}
      {page === "login" && <Login onLogin={login} setPage={navigate} />}
      {page === "dashboard" && <OperationsDashboard user={user} records={records} stats={stats} setPage={navigate} openRecord={openRecord} />}
      {page === "ai" && <AICommandCenter insights={aiInsights} records={records} setPage={navigate} openRecord={openRecord} />}
      {page === "report" && <ReportForm user={user} records={records} addRecord={addRecord} setPage={navigate} />}
      {page === "track" && <TrackRecord record={selectedRecord || records[0]} setPage={navigate} />}
      {page === "map" && <KhananDrishtiMap records={records} theme={theme} />}
      {page === "governance" && roleCanManage(user?.role) && <GovernanceDashboard records={records} user={user} stats={stats} updateStatus={updateStatus} openRecord={openRecord} />}
      {page === "governance" && !roleCanManage(user?.role) && <OperationsDashboard user={user} records={records} stats={stats} setPage={navigate} openRecord={openRecord} />}

      <footer className="footer">
        <div>
          <img src="/khanandrishti-ai-logo.png" alt="KhananDrishti AI" className="footer-logo" />
          <p>AI-ready governance for safer, more transparent coal mine operations.</p>
        </div>
        <div className="footer-meta">
          <span>SIH26024</span>
          <span>Smart Automation</span>
          <span>Software</span>
        </div>
      </footer>

      <KhananDrishtiAssistant records={records} setPage={navigate} />
    </div>
  );
}

function Home({ records, stats, setPage, openRecord }) {
  const total = stats?.total ?? records.length;
  const open = stats?.open ?? records.filter((r) => !["Resolved", "Closed"].includes(r.status)).length;
  const critical = stats?.critical ?? records.filter((r) => r.priority === "Critical" && !["Resolved", "Closed"].includes(r.status)).length;
  const mines = stats?.mines ?? new Set(records.map((r) => r.mineId).filter(Boolean)).size;
  const compliance = stats?.complianceRate ?? 100;

  return (
    <main>
      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow"><ShieldCheck size={15} /> SMART COAL MINE GOVERNANCE</span>
          <h1>One governance layer for every mine, inspection and compliance action.</h1>
          <p>KhananDrishti AI brings statutory compliance, field inspections, safety observations, contractor workflows and operational signals into one digital control plane.</p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={() => setPage("report")}>Start a field report <ArrowRight size={17} /></button>
            <button className="secondary-btn" onClick={() => setPage("map")}>Open live GIS <MapPin size={17} /></button>
          </div>
          <div className="hero-points">
            <span><CheckCircle2 size={15} /> geo-tagged</span>
            <span><CheckCircle2 size={15} /> auditable</span>
            <span><CheckCircle2 size={15} /> offline-ready</span>
          </div>
        </div>
        <div className="hero-panel">
          <div className="panel-head"><span>COMMAND SNAPSHOT</span><span className="live-dot">LIVE</span></div>
          <div className="hero-metrics">
            <MetricCard icon={<Landmark />} value={mines} label="Mines monitored" />
            <MetricCard icon={<FileText />} value={total} label="Governance records" />
            <MetricCard icon={<AlertTriangle />} value={critical} label="Critical alerts" />
            <MetricCard icon={<Gauge />} value={`${compliance}%`} label="Compliance rate" />
          </div>
          <div className="risk-strip">
            <div><span>open actions</span><strong>{open}</strong></div>
            <div><span>high-risk queue</span><strong>{stats?.highRisk ?? records.filter((r) => (r.riskScore || 0) >= 75 && !["Resolved", "Closed"].includes(r.status)).length}</strong></div>
            <div><span>overdue</span><strong>{stats?.overdue ?? 0}</strong></div>
          </div>
        </div>
      </section>

      <section className="ai-spotlight">
        <div className="ai-spotlight-icon"><BrainCircuit size={28} /></div>
        <div><span className="eyebrow">KHANANDRISHTI AI ENGINE</span><h2>From raw mine records to explainable decisions.</h2><p>Predictive risk ranking, recurring-pattern detection, anomaly signals and an AI copilot are built into the governance workflow.</p></div>
        <button className="primary-btn" onClick={() => setPage("ai")}>Open AI Command Center <Sparkles size={16} /></button>
      </section>

      <section className="section-block">
        <div className="section-head">
          <div><span className="eyebrow">PRIORITY QUEUE</span><h2>Records that need attention</h2></div>
          <div className="section-head-actions"><button className="ghost-btn" onClick={() => setPage("governance")}>Open governance console <ArrowRight size={15} /></button></div>
        </div>
        <div className="record-grid">
          {records.slice(0, 3).map((record) => <RecordCard key={record.id} record={record} openRecord={openRecord} />)}
        </div>
      </section>

      <section className="section-block feature-section">
        <div className="feature-card"><span>01</span><ShieldCheck /><h3>AI compliance intelligence</h3><p>Turn compliance history into risk signals, escalation priorities and explainable recommendations.</p></div>
        <div className="feature-card"><span>02</span><MapPin /><h3>Field-first reporting</h3><p>Capture location, evidence, observations and status from the mine site, including an offline queue.</p></div>
        <div className="feature-card"><span>03</span><BarChart3 /><h3>Predictive AI oversight</h3><p>Detect risk patterns, anomalies, recurring failures and due-date pressure with explainable AI signals.</p></div>
      </section>
    </main>
  );
}

function OperationsDashboard({ user, records, stats, setPage, openRecord }) {
  const mineRecords = useMemo(() => {
    if (!user?.assignedMines?.length) return records;
    return records.filter((record) => user.assignedMines.includes(record.mineId) || user.role === "field_officer");
  }, [records, user]);

  const pending = mineRecords.filter((r) => ["Reported", "Pending", "Verified", "Assigned"].includes(r.status)).length;
  const active = mineRecords.filter((r) => r.status === "In Progress").length;
  const resolved = mineRecords.filter((r) => ["Resolved", "Closed"].includes(r.status)).length;
  const highRisk = mineRecords.filter((r) => (r.riskScore || 0) >= 75 && !["Resolved", "Closed"].includes(r.status)).length;

  return (
    <main className="page-wrap">
      <section className="page-heading">
        <div><span className="eyebrow">{roleLabels[user?.role] || "OPERATIONS PORTAL"}</span><h1>Mine operations dashboard</h1><p>{user ? `Welcome, ${user.name}. Review field activity, compliance and risk signals.` : "Explore the demo governance dashboard."}</p></div>
        <button className="primary-btn" onClick={() => setPage("report")}>+ New field report</button>
      </section>

      <section className="stats-row">
        <DashboardStat icon={<ClipboardCheck />} label="Pending verification" value={pending} />
        <DashboardStat icon={<Activity />} label="In progress" value={active} />
        <DashboardStat icon={<CheckCircle2 />} label="Resolved / closed" value={resolved} />
        <DashboardStat icon={<AlertTriangle />} label="High-risk records" value={highRisk} />
      </section>

      <section className="content-grid">
        <div className="data-card">
          <div className="card-head"><div><span className="eyebrow">FIELD ACTIVITY</span><h2>Recent records</h2></div><button className="ghost-btn" onClick={() => setPage("map")}>View GIS <MapPin size={15} /></button></div>
          <div className="record-list">
            {mineRecords.slice(0, 8).map((record) => (
              <button className="record-row" key={record.id} onClick={() => openRecord(record)}>
                <div className="record-icon">{categoryIcons[record.category] || "⚠️"}</div>
                <div className="record-main"><div className="record-title"><strong>{record.title}</strong><span className={`status-pill ${record.status.toLowerCase().replace(/\s+/g, "-")}`}>{record.status}</span></div><p>{record.mineName} · {record.zone}</p></div>
                <div className="record-risk"><span>risk</span><strong>{record.riskScore ?? 0}</strong></div>
              </button>
            ))}
          </div>
        </div>
        <div className="data-card insights-card">
          <div className="card-head"><div><span className="eyebrow">ANALYTICS</span><h2>Governance signals</h2></div></div>
          <div className="insight-item"><span className="insight-icon red">!</span><div><strong>{stats?.critical ?? mineRecords.filter((r) => r.priority === "Critical").length} critical alerts</strong><p>Require active review or escalation.</p></div></div>
          <div className="insight-item"><span className="insight-icon amber">◐</span><div><strong>{stats?.overdue ?? 0} overdue actions</strong><p>Due dates have passed without closure.</p></div></div>
          <div className="insight-item"><span className="insight-icon green">✓</span><div><strong>{stats?.complianceRate ?? 100}% compliance rate</strong><p>Based on closed compliance records.</p></div></div>
          <button className="secondary-btn full-btn" onClick={() => setPage("governance")}>Open governance console</button>
        </div>
      </section>
    </main>
  );
}

function GovernanceDashboard({ records, user, stats, updateStatus, openRecord }) {
  const [filter, setFilter] = useState("");
  const [mineFilter, setMineFilter] = useState("");
  const mines = [...new Map(records.map((r) => [r.mineId, r])).values()];
  const filtered = records.filter((record) => {
    const haystack = `${record.id} ${record.title} ${record.category} ${record.recordType} ${record.mineName} ${record.zone}`.toLowerCase();
    return (!filter || haystack.includes(filter.toLowerCase())) && (!mineFilter || record.mineId === mineFilter);
  });

  const exportCsv = () => {
    const headers = ["Record ID", "Mine", "Zone", "Record Type", "Category", "Priority", "Status", "Risk Score", "Due Date", "Assigned To"];
    const rows = filtered.map((record) => [
      record.id, record.mineName, record.zone, record.recordType, record.category, record.priority, record.status, record.riskScore ?? 0, formatDate(record.dueDate), record.assignedTo || ""
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "khanandrishti-ai-governance-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="page-wrap">
      <section className="page-heading">
        <div><span className="eyebrow">GOVERNANCE CONSOLE · {roleLabels[user?.role] || "OFFICIAL"}</span><h1>Compliance & operations control</h1><p>Monitor records across mines, subsidiaries, contractors and field activity.</p></div>
        <div className="heading-actions"><div className="heading-badge"><Gauge size={16} /><strong>{stats?.complianceRate ?? 100}%</strong><span>compliance rate</span></div><button className="secondary-btn" onClick={exportCsv}><FileDown size={15} /> Export report</button></div>
      </section>

      <section className="stats-row">
        <DashboardStat icon={<FileText />} label="All records" value={stats?.total ?? records.length} />
        <DashboardStat icon={<AlertTriangle />} label="Critical open" value={stats?.critical ?? 0} />
        <DashboardStat icon={<Activity />} label="High-risk open" value={stats?.highRisk ?? 0} />
        <DashboardStat icon={<Landmark />} label="Mines monitored" value={stats?.mines ?? new Set(records.map((r) => r.mineId)).size} />
      </section>

      <section className="data-card">
        <div className="toolbar"><div className="search-wrap"><Search size={16} /><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search title, category, mine..." /></div><select value={mineFilter} onChange={(e) => setMineFilter(e.target.value)}><option value="">All mines</option>{mines.map((record) => <option key={record.mineId} value={record.mineId}>{record.mineName}</option>)}</select></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Record</th><th>Mine / Zone</th><th>Category</th><th>Risk</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.id}>
                  <td><strong>{record.id}</strong><span>{record.title}</span></td>
                  <td><span>{record.mineName}</span><small>{record.zone}</small></td>
                  <td>{record.category}</td>
                  <td><span className={`risk-value ${record.riskScore >= 75 ? "high" : record.riskScore >= 50 ? "medium" : "low"}`}>{record.riskScore ?? 0}</span></td>
                  <td><select className="status-select" value={record.status} onChange={(e) => updateStatus(record.id, e.target.value)}>{statusOrder.map((status) => <option key={status}>{status}</option>)}</select></td>
                  <td><button className="table-btn" onClick={() => openRecord(record)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function ReportForm({ user, records, addRecord, setPage }) {
  const [form, setForm] = useState({
    mineId: records[0]?.mineId || "MINE-001",
    mineName: records[0]?.mineName || "Central Coal Mine",
    subsidiary: records[0]?.subsidiary || "Central Coal Subsidiary",
    zone: records[0]?.zone || "Mine Zone A",
    recordType: "Safety Observation",
    category: "Safety",
    priority: "Medium",
    title: "",
    description: "",
    location: "",
    regulation: "",
    contractorName: "",
    observation: "",
    correctiveAction: "",
    metricValue: null,
    metricUnit: "",
    workerCount: null,
    presentCount: null,
    dueDate: "",
    lat: null,
    lng: null
  });
  const [evidence, setEvidence] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const chooseMine = (mineId) => {
    const mine = records.find((record) => record.mineId === mineId) || records[0];
    setForm((current) => ({ ...current, mineId, mineName: mine?.mineName || "", subsidiary: mine?.subsidiary || "", zone: mine?.zone || "" }));
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        update("lat", Number(position.coords.latitude.toFixed(6)));
        update("lng", Number(position.coords.longitude.toFixed(6)));
        setGpsBusy(false);
      },
      () => {
        setError("Unable to capture your current location. You can continue with a manual mine-zone location.");
        setGpsBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const startCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setError("Camera access was unavailable. You can choose an image file instead.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return setError("Camera is still loading. Wait a moment and try again.");
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return setError("Could not capture the image.");
      const file = new File([blob], `khanandrishti-ai-evidence-${Date.now()}.jpg`, { type: "image/jpeg" });
      setEvidence(file);
      setPreview(URL.createObjectURL(file));
      stopCamera();
    }, "image/jpeg", 0.88);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!user) return setError("Please sign in before submitting a field report.");
    if (!form.title.trim() || !form.description.trim() || !form.location.trim()) return setError("Title, description and mine location are required.");

    setBusy(true);
    try {
      let uploadedEvidence = null;
      if (evidence) uploadedEvidence = await api.uploadEvidence(evidence);

      await addRecord({
        ...form,
        id: `KDAI-${Date.now().toString().slice(-6)}`,
        status: "Reported",
        riskScore: ({ Low: 20, Medium: 40, High: 70, Critical: 90 }[form.priority] || 40) + (["Safety", "Environment", "Compliance"].includes(form.category) ? 8 : 0),
        reportedBy: user.name,
        assignedTo: "Unassigned",
        evidence: uploadedEvidence
      });
    } catch (submitError) {
      setError(submitError?.message || "Unable to submit the report.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => () => stopCamera(), []);

  const mines = [...new Map(records.map((r) => [r.mineId, r])).values()];

  return (
    <main className="page-wrap">
      <section className="page-heading"><div><span className="eyebrow">FIELD REPORTING</span><h1>Create a governance record</h1><p>Capture a safety observation, inspection, compliance gap or operational issue from the mine site.</p></div><div className="field-badge"><MapPin size={15} /> GPS + evidence ready</div></section>
      {!user && <div className="inline-warning"><AlertTriangle size={16} /> sign in before submitting. the form stays available for preview.</div>}
      <form className="report-grid" onSubmit={submit}>
        <div className="data-card form-card">
          <div className="form-section-head"><span>01</span><div><strong>Governance context</strong><p>Select the mine, zone and record type.</p></div></div>
          <div className="form-grid">
            <Field label="Mine" required><select value={form.mineId} onChange={(e) => chooseMine(e.target.value)}>{mines.map((mine) => <option key={mine.mineId} value={mine.mineId}>{mine.mineName}</option>)}</select></Field>
            <Field label="Zone" required><input value={form.zone} onChange={(e) => update("zone", e.target.value)} placeholder="e.g. haul road / pit / workshop" /></Field>
            <Field label="Record type" required><select value={form.recordType} onChange={(e) => update("recordType", e.target.value)}>{["Safety Observation", "Safety Incident", "Compliance Violation", "Inspection", "Environmental Alert", "Equipment Issue", "Production Report", "Contractor Issue", "Worker Grievance", "Worker Attendance", "Corrective Action"].map((value) => <option key={value}>{value}</option>)}</select></Field>
            <Field label="Category" required><select value={form.category} onChange={(e) => update("category", e.target.value)}>{["Safety", "Environment", "Compliance", "Production", "Equipment", "Labour", "Contractor", "Grievance", "Other"].map((value) => <option key={value}>{value}</option>)}</select></Field>
            <Field label="Priority"><select value={form.priority} onChange={(e) => update("priority", e.target.value)}>{["Low", "Medium", "High", "Critical"].map((value) => <option key={value}>{value}</option>)}</select></Field>
            <Field label="Due date"><input type="date" value={form.dueDate} onChange={(e) => update("dueDate", e.target.value)} /></Field>
          </div>

          <div className="form-section-head"><span>02</span><div><strong>Observation details</strong><p>Describe what happened and why it matters.</p></div></div>
          <Field label="Title" required><input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. fire extinguisher certification due" minLength={3} maxLength={120} /></Field>
          <Field label="Description" required><textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Describe the observation, violation, inspection result or incident clearly." minLength={5} maxLength={2000} rows={5} /></Field>
          <div className="form-grid">
            <Field label="Regulation / requirement"><input value={form.regulation} onChange={(e) => update("regulation", e.target.value)} placeholder="Applicable rule or internal requirement" /></Field>
            <Field label="Contractor"><input value={form.contractorName} onChange={(e) => update("contractorName", e.target.value)} placeholder="Contractor name when applicable" /></Field>
            <Field label="Metric value"><input type="number" value={form.metricValue || ""} onChange={(e) => update("metricValue", e.target.value ? Number(e.target.value) : null)} placeholder="e.g. 92" /></Field>
            <Field label="Metric unit"><input value={form.metricUnit || ""} onChange={(e) => update("metricUnit", e.target.value)} placeholder="e.g. % of plan / tonnes / % attendance" /></Field>
          </div>
          <Field label="Field observation"><textarea value={form.observation} onChange={(e) => update("observation", e.target.value)} placeholder="What did the field team observe or measure?" rows={3} /></Field>
          <Field label="Corrective action"><textarea value={form.correctiveAction} onChange={(e) => update("correctiveAction", e.target.value)} placeholder="Suggested or completed corrective action" rows={3} /></Field>

          <div className="form-section-head"><span>03</span><div><strong>Location & evidence</strong><p>Geo-tag the record and attach supporting proof.</p></div></div>
          <Field label="Mine / site location" required><input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g. North Mining Block, haul road 2" /></Field>
          <div className="gps-row"><button type="button" className="secondary-btn" onClick={captureLocation} disabled={gpsBusy}><MapPin size={16} /> {gpsBusy ? "Capturing..." : "Capture current GPS"}</button><span>{form.lat != null ? `${form.lat}, ${form.lng}` : "GPS not captured yet"}</span></div>
          <div className="evidence-row">
            <label className="upload-box"><input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0] || null; setEvidence(file); setPreview(file ? URL.createObjectURL(file) : ""); }} /><Upload size={18} /><strong>Choose evidence photo</strong><span>Images up to 8 MB</span></label>
            <button type="button" className="upload-box camera-box" onClick={startCamera}><MapPin size={18} /><strong>Capture with camera</strong><span>Use device camera</span></button>
          </div>
          {preview && <div className="preview-box"><img src={preview} alt="Evidence preview" /><div><strong>{evidence?.name}</strong><button type="button" onClick={() => { setEvidence(null); URL.revokeObjectURL(preview); setPreview(""); }}>remove</button></div></div>}
          {cameraOpen && <div className="camera-modal"><div className="camera-card"><div className="camera-top"><strong>capture evidence</strong><button type="button" onClick={stopCamera}><X size={17} /></button></div><video ref={videoRef} autoPlay playsInline muted /><div className="camera-actions"><button type="button" className="secondary-btn" onClick={stopCamera}>cancel</button><button type="button" className="primary-btn" onClick={capturePhoto}>capture</button></div></div></div>}

          {error && <div className="form-error"><AlertTriangle size={15} /> {error}</div>}
          <div className="submit-row"><div><strong>Ready to submit?</strong><span>The record receives a CIL tracking ID and can be routed through the governance workflow.</span></div><button className="primary-btn" disabled={busy}>{busy ? "Submitting..." : "Submit field report"} <ArrowRight size={17} /></button></div>
        </div>
        <aside className="data-card side-note"><span className="eyebrow">WORKFLOW</span><h2>Report → verify → assign → act → close</h2><div className="workflow-list"><span><b>01</b> Field report captured</span><span><b>02</b> Compliance / safety review</span><span><b>03</b> Responsible owner assigned</span><span><b>04</b> Corrective action tracked</span><span><b>05</b> Closure verified</span></div><div className="side-note-callout"><ShieldCheck size={17} /><p>Evidence is stored in MongoDB GridFS in this build, so uploads are not tied to Render's ephemeral local disk.</p></div></aside>
      </form>
    </main>
  );
}


function AICommandCenter({ insights, records, setPage, openRecord }) {
  if (!insights) {
    return (
      <main className="page-wrap">
        <section className="page-heading"><div><span className="eyebrow">KHANANDRISHTI AI</span><h1>AI Command Center</h1><p>Loading governance intelligence from the live dataset.</p></div></section>
        <div className="data-card empty-state"><BrainCircuit size={42} /><h2>AI engine warming up</h2><p>Connect the backend to generate predictive risk, anomaly and recurring-pattern insights.</p></div>
      </main>
    );
  }

  const topPredictions = insights.predictions || [];
  const mineIntel = insights.mineIntelligence || [];
  const recommendations = insights.recommendations || [];
  const anomalies = insights.anomalies || [];
  const recurring = insights.recurringPatterns || [];
  
  return (
    <main className="page-wrap">
      <section className="page-heading ai-heading">
        <div><span className="eyebrow"><BrainCircuit size={14} /> KHANANDRISHTI AI ENGINE · {insights.modelMode === "hybrid" ? "HYBRID MODE" : "ANALYTICS MODE"}</span><h1>AI Command Center</h1><p>Explainable intelligence for mine safety, compliance, operations and field governance.</p></div>
        <div className="ai-engine-badge"><Sparkles size={15} /><strong>LIVE</strong><span>evidence-linked signals</span></div>
      </section>

      <section className="stats-row ai-stats">
        <DashboardStat icon={<BrainCircuit />} label="AI risk index" value={`${insights.aiRiskIndex}/100`} />
        <DashboardStat icon={<ShieldAlert />} label="Predicted priority" value={topPredictions.length} />
        <DashboardStat icon={<TrendingUp />} label="Anomaly signals" value={anomalies.length} />
        <DashboardStat icon={<Bot />} label="Recurring patterns" value={recurring.length} />
      </section>

      <section className="ai-grid">
        <div className="data-card ai-wide-card">
          <div className="card-head"><div><span className="eyebrow">PREDICTIVE TRIAGE</span><h2>What AI wants reviewed first</h2></div><button className="ghost-btn" onClick={() => setPage("governance")}>Open records <ArrowRight size={15} /></button></div>
          <div className="ai-prediction-list">
            {topPredictions.slice(0, 6).map((item) => {
              const record = records.find((r) => r.id === item.recordId);
              return <button className="ai-prediction" key={item.recordId} onClick={() => record && openRecord(record)}><div className="ai-score"><strong>{item.riskScore}</strong><span>risk</span></div><div className="ai-prediction-body"><strong>{item.title}</strong><span>{item.mineName} · {item.action}</span><small>{item.reasons.join(" · ")}</small></div><ArrowRight size={15} /></button>;
            })}
          </div>
        </div>

        <div className="data-card ai-recommendations">
          <div className="card-head"><div><span className="eyebrow">AI RECOMMENDATIONS</span><h2>Next actions</h2></div></div>
          {recommendations.map((item, index) => <div className={`ai-recommendation ${item.priority}`} key={`${item.title}-${index}`}><span>{item.priority.toUpperCase()}</span><div><strong>{item.title}</strong><p>{item.detail}</p></div></div>)}
        </div>
      </section>

      <section className="ai-grid ai-grid-3">
        <div className="data-card"><div className="card-head"><div><span className="eyebrow">MINE INTELLIGENCE</span><h2>Mine risk posture</h2></div></div><div className="mine-intel-list">{mineIntel.map((mine) => <div className="mine-intel" key={mine.mineId}><div><strong>{mine.mineName}</strong><span>{mine.open} open · {mine.overdue} overdue · {mine.topCategory}</span></div><div className={`mine-status ${mine.status}`}><strong>{mine.averageRisk}</strong><small>{mine.status}</small></div></div>)}</div></div>
        <div className="data-card"><div className="card-head"><div><span className="eyebrow">ANOMALY DETECTION</span><h2>Signals</h2></div></div>{anomalies.length ? anomalies.slice(0, 5).map((item) => <div className="signal-card" key={item.recordId}><span className={`signal-severity ${String(item.severity).toLowerCase()}`}>{item.severity}</span><div><strong>{item.title}</strong><p>{item.signal}</p></div></div>) : <div className="empty-mini">No strong anomaly signal detected in the current measurements.</div>}</div>
        <div className="data-card"><div className="card-head"><div><span className="eyebrow">RECURRING PATTERNS</span><h2>Repeat failures</h2></div></div>{recurring.length ? recurring.slice(0, 5).map((item) => <div className="pattern-row" key={`${item.mineId}-${item.category}`}><div><strong>{item.category}</strong><span>{item.mineName}</span></div><strong>{item.occurrences}×</strong></div>) : <div className="empty-mini">No recurring mine-category pattern found.</div>}</div>
      </section>

      <section className="data-card ai-explainability">
        <div><span className="eyebrow">EXPLAINABLE AI</span><h2>How the engine reaches its signals</h2><p>Every AI insight is derived from the governance records in the current database. It is designed to support human review, not replace it.</p></div>
        <div className="explain-grid">{(insights.explainability || []).map((text, index) => <div key={index}><span>0{index + 1}</span><p>{text}</p></div>)}</div>
        <div className="ai-actions"><button className="secondary-btn" onClick={() => setPage("report")}>Create field report <ArrowRight size={15} /></button><button className="secondary-btn" onClick={() => setPage("map")}>Inspect GIS hotspots <MapPin size={15} /></button></div>
      </section>
    </main>
  );
}

function TrackRecord({ record, setPage }) {
  if (!record) return <main className="page-wrap"><div className="empty-state"><h2>No governance record selected</h2><button className="primary-btn" onClick={() => setPage("report")}>Create a report</button></div></main>;
  const currentIndex = Math.max(0, statusOrder.indexOf(record.status));
  const progress = Math.round((currentIndex / (statusOrder.length - 1)) * 100);

  return (
    <main className="page-wrap">
      <section className="page-heading"><div><span className="eyebrow">TRACKING · {record.recordType}</span><h1>{record.title}</h1><p>{record.mineName} · {record.zone} · {record.id}</p></div><button className="secondary-btn" onClick={() => setPage("dashboard")}>← Back to dashboard</button></section>
      <section className="track-layout"><div className="data-card track-main"><div className="record-detail-top"><div><span className="small-label">GOVERNANCE RECORD</span><h2>{record.id}</h2></div><span className={`status-pill ${record.status.toLowerCase().replace(/\s+/g, "-")}`}>{record.status}</span></div><div className="track-progress-head"><div><span className="small-label">WORKFLOW PROGRESS</span><strong>{progress}%</strong></div><div className="progress-bar"><span style={{ width: `${progress}%` }} /></div></div><div className="timeline">{statusOrder.map((status, index) => <div className={`timeline-item ${index < currentIndex ? "done" : ""} ${index === currentIndex ? "active" : ""}`} key={status}><div className="timeline-icon">{index < currentIndex ? "✓" : index + 1}</div><span>{status}</span></div>)}</div><div className="detail-grid"><Detail label="Mine" value={record.mineName} /><Detail label="Zone" value={record.zone} /><Detail label="Category" value={record.category} /><Detail label="Priority" value={record.priority} /><Detail label="Risk score" value={`${record.riskScore ?? 0}/100`} /><Detail label="Reported" value={formatDate(record.createdAt || new Date())} /><Detail label="Assigned to" value={record.assignedTo || "Unassigned"} /><Detail label="Due date" value={formatDate(record.dueDate)} />{record.metricValue != null && <Detail label="Metric" value={`${record.metricValue} ${record.metricUnit || ""}`} />}{record.workerCount != null && <Detail label="Attendance" value={`${record.presentCount ?? 0}/${record.workerCount}`} />}</div><div className="description-box"><span className="small-label">DESCRIPTION</span><p>{record.description}</p></div></div><aside className="track-side"><div className="data-card"><span className="eyebrow">RISK SNAPSHOT</span><div className="risk-circle"><strong>{record.riskScore ?? 0}</strong><span>/100</span></div><p>{(record.riskScore ?? 0) >= 75 ? "High-priority governance attention is recommended." : "This record is below the high-risk review threshold."}</p></div><div className="data-card"><span className="eyebrow">LOCATION</span><h3>{record.location}</h3><div className="mini-location">📍 {record.lat != null && record.lng != null ? `${record.lat}, ${record.lng}` : "GPS not captured"}</div></div></aside></section>
    </main>
  );
}

function Login({ onLogin, setPage }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) return setError("Email and password are required.");
    if (mode === "register" && !name.trim()) return setError("Name is required.");
    setBusy(true);
    try {
      const response = mode === "login" ? await api.login({ email, password }) : await api.register({ name, email, password, role: "field_officer" });
      onLogin(response);
    } catch (loginError) {
      setError(loginError?.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page"><form className="auth-card" onSubmit={submit}><img src="/khanandrishti-ai-logo.png" alt="KhananDrishti AI" className="auth-logo" /><span className="eyebrow">SECURE GOVERNANCE ACCESS</span><h1>{mode === "login" ? "Welcome to KhananDrishti AI" : "Create a field account"}</h1><p>{mode === "login" ? "Sign in to access field reporting and governance controls." : "New registrations are created as field officer accounts."}</p>{mode === "register" && <Field label="Name" required><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></Field>}<Field label="Email" required><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" /></Field><Field label="Password" required><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} placeholder="At least 6 characters" /></Field>{error && <div className="form-error"><AlertTriangle size={15} /> {error}</div>}<button className="primary-btn full-btn" disabled={busy}>{busy ? "Working..." : mode === "login" ? "Sign in" : "Create account"} <ArrowRight size={17} /></button><div className="demo-access"><strong>demo access</strong><span>field@khanandrishti.demo / Field@123</span><span>manager@khanandrishti.demo / Mine@123</span><span>corporate@khanandrishti.demo / Corporate@123</span><span>regulator@khanandrishti.demo / Regulator@123</span></div><button type="button" className="link-btn" onClick={() => { setMode((value) => value === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "Create a field account" : "Already have an account? Sign in"}</button><button type="button" className="link-btn" onClick={() => setPage("home")}>← Back to overview</button></form></main>
  );
}

function RecordCard({ record, openRecord }) {
  return <button className="record-card" onClick={() => openRecord(record)}><div className="record-card-top"><span className="record-type">{record.recordType}</span><span className={`status-pill ${record.status.toLowerCase().replace(/\s+/g, "-")}`}>{record.status}</span></div><div className="record-card-icon">{categoryIcons[record.category] || "⚠️"}</div><h3>{record.title}</h3><p>{record.description}</p><div className="record-card-meta"><span><MapPin size={13} /> {record.mineName}</span><span>risk {record.riskScore ?? 0}</span></div></button>;
}

function MetricCard({ icon, value, label }) { return <div className="metric-card"><span>{icon}</span><strong>{value}</strong><p>{label}</p></div>; }
function DashboardStat({ icon, label, value }) { return <div className="dashboard-stat"><div>{icon}</div><span>{label}</span><strong>{value}</strong></div>; }
function Detail({ label, value }) { return <div><span>{label}</span><strong>{value || "—"}</strong></div>; }
function Field({ label, required, children }) { return <label className="field"><span>{label}{required && <b> *</b>}</span>{children}</label>; }

export default App;
