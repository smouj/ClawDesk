const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const tar = require("tar");

const { redactText } = require("./config");

const writeSupportBundle = async ({
  clawdeskVersion,
  config,
  configRaw,
  statusAll,
  logs,
  secrets,
}) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "clawdesk-bundle-"));
  const bundleDir = path.join(tempDir, "bundle");
  await fs.mkdir(bundleDir, { recursive: true });

  const sanitizedConfig = redactText(configRaw, secrets);
  const sanitizedStatus = redactText(statusAll, secrets);
  const sanitizedLogs = redactText(logs, secrets);

  await fs.writeFile(path.join(bundleDir, "clawdesk-version.txt"), `${clawdeskVersion}\n`);
  await fs.writeFile(path.join(bundleDir, "config.redacted.json"), sanitizedConfig);
  await fs.writeFile(path.join(bundleDir, "openclaw-status-all.txt"), sanitizedStatus);
  await fs.writeFile(path.join(bundleDir, "gateway-logs.txt"), sanitizedLogs);
  await fs.writeFile(
    path.join(bundleDir, "bundle-readme.txt"),
    `ClawDesk support bundle\nHost: ${config.app.host}:${config.app.port}\nGateway: ${config.gateway.url}\n`
  );

  const bundlePath = path.join(tempDir, "clawdesk-support-bundle.tar.gz");
  await tar.c(
    {
      gzip: true,
      file: bundlePath,
      cwd: bundleDir,
    },
    [
      "clawdesk-version.txt",
      "config.redacted.json",
      "openclaw-status-all.txt",
      "gateway-logs.txt",
      "bundle-readme.txt",
    ]
  );

  return { bundlePath, tempDir };
};

module.exports = { writeSupportBundle };
