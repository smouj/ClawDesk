const express = require("express");
const net = require("net");
const os = require("os");
const fs = require("fs");

const { detectBinary } = require("../openclaw/detectBinary");
const { runOpenClaw } = require("../openclaw/run");

const probeTcp = (host, port) =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    const socket = new net.Socket();
    const done = (ok, error) => {
      socket.destroy();
      resolve({
        ok,
        latency_ms: ok ? Date.now() - startedAt : null,
        error: error ? String(error.message || error) : null,
      });
    };
    socket.setTimeout(1500);
    socket.on("error", (err) => done(false, err));
    socket.on("timeout", () => done(false, new Error("timeout")));
    socket.connect(port, host, () => done(true));
  });

const detectWsl = () => {
  try {
    return fs.readFileSync("/proc/version", "utf-8").toLowerCase().includes("microsoft");
  } catch {
    return false;
  }
};

const createHealthRouter = ({ getProfile, createEnv, version } = {}) => {
  const router = express.Router();
  router.get("/health", async (req, res) => {
    const startedAt = Date.now();
    const detected = detectBinary();
    const payload = {
      status: "ok",
      time: new Date().toISOString(),
      version: version || "unknown",
      uptime_s: Math.round(process.uptime()),
      system: {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        hostname: os.hostname(),
        is_wsl: detectWsl(),
      },
      gateway: {
        ok: false,
        status: "unknown",
        latency_ms: null,
        binary: null,
      },
      openclaw: {
        detected: Boolean(detected?.path),
        binary: detected?.binary,
        path: detected?.path,
        version: null,
      },
    };

    if (getProfile && createEnv) {
      try {
        const profile = getProfile();
        const env = createEnv(profile);
        const tcp = await probeTcp(profile.bind, profile.port);
        const { stdout, binary } = await runOpenClaw(["gateway", "status"], { env, timeout: 3000 });
        payload.gateway = {
          ok: true,
          status: stdout.trim(),
          latency_ms: Date.now() - startedAt,
          binary,
          reachability: tcp,
          profile: {
            name: profile.name,
            bind: profile.bind,
            port: profile.port,
          },
          token_present: Boolean(profile.token),
        };
      } catch (error) {
        payload.gateway = {
          ok: false,
          status: "unreachable",
          latency_ms: Date.now() - startedAt,
          binary: detected.binary,
          error: error.message,
        };
      }
    }

    try {
      const { stdout } = await runOpenClaw(["--version"], { timeout: 2000 });
      payload.openclaw.version = stdout.trim();
    } catch (error) {
      payload.openclaw.error = error.message;
    }

    res.json(payload);
  });
  return router;
};

module.exports = { createHealthRouter };
