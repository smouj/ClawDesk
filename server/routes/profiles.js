const express = require("express");
const { loadConfig, CONFIG_PATH } = require("../config/loadConfig");
const { normalizePort, isLoopbackHost } = require("../config/validateConfig");
const { writeJson } = require("../utils/jsonSafe");

const createProfilesRouter = ({ requireAction, logEvent }) => {
  const router = express.Router();

  router.get("/profiles", (req, res) => {
    if (!requireAction("profiles.read")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const config = loadConfig();
    const profiles = Object.values(config.profiles || {}).map((profile) => ({
      name: profile.name,
      bind: profile.bind,
      port: profile.port,
      token_present: Boolean(profile.auth?.token || profile.token_path),
      active: config.activeProfile === profile.name,
      remote: !isLoopbackHost(profile.bind),
    }));
    res.json({ activeProfile: config.activeProfile, profiles });
  });

  router.post("/profiles/activate", (req, res) => {
    if (!requireAction("profiles.activate")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const { name } = req.body || {};
    const config = loadConfig();
    if (!name || !config.profiles?.[name]) {
      return res.status(400).json({ error: "Perfil no encontrado" });
    }
    const updated = { ...config, activeProfile: name };
    writeJson(CONFIG_PATH, updated);
    logEvent?.("profile.activate", { name });
    return res.json({ ok: true, activeProfile: name });
  });

  router.post("/profiles/save", (req, res) => {
    if (!requireAction("profiles.write")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const { name, data } = req.body || {};
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Nombre inválido" });
    }
    const port = normalizePort(data?.port);
    if (!port) {
      return res.status(400).json({ error: "Puerto inválido" });
    }
    const bind = data?.bind || "127.0.0.1";
    if (!bind) {
      return res.status(400).json({ error: "Bind inválido" });
    }
    const config = loadConfig();
    const profile = {
      name,
      bind,
      port,
      token_path: data?.token_path || config.profiles?.[name]?.token_path || null,
      auth: {
        token: data?.token || config.profiles?.[name]?.auth?.token || "",
      },
    };
    const updated = {
      ...config,
      profiles: {
        ...config.profiles,
        [name]: profile,
      },
    };
    writeJson(CONFIG_PATH, updated);
    logEvent?.("profile.save", { name, remote: !isLoopbackHost(bind) });
    return res.json({ ok: true, profile: { name, bind, port } });
  });

  router.delete("/profiles/:name", (req, res) => {
    if (!requireAction("profiles.delete")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const { name } = req.params;
    if (name === "local") {
      return res.status(400).json({ error: "No se puede borrar el perfil local" });
    }
    const config = loadConfig();
    if (!config.profiles?.[name]) {
      return res.status(404).json({ error: "Perfil no encontrado" });
    }
    const { [name]: removed, ...rest } = config.profiles;
    const activeProfile = config.activeProfile === name ? "local" : config.activeProfile;
    const updated = { ...config, profiles: rest, activeProfile };
    writeJson(CONFIG_PATH, updated);
    logEvent?.("profile.delete", { name });
    return res.json({ ok: true });
  });

  return router;
};

module.exports = { createProfilesRouter };
