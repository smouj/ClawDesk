import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../server/openclaw/capabilities.js", () => ({
  detectCapabilities: vi.fn(),
}));

const { detectCapabilities } = await import("../server/openclaw/capabilities.js");
const { getUsageSnapshot } = await import("../server/usage/snapshot.js");

beforeEach(() => {
  detectCapabilities.mockReset();
});

describe("usage snapshot cache", () => {
  it("uses cached data within TTL", async () => {
    const capabilities = { usageFlag: true, usageJson: true };
    detectCapabilities.mockResolvedValue(capabilities);
    const runner = vi
      .fn()
      .mockResolvedValue({ stdout: JSON.stringify({ totals: { tokens_in: 1 } }) });

    const profile = { name: "local" };
    const env = {};

    const first = await getUsageSnapshot({ profile, env, ttlMs: 60_000, capabilities, runner });
    const second = await getUsageSnapshot({ profile, env, ttlMs: 60_000, capabilities, runner });

    expect(first.totals.tokensIn).toBe(1);
    expect(second.totals.tokensIn).toBe(1);
    expect(runner).toHaveBeenCalledTimes(1);
  });
});
