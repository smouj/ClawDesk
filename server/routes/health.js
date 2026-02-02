const express = require("express");

const createHealthRouter = () => {
  const router = express.Router();
  router.get("/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });
  return router;
};

module.exports = { createHealthRouter };
