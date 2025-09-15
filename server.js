import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// 1) CORS (optional) & Static
app.use(cors());
const PUBLIC_DIR = path.join(__dirname, "public");
app.use(express.static(PUBLIC_DIR));

// 2) Healthcheck (für Render Settings → Health)
app.get("/healthz", (req, res) => res.status(200).send("ok"));

// 3) ElevenLabs WebRTC Proxy
app.use("/api/eleven/webrtc", express.text({ type: "application/sdp", limit: "5mb" }));
app.post("/api/eleven/webrtc", async (req, res) => {
  try {
    const agentId = req.query.agent_id;
    if (!agentId) return res.status(400).send("agent_id missing");

    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/webrtc?agent_id=${encodeURIComponent(agentId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: req.body
      }
    );

    const answer = await upstream.text();
    res.status(upstream.status).set("Content-Type", "application/sdp").send(answer);
  } catch (e) {
    console.error("Proxy error:", e);
    res.status(500).send(String(e));
  }
});

// 4) Root & Fallback – mit sauberem Fehlerhandling
app.get("/", (req, res) => {
  const idx = path.join(PUBLIC_DIR, "index.html");
  res.sendFile(idx, (err) => {
    if (err) {
      console.error("sendFile / index.html error:", err);
      res
        .status(500)
        .send("index.html not found under /public. Please add public/index.html");
    }
  });
});

app.get("*", (req, res) => {
  const idx = path.join(PUBLIC_DIR, "index.html");
  res.sendFile(idx, (err) => {
    if (err) {
      console.error("Fallback sendFile error:", err);
      res.status(404).send("Not Found");
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
