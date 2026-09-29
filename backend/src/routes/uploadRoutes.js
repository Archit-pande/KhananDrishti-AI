const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const { GridFSBucket } = require("mongodb");
const mongoose = require("mongoose");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  }
});

function bucket() {
  if (!mongoose.connection.db) {
    throw new Error("MongoDB is not ready.");
  }
  return new GridFSBucket(mongoose.connection.db, { bucketName: "evidence" });
}

router.post("/", requireAuth, upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded." });
    }

    const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const uploadStream = bucket().openUploadStream(filename, {
      contentType: req.file.mimetype,
      metadata: { uploadedBy: req.user.sub }
    });

    uploadStream.end(req.file.buffer);

    uploadStream.on("error", (error) => next(error));
    uploadStream.on("finish", () => {
      res.status(201).json({
        url: `${req.protocol}://${req.get("host")}/api/uploads/${uploadStream.id.toString()}`,
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size
      });
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid evidence id." });
    }

    const id = new mongoose.Types.ObjectId(req.params.id);
    const files = await mongoose.connection.db.collection("evidence.files").findOne({ _id: id });

    if (!files) {
      return res.status(404).json({ message: "Evidence not found." });
    }

    res.set("Content-Type", files.contentType || "application/octet-stream");
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    bucket().openDownloadStream(id).pipe(res);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
