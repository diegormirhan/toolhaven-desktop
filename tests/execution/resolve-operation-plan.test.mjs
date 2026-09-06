import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveOperationPlan } from "../../scripts/execution/resolve-operation-plan.mjs";

describe("operation plans", () => {
  it("resolves ffmpeg extraction as an argv array", () => {
    assert.deepEqual(resolveOperationPlan({ toolId: "ffmpeg", operationId: "extract-audio", inputPaths: ["clip.mp4"], outputPath: "clip.m4a" }), {
      executable: "ffmpeg",
      args: ["-i", "clip.mp4", "-map", "0:a:0", "-c:a", "copy", "clip.m4a"],
    });
  });

  it("resolves qpdf merge without creating a shell string", () => {
    const plan = resolveOperationPlan({ toolId: "qpdf", operationId: "merge", inputPaths: ["a.pdf", "b.pdf"], outputPath: "merged.pdf" });
    assert.equal(plan.executable, "qpdf");
    assert.deepEqual(plan.args, ["--empty", "--pages", "a.pdf", "b.pdf", "--", "merged.pdf"]);
    assert.equal("command" in plan, false);
  });

  it("rejects unsupported operations before a process can start", () => {
    assert.throws(() => resolveOperationPlan({ toolId: "ffmpeg", operationId: "run-shell", inputPaths: ["a.mp4"], outputPath: "b.mp4" }), /unsupported operation/i);
  });
});
