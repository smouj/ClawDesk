const { runOpenClaw } = require("../openclaw/run");
const { detectCapabilities } = require("../openclaw/capabilities");
const { parseUsageJson, parseUsageText } = require("./parse");
const { redactText } = require("../security/redaction");

const cache = new Map();
const CAPABILITIES_CACHE = new Map();

const getCapabilities = async (profileName, env) => {
  if (CAPABILITIES_CACHE.has(profileName)) {
    return CAPABILITIES_CACHE.get(profileName);
  }
  const capabilities = await detectCapabilities(env);
  CAPABILITIES_CACHE.set(profileName, capabilities);
  return capabilities;
};

const getUsageSnapshot = async ({ profile, env, secrets = [], ttlMs = 60_000 }) => {
  const cacheKey = profile.name;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ttlMs) {
    return cached.data;
  }

  const capabilities = await getCapabilities(cacheKey, env);
  if (!capabilities.usageFlag) {
    const empty = {
      timestamp: new Date().toISOString(),
      profile: profile.name,
      totals: { tokensIn: null, tokensOut: null, cost: null },
      byProvider: [],
      byModel: [],
      byTool: [],
      notes: "openclaw status --usage no disponible",
    };
    cache.set(cacheKey, { timestamp: Date.now(), data: empty });
    return empty;
  }

  const args = ["status", "--usage"];
  if (capabilities.usageJson) {
    args.push("--json");
  }

  const { stdout } = await runOpenClaw(args, { env });
  const redacted = redactText(stdout, secrets);
  const parsed = capabilities.usageJson ? parseUsageJson(redacted) : parseUsageText(redacted);

  const snapshot = {
    timestamp: new Date().toISOString(),
    profile: profile.name,
    ...parsed,
  };

  cache.set(cacheKey, { timestamp: Date.now(), data: snapshot });
  return snapshot;
};

module.exports = { getUsageSnapshot };
