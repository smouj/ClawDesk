const { runOpenClaw } = require("../openclaw/run");

const gatewayDashboardLink = async (fallbackUrl, env) => {
  try {
    const { stdout } = await runOpenClaw(["dashboard"], { env });
    const match = stdout.match(/https?:\/\/[^\s]+/i);
    return { url: match ? match[0] : fallbackUrl, fallback: !match };
  } catch {
    return { url: fallbackUrl, fallback: true };
  }
};

module.exports = { gatewayDashboardLink };
