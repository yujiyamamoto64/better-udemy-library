// Firefox exposes the standards-based `browser` namespace, while Chrome and
// Edge expose `chrome`. Modern Chromium APIs used by this extension support
// promises, so the same callers work with either implementation.
const extensionApi = globalThis.browser ?? globalThis.chrome;

if (!extensionApi) {
  throw new Error('WebExtension API is not available in this context.');
}

export { extensionApi };
