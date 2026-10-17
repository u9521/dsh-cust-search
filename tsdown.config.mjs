/**
 * tsdown config — the two DSH plugin artifacts, built locally.
 *
 * DSH plugins ship two halves:
 *
 *   1. `lib/index.js` — the host half. ESM, loaded by the node Loader from a
 *      real install, so every `@deepseek-ai/*` package stays an import.
 *   2. `lib/client.js` — the browser half. A CJS closure factory registered on
 *      `window.__ModuleLoader__.load({ id, factory })`; the shell's platform
 *      modules stay `require()` calls into the frozen module table and
 *      everything else is inlined.
 *
 * Upstream implements (2) as a large workspace preset (`packages/client/
 * tsdown.client.ts`) whose CSS-Modules, `?inline`, and bundle-input-isolation
 * machinery exists for plugin packages that own stylesheet files. This plugin
 * owns none — its CSS is a string in `src/client/styles.ts`, injected from a
 * plugin effect — so only the artifact contract is restated here, plus a
 * purity gate that fails the build instead of silently inlining a module the
 * shell already shares.
 */
import { isBuiltin } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ID = '@local/dsh-cust-search'

/**
 * Module specifiers the web shell shares into the frozen module table.
 * Mirrors `PLATFORM_MODULES` in `@deepseek-ai/dsh-client-web`; a specifier
 * missing here is INLINED, which is why the gate below refuses unknown
 * `@deepseek-ai/*` imports instead of duplicating a runtime identity.
 */
const PLATFORM_MODULES = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
]

/** This package's own extra module-table requests (`dsh.client.external`). */
const REQUESTED_MODULES = (() => {
  const manifest = JSON.parse(
    readFileSync(
      fileURLToPath(new URL('./package.json', import.meta.url)),
      'utf8',
    ),
  )
  return manifest.dsh?.client?.external ?? []
})()

const CLIENT_EXTERNALS = new Set([...PLATFORM_MODULES, ...REQUESTED_MODULES])

const isPlatformModule = (specifier) => CLIENT_EXTERNALS.has(specifier)
const isDshPackage = (specifier) => specifier.startsWith('@deepseek-ai/')

/**
 * Peer dependencies that the host process already provides, and therefore must
 * NOT be inlined into the host artifact.
 *
 * `zod` was bundled here: a second copy in the process next to the one
 * `@deepseek-ai/dsh-storage-domain` resolves, and 129 KB of the 184 KB artifact.
 * The size is the symptom; the hazard is identity. Two copies mean two class
 * objects, and DSH decides routing and presentation with `instanceof`
 * (`isHarnessError`, `errorInfo`) — a value whose class comes from the other
 * copy narrows to `undefined` and the error's machine code is dropped.
 *
 * `zod`'s own `ZodType` happens to define a duck-typed `Symbol.hasInstance`, so
 * schema checks survive a split today; that is zod's courtesy, not a guarantee,
 * and it does not extend to anything else bundled here. Keeping host-resolved
 * packages external removes the question instead of relying on it, which is
 * also what the `@deepseek-ai/*` rule below already does.
 *
 * DSH's loader honours this further: for a linked plugin it routes a bare
 * import of a name in the package's `peerDependencies` to the installation's
 * copy, so declaring the peer is what makes the single instance the real one.
 */
const HOST_PEERS = ['zod']
const isHostPeer = (specifier) =>
  HOST_PEERS.includes(specifier) ||
  HOST_PEERS.some((peer) => specifier.startsWith(`${peer}/`))

/** Fail the build on a cross-plugin value import the module table cannot answer. */
const purityGate = {
  name: 'dsh-client-bundle-purity',
  resolveId(source) {
    if (!isDshPackage(source) || isPlatformModule(source)) return null
    throw new Error(
      `client bundle purity: "${source}" is neither a shell platform module nor ` +
        `${ID}'s dsh.client.external — a cross-plugin value import would inline a ` +
        'duplicate runtime instance. Collaborate through cordis services instead ' +
        '(type-only imports are erased and never reach this gate).',
    )
  },
}

/** The host half: ESM, every DSH package and host-provided peer external. */
const host = {
  name: ID,
  entry: ['lib/types/index.js'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
  deps: {
    neverBundle: (specifier) =>
      isDshPackage(specifier) || isHostPeer(specifier),
    alwaysBundle: (specifier) =>
      !isBuiltin(specifier) &&
      !isDshPackage(specifier) &&
      !isHostPeer(specifier),
  },
}

/** The browser half: the closure factory the shell's module loader materializes. */
const client = {
  name: `${ID}/client`,
  entry: { client: 'lib/types/client/index.js' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  sourcemap: true,
  clean: false,
  deps: {
    neverBundle: isPlatformModule,
    alwaysBundle: (specifier) => !isPlatformModule(specifier),
  },
  plugins: [purityGate],
  outputOptions: {
    entryFileNames: 'client.js',
    sourcemapExcludeSources: false,
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

export default [host, client]
