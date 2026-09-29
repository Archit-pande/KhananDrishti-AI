const express = require("express");
const { getAIInsights, askAI } = require("../controllers/aiController");

const router = express.Router();

router.get("/insights", getAIInsights);
router.post("/ask", askAI);

module.exports = router;
