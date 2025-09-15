import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());

// Für SDP als reinen Text (Offer) – genau das erwartet ElevenLabs
app.use("/api/eleven/webrtc", express.text({ type: "application/sdp", limit: "5mb" }));

// Statische Dateien (dein Frontend)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, "public"))); // wenn dein Frontend unter /public liegt

// Proxy-Route: Browser -> (du) -> ElevenLabs -> (du) -> Browser
const ELEVEN_WERTC_URL = "https://api.elevenlabs.io/v1/convai/conversations/webrtc";

/**
 * POST /api/eleven/webrtc?agent_id=....
 * Body: SDP-Offer (Content-Type: application/sdp)
 */
app.post("/api/eleven/webrtc", async (req, res) => {
  try {
    const { agent_id } = req.query;
    if (!agent_id) return res.status(400).send("agent_id missing");

    const headers = { "Content-Type": "application/sdp" };

    // Falls dein Agent PRIVAT ist, hier dein Conversation-Token hinzufügen:
    // headers.Authorization = `Bearer ${process.env.ELEVEN_CONV_TOKEN}`;

    const r = await fetch(`${ELEVEN_WERTC_URL}?agent_id=${encodeURIComponent(agent_id)}`, {
      method: "POST",
      headers,
      body: req.body
    });

    const answer = await r.text(); // ElevenLabs liefert die SDP-Answer im Body zurück
    res.status(r.status).set("Content-Type", "application/sdp").send(answer);
  } catch (e) {
    console.error(e);
    res.status(500).send(String(e));
  }
});

// Fallback auf index.html (optional)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
