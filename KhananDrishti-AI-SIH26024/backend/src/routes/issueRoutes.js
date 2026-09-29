const express = require("express");
const {
  listIssues,
  getIssue,
  createIssue,
  updateIssue,
  deleteIssue,
  getNearbyIssues,
  getIssueStats
} = require("../controllers/issueController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
const governanceRoles = ["field_officer", "mine_official", "corporate_manager", "regulator", "admin"];

router.get("/", listIssues);
router.get("/nearby", getNearbyIssues);
router.get("/stats", getIssueStats);
router.get("/:id", getIssue);
router.post("/", requireAuth, createIssue);
router.patch("/:id", requireAuth, requireRole(...governanceRoles), updateIssue);
router.delete("/:id", requireAuth, requireRole("admin", "regulator"), deleteIssue);

module.exports = router;
