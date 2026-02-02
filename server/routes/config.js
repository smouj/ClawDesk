const fs = require("fs");
const path = require("path");
const express = require("express");

const { loadConfig, CONFIG_PATH } = require("../config/loadConfig");
const { validateConfig } = require("../config/validateConfig");
const { readJson, writeJson } = require("../utils/jsonSafe");
const { redactObject } = require("../security/redaction");
const { readOpenclawConfig, writeOpenclawConfig } = require("../openclaw/storage");

const getFilePermissions = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  const stats = fs.statSync(filePath);
  const mode = stats.mode & 0o777;
  return {
    mode: mode.toString(8),
    worldReadable: Boolean(mode & 0o004),
  };
};

const backupFile = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${filePath}.bak-${stamp}`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
};

const listBackups = (filePath) => {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(`${base}.bak-`))
    .map((name) => path.join(dir, name))
    .sort()
    .reverse();
};

const validatePorts = (data) => {
  const warnings = [];
  const appPort = data?.app?.port;
  if (appPort && (appPort < 1024 || appPort > 65535)) {
    warnings.push("El puerto app.port debe estar entre 1024 y 65535.");
  }
  const gatewayPort = data?.gateway?.port;
  if (gatewayPort && (gatewayPort < 1024 || gatewayPort > 65535)) {
    warnings.push("El puerto gateway.port debe estar entre 1024 y 65535.");
  }
  return warnings;
};

const createConfigRouter = ({ requireAction, version, secrets = [] }) => {
  const router = express.Router();

  router.get("/config", (req, res) => {
    if (!requireAction("config.read")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const clawdesk = loadConfig();
    const openclaw = readOpenclawConfig();
    const openclawWarnings = openclaw.data ? validatePorts(openclaw.data) : [];

    return res.json({
      version,
      app: clawdesk.app,
      activeProfile: clawdesk.activeProfile,
      profiles: Object.values(clawdesk.profiles || {}).map((profile) => ({
        name: profile.name,
        bind: profile.bind,
        port: profile.port,
      })),
      security: {
        allow_actions: clawdesk.security.allow_actions,
        enableRemoteProfiles: clawdesk.security.enableRemoteProfiles,
        allowedRemoteHosts: clawdesk.security.allowedRemoteHosts,
        allowedOrigins: clawdesk.security.allowedOrigins,
      },
      clawdesk: {
        path: CONFIG_PATH,
        permissions: getFilePermissions(CONFIG_PATH),
        config: redactObject(clawdesk, secrets),
        backups: listBackups(CONFIG_PATH),
      },
      openclaw: {
        path: openclaw.path,
        exists: openclaw.exists,
        permissions: getFilePermissions(openclaw.path),
        config: openclaw.data ? redactObject(openclaw.data, secrets) : null,
        warnings: openclawWarnings,
        backups: listBackups(openclaw.path),
      },
    });
  });

  router.put("/config", (req, res) => {
    if (!requireAction("config.write")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const { target, data } = req.body || {};
    if (!data || typeof data !== "object") {
      return res.status(400).json({ error: "Payload inválido" });
    }
    try {
      if (target === "clawdesk") {
        const validated = validateConfig(data);
        backupFile(CONFIG_PATH);
        writeJson(CONFIG_PATH, validated);
        return res.json({ ok: true, target, path: CONFIG_PATH });
      }
      if (target === "openclaw") {
        const warnings = validatePorts(data);
        writeOpenclawConfig(data);
        return res.json({ ok: true, target, warnings });
      }
      return res.status(400).json({ error: "Target inválido" });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  });

  router.get("/config/backups", (req, res) => {
    if (!requireAction("config.read")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const target = req.query.target;
    const pathTarget = target === "openclaw" ? readOpenclawConfig().path : CONFIG_PATH;
    return res.json({ backups: listBackups(pathTarget) });
  });

  router.post("/config/restore", (req, res) => {
    if (!requireAction("config.write")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const { target, backup } = req.body || {};
    if (!backup || !fs.existsSync(backup)) {
      return res.status(400).json({ error: "Backup no encontrado" });
    }
    const pathTarget = target === "openclaw" ? readOpenclawConfig().path : CONFIG_PATH;
    fs.copyFileSync(backup, pathTarget);
    return res.json({ ok: true, target });
  });

  return router;
};

module.exports = { createConfigRouter };
