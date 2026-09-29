const Issue = require("../models/issue");
const { buildInsights, answerQuestion } = require("../services/aiEngine");

async function getAIInsights(req, res, next) {
  try {
    const records = await Issue.find({}).sort({ createdAt: -1 }).lean();
    res.json(buildInsights(records));
  } catch (error) {
    next(error);
  }
}

async function askAI(req, res, next) {
  try {
    const question = String(req.body?.question || "").trim();
    if (!question) return res.status(400).json({ message: "Question is required." });
    if (question.length > 1000) return res.status(400).json({ message: "Question is too long." });
    const records = await Issue.find({}).sort({ createdAt: -1 }).lean();
    const result = await answerQuestion(question, records);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { getAIInsights, askAI };
