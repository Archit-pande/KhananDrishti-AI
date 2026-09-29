const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: ["field_officer", "mine_official", "corporate_manager", "regulator", "admin"],
      default: "field_officer",
      index: true
    },
    subsidiary: {
      type: String,
      trim: true,
      maxlength: 150
    },
    assignedMines: [
      {
        type: String,
        trim: true
      }
    ]
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("User", userSchema);
