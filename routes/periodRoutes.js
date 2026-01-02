import express from "express";
import fs from "fs";
import path from "path";
import { sendEmail } from "../utils/email.js";

import { fileURLToPath } from "url";

const router = express.Router();

// Required for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------- FILE PATHS ----------------
const settingsFile = path.join(__dirname, "../data/periodSettings.json");
const cravingsFile = path.join(__dirname, "../data/cravings.json");

// ---------------- HELPERS ----------------
const readJSON = (file, defaultValue) => {
  if (!fs.existsSync(file)) return defaultValue;
  return JSON.parse(fs.readFileSync(file, "utf-8") || JSON.stringify(defaultValue));
};

const writeJSON = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// ---------------- PERIOD SETUP ----------------
router.post("/setup", (req, res) => {
  const { lastPeriodStart, cycleLength, periodLength } = req.body;

  if (!lastPeriodStart || !cycleLength || !periodLength) {
    return res.status(400).json({ error: "All fields required" });
  }

  writeJSON(settingsFile, {
    lastPeriodStart,
    cycleLength,
    periodLength,
  });

  res.json({ message: "Period settings saved ❤️" });
});

// ---------------- PERIOD STATUS ----------------
router.get("/status", (req, res) => {
  const data = readJSON(settingsFile, {});

  if (!data.lastPeriodStart) {
    return res.json({ configured: false });
  }

  const today = new Date();
  const start = new Date(data.lastPeriodStart);

  const diffDays = Math.floor(
    (today - start) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < data.periodLength) {
    return res.json({
      configured: true,
      onPeriod: true,
      periodDay: diffDays + 1,
    });
  }

  res.json({
    configured: true,
    onPeriod: false,
  });
});

// ---------------- CRAVINGS + EMAIL ----------------
router.post("/craving", async (req, res) => {
  const { item } = req.body;

  if (!item) {
    return res.status(400).json({ error: "Craving item required" });
  }

  const today = new Date().toISOString().split("T")[0];
  const cravings = readJSON(cravingsFile, []);

  const updated = cravings.filter(c => c.date !== today);
  updated.push({ date: today, item });

  writeJSON(cravingsFile, updated);

  try {
    await sendEmail(
      "❤️ Period Craving Alert",
      `She’s on her period 🌸
Craving: ${item}

Please take care ❤️`
    );
  } catch (err) {
    console.error("Email failed:", err.message);
  }

  res.json({ message: "Craving saved & email sent ❤️" });
});

// ---------------- GET TODAY CRAVING ----------------
router.get("/craving/today", (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const cravings = readJSON(cravingsFile, []);

  const todayCraving = cravings.find(c => c.date === today);
  res.json(todayCraving || {});
});
// ---------------- PERIOD DAILY LOGS ----------------
const logsFile = path.join(__dirname, "../data/periodLogs.json");

// Read logs
const readLogs = () => {
  if (!fs.existsSync(logsFile)) return [];
  return JSON.parse(fs.readFileSync(logsFile, "utf-8") || "[]");
};

// Write logs
const writeLogs = (data) => {
  fs.writeFileSync(logsFile, JSON.stringify(data, null, 2));
};

// SAVE TODAY MOOD & PAIN
router.post("/log", (req, res) => {
  const { mood, pain } = req.body;

  if (!mood || !pain) {
    return res.status(400).json({ error: "Mood and pain required" });
  }

  const today = new Date().toISOString().split("T")[0];
  const logs = readLogs();

  const filtered = logs.filter(l => l.date !== today);
  filtered.push({ date: today, mood, pain });

  writeLogs(filtered);
  res.json({ success: true });
});

// GET TODAY LOG
router.get("/log/today", (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const logs = readLogs();

  const todayLog = logs.find(l => l.date === today);
  res.json(todayLog || {});
});
// 🧪 TEST EMAIL ROUTE
router.get("/test-email", async (req, res) => {
  try {
    await sendEmail(
      "Test ❤️",
      "If you received this, email is finally working."
    );
    res.send("Email sent");
  } catch (err) {
    console.error("Test email error:", err.message);
    res.status(500).send("Email failed");
  }
});



export default router;
