#!/usr/bin/env node

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const PINNED_REVISION = "8e9a9e54cc564896f83e4aedba92b57d73bce63f";
export const PINNED_NODE_VERSION = "v24.18.0";
export const EVIDENCE_FILE = "spikes/judge-fidelity/results/2026-08-24-ba52ec91-051d5c7072d99a31-f543d3d5-80d4-44f6-b7bf-41083197fcc9-v2.json";
export const QUALIFICATION_FILE = "spikes/judge-fidelity/results/2026-08-24-ba52ec91-051d5c7072d99a31-f543d3d5-80d4-44f6-b7bf-41083197fcc9-qualification.json";
export const RETAINED_FILES = Object.freeze([
  EVIDENCE_FILE,
  EVIDENCE_FILE.replace(/\.json$/, ".md"),
  EVIDENCE_FILE.replace(/-v2\.json$/, "-v2.complete.json"),
  QUALIFICATION_FILE,
]);

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function gitBytes(repositoryRoot, revision, relativePath) {
  const { stdout } = await execFileAsync(
    "git",
    ["show", `${revision}:${relativePath}`],
    { cwd: repositoryRoot, encoding: "buffer", maxBuffer: 32 * 1024 * 1024 },
  );
  return stdout;
}

export async function verifyRetainedBytes({
  currentRoot = moduleRoot,
  repositoryRoot = moduleRoot,
  pinnedRevision = PINNED_REVISION,
} = {}) {
  for (const relativePath of RETAINED_FILES) {
    const [current, pinned] = await Promise.all([
      readFile(path.join(currentRoot, relativePath)),
      gitBytes(repositoryRoot, pinnedRevision, relativePath),
    ]);
    if (!current.equals(pinned)) {
      throw new Error(`retained STRUCT-JUDGE artifact differs from ${pinnedRevision}: ${relativePath}`);
    }
  }
}

async function reconstructPinnedCheckout(repositoryRoot, pinnedRevision) {
  const directory = await mkdtemp(path.join(tmpdir(), "oddspark-struct-judge-"));
  const archive = path.join(directory, "checkout.tar");
  await execFileAsync("git", ["archive", "--format=tar", `--output=${archive}`, pinnedRevision], {
    cwd: repositoryRoot,
  });
  await execFileAsync("tar", ["-xf", archive, "-C", directory]);
  // CI installs the lockfile-pinned toolchain before this gate. The historical
  // verifier hard-codes ROOT/node_modules/.bin/wrangler so expose that exact
  // installation to the otherwise immutable reconstructed checkout.
  await symlink(path.join(repositoryRoot, "node_modules"), path.join(directory, "node_modules"), "dir");
  return directory;
}

async function runVerifier(checkout, args, nodeExecutable) {
  const { stdout, stderr } = await execFileAsync(nodeExecutable, args, {
    cwd: checkout,
    env: { ...process.env, CI: "true" },
    maxBuffer: 32 * 1024 * 1024,
  });
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
}

export async function verifyStructJudgeHistory({
  currentRoot = moduleRoot,
  repositoryRoot = moduleRoot,
  pinnedRevision = PINNED_REVISION,
  nodeExecutable = process.execPath,
} = {}) {
  const { stdout: nodeVersion } = await execFileAsync(nodeExecutable, ["--version"]);
  if (nodeVersion.trim() !== PINNED_NODE_VERSION) {
    throw new Error(`STRUCT-JUDGE verification requires Node ${PINNED_NODE_VERSION}; received ${nodeVersion.trim()}`);
  }
  await verifyRetainedBytes({ currentRoot, repositoryRoot, pinnedRevision });
  const checkout = await reconstructPinnedCheckout(repositoryRoot, pinnedRevision);
  try {
    await runVerifier(checkout, ["spikes/judge-fidelity/verify-v2.mjs", EVIDENCE_FILE], nodeExecutable);
    await runVerifier(checkout, ["spikes/judge-fidelity/qualification.mjs", "verify", "--file", QUALIFICATION_FILE], nodeExecutable);
  } finally {
    await rm(checkout, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyStructJudgeHistory().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
