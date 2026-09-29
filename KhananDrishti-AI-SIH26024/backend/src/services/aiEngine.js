const OPEN_STATUSES = ["Reported", "Pending", "Verified", "Assigned", "In Progress"];
const PRIORITY_WEIGHT = { Low: 18, Medium: 38, High: 68, Critical: 92 };

function isOpen(record) {
  return OPEN_STATUSES.includes(record.status);
}

function daysUntil(dateValue) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function riskScore(record) {
  if (Number.isFinite(Number(record.riskScore))) return clamp(Number(record.riskScore));
  const priority = PRIORITY_WEIGHT[record.priority] || 38;
  const categoryBoost = ["Safety", "Environment", "Compliance"].includes(record.category) ? 10 : 0;
  const urgency = daysUntil(record.dueDate);
  const dueBoost = urgency != null && urgency < 0 ? 14 : urgency != null && urgency <= 3 ? 8 : 0;
  return clamp(priority + categoryBoost + dueBoost);
}

function buildGroups(records, keyFn) {
  const groups = new Map();
  for (const record of records) {
    const key = keyFn(record);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  return groups;
}

function getAnomalies(records) {
  const groups = buildGroups(records.filter((r) => Number.isFinite(Number(r.metricValue))), (r) => `${r.category}|${r.metricUnit || "value"}`);
  const anomalies = [];

  for (const [groupKey, group] of groups) {
    if (group.length < 3) continue;
    const values = group.map((r) => Number(r.metricValue));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    const deviation = Math.sqrt(variance);
    if (!deviation) continue;

    for (const record of group) {
      const z = Math.abs((Number(record.metricValue) - mean) / deviation);
      if (z >= 1.6) {
        anomalies.push({
          recordId: record.issueId,
          title: record.title,
          mineName: record.mineName,
          category: record.category,
          signal: `${record.metricValue}${record.metricUnit ? ` ${record.metricUnit}` : ""} is ${z.toFixed(1)}σ from the observed ${groupKey.replace("|", " / ")} baseline.`,
          severity: z >= 2.3 ? "High" : "Medium"
        });
      }
    }
  }

  for (const record of records) {
    const score = riskScore(record);
    if (isOpen(record) && score >= 90 && !anomalies.some((a) => a.recordId === record.issueId)) {
      anomalies.push({
        recordId: record.issueId,
        title: record.title,
        mineName: record.mineName,
        category: record.category,
        signal: `risk score ${Math.round(score)} places this record in the AI high-severity tail.`,
        severity: "High"
      });
    }
  }

  return anomalies.slice(0, 8);
}

function getRecurringPatterns(records) {
  const groups = buildGroups(records, (r) => `${r.mineId}|${r.category}`);
  return [...groups.entries()]
    .map(([key, group]) => {
      const [mineId, category] = key.split("|");
      const openCount = group.filter(isOpen).length;
      const averageRisk = Math.round(group.reduce((sum, r) => sum + riskScore(r), 0) / group.length);
      return {
        mineId,
        mineName: group[0].mineName,
        category,
        occurrences: group.length,
        openCount,
        averageRisk,
        recurring: group.length >= 2
      };
    })
    .filter((item) => item.recurring)
    .sort((a, b) => b.occurrences - a.occurrences || b.averageRisk - a.averageRisk)
    .slice(0, 8);
}

function getMineIntelligence(records) {
  const groups = buildGroups(records, (r) => r.mineId);
  return [...groups.entries()].map(([mineId, group]) => {
    const open = group.filter(isOpen);
    const overdue = open.filter((r) => {
      const days = daysUntil(r.dueDate);
      return days != null && days < 0;
    });
    const critical = open.filter((r) => r.priority === "Critical").length;
    const avgRisk = Math.round((open.length ? open : group).reduce((sum, r) => sum + riskScore(r), 0) / Math.max(1, (open.length ? open : group).length));
    const compliance = group.filter((r) => r.category === "Compliance");
    const closedCompliance = compliance.filter((r) => ["Resolved", "Closed"].includes(r.status)).length;
    const complianceRate = compliance.length ? Math.round((closedCompliance / compliance.length) * 100) : 100;
    const topCategory = [...buildGroups(group, (r) => r.category).entries()].sort((a, b) => b[1].length - a[1].length)[0]?.[0] || "—";
    return {
      mineId,
      mineName: group[0].mineName,
      records: group.length,
      open: open.length,
      critical,
      overdue: overdue.length,
      averageRisk: avgRisk,
      complianceRate,
      topCategory,
      status: avgRisk >= 80 || critical > 0 ? "attention" : avgRisk >= 60 ? "watch" : "stable"
    };
  }).sort((a, b) => b.averageRisk - a.averageRisk);
}

function getPredictions(records, recurringPatterns) {
  const recurrenceMap = new Map(recurringPatterns.map((item) => [`${item.mineId}|${item.category}`, item]));
  return records
    .filter(isOpen)
    .map((record) => {
      const days = daysUntil(record.dueDate);
      const recurrence = recurrenceMap.get(`${record.mineId}|${record.category}`);
      let score = riskScore(record);
      const reasons = [];
      if (record.priority === "Critical") reasons.push("critical priority");
      if (days != null && days < 0) {
        score += 10;
        reasons.push(`${Math.abs(days)}d overdue`);
      } else if (days != null && days <= 3) {
        score += 6;
        reasons.push(`due in ${days}d`);
      }
      if (recurrence?.occurrences >= 2) {
        score += Math.min(8, recurrence.occurrences * 2);
        reasons.push(`recurring ${record.category.toLowerCase()} pattern`);
      }
      if (record.category === "Safety") reasons.push("safety domain sensitivity");
      if (record.category === "Compliance") reasons.push("statutory workflow exposure");
      return {
        recordId: record.issueId,
        title: record.title,
        mineName: record.mineName,
        riskScore: clamp(score),
        action: score >= 90 ? "Immediate review and escalation" : score >= 75 ? "Prioritize inspection and corrective action" : "Monitor and verify",
        reasons: reasons.slice(0, 3),
        priorityConfidence: Math.round(clamp(60 + score * 0.35))
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 8);
}

function buildRecommendations(records, recurringPatterns, mineIntelligence, anomalies) {
  const recommendations = [];
  const overdue = records.filter((r) => isOpen(r) && (daysUntil(r.dueDate) ?? 1) < 0);
  const critical = records.filter((r) => isOpen(r) && r.priority === "Critical");
  if (critical.length) recommendations.push({ priority: "critical", title: "Escalate critical governance records", detail: `${critical.length} open critical record(s) should be reviewed by the responsible owner and governance authority.` });
  if (overdue.length) recommendations.push({ priority: "high", title: "Clear overdue actions", detail: `${overdue.length} open record(s) have crossed their due date. Route them into an escalation queue.` });
  const recurring = recurringPatterns.find((item) => item.openCount > 0 && item.averageRisk >= 60);
  if (recurring) recommendations.push({ priority: "high", title: `Investigate recurring ${recurring.category.toLowerCase()} issues`, detail: `${recurring.mineName} has ${recurring.occurrences} records in this category with an average risk of ${recurring.averageRisk}.` });
  if (anomalies.length) recommendations.push({ priority: "medium", title: "Validate detected anomalies", detail: `${anomalies.length} AI anomaly signal(s) were detected from risk and operational measurements.` });
  const attentionMine = mineIntelligence[0];
  if (attentionMine) recommendations.push({ priority: attentionMine.status === "attention" ? "high" : "medium", title: `Focus review on ${attentionMine.mineName}`, detail: `Current AI risk index is ${attentionMine.averageRisk}/100 with ${attentionMine.open} open record(s) and ${attentionMine.overdue} overdue.` });
  return recommendations.slice(0, 6);
}

function buildInsights(records) {
  const activeRecords = records.filter(isOpen);
  const recurringPatterns = getRecurringPatterns(records);
  const anomalies = getAnomalies(records);
  const predictions = getPredictions(records, recurringPatterns);
  const mineIntelligence = getMineIntelligence(records);
  const recommendations = buildRecommendations(records, recurringPatterns, mineIntelligence, anomalies);
  const weightedRisk = activeRecords.length ? Math.round(activeRecords.reduce((sum, r) => sum + riskScore(r), 0) / activeRecords.length) : 0;
  const overdue = activeRecords.filter((r) => (daysUntil(r.dueDate) ?? 1) < 0).length;
  const critical = activeRecords.filter((r) => r.priority === "Critical").length;
  const aiRiskIndex = clamp(Math.round(weightedRisk + critical * 3 + overdue * 2));
  const complianceRecords = records.filter((r) => r.category === "Compliance");
  const closedCompliance = complianceRecords.filter((r) => ["Resolved", "Closed"].includes(r.status)).length;
  const complianceRate = complianceRecords.length ? Math.round((closedCompliance / complianceRecords.length) * 100) : 100;

  return {
    generatedAt: new Date().toISOString(),
    engine: "explainable-analytics-v1",
    aiRiskIndex,
    modelMode: process.env.AI_API_KEY && process.env.AI_API_URL ? "hybrid" : "analytics",
    summary: {
      total: records.length,
      open: activeRecords.length,
      critical,
      overdue,
      highRisk: activeRecords.filter((r) => riskScore(r) >= 75).length,
      complianceRate,
      mines: new Set(records.map((r) => r.mineId).filter(Boolean)).size
    },
    predictions,
    anomalies,
    recurringPatterns,
    mineIntelligence,
    recommendations,
    explainability: [
      "risk combines priority, domain sensitivity, due-date urgency and recurring-pattern signals",
      "anomalies use statistical deviation when operational metrics are available",
      "predictions are ranked action-priority signals, not guaranteed outcomes",
      "every recommendation is linked to observable record-level evidence"
    ]
  };
}

function topRecordsContext(records) {
  return records.slice(0, 40).map((r) => ({
    id: r.issueId,
    mine: r.mineName,
    zone: r.zone,
    category: r.category,
    priority: r.priority,
    status: r.status,
    riskScore: riskScore(r),
    dueDate: r.dueDate,
    title: r.title
  }));
}

function localAnswer(question, records) {
  const q = String(question || "").toLowerCase();
  const insights = buildInsights(records);
  const open = records.filter(isOpen);
  if (q.includes("critical")) return `there are ${insights.summary.critical} open critical record(s). the highest-ranked ai actions are ${insights.predictions.slice(0, 3).map((item) => item.title).join(", ") || "none"}.`;
  if (q.includes("overdue")) return `the system found ${insights.summary.overdue} open overdue record(s). ${insights.recommendations.find((r) => r.title.toLowerCase().includes("overdue"))?.detail || "no overdue escalation is currently required."}`;
  if (q.includes("anomal") || q.includes("unusual")) return insights.anomalies.length ? `i detected ${insights.anomalies.length} anomaly signal(s). the leading signal is ${insights.anomalies[0].title}: ${insights.anomalies[0].signal}` : "i did not detect a strong anomaly signal in the current dataset.";
  if (q.includes("recurring") || q.includes("repeat")) return insights.recurringPatterns.length ? insights.recurringPatterns.slice(0, 3).map((r) => `${r.mineName}: ${r.category} appears ${r.occurrences} times with ${r.openCount} open and average risk ${r.averageRisk}`).join(". ") : "i did not detect a recurring mine-category pattern with at least two records.";
  if (q.includes("risk")) return `the current explainable ai risk index is ${insights.aiRiskIndex}/100, with ${insights.summary.highRisk} high-risk open record(s). the main drivers are priority, overdue actions and recurring patterns.`;
  if (q.includes("compliance")) return `the current compliance closure rate is ${insights.summary.complianceRate}%. there are ${records.filter((r) => r.category === "Compliance" && isOpen(r)).length} open compliance record(s).`;
  if (q.includes("mine")) return `the dataset covers ${insights.summary.mines} mine(s): ${[...new Set(records.map((r) => r.mineName).filter(Boolean))].join(", ") || "none"}.`;
  if (q.includes("report") || q.includes("inspection")) return "use field reporting to capture a geo-tagged observation, evidence, operational measurement and corrective action. ai will rank the new record after submission.";
  if (q.includes("hello") || q.includes("hi") || q.includes("hey")) return "hello. i'm the khanandrishti ai copilot. ask me about risk, overdue actions, anomalies, recurring violations, compliance or a specific mine.";
  return `i can analyze ${open.length} open record(s). try asking about critical alerts, overdue actions, recurring violations, anomalies, compliance or risk.`;
}

async function callExternalModel(question, records) {
  const apiKey = String(process.env.AI_API_KEY || "").trim();
  const endpoint = String(process.env.AI_API_URL || "").trim();
  if (!apiKey || !endpoint || apiKey.startsWith("replace-") || apiKey.startsWith("your-")) return null;

  const model = process.env.AI_MODEL || "openrouter/free";
  const prompt = process.env.AI_SYSTEM_PROMPT || "You are KhananDrishti AI, an explainable governance copilot for coal mine operations. Use only the supplied data. Do not invent regulations, measurements or incidents. Clearly distinguish observations from recommendations.";
  const userPrompt = `Question: ${question}\n\nGovernance data:\n${JSON.stringify(topRecordsContext(records))}`;
  const isResponsesApi = endpoint.includes("/responses");

  const body = isResponsesApi
    ? {
        model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: prompt }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: userPrompt }]
          }
        ]
      }
    : {
        model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2
      };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(endpoint.includes("openrouter.ai") ? {
        "HTTP-Referer": process.env.AI_HTTP_REFERER || "https://khanandrishti-ai.vercel.app",
        "X-Title": process.env.AI_X_TITLE || "KhananDrishti AI"
      } : {})
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`AI provider returned ${response.status}${errorBody ? `: ${errorBody.slice(0, 240)}` : "."}`);
  }

  const data = await response.json();
  const text = isResponsesApi
    ? data?.output_text || data?.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text
    : data?.choices?.[0]?.message?.content || data?.output_text || data?.response;

  if (!text) throw new Error("AI provider returned no text.");
  return String(text).trim();
}

async function answerQuestion(question, records) {
  try {
    const external = await callExternalModel(question, records);
    if (external) return { answer: external, source: "llm+analytics" };
  } catch (error) {
    console.warn("AI provider unavailable, using analytics fallback:", error.message);
  }
  return { answer: localAnswer(question, records), source: "analytics-fallback" };
}

module.exports = { buildInsights, answerQuestion, isOpen };
