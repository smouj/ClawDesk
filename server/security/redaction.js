const secretPatterns = [
  /(token|secret|password|api_key|apikey)\s*[:=]\s*[^\s]+/gi,
  /authorization\s*:\s*bearer\s+[^\s]+/gi,
  /bearer\s+[A-Za-z0-9._-]{12,}/gi,
  /sk-[A-Za-z0-9]{10,}/g,
];

const redactText = (text, secrets = []) => {
  let output = String(text || "");
  secrets.filter(Boolean).forEach((secret) => {
    output = output.split(secret).join("[redacted]");
  });
  secretPatterns.forEach((pattern) => {
    output = output.replace(pattern, (match) => {
      const key = match.split(/[:=]/)[0];
      return `${key}:[redacted]`;
    });
  });
  return output;
};

const redactObject = (payload, secrets = []) => {
  if (!payload) return payload;
  const serialized = JSON.stringify(payload);
  const redacted = redactText(serialized, secrets);
  try {
    return JSON.parse(redacted);
  } catch {
    return { redacted };
  }
};

module.exports = { redactText, redactObject };
