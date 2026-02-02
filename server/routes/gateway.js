const express = require("express");
const { gatewayStatus } = require("../gateway/status");
const { gatewayProbe } = require("../gateway/probe");
const { gatewayDashboardLink } = require("../gateway/dashboardLink");
const { gatewayLifecycle } = require("../gateway/lifecycle");

const createGatewayRouter = ({ requireAction, getProfile, createEnv, logEvent }) => {
  const router = express.Router();

  router.get("/gateway/status", async (req, res) => {
    if (!requireAction("gateway.status")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    try {
      const profile = getProfile();
      const env = createEnv(profile);
      const status = await gatewayStatus(env);
      logEvent?.("gateway.status", { profile: profile.name });
      res.json({ ...status, profile: profile.name });
    } catch (error) {
      res.status(503).json({ error: "No se pudo obtener estado del gateway", detail: error.message });
    }
  });

  router.get("/gateway/probe", async (req, res) => {
    if (!requireAction("gateway.probe")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    try {
      const profile = getProfile();
      const env = createEnv(profile);
      const result = await gatewayProbe(env);
      logEvent?.("gateway.probe", { profile: profile.name });
      res.json({ result });
    } catch (error) {
      res.status(503).json({ error: "No se pudo ejecutar probe", detail: error.message });
    }
  });

  router.get("/gateway/control-url", async (req, res) => {
    if (!requireAction("gateway.dashboard")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    try {
      const profile = getProfile();
      const env = createEnv(profile);
      const fallbackUrl = `http://${profile.bind}:${profile.port}/`;
      const data = await gatewayDashboardLink(fallbackUrl, env);
      res.json(data);
    } catch (error) {
      res.status(503).json({ error: "No se pudo resolver dashboard", detail: error.message });
    }
  });

  router.post("/gateway/:action", async (req, res) => {
    const { action } = req.params;
    if (!["start", "stop", "restart"].includes(action)) {
      return res.status(400).json({ error: "Acción inválida" });
    }
    if (!requireAction(`gateway.${action}`)) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    try {
      const profile = getProfile();
      const env = createEnv(profile);
      const result = await gatewayLifecycle(action, env);
      logEvent?.("gateway.lifecycle", { profile: profile.name, action });
      res.json({ result });
    } catch (error) {
      res.status(503).json({ error: "No se pudo ejecutar acción", detail: error.message });
    }
  });

  return router;
};

module.exports = { createGatewayRouter };
