const express = require("express");

const { detectBinary } = require("../openclaw/detectBinary");
const { runOpenClaw } = require("../openclaw/run");

const createHealthRouter = ({ getProfile, createEnv, version } = {}) => {
  const router = express.Router();
  router.get("/health", async (req, res) => {
    const startedAt = Date.now();
    const payload = {
      status: "ok",
      time: new Date().toISOString(),
      version: version || "unknown",
      uptime_s: Math.round(process.uptime()),
      gateway: {
        ok: false,
        status: "unknown",
        latency_ms: null,
        binary: null,
      },
    };

    if (getProfile && createEnv) {
      try {
        const profile = getProfile();
        const env = createEnv(profile);
        const { stdout, binary } = await runOpenClaw(["gateway", "status"], { env, timeout: 3000 });
        payload.gateway = {
          ok: true,
          status: stdout.trim(),
          latency_ms: Date.now() - startedAt,
          binary,
          profile: {
            name: profile.name,
            bind: profile.bind,
            port: profile.port,
          },
        };
      } catch (error) {
        payload.gateway = {
          ok: false,
          status: "unreachable",
          latency_ms: Date.now() - startedAt,
          binary: detectBinary().binary,
          error: error.message,
        };
      }
    }

    res.json(payload);
  });
  return router;
};

module.exports = { createHealthRouter };
