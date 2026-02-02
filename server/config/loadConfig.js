const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { ensureDir, readFileIfExists, writeFileSafe } = require("../utils/fsSafe");
const { readJson, writeJson } = require("../utils/jsonSafe");
const { validateConfig } = require("./validateConfig");

const HOME_DIR = os.homedir();
const CONFIG_DIR = process.env.CLAWDESK_CONFIG_DIR || path.join(HOME_DIR, ".config", "clawdesk");
const CONFIG_PATH = process.env.CLAWDESK_CONFIG_PATH || path.join(CONFIG_DIR, "config.json");
const SECRET_PATH = process.env.CLAWDESK_SECRET_PATH || path.join(CONFIG_DIR, "secret");
const PID_PATH = process.env.CLAWDESK_PID_PATH || path.join(CONFIG_DIR, "clawdesk.pid");
const LOG_PATH = process.env.CLAWDESK_LOG_PATH || path.join(CONFIG_DIR, "clawdesk.log");
const EVENTS_PATH = process.env.CLAWDESK_EVENTS_PATH || path.join(CONFIG_DIR, "events.jsonl");
const USAGE_PATH = process.env.CLAWDESK_USAGE_PATH || path.join(CONFIG_DIR, "usage.jsonl");

const DEFAULT_CONFIG = {
  configVersion: 3,
  app: {
    host: "127.0.0.1",
    port: 4178,
  },
  profiles: {
    local: {
      name: "local",
      bind: "127.0.0.1",
      port: 18789,
      token_path: path.join(HOME_DIR, ".config", "openclaw", "gateway.auth.token"),
      auth: {
        token: "",
      },
    },
  },
  activeProfile: "local",
  security: {
    allow_actions: [
      "gateway.status",
      "gateway.logs",
      "gateway.probe",
      "gateway.dashboard",
      "gateway.start",
      "gateway.stop",
      "gateway.restart",
      "agents.list",
      "agents.create",
      "agents.default",
      "agents.rename",
      "agents.delete",
      "agents.import",
      "agents.export",
      "skills.list",
      "skills.refresh",
      "skills.toggle",
      "config.read",
      "config.write",
      "openclaw.doctor",
      "openclaw.audit",
      "openclaw.audit.deep",
      "support.bundle",
      "secret.rotate",
      "profiles.read",
      "profiles.activate",
      "profiles.write",
      "profiles.delete",
      "macros.read",
      "macros.run",
      "macros.write",
      "usage.read",
      "usage.export",
      "events.read",
    ],
    enableRemoteProfiles: false,
    allowedRemoteHosts: [],
    allowedOrigins: [],
  },
  macros: {},
  observability: {
    log_poll_ms: 1500,
    backoff_max_ms: 8000,
  },
};

const ensureSecret = () => {
  ensureDir(CONFIG_DIR);
  if (!readFileIfExists(SECRET_PATH)) {
    const secret = crypto.randomBytes(32).toString("hex");
    writeFileSafe(SECRET_PATH, secret);
    return secret;
  }
  return readFileIfExists(SECRET_PATH)?.trim();
};

const rotateSecret = () => {
  ensureDir(CONFIG_DIR);
  const secret = crypto.randomBytes(32).toString("hex");
  writeFileSafe(SECRET_PATH, secret);
  return secret;
};

const mergeProfiles = (raw) => {
  if (raw.profiles && typeof raw.profiles === "object") {
    return raw.profiles;
  }
  if (raw.gateway) {
    return {
      local: {
        name: "local",
        bind: raw.gateway.bind || DEFAULT_CONFIG.profiles.local.bind,
        port: raw.gateway.port || DEFAULT_CONFIG.profiles.local.port,
        token_path: raw.gateway.token_path || DEFAULT_CONFIG.profiles.local.token_path,
        auth: {
          token: raw.gateway.auth?.token || "",
        },
      },
    };
  }
  return DEFAULT_CONFIG.profiles;
};

const loadConfig = () => {
  ensureDir(CONFIG_DIR);
  const rawConfig = readJson(CONFIG_PATH);
  if (!rawConfig) {
    writeJson(CONFIG_PATH, DEFAULT_CONFIG);
  }
  const source = rawConfig || DEFAULT_CONFIG;
  const config = {
    ...DEFAULT_CONFIG,
    ...source,
    app: {
      ...DEFAULT_CONFIG.app,
      ...(source.app || {}),
    },
    profiles: mergeProfiles(source),
    activeProfile: source.activeProfile || DEFAULT_CONFIG.activeProfile,
    security: {
      ...DEFAULT_CONFIG.security,
      ...(source.security || {}),
    },
    macros: {
      ...(DEFAULT_CONFIG.macros || {}),
      ...(source.macros || {}),
    },
    observability: {
      ...DEFAULT_CONFIG.observability,
      ...(source.observability || {}),
    },
  };

  return validateConfig(config);
};

module.exports = {
  CONFIG_DIR,
  CONFIG_PATH,
  SECRET_PATH,
  PID_PATH,
  LOG_PATH,
  EVENTS_PATH,
  USAGE_PATH,
  DEFAULT_CONFIG,
  loadConfig,
  ensureSecret,
  rotateSecret,
};
