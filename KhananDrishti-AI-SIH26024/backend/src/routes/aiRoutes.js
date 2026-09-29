const express = require("express");
const { getAIInsights, askAI } = require("../controllers/aiController");

const router = express.Router();

router.get("/status", (req, res) => {
  const key = String(process.env.AI_API_KEY || "").trim();
  const url = String(process.env.AI_API_URL || "").trim();
  const configured = Boolean(key && url && !key.startsWith("replace-") && !key.startsWith("your-"));
  res.json({ ok: true, engine: configured ? "hybrid" : "analytics", externalModelConfigured: configured });
});
router.get("/insights", getAIInsights);
router.post("/ask", askAI);

module.exports = router;
