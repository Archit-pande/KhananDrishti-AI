const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema(
  {
    issueId: {
      type: String,
      unique: true,
      index: true,
      trim: true
    },
    mineId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    mineName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
      index: true
    },
    subsidiary: {
      type: String,
      trim: true,
      maxlength: 150,
      index: true
    },
    zone: {
      type: String,
      trim: true,
      maxlength: 150,
      index: true
    },
    recordType: {
      type: String,
      enum: [
        "Safety Observation",
        "Safety Incident",
        "Compliance Violation",
        "Inspection",
        "Environmental Alert",
        "Equipment Issue",
        "Production Report",
        "Contractor Issue",
        "Worker Grievance",
        "Worker Attendance",
        "Corrective Action"
      ],
      default: "Safety Observation",
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 2000
    },
    category: {
      type: String,
      enum: [
        "Safety",
        "Environment",
        "Compliance",
        "Production",
        "Equipment",
        "Labour",
        "Contractor",
        "Grievance",
        "Other"
      ],
      required: true,
      index: true
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
      index: true
    },
    status: {
      type: String,
      enum: [
        "Reported",
        "Pending",
        "Verified",
        "Assigned",
        "In Progress",
        "Resolved",
        "Closed"
      ],
      default: "Reported",
      index: true
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      index: true
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
      index: true
    },
    coordinates: {
      lat: {
        type: Number,
        min: -90,
        max: 90
      },
      lng: {
        type: Number,
        min: -180,
        max: 180
      }
    },
    geoLocation: {
      type: {
        type: String,
        enum: ["Point"]
      },
      coordinates: {
        type: [Number]
      }
    },
    regulation: {
      type: String,
      trim: true,
      maxlength: 200
    },
    contractorName: {
      type: String,
      trim: true,
      maxlength: 150
    },
    observation: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    correctiveAction: {
      type: String,
      trim: true,
      maxlength: 1500
    },
    dueDate: {
      type: Date,
      index: true
    },
    metricValue: {
      type: Number
    },
    metricUnit: {
      type: String,
      trim: true,
      maxlength: 80
    },
    workerCount: {
      type: Number,
      min: 0
    },
    presentCount: {
      type: Number,
      min: 0
    },
    auditTrail: [
      {
        action: String,
        actor: String,
        timestamp: { type: Date, default: Date.now },
        note: String
      }
    ],
    reportedBy: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "Field Officer"
    },
    assignedTo: {
      type: String,
      trim: true,
      maxlength: 120
    },
    evidence: {
      name: String,
      type: String,
      size: Number,
      url: String
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

issueSchema.index({ geoLocation: "2dsphere" });

issueSchema.pre("validate", function (next) {
  if (!this.issueId) {
    this.issueId = `KDAI-${Date.now().toString().slice(-6)}-${Math.floor(
      Math.random() * 900 + 100
    )}`;
  }

  if (this.coordinates?.lat != null && this.coordinates?.lng != null) {
    this.geoLocation = {
      type: "Point",
      coordinates: [
        Number(this.coordinates.lng),
        Number(this.coordinates.lat)
      ]
    };
  }

  next();
});

module.exports = mongoose.model("Issue", issueSchema);
