#!/usr/bin/env node
/**
 * Build script — one pipeline, two artifacts.
 *
 *   1. `tsc -p tsconfig.json`            type check + emit lib/types (+ maps)
 *   2. `tsdown -c tsdown.config.mjs`     lib/index.js (host) + lib/client.js
 *   3. verify the host artifact keeps host-provided peers external
 *
 * `--check` runs tsc --noEmit instead of emitting and bundling.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const CHECK_ONLY = process.argv.includes('--check')

/**
 * Packages the host process already provides, so the host artifact must import
 * them instead of inlining a second copy. Mirrors `HOST_PEERS` in
 * `tsdown.config.mjs`; that file decides what stays external, this one proves
 * it actually did.
 */
const HOST_PEERS = ['zod']

/** Run a binary with cwd=root, inheriting stdio; exit the process on failure. */
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

if (!CHECK_ONLY) {
  rmSync(join(root, 'lib'), { recursive: true, force: true })
}
mkdirSync(join(root, 'lib'), { recursive: true })
const args = ['-p', 'tsconfig.json']
if (CHECK_ONLY) args.push('--noEmit', '--pretty', 'false')
run(process.execPath, [
  join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
  ...args,
])
if (!CHECK_ONLY) {
  run(join(root, 'node_modules', '.bin', 'tsdown'), ['-c', 'tsdown.config.mjs'])
  verifyHostExternals()
}

/**
 * Fail the build if the host artifact inlined a package the host also provides.
 *
 * `tsdown` happily inlines anything not marked external, and the result still
 * builds and runs — the damage is a second module instance in the process, so
 * `instanceof` checks across the plugin/host boundary silently answer "no".
 * That is not a size regression to discover later; it is a routing bug in DSH's
 * error plumbing (`isHarnessError`, `errorInfo`), so it is gated here.
 *
 * Only the host half is checked: the browser half resolves through the shell's
 * frozen module table, where the mirror-image rule is the purity gate already
 * enforced by `tsdown.config.mjs`.
 */
function verifyHostExternals() {
  const artifact = readFileSync(join(root, 'lib', 'index.js'), 'utf8')
  // Bundled dependencies get a `//#region node_modules/.pnpm/<name>@<version>/…`
  // banner; an external one never appears there at all.
  const inlined = HOST_PEERS.filter((name) =>
    artifact.includes(`node_modules/.pnpm/${name}@`),
  )
  if (inlined.length > 0) {
    console.error(
      `build: host artifact inlined host-provided package(s): ${inlined.join(', ')}. ` +
        'Mark them external in tsdown.config.mjs — a bundled copy is a second ' +
        'module instance, so cross-boundary instanceof checks fail silently.',
    )
    process.exit(1)
  }
}
