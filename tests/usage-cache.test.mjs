import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../server/openclaw/run.js", () => ({
  runOpenClaw: vi.fn(),
}));
vi.mock("../server/openclaw/capabilities.js", () => ({
  detectCapabilities: vi.fn(),
}));

const { runOpenClaw } = await import("../server/openclaw/run.js");
const { detectCapabilities } = await import("../server/openclaw/capabilities.js");
const { getUsageSnapshot } = await import("../server/usage/snapshot.js");

beforeEach(() => {
  runOpenClaw.mockReset();
  detectCapabilities.mockReset();
});

describe("usage snapshot cache", () => {
  it("uses cached data within TTL", async () => {
    detectCapabilities.mockResolvedValue({ usageFlag: true, usageJson: true });
    runOpenClaw.mockResolvedValue({ stdout: JSON.stringify({ totals: { tokens_in: 1 } }) });

    const profile = { name: "local" };
    const env = {};

    const first = await getUsageSnapshot({ profile, env, ttlMs: 60_000 });
    const second = await getUsageSnapshot({ profile, env, ttlMs: 60_000 });

    expect(first.totals.tokensIn).toBe(1);
    expect(second.totals.tokensIn).toBe(1);
    expect(runOpenClaw).toHaveBeenCalledTimes(1);
  });
});
