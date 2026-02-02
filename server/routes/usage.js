const express = require("express");
const { getUsageSnapshot } = require("../usage/snapshot");
const { recordSnapshot, loadHistory } = require("../usage/history");
const { USAGE_PATH } = require("../config/loadConfig");

const toCsv = (entries) => {
  if (!entries.length) return "";
  const headers = Object.keys(entries[0]);
  const lines = [headers.join(",")];
  entries.forEach((entry) => {
    lines.push(headers.map((key) => JSON.stringify(entry[key] ?? "")).join(","));
  });
  return lines.join("\n");
};

const createUsageRouter = ({ requireAction, getProfile, createEnv, secrets, logEvent }) => {
  const router = express.Router();

  router.get("/usage/snapshot", async (req, res) => {
    if (!requireAction("usage.read")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    try {
      const profile = getProfile();
      const env = createEnv(profile);
      const snapshot = await getUsageSnapshot({ profile, env, secrets });
      recordSnapshot(USAGE_PATH, snapshot);
      logEvent?.("usage.snapshot", { profile: profile.name });
      res.json(snapshot);
    } catch (error) {
      res.status(503).json({ error: "No se pudo obtener usage", detail: error.message });
    }
  });

  router.get("/usage/history", (req, res) => {
    if (!requireAction("usage.read")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const range = req.query.range || "24h";
    const history = loadHistory(USAGE_PATH, range);
    res.json({ range, entries: history });
  });

  router.get("/usage/export", (req, res) => {
    if (!requireAction("usage.export")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const range = req.query.range || "24h";
    const format = req.query.format || "json";
    const history = loadHistory(USAGE_PATH, range);
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.send(toCsv(history));
    } else {
      res.json({ range, entries: history });
    }
  });

  return router;
};

module.exports = { createUsageRouter };
