const fs = require("fs");
const path = require("path");
const express = require("express");
const helmet = require("helmet");

const {
  CONFIG_PATH,
  loadConfig,
  ensureSecret,
  readGatewayToken
} = require("./config");
const { runOpenClaw, parseListOutput } = require("./openclaw");
const { writeSupportBundle } = require("./supportBundle");

const packageJson = require(path.join(__dirname, "..", "package.json"));

const allowedActions = new Set([
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
]);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const extractAuthToken = (req) => {
  const header = req.header("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer") {
    return null;
  }
  return token || null;
};

const safeId = (value) => /^[a-zA-Z0-9._:-]+$/.test(value || "");

const createServer = () => {
  const config = loadConfig();
  const secret = ensureSecret();
  const allowList = new Set(config.security?.allow_actions || []);
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
  app.use(express.json({ limit: "256kb" }));

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
    const gatewayToken = readGatewayToken(config.gateway?.token_path);
    if (gatewayToken) {
      return { OPENCLAW_GATEWAY_TOKEN: gatewayToken };
    }
    return {};
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

  app.get("/api/health", apiAuth, (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.get("/api/config", apiAuth, (req, res) => {
    const tokenPresent = Boolean(readGatewayToken(config.gateway?.token_path) || process.env.OPENCLAW_GATEWAY_TOKEN);
    res.json({
      app: {
        host: config.app.host,
        port: config.app.port
      },
      gateway: {
        url: config.gateway.url,
        token_path: config.gateway.token_path,
        token_present: tokenPresent
      },
      allow_actions: Array.from(allowList)
    });
  });

  app.get("/api/openclaw/version", apiAuth, async (req, res) => {
    try {
      const { stdout } = await runOpenClaw(["--version"], { env: getOpenclawEnv() });
      res.json({ version: stdout.trim() });
    } catch (error) {
      res.status(503).json({ error: "openclaw no encontrado", detail: error.message });
    }
  });

  app.get("/api/gateway/status", apiAuth, async (req, res) => {
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

  app.get("/api/gateway/control-url", apiAuth, async (req, res) => {
    const fallbackUrl = "http://127.0.0.1:18789/";
    try {
      const { stdout } = await runOpenClaw(["dashboard"], { env: getOpenclawEnv() });
      const match = stdout.match(/https?:\/\/[^\s]+/i);
      res.json({ url: match ? match[0] : fallbackUrl, fallback: !match });
    } catch (error) {
      res.json({ url: fallbackUrl, fallback: true });
    }
  });

  app.get("/api/agents", apiAuth, async (req, res) => {
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

  app.post("/api/agents/:id/:action", apiAuth, async (req, res) => {
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

  app.get("/api/skills", apiAuth, async (req, res) => {
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

  app.post("/api/skills/:id/:action", apiAuth, async (req, res) => {
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

  app.get("/api/logs", apiAuth, async (req, res) => {
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

  app.post("/api/support-bundle", apiAuth, async (req, res) => {
    if (!requireAction("support.bundle")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const gatewayToken = readGatewayToken(config.gateway?.token_path);
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
