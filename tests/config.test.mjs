import { describe, expect, it } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { resolveGatewayConfig, redactText } = require("../server/config.js");

describe("resolveGatewayConfig", () => {
  it("prioritizes flags over env over config", () => {
    const config = {
      gateway: {
        port: 18789,
        bind: "127.0.0.1",
        auth: { token: "config-token" },
      },
    };
    const result = resolveGatewayConfig({
      config,
      env: { OPENCLAW_GATEWAY_PORT: "19999", OPENCLAW_GATEWAY_TOKEN: "env-token" },
      flags: { port: 20001, token: "flag-token" },
    });
    expect(result.port).toBe(20001);
    expect(result.portSource).toBe("flag");
    expect(result.token).toBe("flag-token");
    expect(result.tokenSource).toBe("flag");
  });

  it("falls back to env when flags missing", () => {
    const config = {
      gateway: {
        port: 18789,
        bind: "127.0.0.1",
        auth: { token: "config-token" },
      },
    };
    const result = resolveGatewayConfig({
      config,
      env: { OPENCLAW_GATEWAY_PORT: "19999", OPENCLAW_GATEWAY_TOKEN: "env-token" },
    });
    expect(result.port).toBe(19999);
    expect(result.portSource).toBe("env");
    expect(result.token).toBe("env-token");
    expect(result.tokenSource).toBe("env");
  });
});

describe("redactText", () => {
  it("redacts provided secrets and common keys", () => {
    const input = "token=abc123 secret: hunter2 password=letmein";
    const output = redactText(input, ["abc123"]);
    expect(output).toContain("token:[redacted]");
    expect(output).toContain("secret:[redacted]");
    expect(output).toContain("password:[redacted]");
  });
});
