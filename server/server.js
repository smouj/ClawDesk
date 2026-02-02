const fs = require("fs");
const path = require("path");
const express = require("express");
const helmet = require("helmet");

const {
  CONFIG_PATH,
  loadConfig,
  ensureSecret,
  resolveGatewayConfig,
  rotateSecret
} = require("./config");
const { runOpenClaw, parseListOutput, resolveOpenClawBinary } = require("./openclaw");
const { writeSupportBundle } = require("./supportBundle");

const packageJson = require(path.join(__dirname, "..", "package.json"));

const allowedActions = new Set([
  "gateway.status",
  "gateway.logs",
  "gateway.probe",
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
  "secret.rotate"
]);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const extractAuthToken = (req) => {
  const header = req.header("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer") {
    return req.query?.token || null;
  }
  return token || null;
};

const safeId = (value) => /^[a-zA-Z0-9._:-]+$/.test(value || "");
const isLoopbackHost = (host) => ["127.0.0.1", "localhost", "::1"].includes(host);

const createServer = () => {
  const config = loadConfig();
  const secret = ensureSecret();
  const allowList = new Set(config.security?.allow_actions || []);
  const getGatewayConfig = () => resolveGatewayConfig({ config });
  const app = express();
  const appRoot = path.join(__dirname, "..", "app");

  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          fontSrc: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          imgSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"]
        }
      },
      crossOriginResourcePolicy: { policy: "same-origin" }
    })
  );
  app.use(express.json({ limit: "128kb" }));

  app.use((req, res, next) => {
    const hostHeader = req.hostname;
    if (hostHeader && !isLoopbackHost(hostHeader)) {
      return res.status(403).json({ error: "Host no permitido" });
    }
    const origin = req.headers.origin;
    if (origin) {
      try {
        const originHost = new URL(origin).hostname;
        if (!isLoopbackHost(originHost)) {
          return res.status(403).json({ error: "Origen no permitido" });
        }
      } catch (error) {
        return res.status(403).json({ error: "Origen inválido" });
      }
    }
    return next();
  });

  const rateBuckets = new Map();
  const rateLimit = (req, res, next) => {
    const key = req.ip || "unknown";
    const now = Date.now();
    const windowMs = 60_000;
    const limit = 120;
    const entry = rateBuckets.get(key) || { count: 0, reset: now + windowMs };
    if (now > entry.reset) {
      entry.count = 0;
      entry.reset = now + windowMs;
    }
    entry.count += 1;
    rateBuckets.set(key, entry);
    res.setHeader("X-RateLimit-Limit", limit);
    res.setHeader("X-RateLimit-Remaining", Math.max(limit - entry.count, 0));
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.reset / 1000));
    if (entry.count > limit) {
      return res.status(429).json({ error: "Rate limit excedido" });
    }
    return next();
  };

  const apiAuth = (req, res, next) => {
    const token = extractAuthToken(req);
    if (!token || token !== secret) {
      return res.status(401).json({ error: "No autorizado" });
    }
    return next();
  };

  const requireAction = (action) => {
    if (!allowedActions.has(action)) {
      return false;
    }
    return allowList.has(action);
  };

  const getOpenclawEnv = () => {
    const gatewayConfig = getGatewayConfig();
    const gatewayToken = gatewayConfig.token;
    const env = { OPENCLAW_GATEWAY_PORT: String(gatewayConfig.port) };
    if (gatewayToken) {
      return { ...env, OPENCLAW_GATEWAY_TOKEN: gatewayToken };
    }
    return env;
  };

  const serveIndex = (req, res) => {
    const htmlPath = path.join(appRoot, "index.html");
    const html = fs.readFileSync(htmlPath, "utf-8");
    const withToken = html.replace("__CLAWDESK_TOKEN__", secret);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(withToken);
  };

  app.get("/", serveIndex);
  app.get("/index.html", serveIndex);
  app.use(express.static(appRoot, { maxAge: "1h" }));

  app.get("/api/health", apiAuth, rateLimit, (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.get("/api/config", apiAuth, rateLimit, (req, res) => {
    const gatewayConfig = getGatewayConfig();
    const tokenPresent = Boolean(gatewayConfig.token);
    res.json({
      app: {
        host: config.app.host,
        port: config.app.port
      },
      gateway: {
        url: gatewayConfig.url,
        bind: gatewayConfig.bind,
        port: gatewayConfig.port,
        token_path: config.gateway.token_path,
        token_present: tokenPresent,
        token_source: gatewayConfig.tokenSource,
        port_source: gatewayConfig.portSource
      },
      allow_actions: Array.from(allowList)
    });
  });

  app.get("/api/openclaw/version", apiAuth, rateLimit, async (req, res) => {
    try {
      const { stdout } = await runOpenClaw(["--version"], { env: getOpenclawEnv() });
      const resolved = resolveOpenClawBinary();
      res.json({ version: stdout.trim(), binary: resolved.binary });
    } catch (error) {
      res.status(503).json({ error: "openclaw no encontrado", detail: error.message });
    }
  });

  app.get("/api/gateway/status", apiAuth, rateLimit, async (req, res) => {
    if (!requireAction("gateway.status")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    try {
      const { stdout } = await runOpenClaw(["gateway", "status"], { env: getOpenclawEnv() });
      res.json({ status: stdout.trim() });
    } catch (error) {
      try {
        const { stdout } = await runOpenClaw(["status", "--all"], { env: getOpenclawEnv() });
        res.json({ status: stdout.trim(), fallback: true });
      } catch (fallbackError) {
        res.status(503).json({ error: "No se pudo obtener estado del gateway", detail: fallbackError.message });
      }
    }
  });

  app.get("/api/gateway/control-url", apiAuth, rateLimit, async (req, res) => {
    const gatewayConfig = getGatewayConfig();
    const fallbackUrl = `http://${gatewayConfig.bind}:${gatewayConfig.port}/`;
    try {
      const { stdout } = await runOpenClaw(["dashboard"], { env: getOpenclawEnv() });
      const match = stdout.match(/https?:\/\/[^\s]+/i);
      res.json({ url: match ? match[0] : fallbackUrl, fallback: !match });
    } catch (error) {
      res.json({ url: fallbackUrl, fallback: true });
    }
  });

  app.get("/api/agents", apiAuth, rateLimit, async (req, res) => {
    if (!requireAction("agent.list")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    try {
      const { stdout } = await runOpenClaw(["agent", "list"], { env: getOpenclawEnv() });
      const items = parseListOutput(stdout);
      res.json({ agents: items, raw: stdout.trim() });
    } catch (error) {
      res.status(503).json({ error: "No se pudieron listar agentes", detail: error.message });
    }
  });

  app.post("/api/agents/:id/:action", apiAuth, rateLimit, async (req, res) => {
    const { id, action } = req.params;
    if (!safeId(id)) {
      return res.status(400).json({ error: "ID de agente inválido" });
    }
    const actionKey = `agent.${action}`;
    if (!requireAction(actionKey)) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    if (!["start", "stop", "restart"].includes(action)) {
      return res.status(400).json({ error: "Acción inválida" });
    }
    try {
      const { stdout } = await runOpenClaw(["agent", action, id], { env: getOpenclawEnv() });
      res.json({ result: stdout.trim() || "ok" });
    } catch (error) {
      res.status(503).json({ error: "No se pudo ejecutar la acción", detail: error.message });
    }
  });

  app.get("/api/skills", apiAuth, rateLimit, async (req, res) => {
    if (!requireAction("skills.list")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    try {
      const { stdout } = await runOpenClaw(["skills", "list"], { env: getOpenclawEnv() });
      const items = parseListOutput(stdout);
      res.json({ skills: items, raw: stdout.trim() });
    } catch (error) {
      res.status(503).json({ error: "No se pudieron listar skills", detail: error.message });
    }
  });

  app.post("/api/skills/:id/:action", apiAuth, rateLimit, async (req, res) => {
    const { id, action } = req.params;
    if (!safeId(id)) {
      return res.status(400).json({ error: "ID de skill inválido" });
    }
    const actionKey = `skills.${action}`;
    if (!requireAction(actionKey)) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    if (!["enable", "disable"].includes(action)) {
      return res.status(400).json({ error: "Acción inválida" });
    }
    try {
      const { stdout } = await runOpenClaw(["skills", action, id], { env: getOpenclawEnv() });
      res.json({ result: stdout.trim() || "ok" });
    } catch (error) {
      res.status(503).json({ error: "No se pudo ejecutar la acción", detail: error.message });
    }
  });

  app.get("/api/logs", apiAuth, rateLimit, async (req, res) => {
    if (!requireAction("gateway.logs")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const tail = clamp(Number(req.query.tail || 200), 1, 1000);
    try {
      const { stdout } = await runOpenClaw(["gateway", "logs", "--tail", String(tail)], { env: getOpenclawEnv() });
      const lines = stdout.split("\n").map((line) => line.trim()).filter(Boolean);
      res.json({ lines, raw: stdout.trim() });
    } catch (error) {
      res.status(503).json({ error: "No se pudieron obtener logs", detail: error.message });
    }
  });

  app.get("/api/logs/stream", apiAuth, rateLimit, async (req, res) => {
    if (!requireAction("gateway.logs")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const tail = clamp(Number(req.query.tail || 120), 1, 300);
    const intervalMs = clamp(Number(req.query.interval || config.observability?.log_poll_ms || 1500), 800, 8000);
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
        const { stdout } = await runOpenClaw(["gateway", "logs", "--tail", String(tail)], { env: getOpenclawEnv() });
        const lines = stdout.split("\n").map((line) => line.trim()).filter(Boolean);
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

  app.get("/api/gateway/probe", apiAuth, rateLimit, async (req, res) => {
    if (!requireAction("gateway.probe")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    try {
      const { stdout } = await runOpenClaw(["gateway", "probe", "--json"], { env: getOpenclawEnv() });
      const trimmed = stdout.trim();
      const parsed = trimmed ? JSON.parse(trimmed) : [];
      res.json({ gateways: parsed, raw: trimmed });
    } catch (error) {
      try {
        const { stdout } = await runOpenClaw(["gateway", "probe"], { env: getOpenclawEnv() });
        res.json({ gateways: parseListOutput(stdout), raw: stdout.trim(), fallback: true });
      } catch (fallbackError) {
        res.status(503).json({ error: "No se pudo ejecutar probe", detail: fallbackError.message });
      }
    }
  });

  ["start", "stop", "restart"].forEach((action) => {
    app.post(`/api/gateway/${action}`, apiAuth, rateLimit, async (req, res) => {
      if (!requireAction(`gateway.${action}`)) {
        return res.status(403).json({ error: "Acción no permitida" });
      }
      try {
        const { stdout } = await runOpenClaw(["gateway", action], { env: getOpenclawEnv() });
        res.json({ result: stdout.trim() || "ok" });
      } catch (error) {
        res.status(503).json({ error: "No se pudo ejecutar la acción", detail: error.message });
      }
    });
  });

  app.post("/api/secret/rotate", apiAuth, rateLimit, (req, res) => {
    if (!requireAction("secret.rotate")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    rotateSecret();
    res.json({ status: "ok" });
  });

  app.post("/api/support-bundle", apiAuth, rateLimit, async (req, res) => {
    if (!requireAction("support.bundle")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const gatewayToken = getGatewayConfig().token;
    const env = getOpenclawEnv();
    let statusAll = "openclaw status --all: no disponible";
    let logs = "openclaw gateway logs: no disponible";
    try {
      const statusResp = await runOpenClaw(["status", "--all"], { env });
      statusAll = statusResp.stdout;
    } catch (error) {
      statusAll = `error: ${error.message}`;
    }
    try {
      const logsResp = await runOpenClaw(["gateway", "logs", "--tail", "200"], { env });
      logs = logsResp.stdout;
    } catch (error) {
      logs = `error: ${error.message}`;
    }

    const configRaw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const secrets = [gatewayToken, process.env.OPENCLAW_GATEWAY_TOKEN, secret];
    const { bundlePath, tempDir } = await writeSupportBundle({
      clawdeskVersion: packageJson.version,
      config,
      configRaw,
      statusAll,
      logs,
      secrets
    });
    const filename = `clawdesk-support-bundle-${new Date().toISOString().slice(0, 10)}.tar.gz`;
    res.setHeader("Content-Type", "application/gzip");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    fs.createReadStream(bundlePath)
      .on("close", async () => {
        fs.rmSync(tempDir, { recursive: true, force: true });
      })
      .pipe(res);
  });

  app.use((err, req, res, next) => {
    const message = err && err.message ? err.message : "Error inesperado";
    res.status(500).json({ error: message });
  });

  return { app, config, secret };
};

module.exports = { createServer };
