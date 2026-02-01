const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const HOME_DIR = os.homedir();
const CONFIG_DIR = process.env.CLAWDESK_CONFIG_DIR || path.join(HOME_DIR, ".config", "clawdesk");
const CONFIG_PATH = process.env.CLAWDESK_CONFIG_PATH || path.join(CONFIG_DIR, "config.json");
const SECRET_PATH = process.env.CLAWDESK_SECRET_PATH || path.join(CONFIG_DIR, "secret");
const PID_PATH = process.env.CLAWDESK_PID_PATH || path.join(CONFIG_DIR, "clawdesk.pid");
const LOG_PATH = process.env.CLAWDESK_LOG_PATH || path.join(CONFIG_DIR, "clawdesk.log");

const DEFAULT_CONFIG = {
  configVersion: 2,
  app: {
    host: "127.0.0.1",
    port: 4178,
    theme: "dark"
  },
  gateway: {
    url: "http://127.0.0.1:18789",
    token_path: path.join(HOME_DIR, ".config", "openclaw", "gateway.auth.token")
  },
  security: {
    allow_actions: [
      "gateway.status",
      "gateway.logs",
      "agent.list",
      "agent.start",
      "agent.stop",
      "agent.restart",
      "skills.list",
      "skills.enable",
      "skills.disable",
      "support.bundle"
    ]
  },
  observability: {
    log_poll_ms: 1500,
    backoff_max_ms: 8000
  }
};

const ensureDirectory = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
};

const loadConfig = () => {
  ensureDirectory(CONFIG_DIR);
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), { mode: 0o600 });
  }
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  const config = JSON.parse(raw);
  const host = config.app?.host || DEFAULT_CONFIG.app.host;
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error("ClawDesk solo puede enlazarse a 127.0.0.1/localhost por seguridad.");
  }
  const port = Number(config.app?.port || DEFAULT_CONFIG.app.port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("El puerto configurado debe estar entre 1024 y 65535.");
  }
  return {
    ...DEFAULT_CONFIG,
    ...config,
    app: {
      ...DEFAULT_CONFIG.app,
      ...(config.app || {}),
      port,
      host
    },
    gateway: {
      ...DEFAULT_CONFIG.gateway,
      ...(config.gateway || {})
    },
    security: {
      ...DEFAULT_CONFIG.security,
      ...(config.security || {})
    },
    observability: {
      ...DEFAULT_CONFIG.observability,
      ...(config.observability || {})
    }
  };
};

const ensureSecret = () => {
  ensureDirectory(CONFIG_DIR);
  if (!fs.existsSync(SECRET_PATH)) {
    const secret = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(SECRET_PATH, secret, { mode: 0o600 });
    return secret;
  }
  return fs.readFileSync(SECRET_PATH, "utf-8").trim();
};

const readGatewayToken = (tokenPath) => {
  if (!tokenPath) {
    return null;
  }
  try {
    const token = fs.readFileSync(tokenPath, "utf-8").trim();
    return token || null;
  } catch (error) {
    return null;
  }
};

const redactText = (text, secrets = []) => {
  let output = text;
  secrets.filter(Boolean).forEach((secret) => {
    output = output.split(secret).join("[redacted]");
  });
  output = output.replace(/(token|secret|password)\s*[:=]\s*[^\s]+/gi, "$1:[redacted]");
  return output;
};

module.exports = {
  CONFIG_DIR,
  CONFIG_PATH,
  SECRET_PATH,
  PID_PATH,
  LOG_PATH,
  DEFAULT_CONFIG,
  loadConfig,
  ensureSecret,
  readGatewayToken,
  redactText
};
