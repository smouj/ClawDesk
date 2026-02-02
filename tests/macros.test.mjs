import { describe, expect, it } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { runMacro } = require("../server/macros/runner");

describe("macro runner", () => {
  it("enforces allow_actions", async () => {
    const macro = { steps: [{ action: "gateway.status" }] };
    const allowList = new Set(["usage.snapshot"]);
    await expect(
      runMacro({
        name: "blocked",
        macro,
        actions: { "gateway.status": async () => ({ ok: true }) },
        allowList,
      })
    ).rejects.toThrow("Acción gateway.status no permitida");
  });
});
