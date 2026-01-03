import express from "express";
import cors from "cors";
import cron from "node-cron";
import dotenv from "dotenv";
import twilio from "twilio";
import { Resend } from "resend";

import periodRoutes from "./routes/periodRoutes.js";

dotenv.config();

// ─────────────────────────────────────────
// ✅ CREATE APP
// ─────────────────────────────────────────
const app = express();

// ─────────────────────────────────────────
// ✅ BASE URL (CRON SAFE)
// ─────────────────────────────────────────
const BASE_URL =
  process.env.BACKEND_URL || "http://localhost:5000";

// ─────────────────────────────────────────
// ✅ RESEND CLIENT
// ─────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);

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
      "https://eclipse-frontend.netlify.app",
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
// 📩 EMAIL MESSAGE ROUTE (RESEND)
// ─────────────────────────────────────────
app.post("/api/send-message", async (req, res) => {
  const { message } = req.body;

  if (!message?.trim()) {
    return res
      .status(400)
      .json({ error: "Message is empty" });
  }

  try {
    await resend.emails.send({
      from: "Eclipse 🤍 <onboarding@resend.dev>", // ✅ sandbox-safe
      to: [process.env.RECEIVER_EMAIL],
      subject: "💌 New message from her",
      text: message,
    });

    console.log("📩 Email sent via Resend");
    return res.json({ success: true });
  } catch (error) {
    console.error("❌ Resend email error:", error);
    return res
      .status(500)
      .json({ error: "Failed to send email" });
  }
});

// ─────────────────────────────────────────
// 📲 SMS NOTIFICATION SYSTEM
// ─────────────────────────────────────────
let notificationsQueue = [];

app.post("/notify", async (req, res) => {
  const { body } = req.body;

  if (!body?.trim()) {
    return res.status(400).json({ success: false });
  }

  try {
    await client.messages.create({
      from: process.env.TWILIO_PHONE,
      to: process.env.GF_PHONE,
      body,
    });

    console.log("📩 SMS sent:", body);
    return res.json({ success: true });
  } catch (error) {
    console.error("❌ SMS error:", error.message);
    return res.status(500).json({ success: false });
  }
});

app.get("/notify-latest", (req, res) => {
  const next = notificationsQueue.shift() || null;
  res.json(next);
});

// ─────────────────────────────────────────
// 🧪 HEALTH CHECK
// ─────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Backend is running 🤍");
});

// ─────────────────────────────────────────
// ⏰ CRON JOBS (RENDER SAFE)
// ─────────────────────────────────────────
cron.schedule("0 6 * * *", async () => {
  try {
    await fetch(`${BASE_URL}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body:
          "Good morning 🤍 I hope today treats you gently. I’m always with you.",
      }),
    });
  } catch (err) {
    console.error("❌ Morning cron failed:", err);
  }
});

cron.schedule("0 23 * * *", async () => {
  try {
    await fetch(`${BASE_URL}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body:
          "Good night 🤍 You did enough today. Rest well, my love.",
      }),
    });
  } catch (err) {
    console.error("❌ Night cron failed:", err);
  }
});

// ─────────────────────────────────────────
// ✅ START SERVER (RENDER SAFE)
// ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
