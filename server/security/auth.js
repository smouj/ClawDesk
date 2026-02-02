const { ensureSecret } = require("../config/loadConfig");

const extractAuthToken = (req) => {
  const header = req.header("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer") {
    return req.query?.token || null;
  }
  return token || null;
};

const createAuth = () => {
  const secret = ensureSecret();
  const middleware = (req, res, next) => {
    const token = extractAuthToken(req);
    if (!token || token !== secret) {
      return res.status(401).json({ error: "No autorizado" });
    }
    return next();
  };
  return { secret, middleware };
};

module.exports = { createAuth, extractAuthToken };
