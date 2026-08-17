#!/usr/bin/env node
// Validates both Wrangler configs with a dry run — the only Wrangler command in
// `npm run check` that touches a config end to end. A dry run builds and prints
// the binding table; it uploads, deploys, creates, and mutates nothing, and
// needs no Cloudflare credentials.
//
// Beyond exit status this asserts the two things the story actually cares about:
// zero config warnings, and that the AI binding is present in production and
// absent offline.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { inspectDryRun } from './runtime-baseline.mjs';

const root = process.cwd();
const wranglerBin = join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
if (!existsSync(wranglerBin)) {
  console.error(`pinned wrangler not found at ${wranglerBin}; run \`npm ci\``);
  process.exit(1);
}

const runs = [
  { label: 'wrangler.toml', args: ['--outdir', '.wrangler/dry-run/root'], expectAi: true },
  {
    label: 'wrangler.offline.toml',
    args: ['--config', 'wrangler.offline.toml', '--outdir', '.wrangler/dry-run/offline'],
    expectAi: false,
  },
];

let failed = false;

for (const { label, args, expectAi } of runs) {
  // Wrangler prints config warnings to stderr and the binding table to stdout,
  // so both streams are captured and inspected together.
  const result = spawnSync(process.execPath, [wranglerBin, 'deploy', '--dry-run', ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (result.error || result.status !== 0) {
    console.error(`FAIL ${label}: dry run exited non-zero${result.error ? ` (${result.error.message})` : ''}`);
    console.error(output);
    failed = true;
    continue;
  }

  const problems = inspectDryRun(output, { expectAi });

  if (problems.length > 0) {
    console.error(`FAIL ${label}: ${problems.join('; ')}`);
    console.error(output);
    failed = true;
  } else {
    console.log(`OK  ${label}: no warnings, env.AI ${expectAi ? 'present' : 'absent'} as expected`);
  }
}

process.exit(failed ? 1 : 0);
