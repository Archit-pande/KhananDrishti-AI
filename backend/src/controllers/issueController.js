const mongoose = require("mongoose");
const Issue = require("../models/issue");

const calculateRiskScore = ({ priority, category, status }) => {
  const priorityScore = {
    Low: 20,
    Medium: 40,
    High: 70,
    Critical: 90
  }[priority] || 40;

  const categoryBonus = ["Safety", "Environment", "Compliance"].includes(category) ? 8 : 0;
  const statusAdjustment = ["Resolved", "Closed"].includes(status) ? -25 : 0;

  return Math.max(0, Math.min(100, priorityScore + categoryBonus + statusAdjustment));
};

const normalizeIssue = (issue) => ({
  ...issue.toObject(),
  id: issue.issueId
});

const buildGeoLocation = (coordinates) => {
  if (!coordinates || coordinates.lat == null || coordinates.lng == null) {
    return undefined;
  }

  const lat = Number(coordinates.lat);
  const lng = Number(coordinates.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return undefined;
  }

  return {
    type: "Point",
    coordinates: [lng, lat]
  };
};

async function listIssues(req, res, next) {
  try {
    const {
      status,
      category,
      priority,
      mineId,
      recordType,
      limit = 500
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (mineId) filter.mineId = mineId;
    if (recordType) filter.recordType = recordType;

    const safeLimit = Math.min(Math.max(Number(limit) || 500, 1), 1000);
    const issues = await Issue.find(filter).sort({ createdAt: -1 }).limit(safeLimit).lean();

    res.json(issues.map((issue) => ({ ...issue, id: issue.issueId })));
  } catch (error) {
    next(error);
  }
}

async function getNearbyIssues(req, res, next) {
  try {
    const { lat, lng, radius = 5000, status, category, priority, mineId, limit = 200 } = req.query;
    const latitude = Number(lat);
    const longitude = Number(lng);
    const maxDistance = Number(radius);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: "Invalid latitude or longitude." });
    }

    if (!Number.isFinite(maxDistance) || maxDistance <= 0 || maxDistance > 50000) {
      return res.status(400).json({ message: "Radius must be between 1 and 50000 meters." });
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 500);
    const filter = {
      geoLocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance
        }
      }
    };

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (mineId) filter.mineId = mineId;

    const issues = await Issue.find(filter).limit(safeLimit).lean();
    res.json(issues.map((issue) => ({ ...issue, id: issue.issueId })));
  } catch (error) {
    next(error);
  }
}

async function getIssueStats(req, res, next) {
  try {
    const [total, open, resolved, critical, mines, categories, statuses, priorities, highRisk, overdue] = await Promise.all([
      Issue.countDocuments(),
      Issue.countDocuments({ status: { $nin: ["Resolved", "Closed"] } }),
      Issue.countDocuments({ status: { $in: ["Resolved", "Closed"] } }),
      Issue.countDocuments({ priority: "Critical", status: { $nin: ["Resolved", "Closed"] } }),
      Issue.distinct("mineId"),
      Issue.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Issue.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Issue.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Issue.countDocuments({ riskScore: { $gte: 75 }, status: { $nin: ["Resolved", "Closed"] } }),
      Issue.countDocuments({ dueDate: { $lt: new Date() }, status: { $nin: ["Resolved", "Closed"] } })
    ]);

    const complianceTotal = await Issue.countDocuments({ category: "Compliance" });
    const complianceClosed = await Issue.countDocuments({ category: "Compliance", status: { $in: ["Resolved", "Closed"] } });
    const complianceRate = complianceTotal ? Math.round((complianceClosed / complianceTotal) * 100) : 100;

    res.json({
      total,
      open,
      unresolved: open,
      resolved,
      critical,
      highRisk,
      overdue,
      mines: mines.length,
      complianceRate,
      categories: categories.map((item) => ({ category: item._id, count: item.count })),
      statuses: statuses.map((item) => ({ status: item._id, count: item.count })),
      priorities: priorities.map((item) => ({ priority: item._id, count: item.count }))
    });
  } catch (error) {
    next(error);
  }
}

async function getIssue(req, res, next) {
  try {
    const issue = await Issue.findOne({
      $or: [
        { issueId: req.params.id },
        ...(mongoose.isValidObjectId(req.params.id) ? [{ _id: req.params.id }] : [])
      ]
    });

    if (!issue) {
      return res.status(404).json({ message: "Governance record not found." });
    }

    res.json(normalizeIssue(issue));
  } catch (error) {
    next(error);
  }
}

async function createIssue(req, res, next) {
  try {
    const payload = { ...req.body };
    const normalizedCoordinates = payload.coordinates || (payload.lat != null && payload.lng != null ? { lat: Number(payload.lat), lng: Number(payload.lng) } : undefined);
    const geoLocation = buildGeoLocation(normalizedCoordinates);

    const issue = await Issue.create({
      ...payload,
      issueId: payload.id,
      status: payload.status || "Reported",
      coordinates: normalizedCoordinates,
      geoLocation,
      riskScore: payload.riskScore ?? calculateRiskScore(payload),
      auditTrail: [{ action: "created", actor: req.user?.sub || payload.reportedBy || "system", note: "Record created" }]
    });

    res.status(201).json(normalizeIssue(issue));
  } catch (error) {
    next(error);
  }
}

async function updateIssue(req, res, next) {
  try {
    const allowed = [
      "title",
      "description",
      "mineId",
      "mineName",
      "subsidiary",
      "zone",
      "recordType",
      "category",
      "priority",
      "status",
      "location",
      "coordinates",
      "regulation",
      "contractorName",
      "observation",
      "correctiveAction",
      "dueDate",
      "metricValue",
      "metricUnit",
      "workerCount",
      "presentCount",
      "assignedTo"
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.coordinates) {
      const geoLocation = buildGeoLocation(updates.coordinates);
      if (geoLocation) updates.geoLocation = geoLocation;
    }

    if (updates.priority || updates.category || updates.status) {
      const current = await Issue.findOne({ issueId: req.params.id }).lean();
      if (current) {
        updates.riskScore = calculateRiskScore({
          priority: updates.priority ?? current.priority,
          category: updates.category ?? current.category,
          status: updates.status ?? current.status
        });
      }
    }

    const currentIssue = await Issue.findOne({ issueId: req.params.id });
    if (currentIssue) {
      currentIssue.set(updates);
      currentIssue.auditTrail = [
        ...(currentIssue.auditTrail || []),
        { action: "updated", actor: req.user?.sub || "system", timestamp: new Date(), note: Object.keys(updates).join(", ") }
      ];
      await currentIssue.save();
    }
    const issue = currentIssue;

    if (!issue) {
      return res.status(404).json({ message: "Governance record not found." });
    }

    res.json(normalizeIssue(issue));
  } catch (error) {
    next(error);
  }
}

async function deleteIssue(req, res, next) {
  try {
    const result = await Issue.deleteOne({ issueId: req.params.id });
    if (!result.deletedCount) {
      return res.status(404).json({ message: "Governance record not found." });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listIssues,
  getNearbyIssues,
  getIssueStats,
  getIssue,
  createIssue,
  updateIssue,
  deleteIssue
};
