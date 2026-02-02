import { describe, expect, it } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { parseUsageJson, parseUsageText } = require("../server/usage/parse");

describe("usage parser", () => {
  it("parses JSON usage payloads", () => {
    const parsed = parseUsageJson({
      totals: { tokens_in: 120, tokens_out: 80, cost: 0.12 },
      providers: [{ name: "openai", tokens: 200, cost: 0.12, requests: 3 }],
      models: [{ name: "gpt-4", tokens: 200, cost: 0.12 }],
      tools: [{ name: "search", usage: 5, cost: 0.02, provider: "openai" }],
    });
    expect(parsed.totals.tokensIn).toBe(120);
    expect(parsed.byProvider[0].name).toBe("openai");
  });

  it("parses text fallback", () => {
    const parsed = parseUsageText("tokens in: 50\ntokens out: 20\ncost: $0.05\n");
    expect(parsed.totals.tokensIn).toBe(50);
    expect(parsed.totals.cost).toBe(0.05);
  });
});
