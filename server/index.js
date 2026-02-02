const http = require("http");
const fs = require("fs");

const { createServer } = require("./server");
const { PID_PATH, LOG_PATH } = require("./config/loadConfig");
const { redactText } = require("./security/redaction");
const { createLogger } = require("./utils/logger");

const start = () => {
  const { app, config, secret } = createServer();
  const logger = createLogger([secret, process.env.OPENCLAW_GATEWAY_TOKEN]);
  const server = http.createServer(app);

  server.listen(config.app.port, config.app.host, () => {
    fs.writeFileSync(PID_PATH, String(process.pid));
    logger.info("ClawDesk disponible", {
      host: config.app.host,
      port: config.app.port,
    });
  });

  const shutdown = () => {
    server.close(() => {
      if (fs.existsSync(PID_PATH)) {
        fs.unlinkSync(PID_PATH);
      }
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

if (require.main === module) {
  try {
    start();
  } catch (error) {
    const logger = createLogger([process.env.OPENCLAW_GATEWAY_TOKEN]);
    const redacted = redactText(error.message, [process.env.OPENCLAW_GATEWAY_TOKEN]);
    fs.appendFileSync(LOG_PATH, `${new Date().toISOString()} ${redacted}\n`);
    logger.error("Error al iniciar ClawDesk", { error: error.message });
    process.exit(1);
  }
}

module.exports = { start };
