const { isLoopbackHost } = require("../config/validateConfig");

const hostAllowlist = (req, res, next) => {
  const hostHeader = req.hostname;
  if (hostHeader && !isLoopbackHost(hostHeader)) {
    return res.status(403).json({ error: "Host no permitido" });
  }
  const origin = req.headers.origin;
  if (origin) {
    try {
      const originHost = new URL(origin).hostname;
      if (!isLoopbackHost(originHost)) {
        return res.status(403).json({ error: "Origen no permitido" });
      }
    } catch {
      return res.status(403).json({ error: "Origen inválido" });
    }
  }
  return next();
};

module.exports = { hostAllowlist };
