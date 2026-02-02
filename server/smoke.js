const fs = require("fs");
const path = require("path");
const os = require("os");
const http = require("http");

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

const { createServer } = require("./server");

const config = {
  configVersion: 3,
  app: { host: "127.0.0.1", port: 5180 },
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
};
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
fs.writeFileSync(secretPath, "smoke-secret");

const { app } = createServer();
const server = app.listen(config.app.port, config.app.host, () => {
  const options = {
    hostname: config.app.host,
    port: config.app.port,
    path: "/api/health",
    method: "GET",
    headers: { Authorization: "Bearer smoke-secret" },
  };
  const req = http.request(options, (res) => {
    if (res.statusCode !== 200) {
      console.error(`Smoke test failed: ${res.statusCode}`);
      process.exit(1);
    }
    res.on("data", () => {});
    res.on("end", () => {
      server.close(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log("Smoke test OK");
      });
    });
  });
  req.on("error", (error) => {
    console.error(error.message);
    process.exit(1);
  });
  req.end();
});
