const express = require("express");
const { loadConfig, CONFIG_PATH } = require("../config/loadConfig");
const { writeJson } = require("../utils/jsonSafe");
const { runMacro } = require("../macros/runner");

const createMacrosRouter = ({ requireAction, actions, allowList, logEvent }) => {
  const router = express.Router();

  router.get("/macros", (req, res) => {
    if (!requireAction("macros.read")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const config = loadConfig();
    res.json({ macros: config.macros || {} });
  });

  router.post("/macros/run", async (req, res) => {
    if (!requireAction("macros.run")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const { name } = req.body || {};
    const config = loadConfig();
    const macro = config.macros?.[name];
    if (!macro) {
      return res.status(404).json({ error: "Macro no encontrada" });
    }
    try {
      const results = await runMacro({ name, macro, actions, allowList, logEvent });
      res.json({ name, results });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message, detail: error.detail || null });
    }
  });

  router.post("/macros/save", (req, res) => {
    if (!requireAction("macros.write")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const { name, macro } = req.body || {};
    if (!name || !macro) {
      return res.status(400).json({ error: "Datos inválidos" });
    }
    const config = loadConfig();
    const updated = {
      ...config,
      macros: {
        ...config.macros,
        [name]: macro,
      },
    };
    writeJson(CONFIG_PATH, updated);
    logEvent?.("macro.save", { name });
    res.json({ ok: true });
  });

  return router;
};

module.exports = { createMacrosRouter };
