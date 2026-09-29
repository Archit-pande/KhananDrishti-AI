const OPEN_STATUSES = ["Reported", "Pending", "Verified", "Assigned", "In Progress"];
const PRIORITY_WEIGHT = { Low: 18, Medium: 38, High: 68, Critical: 92 };

function isOpen(record) {
  return OPEN_STATUSES.includes(record?.status);
}

function daysUntil(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function riskScore(record) {
  if (Number.isFinite(Number(record?.riskScore))) return clamp(Number(record.riskScore));
  const priority = PRIORITY_WEIGHT[record?.priority] || 38;
  const categoryBoost = ["Safety", "Environment", "Compliance"].includes(record?.category) ? 10 : 0;
  const urgency = daysUntil(record?.dueDate);
  const dueBoost = urgency != null && urgency < 0 ? 14 : urgency != null && urgency <= 3 ? 8 : 0;
  return clamp(priority + categoryBoost + dueBoost);
}

function grouped(records, key) {
  const map = new Map();
  records.forEach((record) => {
    const value = key(record);
    if (!value) return;
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(record);
  });
  return map;
}

function recurringPatterns(records) {
  return [...grouped(records, (r) => `${r.mineId || "unknown"}|${r.category || "Other"}`).entries()]
    .map(([key, group]) => {
      const [mineId, category] = key.split("|");
      const risks = group.map(riskScore);
      return {
        mineId,
        mineName: group[0]?.mineName || mineId,
        category,
        occurrences: group.length,
        openCount: group.filter(isOpen).length,
        averageRisk: Math.round(risks.reduce((a, b) => a + b, 0) / Math.max(1, risks.length)),
        recurring: group.length >= 2
      };
    })
    .filter((item) => item.recurring)
    .sort((a, b) => b.occurrences - a.occurrences || b.averageRisk - a.averageRisk)
    .slice(0, 8);
}

function mineIntelligence(records) {
  return [...grouped(records, (r) => r.mineId || r.mineName).entries()]
    .map(([mineId, group]) => {
      const open = group.filter(isOpen);
      const active = open.length ? open : group;
      const overdue = open.filter((r) => { const d = daysUntil(r.dueDate); return d != null && d < 0; }).length;
      const critical = open.filter((r) => r.priority === "Critical").length;
      const averageRisk = Math.round(active.reduce((sum, r) => sum + riskScore(r), 0) / Math.max(1, active.length));
      const compliance = group.filter((r) => r.category === "Compliance");
      const closedCompliance = compliance.filter((r) => ["Resolved", "Closed"].includes(r.status)).length;
      const topCategory = [...grouped(group, (r) => r.category).entries()].sort((a, b) => b[1].length - a[1].length)[0]?.[0] || "—";
      return {
        mineId,
        mineName: group[0]?.mineName || mineId,
        records: group.length,
        open: open.length,
        critical,
        overdue,
        averageRisk,
        complianceRate: compliance.length ? Math.round((closedCompliance / compliance.length) * 100) : 100,
        topCategory,
        status: averageRisk >= 80 || critical > 0 ? "attention" : averageRisk >= 60 ? "watch" : "stable"
      };
    })
    .sort((a, b) => b.averageRisk - a.averageRisk);
}

function anomalies(records) {
  const output = [];
  for (const [groupKey, group] of grouped(records.filter((r) => Number.isFinite(Number(r.metricValue))), (r) => `${r.category || "Other"}|${r.metricUnit || "value"}`)) {
    if (group.length < 3) continue;
    const values = group.map((r) => Number(r.metricValue));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    const sd = Math.sqrt(variance);
    if (!sd) continue;
    group.forEach((record) => {
      const z = Math.abs((Number(record.metricValue) - mean) / sd);
      if (z >= 1.6) {
        output.push({
          recordId: record.id || record.issueId,
          title: record.title,
          mineName: record.mineName,
          category: record.category,
          signal: `${record.metricValue}${record.metricUnit ? ` ${record.metricUnit}` : ""} is ${z.toFixed(1)}σ from the observed ${groupKey.replace("|", " / ")} baseline.`,
          severity: z >= 2.3 ? "High" : "Medium"
        });
      }
    });
  }
  records.filter(isOpen).forEach((record) => {
    const score = riskScore(record);
    if (score >= 90 && !output.some((item) => item.recordId === (record.id || record.issueId))) {
      output.push({ recordId: record.id || record.issueId, title: record.title, mineName: record.mineName, category: record.category, signal: `risk score ${Math.round(score)} places this record in the AI high-severity tail.`, severity: "High" });
    }
  });
  return output.slice(0, 8);
}

export function buildClientStats(records) {
  const open = records.filter(isOpen);
  const critical = open.filter((r) => r.priority === "Critical").length;
  const highRisk = open.filter((r) => riskScore(r) >= 75).length;
  const overdue = open.filter((r) => { const d = daysUntil(r.dueDate); return d != null && d < 0; }).length;
  const compliance = records.filter((r) => r.category === "Compliance");
  const complianceClosed = compliance.filter((r) => ["Resolved", "Closed"].includes(r.status)).length;
  return {
    total: records.length,
    open: open.length,
    unresolved: open.length,
    resolved: records.length - open.length,
    critical,
    highRisk,
    overdue,
    mines: new Set(records.map((r) => r.mineId).filter(Boolean)).size,
    complianceRate: compliance.length ? Math.round((complianceClosed / compliance.length) * 100) : 100
  };
}

export function buildClientAIInsights(records) {
  const open = records.filter(isOpen);
  const patterns = recurringPatterns(records);
  const anomalySignals = anomalies(records);
  const mineIntel = mineIntelligence(records);
  const predictions = open.map((record) => {
    const days = daysUntil(record.dueDate);
    const recurrence = patterns.find((item) => item.mineId === record.mineId && item.category === record.category);
    let score = riskScore(record);
    const reasons = [];
    if (record.priority === "Critical") { score += 4; reasons.push("critical priority"); }
    if (days != null && days < 0) { score += 10; reasons.push(`${Math.abs(days)}d overdue`); }
    else if (days != null && days <= 3) { score += 6; reasons.push(`due in ${days}d`); }
    if (recurrence?.occurrences >= 2) { score += Math.min(8, recurrence.occurrences * 2); reasons.push(`recurring ${String(record.category || "governance").toLowerCase()} pattern`); }
    if (record.category === "Safety") reasons.push("safety domain sensitivity");
    if (record.category === "Compliance") reasons.push("statutory workflow exposure");
    return { recordId: record.id || record.issueId, title: record.title, mineName: record.mineName, riskScore: clamp(score), action: score >= 90 ? "Immediate review and escalation" : score >= 75 ? "Prioritize inspection and corrective action" : "Monitor and verify", reasons: reasons.slice(0, 3), priorityConfidence: Math.round(clamp(60 + score * 0.35)) };
  }).sort((a, b) => b.riskScore - a.riskScore).slice(0, 8);
  const critical = open.filter((r) => r.priority === "Critical").length;
  const overdue = open.filter((r) => { const d = daysUntil(r.dueDate); return d != null && d < 0; }).length;
  const compliance = records.filter((r) => r.category === "Compliance");
  const complianceClosed = compliance.filter((r) => ["Resolved", "Closed"].includes(r.status)).length;
  const weightedRisk = open.length ? Math.round(open.reduce((sum, r) => sum + riskScore(r), 0) / open.length) : 0;
  const recommendations = [];
  if (critical) recommendations.push({ priority: "critical", title: "Escalate critical governance records", detail: `${critical} open critical record(s) should be reviewed by the responsible owner and governance authority.` });
  if (overdue) recommendations.push({ priority: "high", title: "Clear overdue actions", detail: `${overdue} open record(s) have crossed their due date. Route them into an escalation queue.` });
  const recurring = patterns.find((item) => item.openCount > 0 && item.averageRisk >= 60);
  if (recurring) recommendations.push({ priority: "high", title: `Investigate recurring ${String(recurring.category).toLowerCase()} issues`, detail: `${recurring.mineName} has ${recurring.occurrences} records in this category with an average risk of ${recurring.averageRisk}.` });
  if (anomalySignals.length) recommendations.push({ priority: "medium", title: "Validate detected anomalies", detail: `${anomalySignals.length} AI anomaly signal(s) were detected from risk and operational measurements.` });
  if (mineIntel[0]) recommendations.push({ priority: mineIntel[0].status === "attention" ? "high" : "medium", title: `Focus review on ${mineIntel[0].mineName}`, detail: `Current AI risk index is ${mineIntel[0].averageRisk}/100 with ${mineIntel[0].open} open record(s) and ${mineIntel[0].overdue} overdue.` });
  return {
    generatedAt: new Date().toISOString(),
    engine: "explainable-analytics-client-v2",
    modelMode: "local-analytics",
    aiRiskIndex: clamp(Math.round(weightedRisk + critical * 3 + overdue * 2)),
    summary: { total: records.length, open: open.length, critical, overdue, highRisk: open.filter((r) => riskScore(r) >= 75).length, complianceRate: compliance.length ? Math.round((complianceClosed / compliance.length) * 100) : 100, mines: new Set(records.map((r) => r.mineId).filter(Boolean)).size },
    predictions,
    anomalies: anomalySignals,
    recurringPatterns: patterns,
    mineIntelligence: mineIntel,
    recommendations: recommendations.slice(0, 6),
    explainability: [
      "Risk ranking combines recorded priority, domain sensitivity, due-date urgency and recurring mine-category patterns.",
      "Anomaly detection uses available operational measurements and deviation from the observed category/unit baseline.",
      "Recommendations are deterministic suggestions based on the current governance dataset and should be reviewed by authorized officials."
    ]
  };
}

export function localAnswer(question, records) {
  const q = String(question || "").toLowerCase();
  const insights = buildClientAIInsights(records);
  if (q.includes("critical")) return `there are ${insights.summary.critical} open critical record(s). the highest-ranked priorities are ${insights.predictions.slice(0, 3).map((item) => item.title).join(", ") || "none"}.`;
  if (q.includes("overdue")) return `the system found ${insights.summary.overdue} open overdue record(s). ${insights.summary.overdue ? "these should be routed into an escalation workflow." : "no overdue escalation is currently indicated."}`;
  if (q.includes("anomal") || q.includes("unusual")) return insights.anomalies.length ? `i detected ${insights.anomalies.length} anomaly signal(s). the leading signal is ${insights.anomalies[0].title}: ${insights.anomalies[0].signal}` : "i did not detect a strong anomaly signal in the current dataset.";
  if (q.includes("recurring") || q.includes("repeat")) return insights.recurringPatterns.length ? insights.recurringPatterns.slice(0, 3).map((r) => `${r.mineName}: ${r.category} appears ${r.occurrences} times with ${r.openCount} open and average risk ${r.averageRisk}`).join(". ") : "i did not detect a recurring mine-category pattern with at least two records.";
  if (q.includes("risk")) return `the current explainable ai risk index is ${insights.aiRiskIndex}/100, with ${insights.summary.highRisk} high-risk open record(s). the main drivers are priority, due-date urgency and recurring patterns.`;
  if (q.includes("compliance")) return `the current compliance closure rate is ${insights.summary.complianceRate}%. there are ${records.filter((r) => r.category === "Compliance" && isOpen(r)).length} open compliance record(s).`;
  if (q.includes("mine")) return `the dataset covers ${insights.summary.mines} mine(s): ${[...new Set(records.map((r) => r.mineName).filter(Boolean))].join(", ") || "none"}.`;
  return `i can analyze ${insights.summary.open} open record(s). try asking about critical alerts, overdue actions, recurring violations, anomalies, compliance or risk.`;
}
