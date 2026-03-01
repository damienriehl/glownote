import 'fake-indexeddb/auto';

// Mock chrome API
const chromeMock = {
  runtime: {
    sendMessage: vi.fn().mockResolvedValue(undefined),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    lastError: null,
    getURL: (path: string) => `chrome-extension://test-id/${path}`,
  },
  tabs: {
    query: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    onActivated: { addListener: vi.fn() },
    onUpdated: { addListener: vi.fn() },
    create: vi.fn(),
  },
  storage: {
    sync: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      onChanged: { addListener: vi.fn() },
    },
  },
  identity: {
    getAuthToken: vi.fn(),
  },
  contextMenus: {
    create: vi.fn(),
    removeAll: vi.fn((cb) => cb?.()),
    onClicked: { addListener: vi.fn() },
  },
  commands: {
    onCommand: { addListener: vi.fn() },
  },
};

// @ts-expect-error - global mock
globalThis.chrome = chromeMock;

// Mock CSS.highlights (not available in jsdom)
if (typeof CSS === 'undefined') {
  // @ts-expect-error - global mock
  globalThis.CSS = {};
}
// @ts-expect-error - mock
CSS.highlights = new Map();
// @ts-expect-error - mock
globalThis.Highlight = class Highlight extends Set {};
