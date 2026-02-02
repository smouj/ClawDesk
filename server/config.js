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
    theme: "dark",
  },
  gateway: {
    url: "http://127.0.0.1:18789",
    bind: "127.0.0.1",
    port: 18789,
    token_path: path.join(HOME_DIR, ".config", "openclaw", "gateway.auth.token"),
    auth: {
      token: "",
    },
  },
  security: {
    allow_actions: [
      "gateway.status",
      "gateway.logs",
      "gateway.probe",
      "gateway.dashboard",
      "gateway.start",
      "gateway.stop",
      "gateway.restart",
      "agent.list",
      "agent.start",
      "agent.stop",
      "agent.restart",
      "skills.list",
      "skills.enable",
      "skills.disable",
      "support.bundle",
      "secret.rotate",
    ],
  },
  observability: {
    log_poll_ms: 1500,
    backoff_max_ms: 8000,
  },
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
  const gatewayBind = config.gateway?.bind || DEFAULT_CONFIG.gateway.bind;
  if (gatewayBind !== "127.0.0.1" && gatewayBind !== "localhost" && gatewayBind !== "::1") {
    throw new Error("El gateway debe enlazarse a loopback por seguridad.");
  }
  const gatewayPort = Number(config.gateway?.port || DEFAULT_CONFIG.gateway.port);
  if (!Number.isInteger(gatewayPort) || gatewayPort < 1024 || gatewayPort > 65535) {
    throw new Error("El puerto del gateway debe estar entre 1024 y 65535.");
  }
  const gatewayUrl = config.gateway?.url || `http://${gatewayBind}:${gatewayPort}`;

  return {
    ...DEFAULT_CONFIG,
    ...config,
    app: {
      ...DEFAULT_CONFIG.app,
      ...(config.app || {}),
      port,
      host,
    },
    gateway: {
      ...DEFAULT_CONFIG.gateway,
      ...(config.gateway || {}),
      bind: gatewayBind,
      port: gatewayPort,
      url: gatewayUrl,
      auth: {
        ...DEFAULT_CONFIG.gateway.auth,
        ...(config.gateway?.auth || {}),
      },
    },
    security: {
      ...DEFAULT_CONFIG.security,
      ...(config.security || {}),
    },
    observability: {
      ...DEFAULT_CONFIG.observability,
      ...(config.observability || {}),
    },
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

const rotateSecret = () => {
  ensureDirectory(CONFIG_DIR);
  const secret = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(SECRET_PATH, secret, { mode: 0o600 });
  return secret;
};

const readGatewayToken = (tokenPath) => {
  if (!tokenPath) {
    return null;
  }
  try {
    const token = fs.readFileSync(tokenPath, "utf-8").trim();
    return token || null;
  } catch {
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

const resolveGatewayConfig = ({ config, env = process.env, flags = {} } = {}) => {
  const resolvedConfig = config || loadConfig();
  const normalizePort = (value) => {
    const port = Number(value);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      return null;
    }
    return port;
  };
  const portFromFlags = normalizePort(flags.port);
  const envPort = normalizePort(env.OPENCLAW_GATEWAY_PORT);
  const configPort = normalizePort(resolvedConfig.gateway?.port);
  const port = portFromFlags ?? envPort ?? configPort ?? 18789;
  const portSource = portFromFlags ? "flag" : envPort ? "env" : configPort ? "config" : "default";

  const tokenFromFile = readGatewayToken(resolvedConfig.gateway?.token_path);
  const token =
    flags.token ||
    env.OPENCLAW_GATEWAY_TOKEN ||
    resolvedConfig.gateway?.auth?.token ||
    tokenFromFile;
  const tokenSource = flags.token
    ? "flag"
    : env.OPENCLAW_GATEWAY_TOKEN
      ? "env"
      : resolvedConfig.gateway?.auth?.token
        ? "config"
        : tokenFromFile
          ? "file"
          : "missing";

  const bind = resolvedConfig.gateway?.bind || "127.0.0.1";
  const url = `http://${bind}:${port}`;

  return {
    port,
    portSource,
    token,
    tokenSource,
    bind,
    url,
  };
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
  rotateSecret,
  readGatewayToken,
  redactText,
  resolveGatewayConfig,
};
