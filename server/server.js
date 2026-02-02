const fs = require("fs");
const path = require("path");
const express = require("express");
const helmet = require("helmet");

const { loadConfig, LOG_PATH, EVENTS_PATH } = require("./config/loadConfig");
const { resolveProfile } = require("./gateway/resolveProfile");
const { detectBinary } = require("./openclaw/detectBinary");
const { runOpenClaw } = require("./openclaw/run");
const { rateLimit } = require("./security/rateLimit");
const { hostAllowlist } = require("./security/hostAllowlist");
const { createCorsAllowlist } = require("./security/cors");
const { createAuth } = require("./security/auth");
const { redactText } = require("./security/redaction");
const { createEventLogger } = require("./events/log");
const { createLogger } = require("./utils/logger");
const { createHealthRouter } = require("./routes/health");
const { createProfilesRouter } = require("./routes/profiles");
const { createGatewayRouter } = require("./routes/gateway");
const { createUsageRouter } = require("./routes/usage");
const { createMacrosRouter } = require("./routes/macros");
const { createEventsRouter } = require("./routes/events");
const { createLogsRouter } = require("./routes/logs");
const { createConfigRouter } = require("./routes/config");
const { createAgentsRouter } = require("./routes/agents");
const { createSkillsRouter } = require("./routes/skills");
const { createDoctorRouter } = require("./routes/doctor");

const packageJson = require(path.join(__dirname, "..", "package.json"));

const createServer = () => {
  const config = loadConfig();
  const app = express();
  const appRoot = path.join(__dirname, "..", "app");
  const { secret, middleware: apiAuth } = createAuth();

  const requireAction = (action) => {
    const latest = loadConfig();
    return latest.security.allow_actions.includes(action);
  };

  const getProfile = () => resolveProfile({ config: loadConfig() });

  const createEnv = (profile) => {
    const env = { OPENCLAW_GATEWAY_PORT: String(profile.port) };
    if (profile.token) {
      env.OPENCLAW_GATEWAY_TOKEN = profile.token;
    }
    return env;
  };

  const getSecrets = (profile) => [profile?.token, secret, process.env.OPENCLAW_GATEWAY_TOKEN];

  const logger = createLogger(getSecrets(getProfile()));
  const logEvent = createEventLogger({ filePath: EVENTS_PATH, secrets: getSecrets(getProfile()) });

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
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
      crossOriginResourcePolicy: { policy: "same-origin" },
    })
  );
  app.use(express.json({ limit: "128kb" }));
  app.use((req, res, next) => {
    req.setTimeout(15_000);
    res.setTimeout(15_000);
    next();
  });
  app.use(hostAllowlist);
  app.use(createCorsAllowlist(config));

  const serveIndex = (req, res) => {
    const htmlPath = path.join(appRoot, "index.html");
    const html = fs.readFileSync(htmlPath, "utf-8");
    const withToken = html.replace(/__CLAWDESK_TOKEN__/g, secret);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(withToken);
  };

  app.get("/", serveIndex);
  app.get("/index.html", serveIndex);
  app.use(express.static(appRoot, { maxAge: "1h" }));

  const apiRouter = express.Router();
  apiRouter.use(apiAuth, rateLimit());
  apiRouter.use(
    createHealthRouter({
      getProfile,
      createEnv,
      version: packageJson.version,
    })
  );

  apiRouter.get("/openclaw/version", async (req, res) => {
    try {
      const profile = getProfile();
      const env = createEnv(profile);
      const { stdout } = await runOpenClaw(["--version"], { env });
      const resolved = detectBinary();
      res.json({ version: stdout.trim(), binary: resolved.binary });
    } catch (error) {
      res.status(503).json({ error: "openclaw no encontrado", detail: error.message });
    }
  });

  apiRouter.use(
    createProfilesRouter({ requireAction, logEvent }),
    createGatewayRouter({ requireAction, getProfile, createEnv, logEvent }),
    createUsageRouter({
      requireAction,
      getProfile,
      createEnv,
      secrets: getSecrets(getProfile()),
      logEvent,
    }),
    createAgentsRouter({ requireAction, logEvent }),
    createSkillsRouter({ requireAction, logEvent }),
    createConfigRouter({
      requireAction,
      version: packageJson.version,
      secrets: getSecrets(getProfile()),
    }),
    createDoctorRouter({ requireAction, secrets: getSecrets(getProfile()) }),
    createMacrosRouter({
      requireAction,
      actions: {
        "gateway.status": async () => {
          const profile = getProfile();
          const env = createEnv(profile);
          const { gatewayStatus } = require("./gateway/status");
          return gatewayStatus(env);
        },
        "gateway.probe": async () => {
          const profile = getProfile();
          const env = createEnv(profile);
          const { gatewayProbe } = require("./gateway/probe");
          return gatewayProbe(env);
        },
        "usage.read": async () => {
          const profile = getProfile();
          const env = createEnv(profile);
          const { getUsageSnapshot } = require("./usage/snapshot");
          return getUsageSnapshot({ profile, env, secrets: getSecrets(profile) });
        },
      },
      allowList: new Set(loadConfig().security.allow_actions),
      logEvent,
    }),
    createEventsRouter({ requireAction }),
    createLogsRouter({
      requireAction,
      getProfile,
      createEnv,
      secrets: getSecrets(getProfile()),
      config,
    })
  );

  app.use("/api", apiRouter);

  app.use((err, req, res, next) => {
    const redacted = redactText(err.message, getSecrets(getProfile()));
    fs.appendFileSync(LOG_PATH, `${new Date().toISOString()} ${redacted}\n`);
    logger.error("Error no controlado", { error: err.message, path: req.path });
    res.status(500).json({ error: "Error interno" });
    next();
  });

  return { app, config, secret };
};

module.exports = { createServer };
