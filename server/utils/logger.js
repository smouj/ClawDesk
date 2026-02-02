const { redactText } = require("../security/redaction");

const safeJson = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ fallback: String(value) });
  }
};

const createLogger = (secrets = []) => {
  const redact = (value) => redactText(String(value || ""), secrets);
  const redactMeta = (meta) => {
    if (!meta) return {};
    const redacted = redactText(safeJson(meta), secrets);
    try {
      return JSON.parse(redacted);
    } catch {
      return { meta: redacted };
    }
  };

  const log = (level, message, meta) => {
    const payload = {
      level,
      time: new Date().toISOString(),
      message: redact(message),
      meta: redactMeta(meta),
    };
    console.log(safeJson(payload));
  };

  return {
    info: (message, meta) => log("info", message, meta),
    warn: (message, meta) => log("warn", message, meta),
    error: (message, meta) => log("error", message, meta),
  };
};

module.exports = { createLogger };
