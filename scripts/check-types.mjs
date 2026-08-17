#!/usr/bin/env node
// Regenerates `wrangler types` with the pinned local Wrangler and compares the
// result with the committed worker-configuration.d.ts, so the generated bindings
// can never drift from the config without CI noticing.

import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { typesCheck } from './runtime-baseline.mjs';

const root = process.cwd();

// The pinned binary from package-lock.json, not `npx`: `npx` may resolve or
// fetch some other version, which would defeat the point of pinning.
const wranglerBin = join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
if (!existsSync(wranglerBin)) {
  console.error(`pinned wrangler not found at ${wranglerBin}; run \`npm ci\``);
  process.exit(1);
}

// Generated inside the repo root, not the system temp dir: wrangler writes
// module import paths relative to the output file, so anywhere else would
// differ from the committed file for reasons that are not drift.
const generated = join(root, '.worker-configuration.check.d.ts');

// Set `process.exitCode` instead of calling `process.exit()` inside the `try`:
// `process.exit()` terminates before `finally` runs, which would leave the
// transient generated file behind on every failure path.
try {
  let generatedOk = true;
  try {
    execFileSync(process.execPath, [wranglerBin, 'types', generated], { cwd: root, stdio: 'inherit' });
  } catch (error) {
    console.error(`wrangler types failed: ${error.message}`);
    generatedOk = false;
  }
  if (generatedOk) {
    const result = typesCheck(root, generated);
    if (result.ok) {
      console.log('OK  generated types match the committed worker-configuration.d.ts');
    } else {
      console.error(result.reason);
      generatedOk = false;
    }
  }
  if (!generatedOk) process.exitCode = 1;
} finally {
  rmSync(generated, { force: true });
}
