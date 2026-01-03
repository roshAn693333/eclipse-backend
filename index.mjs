import express from "express";
import cors from "cors";
import cron from "node-cron";
import dotenv from "dotenv";
import twilio from "twilio";
import nodemailer from "nodemailer";

import periodRoutes from "./routes/periodRoutes.js";

dotenv.config();

// ─────────────────────────────────────────
// ✅ CREATE APP
// ─────────────────────────────────────────
const app = express();

// ─────────────────────────────────────────
// ✅ BASE URL (FOR CRON + PROD)
// ─────────────────────────────────────────
const BASE_URL = process.env.BACKEND_URL || "http://localhost:5000";

// ─────────────────────────────────────────
// ✅ TWILIO CLIENT
// ─────────────────────────────────────────
const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH
);

// ─────────────────────────────────────────
// ✅ MIDDLEWARE
// ─────────────────────────────────────────
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://eclipse-frontend.netlify.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json());

// ─────────────────────────────────────────
// ✅ ROUTES
// ─────────────────────────────────────────
app.use("/api/period", periodRoutes);

// ─────────────────────────────────────────
// 📩 EMAIL MESSAGE ROUTE
// ─────────────────────────────────────────
const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.post("/api/send-message", async (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message is empty" });
  }

  try {
    await emailTransporter.sendMail({
      from: `"For You App 🤍" <${process.env.EMAIL_USER}>`,
      to: process.env.RECEIVER_EMAIL,
      subject: "💌 New message from her",
      text: message,
    });

    console.log("📩 Email sent successfully");
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Email error:", error.message);
    res.status(500).json({ error: "Failed to send email" });
  }
});

// ─────────────────────────────────────────
// 📲 SMS NOTIFICATION SYSTEM
// ─────────────────────────────────────────
let notificationsQueue = [];

app.post("/notify", async (req, res) => {
  const { body } = req.body;

  try {
    await client.messages.create({
      from: process.env.TWILIO_PHONE,
      to: process.env.GF_PHONE,
      body,
    });

    console.log("📩 SMS sent:", body);
    res.json({ success: true });
  } catch (error) {
    console.error("❌ SMS error:", error.message);
    res.status(500).json({ success: false });
  }
});

app.get("/notify-latest", (req, res) => {
  if (notificationsQueue.length > 0) {
    const next = notificationsQueue.shift();
    res.json(next);
  } else {
    res.json(null);
  }
});

// ─────────────────────────────────────────
// 🧪 HEALTH CHECK
// ─────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Backend is running 🤍");
});

// ─────────────────────────────────────────
// ⏰ CRON JOBS (PRODUCTION SAFE)
// ─────────────────────────────────────────

// 🌅 6:00 AM — Good Morning
cron.schedule("0 6 * * *", async () => {
  await fetch(`${BASE_URL}/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      body: "Good morning 🤍 I hope today treats you gently. I’m always with you.",
    }),
  });
});

// 🌙 11:00 PM — Good Night
cron.schedule("0 23 * * *", async () => {
  await fetch(`${BASE_URL}/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      body: "Good night 🤍 You did enough today. Rest well, my love.",
    }),
  });
});

// ─────────────────────────────────────────
// 🔍 ENV DEBUG (SAFE)
// ─────────────────────────────────────────
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "LOADED" : "MISSING");

// ─────────────────────────────────────────
// ✅ START SERVER (RENDER SAFE)
// ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
