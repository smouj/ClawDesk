import { describe, expect, it } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { parseListOutput, resolveOpenClawBinary } = require("../server/openclaw.js");

describe("openclaw helpers", () => {
  it("parses JSON arrays when available", () => {
    const parsed = parseListOutput('["alpha", "beta"]');
    expect(parsed).toEqual(["alpha", "beta"]);
  });

  it("falls back to line parsing", () => {
    const parsed = parseListOutput("alpha\nbeta\n");
    expect(parsed).toEqual(["alpha", "beta"]);
  });

  it("returns a binary hint", () => {
    const resolved = resolveOpenClawBinary();
    expect(resolved).toHaveProperty("binary");
    expect(resolved).toHaveProperty("path");
  });
});
