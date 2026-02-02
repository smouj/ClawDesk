const express = require("express");
const { runOpenClaw } = require("../openclaw/run");
const { getAllowedArgs } = require("../openclaw/allowlist");
const { redactText } = require("../security/redaction");

const createDoctorRouter = ({ requireAction, secrets = [] }) => {
  const router = express.Router();

  router.post("/doctor", async (req, res) => {
    if (!requireAction("openclaw.doctor")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    try {
      const args = getAllowedArgs("openclaw.doctor");
      if (!args) {
        return res.status(400).json({ error: "Acción no disponible" });
      }
      const { stdout, stderr, binary } = await runOpenClaw(args, { timeout: 12000 });
      return res.json({
        ok: true,
        binary,
        summary: redactText(stdout.trim() || stderr.trim(), secrets),
      });
    } catch (error) {
      return res.status(500).json({ error: "doctor falló", detail: error.message });
    }
  });

  router.post("/security/audit", async (req, res) => {
    if (!requireAction("openclaw.audit")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    try {
      const deep = Boolean(req.body?.deep);
      const key = deep ? "openclaw.audit.deep" : "openclaw.audit";
      const args = getAllowedArgs(key);
      if (!args) {
        return res.status(400).json({ error: "Acción no disponible" });
      }
      const { stdout, stderr, binary } = await runOpenClaw(args, { timeout: 12000 });
      return res.json({
        ok: true,
        binary,
        deep,
        summary: redactText(stdout.trim() || stderr.trim(), secrets),
      });
    } catch (error) {
      return res.status(500).json({ error: "audit falló", detail: error.message });
    }
  });

  return router;
};

module.exports = { createDoctorRouter };
