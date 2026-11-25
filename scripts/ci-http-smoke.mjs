import { spawn } from "node:child_process";
import path from "node:path";

const PORT = process.env.CI_PORT || "3000";
const BASE_URL = `http://localhost:${PORT}`;
const NEXT_BIN = path.resolve(process.cwd(), "node_modules/next/dist/bin/next");
const TSX_BIN = path.resolve(process.cwd(), "node_modules/tsx/dist/cli.mjs");

async function waitForServer(url, timeoutMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status > 0) return;
    } catch {
      // keep polling until listening
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timed out waiting for Next.js server at ${url}`);
}

async function run() {
  const cleanEnv = {
    ...process.env,
    HTTP_PROXY: "",
    HTTPS_PROXY: "",
    http_proxy: "",
    https_proxy: "",
    TEST_BASE_URL: BASE_URL,
  };

  const server = spawn(process.execPath, [NEXT_BIN, "start", "-p", PORT], {
    env: cleanEnv,
    stdio: "inherit",
  });

  try {
    await waitForServer(`${BASE_URL}/`);

    const smokeExitCode = await new Promise((resolve, reject) => {
      const smoke = spawn(
        process.execPath,
        [TSX_BIN, "tests/integration/http-security-smoke.ts"],
        { env: cleanEnv, stdio: "inherit" },
      );
      smoke.on("error", reject);
      smoke.on("close", resolve);
    });

    if (smokeExitCode !== 0) {
      process.exitCode = Number(smokeExitCode) || 1;
    }
  } finally {
    server.kill("SIGTERM");
  }
}

run().catch((err) => {
  console.error("[ci-http-smoke] Failed:", err);
  process.exit(1);
});
