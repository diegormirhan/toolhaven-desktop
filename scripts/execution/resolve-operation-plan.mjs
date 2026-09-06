/**
 * Resolve a typed operation into an executable plus argv.
 * This boundary deliberately returns an argument array; it never builds a shell command.
 */
export function resolveOperationPlan(request) {
  validateRequest(request);

  const { toolId, operationId, inputPaths, outputPath, options = {} } = request;
  const inputPath = inputPaths[0];

  if (toolId === "ffmpeg") return resolveFfmpeg(operationId, inputPaths, outputPath, options);
  if (toolId === "ffprobe" && operationId === "inspect") {
    return { executable: "ffprobe", args: ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", inputPath] };
  }
  if (toolId === "qpdf") return resolveQpdf(operationId, inputPaths, outputPath, options);
  throw new Error(`Unsupported operation: ${toolId}/${operationId}`);
}

function resolveFfmpeg(operationId, inputPaths, outputPath, options) {
  const inputPath = inputPaths[0];
  if (operationId === "convert") return { executable: "ffmpeg", args: ["-i", inputPath, outputPath] };
  if (operationId === "extract-audio") return { executable: "ffmpeg", args: ["-i", inputPath, "-map", "0:a:0", "-c:a", "copy", outputPath] };
  if (operationId === "compress") return { executable: "ffmpeg", args: ["-i", inputPath, "-c:v", "libx264", "-crf", String(options.crf ?? 23), "-preset", String(options.preset ?? "medium"), outputPath] };
  if (operationId === "trim") return { executable: "ffmpeg", args: ["-ss", String(options.start ?? 0), "-to", String(options.end ?? 10), "-i", inputPath, "-c", "copy", outputPath] };
  throw new Error(`Unsupported operation: ffmpeg/${operationId}`);
}

function resolveQpdf(operationId, inputPaths, outputPath, options) {
  if (operationId === "merge") return { executable: "qpdf", args: ["--empty", "--pages", ...inputPaths, "--", outputPath] };
  if (operationId === "split") return { executable: "qpdf", args: [inputPaths[0], "--pages", ".", String(options.pages ?? "1-z"), "--", outputPath] };
  if (operationId === "rotate") return { executable: "qpdf", args: [inputPaths[0], "--rotate", String(options.degrees ?? 90), ":1-z", outputPath] };
  if (operationId === "protect") return { executable: "qpdf", args: [inputPaths[0], "--encrypt", String(options.password ?? ""), String(options.password ?? ""), "256", "--", outputPath] };
  throw new Error(`Unsupported operation: qpdf/${operationId}`);
}

function validateRequest(request) {
  if (!request || typeof request !== "object") throw new Error("Operation request is required");
  if (typeof request.toolId !== "string" || !request.toolId) throw new Error("toolId is required");
  if (typeof request.operationId !== "string" || !request.operationId) throw new Error("operationId is required");
  if (!Array.isArray(request.inputPaths) || request.inputPaths.length === 0 || request.inputPaths.some((path) => typeof path !== "string" || !path)) {
    throw new Error("At least one input path is required");
  }
  if (typeof request.outputPath !== "string" || !request.outputPath) throw new Error("outputPath is required");
}
