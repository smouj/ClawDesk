const express = require("express");
const { listSkills, toggleSkill, refreshSkills } = require("../openclaw/skills");

const createSkillsRouter = ({ requireAction, logEvent }) => {
  const router = express.Router();

  router.get("/skills", (req, res) => {
    if (!requireAction("skills.list")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const payload = listSkills();
    return res.json(payload);
  });

  router.post("/skills/refresh", (req, res) => {
    if (!requireAction("skills.refresh")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const payload = refreshSkills();
    logEvent?.("skills.refresh", { count: payload.skills?.length || 0 });
    return res.json(payload);
  });

  router.post("/skills/toggle", (req, res) => {
    if (!requireAction("skills.toggle")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    try {
      const { name, enabled } = req.body || {};
      const skill = toggleSkill(name, enabled);
      logEvent?.("skills.toggle", { name, enabled: Boolean(enabled) });
      return res.json({ ok: true, skill });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  });

  return router;
};

module.exports = { createSkillsRouter };
