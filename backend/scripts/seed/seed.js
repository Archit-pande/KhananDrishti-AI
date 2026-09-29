require("dotenv").config({
  path: require("path").join(__dirname, "../../.env")
});

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Issue = require("../../src/models/issue");
const User = require("../../src/models/User");
const issuesData = require("./issue.json");

async function seed() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing.");

  await mongoose.connect(process.env.MONGODB_URI);
  await Issue.deleteMany({});
  await User.deleteMany({});
  await Issue.insertMany(issuesData);

  const [fieldHash, mineHash, corporateHash, regulatorHash] = await Promise.all([
    bcrypt.hash("Field@123", 12),
    bcrypt.hash("Mine@123", 12),
    bcrypt.hash("Corporate@123", 12),
    bcrypt.hash("Regulator@123", 12)
  ]);

  await User.create([
    {
      name: "Field Safety Officer",
      email: "field@coalindia.demo",
      passwordHash: fieldHash,
      role: "field_officer",
      assignedMines: ["MINE-001", "MINE-002"]
    },
    {
      name: "Mine Operations Manager",
      email: "manager@coalindia.demo",
      passwordHash: mineHash,
      role: "mine_official",
      assignedMines: ["MINE-001"]
    },
    {
      name: "Corporate Governance Manager",
      email: "corporate@coalindia.demo",
      passwordHash: corporateHash,
      role: "corporate_manager",
      assignedMines: ["MINE-001", "MINE-002"]
    },
    {
      name: "Regulatory Reviewer",
      email: "regulator@coalindia.demo",
      passwordHash: regulatorHash,
      role: "regulator",
      assignedMines: ["MINE-001", "MINE-002"]
    }
  ]);

  console.log("Coal India Limited database seeded successfully.");
  console.log("Demo accounts: field@coalindia.demo / Field@123, manager@coalindia.demo / Mine@123, corporate@coalindia.demo / Corporate@123, regulator@coalindia.demo / Regulator@123");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
