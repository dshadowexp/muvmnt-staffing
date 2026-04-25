import { defineConfig } from "@trigger.dev/sdk/v3";
import { additionalFiles, ffmpeg } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: "proj_csgaittwhahtnolpoifz",
  runtime: "node",
  logLevel: "log",
  // The max compute seconds a task is allowed to run. Override per task.
  // See https://trigger.dev/docs/runs/max-duration
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  // In v4 this aligns dev and prod cwd semantics so `process.cwd()` resolves
  // to the build directory — matches the layout produced by `additionalFiles`.
  legacyDevProcessCwdBehaviour: false,
  dirs: ["trigger"],
  build: {
    extensions: [
      ffmpeg(),
      additionalFiles({
        files: ["features/notifications/templates/**"],
      }),
    ],
    external: ["fluent-ffmpeg"],
  },
});
