import { describe, expect, it } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { resolveProfile } = require("../server/gateway/resolveProfile");
const { redactText } = require("../server/security/redaction");

describe("resolveProfile", () => {
  it("prioritizes flags over env over config", () => {
    const config = {
      profiles: {
        local: { name: "local", bind: "127.0.0.1", port: 18789, auth: { token: "config" } },
      },
      activeProfile: "local",
      security: { enableRemoteProfiles: false, allowedRemoteHosts: [] },
    };
    const result = resolveProfile({
      config,
      env: { OPENCLAW_GATEWAY_PORT: "19999", OPENCLAW_GATEWAY_TOKEN: "env" },
      flags: { port: 20001, token: "flag" },
    });
    expect(result.port).toBe(20001);
    expect(result.portSource).toBe("flag");
    expect(result.token).toBe("flag");
    expect(result.tokenSource).toBe("flag");
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

  it("redacts bearer tokens and api keys", () => {
    const input = "Authorization: Bearer super-secret-token api_key=xyz";
    const output = redactText(input, []).toLowerCase();
    expect(output).toContain("authorization:[redacted]");
    expect(output).toContain("api_key:[redacted]");
  });
});
