const express = require("express");
const {
  listAgents,
  createAgent,
  setDefaultAgent,
  renameAgent,
  deleteAgent,
  importAgent,
  exportAgent,
} = require("../openclaw/agents");

const createAgentsRouter = ({ requireAction, logEvent }) => {
  const router = express.Router();

  router.get("/agents", (req, res) => {
    if (!requireAction("agents.list")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const payload = listAgents();
    return res.json(payload);
  });

  router.post("/agents", (req, res) => {
    if (!requireAction("agents.create")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    try {
      const agent = createAgent(req.body || {});
      logEvent?.("agents.create", { name: agent.name });
      return res.json({ ok: true, agent });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  });

  router.post("/agents/default", (req, res) => {
    if (!requireAction("agents.default")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    try {
      const { name } = req.body || {};
      const selected = setDefaultAgent(name);
      logEvent?.("agents.default", { name: selected });
      return res.json({ ok: true, default: selected });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  });

  router.post("/agents/rename", (req, res) => {
    if (!requireAction("agents.rename")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    try {
      const { name, nextName } = req.body || {};
      const updated = renameAgent(name, nextName);
      logEvent?.("agents.rename", { name, nextName: updated.name });
      return res.json({ ok: true, agent: updated });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  });

  router.delete("/agents/:name", (req, res) => {
    if (!requireAction("agents.delete")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    try {
      deleteAgent(req.params.name);
      logEvent?.("agents.delete", { name: req.params.name });
      return res.json({ ok: true });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  });

  router.get("/agents/export/:name", (req, res) => {
    if (!requireAction("agents.export")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    try {
      const agent = exportAgent(req.params.name);
      return res.json({ ok: true, agent });
    } catch (error) {
      return res.status(404).json({ error: error.message });
    }
  });

  router.post("/agents/import", (req, res) => {
    if (!requireAction("agents.import")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    try {
      const agent = importAgent(req.body?.agent || req.body);
      logEvent?.("agents.import", { name: agent.name });
      return res.json({ ok: true, agent });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  });

  return router;
};

module.exports = { createAgentsRouter };
