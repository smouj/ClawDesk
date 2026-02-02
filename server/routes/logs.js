const express = require("express");
const { runOpenClaw } = require("../openclaw/run");
const { redactText } = require("../security/redaction");

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const createLogsRouter = ({ requireAction, getProfile, createEnv, secrets, config }) => {
  const router = express.Router();

  router.get("/logs", async (req, res) => {
    if (!requireAction("gateway.logs")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const tail = clamp(Number(req.query.tail || 200), 1, 1000);
    try {
      const profile = getProfile();
      const env = createEnv(profile);
      const { stdout } = await runOpenClaw(["gateway", "logs", "--tail", String(tail)], { env });
      const redacted = redactText(stdout, secrets);
      const lines = redacted
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      res.json({ lines, raw: redacted.trim() });
    } catch (error) {
      res.status(503).json({ error: "No se pudieron obtener logs", detail: error.message });
    }
  });

  router.get("/logs/stream", async (req, res) => {
    if (!requireAction("gateway.logs")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const tail = clamp(Number(req.query.tail || 120), 1, 300);
    const intervalMs = clamp(
      Number(req.query.interval || config.observability?.log_poll_ms || 1500),
      800,
      8000
    );
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let closed = false;
    const sendEvent = (event, data) => {
      if (closed) return;
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const sendHeartbeat = () => {
      if (closed) return;
      res.write(`event: heartbeat\n`);
      res.write(`data: {}\n\n`);
    };

    const pollLogs = async () => {
      try {
        const profile = getProfile();
        const env = createEnv(profile);
        const { stdout } = await runOpenClaw(["gateway", "logs", "--tail", String(tail)], { env });
        const redacted = redactText(stdout, secrets);
        const lines = redacted
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        sendEvent("logs", { lines });
      } catch (error) {
        sendEvent("error", { message: error.message });
      }
    };

    const interval = setInterval(pollLogs, intervalMs);
    const heartbeat = setInterval(sendHeartbeat, 10_000);
    await pollLogs();

    req.on("close", () => {
      closed = true;
      clearInterval(interval);
      clearInterval(heartbeat);
      res.end();
    });
  });

  return router;
};

module.exports = { createLogsRouter };
