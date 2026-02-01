const http = require("http");
const fs = require("fs");

const { createServer } = require("./server");
const { PID_PATH, LOG_PATH } = require("./config");

const start = () => {
  const { app, config } = createServer();
  const server = http.createServer(app);

  server.listen(config.app.port, config.app.host, () => {
    fs.writeFileSync(PID_PATH, String(process.pid));
    console.log(`ClawDesk disponible en http://${config.app.host}:${config.app.port}`);
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
    fs.appendFileSync(LOG_PATH, `${new Date().toISOString()} ${error.message}\n`);
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { start };
