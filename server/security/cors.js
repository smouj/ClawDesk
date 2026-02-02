const { isLoopbackHost } = require("../config/validateConfig");

const buildAllowedOrigins = (config) => {
  const host = config.app?.host || "127.0.0.1";
  const port = config.app?.port || 4178;
  const origins = new Set();
  if (isLoopbackHost(host)) {
    origins.add(`http://${host}:${port}`);
  }
  origins.add(`http://127.0.0.1:${port}`);
  origins.add(`http://localhost:${port}`);
  const extra = Array.isArray(config.security?.allowedOrigins)
    ? config.security.allowedOrigins
    : [];
  extra.forEach((origin) => {
    if (typeof origin === "string" && origin.trim()) {
      origins.add(origin.trim());
    }
  });
  return origins;
};

const createCorsAllowlist = (config) => {
  const allowedOrigins = buildAllowedOrigins(config);
  return (req, res, next) => {
    const origin = req.headers.origin;
    if (!origin) {
      return next();
    }
    if (!allowedOrigins.has(origin)) {
      return res.status(403).json({ error: "Origen no permitido" });
    }
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    return next();
  };
};

module.exports = { createCorsAllowlist, buildAllowedOrigins };
