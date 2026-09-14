/**
 * DSH official client-bundle preset, vendored into external/ — no external
 * DSH source checkout required. See external/deepseek-harness/packages/client/
 * tsdown.client.ts.
 */
const { clientBundle } =
  await import('./external/deepseek-harness/packages/client/tsdown.client.ts')

export default clientBundle('@local/dsh-cust-search', ['lib/types/index.js'])
