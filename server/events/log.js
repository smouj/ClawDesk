const { appendFileSafe } = require("../utils/fsSafe");
const { rotateIfNeeded } = require("./rotate");
const { redactObject } = require("../security/redaction");

const createEventLogger = ({ filePath, secrets = [] } = {}) => {
  return (type, payload = {}) => {
    rotateIfNeeded(filePath);
    const entry = {
      timestamp: new Date().toISOString(),
      type,
      payload: redactObject(payload, secrets),
    };
    appendFileSafe(filePath, `${JSON.stringify(entry)}\n`);
  };
};

module.exports = { createEventLogger };
