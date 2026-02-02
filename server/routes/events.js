const express = require("express");
const { readFileIfExists } = require("../utils/fsSafe");
const { EVENTS_PATH } = require("../config/loadConfig");

const createEventsRouter = ({ requireAction }) => {
  const router = express.Router();

  router.get("/events", (req, res) => {
    if (!requireAction("events.read")) {
      return res.status(403).json({ error: "Acción no permitida" });
    }
    const limit = Math.min(Number(req.query.limit || 200), 500);
    const raw = readFileIfExists(EVENTS_PATH) || "";
    const entries = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-limit)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    res.json({ entries });
  });

  return router;
};

module.exports = { createEventsRouter };
