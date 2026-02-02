import { test } from "node:test";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "clawdesk-smoke-"));
const configPath = path.join(tempDir, "config.json");
const secretPath = path.join(tempDir, "secret");

process.env.CLAWDESK_CONFIG_PATH = configPath;
process.env.CLAWDESK_SECRET_PATH = secretPath;
process.env.CLAWDESK_CONFIG_DIR = tempDir;
process.env.CLAWDESK_PID_PATH = path.join(tempDir, "clawdesk.pid");
process.env.CLAWDESK_LOG_PATH = path.join(tempDir, "clawdesk.log");
process.env.CLAWDESK_EVENTS_PATH = path.join(tempDir, "events.jsonl");
process.env.CLAWDESK_USAGE_PATH = path.join(tempDir, "usage.jsonl");

const require = createRequire(import.meta.url);
const { createServer } = require("../server/server");

const getAvailablePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1");
    server.on("listening", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });

const waitForHealth = ({ host, port, secret, timeoutMs = 10_000, intervalMs = 300 }) =>
  new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      const req = http.request(
        {
          hostname: host,
          port,
          path: "/api/health",
          method: "GET",
          headers: { Authorization: `Bearer ${secret}` },
        },
        (res) => {
          if (res.statusCode === 200) {
            res.resume();
            return resolve();
          }
          res.resume();
          if (Date.now() - started > timeoutMs) {
            return reject(new Error(`Health check failed: ${res.statusCode}`));
          }
          return setTimeout(check, intervalMs);
        }
      );
      req.on("error", (error) => {
        if (Date.now() - started > timeoutMs) {
          return reject(error);
        }
        return setTimeout(check, intervalMs);
      });
      req.end();
    };
    check();
  });

const createConfig = (port) => ({
  configVersion: 3,
  app: { host: "127.0.0.1", port },
  profiles: {
    local: {
      name: "local",
      bind: "127.0.0.1",
      port: 18789,
      token_path: "/tmp/does-not-exist",
      auth: { token: "" },
    },
  },
  activeProfile: "local",
  security: {
    allow_actions: ["gateway.status", "gateway.logs", "usage.read", "events.read"],
    enableRemoteProfiles: false,
    allowedRemoteHosts: [],
  },
  observability: { log_poll_ms: 1500, backoff_max_ms: 8000 },
});

const closeServer = (server) => new Promise((resolve) => server.close(resolve));

const cleanup = () => {
  fs.rmSync(tempDir, { recursive: true, force: true });
};

test("smoke: responds to /api/health", async () => {
  const port = await getAvailablePort();
  const config = createConfig(port);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  fs.writeFileSync(secretPath, "smoke-secret");

  const { app } = createServer();
  const server = app.listen(config.app.port, config.app.host);

  try {
    await new Promise((resolve) => server.on("listening", resolve));
    await waitForHealth({ host: config.app.host, port, secret: "smoke-secret" });
  } finally {
    await closeServer(server);
    cleanup();
  }
});
