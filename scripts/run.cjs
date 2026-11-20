const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");
const bundled = path.join(
  os.homedir(),
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "node",
  "bin",
  "node.exe",
);
const node =
  Number(process.versions.node.split(".")[0]) >= 22
    ? process.execPath
    : fs.existsSync(bundled)
      ? bundled
      : process.execPath;
const root = path.resolve(__dirname, "..");
const run = (args) => {
  const p = spawnSync(node, args, { cwd: root, stdio: "inherit" });
  if (p.error) {
    console.error(p.error.message);
    process.exit(1);
  }
  if (p.status !== 0) process.exit(p.status || 1);
};
const mode = process.argv[2];
if (mode === "build") {
  run(["node_modules/typescript/bin/tsc"]);
  run(["node_modules/vite/bin/vite.js", "build"]);
} else if (mode === "test") run(["--test", "tests/domain.test.mjs", "tests/chart-data.test.mjs", "tests/sample-realism.test.mjs"]);
else
  run([
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    ...process.argv.slice(3),
  ]);
