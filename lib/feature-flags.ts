// Centralized feature flag parsing & exposure
// Flags are build/runtime evaluated (process.env) and hydrated to client.
// Naming convention: APP_ENABLE_<FEATURE>
// Truthy: 1, true, on, yes (case-insensitive)
// Falsy: 0, false, off, no, undefined, empty

export type FeatureFlags = {
  guestAccounts: boolean;
  shareConversations: boolean;
  uploadFiles: boolean;
  weatherTool: boolean;
};

const ENV_MAP: Record<keyof FeatureFlags, string> = {
  guestAccounts: "APP_ENABLE_GUEST_ACCOUNTS",
  shareConversations: "APP_ENABLE_SHARE_CONVERSATIONS",
  uploadFiles: "APP_ENABLE_UPLOAD_FILES",
  weatherTool: "APP_ENABLE_WEATHER_TOOL",
};

const TRUTHY = new Set(["1", "true", "on", "yes"]);
const FALSY = new Set(["0", "false", "off", "no", ""]);

function parseFlag(raw: string | undefined): boolean {
  if (!raw) {
    return false;
  }
  const value = raw.trim().toLowerCase();
  if (TRUTHY.has(value)) {
    return true;
  }
  if (FALSY.has(value)) {
    return false;
  }
  // Any other non-empty string treat as disabled for forward compatibility.
  return false;
}

let _cached: FeatureFlags | undefined;

export function getFeatureFlags(): FeatureFlags {
  if (_cached) {
    return _cached;
  }
  const flags: FeatureFlags = {
    guestAccounts: parseFlag(process.env[ENV_MAP.guestAccounts]),
    shareConversations: parseFlag(process.env[ENV_MAP.shareConversations]),
    uploadFiles: parseFlag(process.env[ENV_MAP.uploadFiles]),
    weatherTool: parseFlag(process.env[ENV_MAP.weatherTool]),
  };
  _cached = flags;
  return flags;
}

// Reset cache (primarily for tests)
export function resetFeatureFlagsCache() {
  _cached = undefined;
}

export const FEATURE_GUEST_ACCOUNTS = getFeatureFlags().guestAccounts;
export const FEATURE_SHARE_CONVERSATIONS = getFeatureFlags().shareConversations;
export const FEATURE_UPLOAD_FILES = getFeatureFlags().uploadFiles;
export const FEATURE_WEATHER_TOOL = getFeatureFlags().weatherTool;

// Serialize for client hydration
export function serializeFeatureFlags() {
  return JSON.stringify(getFeatureFlags());
}

// Guard helper (useful in actions/mutations)
export function assertFeatureEnabled<K extends keyof FeatureFlags>(
  key: K,
  errorFactory: (feature: K) => Error = (feature) =>
    new Error(`Feature '${String(feature)}' is disabled.`)
) {
  const flags = getFeatureFlags();
  if (!flags[key]) {
    throw errorFactory(key);
  }
}
